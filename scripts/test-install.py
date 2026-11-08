"""Verify profile migration, explicit customization, dependency rollback and removal in a fresh home."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
import yaml

parser = argparse.ArgumentParser()
parser.add_argument('--cli', required=True)
parser.add_argument('--archive', required=True)
parser.add_argument('--run', required=True)
parser.add_argument('--package-name', choices=['@dsh-workbench/team', 'dsh-team-workbench'], default='@dsh-workbench/team')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
run = Path(args.run).resolve()
if run.exists():
    raise RuntimeError('Choose a new test directory; existing profiles are never reused')
run.mkdir(parents=True)
home = run / 'home'
cli = Path(args.cli).resolve()
archive = Path(args.archive).resolve()
node = os.environ.get('NODE_BINARY', 'node')
env = {k: v for k, v in os.environ.items() if not any(s in k.upper() for s in ('KEY', 'TOKEN', 'SECRET', 'PASSWORD'))}
env.update({'DSH_HOME': str(home), 'USERPROFILE': str(run / 'user'), 'APPDATA': str(run / 'user/roaming'),
            'LOCALAPPDATA': str(run / 'user/local'), 'COREPACK_ENABLE_DOWNLOAD_PROMPT': '0'})
flags = {'creationflags': subprocess.CREATE_NO_WINDOW} if os.name == 'nt' else {}
counter = 0


def command(argv, succeeds=True):
    global counter
    counter += 1
    completed = subprocess.run([node, *map(str, argv)], env=env, cwd=run, capture_output=True,
                               encoding='utf-8', errors='replace', timeout=360, **flags)
    (run / f'command-{counter}.out').write_text(completed.stdout, encoding='utf-8')
    (run / f'command-{counter}.err').write_text(completed.stderr, encoding='utf-8')
    if (completed.returncode == 0) != succeeds:
        raise RuntimeError(f'Isolated command {counter} did not have its expected result')
    return completed


command([cli, '--profile', 'web', '--dump-default-config'])
command([cli, 'plugin', '--profile', 'web', 'add', archive])
profile = home / 'profiles/web'
patch_path = profile / 'cordis.patch.yml'
bundle = profile / 'node_modules' / args.package_name
other_package = '@dsh-workbench/team' if args.package_name == 'dsh-team-workbench' else 'dsh-team-workbench'
initial_files = {name: (profile / name).read_bytes() for name in ('package.json', 'cordis.yml', 'pnpm-lock.yaml') if (profile / name).exists()}
rejected = command([root / 'scripts/install.mjs', '--cli', cli, '--home', home, '--profile', 'web', '--archive', archive,
                    '--package-name', other_package], succeeds=False)
if 'cross-name migration' not in rejected.stderr or any((profile / name).read_bytes() != data for name, data in initial_files.items()):
    raise RuntimeError('Cross-name installation was not rejected without modifying the profile')


class FixtureLoader(yaml.SafeLoader):
    pass


FixtureLoader.add_constructor('tag:yaml.org,2002:js', lambda loader, item: loader.construct_scalar(item))
rows = yaml.load((bundle / 'cordis.patch.yml').read_text(encoding='utf-8'), Loader=FixtureLoader)
runtime = next(entry['config'] for row in rows for entry in row.get('insert', []) if entry['id'] == 'agent-team')
for key in ('portableEventEnvelope', 'autoProvisionPlannedMembers', 'maxProvisionPerPass', 'plannedMemberProvider', 'finalDelivery', 'coordinationRoot'):
    runtime.pop(key, None)
runtime['maxMembers'] = 43
runtime['workspaceIsolation']['storageRoot'] = str(home / 'private-workspaces')
originals = [
    {'id': 'tools', 'config': {'mode': 'native', 'maxParallelSubCalls': 3}},
    {'id': 'subagent', 'config': {'maxDepth': 4}},
    {'id': 'sandbox-policy', 'config': {'mode': 'workspace-write'}},
    {'id': 'web', 'config': {'searchProvider': 'synthetic-search'}},
    {'id': 'agent-default-model', 'config': {'provider': 'synthetic-preserved', 'model': 'synthetic-model', 'reasoningEffort': 'off'}},
    {'id': 'preset-standard', 'disabled': False},
]
patch_path.write_text(yaml.safe_dump([*originals, {'id': 'agent-team', 'config': runtime}], allow_unicode=True), encoding='utf-8')
sentinel = home / 'synthetic-session-sentinel.bin'
sentinel.write_bytes(b'RETAIN_SYNTHETIC_SESSION_BYTES\x00\x01')
before_sentinel = sentinel.read_bytes()
helper = [root / 'scripts/install.mjs', '--cli', cli, '--home', home, '--profile', 'web', '--archive', archive, '--package-name', args.package_name]
original_patch = patch_path.read_bytes()
command(helper)
if patch_path.read_bytes() != original_patch:
    raise RuntimeError('Planning changed the original patch')
command([*helper, '--apply', '--host-stopped'])
migrated = yaml.safe_load(patch_path.read_text(encoding='utf-8'))
by_id = {row['id']: row for row in migrated}
for old, new in [('tools', 'workbench-tools'), ('subagent', 'workbench-subagent'),
                 ('sandbox-policy', 'workbench-sandbox-policy'), ('web', 'workbench-web')]:
    wanted = next(row['config'] for row in originals if row['id'] == old)
    if by_id[new]['config'] != wanted:
        raise RuntimeError('A user provider setting changed during migration')
for row in originals[4:]:
    if by_id[row['id']] != row:
        raise RuntimeError('An unrelated model or mode row changed')
current = by_id['agent-team']['config']
if current['maxMembers'] != 43 or current['portableEventEnvelope'] is not True or current['autoProvisionPlannedMembers'] is not True or current['finalDelivery'] != 'publish-and-notify':
    raise RuntimeError('Missing V5 defaults or lost custom limit')
current['autoProvisionPlannedMembers'] = False
current['finalDelivery'] = 'manual'
patch_path.write_text(yaml.safe_dump(migrated, allow_unicode=True), encoding='utf-8')
command([*helper, '--apply', '--host-stopped'])
after_explicit = yaml.safe_load(patch_path.read_text(encoding='utf-8'))
explicit = next(row['config'] for row in after_explicit if row['id'] == 'agent-team')
if explicit['autoProvisionPlannedMembers'] is not False or explicit['finalDelivery'] != 'manual':
    raise RuntimeError('Explicit user choices were replaced by defaults')

files = ['package.json', 'cordis.yml', 'cordis.patch.yml', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']
hashes = {name: hashlib.sha256((profile / name).read_bytes()).hexdigest() for name in files}
dependency_path = bundle.resolve()
runtime_path = bundle / 'node_modules/@dsh-workbench/team-runtime/lib/index.js'
runtime_hash = hashlib.sha256(runtime_path.read_bytes()).hexdigest()
wrong = run / 'wrong-version.tgz'
with tarfile.open(archive, 'r:gz') as source, tarfile.open(wrong, 'w:gz') as target:
    for entry in source:
        content = source.extractfile(entry).read() if entry.isfile() else None
        if entry.name == 'package/package.json':
            data = json.loads(content)
            data['version'] = '0.5.0-rc.0'
            content = (json.dumps(data) + '\n').encode()
            entry.size = len(content)
        target.addfile(entry, io.BytesIO(content) if content is not None else None)
wrong_helper = [root / 'scripts/install.mjs', '--cli', cli, '--home', home, '--profile', 'web', '--archive', wrong, '--package-name', args.package_name]
command([*wrong_helper, '--apply', '--host-stopped'], succeeds=False)
if any(hashlib.sha256((profile / name).read_bytes()).hexdigest() != digest for name, digest in hashes.items()):
    raise RuntimeError('Failed installation did not restore profile bytes')
if bundle.resolve() != dependency_path or hashlib.sha256(runtime_path.read_bytes()).hexdigest() != runtime_hash:
    raise RuntimeError('Failed installation did not restore the actual dependency directory')
if sentinel.read_bytes() != before_sentinel:
    raise RuntimeError('Session sentinel changed')
command([cli, '--profile', 'web', '--dump-config'])
patch_path.write_text(yaml.safe_dump(originals, allow_unicode=True), encoding='utf-8')
command([cli, 'plugin', '--profile', 'web', 'remove', args.package_name])
command([cli, '--profile', 'web', '--dump-config'])
if sentinel.read_bytes() != before_sentinel or yaml.safe_load(patch_path.read_text(encoding='utf-8')) != originals:
    raise RuntimeError('Removal changed unrelated settings or Session sentinel')
result = {'passed': True, 'packageName': args.package_name, 'realPaidRequests': 0, 'planIsReadOnly': True, 'providerSettingsRetained': True,
          'duplicateBundleRejectedBeforeMutation': True,
          'modelAndModeRowsRetained': True, 'v5DefaultsAdded': True, 'explicitChoicesRetained': True,
          'failureRestoredProfileBytes': True, 'failureRestoredDependencies': True,
          'sessionSentinelRetained': True, 'removalVerified': True, 'commands': counter}
(run / 'result.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result))
