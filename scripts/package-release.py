"""Create source and deployment ZIPs from explicit public inputs after evidence checks."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import tarfile
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument('--output', default='artifacts')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
out = Path(args.output).resolve()
out.mkdir(parents=True, exist_ok=True)
version = json.loads((root / 'packages/team/package.json').read_text(encoding='utf-8'))['version']
evidence = json.loads((root / 'docs/release-evidence.json').read_text(encoding='utf-8'))
if evidence.get('releaseStatus') != 'candidate-validated':
    raise RuntimeError('Final evidence has not been accepted; no release ZIP was produced')
if evidence['core']['failed'] or evidence['ui']['failed'] or evidence['compatibility']['failed']:
    raise RuntimeError('A required test group has failures')
if not all(evidence['parallel'][str(n)]['passed'] for n in (8, 20, 32)):
    raise RuntimeError('Missing real-profile concurrency acceptance')
if evidence['parallel']['32']['soakSeconds'] < 10800:
    raise RuntimeError('The required sustained run is not complete')
if not evidence.get('publishedDeclarations', {}).get('passed'):
    raise RuntimeError('Published declaration consumers have not passed')
archive = out / f'dsh-workbench-team-{version}.tgz'
if not archive.is_file():
    raise RuntimeError('Build and npm-pack the bundle into the selected output directory first')

forbidden = re.compile(rb'(?:C:[\\/]Users[\\/]Administrator|E:[\\/]DSH-Staging|gh[pousr]_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9]{32,})', re.I)
text_suffixes = {'.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.yml', '.yaml', '.py', '.txt', '.html', '.css'}
excluded = {'node_modules', '__pycache__', '.git', '.env', 'private-qa', 'source'}


def files_at(path):
    if path.is_symlink() or path.is_junction():
        raise RuntimeError(f'Public input is a link: {path.relative_to(root)}')
    if path.is_dir():
        for child in sorted(path.iterdir()):
            if child.name not in excluded:
                yield from files_at(child)
    elif path.is_file():
        if path.suffix in text_suffixes and forbidden.search(path.read_bytes()):
            raise RuntimeError(f'Private path or secret-like data in public file: {path.relative_to(root)}')
        yield path


with tarfile.open(archive, 'r:gz') as packed:
    entries = packed.getmembers()
    if any(entry.issym() or entry.islnk() or not (entry.isfile() or entry.isdir())
           or not (entry.name == 'package' or entry.name.startswith('package/'))
           or '\\' in entry.name or '..' in entry.name.split('/') for entry in entries):
        raise RuntimeError('The npm archive contains an unsafe path or link')
    names = {entry.name for entry in entries}
    runtime_files = {entry.name: hashlib.sha256(packed.extractfile(entry).read()).hexdigest()
                     for entry in entries if entry.isfile() and
                     ('/lib/' in entry.name or '/skills/' in entry.name or '/examples/custom-skills/' in entry.name or entry.name.endswith('/package.json') or entry.name == 'package/cordis.patch.yml')}
    runtime_digest = hashlib.sha256(json.dumps(runtime_files, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    if runtime_digest != evidence.get('testedRuntimeManifestSHA256'):
        raise RuntimeError('The archive runtime differs from the runtime used in final acceptance')
    execution_files = {name: digest for name, digest in runtime_files.items() if not name.endswith('.d.ts')}
    execution_digest = hashlib.sha256(json.dumps(execution_files, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    if execution_digest != evidence.get('testedExecutionManifestSHA256'):
        raise RuntimeError('The archive execution files differ from the executed acceptance runtime')
    checksum_file = packed.extractfile('package/SHA256SUMS')
    if checksum_file is None:
        raise RuntimeError('Missing internal checksum manifest')
    checked_files = 0
    for line in checksum_file.read().decode('utf-8').splitlines():
        digest, relative = line.split('  ', 1)
        entry_name = 'package/' + relative
        if '..' in Path(relative).parts or entry_name not in names:
            raise RuntimeError('Unsafe or missing internal checksum entry')
        if hashlib.sha256(packed.extractfile(entry_name).read()).hexdigest() != digest:
            raise RuntimeError('Internal checksum mismatch: ' + relative)
        checked_files += 1
    if checked_files == 0:
        raise RuntimeError('Empty internal checksum manifest')
    if any('private-qa/' in name or '.credentials' in name or name.endswith('/.env') for name in names):
        raise RuntimeError('The npm archive contains private QA or configuration')
    modules = ['team-runtime', 'team-tools', 'team-ui', 'compat-tools', 'compat-policy', 'compat-subagent', 'compat-web', 'compat-fetch']
    for name in modules:
        if f'package/node_modules/@dsh-workbench/{name}/package.json' not in names:
            raise RuntimeError('Missing bundled component: ' + name)
    for entry in entries:
        if entry.isfile() and Path(entry.name).suffix in text_suffixes:
            body = packed.extractfile(entry).read()
            if forbidden.search(body):
                raise RuntimeError('Private data in the install archive: ' + entry.name)

public_files = ['package.json', 'package-lock.json', 'README.md', 'README.zh.md', 'LICENSE', 'NOTICE.md', 'CHANGELOG.md',
                'CONTRIBUTING.md', 'SECURITY.md', 'RELEASE.md', 'requirements-qa.txt', 'vitest.config.ts',
                'vitest.ui.config.ts', 'vitest.compat.config.ts', 'SHA256SUMS', '.gitignore', '.gitattributes']
public_dirs = ['packages/team', 'scripts', 'tests', 'docs', 'examples', 'demos', '.github']
source_files = [root / name for name in public_files]
for name in public_dirs:
    source_files.extend(files_at(root / name))
source_zip = out / f'dsh-team-workbench-v{version}-github.zip'
deploy_zip = out / f'dsh-team-workbench-v{version}-deployment.zip'
prefix = f'dsh-team-workbench-v{version}/'
with zipfile.ZipFile(source_zip, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as package:
    for file in sorted(set(source_files)):
        package.write(file, prefix + file.relative_to(root).as_posix())
    package.write(archive, prefix + 'deployment/' + archive.name)
with zipfile.ZipFile(deploy_zip, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as package:
    package.write(archive, archive.name)
    package.write(root / 'scripts/install.mjs', 'scripts/install.mjs')
    for name in ['docs', 'examples', 'demos']:
        for file in files_at(root / name):
            package.write(file, file.relative_to(root).as_posix())
    for name in ['LICENSE', 'NOTICE.md', 'README.md', 'README.zh.md', 'RELEASE.md']:
        package.write(root / name, name)
    package.writestr('SHA256SUMS', f'{hashlib.sha256(archive.read_bytes()).hexdigest()}  {archive.name}\n')
for file in [source_zip, deploy_zip]:
    with zipfile.ZipFile(file) as package:
        if package.testzip() is not None:
            raise RuntimeError('ZIP CRC verification failed')
checksums = '\n'.join(f'{hashlib.sha256(file.read_bytes()).hexdigest()}  {file.name}' for file in [archive, source_zip, deploy_zip]) + '\n'
(out / 'SHA256SUMS').write_text(checksums, encoding='utf-8')
print(json.dumps({'version': version, 'sourceFiles': len(set(source_files)), 'archiveEntries': len(entries),
                  'artifacts': [{'name': file.name, 'bytes': file.stat().st_size} for file in [archive, source_zip, deploy_zip]]}))
