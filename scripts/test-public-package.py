"""Check packed public files and demonstrate rejection of altered metadata and runtime bytes."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tarfile

parser = argparse.ArgumentParser()
parser.add_argument('--archive', required=True)
parser.add_argument('--run', required=True)
args = parser.parse_args()
run = Path(args.run).resolve()
run.mkdir(parents=True, exist_ok=False)
with tarfile.open(args.archive, 'r:gz') as archive:
    for entry in archive:
        parts = Path(entry.name).parts
        if not parts or parts[0] != 'package' or '..' in parts or entry.issym() or entry.islnk():
            raise RuntimeError('Archive member is outside the public package')
        if any(part in ['private-qa', 'source', '.git', 'node_modules'] or part.startswith('.env') for part in parts):
            raise RuntimeError('Private, development or dependency files entered the public package')
    archive.extractall(run, filter='data')
package = run / 'package'
meta_path = package / 'package.json'
meta_bytes = meta_path.read_bytes()
meta = json.loads(meta_bytes)
if meta['name'] != 'dsh-team-workbench' or meta['version'] != '0.5.0-rc.2':
    raise RuntimeError('Wrong public identity')
baseline = json.loads((package / 'public-runtime-sha256.json').read_text(encoding='utf-8'))
for name, digest in baseline.items():
    if hashlib.sha256((package / name).read_bytes()).hexdigest() != digest:
        raise RuntimeError('Public runtime hash differs')
node = os.environ.get('NODE_BINARY', 'node')


def check(succeeds, expected=''):
    result = subprocess.run([node, str(package / 'scripts/check-public.mjs')], capture_output=True,
                            encoding='utf-8', errors='replace', timeout=30)
    if (result.returncode == 0) != succeeds or expected not in result.stdout + result.stderr:
        raise RuntimeError('Public package guard did not produce the expected result: ' + result.stderr[:1000])


check(True)
try:
    meta['version'] = '0.5.0-rc.0'
    meta_path.write_text(json.dumps(meta), encoding='utf-8')
    check(False, 'Root package identity')
finally:
    meta_path.write_bytes(meta_bytes)
runtime = package / 'lib/index.js'
runtime_bytes = runtime.read_bytes()
try:
    runtime.write_bytes(runtime_bytes + b'\n// altered test input\n')
    check(False, 'Runtime differs')
finally:
    runtime.write_bytes(runtime_bytes)
result = {'passed': True, 'runtimeFilesVerified': len(baseline), 'privateFilesExcluded': True,
          'metadataMismatchRejected': True, 'runtimeTamperingRejected': True, 'realPaidRequests': 0}
(run / 'result.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result))
