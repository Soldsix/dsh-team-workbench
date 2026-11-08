/**
 * The sandbox POLICY home (`ctx.sandboxPolicy`): the single owner of the
 * deployment's sandbox fallbacks plus per-session resolution: the file-effect
 * {@link SandboxMode}, the `workspace-write` root, and the override kit (the
 * `sandbox/mode` event, its fold, and its write path; the fold is the
 * `sandboxMode` session-projection unit registered here, while the event and
 * write path come from `./session-mode.ts`).
 * Before each agent request, the owner also contributes the resolved policy to
 * the cache-safe runtime-context snapshot. The agent loop logs that snapshot as
 * model history, so replay reconstructs the same mode and root the enforcing
 * consumers resolve without rewriting the stable system prompt.
 *
 * Enforcing filesystem, one-shot bash, and terminal backends read the SAME
 * resolved policy here. The context describes that policy without inventorying
 * capabilities, while each backend retains its own enforcement dialect and each
 * tool owns its operation-specific denial and escalation guidance. The service
 * reads session state once at each operation boundary; executors and providers
 * remain session-free.
 *
 * @module @deepseek-ai/dsh-sandbox-policy
 */
import { realpathSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { Service } from '@deepseek-ai/cordis';
import { z as zod } from 'zod';
import z from '@deepseek-ai/schemastery';
export { SANDBOX_MODES, setSandboxMode } from "./session-mode.js";
/** Preserve execution-world spelling; enforcing providers resolve filesystem identity on their host. */
function resolveWorkspaceRoot(path) {
    if (!isAbsolute(path))
        throw new Error('sandbox-policy: workspace root must be an absolute execution-world path');
    return path;
}
/** Render the policy without claiming which capabilities are mounted. */
function renderPolicyContext(policy, workspaceCapped) {
    const capNotice = workspaceCapped
        ? ' This isolated Team member has a fixed private workspace cap; per-call approval cannot widen it.'
        : '';
    switch (policy.mode) {
        case 'read-only':
            return 'Current DSH file policy: read-only. Any available operation enforced by the DSH file sandbox cannot modify files in the standing mode. Do not refuse a required modification from this policy alone: try an available tool normally and follow any denial and escalation guidance it returns.' + capNotice;
        case 'workspace-write':
            return `Current DSH file policy: workspace-write. Any available operation enforced by the DSH file sandbox may modify files under the session workspace: ${JSON.stringify(policy.workspaceRoot)}. Some platform temporary areas may also be writable.${capNotice}`;
        case 'danger-full-access':
            return 'Current DSH file policy: danger-full-access. The DSH file sandbox does not restrict file modifications by available operations.';
        /* v8 ignore next 4 -- SandboxMode is a typed same-process closed union; this branch is only the static exhaustiveness guard. */
        default: {
            const mode = policy.mode;
            throw new Error(`unreachable sandbox mode: ${String(mode)}`);
        }
    }
}
/** The sandbox-mode projection's state schema (state equals the public shape). */
const sandboxModeStateSchema = zod.union([
    zod.literal('read-only'),
    zod.literal('workspace-write'),
    zod.literal('danger-full-access'),
]).nullable();
/**
 * The sandbox-policy service (`ctx.sandboxPolicy`). Owns the deployment
 * default mode, fallback workspace root, and current request-time policy
 * section. Tool layers call {@link resolve} for each execution so a session's
 * mode log and immutable cwd travel together to every enforcing capability.
 */
export class SandboxPolicyService extends Service {
    // Inline schema call: the config catalog walks `static Config` statically.
    static Config = z.object({
        mode: z.union(['read-only', 'workspace-write', 'danger-full-access']).default('read-only'),
        // No schema default: process.cwd() is resolved in the constructor so the
        // stored root is always absolute regardless of how it was supplied.
        workspaceRoot: z.string(),
    });
    static inject = ['sessionProjections'];
    /** The deployment default mode — the fallback beneath a session override. */
    defaultMode;
    /** The absolute `workspace-write` fallback root for calls without a session cwd. */
    workspaceRoot;
    /** Host-owned, non-widenable workspace roots for isolated child sessions. */
    workspaceCaps = new Map();
    constructor(ctx, config) {
        super(ctx, 'sandboxPolicy');
        // schemastery (static Config) already filled `mode`; the cast records that
        // runtime fact. `workspaceRoot` has NO schema default, so its fallback to
        // the process cwd is real branching, resolved absolute either way.
        this.defaultMode = config.mode;
        this.workspaceRoot = resolveWorkspaceRoot(config.workspaceRoot ?? process.cwd());
        ctx.sessionProjections.register({
            key: 'sandboxMode',
            stateVersion: 1,
            stateSchema: sandboxModeStateSchema,
            init: () => null,
            apply: (state, event) => (event.type === 'sandbox/mode' ? event.data.mode : state),
        });
        ctx.inject(['systemPrompt'], (scope) => {
            scope.systemPrompt.context({
                name: 'sandbox:policy',
                order: scope.systemPrompt.getContextOrder('SANDBOX_POLICY'),
                text: (context) => {
                    const session = context.agent?.session;
                    return session === undefined
                        ? ''
                        : renderPolicyContext(this.resolve({ session }), this.workspaceCaps.has(session.id));
                },
            });
        });
    }
    /**
     * Resolve the complete policy for one capability call. An approved explicit
     * mode outranks the session's last `sandbox/mode` event, which outranks the
     * deployment default. A session cwd is its workspace-write boundary; the
     * configured root is the fallback for agentless calls and sessions without a
     * cwd.
     * @param request - optional session and approved mode override.
     * @returns the fully resolved per-call mode and absolute workspace root.
     */
    resolve(request = {}) {
        const { session } = request;
        const sessionMode = (session === undefined ? undefined : this.overrideOf(session)) ?? this.defaultMode;
        const requestedMode = request.mode ?? sessionMode;
        const cap = session === undefined ? undefined : this.workspaceCaps.get(session.id);
        if (session !== undefined && cap !== undefined) {
            if (session.header.cwd === undefined || realpathSync.native(session.header.cwd) !== cap.root) {
                throw new Error('isolated session workspace differs from its sandbox cap');
            }
            return { mode: cap.maxMode === 'read-only' || requestedMode === 'read-only' || sessionMode === 'read-only'
                    ? 'read-only' : 'workspace-write',
                workspaceRoot: cap.root, sessionId: session.id };
        }
        return {
            mode: requestedMode,
            workspaceRoot: resolveWorkspaceRoot(session?.header.cwd ?? this.workspaceRoot),
            ...session === undefined ? {} : { sessionId: session.id },
        };
    }
    /**
     * Pin one child Session to its immutable workspace, even when the UI or a tool
     * supplies a broader mode. Register before the child accepts its first turn.
     * @param sessionId - reserved child Session identity.
     * @param workspaceRoot - absolute private workspace recorded in its header.
     * @param maxMode - immutable maximum mode inherited from the creator's authority.
     * @returns registration disposer for Team teardown after child quiescence.
     */
    capSessionWorkspace(sessionId, workspaceRoot, maxMode = 'workspace-write') {
        const root = realpathSync.native(resolveWorkspaceRoot(workspaceRoot));
        const current = this.workspaceCaps.get(sessionId);
        if (current !== undefined && (current.root !== root || current.maxMode !== maxMode)) {
            throw new Error('isolated session already has another workspace cap');
        }
        if (current === undefined)
            this.workspaceCaps.set(sessionId, { root, maxMode, refs: 1 });
        else
            current.refs += 1;
        let disposed = false;
        return () => {
            if (disposed)
                return;
            disposed = true;
            const active = this.workspaceCaps.get(sessionId);
            if (active === undefined || active.root !== root)
                return;
            active.refs -= 1;
            if (active.refs === 0)
                this.workspaceCaps.delete(sessionId);
        };
    }
    /**
     * Refuse child creation when a private cwd was supplied without its execution cap.
     * @param sessionId - reserved child Session identity.
     * @param workspaceRoot - cwd that will be recorded in its immutable header.
     */
    assertSessionWorkspaceCap(sessionId, workspaceRoot) {
        const current = this.workspaceCaps.get(sessionId);
        if (current === undefined || current.root !== realpathSync.native(resolveWorkspaceRoot(workspaceRoot))) {
            throw new Error('isolated child workspace has no matching sandbox cap');
        }
    }
    /**
     * Read the session override without applying the deployment default.
     * @param session - session whose log supplies the override.
     * @returns the last logged mode, or `undefined` without one.
     */
    overrideOf(session) {
        return this.ctx.sessionProjections.stateOf(session, 'sandboxMode') ?? undefined;
    }
}
export default SandboxPolicyService;
