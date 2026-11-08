/** Private member copies and checked integration into one shared workspace. */
import { CoordinationLocks } from "./coordination.js";
import { createHash, randomUUID } from 'node:crypto';
import { constants, createReadStream } from 'node:fs';
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, readlink, realpath, rename, rm, rmdir, stat, symlink, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
function isEntry(value) {
    return typeof value === 'object' && value !== null && ('kind' in value && value.kind === 'file' && 'sha256' in value
        && typeof value.sha256 === 'string' && /^[a-f0-9]{64}$/u.test(value.sha256)
        || 'kind' in value && value.kind === 'symlink' && 'target' in value && typeof value.target === 'string');
}
function parseReceipt(value, root) {
    if (typeof value !== 'object' || value === null || !('version' in value) || value.version !== 1
        || !('paths' in value) || !Array.isArray(value.paths)
        || !('desired' in value) || typeof value.desired !== 'object' || value.desired === null
        || !('applied' in value) || !Array.isArray(value.applied)) {
        throw new Error('invalid Team workspace integration receipt');
    }
    const candidate = value;
    if (candidate.paths.some(key => typeof key !== 'string')
        || candidate.applied.some(key => typeof key !== 'string')
        || new Set(candidate.paths).size !== candidate.paths.length
        || candidate.applied.some(key => !candidate.paths.includes(key))
        || Object.keys(candidate.desired).length !== candidate.paths.length
        || candidate.paths.some(key => !Object.hasOwn(candidate.desired, key)
            || candidate.desired[key] !== null && !isEntry(candidate.desired[key]))) {
        throw new Error('invalid Team workspace integration receipt');
    }
    for (const key of candidate.paths)
        relativePath(root, key);
    return candidate;
}
function includesPath(key, paths) {
    return paths === undefined || paths.some(path => path === '.' || key === path || key.startsWith(`${path}/`) || path.startsWith(`${key}/`));
}
function selectedPath(key, limits) {
    const root = key.split('/')[0] ?? '';
    if (chosenDirectory(root, limits?.readOnlySharedDirectories))
        return false;
    if (chosenDirectory(root, limits?.omittedDirectories)) {
        return limits?.includedOmittedPaths !== undefined && includesPath(key, limits.includedOmittedPaths);
    }
    return includesPath(key, limits?.includedPaths);
}
/**
 * Count a broad automatic member copy without hashing file contents.
 * @param root - Lead project root to inspect.
 * @param limits - Automatic-copy count, byte, and directory filters.
 * @param signal - Cancellation from the requesting member creation.
 * @returns when the selected project fits the automatic-copy limits.
 */
export async function checkAutomaticWorkspaceSize(root, limits, signal) {
    let files = 0;
    let bytes = 0;
    async function walk(directory, prefix) {
        signal?.throwIfAborted();
        for (const item of await readdir(directory, { withFileTypes: true })) {
            signal?.throwIfAborted();
            const key = prefix === '' ? item.name : `${prefix}/${item.name}`;
            if (!selectedPath(key, limits))
                continue;
            const path = join(directory, item.name);
            const info = await lstat(path);
            if (info.isDirectory())
                await walk(path, key);
            else if (info.isFile() || info.isSymbolicLink()) {
                files += 1;
                bytes += info.size;
                if (files > limits.maxFiles || bytes > limits.maxBytes) {
                    throw new Error(`Automatic Team workspace copy exceeds ${limits.maxFiles} files or ${limits.maxBytes} bytes at ${key}. Pass task-specific project-relative working_paths to spawn_teammate; the confirmed goal scope stays unchanged.`);
                }
            }
        }
    }
    await walk(root, '');
}
const integrationTails = new Map();
function directoryIdentity(name) {
    return process.platform === 'win32' ? name.toLowerCase() : name;
}
function chosenDirectory(name, choices) {
    return choices?.some(choice => directoryIdentity(choice) === directoryIdentity(name)) ?? false;
}
function inside(root, candidate) {
    const rel = relative(root, candidate);
    return rel === '' || rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}
function assertSeparate(sharedRoot, storageRoot) {
    if (inside(sharedRoot, storageRoot) || inside(storageRoot, sharedRoot)) {
        throw new Error('Team workspace storage must be outside the shared workspace');
    }
}
function relativePath(root, key) {
    const parts = key.split('/');
    if (parts.some(part => part === '' || part === '.' || part === '..' || part.includes('\\') || part.includes(':')) || isAbsolute(key)) {
        throw new Error(`invalid Team workspace path ${JSON.stringify(key)}`);
    }
    const path = resolve(root, ...parts);
    if (!inside(root, path) || path === root)
        throw new Error(`Team workspace path escapes its root: ${key}`);
    return path;
}
async function digest(path) {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(path)) {
        if (!Buffer.isBuffer(chunk))
            throw new Error('Team workspace file stream returned non-binary data');
        hash.update(chunk);
    }
    return hash.digest('hex');
}
async function scan(root, limits) {
    const entries = Object.create(null);
    let files = 0;
    let bytes = 0;
    const topLevelBytes = new Map();
    async function walk(directory, prefix) {
        limits?.signal?.throwIfAborted();
        for (const item of await readdir(directory, { withFileTypes: true })) {
            limits?.signal?.throwIfAborted();
            const key = prefix === '' ? item.name : `${prefix}/${item.name}`;
            if (!selectedPath(key, limits))
                continue;
            const path = join(directory, item.name);
            const info = await lstat(path);
            if (info.isDirectory())
                await walk(path, key);
            else if (info.isFile() || info.isSymbolicLink()) {
                files += 1;
                bytes += info.size;
                const topLevel = key.split('/')[0] ?? key;
                topLevelBytes.set(topLevel, (topLevelBytes.get(topLevel) ?? 0) + info.size);
                if (limits !== undefined && (files > limits.maxFiles || bytes > limits.maxBytes)) {
                    const largest = [...topLevelBytes].sort((left, right) => right[1] - left[1]).slice(0, 3)
                        .map(([name, size]) => `${name} ${size} bytes`).join(', ');
                    throw new Error(`Team workspace exceeds configured file or byte limit at ${key}: ${files}/${limits.maxFiles} files, ${bytes}/${limits.maxBytes} bytes. Largest scanned roots: ${largest}. Select member working_paths for the required inputs.`);
                }
                if (info.isFile())
                    entries[key] = { kind: 'file', sha256: await digest(path) };
                else
                    entries[key] = { kind: 'symlink', target: await readlink(path) };
            }
            else
                throw new Error(`Team workspace contains unsupported file type: ${key}`);
        }
    }
    await walk(root, '');
    return entries;
}
function checkedDirectoryChoices(limits) {
    const names = [...limits.omittedDirectories ?? [], ...limits.readOnlySharedDirectories ?? []];
    if (names.some(name => typeof name !== 'string'))
        throw new Error('Team workspace directory choices must be strings');
    const identities = names.map(directoryIdentity);
    if (new Set(identities).size !== names.length || names.some(name => name === '' || name === '.' || name === '..'
        || name.includes('/') || name.includes('\\') || name.includes(':'))) {
        throw new Error('Team workspace directory choices must be distinct top-level names');
    }
}
function checkedLimits(limits) {
    if (!Number.isSafeInteger(limits.maxFiles) || limits.maxFiles < 1
        || !Number.isSafeInteger(limits.maxBytes) || limits.maxBytes < 1) {
        throw new Error('Team workspace limits must be positive safe integers');
    }
    checkedDirectoryChoices(limits);
    for (const key of limits.includedPaths ?? []) {
        if (key !== '.')
            relativePath(resolve('.'), key);
    }
    for (const key of limits.includedOmittedPaths ?? [])
        relativePath(resolve('.'), key);
}
async function entryAt(root, key) {
    const path = relativePath(root, key);
    let info;
    try {
        info = await lstat(path);
    }
    catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT')
            return undefined;
        throw error;
    }
    if (info.isFile())
        return { kind: 'file', sha256: await digest(path) };
    if (info.isSymbolicLink())
        return { kind: 'symlink', target: await readlink(path) };
    throw new Error(`Team workspace path is not a regular file: ${key}`);
}
async function assertPlainParents(root, key) {
    const parts = key.split('/');
    for (let count = 1; count < parts.length; count += 1) {
        const parent = relativePath(root, parts.slice(0, count).join('/'));
        try {
            const info = await lstat(parent);
            if (!info.isDirectory() || info.isSymbolicLink())
                throw new Error(`Team workspace parent is not a real directory: ${key}`);
        }
        catch (error) {
            if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT')
                return;
            throw error;
        }
    }
}
function equalEntry(left, right) {
    return left?.kind === right?.kind && (left?.kind === 'file' && right?.kind === 'file'
        ? left.sha256 === right.sha256
        : left?.kind === 'symlink' && right?.kind === 'symlink' ? left.target === right.target : left === right);
}
async function checkedRoot(path) {
    if (!isAbsolute(path))
        throw new Error('Team workspace paths must be absolute');
    const root = await realpath(path);
    if (!(await stat(root)).isDirectory())
        throw new Error(`Team workspace root is not a directory: ${path}`);
    return root;
}
async function removeAllocatedTree(storageRoot, path) {
    if (path === storageRoot || !inside(storageRoot, path))
        throw new Error('Team workspace cleanup path escaped storage');
    const info = await lstat(path);
    if (info.isSymbolicLink()) {
        await unlink(path);
        return;
    }
    if (!info.isDirectory()) {
        await unlink(path);
        return;
    }
    for (const name of await readdir(path))
        await removeAllocatedTree(storageRoot, join(path, name));
    await rmdir(path);
}
/**
 * Copy the selected project paths to a private member directory and retain their
 * independently checked baseline outside the member's writable `cwd`.
 * @param sharedPath - current workspace to copy.
 * @param storagePath - existing private storage directory, disjoint from the shared workspace.
 * @param limits - deployment file and byte bounds plus caller cancellation.
 * @returns paths to record durably with the member before it starts work.
 */
export async function createMemberWorkspace(sharedPath, storagePath, limits) {
    checkedLimits(limits);
    limits.signal?.throwIfAborted();
    const sharedRoot = await checkedRoot(sharedPath);
    const storageRoot = await checkedRoot(storagePath);
    assertSeparate(sharedRoot, storageRoot);
    const sourceBeforeCopy = await scan(sharedRoot, limits);
    const memberRoot = await mkdtemp(join(storageRoot, 'team-member-'));
    const workspaceRoot = join(memberRoot, 'work');
    try {
        const rootNames = new Map((await readdir(sharedRoot)).map(name => [directoryIdentity(name), name]));
        for (const name of [...limits.omittedDirectories ?? [], ...limits.readOnlySharedDirectories ?? []]) {
            const actual = rootNames.get(directoryIdentity(name));
            if (actual !== undefined && !(await lstat(join(sharedRoot, actual))).isDirectory()) {
                throw new Error(`Team workspace directory choice is not a directory: ${name}`);
            }
        }
        await cp(sharedRoot, workspaceRoot, { recursive: true, force: false, errorOnExist: true, dereference: false, verbatimSymlinks: true,
            mode: constants.COPYFILE_FICLONE, filter: (source) => {
                limits.signal?.throwIfAborted();
                const rel = relative(sharedRoot, source);
                return rel === '' || selectedPath(rel.split(sep).join('/'), limits);
            } });
        for (const name of limits.readOnlySharedDirectories ?? []) {
            const actual = rootNames.get(directoryIdentity(name));
            if (actual !== undefined) {
                await symlink(await realpath(join(sharedRoot, actual)), join(workspaceRoot, actual), process.platform === 'win32' ? 'junction' : 'dir');
            }
        }
        const sourceAfterCopy = await scan(sharedRoot, limits);
        const copyEntries = await scan(workspaceRoot, limits);
        const keys = new Set([...Object.keys(sourceBeforeCopy), ...Object.keys(sourceAfterCopy), ...Object.keys(copyEntries)]);
        const differences = [...keys].filter(key => !equalEntry(sourceBeforeCopy[key], sourceAfterCopy[key])
            || !equalEntry(sourceAfterCopy[key], copyEntries[key]));
        if (differences.length > 0) {
            throw new Error(`Team workspace snapshot differs at ${differences.length} paths: ${differences.slice(0, 5).join(', ')}. Select stable member working_paths that omit changing logs or state, or wait for project writes to finish before creating a new member.`);
        }
        const manifest = { version: 1, sharedRoot, workspaceRoot, entries: sourceAfterCopy,
            omittedDirectories: [...limits.omittedDirectories ?? []], readOnlySharedDirectories: [...limits.readOnlySharedDirectories ?? []],
            ...limits.includedPaths === undefined ? {} : { includedPaths: [...limits.includedPaths] },
            ...limits.includedOmittedPaths === undefined ? {} : { includedOmittedPaths: [...limits.includedOmittedPaths] } };
        const baselineManifestPath = join(memberRoot, 'baseline.json');
        await writeFile(baselineManifestPath, JSON.stringify(manifest), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
        return { cwd: workspaceRoot, baselineManifestPath };
    }
    catch (error) {
        // `mkdtemp` allocated this exact directory under the already resolved store.
        await removeAllocatedTree(storageRoot, memberRoot);
        throw error;
    }
}
async function loadManifest(workspace, sharedPath) {
    const sharedRoot = await checkedRoot(sharedPath);
    const workspaceRoot = await checkedRoot(workspace.cwd);
    const manifestPath = resolve(workspace.baselineManifestPath);
    if (inside(workspaceRoot, manifestPath) || dirname(manifestPath) !== dirname(workspaceRoot)) {
        throw new Error('Team workspace baseline must remain outside the member cwd');
    }
    if (!(await lstat(manifestPath)).isFile())
        throw new Error('Team workspace baseline is not a regular file');
    const parsed = JSON.parse(await readFile(manifestPath, 'utf8'));
    if (typeof parsed !== 'object' || parsed === null || !('version' in parsed) || parsed.version !== 1
        || !('sharedRoot' in parsed) || parsed.sharedRoot !== sharedRoot
        || !('workspaceRoot' in parsed) || parsed.workspaceRoot !== workspaceRoot
        || !('entries' in parsed) || typeof parsed.entries !== 'object' || parsed.entries === null
        || !('omittedDirectories' in parsed) || !Array.isArray(parsed.omittedDirectories)
        || !('readOnlySharedDirectories' in parsed) || !Array.isArray(parsed.readOnlySharedDirectories)) {
        throw new Error('Team workspace baseline does not match its current roots');
    }
    const manifest = parsed;
    if (manifest.includedPaths !== undefined && (!Array.isArray(manifest.includedPaths)
        || manifest.includedPaths.some(key => typeof key !== 'string')))
        throw new Error('invalid Team workspace included paths');
    for (const key of manifest.includedPaths ?? [])
        if (key !== '.')
            relativePath(sharedRoot, key);
    if (manifest.includedOmittedPaths !== undefined && (!Array.isArray(manifest.includedOmittedPaths)
        || manifest.includedOmittedPaths.some(key => typeof key !== 'string')))
        throw new Error('invalid Team workspace included omitted paths');
    for (const key of manifest.includedOmittedPaths ?? [])
        relativePath(sharedRoot, key);
    checkedDirectoryChoices({ maxFiles: 1, maxBytes: 1, omittedDirectories: manifest.omittedDirectories,
        readOnlySharedDirectories: manifest.readOnlySharedDirectories });
    for (const [key, entry] of Object.entries(manifest.entries)) {
        relativePath(sharedRoot, key);
        if (!isEntry(entry)) {
            throw new Error(`invalid Team workspace baseline entry ${key}`);
        }
    }
    return manifest;
}
async function publishFile(target, bytes) {
    await mkdir(dirname(target), { recursive: true });
    const temp = join(dirname(target), `.${basename(target)}.${randomUUID()}.team-tmp`);
    try {
        await writeFile(temp, bytes, { flag: 'wx', mode: 0o600 });
        await rename(temp, target);
    }
    finally {
        await rm(temp, { force: true });
    }
}
async function saveReceipt(path, receipt, first) {
    if (first) {
        await writeFile(path, JSON.stringify(receipt), { flag: 'wx', mode: 0o600 });
        return;
    }
    const temp = `${path}.${randomUUID()}.tmp`;
    try {
        await writeFile(temp, JSON.stringify(receipt), { flag: 'wx', mode: 0o600 });
        await rename(temp, path);
    }
    finally {
        await rm(temp, { force: true });
    }
}
async function integrateUnchecked(sharedPath, workspace, limits, admitPath) {
    if (limits.publication === undefined)
        throw new Error('Team publication requires independently accepted artifact receipts');
    checkedLimits(limits);
    limits.signal?.throwIfAborted();
    const baseline = await loadManifest(workspace, sharedPath);
    const { includedPaths: _includedPaths, includedOmittedPaths: _includedOmittedPaths, ...integrationLimits } = limits;
    const scanLimits = { ...integrationLimits, omittedDirectories: baseline.omittedDirectories,
        readOnlySharedDirectories: baseline.readOnlySharedDirectories,
        ...baseline.includedOmittedPaths === undefined ? {} : { includedOmittedPaths: baseline.includedOmittedPaths } };
    const selected = limits.publication.map(file => file.path);
    const member = await scan(baseline.workspaceRoot, { ...scanLimits, includedPaths: selected, includedOmittedPaths: selected });
    const shared = await scan(baseline.sharedRoot, { ...scanLimits, includedPaths: selected, includedOmittedPaths: selected });
    for (const file of limits.publication) {
        relativePath(baseline.workspaceRoot, file.path);
        const entry = member[file.path];
        if (entry?.kind !== 'file' || entry.sha256 !== file.sha256
            || (await stat(relativePath(baseline.workspaceRoot, file.path))).size !== file.bytes) {
            throw new Error(`Accepted Team artifact changed or is missing: ${file.path}`);
        }
    }
    const paths = [...new Set(selected)]
        .filter(key => !equalEntry(baseline.entries[key], member[key])).sort();
    if (paths.some(key => member[key] === undefined)) {
        throw new Error('Team integration never infers deletions from missing member files; retain the shared originals and submit an explicit deletion review');
    }
    const receiptPath = join(dirname(workspace.baselineManifestPath), 'integration.json');
    let previous;
    try {
        previous = parseReceipt(JSON.parse(await readFile(receiptPath, 'utf8')), baseline.sharedRoot);
    }
    catch (error) {
        if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'))
            throw error;
    }
    if (previous !== undefined && paths.length === 0
        && await Promise.all(previous.paths.map(async (key) => equalEntry(await entryAt(baseline.sharedRoot, key), previous.desired[key] ?? undefined))).then(matches => matches.every(Boolean))) {
        await rm(receiptPath, { force: true });
        return { paths: previous.paths };
    }
    const desired = Object.fromEntries(paths.map(key => [key, member[key] ?? null]));
    if (previous !== undefined && (JSON.stringify(previous.paths) !== JSON.stringify(paths)
        || JSON.stringify(previous.desired) !== JSON.stringify(desired))) {
        throw new Error('Team workspace changed after integration began; resolve the pending receipt before retrying');
    }
    for (const key of paths) {
        limits.signal?.throwIfAborted();
        await admitPath?.(key);
        await assertPlainParents(baseline.sharedRoot, key);
        if (!equalEntry(shared[key], baseline.entries[key])
            && !(previous !== undefined && equalEntry(shared[key], member[key]))) {
            throw new Error(`Team workspace integration conflict: ${key}`);
        }
        if (member[key]?.kind === 'symlink' || baseline.entries[key]?.kind === 'symlink') {
            throw new Error(`Team workspace integration cannot change a symbolic link: ${key}`);
        }
    }
    let receipt = previous ?? { version: 1, paths, desired, applied: [] };
    if (previous === undefined && paths.length > 0)
        await saveReceipt(receiptPath, receipt, true);
    for (const key of paths) {
        limits.signal?.throwIfAborted();
        await admitPath?.(key);
        const target = relativePath(baseline.sharedRoot, key);
        const source = relativePath(baseline.workspaceRoot, key);
        await assertPlainParents(baseline.sharedRoot, key);
        const current = await entryAt(baseline.sharedRoot, key);
        if (previous !== undefined && equalEntry(current, member[key]))
            continue;
        if (!equalEntry(current, baseline.entries[key])) {
            throw new Error(`Team workspace integration conflict: ${key}`);
        }
        if (!equalEntry(await entryAt(baseline.workspaceRoot, key), member[key])) {
            throw new Error(`Team workspace changed during integration: ${key}`);
        }
        const memberEntry = member[key];
        if (memberEntry !== undefined) {
            const bytes = await readFile(source);
            if (memberEntry.kind !== 'file' || createHash('sha256').update(bytes).digest('hex') !== memberEntry.sha256) {
                throw new Error(`Team workspace changed during integration: ${key}`);
            }
            limits.signal?.throwIfAborted();
            await admitPath?.(key);
            await publishFile(target, bytes);
        }
        receipt = { ...receipt, applied: [...receipt.applied, key] };
        await saveReceipt(receiptPath, receipt, false);
    }
    const entries = { ...baseline.entries };
    for (const key of paths) {
        const entry = member[key];
        if (entry === undefined)
            throw new Error(`Team artifact disappeared from the publication scan: ${key}`);
        entries[key] = entry;
    }
    const nextManifest = { ...baseline, entries };
    const manifestTemp = `${workspace.baselineManifestPath}.${randomUUID()}.tmp`;
    try {
        await writeFile(manifestTemp, JSON.stringify(nextManifest), { flag: 'wx', mode: 0o600 });
        await rename(manifestTemp, workspace.baselineManifestPath);
    }
    finally {
        await rm(manifestTemp, { force: true });
    }
    if (paths.length > 0 || previous !== undefined)
        await rm(receiptPath, { force: true });
    return { paths };
}
/**
 * Integrate changed regular files after checking every shared file against the
 * member's baseline. Configured deployments serialize cooperative publishers across processes.
 * @param sharedPath - workspace captured by `createMemberWorkspace`.
 * @param workspace - durable member paths returned at creation.
 * @param limits - deployment bounds and caller cancellation.
 * @param admitPath - current goal's path admission, repeated before each publication.
 * @returns the relative regular-file paths applied to the shared workspace.
 */
export async function integrateMemberWorkspace(sharedPath, workspace, limits, admitPath) {
    if (limits.publication === undefined)
        throw new Error('Team publication requires independently accepted artifact receipts');
    const sharedRoot = await checkedRoot(sharedPath);
    const prior = integrationTails.get(sharedRoot) ?? Promise.resolve();
    const integrate = async () => {
        if (limits.coordinationRoot === undefined)
            return integrateUnchecked(sharedRoot, workspace, limits, admitPath);
        const locks = new CoordinationLocks(limits.coordinationRoot, limits.coordinationWaitMs ?? 30000, limits.coordinationPollMs ?? 50);
        try {
            return await locks.publish(sharedRoot, limits.signal, () => integrateUnchecked(sharedRoot, workspace, limits, admitPath));
        }
        finally {
            locks.close();
        }
    };
    const run = prior.then(integrate, integrate);
    const tail = run.then(() => undefined, () => undefined);
    integrationTails.set(sharedRoot, tail);
    try {
        return await run;
    }
    finally {
        if (integrationTails.get(sharedRoot) === tail)
            integrationTails.delete(sharedRoot);
    }
}
