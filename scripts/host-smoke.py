"""Exercise the shipped archive through a supported DSH profile and a local scripted model."""
import argparse
import base64
import hashlib
import http.cookiejar
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import threading
import time
import urllib.request
import uuid
import zstandard
import yaml

parser = argparse.ArgumentParser()
parser.add_argument('--cli', required=True)
parser.add_argument('--archive', required=True)
parser.add_argument('--run', required=True)
parser.add_argument('--workers', type=int, default=8)
parser.add_argument('--keep-open-seconds', '--soak-seconds', type=int, default=0)
parser.add_argument('--network-fixture', action='store_true')
parser.add_argument('--mcp-fixture', action='store_true')
parser.add_argument('--mode-fixture', choices=['qa-ol', 'qa-crack-create', 'qa-test-one'])
parser.add_argument('--image-fixture', action='store_true')
parser.add_argument('--pending-restart-fixture', action='store_true')
parser.add_argument('--custom-profile-fixture', action='store_true')
parser.add_argument('--transform-input-fixture', action='store_true')
parser.add_argument('--serial-update-fixture', action='store_true')
parser.add_argument('--adviser-revision-fixture', action='store_true')
parser.add_argument('--ui-model-fixture', action='store_true')
parser.add_argument('--shell-fixture', action='store_true', help='Run harmless Node, Python and loopback curl commands through a Windows member')
parser.add_argument('--browser-locale', choices=['zh-CN','en-US'], help='Select the synthetic browser locale explicitly')
parser.add_argument('--pwsh-executable', help='Select an installed PowerShell executable for the isolated Windows profile')
args = parser.parse_args()
if args.shell_fixture and os.name != 'nt': parser.error('The PowerShell fixture requires Windows')
if args.pwsh_executable and (os.name != 'nt' or not Path(args.pwsh_executable).is_file()):
    parser.error('--pwsh-executable requires an existing Windows executable')
if not 2 <= args.workers <= 32: parser.error('--workers must be between 2 and 32')
if args.keep_open_seconds < 0: parser.error('--soak-seconds cannot be negative')
if args.custom_profile_fixture and args.mcp_fixture: parser.error('Run custom profile and MCP fixtures separately; both replace the complete runtime config')
if args.serial_update_fixture and not args.transform_input_fixture: parser.error('The serial update fixture requires --transform-input-fixture')
expected_completed = args.workers + 2 + int(args.serial_update_fixture)
class FixtureLoader(yaml.SafeLoader): pass
FixtureLoader.add_constructor('tag:yaml.org,2002:js', lambda loader, node: loader.construct_scalar(node))
args.cli = str(Path(args.cli).resolve())
RUN = Path(args.run).resolve()
if RUN.exists() and any(RUN.iterdir()): parser.error('--run must be a new or empty isolated directory')
RUN.mkdir(parents=True, exist_ok=True)
WORK = RUN / 'workspace'
WORK.mkdir(exist_ok=True)
(WORK / 'fixture.txt').write_bytes(b'V5_SYNTHETIC_INPUT\n')
if args.image_fixture:
    (WORK / 'fixture.png').write_bytes(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC'))
if args.shell_fixture:
    (WORK / 'native-probe.js').write_text('console.log(JSON.stringify({marker:"QA_NODE_OK",unicode:"中文",cwd:process.cwd()}))\n', encoding='utf-8')
    (WORK / 'native-probe.py').write_text('import json,os\nprint(json.dumps({"marker":"QA_PYTHON_OK","unicode":"中文","cwd":os.getcwd()},ensure_ascii=False))\n', encoding='utf-8')
HOME = RUN / 'home'
env = {k: v for k, v in os.environ.items() if not any(s in k.upper() for s in ('KEY', 'TOKEN', 'SECRET', 'PASSWORD'))}
user = RUN / 'user'
user.mkdir(exist_ok=True)
env.update({'DSH_HOME': str(HOME), 'USERPROFILE': str(user), 'APPDATA': str(user / 'AppData/Roaming'),
            'LOCALAPPDATA': str(user / 'AppData/Local'), 'QA_MODEL_KEY': 'synthetic-local-only',
            'COREPACK_ENABLE_DOWNLOAD_PROMPT': '0'})
node = os.environ.get('NODE_BINARY', 'node')
flags = {'creationflags': subprocess.CREATE_NO_WINDOW} if os.name == 'nt' else {}

def command(argv, name):
    with (RUN / (name + '.out')).open('w', encoding='utf-8') as out, (RUN / (name + '.err')).open('w', encoding='utf-8') as err:
        p = subprocess.run([node, args.cli, *argv], env=env, cwd=WORK, stdout=out, stderr=err, timeout=360, **flags)
    if p.returncode:
        raise RuntimeError(f'{name} exited {p.returncode}; inspect its isolated log')

command(['--profile', 'web', '--dump-default-config'], 'initialize')
command(['plugin', '--profile', 'web', 'add', str(Path(args.archive).resolve())], 'install')

rpc = None
sid = None
requests = []
goal_sent = False
pending_paused = False
pending_release = False
archived_input_seen = False
control_steps = []
parallel_condition = threading.Condition()
parallel_seen = set()
parallel_current = 0
parallel_max = 0
active_model_requests = 0
network_calls = {'search': 0, 'fetch': 0}
shell_evidence = set()
worker_names = ['group'] + [f'worker-{i}' for i in range(args.workers - 1)]
member_names = ['planner', 'quality', 'verifier', *worker_names]

def project_plan():
    def member(name):
        role = 'planning_adviser' if name == 'planner' else 'quality_adviser' if name == 'quality' else 'verifier' if name == 'verifier' else 'group_lead' if name == 'group' else 'executor'
        return {'name': name, 'parent': 'group' if name == 'worker-0' else 'lead', 'function': role,
                'modelProvider': 'qa-local', 'model': 'qa-model', 'reasoningEffort': 'max',
                'responsibility': 'Verify the synthetic local fixture and retain evidence',
                'skills': ['team-quality-engineering', *(['project-evidence'] if args.custom_profile_fixture else [])]}
    def task(ident, owner, kind, dependencies, inputs, outputs):
        return {'id': ident, 'owner': owner, 'reviewer': 'verifier', 'description': 'Verify synthetic fixture ' + ident,
                'kind': kind, 'dependencies': dependencies, 'inputs': inputs, 'outputs': outputs,
                'acceptanceCriteria': ['Synthetic fixture and receipt match'], 'critical': kind != 'execution'}
    tasks = [task('planning', 'group', 'plan', [], ['fixture.txt'], [])]
    tasks += [task('execute-' + name, name, 'execution', ['planning'], ['fixture.txt'], [name + '.txt']) for name in worker_names]
    if args.transform_input_fixture:
        next(task for task in tasks if task['id'] == 'execute-group')['outputs'] = ['fixture.txt']
    if args.image_fixture:
        next(task for task in tasks if task['id'] == 'execute-worker-0')['inputs'].append('fixture.png')
    if args.shell_fixture:
        next(task for task in tasks if task['id'] == 'execute-worker-0')['inputs'] += ['native-probe.js', 'native-probe.py']
    prerequisites = ['execute-' + name for name in worker_names]
    if args.serial_update_fixture:
        tasks += [task('polish', 'group', 'execution', prerequisites, ['fixture.txt'], ['fixture.txt'])]
        prerequisites = ['polish']
    tasks += [task('delivery', 'group', 'delivery', prerequisites, ['fixture.txt'] if args.transform_input_fixture else [], ['final.txt'])]
    return {'format': 'dsh-team-project-plan', 'version': 2, 'automation': {'provision': 'on-demand', 'requirePlanningGate': True},
            'members': [member(n) for n in member_names], 'tasks': tasks,
            'resources': {'maxMembers': len(member_names), 'maxConcurrentRequests': min(32, args.workers)},
            'reviewPolicy': 'independent-and-dual-for-critical', 'previousTasks': [],
            'recovery': 'Resume retained executions; verify existing artifact receipts before repeating anything'}

def text_value(value):
    if isinstance(value, str): return value
    if isinstance(value, list): return '\n'.join(v.get('text', '') for v in value if isinstance(v, dict) and v.get('type') == 'text')
    return ''

class Fixture(BaseHTTPRequestHandler):
    def log_message(self, *unused): pass

    def do_GET(self):
        if self.path.startswith('/qa-search?'):
            network_calls['search'] += 1
            payload = json.dumps({'sources': [{'url': f'http://127.0.0.1:{server.server_address[1]}/qa-evidence',
                'title': 'Synthetic local evidence', 'snippet': 'QA_NETWORK_EVIDENCE'}], 'truncated': False}).encode()
            content_type = 'application/json'
        elif self.path == '/qa-evidence':
            network_calls['fetch'] += 1
            payload, content_type = b'QA_NETWORK_EVIDENCE', 'text/plain'
        else: self.send_error(404); return
        self.send_response(200); self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(payload))); self.end_headers(); self.wfile.write(payload)

    def do_POST(self):
        global goal_sent, parallel_current, parallel_max, pending_paused, archived_input_seen, active_model_requests
        held = False
        with parallel_condition: active_model_requests += 1
        try:
            body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            names = {t['function']['name'] for t in body.get('tools', [])}
            user_text = '\n'.join(text_value(m.get('content')) for m in body.get('messages', []) if m.get('role') == 'user')
            actor = next((name for name in member_names if f'You are {name}. Retain this identity.' in user_text), 'lead')
            current_text = '\n'.join(text_value(m.get('content')) for m in body.get('messages', []))
            identities = re.findall(r'Current Team identity: (\{[^\n]+\})', current_text)
            if identities: actor = json.loads(identities[-1])['name']
            auxiliary = text_value(body.get('messages', [{}])[-1].get('content')).startswith('You are now acting as a compaction engine')
            complete = {m.get('tool_call_id') for m in body.get('messages', []) if m.get('role') == 'tool'}
            archived = next((m for m in body.get('messages', []) if m.get('role') == 'tool' and m.get('tool_call_id') == 'qa-archived-input'), None)
            if args.shell_fixture:
                for message in body.get('messages', []):
                    call_id = message.get('tool_call_id', '')
                    if message.get('role') != 'tool' or not call_id.endswith('-shell'): continue
                    output = text_value(message.get('content'))
                    (RUN / 'native-shell-result.txt').write_text(output, encoding='utf-8')
                    if not all(marker in output for marker in ('QA_NODE_OK', 'QA_PYTHON_OK', 'QA_NETWORK_EVIDENCE', '中文')):
                        raise RuntimeError('The member did not receive complete native shell evidence')
                    shell_evidence.add(call_id)
            if archived:
                evidence = text_value(archived.get('content'))
                if 'V5_SYNTHETIC_INPUT' not in evidence or 'V5_SYNTHETIC_UPDATED' in evidence:
                    raise RuntimeError('The model did not receive the retained original input')
                archived_input_seen = True
            selected = None
            if auxiliary:
                selected = None
            elif actor == 'lead' and control_steps:
                selected = next((step for step in control_steps if step[0] not in complete), None)
            elif actor == 'lead' and not goal_sent:
                goal_sent = True
                selected = ('qa-goal', 'team_goal', {'action': 'submit', 'expected_goal_revision': 0, 'expected_proposal_revision': 0,
                    'objective': 'Verify the synthetic local fixture with a retained Team',
                    'acceptance_criteria': ['Every fixture task is independently accepted'], 'project_plan': project_plan(),
                    'coverage': 'task', 'targets': ['synthetic local workspace'],
                    'allowed_actions': ['read fixture.txt', 'write private synthetic reports', 'review and publish accepted reports',
                        *(['execute harmless local Node, Python and loopback curl checks'] if args.shell_fixture else []),
                        *(['transform the declared synthetic input assigned in the plan'] if args.transform_input_fixture else [])],
                    'excluded_targets': ['external networks', 'user data'], 'constraints': ['synthetic local data only'],
                    'execution_scope': {'readPaths': ['.'], 'writePaths': ['.'],
                        'webOrigins': ['*'] if args.mcp_fixture or args.shell_fixture else [f'http://127.0.0.1:{server.server_address[1]}'] if args.network_fixture else [],
                        'allowSearch': args.network_fixture, 'allowUnrestrictedExecution': args.mcp_fixture or args.shell_fixture}})
                if args.mcp_fixture or args.shell_fixture:
                    selected[2]['execution_scope'].update({'readPaths': ['*'], 'writePaths': ['*']})
            elif actor == 'lead' and goal_sent and rpc is not None and sid is not None:
                state = rpc('session/projections', {'request': {'sessionId': sid}}).get('values', {}).get('agentTeam', {})
                rejected = next((t for t in state.get('tasks', []) if t.get('status') == 'pending'
                    and t.get('work', {}).get('execution', {}).get('phase') == 'rejected'), None)
                if rejected is not None:
                    selected = ('retry-' + rejected['work']['execution']['id'], 'team_task_update',
                        {'task_id': rejected['id'], 'expected_revision': rejected['revision'], 'action': 'reassign', 'owner': next(m['name'] for m in state['members'] if m['id'] == rejected['work']['execution']['ownerId'])})
            elif actor != 'lead' and rpc is not None and sid is not None:
                state = rpc('session/projections', {'request': {'sessionId': sid}}).get('values', {}).get('agentTeam', {})
                tasks = state.get('tasks', [])
                for task in tasks:
                    execution = task.get('work', {}).get('execution', {})
                    if task.get('ownerName') == actor and execution.get('phase') == 'running':
                        ident = execution['id']
                        checks = [(ident + '-get', 'team_task_get', {'task_id': task['id']})]
                        if task.get('inputKey') != 'delivery': checks.append((ident + '-read', 'read', {'file_path': 'fixture.txt'}))
                        if args.image_fixture and actor == 'worker-0' and task.get('inputKey', '').startswith('execute-'):
                            checks.append((ident + '-image', 'read_image', {'file_path': 'fixture.png'}))
                        if args.network_fixture and task.get('inputKey', '').startswith('execute-'):
                            checks.append((ident + '-search', 'web_search', {'queries': ['synthetic local evidence']}))
                            checks.append((ident + '-fetch', 'web_fetch', {'url': f'http://127.0.0.1:{server.server_address[1]}/qa-evidence'}))
                        if args.mcp_fixture and task.get('inputKey', '').startswith('execute-'):
                            checks.append((ident + '-mcp', 'mcp__qa__echo', {'text': 'QA_MCP_EVIDENCE'}))
                        if args.shell_fixture and actor == 'worker-0' and task.get('inputKey', '').startswith('execute-'):
                            if 'pwsh' not in names: raise RuntimeError('The Windows member has no native pwsh tool')
                            checks.append((ident + '-shell', 'pwsh', {'command': shell_command,
                                'description': 'Verify local Node Python and loopback curl', 'timeoutMs': 30000}))
                        for path in task.get('writeScopes', []):
                            updated = args.transform_input_fixture and path in ('fixture.txt', 'final.txt')
                            serial = args.serial_update_fixture and (task.get('inputKey') == 'polish' or path == 'final.txt')
                            checks.append((ident + '-write', 'write', {'file_path': path, 'content': 'V5_SYNTHETIC_FINAL_INPUT\n' if serial else 'V5_SYNTHETIC_UPDATED\n' if updated else 'V5_SYNTHETIC_INPUT\n'}))
                        checks.append((ident + '-submit', 'team_task_submit', {'task_id': task['id'], 'expected_revision': task['revision'],
                            'execution_id': ident, 'result': 'Deliberately incomplete planning evidence' if args.adviser_revision_fixture and task.get('inputKey') == 'planning' and task['work']['attempts'] == 1 else 'Synthetic fixture and receipt match', 'evidence': ['Observed V5_SYNTHETIC_INPUT'],
                            'artifact_paths': task.get('writeScopes', []), 'side_effects': 'known' if task.get('writeScopes') else 'none'}))
                        selected = next((c for c in checks if c[0] not in complete), None)
                        if args.pending_restart_fixture and actor == 'worker-0' and task.get('inputKey', '').startswith('execute-') and not pending_release and selected and selected[1] == 'write':
                            pending_paused = True
                            selected = None
                        break
                    if execution.get('phase') == 'submitted' and actor in ('planner', 'quality', 'verifier'):
                        gated = task.get('work', {}).get('plan', {}).get('adviserGate') == 'dual'
                        decisions = [d for d in state.get('adviserDecisions', []) if d['taskId'] == task['id'] and d['executionId'] == execution['id']]
                        if actor in ('planner', 'quality'):
                            function = 'planning_adviser' if actor == 'planner' else 'quality_adviser'
                            if not gated or any(d['adviserFunction'] == function for d in decisions): continue
                        elif gated and not any(d['decision'] == 'revise' for d in decisions) and len({d['adviserFunction'] for d in decisions if d['decision'] == 'approve'}) < 2: continue
                        ident = execution['id'] + '-' + actor
                        checks = [(ident + '-get', 'team_task_get', {'task_id': task['id']})]
                        for receipt in task.get('work', {}).get('plan', {}).get('inputs', []):
                            if receipt['path'].endswith('.png'):
                                # This image exercises worker transport; the review criterion concerns the text fixture.
                                continue
                            else:
                                checks.append((ident + '-input-' + receipt['path'], 'team_workspace', {'action': 'read_input', 'task_id': task['id'],
                                    'execution_id': execution['id'], 'file_path': receipt['path']}))
                        for artifact in execution.get('submission', {}).get('artifacts', []):
                            checks.append((ident + '-artifact', 'team_workspace', {'action': 'read_artifact', 'task_id': task['id'],
                                'execution_id': execution['id'], 'file_path': artifact['path']}))
                        if actor == 'verifier':
                            if execution.get('effectReview') is None:
                                checks.append((ident + '-reconcile', 'team_task_reconcile', {'task_id': task['id'], 'expected_revision': task['revision'],
                                    'execution_id': execution['id'], 'side_effects': 'known' if execution.get('submission', {}).get('artifacts') else 'none',
                                    'review_summary': 'Independently checked the synthetic writes and receipts',
                                    'review_evidence': ['Observed the immutable artifacts and confirmed no external target operations']}))
                            checks.append((ident + '-review', 'team_task_review', {'task_id': task['id'], 'expected_revision': task['revision'],
                                'execution_id': execution['id'], 'review_decision': 'rejected' if any(d['decision'] == 'revise' for d in decisions) else 'accepted', 'review_summary': 'Independently checked deliberate incomplete planning evidence' if any(d['decision'] == 'revise' for d in decisions) else 'Independently verified synthetic fixture',
                                'review_evidence': ['Compared the synthetic fixture and immutable receipt'],
                                'review_checks': [{'criterion': 1, 'verified': True, 'evidence': 'Observed the fixed fixture and receipt'}]}))
                        else:
                            checks.append((ident + '-decision', 'team_adviser_review', {'task_id': task['id'], 'execution_id': execution['id'],
                                'action': 'record', 'decision': 'revise' if args.adviser_revision_fixture and actor == 'quality' and task.get('inputKey') == 'planning' and task['work']['attempts'] == 1 else 'approve', 'summary': 'Independently checked the synthetic milestone',
                                'evidence': ['Reviewed exact task and execution version']}))
                        selected = next((c for c in checks if c[0] not in complete), None)
                        if selected: break
            if selected and selected[1] == 'team_task_get' and actor in worker_names and task.get('inputKey', '').startswith('execute-') and task.get('ownerName') == actor:
                with parallel_condition:
                    if actor not in parallel_seen:
                        parallel_seen.add(actor); parallel_current += 1; held = True
                        parallel_max = max(parallel_max, parallel_current)
                        parallel_condition.notify_all()
                        if not parallel_condition.wait_for(lambda: len(parallel_seen) == args.workers, timeout=45):
                            raise RuntimeError('Independent execution requests did not overlap at the concurrency barrier')
            requests.append({'actor': actor, 'model': body.get('model'), 'reasoning': body.get('reasoning_effort'),
                             'purpose': 'compaction' if auxiliary else 'task',
                             'syntheticPersona': 'V5_SYNTHETIC_MODE_PERSONA' in current_text,
                             'syntheticModeSkill': 'V5_SYNTHETIC_MODE_SKILL_BODY' in current_text,
                             'customSkill': 'Project evidence handoff' in current_text,
                             'imageInputs': sum(1 for message in body.get('messages', []) for part in (message.get('content') or [])
                                if isinstance(part, dict) and part.get('type') == 'image_url'),
                             'maxTokens': body.get('max_completion_tokens', body.get('max_tokens')),
                             'tool': None if selected is None else selected[1], 'teamTools': 'team_goal' in names, 'at': time.monotonic()})
            if selected is not None:
                ident, name, values = selected
                delta = {'role': 'assistant', 'tool_calls': [{'index': 0, 'id': ident, 'type': 'function',
                    'function': {'name': name, 'arguments': json.dumps(values)}}]}
                finish = 'tool_calls'
            else:
                summary = '\n\n'.join('## ' + heading + '\n- Retain the approved synthetic Team goal, member identity and task receipts. Read the current task board; do not repeat accepted work.'
                    for heading in ['Primary Request and Intent', 'Key Technical Concepts', 'Files and Code', 'Errors and Fixes',
                                    'Pending Jobs', 'Current Work', 'Next Step', 'Critical Context'])
                delta, finish = {'role': 'assistant', 'content': summary if auxiliary else 'V5_FIXTURE_READY'}, 'stop'
            frames = [{'id': 'fixture', 'object': 'chat.completion.chunk', 'model': body.get('model'),
                       'choices': [{'index': 0, 'delta': delta, 'finish_reason': None}]},
                      {'id': 'fixture', 'object': 'chat.completion.chunk', 'model': body.get('model'),
                       'choices': [{'index': 0, 'delta': {}, 'finish_reason': finish}],
                       'usage': {'prompt_tokens': 20, 'completion_tokens': 10, 'total_tokens': 30}}]
            payload = (''.join('data: ' + json.dumps(f) + '\n\n' for f in frames) + 'data: [DONE]\n\n').encode()
            self.send_response(200); self.send_header('Content-Type', 'text/event-stream'); self.send_header('Content-Length', str(len(payload)))
            self.end_headers(); self.wfile.write(payload)
        except Exception as error:
            (RUN / 'fixture-error.txt').write_text(str(error), encoding='utf-8')
            self.send_error(500)
        finally:
            with parallel_condition:
                active_model_requests -= 1
                parallel_condition.notify_all()
            if held:
                with parallel_condition: parallel_current -= 1

server = ThreadingHTTPServer(('127.0.0.1', 0), Fixture)
if args.shell_fixture:
    def ps_literal(value): return "'" + value.replace("'", "''") + "'"
    shell_command = '\n'.join([
        "$ErrorActionPreference = 'Stop'", "$env:PYTHONIOENCODING = 'utf-8'",
        '$OutputEncoding = [System.Text.UTF8Encoding]::new($false)',
        '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)',
        "Write-Output ('QA_PS_VERSION=' + $PSVersionTable.PSVersion)",
        '& ' + ps_literal(shutil.which(node) or node) + " './native-probe.js'",
        "if ($LASTEXITCODE -ne 0) { throw 'Node probe failed' }",
        '& ' + ps_literal(sys.executable) + " -B './native-probe.py'",
        "if ($LASTEXITCODE -ne 0) { throw 'Python probe failed' }",
        '& curl.exe --fail --silent --show-error --max-time 10 ' + ps_literal(f'http://127.0.0.1:{server.server_address[1]}/qa-evidence'),
        "if ($LASTEXITCODE -ne 0) { throw 'Loopback curl probe failed' }",
    ])
threading.Thread(target=server.serve_forever, daemon=True).start()
overlay = [
    {'id': 'llm-pi-ai', 'config': {'providers': {'qa-local': {'apiKeyEnv': 'QA_MODEL_KEY', 'api': 'openai-completions',
        'baseURL': f'http://127.0.0.1:{server.server_address[1]}/v1', 'models': [{'id': 'qa-model', 'name': 'Synthetic local model',
            'contextWindow': 131072, 'maxTokens': 2048, 'reasoningEfforts': {'off': None, 'high': 'high', 'max': 'high'}},
            {'id': 'qa-alternative', 'name': 'Synthetic alternate model', 'contextWindow': 131072, 'maxTokens': 2048,
             'reasoningEfforts': {'off': None, 'high': 'high', 'max': 'high'}}]}}}},
    {'id': 'agent-default-model', 'config': {'provider': 'qa-local', 'model': 'qa-model', 'reasoningEffort': 'off'}},
    {'id': 'permission', 'config': {'defaultPreset': 'danger-full-access'}}, {'id': 'hmr', 'disabled': True},
]
if args.pwsh_executable:
    overlay += [{'id': 'pwsh-sandbox', 'config': {'pwshPath': str(Path(args.pwsh_executable).resolve())}}]
if args.image_fixture:
    for model in overlay[0]['config']['providers']['qa-local']['models']: model['input'] = ['text', 'image']
if args.network_fixture:
    origin = f'http://127.0.0.1:{server.server_address[1]}'
    plugin = '''export const inject = ['web'];
export function apply(ctx) {
 const origin = ORIGIN;
 ctx.web.registerSearchProvider({id:'qa-search',available:()=>true,
  async search(request,signal){const response=await fetch(origin+'/qa-search?q='+encodeURIComponent(request.query),{signal,redirect:'error'});return response.json()}});
 ctx.web.registerFetchProvider({id:'qa-fetch',available:()=>true,preservesOrigin:true,
  async fetch(request,signal){if(new URL(request.url).origin!==origin)throw new Error('Outside synthetic fixture origin');
   const response=await fetch(request.url,{signal,redirect:'error'});return {url:request.url,statusCode:response.status,
    body:{kind:'text',content:await response.text()},truncated:false}}});
}
'''.replace('ORIGIN', json.dumps(origin))
    (RUN / 'qa-web.mjs').write_text(plugin, encoding='utf-8')
    overlay += [{'id': 'workbench-web', 'config': {'searchProvider': 'qa-search', 'fetchProvider': 'qa-fetch'}},
                {'insert': [{'id': 'qa-network', 'name': (RUN / 'qa-web.mjs').as_uri()}]}]
if args.mcp_fixture:
    mcp = '''import { createInterface } from 'node:readline';
import { appendFileSync } from 'node:fs';
const log=LOG;
const input=createInterface({input:process.stdin});
input.on('line',line=>{const value=JSON.parse(line);if(value.id===undefined)return;
 let result={};
 if(value.method==='initialize')result={protocolVersion:value.params.protocolVersion,capabilities:{tools:{}},serverInfo:{name:'v5-qa',version:'1'}};
 else if(value.method==='tools/list')result={tools:[{name:'echo',description:'Return synthetic evidence only',
  inputSchema:{type:'object',properties:{text:{type:'string'}},required:['text'],additionalProperties:false},
  annotations:{readOnlyHint:true,idempotentHint:true}}]};
 else if(value.method==='tools/call'){appendFileSync(log,JSON.stringify({method:value.method,pid:process.pid})+'\\n');
  result={content:[{type:'text',text:value.params.arguments.text}],isError:false};}
 process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:value.id,result})+'\\n');});
input.on('close',()=>process.exit(0));
'''.replace('LOG', json.dumps(str(RUN / 'mcp-calls.jsonl')))
    (RUN / 'qa-mcp.mjs').write_text(mcp, encoding='utf-8')
    bundle = yaml.load((HOME / 'profiles/web/node_modules/@dsh-workbench/team/cordis.patch.yml').read_text(encoding='utf-8'), Loader=FixtureLoader)
    runtime = next(entry['config'] for row in bundle for entry in row.get('insert', []) if entry['id'] == 'agent-team')
    runtime['coordinationRoot'] = str(HOME / 'team-coordination')
    runtime['workspaceIsolation']['storageRoot'] = str(HOME / 'team-workspaces')
    runtime['workspaceIsolation']['additionalMcpTools'] = ['mcp__qa__echo']
    overlay += [{'id': 'agent-team', 'config': runtime}, {'insert': [{'id': 'qa-mcp', 'name': '@deepseek-ai/dsh-mcp-client',
        'config': {'transport': 'stdio', 'serverName': 'qa', 'command': node, 'args': [str(RUN / 'qa-mcp.mjs')],
                   'env': {}, 'cwd': str(WORK), 'failOnStartupError': True}}]}]
if args.mode_fixture:
    default_rows = yaml.load((RUN / 'initialize.out').read_text(encoding='utf-8-sig'), Loader=FixtureLoader)
    preset = next(row['config'] for row in default_rows if row.get('id') == 'preset-standard')
    preset.update({'id': args.mode_fixture, 'name': 'Synthetic mode compatibility fixture', 'order': 90})
    for row in preset['plugins']:
        if row.get('id') == 'persona': row['config'] = {'prefix': 'V5_SYNTHETIC_MODE_PERSONA'}
        if row.get('id') == 'agent-instructions': row['disabled'] = True
        if row.get('disabled') == "process.platform === 'win32'": row['disabled'] = os.name == 'nt'
        if row.get('disabled') == "process.platform !== 'win32'": row['disabled'] = os.name != 'nt'
    skills = RUN / 'mode-skills/team-quality-engineering'
    skills.mkdir(parents=True, exist_ok=True)
    (skills / 'SKILL.md').write_text('---\nname: team-quality-engineering\ndescription: Synthetic mode skill precedence fixture\n---\n\nV5_SYNTHETIC_MODE_SKILL_BODY\n', encoding='utf-8')
    preset['plugins'].append({'id': 'qa-mode-skills', 'name': '@deepseek-ai/dsh-skill-filesystem',
        'config': {'providerName': 'qa-mode', 'includeDefaultRoots': False, 'bundledSkillDir': str(RUN / 'mode-skills'), 'watch': False}})
    overlay.append({'insert': [{'id': args.mode_fixture, 'name': '@deepseek-ai/dsh-agent-preset', 'config': preset}]})
(RUN / 'overlay.json').write_text(json.dumps(overlay), encoding='utf-8')
picker = Path(__file__).resolve().parents[1] / 'tests/pin-browse-picker.overlay.yml'
cmd = [node, args.cli, 'web', '--patch', str(RUN / 'overlay.json')]
if args.custom_profile_fixture:
    example_root = Path(__file__).resolve().parents[1] / 'examples'
    shutil.copytree(example_root / 'custom-skills', HOME / 'workbench-skills', dirs_exist_ok=True)
    cmd += ['--patch', str(example_root / 'profile-customization.patch.yml')]
cmd += ['--patch', str(picker)]
cmd += ['--port', '0', '--no-open']
stdout = (RUN / 'host.stdout').open('w', encoding='utf-8')
stderr = (RUN / 'host.stderr').open('w', encoding='utf-8')
process = subprocess.Popen(cmd, env=env, cwd=WORK, stdout=stdout, stderr=stderr, **flags)
(RUN / 'process.json').write_text(json.dumps({'runnerPid': os.getpid(), 'hostPid': process.pid, 'phase': 'startup'}), encoding='utf-8')
result = {'isolated': True, 'realPaidRequests': 0, 'requestedWorkers': args.workers, 'modeBodiesRead': False}
browser = None
playwright = None
try:
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        if process.poll() is not None: raise RuntimeError('Isolated host exited; inspect host.stderr')
        match = re.search(r'http://(?:127\.0\.0\.1|localhost):(\d+)/[^\s]*', (RUN / 'host.stdout').read_text(encoding='utf-8-sig'))
        if match: break
        time.sleep(.2)
    else: raise RuntimeError('Isolated host startup timeout')
    startup = match.group(0)
    base = f'http://127.0.0.1:{match.group(1)}'
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    with opener.open(startup, timeout=15) as response: response.read()
    def rpc(method, values):
        payload = json.dumps({'type': 'client-request', 'rpcId': str(uuid.uuid4()), 'method': method, 'payload': {'args': values}}).encode()
        req = urllib.request.Request(base + '/api/' + method, data=payload, headers={'Origin': base, 'Content-Type': 'application/json'})
        with opener.open(req, timeout=30) as response: value = json.loads(response.read())['result']
        if not value.get('ok'): raise RuntimeError(str(value.get('error')))
        return value.get('value')
    def restart_host():
        global process, stdout, stderr, base, startup, match, opener
        until = time.monotonic() + 15
        while True:
            events_by_session = {}
            logs = HOME / 'sessions'
            if os.name == 'nt': logs = Path('\\\\?\\' + str(logs))
            try:
                for file in logs.rglob('*.zstd'):
                    with file.open('rb') as source:
                        rows = [json.loads(line) for line in zstandard.ZstdDecompressor().stream_reader(source).read().decode('utf-8').splitlines()]
                    events_by_session.setdefault(file.parent.name, []).extend(rows)
                pending_calls = set()
                for session_id, rows in events_by_session.items():
                    seed_end = max((row['seq'] for row in rows if row['type'] == 'session/end-seed'), default=-1)
                    own = [row for row in rows if row.get('seq', -1) > seed_end]
                    started = {row['data']['callId'] for row in own if row['type'] == 'tool/call'}
                    settled = {row['data']['message']['toolCallId'] for row in own if row['type'] == 'tool/result'}
                    pending_calls.update((session_id, call) for call in started - settled)
                with parallel_condition: quiet = active_model_requests == 0
                if quiet and not pending_calls: break
            except (zstandard.ZstdError, json.JSONDecodeError, UnicodeDecodeError):
                # An in-progress compressed frame is retried before fault injection.
                pass
            if time.monotonic() >= until: raise RuntimeError('The cold checkpoint still has an unsettled model or tool operation')
            time.sleep(.05)
        process.terminate(); process.wait(timeout=15)
        stdout.close(); stderr.close()
        stdout = (RUN / 'host.stdout').open('w', encoding='utf-8')
        stderr = (RUN / 'host.stderr').open('a', encoding='utf-8')
        process = subprocess.Popen(cmd, env=env, cwd=WORK, stdout=stdout, stderr=stderr, **flags)
        (RUN / 'process.json').write_text(json.dumps({'runnerPid': os.getpid(), 'hostPid': process.pid, 'phase': 'restarting'}), encoding='utf-8')
        until = time.monotonic() + 90
        while time.monotonic() < until:
            if process.poll() is not None: raise RuntimeError('Restarted isolated host exited')
            match = re.search(r'http://(?:127\.0\.0\.1|localhost):(\d+)/[^\s]*', (RUN / 'host.stdout').read_text(encoding='utf-8-sig'))
            if match: break
            time.sleep(.2)
        else: raise RuntimeError('Isolated restart timed out')
        startup = match.group(0); base = f'http://127.0.0.1:{match.group(1)}'
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        with opener.open(startup, timeout=15) as response: response.read()
    def archived_tasks():
        rows = []; cursor = None
        while True:
            page = rpc('agentTeams/listTaskArchive', {'agentId': sid, 'request': {'limit': 50, **({'after': cursor} if cursor else {})}})
            rows.extend(page['tasks']); cursor = page.get('nextCursor')
            if cursor is None: return rows
    entries = rpc('pluginInventory/list', {})['entries']
    result['teamPlugins'] = [{k: e.get(k) for k in ('entryId', 'fiberPhase', 'enabled')} for e in entries if 'team' in e['entryId'] or 'workbench' in e['entryId']]
    bad = [e['entryId'] for e in entries if e.get('enabled') and e.get('fiberPhase') != 'active']
    if bad: raise RuntimeError('Inactive plugin entries: ' + ', '.join(bad))
    result['presets'] = [p['id'] for p in rpc('agentPresets/list', {}).get('presets', [])]
    print('Isolated archive installed; provider inventory verified', flush=True)
    workspace = rpc('workspace/create', {'request': {'path': str(WORK)}})['workspace']
    sid = rpc('session/create', {'request': {'workspaceId': workspace['workspaceId'], 'agentPreset': args.mode_fixture or 'standard'}})['sessionId']
    print('Synthetic Session created', flush=True)
    rpc('session/rename', {'request': {'sessionId': sid, 'title': 'V5 synthetic Team acceptance'}})
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
    playwright = sync_playwright().start()
    chrome = os.environ.get('CHROME_BINARY')
    if not chrome and os.name == 'nt': chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    browser = playwright.chromium.launch(headless=True, **({'executable_path': chrome} if chrome else {}))
    page = browser.new_page(viewport={'width': 1600, 'height': 1000},
        **({'locale': args.browser_locale} if args.browser_locale else {}))
    result['browserLocale'] = page.evaluate('navigator.language')
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(startup, wait_until='domcontentloaded')
    preview = page.get_by_role('button', name=re.compile('^(继续|Continue)$'))
    try: preview.click(timeout=3000)
    except PlaywrightTimeoutError: pass
    page.keyboard.press('Escape')
    row = page.locator('[role="treeitem"][data-row-key^="workspace:"]').filter(has_text='workspace').first
    row.wait_for(state='visible', timeout=20000)
    if row.get_attribute('aria-expanded') != 'true': row.click()
    page.locator(f'[data-row-key="session:{sid}"]').click(timeout=20000)
    if args.mode_fixture:
        seat = page.get_by_role('button', name=re.compile('^(标准模式|Standard|Synthetic mode compatibility fixture)$'))
        seat.click()
        page.get_by_role('menu').get_by_text('Synthetic mode compatibility fixture', exact=True).click()
        until = time.monotonic() + 15
        while time.monotonic() < until:
            preset_state = rpc('session/projections', {'request': {'sessionId': sid}}).get('values', {}).get('agentPreset')
            if preset_state == args.mode_fixture: break
            time.sleep(.1)
        else: raise RuntimeError('The selected synthetic mode did not reach the Session projection')
    rpc('session/prompt', {'request': {'sessionId': sid, 'requestId': str(uuid.uuid4()), 'mode': 'queue',
        'content': [{'type': 'text', 'text': 'V5_SMOKE_ROOT: use the synthetic Team plan.'}], 'clientTimeZone': 'Asia/Taipei'}})
    approve = page.get_by_role('button', name=re.compile('^(同意执行|Approve|Approve and run|Confirm this goal and scope)$', re.I))
    approve.wait_for(state='visible', timeout=45000)
    result['goalApprovalLabel'] = approve.inner_text()
    page.screenshot(path=str(RUN / 'goal-review.png'), full_page=True)
    approve.click()
    print('Synthetic goal approved through browser', flush=True)
    collapse = page.get_by_role('button', name=re.compile('^(收起右侧边栏|Collapse right sidebar)$'))
    if collapse.is_visible(): collapse.click()
    page.get_by_role('tab', name=re.compile('^(团队|Team)$')).click()
    pending_identity = None
    if args.pending_restart_fixture:
        until = time.monotonic() + 120
        while time.monotonic() < until:
            retained = rpc('session/projections', {'request': {'sessionId': sid}}).get('values', {}).get('agentTeam', {})
            if pending_paused and retained.get('completedTaskCount') == args.workers:
                task = next(t for t in retained['tasks'] if t.get('inputKey') == 'execute-worker-0')
                if task['work']['execution']['phase'] == 'running': break
            time.sleep(.2)
        else: raise RuntimeError('The unfinished execution did not reach its cold-restart checkpoint')
        pending_identity = (task['id'], task['work']['execution']['id'], task['work']['attempts'], task['work']['execution']['ownerId'])
        (RUN / 'pending-checkpoint.json').write_text(json.dumps(pending_identity), encoding='utf-8')
        if (WORK / 'worker-0.txt').exists(): raise RuntimeError('The pending execution wrote before its restart checkpoint')
        restart_host()
        pending_release = True
        rpc('session/prompt', {'request': {'sessionId': sid, 'requestId': str(uuid.uuid4()), 'mode': 'queue',
            'content': [{'type': 'text', 'text': 'Continue the existing unfinished execution; retain task, member, attempt and completed work.'}]}})
        page.goto(startup, wait_until='domcontentloaded')
        page.keyboard.press('Escape')
        page.locator(f'[data-row-key="session:{sid}"]').click(timeout=20000)
        page.get_by_role('tab', name=re.compile('^(团队|Team)$')).click()
    running_capture = False
    deadline = time.monotonic() + 150
    while time.monotonic() < deadline:
        state = rpc('session/projections', {'request': {'sessionId': sid}}).get('values', {}).get('agentTeam', {})
        if state.get('failure'): raise RuntimeError(state['failure'])
        if state.get('completedTaskCount') == expected_completed:
            notices = rpc('agentTeams/listMessages', {'agentId': sid})
            if (WORK / 'final.txt').exists() and any(item['id'].startswith('team-message-complete-') for item in notices): break
        if not running_capture and len(state.get('members', [])) == args.workers + 4 and state.get('completedTaskCount', 0) >= 1:
            page.screenshot(path=str(RUN / 'team-running.png'), full_page=True); running_capture = True
        (RUN / 'progress.json').write_text(json.dumps({'completed': state.get('completedTaskCount', 0), 'members': len(state.get('members', [])), 'requests': len(requests)}), encoding='utf-8')
        time.sleep(.3)
    else:
        (RUN / 'stalled-state.json').write_text(json.dumps(state, indent=2), encoding='utf-8')
        raise RuntimeError('Synthetic project did not finish; inspect isolated task state')
    result['members'] = len(state['members'])
    completed_tasks = archived_tasks()
    if pending_identity:
        (RUN / 'pending-resumed.json').write_text(json.dumps(state), encoding='utf-8')
        resumed = next(t for t in completed_tasks if t['id'] == pending_identity[0])
        observed = (resumed['id'], resumed['work']['execution']['id'], resumed['work']['attempts'], resumed['work']['execution']['ownerId'])
        if observed != pending_identity: raise RuntimeError('Cold continuation replaced the execution or member')
        if sum(r['actor'] == 'worker-0' and r['tool'] == 'write' for r in requests) != 1:
            raise RuntimeError('Cold continuation did not perform exactly one outstanding write')
        result['pendingExecutionColdRestart'] = True
    expected_final = 'V5_SYNTHETIC_FINAL_INPUT\n' if args.serial_update_fixture else 'V5_SYNTHETIC_UPDATED\n' if args.transform_input_fixture else 'V5_SYNTHETIC_INPUT\n'
    result['finalArtifactPublished'] = (WORK / 'final.txt').read_text(encoding='utf-8') == expected_final
    if not result['finalArtifactPublished']: raise RuntimeError('The final published artifact does not match the fixture')
    if args.transform_input_fixture:
        reader = next(t for t in completed_tasks if t['inputKey'] == 'execute-worker-0')
        strict = rpc('agentTeams/validateTaskReuse', {'agentId': sid, 'id': reader['id']})
        if strict['validity']['reusable']: raise RuntimeError('Strict reuse accepted a changed original input')
        result['approvedInputTransformHandoff'] = True
        snapshot = {'format': 'approved-serial-handoff-v1' if args.serial_update_fixture else 'approved-input-handoff-v1', 'tasks': sorted([{
            'planTask': t['inputKey'], 'status': t['status'], 'attempts': t['work']['attempts'],
            'phase': t['work']['execution']['phase'],
            'fixtureInput': next((r['sha256'] for r in t['work']['plan']['inputs'] if r['path'] == 'fixture.txt'), None),
            'artifacts': {r['path']: r['sha256'] for r in t['work']['execution']['submission']['artifacts']},
        } for t in completed_tasks], key=lambda t: t['planTask']),
            'finalSha256': hashlib.sha256((WORK / 'final.txt').read_bytes()).hexdigest()}
        (RUN / 'handoff-snapshot.json').write_text(json.dumps(snapshot, indent=2) + '\n', encoding='utf-8')
        if args.workers == 8:
            fixture_name = 'approved-revision-handoff.json' if args.adviser_revision_fixture else 'approved-serial-handoff.json' if args.serial_update_fixture else 'approved-input-handoff.json'
            expected = json.loads((Path(__file__).resolve().parents[1] / 'tests/expected' / fixture_name).read_text(encoding='utf-8'))
            if snapshot != expected: raise RuntimeError('The recorded handoff Session differs from its keyless snapshot')
            result['handoffSessionSnapshot'] = True
    print('Synthetic tasks independently accepted', flush=True)
    if args.adviser_revision_fixture:
        planning_task = next(t for t in completed_tasks if t['inputKey'] == 'planning')
        if planning_task['work']['attempts'] != 2 or any(t['work']['attempts'] != 1 for t in completed_tasks if t['inputKey'] != 'planning'):
            raise RuntimeError('Adviser revision did not retain completed work and retry only the rejected execution')
        notices = rpc('agentTeams/listMessages', {'agentId': sid})
        if len([m for m in notices if m['id'].startswith('team-message-task-rejected-')]) != 1:
            raise RuntimeError('Rejection did not produce exactly one durable coordinator notice')
        result['adviserRevisionRecovery'] = True
    result['completed'] = state['completedTaskCount']
    result['modelRequests'] = len(requests)
    result['observedActors'] = sorted({r['actor'] for r in requests})
    result['childTeamTools'] = all(r['teamTools'] for r in requests if r['actor'] != 'lead')
    result['grandchild'] = any(m.get('parentId') != sid and m.get('role') == 'teammate' for m in state['members'])
    result['parallelRequests'] = parallel_max
    if parallel_max != args.workers: raise RuntimeError('The requested execution concurrency was not observed')
    if not all(r['reasoning'] == ('high' if r['actor'] != 'lead' else None) for r in requests if r['purpose'] == 'task'):
        raise RuntimeError('An actual model request used the wrong reasoning setting')
    if any(r['maxTokens'] != 2048 for r in requests if r['purpose'] == 'task'):
        raise RuntimeError('The configured task output limit changed')
    result['configuredOutputLimitRetained'] = True
    result['compactionRequests'] = sum(r['purpose'] == 'compaction' for r in requests)
    if args.image_fixture:
        result['multimodalTransport'] = any(r['actor'] == 'worker-0' and r['imageInputs'] > 0 for r in requests)
        if not result['multimodalTransport']: raise RuntimeError('Grandchild image output did not reach a multimodal request')
    if args.mode_fixture:
        task_requests = [r for r in requests if r['purpose'] == 'task']
        if not all(r['syntheticPersona'] for r in task_requests): raise RuntimeError('A member lost the synthetic mode persona marker')
        if not all(r['syntheticModeSkill'] for r in task_requests if r['actor'] != 'lead'): raise RuntimeError('Mode-provided selected skill did not reach each member')
        if task_requests[0]['syntheticModeSkill']: raise RuntimeError('Unselected skill body entered the communicator context')
        result['syntheticModeCompatible'] = args.mode_fixture
    if args.custom_profile_fixture:
        if not all(r['customSkill'] for r in requests if r['actor'] != 'lead' and r['purpose'] == 'task'):
            raise RuntimeError('A retained member did not load the selected custom skill')
        if requests[0]['customSkill']: raise RuntimeError('An unselected custom skill entered the communicator context')
        result['customProfileAndSkill'] = True
    result['networkFixture'] = network_calls
    if args.shell_fixture:
        result['nativeWindowsShell'] = {'passed': len(shell_evidence) == 1, 'calls': len(shell_evidence),
            'programs': ['Node', 'Python', 'curl.exe'], 'unicodeRoundTrip': True}
        if len(shell_evidence) != 1: raise RuntimeError('The member must complete exactly one native PowerShell probe')
    if args.network_fixture and network_calls != {'search': args.workers, 'fetch': args.workers + int(args.shell_fixture)}:
        raise RuntimeError('Isolated members did not each complete their search and fetch calls')
    ids_before = sorted(m['id'] for m in state['members'])
    task_ids_before = sorted((t['id'], t.get('work', {}).get('execution', {}).get('id')) for t in completed_tasks)
    publication_stamp = (WORK / 'final.txt').stat().st_mtime_ns
    (RUN / 'projection.json').write_text(json.dumps(state, indent=2), encoding='utf-8')
    # All material is synthetic. The public report contains no startup URL or cookies.
    collapse = page.get_by_role('button', name=re.compile('^(收起右侧边栏|Collapse right sidebar)$'))
    if collapse.is_visible(): collapse.click()
    page.get_by_role('tab', name=re.compile('^(团队|Team)$')).click()
    page.locator('[data-team-view]').wait_for(state='visible', timeout=15000)
    page.get_by_role('button', name=worker_names[-1], exact=True).click()
    details = page.get_by_role('region', name=re.compile('^(成员详情|Member details)$'))
    if details.get_by_role('heading', name=worker_names[-1], exact=True).count() != 1:
        raise RuntimeError('The last member could not be inspected')
    search = page.get_by_role('searchbox', name=re.compile('^(搜索成员|Search members)$'))
    search.fill('worker-0')
    if page.locator('[data-team-member-list] button').count() != 1: raise RuntimeError('Member search did not filter the roster')
    search.fill('')
    if args.ui_model_fixture:
        page.get_by_role('button', name='worker-0', exact=True).click()
        controls = details.get_by_role('region', name=re.compile('^(成员与工作区|Member and workspace)$'))
        controls.locator('select').nth(1).wait_for(state='visible')
        member_before = next(m['id'] for m in state['members'] if m['name'] == 'worker-0')
        for variant in ['qa-alternative', 'qa-model']:
            controls.locator('select').nth(1).select_option(variant)
            controls.locator('select').nth(2).select_option('max')
            with page.expect_response(lambda response: '/api/agentTeams/configureMemberModel' in response.url, timeout=20000) as saved:
                controls.get_by_role('button', name=re.compile('^(保存成员模型|Save member model)$')).click()
            response = saved.value.json()['result']
            if not response.get('ok'): raise RuntimeError('UI model form returned an error')
            current = response['value']
            if current.get('model') != variant: raise RuntimeError('UI model form did not save its selected route')
            if current['id'] != member_before: raise RuntimeError('UI model change replaced the retained member')
            controls.get_by_role('button', name=re.compile('^(保存成员模型|Save member model)$')).wait_for(state='visible')
            page.wait_for_timeout(200)
        for function in ['verifier', 'executor']:
            controls.locator('select').nth(3).select_option(function)
            controls.get_by_role('textbox', name=re.compile('^(调整原因|Reason for this change)$')).fill('Synthetic UI responsibility round-trip')
            with page.expect_response(lambda response: '/api/agentTeams/configureMemberRole' in response.url, timeout=20000) as saved:
                controls.get_by_role('button', name=re.compile('^(保存职责|Save responsibility)$')).click()
            response = saved.value.json()['result']
            if not response.get('ok') or response['value'].get('teamFunction') != function or response['value']['id'] != member_before:
                raise RuntimeError('UI responsibility change lost its selected role or retained identity')
            page.wait_for_timeout(200)
        with page.expect_response(lambda response: '/api/agentTeams/retireMember' in response.url, timeout=20000) as saved:
            controls.get_by_role('button', name=re.compile('^(退休成员|Retire member)$')).click()
        if not saved.value.json()['result'].get('ok'): raise RuntimeError('UI retirement failed')
        restore = controls.get_by_role('button', name=re.compile('^(恢复成员|Reactivate member)$'))
        restore.wait_for(state='visible')
        with page.expect_response(lambda response: '/api/agentTeams/reactivateMember' in response.url, timeout=20000) as saved:
            restore.click()
        response = saved.value.json()['result']
        if not response.get('ok') or response['value']['id'] != member_before or response['value']['status'] != 'inactive':
            raise RuntimeError('UI reactivation replaced the retained member or failed')
        result['uiRoleAndRetirementRoundTrip'] = True
        page.screenshot(path=str(RUN / 'member-model-controls.png'), full_page=True)
        result['uiModelFormSaved'] = True
    page.get_by_role('button', name='lead', exact=True).click()
    result['lastMemberAndSearchAccessible'] = True
    page.screenshot(path=str(RUN / 'team-desktop.png'), full_page=True)
    page.get_by_role('button', name=re.compile('^(完整方案|Complete plan)$')).click()
    page.screenshot(path=str(RUN / 'full-plan.png'), full_page=True)
    page.get_by_role('tab', name=re.compile('^(成员|Members)$')).click()
    for label, file in [('记忆|Memory', 'memory'), ('消息|Messages', 'mailbox'), ('长期专家|Experts', 'experts'), ('诊断与资源|Diagnostics & resources', 'diagnostics')]:
        page.get_by_role('tab', name=re.compile('^(' + label + ')$')).click()
        page.screenshot(path=str(RUN / ('team-' + file + '.png')), full_page=True)
    with page.expect_download() as exported:
        page.get_by_role('button', name=re.compile('^(导出诊断（不含正文）|Export diagnostics.*)$')).click()
    exported.value.save_as(RUN / 'diagnostic.json')
    diagnostic = json.loads((RUN / 'diagnostic.json').read_text(encoding='utf-8'))
    if 'definition' in diagnostic['goal'] or 'persona' in json.dumps(diagnostic): raise RuntimeError('Diagnostic export contains private prose')
    result['diagnosticExport'] = True
    page.get_by_role('button', name=re.compile('^(团队设置|Team settings)$')).click()
    page.screenshot(path=str(RUN / 'team-settings.png'), full_page=True)
    page.get_by_role('button', name=re.compile('^(返回成员|Back to members)$')).click()
    page.get_by_role('tab', name=re.compile('^(成员|Members)$')).click()
    page.emulate_media(color_scheme='dark')
    page.screenshot(path=str(RUN / 'team-dark.png'), full_page=True)
    page.emulate_media(color_scheme='light')
    page.set_viewport_size({'width': 390, 'height': 844})
    page.screenshot(path=str(RUN / 'team-mobile.png'), full_page=True)
    result['horizontalOverflow'] = page.evaluate('document.documentElement.scrollWidth > innerWidth')
    result['browserErrors'] = errors
    if errors: raise RuntimeError('Browser JavaScript errors occurred')
    if args.transform_input_fixture:
        control_steps = [('qa-archived-input', 'team_workspace', {'action': 'read_input', 'task_id': reader['id'],
            'execution_id': reader['work']['execution']['id'], 'file_path': 'fixture.txt'})]
        rpc('session/prompt', {'request': {'sessionId': sid, 'requestId': str(uuid.uuid4()), 'mode': 'queue',
            'content': [{'type': 'text', 'text': 'Inspect the original immutable input receipt after publication; do not repeat the task.'}]}})
        until = time.monotonic() + 30
        while time.monotonic() < until and not archived_input_seen: time.sleep(.1)
        control_steps = []
        if not archived_input_seen: raise RuntimeError('The retained original input did not reach the model')
        result['archivedInputReadableAfterPublication'] = True
    for variant in ['qa-alternative', 'qa-model']:
        before = len(requests)
        control_steps = [('switch-' + variant, 'team_member', {'action': 'configure_model', 'target': 'worker-0',
            'model_provider': 'qa-local', 'model': variant, 'reasoning_effort': 'max'}),
            ('wake-' + variant, 'send_message', {'target': 'worker-0', 'message': 'Check the retained goal and identity. No new execution or project action is needed.'})]
        rpc('session/prompt', {'request': {'sessionId': sid, 'requestId': str(uuid.uuid4()), 'mode': 'queue',
            'content': [{'type': 'text', 'text': 'V5_SYNTHETIC_ROUTE_PROBE ' + variant}]}})
        until = time.monotonic() + 45
        while time.monotonic() < until:
            if any(r['actor'] == 'worker-0' and r['model'] == variant for r in requests[before:]): break
            time.sleep(.2)
        else: raise RuntimeError('Retained grandchild did not use the selected model: ' + variant)
        time.sleep(.5)
        control_steps = []
    result['inPlaceModelSwitch'] = True
    def restart_and_verify():
        restart_host()
        before = len(requests)
        rpc('session/prompt', {'request': {'sessionId': sid, 'requestId': str(uuid.uuid4()), 'mode': 'queue',
            'content': [{'type': 'text', 'text': 'V5_SYNTHETIC_RECOVERY_PROBE: retain the accepted work.'}]}})
        until = time.monotonic() + 30
        while time.monotonic() < until:
            current = rpc('session/projections', {'request': {'sessionId': sid}}).get('values', {}).get('agentTeam', {})
            if len(requests) > before and current.get('completedTaskCount') == expected_completed: break
            time.sleep(.2)
        else: raise RuntimeError('Retained Team did not recover after restart')
        if sorted(m['id'] for m in current['members']) != ids_before: raise RuntimeError('Member identities changed on restart')
        if sorted((t['id'], t.get('work', {}).get('execution', {}).get('id')) for t in archived_tasks()) != task_ids_before:
            raise RuntimeError('Task executions changed on restart')
        if (WORK / 'final.txt').stat().st_mtime_ns != publication_stamp: raise RuntimeError('An accepted artifact was unnecessarily republished')
        if any(r['actor'] != 'lead' for r in requests[before:]): raise RuntimeError('Completed members were unnecessarily restarted')
        notices = rpc('agentTeams/listMessages', {'agentId': sid})
        if len([item for item in notices if item['id'].startswith('team-message-complete-')]) != 1:
            raise RuntimeError('The final delivery notice was lost or duplicated after restart')
        return current
    state = restart_and_verify()
    result['restartPreserved'] = True
    print('Retained model switch and host restart verified', flush=True)
    result['passed'] = not args.keep_open_seconds
    if args.keep_open_seconds:
        browser.close(); browser = None
        playwright.stop(); playwright = None
        (RUN / 'ready.json').write_text(json.dumps({'pid': process.pid, 'port': int(match.group(1)), 'sessionId': sid}), encoding='utf-8')
        end = time.monotonic() + args.keep_open_seconds
        next_restart = time.monotonic() + 600
        samples = []
        while time.monotonic() < end:
            current = rpc('session/projections', {'request': {'sessionId': sid}}).get('values', {}).get('agentTeam', {})
            if current.get('completedTaskCount') != expected_completed or current.get('failure'): raise RuntimeError('Completed state changed during soak')
            if time.monotonic() >= next_restart:
                restart_and_verify(); next_restart = time.monotonic() + 600
            samples.append({'elapsed': args.keep_open_seconds - (end - time.monotonic()), 'requests': len(requests),
                            'completed': current.get('completedTaskCount'), 'members': len(current.get('members', []))})
            (RUN / 'soak.json').write_text(json.dumps(samples), encoding='utf-8')
            (RUN / 'process.json').write_text(json.dumps({'runnerPid': os.getpid(), 'hostPid': process.pid, 'phase': 'soaking'}), encoding='utf-8')
            time.sleep(min(10, max(.1, end - time.monotonic())))
        result['soakSeconds'] = args.keep_open_seconds
        result['passed'] = True
except Exception as error:
    result['browserErrors'] = errors if 'errors' in locals() else []
    if browser:
        try:
            page.screenshot(path=str(RUN / 'failure.png'), full_page=True)
            (RUN / 'failure-ui.txt').write_text(page.locator('body').inner_text(), encoding='utf-8')
            result['visibleButtonNames'] = page.get_by_role('button').all_text_contents()
        except Exception: pass
    result.update({'passed': False, 'error': str(error)})
    raise
finally:
    if browser: browser.close()
    if playwright: playwright.stop()
    server.shutdown(); server.server_close()
    process.terminate()
    try: process.wait(timeout=15)
    except subprocess.TimeoutExpired: process.kill(); process.wait(timeout=10)
    stdout.close(); stderr.close()
    tool_errors = []
    session_root = HOME / 'sessions'
    if os.name == 'nt': session_root = Path('\\\\?\\' + str(session_root))
    for file in session_root.rglob('*.zstd'):
        with file.open('rb') as source:
            data = zstandard.ZstdDecompressor().stream_reader(source).read().decode('utf-8')
        for line in data.splitlines():
            event = json.loads(line)
            if event.get('type') == 'tool/result' and event['data']['message'].get('isError'):
                tool_errors.append({'session': file.parent.name, 'seq': event.get('seq')})
    result['toolErrors'] = tool_errors
    result['mcpCalls'] = len((RUN / 'mcp-calls.jsonl').read_text(encoding='utf-8').splitlines()) if (RUN / 'mcp-calls.jsonl').exists() else 0
    if args.mcp_fixture:
        pids = {row['pid'] for row in [json.loads(line) for line in (RUN / 'mcp-calls.jsonl').read_text(encoding='utf-8').splitlines()]}
        def alive(pid):
            if os.name != 'nt':
                try: os.kill(pid, 0); return True
                except ProcessLookupError: return False
            import ctypes
            from ctypes import wintypes
            kernel = ctypes.WinDLL('kernel32', use_last_error=True)
            kernel.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]; kernel.OpenProcess.restype = wintypes.HANDLE
            kernel.GetExitCodeProcess.argtypes = [wintypes.HANDLE, ctypes.POINTER(wintypes.DWORD)]
            kernel.CloseHandle.argtypes = [wintypes.HANDLE]
            handle = kernel.OpenProcess(0x1000, False, pid)
            if not handle:
                if ctypes.get_last_error() in (87, 1168): return False
                raise OSError(ctypes.get_last_error(), 'Cannot inspect the isolated MCP process')
            try:
                code = wintypes.DWORD()
                if not kernel.GetExitCodeProcess(handle, ctypes.byref(code)): raise OSError(ctypes.get_last_error())
                return code.value == 259
            finally: kernel.CloseHandle(handle)
        until = time.monotonic() + 10
        while time.monotonic() < until and any(alive(pid) for pid in pids): time.sleep(.1)
        result['mcpProcessesCleaned'] = not any(alive(pid) for pid in pids)
        if not result['mcpProcessesCleaned']: result.update({'passed': False, 'error': 'An isolated MCP process survived host shutdown'})
    if args.mcp_fixture and result['mcpCalls'] != args.workers:
        result.update({'passed': False, 'error': 'Each isolated worker must call the real stdio MCP bridge exactly once'})
    if tool_errors: result.update({'passed': False, 'error': 'Recorded tool failures occurred in the synthetic acceptance flow'})
    result['requestAudit'] = requests
    result['modelRequests'] = len(requests)
    (RUN / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    if tool_errors: raise RuntimeError('Recorded tool failures occurred; inspect isolated result metadata')
    if args.mcp_fixture and result['mcpCalls'] != args.workers: raise RuntimeError('MCP bridge acceptance failed')
    if args.mcp_fixture and not result['mcpProcessesCleaned']: raise RuntimeError('MCP cleanup acceptance failed')
