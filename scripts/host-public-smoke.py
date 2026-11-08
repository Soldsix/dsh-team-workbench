"""Load the public bundle in a stock profile and call its tools without a browser or paid API."""
import argparse
import http.cookiejar
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import subprocess
import threading
import time
import urllib.request
import uuid
import zstandard

parser = argparse.ArgumentParser()
parser.add_argument('--cli', required=True)
parser.add_argument('--package', required=True, help='Archive or Git source supported by dsh plugin add')
parser.add_argument('--run', required=True)
args = parser.parse_args()
run = Path(args.run).resolve()
run.mkdir(parents=True, exist_ok=False)
home, work = run / 'home', run / 'workspace'
work.mkdir()
cli = Path(args.cli).resolve()
node = os.environ.get('NODE_BINARY', 'node')
env = {k: v for k, v in os.environ.items() if not any(s in k.upper() for s in ('KEY', 'TOKEN', 'SECRET', 'PASSWORD'))}
env.update({'DSH_HOME': str(home), 'USERPROFILE': str(run / 'user'), 'APPDATA': str(run / 'user/roaming'),
            'LOCALAPPDATA': str(run / 'user/local'), 'COREPACK_ENABLE_DOWNLOAD_PROMPT': '0', 'QA_MODEL_KEY': 'synthetic-only'})
flags = {'creationflags': subprocess.CREATE_NO_WINDOW} if os.name == 'nt' else {}
root = Path(__file__).resolve().parents[1]
package = str(Path(args.package).resolve()) if Path(args.package).exists() else args.package
for index, arguments in enumerate((['--profile', 'web', '--dump-default-config'], ['plugin', '--profile', 'web', 'add', package])):
    completed = subprocess.run([node, str(cli), *arguments], cwd=work, env=env, capture_output=True,
                               encoding='utf-8', errors='replace', timeout=360, **flags)
    (run / f'install-{index}.out').write_text(completed.stdout, encoding='utf-8')
    (run / f'install-{index}.err').write_text(completed.stderr, encoding='utf-8')
    if completed.returncode != 0:
        raise RuntimeError(f'Isolated installation step {index} failed')

observations = []
auxiliary = []
failures = []
finished = threading.Event()


class Fixture(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def do_POST(self):
        try:
            body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            tools = {tool['function']['name'] for tool in body.get('tools', [])}
            required = {'team_help', 'team_skill_catalog', 'spawn_teammate', 'team_member', 'team_task_update'}
            if tools and not required.issubset(tools):
                raise RuntimeError('Actual model request lacks Team tools: ' + ', '.join(sorted(required - tools)) + '; available: ' + ', '.join(sorted(tools)))
            replies = [message for message in body['messages'] if message.get('role') == 'tool']
            for reply in replies:
                if 'error' in str(reply.get('content', '')).lower()[:100]:
                    raise RuntimeError('A Team tool returned an error')
            if tools:
                observations.append({'model': body['model'], 'toolCount': len(tools), 'toolReplies': len(replies)})
            if not tools:
                last = str(body.get('messages', [{}])[-1].get('content', ''))
                auxiliary.append({'model': body['model'], 'lastMessagePrefix': last[:180]})
                summary = '\n\n'.join('## ' + heading + '\n- Read startup help and list skills; do not modify files.' for heading in
                    ['Primary Request and Intent', 'Key Technical Concepts', 'Files and Code', 'Errors and Fixes', 'Pending Jobs',
                     'Current Work', 'Next Step', 'Critical Context'])
                delta, finish = {'role': 'assistant', 'content': summary}, 'stop'
            elif len(replies) < 2:
                name = ['team_help', 'team_skill_catalog'][len(replies)]
                arguments = {'topic': 'start'} if name == 'team_help' else {}
                delta = {'role': 'assistant', 'tool_calls': [{'index': 0, 'id': f'public-call-{len(replies)}', 'type': 'function',
                         'function': {'name': name, 'arguments': json.dumps(arguments)}}]}
                finish = 'tool_calls'
            else:
                delta, finish = {'role': 'assistant', 'content': 'PUBLIC_ROOT_TOOLS_OK'}, 'stop'
                finished.set()
            frames = [{'id': 'public-fixture', 'object': 'chat.completion.chunk', 'model': body['model'],
                       'choices': [{'index': 0, 'delta': delta, 'finish_reason': None}]},
                      {'id': 'public-fixture', 'object': 'chat.completion.chunk', 'model': body['model'],
                       'choices': [{'index': 0, 'delta': {}, 'finish_reason': finish}],
                       'usage': {'prompt_tokens': 10, 'completion_tokens': 10, 'total_tokens': 20}}]
            payload = (''.join('data: ' + json.dumps(frame) + '\n\n' for frame in frames) + 'data: [DONE]\n\n').encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        except Exception as error:
            failures.append(str(error))
            self.send_error(500)


server = ThreadingHTTPServer(('127.0.0.1', 0), Fixture)
thread = threading.Thread(target=server.serve_forever)
thread.start()
process = None
stdout = stderr = None
result = {'passed': False, 'browserUsed': False, 'realPaidRequests': 0, 'modeBodiesRead': False}
try:
    overlay = [
        {'id': 'llm-pi-ai', 'config': {'providers': {'qa-public': {'apiKeyEnv': 'QA_MODEL_KEY', 'api': 'openai-completions',
            'baseURL': f'http://127.0.0.1:{server.server_address[1]}/v1', 'models': [{'id': 'qa-public-model',
            'name': 'Synthetic public package test', 'contextWindow': 131072, 'maxTokens': 2048, 'reasoningEfforts': {'off': None, 'high': 'high'}}]}}}},
        {'id': 'agent-default-model', 'config': {'provider': 'qa-public', 'model': 'qa-public-model', 'reasoningEffort': 'off'}},
        {'id': 'hmr', 'disabled': True},
    ]
    (run / 'overlay.json').write_text(json.dumps(overlay), encoding='utf-8')
    stdout, stderr = (run / 'host.out').open('w', encoding='utf-8'), (run / 'host.err').open('w', encoding='utf-8')
    process = subprocess.Popen([node, str(cli), 'web', '--patch', str(run / 'overlay.json'), '--port', '0', '--no-open'],
                               cwd=work, env=env, stdout=stdout, stderr=stderr, **flags)
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError('Public root host exited before readiness')
        match = re.search(r'http://(?:127\.0\.0\.1|localhost):(\d+)/[^\s]*', (run / 'host.out').read_text(encoding='utf-8-sig'))
        if match:
            break
        time.sleep(.1)
    else:
        raise RuntimeError('Public root host startup timed out')
    base = f'http://127.0.0.1:{match.group(1)}'
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    with opener.open(match.group(0), timeout=15) as response:
        response.read()

    def rpc(method, values):
        payload = json.dumps({'type': 'client-request', 'rpcId': str(uuid.uuid4()), 'method': method, 'payload': {'args': values}}).encode()
        request = urllib.request.Request(base + '/api/' + method, data=payload, headers={'Origin': base, 'Content-Type': 'application/json'})
        with opener.open(request, timeout=30) as response:
            value = json.loads(response.read())['result']
        if not value.get('ok'):
            raise RuntimeError(str(value.get('error')))
        return value.get('value')

    entries = rpc('pluginInventory/list', {})['entries']
    result['providerInventory'] = [{key: entry.get(key) for key in ('entryId', 'fiberPhase', 'enabled')} for entry in entries]
    required = {'include:' + name for name in ('team-workbench-skills', 'agent-team', 'team-experts', 'tool-agent-team', 'ui-agent-team',
                'workbench-tools', 'workbench-sandbox-policy', 'workbench-subagent', 'workbench-web', 'workbench-web-fetch-http')}
    active = {entry['entryId'] for entry in entries if entry.get('enabled') and entry.get('fiberPhase') == 'active'}
    if not required.issubset(active):
        raise RuntimeError('Required public bundle providers are not active: ' + ', '.join(sorted(required - active)))
    result['activeTeamProviders'] = sorted(required)
    workspace = rpc('workspace/create', {'request': {'path': str(work)}})['workspace']
    sid = rpc('session/create', {'request': {'workspaceId': workspace['workspaceId'], 'agentPreset': 'standard'}})['sessionId']
    rpc('session/prompt', {'request': {'sessionId': sid, 'requestId': str(uuid.uuid4()), 'mode': 'queue',
        'content': [{'type': 'text', 'text': 'Read Team startup help and list the available skills. Do not create members or modify files.'}],
        'clientTimeZone': 'Asia/Taipei'}})
    if not finished.wait(timeout=60) or failures:
        raise RuntimeError('Local tool conversation did not complete: ' + '; '.join(failures))
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        events = []
        logs = home / 'sessions'
        if os.name == 'nt':
            logs = Path('\\\\?\\' + str(logs))
        for file in logs.rglob('*.zstd'):
            if file.parent.name != sid:
                continue
            try:
                with file.open('rb') as source:
                    events.extend(json.loads(line) for line in zstandard.ZstdDecompressor().stream_reader(source).read().decode('utf-8').splitlines())
            except (zstandard.ZstdError, json.JSONDecodeError, UnicodeDecodeError):
                continue
        if any(row['type'] == 'turn/end' for row in events) and 'PUBLIC_ROOT_TOOLS_OK' in json.dumps(events):
            break
        time.sleep(.1)
    else:
        raise RuntimeError('Tool conversation did not reach a persisted completed turn')
    if len(observations) != 3 or observations[-1]['toolReplies'] != 2:
        raise RuntimeError('Unexpected multi-step tool conversation')
    result.update({'passed': True, 'modelRequests': observations, 'toolsCalled': ['team_help', 'team_skill_catalog'],
                   'persistedTurnEnd': True})
finally:
    if process is not None and process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=20)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=10)
    if stdout is not None:
        stdout.close()
    if stderr is not None:
        stderr.close()
    server.shutdown()
    server.server_close()
    thread.join(timeout=10)
    if thread.is_alive():
        raise RuntimeError('Local model server did not stop')
    result['hostStopped'] = process is not None and process.poll() is not None
    result['modelRequests'] = observations
    result['auxiliaryRequests'] = auxiliary
    result['fixtureErrors'] = failures
    (run / 'result.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: value for key, value in result.items() if key not in ('providerInventory', 'auxiliaryRequests')}))
