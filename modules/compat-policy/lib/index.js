// packages/team/modules/compat-policy/lib/types/index.js
import { realpathSync } from "node:fs";
import { isAbsolute } from "node:path";
import { Service } from "@deepseek-ai/cordis";
import { z as zod } from "zod";
import z from "@deepseek-ai/schemastery";

// packages/team/modules/compat-policy/lib/types/session-mode.js
var SANDBOX_MODES = ["read-only", "workspace-write", "danger-full-access"];
function setSandboxMode(session, mode) {
  session.append("sandbox/mode", { mode });
}

// packages/team/modules/compat-policy/lib/types/index.js
function resolveWorkspaceRoot(path) {
  if (!isAbsolute(path))
    throw new Error("sandbox-policy: workspace root must be an absolute execution-world path");
  return path;
}
function renderPolicyContext(policy, workspaceCapped) {
  const capNotice = workspaceCapped ? " This isolated Team member has a fixed private workspace cap; per-call approval cannot widen it." : "";
  switch (policy.mode) {
    case "read-only":
      return "Current DSH file policy: read-only. Any available operation enforced by the DSH file sandbox cannot modify files in the standing mode. Do not refuse a required modification from this policy alone: try an available tool normally and follow any denial and escalation guidance it returns." + capNotice;
    case "workspace-write":
      return `Current DSH file policy: workspace-write. Any available operation enforced by the DSH file sandbox may modify files under the session workspace: ${JSON.stringify(policy.workspaceRoot)}. Some platform temporary areas may also be writable.${capNotice}`;
    case "danger-full-access":
      return "Current DSH file policy: danger-full-access. The DSH file sandbox does not restrict file modifications by available operations.";
    /* v8 ignore next 4 -- SandboxMode is a typed same-process closed union; this branch is only the static exhaustiveness guard. */
    default: {
      const mode = policy.mode;
      throw new Error(`unreachable sandbox mode: ${String(mode)}`);
    }
  }
}
var sandboxModeStateSchema = zod.union([
  zod.literal("read-only"),
  zod.literal("workspace-write"),
  zod.literal("danger-full-access")
]).nullable();
var SandboxPolicyService = class extends Service {
  // Inline schema call: the config catalog walks `static Config` statically.
  static Config = z.object({
    mode: z.union(["read-only", "workspace-write", "danger-full-access"]).default("read-only"),
    // No schema default: process.cwd() is resolved in the constructor so the
    // stored root is always absolute regardless of how it was supplied.
    workspaceRoot: z.string()
  });
  static inject = ["sessionProjections"];
  /** The deployment default mode — the fallback beneath a session override. */
  defaultMode;
  /** The absolute `workspace-write` fallback root for calls without a session cwd. */
  workspaceRoot;
  /** Host-owned, non-widenable workspace roots for isolated child sessions. */
  workspaceCaps = /* @__PURE__ */ new Map();
  constructor(ctx, config) {
    super(ctx, "sandboxPolicy");
    this.defaultMode = config.mode;
    this.workspaceRoot = resolveWorkspaceRoot(config.workspaceRoot ?? process.cwd());
    ctx.sessionProjections.register({
      key: "sandboxMode",
      stateVersion: 1,
      stateSchema: sandboxModeStateSchema,
      init: () => null,
      apply: (state, event) => event.type === "sandbox/mode" ? event.data.mode : state
    });
    ctx.inject(["systemPrompt"], (scope) => {
      scope.systemPrompt.context({
        name: "sandbox:policy",
        order: scope.systemPrompt.getContextOrder("SANDBOX_POLICY"),
        text: (context) => {
          const session = context.agent?.session;
          return session === void 0 ? "" : renderPolicyContext(this.resolve({ session }), this.workspaceCaps.has(session.id));
        }
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
    const sessionMode = (session === void 0 ? void 0 : this.overrideOf(session)) ?? this.defaultMode;
    const requestedMode = request.mode ?? sessionMode;
    const cap = session === void 0 ? void 0 : this.workspaceCaps.get(session.id);
    if (session !== void 0 && cap !== void 0) {
      if (session.header.cwd === void 0 || realpathSync.native(session.header.cwd) !== cap.root) {
        throw new Error("isolated session workspace differs from its sandbox cap");
      }
      return {
        mode: cap.maxMode === "read-only" || requestedMode === "read-only" || sessionMode === "read-only" ? "read-only" : "workspace-write",
        workspaceRoot: cap.root,
        sessionId: session.id
      };
    }
    return {
      mode: requestedMode,
      workspaceRoot: resolveWorkspaceRoot(session?.header.cwd ?? this.workspaceRoot),
      ...session === void 0 ? {} : { sessionId: session.id }
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
  capSessionWorkspace(sessionId, workspaceRoot, maxMode = "workspace-write") {
    const root = realpathSync.native(resolveWorkspaceRoot(workspaceRoot));
    const current = this.workspaceCaps.get(sessionId);
    if (current !== void 0 && (current.root !== root || current.maxMode !== maxMode)) {
      throw new Error("isolated session already has another workspace cap");
    }
    if (current === void 0)
      this.workspaceCaps.set(sessionId, { root, maxMode, refs: 1 });
    else
      current.refs += 1;
    let disposed = false;
    return () => {
      if (disposed)
        return;
      disposed = true;
      const active = this.workspaceCaps.get(sessionId);
      if (active === void 0 || active.root !== root)
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
    if (current === void 0 || current.root !== realpathSync.native(resolveWorkspaceRoot(workspaceRoot))) {
      throw new Error("isolated child workspace has no matching sandbox cap");
    }
  }
  /**
   * Read the session override without applying the deployment default.
   * @param session - session whose log supplies the override.
   * @returns the last logged mode, or `undefined` without one.
   */
  overrideOf(session) {
    return this.ctx.sessionProjections.stateOf(session, "sandboxMode") ?? void 0;
  }
};
var index_default = SandboxPolicyService;
export {
  SANDBOX_MODES,
  SandboxPolicyService,
  index_default as default,
  setSandboxMode
};
