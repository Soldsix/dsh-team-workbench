"""Require real release checks to reject synthetic damaged archives in separate fixture roots."""
from pathlib import Path
import argparse
import hashlib
import io
import json
import shutil
import subprocess
import sys
import tarfile

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--archive', required=True)
parser.add_argument('--run', required=True)
args = parser.parse_args()
fixture_root = Path(args.run).resolve()
if fixture_root.exists():
    raise RuntimeError('Choose a new fixture root')
fixture_root.mkdir(parents=True)
original = Path(args.archive).resolve()
with tarfile.open(original, 'r:gz') as packed:
    manifest = json.loads(packed.extractfile('package/package.json').read())
    files = {entry.name: hashlib.sha256(packed.extractfile(entry).read()).hexdigest()
             for entry in packed.getmembers() if entry.isfile() and
             ('/lib/' in entry.name or '/skills/' in entry.name or '/examples/custom-skills/' in entry.name
              or entry.name.endswith('/package.json') or entry.name == 'package/cordis.patch.yml')}
# Only damaged archives receive this synthetic evidence; every case must fail before ZIP creation.
evidence = {'releaseStatus': 'candidate-validated', 'core': {'failed': 0}, 'ui': {'failed': 0},
    'compatibility': {'failed': 0}, 'parallel': {str(n): {'passed': True, 'soakSeconds': 10800} for n in [8,20,32]},
    'publishedDeclarations': {'passed': True},
    'testedExecutionManifestSHA256': hashlib.sha256(json.dumps({name: digest for name, digest in files.items() if not name.endswith('.d.ts')}, sort_keys=True, separators=(',', ':')).encode()).hexdigest(),
    'testedRuntimeManifestSHA256': hashlib.sha256(json.dumps(files, sort_keys=True, separators=(',', ':')).encode()).hexdigest()}
cases = [
    ('unsafe-path', 'The npm archive contains an unsafe path or link'),
    ('changed-runtime', 'The archive runtime differs from the runtime used in final acceptance'),
    ('changed-execution', 'The archive execution files differ from the executed acceptance runtime'),
    ('damaged-source', 'Internal checksum mismatch:'),
]
results = []
for name, expected in cases:
    target = fixture_root / name
    if target.exists():
        raise RuntimeError('Use a new fixture root; no old evidence is replaced')
    for folder in ['scripts', 'docs', 'packages/team', 'artifacts']:
        (target / folder).mkdir(parents=True)
    shutil.copy2(root / 'scripts/package-release.py', target / 'scripts/package-release.py')
    (target / 'packages/team/package.json').write_text(json.dumps(manifest), encoding='utf-8')
    (target / 'docs/release-evidence.json').write_text(json.dumps(evidence), encoding='utf-8')
    archive = target / 'artifacts' / original.name
    changed = False
    with tarfile.open(original, 'r:gz') as source, tarfile.open(archive, 'w:gz') as output:
        for item in source.getmembers():
            if not item.isfile():
                output.addfile(item)
                continue
            data = source.extractfile(item).read()
            if name in ['changed-runtime', 'changed-execution'] and item.name == 'package/lib/index.js':
                data += b'\n// synthetic untested runtime fixture\n'
                changed = True
            if name == 'damaged-source' and item.name == 'package/modules/runtime/src/roster.ts':
                data += b'\n// synthetic checksum mismatch fixture\n'
                changed = True
            item.size = len(data)
            output.addfile(item, io.BytesIO(data))
        if name == 'unsafe-path':
            item = tarfile.TarInfo('/synthetic-unsafe-path')
            item.size = 0
            output.addfile(item, io.BytesIO())
            changed = True
    if not changed:
        raise RuntimeError('The intended damage fixture was not created')
    if name == 'changed-execution':
        with tarfile.open(archive, 'r:gz') as damaged:
            changed_files = {entry.name: hashlib.sha256(damaged.extractfile(entry).read()).hexdigest()
                for entry in damaged.getmembers() if entry.isfile() and entry.name in files}
        revised = {**evidence, 'testedRuntimeManifestSHA256': hashlib.sha256(json.dumps(changed_files, sort_keys=True, separators=(',', ':')).encode()).hexdigest()}
        (target / 'docs/release-evidence.json').write_text(json.dumps(revised), encoding='utf-8')
    completed = subprocess.run([sys.executable, str(target / 'scripts/package-release.py'), '--output', str(target / 'artifacts')],
        capture_output=True, text=True, encoding='utf-8', timeout=30, cwd=target)
    if completed.returncode == 0 or expected not in completed.stderr:
        raise RuntimeError('A release rejection did not match the damaged archive: ' + name)
    if list((target / 'artifacts').glob('*.zip')):
        raise RuntimeError('A rejected archive produced a release ZIP')
    results.append({'case': name, 'rejectedBeforeZip': True})
(fixture_root / 'result.json').write_text(json.dumps({'passed': True, 'cases': results}, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'passed': True, 'cases': results}))
