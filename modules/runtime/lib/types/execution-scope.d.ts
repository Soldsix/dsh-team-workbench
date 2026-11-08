import type { ToolExecution } from '@deepseek-ai/dsh-tools';
import type { TeamExecutionScope } from './goal-types.ts';
/**
 * Resolve the approved project working set for a member copy.
 * @param scope - Confirmed file resources; absence retains the complete legacy workspace.
 * @param cwd - Lead's immutable project directory.
 * @returns project-relative paths, or undefined for the complete project.
 */
export declare function workspaceCopyPaths(scope: TeamExecutionScope | undefined, cwd: string): string[] | undefined;
/**
 * Resolve concrete goal paths even when another resource root covers the whole project.
 * @param scope - Confirmed file resources, if present.
 * @param cwd - Lead project directory used for relative paths.
 * @returns distinct project-relative file and directory paths.
 */
export declare function workspaceExplicitPaths(scope: TeamExecutionScope | undefined, cwd: string): string[];
/**
 * Translate project-owned absolute roots into an isolated member's copy.
 * @param scope - User-confirmed resources, retained without mutation.
 * @param sharedCwd - Lead's immutable project directory.
 * @param memberCwd - Member's immutable private directory.
 * @returns equivalent file roots in the copy; external and relative roots retain their meaning.
 */
export declare function memberExecutionScope(scope: TeamExecutionScope, sharedCwd: string, memberCwd: string): TeamExecutionScope;
/**
 * Match a concrete file path against user-reviewed roots using filesystem identities.
 * @param roots - Explicit permitted roots; '*' allows every path subject to the provider's sandbox.
 * @param cwd - Immutable Session working directory used for relative roots and paths.
 * @param path - Tool's actual file or directory argument.
 * @returns whether the resolved target remains inside at least one approved root.
 */
export declare function withinExecutionPaths(roots: readonly string[], cwd: string, path: string): Promise<boolean>;
/**
 * Check one tool's actual resource arguments without interpreting descriptive scope text as permissions.
 * @param scope - Rules shown in the confirmed goal, absent for legacy goals.
 * @param exec - Immutable call identity and parsed arguments before body dispatch.
 * @param required - Whether this deployment requires rules for legacy goals as well.
 * @param originBoundFetch - Whether the active web provider confines redirects to the requested origin.
 * @returns an actionable denial, or undefined for an admitted call.
 */
export declare function executionScopeDenial(scope: TeamExecutionScope | undefined, exec: ToolExecution, required: boolean, originBoundFetch: boolean): Promise<string | undefined>;
