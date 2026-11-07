/** Resource checks for Team tools whose concrete paths or origins can be inspected before dispatch. */
import { realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { teamCoordinationTools } from "./tool-capabilities.js";
/**
 * Resolve the approved project working set for a member copy.
 * @param scope - Confirmed file resources; absence retains the complete legacy workspace.
 * @param cwd - Lead's immutable project directory.
 * @returns project-relative paths, or undefined for the complete project.
 */
export function workspaceCopyPaths(scope, cwd) {
    if (scope === undefined)
        return undefined;
    const roots = [...scope.readPaths, ...scope.writePaths];
    if (roots.includes('*'))
        return undefined;
    if (roots.some(root => relative(cwd, resolve(cwd, root)) === ''))
        return undefined;
    return workspaceExplicitPaths(scope, cwd);
}
/**
 * Resolve concrete goal paths even when another resource root covers the whole project.
 * @param scope - Confirmed file resources, if present.
 * @param cwd - Lead project directory used for relative paths.
 * @returns distinct project-relative file and directory paths.
 */
export function workspaceExplicitPaths(scope, cwd) {
    if (scope === undefined)
        return [];
    const roots = [...scope.readPaths, ...scope.writePaths];
    const paths = [];
    for (const root of roots) {
        if (root === '*')
            continue;
        const tail = relative(cwd, resolve(cwd, root));
        if (tail === '')
            continue;
        if (tail !== '..' && !tail.startsWith(`..${sep}`) && !isAbsolute(tail))
            paths.push(tail.split(sep).join('/'));
    }
    return [...new Set(paths)];
}
/**
 * Translate project-owned absolute roots into an isolated member's copy.
 * @param scope - User-confirmed resources, retained without mutation.
 * @param sharedCwd - Lead's immutable project directory.
 * @param memberCwd - Member's immutable private directory.
 * @returns equivalent file roots in the copy; external and relative roots retain their meaning.
 */
export function memberExecutionScope(scope, sharedCwd, memberCwd) {
    const map = (root) => {
        if (!isAbsolute(root))
            return root;
        const tail = relative(sharedCwd, root);
        return tail === '' || tail !== '..' && !tail.startsWith(`..${sep}`) && !isAbsolute(tail)
            ? resolve(memberCwd, tail) : root;
    };
    return { ...scope, readPaths: scope.readPaths.map(map), writePaths: scope.writePaths.map(map) };
}
/** Resolve existing ancestors so absent output files cannot hide a symlink escape. */
async function canonicalCandidate(path) {
    try {
        return await realpath(path);
    }
    catch (error) {
        if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT')
            throw error;
        const parent = dirname(path);
        if (parent === path)
            throw error;
        return resolve(await canonicalCandidate(parent), relative(parent, path));
    }
}
/**
 * Match a concrete file path against user-reviewed roots using filesystem identities.
 * @param roots - Explicit permitted roots; '*' allows every path subject to the provider's sandbox.
 * @param cwd - Immutable Session working directory used for relative roots and paths.
 * @param path - Tool's actual file or directory argument.
 * @returns whether the resolved target remains inside at least one approved root.
 */
export async function withinExecutionPaths(roots, cwd, path) {
    if (roots.includes('*'))
        return true;
    const candidate = await canonicalCandidate(resolve(cwd, path));
    for (const root of roots) {
        const base = await canonicalCandidate(resolve(cwd, root));
        const tail = relative(base, candidate);
        if (tail === '' || tail !== '..' && !tail.startsWith(`..${sep}`) && !isAbsolute(tail))
            return true;
    }
    return false;
}
/**
 * Check one tool's actual resource arguments without interpreting descriptive scope text as permissions.
 * @param scope - Rules shown in the confirmed goal, absent for legacy goals.
 * @param exec - Immutable call identity and parsed arguments before body dispatch.
 * @param required - Whether this deployment requires rules for legacy goals as well.
 * @param originBoundFetch - Whether the active web provider confines redirects to the requested origin.
 * @returns an actionable denial, or undefined for an admitted call.
 */
export async function executionScopeDenial(scope, exec, required, originBoundFetch) {
    if (teamCoordinationTools.has(exec.name))
        return undefined;
    if (scope === undefined)
        return required ? 'This goal needs explicit execution resources; ask the Lead to propose them for user review.' : undefined;
    if (exec.name === 'web_search')
        return scope.allowSearch ? undefined : 'Public web search is outside this confirmed goal scope.';
    if (scope.allowUnrestrictedExecution)
        return undefined;
    const args = exec.arguments;
    if (args === null || typeof args !== 'object' || Array.isArray(args))
        return 'The tool resource arguments cannot be inspected.';
    if (exec.name === 'web_fetch') {
        if (!('url' in args) || typeof args.url !== 'string')
            return 'The fetch target is missing.';
        let url;
        try {
            url = new URL(args.url);
        }
        catch (error) {
            if (error instanceof TypeError)
                return 'The fetch target is not an absolute URL.';
            throw error;
        }
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
            return 'Only explicit HTTP(S) origins without embedded credentials are supported.';
        if (!scope.webOrigins.includes('*') && !scope.webOrigins.includes(url.origin))
            return `The origin ${url.origin} is outside the confirmed execution scope.`;
        if (!scope.webOrigins.includes('*') && !originBoundFetch)
            return 'The active fetch provider cannot enforce an origin-restricted goal.';
        return undefined;
    }
    const fileTool = ['read', 'read_image', 'write', 'edit', 'glob', 'grep', 'str_replace_editor'].includes(exec.name);
    if (!fileTool)
        return `The ${exec.name} tool requires program execution permission, which this confirmed goal does not grant. Use read/glob/grep/write/edit when sufficient. Otherwise ask the Lead to show the needed permission change to the user with team_goal; do not repeat the same denied call.`;
    const cwd = exec.agent?.session.header.cwd;
    if (cwd === undefined)
        return 'File scope checks require an immutable Session working directory.';
    const path = 'file_path' in args ? args.file_path : 'path' in args ? args.path : ['glob', 'grep'].includes(exec.name) ? '.' : undefined;
    if (typeof path !== 'string' || path.trim() === '')
        return 'The concrete file path is missing.';
    const writing = exec.name === 'write' || exec.name === 'edit'
        || exec.name === 'str_replace_editor' && (!('command' in args) || args.command !== 'view');
    const roots = writing ? scope.writePaths : scope.readPaths;
    return await withinExecutionPaths(roots, cwd, path) ? undefined
        : `The requested ${writing ? 'write' : 'read'} path is outside this confirmed goal scope: ${path}. Allowed roots: ${JSON.stringify(roots)}. Use paths relative to your own working directory.${['glob', 'grep'].includes(exec.name) ? ' Set path to an allowed search directory; pattern alone does not change the search root.' : ''} Ask the Lead if the task needs additional resources.`;
}
