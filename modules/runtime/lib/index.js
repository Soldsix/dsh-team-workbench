// packages/team/modules/runtime/lib/types/coordination.js
import { DatabaseSync } from "node:sqlite";
import { mkdir, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
var CoordinationLocks = class {
  root;
  waitMs;
  pollMs;
  owned = /* @__PURE__ */ new Map();
  closed = false;
  constructor(root, waitMs, pollMs) {
    this.root = root;
    this.waitMs = waitMs;
    this.pollMs = pollMs;
  }
  /** Hold one identity until disposal; another process cannot own the same identity. */
  async own(key, signal) {
    if (this.closed)
      throw new Error("Team coordination is closed");
    if (this.owned.has(key))
      return;
    await mkdir(this.root, { recursive: true });
    signal?.throwIfAborted();
    if (this.closed)
      throw new Error("Team coordination is closed");
    if (this.owned.has(key))
      return;
    const db = this.connect(key);
    try {
      db.exec("BEGIN IMMEDIATE");
    } catch (error) {
      db.close();
      throw new Error("Another DSH process owns this Team; stop that owner before resuming", { cause: error });
    }
    this.owned.set(key, db);
  }
  /** Serialize a publication across cooperative processes; cancellation never steals another writer's lock. */
  async publish(workspace, signal, operation) {
    const canonical = await realpath(workspace);
    const key = "publish:" + (process.platform === "win32" ? canonical.toLowerCase() : canonical);
    await mkdir(this.root, { recursive: true });
    const db = this.connect(key);
    const deadline = performance.now() + this.waitMs;
    try {
      for (; ; ) {
        signal?.throwIfAborted();
        if (this.closed)
          throw new Error("Team coordination is closed");
        try {
          db.exec("BEGIN IMMEDIATE");
          break;
        } catch (error) {
          if (!(error instanceof Error) || !("errcode" in error) || error.errcode !== 5)
            throw error;
          if (performance.now() >= deadline)
            throw new Error("Workspace publication is busy; retry after the current publication settles");
          await delay(Math.min(this.pollMs, Math.max(1, deadline - performance.now())), void 0, { signal });
        }
      }
      signal?.throwIfAborted();
      return await operation();
    } finally {
      db.close();
    }
  }
  connect(key) {
    const db = new DatabaseSync(join(this.root, createHash("sha256").update(key).digest("hex") + ".sqlite"));
    db.exec("PRAGMA busy_timeout=0");
    return db;
  }
  /** Release lifetime locks after queued Team writes have drained. */
  close() {
    this.closed = true;
    for (const db of this.owned.values())
      db.close();
    this.owned.clear();
  }
};

// packages/team/modules/runtime/lib/types/provision-plan.js
import { ReasoningEffortId } from "@deepseek-ai/dsh-llm";
import { withHostSubagentAncestors } from "dsh-team-workbench/compat-subagent/internal";

// packages/team/modules/runtime/lib/types/project-plan.js
import { z } from "zod";
var text = z.string().trim().min(1);
var memberName = text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
var projectPath = text.refine((value) => !/^(?:[a-z]:|\/|\\)/iu.test(value) && !value.replaceAll("\\", "/").split("/").some((part) => part === ".." || part === "." || part === ""), "expected a project-relative file or directory path");
var projectPlanSchema = z.object({
  format: z.literal("dsh-team-project-plan"),
  version: z.union([z.literal(1), z.literal(2)]),
  automation: z.object({ provision: z.enum(["manual", "on-demand"]), requirePlanningGate: z.boolean() }).strict().optional(),
  members: z.array(z.object({
    name: memberName,
    parent: memberName,
    function: z.enum(["planning_adviser", "quality_adviser", "domain_adviser", "group_lead", "executor", "verifier"]),
    modelProvider: text,
    model: text,
    reasoningEffort: text,
    responsibility: text,
    skills: z.array(text).min(1),
    persona: text.optional(),
    instructions: text.optional()
  }).strict()).min(1),
  tasks: z.array(z.object({
    id: text,
    owner: text,
    reviewer: text,
    description: text,
    kind: z.enum(["plan", "route", "execution", "key_result", "delivery"]),
    dependencies: z.array(text),
    inputs: z.array(projectPath),
    outputs: z.array(projectPath),
    exclusiveResources: z.array(text.regex(/^[a-z0-9][a-z0-9:._/-]*$/u)).optional(),
    acceptanceCriteria: z.array(text).min(1),
    critical: z.boolean()
  }).strict()).min(1),
  resources: z.object({ maxMembers: z.number().int().positive(), maxConcurrentRequests: z.number().int().positive() }).strict(),
  reviewPolicy: z.literal("independent-and-dual-for-critical"),
  previousTasks: z.array(z.object({ id: text, action: z.enum(["retain_history", "replan"]), reason: text }).strict()),
  recovery: text
}).strict().superRefine((plan, ctx) => {
  if (plan.version === 1 && plan.automation !== void 0 || plan.version === 2 && plan.automation === void 0) {
    ctx.addIssue({ code: "custom", message: "automation is required only for version 2; version 1 retains manual provisioning" });
  }
  const names = new Set(plan.members.map((member) => member.name));
  const ids = new Set(plan.tasks.map((task) => task.id));
  if (names.size !== plan.members.length || names.has("lead") || ids.size !== plan.tasks.length) {
    ctx.addIssue({ code: "custom", message: "member and task names must be unique; lead is reserved" });
  }
  if (plan.members.length > plan.resources.maxMembers)
    ctx.addIssue({ code: "custom", message: "roster exceeds member budget" });
  for (const member of plan.members) {
    if (plan.version === 1 && (member.persona !== void 0 || member.instructions !== void 0))
      ctx.addIssue({ code: "custom", message: "member persona and instructions require plan version 2" });
    if (new Set(member.skills).size !== member.skills.length)
      ctx.addIssue({ code: "custom", message: `duplicate skill for ${member.name}` });
    const visited = /* @__PURE__ */ new Set([member.name]);
    let parent = member.parent;
    while (parent !== "lead") {
      if (!names.has(parent) || visited.has(parent)) {
        ctx.addIssue({ code: "custom", message: `invalid parent chain for ${member.name}` });
        break;
      }
      visited.add(parent);
      const ancestor = plan.members.find((candidate) => candidate.name === parent);
      if (ancestor === void 0)
        break;
      parent = ancestor.parent;
    }
  }
  const completed = /* @__PURE__ */ new Set();
  const visit = (id2, parents) => {
    if (parents.has(id2) || !ids.has(id2)) {
      ctx.addIssue({ code: "custom", message: `invalid dependency ${id2}` });
      return;
    }
    if (completed.has(id2))
      return;
    const task = plan.tasks.find((candidate) => candidate.id === id2);
    if (task === void 0)
      return;
    for (const dependency of task.dependencies)
      visit(dependency, /* @__PURE__ */ new Set([...parents, id2]));
    completed.add(id2);
  };
  for (const task of plan.tasks) {
    if (task.exclusiveResources !== void 0 && (plan.version === 1 || new Set(task.exclusiveResources).size !== task.exclusiveResources.length)) {
      ctx.addIssue({ code: "custom", message: `exclusiveResources requires version 2 and distinct resource keys for ${task.id}` });
    }
    if (task.critical !== (task.kind !== "execution"))
      ctx.addIssue({ code: "custom", message: `critical must match task kind for ${task.id}` });
    if (!names.has(task.owner) || !names.has(task.reviewer) || task.owner === task.reviewer) {
      ctx.addIssue({ code: "custom", message: `task ${task.id} needs different configured owner and reviewer` });
    }
    const owner = plan.members.find((member) => member.name === task.owner);
    if (owner?.function.endsWith("_adviser"))
      ctx.addIssue({ code: "custom", message: `adviser cannot execute ${task.id}` });
    if (plan.members.find((member) => member.name === task.reviewer)?.function.endsWith("_adviser")) {
      ctx.addIssue({ code: "custom", message: `task ${task.id} needs a separate verifier; advisers review the decision separately` });
    }
    if (new Set(task.dependencies).size !== task.dependencies.length || new Set(task.outputs).size !== task.outputs.length) {
      ctx.addIssue({ code: "custom", message: `duplicate dependency or output in ${task.id}` });
    }
    visit(task.id, /* @__PURE__ */ new Set());
  }
  if (plan.version === 2 && plan.automation?.requirePlanningGate) {
    const dependsOnPlan = (id2, visited = /* @__PURE__ */ new Set()) => {
      if (visited.has(id2))
        return false;
      visited.add(id2);
      const task = plan.tasks.find((candidate) => candidate.id === id2);
      return task !== void 0 && (task.kind === "plan" || task.dependencies.some((dependency) => dependsOnPlan(dependency, visited)));
    };
    for (const task of plan.tasks)
      if (task.kind !== "plan" && !dependsOnPlan(task.id)) {
        ctx.addIssue({ code: "custom", message: `task ${task.id} must depend on a dual-reviewed plan task` });
      }
  }
  if (!plan.tasks.some((task) => task.kind === "delivery"))
    ctx.addIssue({ code: "custom", message: "project plan requires a final delivery task" });
  if (plan.tasks.some((task) => task.critical) && (!plan.members.some((member) => member.function === "planning_adviser") || !plan.members.some((member) => member.function === "quality_adviser"))) {
    ctx.addIssue({ code: "custom", message: "critical tasks require both planning and quality advisers" });
  }
});
function readProjectPlan(textValue) {
  if (textValue === void 0 || !textValue.trim().startsWith("{"))
    return void 0;
  let value;
  try {
    value = JSON.parse(textValue);
  } catch (error) {
    if (error instanceof SyntaxError)
      return void 0;
    throw error;
  }
  if (typeof value !== "object" || value === null || !("format" in value) || value.format !== "dsh-team-project-plan")
    return void 0;
  return projectPlanSchema.parse(value);
}
function validateTaskTransition(state, plan) {
  if (plan.version === 2) {
    const collision = plan.tasks.find((planned) => state.tasks.some((task) => task.inputKey === planned.id && task.status !== "deleted"));
    if (collision !== void 0)
      throw new Error(`task id ${collision.id} already belongs to an earlier goal; use a new versioned id and retain the previous evidence in history`);
  }
  const unfinished = state.tasks.filter((task) => task.status === "pending" || task.status === "in_progress");
  const current = unfinished.filter((task) => task.work === void 0 || task.work.plan.goalRevision === (state.goal?.revision ?? 0));
  for (const task of current)
    if (!plan.previousTasks.some((item) => item.id === task.id)) {
      throw new Error(`previousTasks must classify ${task.id} as retain_history or replan; earlier effects and evidence remain in history`);
    }
  if (new Set(plan.previousTasks.map((item) => item.id)).size !== plan.previousTasks.length || plan.previousTasks.some((item) => !unfinished.some((task) => task.id === item.id))) {
    throw new Error("previousTasks must contain each unfinished task exactly once and no unknown task");
  }
}

// packages/team/modules/runtime/lib/types/error.js
import { inspect } from "node:util";
import { HarnessError } from "@deepseek-ai/dsh-llm";
var TeamError = class extends HarnessError {
  constructor(message, code, options) {
    super(message, code, options);
    this.name = "TeamError";
  }
};
function errorMessage(error) {
  if (error instanceof Error)
    return error.message;
  if (typeof error === "string")
    return error;
  return inspect(error, { breakLength: Infinity, compact: true, depth: 4 });
}

// packages/team/modules/runtime/lib/types/provision-plan.js
async function provisionPlan(service, root, controls) {
  const state = controls.state();
  const goal = state.goal;
  const plan = readProjectPlan(goal?.definition.plan);
  if (goal?.status !== "active" || plan?.version !== 2 || plan.automation?.provision !== "on-demand")
    return;
  const ready = plan.tasks.filter((task) => !state.tasks.some((saved) => saved.inputKey === task.id) && task.dependencies.every((id2) => state.tasks.some((saved) => saved.inputKey === id2 && saved.status === "completed")));
  if (ready.length === 0)
    return;
  const required = new Set(ready.flatMap((task) => [task.owner, task.reviewer]));
  for (const member of plan.members)
    if (member.function === "planning_adviser" || member.function === "quality_adviser")
      required.add(member.name);
  for (const name of required) {
    let member = plan.members.find((candidate) => candidate.name === name);
    while (member !== void 0 && member.parent !== "lead") {
      required.add(member.parent);
      member = plan.members.find((candidate) => candidate.name === member?.parent);
    }
  }
  let created = 0;
  const remaining = plan.members.filter((member) => required.has(member.name));
  for (let pass = 0; pass < plan.members.length && created < controls.maxNew; pass++) {
    let changed = false;
    for (const member of remaining) {
      controls.signal.throwIfAborted();
      if (controls.state().goal?.revision !== goal.revision)
        return;
      if (controls.state().members.some((saved) => saved.name === member.name))
        continue;
      const chain = [];
      let parentName = member.parent;
      let available = true;
      while (parentName !== "lead") {
        const saved = controls.state().members.find((candidate) => candidate.name === parentName);
        if (saved?.phase !== "active") {
          available = false;
          break;
        }
        chain.unshift(saved.id);
        parentName = plan.members.find((candidate) => candidate.name === parentName).parent;
      }
      if (!available)
        continue;
      await withHostSubagentAncestors(controls.subagents, root, chain, controls.signal, (parent) => service.spawnTeammate(parent, {
        name: member.name,
        description: member.responsibility,
        teamFunction: member.function,
        persona: member.persona ?? member.responsibility,
        provider: controls.provider,
        context: "fresh",
        signal: controls.signal,
        skills: member.skills.map((name) => ({ name, purpose: member.responsibility.slice(0, 200).replace(/[\p{Cc}\p{Cf}]/gu, " ") })),
        agentOptions: { provider: member.modelProvider, model: member.model, reasoningEffort: ReasoningEffortId(member.reasoningEffort) },
        prompt: [{ type: "text", text: `Read the confirmed goal, current task board and your selected skills. You are ${member.name}. Retain this identity. Start project actions only after a task is assigned. Submit evidence for independent review; advisers only decide and review.` }]
      }));
      changed = true;
      if (++created >= controls.maxNew)
        break;
    }
    if (!changed)
      break;
  }
  for (const task of ready) {
    controls.signal.throwIfAborted();
    const current = controls.state();
    if (current.goal?.revision !== goal.revision || current.goal.status !== "active")
      return;
    if (current.tasks.some((saved) => saved.inputKey === task.id))
      continue;
    if (![task.owner, task.reviewer].every((name) => current.members.some((saved) => saved.name === name && saved.phase === "active")))
      continue;
    const dependencies = task.dependencies.map((id2) => current.tasks.find((saved) => saved.inputKey === id2));
    const checks = await service.validateTaskHandoff(root, dependencies.map((dependency) => dependency.id), controls.signal);
    for (const checked of checks) {
      if (!checked.validity.reusable || dependencies.find((dependency) => dependency.id === checked.taskId)?.revision !== checked.revision) {
        throw new TeamError(`Downstream task ${task.id} is blocked by ${checked.taskId}: ${checked.validity.reasons.join(" ")} Retain accepted artifacts and inspect the changed input; do not repeat the execution.`, "TEAM_TASK_EXECUTION_STALE");
      }
    }
    for (const dependency of dependencies) {
      const owner2 = current.members.find((member) => member.id === dependency.ownerId);
      if (owner2?.workspace !== void 0 && dependency.work?.execution?.submission?.artifacts?.length) {
        if (service.listMembers(root).find((member) => member.id === owner2.id)?.status !== "inactive")
          return;
        await service.integrateWorkspace(root, owner2.name, controls.signal);
      }
    }
    const owner = plan.members.find((member) => member.name === task.owner);
    await service.createTask(root, {
      inputKey: task.id,
      subject: task.description.slice(0, 200),
      description: task.description,
      blockedBy: dependencies.map((dependency) => dependency.id),
      writeScopes: task.outputs,
      reviewer: task.reviewer,
      requiredSkill: owner.skills[0],
      autoAssign: true,
      plan: {
        inputVersion: `goal-${goal.revision}:${task.id}`,
        environmentVersion: `plan-v${plan.version}`,
        inputPaths: task.inputs,
        acceptanceCriteria: task.acceptanceCriteria,
        ...task.critical ? { adviserGate: "dual" } : {}
      }
    }, controls.signal);
  }
}

// packages/team/modules/runtime/lib/types/resource-scheduling.js
var indexes = /* @__PURE__ */ new WeakMap();
function resourceConflicts(state, task) {
  let index = indexes.get(state);
  if (index === void 0) {
    const plan = readProjectPlan(state.goal?.definition.plan);
    const keys = new Map(plan?.tasks.map((planned) => [planned.id, planned.exclusiveResources ?? []]));
    const owners = /* @__PURE__ */ new Map();
    for (const candidate of state.tasks)
      if (candidate.status === "in_progress") {
        for (const key of keys.get(candidate.inputKey ?? "") ?? []) {
          const holders = owners.get(key) ?? [];
          holders.push(candidate);
          owners.set(key, holders);
        }
      }
    index = { keys, owners };
    indexes.set(state, index);
  }
  return [...new Set((index.keys.get(task.inputKey ?? "") ?? []).flatMap((key) => (index.owners.get(key) ?? []).filter((owner) => owner.id !== task.id).map((owner) => String(owner.id))))];
}

// packages/team/modules/runtime/lib/types/tool-capabilities.js
var teamCoordinationTools = /* @__PURE__ */ new Set([
  "team_goal",
  "team_help",
  "team_context",
  "team_mailbox",
  "team_workspace",
  "team_member",
  "list_agents",
  "list_team_models",
  "spawn_teammate",
  "send_message",
  "wait_agent",
  "interrupt_agent",
  "retire_agent",
  "team_task_create",
  "team_task_list",
  "team_task_get",
  "team_task_update",
  "team_task_reconcile",
  "team_task_archive",
  "team_task_submit",
  "team_task_review",
  "team_adviser_review",
  "team_expert_catalog",
  "team_expert_save",
  "team_expert_assign",
  "team_skill",
  "team_skill_catalog",
  "team_skills",
  "get_goal",
  "skill",
  "ask_user_question",
  "todo_write",
  "job_output",
  "job_list",
  "job_kill",
  "web_status"
]);
var trackedCoordination = /* @__PURE__ */ new Set(["team_workspace", "job_kill"]);
var readOnlyTools = /* @__PURE__ */ new Set(["read", "read_image", "glob", "grep"]);
var adviserTools = /* @__PURE__ */ new Set([
  "read",
  "read_image",
  "glob",
  "grep",
  "web_search",
  "web_fetch",
  "web_status",
  "team_goal",
  "team_help",
  "team_context",
  "team_mailbox",
  "team_workspace",
  "list_agents",
  "list_team_models",
  "team_task_list",
  "team_task_get",
  "team_task_archive",
  "team_adviser_review",
  "team_skill",
  "team_skill_catalog",
  "team_skills",
  "send_message",
  "ask_user_question"
]);
function hasNoExternalTaskEffect(name, args) {
  if (name === "team_workspace" && args !== null && typeof args === "object" && "action" in args && (args.action === "get" || args.action === "prepare" || args.action === "read_artifact" || args.action === "read_input"))
    return true;
  return readOnlyTools.has(name) || teamCoordinationTools.has(name) && !trackedCoordination.has(name);
}
var teamAuditedTools = /* @__PURE__ */ new Set([
  ...teamCoordinationTools,
  ...readOnlyTools,
  "write",
  "edit",
  "bash",
  "pwsh",
  "run_code",
  "web_search",
  "web_fetch"
]);

// packages/team/modules/runtime/lib/types/member-role.js
import { z as z2 } from "zod";
import { SessionId } from "@deepseek-ai/dsh-session";
var teamMemberFunctionSchema = z2.enum([
  "planning_adviser",
  "quality_adviser",
  "domain_adviser",
  "group_lead",
  "executor",
  "verifier"
]);
var teamMemberRoleSchema = z2.object({
  goalRevision: z2.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  memberId: z2.string().min(1).transform(SessionId),
  revision: z2.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  teamFunction: teamMemberFunctionSchema,
  reason: z2.string().trim().min(1).max(4096)
}).strict();
function memberFunction(state, member) {
  if (member === void 0)
    return void 0;
  return state.memberRoles?.find((role) => role.memberId === member.id)?.teamFunction ?? member.teamFunction;
}
function memberRoleRevision(state, memberId) {
  return state.memberRoles?.find((role) => role.memberId === memberId)?.revision ?? 0;
}

// packages/team/modules/runtime/lib/types/types.js
function TeamId(id2) {
  return id2;
}
function TeamTaskId(id2) {
  return id2;
}
function TeamMessageId(id2) {
  return id2;
}

// packages/team/modules/runtime/lib/types/member-tool-menu.js
function currentMemberToolMenu(state, id2, names) {
  if (state.goal?.status !== "active" || readProjectPlan(state.goal.definition.plan)?.version !== 2)
    return void 0;
  const member = state.members.find((candidate) => candidate.id === id2);
  const adviser = memberFunction(state, member)?.endsWith("_adviser") === true;
  const executing = state.tasks.some((task) => task.ownerId === id2 && task.work?.plan.goalRevision === state.goal?.revision && task.work?.execution?.phase === "running");
  const verifying = state.tasks.some((task) => task.reviewerId === id2 && task.work?.plan.goalRevision === state.goal?.revision && task.work?.execution?.phase === "submitted");
  const observing = TeamId(id2) === state.id || adviser || executing || verifying;
  const scope = state.goal.definition.scope.execution;
  return names.filter((name) => {
    if (adviser && !adviserTools.has(name))
      return false;
    if (name === "job_kill")
      return executing && scope?.allowUnrestrictedExecution === true;
    if (teamCoordinationTools.has(name))
      return true;
    if (!observing)
      return false;
    if (["read", "read_image", "glob", "grep"].includes(name))
      return true;
    if (name === "web_search")
      return scope?.allowSearch === true;
    if (name === "web_fetch")
      return (scope?.webOrigins.length ?? 0) > 0;
    if (!executing || adviser)
      return false;
    if (["write", "edit", "str_replace_editor"].includes(name))
      return true;
    return scope?.allowUnrestrictedExecution === true;
  });
}

// packages/team/modules/runtime/lib/types/index.js
import { capCurrentAgentToolMenu } from "dsh-team-workbench/compat-tools/agent-menu";

// packages/team/modules/runtime/lib/types/cooldown.js
function failureCooldownMs(failure, rateDelay, quotaDelay) {
  if (failure.status === 401 || failure.status === 403)
    return void 0;
  const text4 = `${failure.code} ${failure.message}`;
  const quota = failure.status === 402 || /quota|balance|credit|额度|余额/iu.test(text4);
  const rate = failure.status === 429 || /rate.?limit|concurren|TooManyRequests|\b429\b|\bisQueued\b|\bqueued\b|频率|并发|排队/iu.test(text4);
  if (!quota && !rate)
    return void 0;
  const seconds = /["']?retryAfterSeconds["']?\s*[:=]\s*(\d+(?:\.\d+)?)/u.exec(failure.message)?.[1];
  const messageDelay = seconds === void 0 ? 0 : Number(seconds) * 1e3;
  return Math.min(2147483647, Math.max(quota ? quotaDelay : rateDelay, failure.providerRetryAfterMs ?? messageDelay));
}

// packages/team/modules/runtime/lib/types/persisted.js
async function readPersistedSession(persistence, id2, signal) {
  const handle = await persistence.open(id2, "read", { signal });
  try {
    const { events } = await handle.read(0, void 0, { signal });
    return { header: handle.header, inheritedEventCount: handle.inheritedEventCount, events };
  } finally {
    await handle.close();
  }
}

// packages/team/modules/runtime/lib/types/index.js
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import z10 from "@deepseek-ai/schemastery";
import { createHash as createHash7, randomUUID as randomUUID6 } from "node:crypto";

// packages/team/modules/runtime/lib/types/task-receipts.js
import { createHash as createHash2 } from "node:crypto";
import { open, realpath as realpath2, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

// packages/team/modules/runtime/lib/types/validation.js
function requiredText(value, field2, maxLength) {
  const text4 = value.trim();
  if (text4.length === 0)
    throw new TeamError(`${field2} must be non-empty`, "TEAM_INVALID_ARGUMENT");
  if (text4.length > maxLength) {
    throw new TeamError(`${field2} exceeds ${maxLength} characters`, "TEAM_INVALID_ARGUMENT");
  }
  return text4;
}
function writeScope(value) {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//u, "").replace(/\/+$/u, "");
  const segments = normalized.split("/");
  if (normalized.length === 0 || normalized.startsWith("/") || /^[a-z]:/iu.test(normalized) || segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    throw new TeamError(`invalid workspace-relative write scope ${JSON.stringify(value)}`, "TEAM_INVALID_WRITE_SCOPE");
  }
  return normalized;
}

// packages/team/modules/runtime/lib/types/task-receipts.js
async function observeTaskEnvironment(cwd) {
  return {
    workspaceRoot: await realpath2(cwd),
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version
  };
}
async function observeTaskFiles(environment, paths, maxPaths, maxBytes, signal) {
  if (paths.length > maxPaths)
    throw new TeamError(`task receipt has more than ${maxPaths} files`, "TEAM_TASK_WORK_TOO_LARGE");
  const seen = /* @__PURE__ */ new Set();
  const receipts = [];
  let totalBytes = 0;
  for (const value of paths) {
    signal.throwIfAborted();
    const path = writeScope(value);
    if (seen.has(path))
      throw new TeamError(`duplicate task receipt path ${path}`, "TEAM_INVALID_ARGUMENT");
    seen.add(path);
    const target = await realpath2(resolve(environment.workspaceRoot, path));
    const within = relative(environment.workspaceRoot, target);
    if (isAbsolute(within) || within === ".." || within.startsWith(`..${sep}`)) {
      throw new TeamError(`task receipt path leaves workspace: ${path}`, "TEAM_INVALID_ARGUMENT");
    }
    const handle = await open(target, "r");
    try {
      const before = await handle.stat();
      if (!before.isFile())
        throw new TeamError(`task receipt path is not a regular file: ${path}`, "TEAM_INVALID_ARGUMENT");
      totalBytes += before.size;
      if (!Number.isSafeInteger(totalBytes) || totalBytes > maxBytes) {
        throw new TeamError(`task receipts exceed ${maxBytes} bytes`, "TEAM_TASK_WORK_TOO_LARGE");
      }
      const hash2 = createHash2("sha256");
      let readBytes = 0;
      for await (const chunk of handle.createReadStream({ autoClose: false, signal })) {
        readBytes += chunk.length;
        if (!Number.isSafeInteger(readBytes) || totalBytes - before.size + readBytes > maxBytes) {
          throw new TeamError(`task receipts exceed ${maxBytes} bytes`, "TEAM_TASK_WORK_TOO_LARGE");
        }
        hash2.update(chunk);
      }
      const after = await handle.stat();
      const currentPath = await realpath2(resolve(environment.workspaceRoot, path));
      const current = await stat(currentPath);
      signal.throwIfAborted();
      if (before.size !== readBytes || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs || before.dev !== after.dev || before.ino !== after.ino || currentPath !== target || before.dev !== current.dev || before.ino !== current.ino || before.size !== current.size || before.mtimeMs !== current.mtimeMs || before.ctimeMs !== current.ctimeMs) {
        throw new TeamError(`task receipt file changed while reading: ${path}`, "TEAM_TASK_EXECUTION_STALE");
      }
      receipts.push({ path, bytes: before.size, sha256: hash2.digest("hex") });
    } finally {
      await handle.close();
    }
  }
  return receipts;
}
async function readTaskReceiptText(environment, receipt, byteOffset, pageBytes, receiptBytes, signal) {
  if (!Number.isSafeInteger(byteOffset) || byteOffset < 0 || byteOffset > receipt.bytes) {
    throw new TeamError("byte_offset must be within the submitted artifact; use nextByteOffset from the previous page", "TEAM_INVALID_ARGUMENT");
  }
  const check = async () => {
    const [current] = await observeTaskFiles(environment, [receipt.path], 1, receiptBytes, signal);
    if (current?.sha256 !== receipt.sha256 || current.bytes !== receipt.bytes) {
      throw new TeamError("submitted artifact changed; request a new submission instead of reviewing this file", "TEAM_TASK_EXECUTION_STALE");
    }
  };
  await check();
  const target = await realpath2(resolve(environment.workspaceRoot, receipt.path));
  const tail = relative(environment.workspaceRoot, target);
  if (isAbsolute(tail) || tail === ".." || tail.startsWith(`..${sep}`)) {
    throw new TeamError("artifact leaves its recorded workspace", "TEAM_INVALID_ARGUMENT");
  }
  const handle = await open(target, "r");
  let content;
  try {
    const buffer = Buffer.alloc(Math.min(pageBytes, receipt.bytes - byteOffset));
    let count = 0;
    while (count < buffer.length) {
      signal.throwIfAborted();
      const result = await handle.read(buffer, count, buffer.length - count, byteOffset + count);
      if (result.bytesRead === 0)
        break;
      count += result.bytesRead;
    }
    const page = buffer.subarray(0, count);
    if (page.includes(0))
      throw new TeamError("artifact is binary; this operation reads UTF-8 text only", "TEAM_INVALID_ARGUMENT");
    try {
      content = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(page, { stream: byteOffset + count < receipt.bytes });
    } catch (error) {
      throw new TeamError("artifact page is not valid UTF-8; use the previous nextByteOffset or a text artifact", "TEAM_INVALID_ARGUMENT", { cause: error });
    }
  } finally {
    await handle.close();
  }
  await check();
  signal.throwIfAborted();
  return content;
}

// packages/team/modules/runtime/lib/types/artifact-store.js
import { randomUUID } from "node:crypto";
import { link, mkdir as mkdir2, open as open2, realpath as realpath3, unlink } from "node:fs/promises";
import { isAbsolute as isAbsolute2, join as join2, relative as relative2, resolve as resolve2, sep as sep2 } from "node:path";
var TeamArtifactStore = class {
  root;
  /** @param root - Host-owned artifact directory outside writable member copies. */
  constructor(root) {
    this.root = root;
  }
  /**
   * Retain exact submitted bytes; an interrupted or changed source is never published.
   * @param environment - Canonical executor workspace.
   * @param receipts - Already observed artifact versions.
   * @param signal - Goal and caller cancellation.
   */
  async capture(environment, receipts, signal) {
    if (receipts.length === 0)
      return;
    await mkdir2(this.root, { recursive: true });
    const archiveRoot = await realpath3(this.root);
    for (const receipt of receipts) {
      signal.throwIfAborted();
      const source = await realpath3(resolve2(environment.workspaceRoot, receipt.path));
      const tail = relative2(environment.workspaceRoot, source);
      if (isAbsolute2(tail) || tail === ".." || tail.startsWith(`..${sep2}`)) {
        throw new TeamError("artifact source leaves its workspace", "TEAM_INVALID_ARGUMENT");
      }
      const temporary = join2(archiveRoot, `${receipt.sha256}-${randomUUID()}.tmp`);
      const input = await open2(source, "r");
      try {
        const output = await open2(temporary, "wx");
        try {
          const buffer = Buffer.alloc(65536);
          let position = 0;
          while (true) {
            signal.throwIfAborted();
            const { bytesRead } = await input.read(buffer, 0, Math.min(buffer.length, receipt.bytes - position + 1), position);
            if (bytesRead === 0)
              break;
            if (position + bytesRead > receipt.bytes) {
              throw new TeamError("artifact grew after observation", "TEAM_TASK_EXECUTION_STALE");
            }
            let written = 0;
            while (written < bytesRead) {
              written += (await output.write(buffer, written, bytesRead - written, position + written)).bytesWritten;
            }
            position += bytesRead;
          }
          if (position !== receipt.bytes)
            throw new TeamError("artifact shrank after observation", "TEAM_TASK_EXECUTION_STALE");
          await output.sync();
        } finally {
          await output.close();
        }
        const [copied] = await observeTaskFiles({ ...environment, workspaceRoot: archiveRoot }, [relative2(archiveRoot, temporary)], 1, receipt.bytes, signal);
        if (copied?.sha256 !== receipt.sha256 || copied.bytes !== receipt.bytes) {
          throw new TeamError("artifact changed after observation", "TEAM_TASK_EXECUTION_STALE");
        }
        try {
          await link(temporary, join2(archiveRoot, receipt.sha256));
        } catch (error) {
          if (!(error instanceof Error && "code" in error && error.code === "EEXIST"))
            throw error;
          const [existing] = await observeTaskFiles({ ...environment, workspaceRoot: archiveRoot }, [receipt.sha256], 1, receipt.bytes, signal);
          if (existing?.sha256 !== receipt.sha256 || existing.bytes !== receipt.bytes) {
            throw new TeamError("stored artifact digest does not match its contents", "TEAM_TASK_EXECUTION_STALE");
          }
        }
      } finally {
        await input.close();
        try {
          await unlink(temporary);
        } catch (error) {
          if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
            throw error;
        }
      }
    }
  }
  /**
   * Read the retained version, falling back to verified original files for older submissions.
   * @param environment - Original executor environment used for legacy receipts.
   * @param receipt - Authorized task receipt.
   * @param offset - Previously returned byte offset.
   * @param pageBytes - Maximum retained page bytes.
   * @param receiptBytes - Maximum verification bytes.
   * @param signal - Cancellation during reads.
   * @returns verified UTF-8 text from the submitted version.
   */
  async read(environment, receipt, offset, pageBytes, receiptBytes, signal) {
    const stored = await this.stored(receipt);
    if (stored === void 0)
      return readTaskReceiptText(environment, receipt, offset, pageBytes, receiptBytes, signal);
    return readTaskReceiptText({ ...environment, workspaceRoot: stored.root }, { ...receipt, path: receipt.sha256 }, offset, pageBytes, receiptBytes, signal);
  }
  /**
   * Verify retained submitted bytes independently of later member edits; older evidence uses its original files.
   * @param environment - Original execution workspace and runtime label.
   * @param receipts - Exact submitted versions in their recorded order.
   * @param maxPaths - Maximum receipt count.
   * @param maxBytes - Maximum cumulative verified bytes.
   * @param signal - Cancellation during verification.
   * @returns observed receipts under their logical project paths.
   */
  async verify(environment, receipts, maxPaths, maxBytes, signal) {
    if (receipts.length > maxPaths)
      throw new TeamError(`task receipt has more than ${maxPaths} files`, "TEAM_TASK_WORK_TOO_LARGE");
    let bytes = 0;
    const result = [];
    for (const receipt of receipts) {
      signal.throwIfAborted();
      bytes += receipt.bytes;
      if (!Number.isSafeInteger(bytes) || bytes > maxBytes)
        throw new TeamError(`task receipts exceed ${maxBytes} bytes`, "TEAM_TASK_WORK_TOO_LARGE");
      const stored = await this.stored(receipt);
      const [observed] = await observeTaskFiles(stored === void 0 ? environment : { ...environment, workspaceRoot: stored.root }, [stored === void 0 ? receipt.path : receipt.sha256], 1, receipt.bytes, signal);
      if (observed === void 0)
        throw new TeamError("artifact receipt is missing", "TEAM_TASK_EXECUTION_STALE");
      result.push({ ...observed, path: receipt.path });
    }
    return result;
  }
  async stored(receipt) {
    let stored;
    try {
      stored = await realpath3(join2(this.root, receipt.sha256));
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
        throw error;
      return void 0;
    }
    const root = await realpath3(this.root);
    if (stored !== join2(root, receipt.sha256))
      throw new TeamError("stored artifact is redirected", "TEAM_INVALID_ARGUMENT");
    return { root };
  }
};

// packages/team/modules/runtime/lib/types/publication.js
function selectPublicationArtifacts(tasks) {
  const selected = /* @__PURE__ */ new Map();
  const dependsOn = (id2, ancestor, seen = /* @__PURE__ */ new Set()) => {
    if (seen.has(id2))
      return false;
    seen.add(id2);
    return (tasks.find((task) => task.id === id2)?.dependencies ?? []).some((parent) => parent === ancestor || dependsOn(parent, ancestor, seen));
  };
  for (const task of tasks)
    for (const receipt of task.artifacts) {
      const prior = selected.get(receipt.path);
      if (prior !== void 0 && prior.receipt.sha256 !== receipt.sha256) {
        if (dependsOn(prior.task, task.id))
          continue;
        if (!dependsOn(task.id, prior.task)) {
          throw new TeamError(`independent accepted artifact versions conflict: ${receipt.path}; reconcile their tasks before publishing`, "TEAM_TASK_EXECUTION_STALE");
        }
      }
      selected.set(receipt.path, { receipt, task: task.id });
    }
  return [...selected.values()].map((value) => value.receipt);
}

// packages/team/modules/runtime/lib/types/index.js
import { join as join5 } from "node:path";
import { installModelSelection } from "@deepseek-ai/dsh-agent";

// packages/team/modules/runtime/lib/types/activity.js
var TeamActivity = class {
  waiters = /* @__PURE__ */ new Map();
  waiting = /* @__PURE__ */ new Map();
  closed = false;
  /**
   * Wait for one later Team-domain or member-status change.
   * @param id - Team whose next edge wakes the caller.
   * @param callerId - exact member whose turn is parked in this wait.
   * @param timeoutMs - bounded wait duration from ten seconds through one hour.
   * @param signal - caller cancellation for this wait only.
   * @returns whether the wait ended by timeout.
   */
  async wait(id2, callerId, timeoutMs, signal) {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1e4 || timeoutMs > 36e5) {
      throw new TeamError("timeoutMs must be an integer from 10000 through 3600000", "TEAM_INVALID_TIMEOUT");
    }
    signal.throwIfAborted();
    if (this.closed)
      return { timedOut: false };
    let waiting = this.waiting.get(id2);
    if (waiting === void 0) {
      waiting = /* @__PURE__ */ new Map();
      this.waiting.set(id2, waiting);
    }
    waiting.set(callerId, (waiting.get(callerId) ?? 0) + 1);
    const changed = await new Promise((resolve7, reject) => {
      let waiters = this.waiters.get(id2);
      if (waiters === void 0) {
        waiters = /* @__PURE__ */ new Set();
        this.waiters.set(id2, waiters);
      }
      let settled = false;
      const finish = (settle) => {
        if (settled)
          return;
        settled = true;
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
        waiters.delete(waiter);
        if (waiters.size === 0)
          this.waiters.delete(id2);
        const count = waiting.get(callerId);
        if (count === 1) {
          waiting.delete(callerId);
          if (waiting.size === 0)
            this.waiting.delete(id2);
          if (!this.closed)
            this.notify(id2);
        } else if (count !== void 0) {
          waiting.set(callerId, count - 1);
        }
        settle();
      };
      const onAbort = () => {
        finish(() => {
          const reason = signal.reason;
          reject(reason instanceof Error ? reason : new TeamError(`wait_agent aborted: ${errorMessage(reason)}`, "TEAM_WAIT_ABORTED"));
        });
      };
      const waiter = {
        resolve: () => {
          finish(() => {
            resolve7(true);
          });
        }
      };
      waiters.add(waiter);
      const timer = setTimeout(() => {
        finish(() => {
          resolve7(false);
        });
      }, timeoutMs);
      signal.addEventListener("abort", onAbort, { once: true });
      if (signal.aborted)
        onAbort();
    });
    return { timedOut: !changed };
  }
  /**
   * Whether one exact member currently owns at least one active wait lease.
   * @param id - Team whose wait leases are inspected.
   * @param memberId - Exact member whose lease is checked.
   * @returns whether that member currently waits.
   */
  isWaiting(id2, memberId) {
    return this.waiting.get(id2)?.has(memberId) ?? false;
  }
  /**
   * Detached member ids parked in wait calls for Team diagnostics.
   * @param id - Team whose waiters are listed.
   * @returns member ids with active wait leases.
   */
  waitingMembers(id2) {
    return [...this.waiting.get(id2)?.keys() ?? []];
  }
  /**
   * Wake and remove every current waiter for one Team.
   * @param id - Team whose current waiters observe the change.
   */
  notify(id2) {
    const waiters = this.waiters.get(id2);
    if (waiters === void 0)
      return;
    this.waiters.delete(id2);
    for (const waiter of waiters)
      waiter.resolve();
  }
  /** Close admission and wake every current waiter during runtime disposal. */
  close() {
    this.closed = true;
    for (const waiters of this.waiters.values()) {
      for (const waiter of waiters)
        waiter.resolve();
    }
    this.waiters.clear();
    this.waiting.clear();
  }
};

// packages/team/modules/runtime/lib/types/portable-events.js
import z3 from "zod";
var marker = "__dsh_workbench_event__";
var subject = "dsh-workbench:portable-event";
var payloadSchema = z3.object({
  format: z3.literal("dsh-team-event"),
  version: z3.literal(1),
  type: z3.string().min(1),
  payload: z3.string()
}).strict();
var recordSchema = z3.object({
  id: z3.literal(marker),
  subject: z3.literal(subject),
  revision: z3.literal(1),
  status: z3.literal("deleted"),
  description: z3.string(),
  blockedBy: z3.array(z3.never()),
  writeScopes: z3.array(z3.never())
}).strict();
function portableTeamRecord(type, payload) {
  return {
    id: TeamTaskId(marker),
    revision: 1,
    subject,
    status: "deleted",
    blockedBy: [],
    writeScopes: [],
    description: JSON.stringify({ format: "dsh-team-event", version: 1, type, payload })
  };
}
function readPortableTeamRecord(task) {
  if (task.id !== marker)
    return void 0;
  const record = recordSchema.parse(task);
  return payloadSchema.parse(JSON.parse(record.description));
}

// packages/team/modules/runtime/lib/types/journal.js
var TeamJournal = class {
  ctx;
  onCommit;
  portableEventEnvelope;
  beforeWrite;
  tails = /* @__PURE__ */ new Map();
  /**
   * @param ctx - Team service context with the injected Session service.
   * @param onCommit - synchronous notification with the event type after the Team event flush succeeds.
   * @param portableEventEnvelope - Write Team payloads inside a known Session event name for independent installations.
   */
  constructor(ctx, onCommit, portableEventEnvelope = false, beforeWrite) {
    this.ctx = ctx;
    this.onCommit = onCommit;
    this.portableEventEnvelope = portableEventEnvelope;
    this.beforeWrite = beforeWrite;
  }
  /**
   * Read authoritative Team state for one exact live Lead.
   * @param root - exact live Team Lead.
   * @returns current projected state selected by the Lead Team id.
   */
  state(root) {
    const projection = this.ctx.sessionProjections.stateOf(root.session, "agentTeam");
    if (projection === void 0)
      throw new Error("Agent Teams projection is not registered");
    if (projection.failure !== void 0)
      throw new Error(projection.failure);
    return projection;
  }
  /**
   * Serialize one Lead's asynchronous mutation operation.
   * @param rootId - Lead Session identity selecting the transaction queue.
   * @param operation - complete read-check-append operation.
   * @returns the operation result.
   */
  async transact(rootId, operation) {
    const prior = this.tails.get(rootId) ?? Promise.resolve();
    const admitted = async () => {
      await this.beforeWrite?.(rootId);
      return operation();
    };
    const run = prior.then(admitted, admitted);
    const tail = run.then(() => void 0, () => void 0);
    this.tails.set(rootId, tail);
    try {
      return await run;
    } finally {
      if (this.tails.get(rootId) === tail)
        this.tails.delete(rootId);
    }
  }
  /** Wait for queued operations and appended checkpoints after their owners close admission. */
  async drain() {
    while (this.tails.size > 0)
      await Promise.all(this.tails.values());
  }
  /**
   * Append and checkpoint one root-owned Team event before publication.
   * @param root - exact live Lead whose Session owns the event.
   * @param type - Team event discriminant.
   * @param data - payload correlated with the event type.
   */
  async appendAndFlush(root, type, data) {
    await this.beforeWrite?.(root.id);
    if (this.portableEventEnvelope) {
      root.session.append("team/task", {
        version: 2,
        teamId: data.teamId,
        task: portableTeamRecord(type, JSON.stringify(data))
      });
    } else {
      const append = root.session.append.bind(root.session);
      append(type, data);
    }
    await this.ctx.sessions.flush(root.session);
    this.onCommit(root, type);
  }
};

// packages/team/modules/runtime/lib/types/goals.js
import { UserQuestionError } from "@deepseek-ai/dsh-user-questions";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";

// packages/team/modules/runtime/lib/types/goal-schema.js
import { z as z4 } from "zod";
import { brandString } from "@deepseek-ai/dsh-brand";
var revision = z4.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
var text2 = z4.string().trim().min(1);
var origin = text2.refine((value) => {
  if (value === "*")
    return true;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.hostname.includes("*") && url.pathname === "/" && !url.search && !url.hash;
  } catch (error) {
    if (error instanceof TypeError)
      return false;
    throw error;
  }
}, "expected an HTTP(S) origin without path, credentials or wildcard host").transform((value) => value === "*" ? value : new URL(value).origin);
var teamExecutionScopeSchema = z4.object({
  readPaths: z4.array(text2),
  writePaths: z4.array(text2),
  webOrigins: z4.array(origin),
  allowSearch: z4.boolean(),
  allowUnrestrictedExecution: z4.boolean()
}).strict().refine((value) => !value.allowUnrestrictedExecution || value.readPaths.includes("*") && value.writePaths.includes("*") && value.webOrigins.includes("*"), {
  message: "pwsh/bash/run_code \u7B49\u4EFB\u610F\u7A0B\u5E8F\u6267\u884C\u9700\u8981 readPaths\u3001writePaths\u3001webOrigins \u4E09\u9879\u90FD\u5305\u542B * \u5E76\u7531\u7528\u6237\u786E\u8BA4\uFF1B\u8981\u4FDD\u7559\u8DEF\u5F84\u548C\u7F51\u7EDC\u9650\u5236\uFF0C\u8BF7\u5C06 allowUnrestrictedExecution \u8BBE\u4E3A false \u5E76\u4F7F\u7528\u53D7\u9650\u539F\u751F\u5DE5\u5177"
});
var definition = z4.object({
  objective: text2,
  acceptanceCriteria: z4.array(text2).min(1),
  plan: text2.optional(),
  scope: z4.object({
    coverage: z4.enum(["full", "partial", "task"]),
    targets: z4.array(text2).min(1),
    allowedActions: z4.array(text2).min(1),
    excludedTargets: z4.array(text2),
    constraints: z4.array(text2),
    execution: teamExecutionScopeSchema.optional()
  }).strict()
}).strict();
var teamGoalChangeSchema = z4.discriminatedUnion("kind", [
  z4.object({ kind: z4.literal("replace"), definition }).strict(),
  z4.object({ kind: z4.literal("revoke"), reason: text2 }).strict()
]);
var teamGoalProposalSchema = z4.object({
  revision: revision.min(1),
  baseRevision: revision,
  proposedBy: text2.transform((value) => brandString(value)),
  change: teamGoalChangeSchema
}).strict();
var teamGoalDecisionSchema = z4.object({
  proposalRevision: revision.min(1),
  outcome: z4.enum(["accepted", "rejected"]),
  comment: z4.string(),
  decidedAt: revision,
  channel: z4.literal("user-question")
}).strict();
var teamGoalSnapshotSchema = z4.object({
  revision: revision.min(1),
  proposalRevision: revision.min(1),
  status: z4.enum(["active", "revoked"]),
  definition,
  decidedAt: revision,
  revocationReason: text2.optional()
}).strict();
var teamGoalStateFields = {
  goal: teamGoalSnapshotSchema.optional(),
  goalProposal: teamGoalProposalSchema.optional(),
  goalDecision: teamGoalDecisionSchema.optional()
};

// packages/team/modules/runtime/lib/types/goal-fold.js
function assertGoalProposal(state, proposal) {
  if (proposal.revision !== (state.goalProposal?.revision ?? 0) + 1)
    throw new Error("goal proposal revision is not contiguous");
  if (proposal.baseRevision !== (state.goal?.revision ?? 0))
    throw new Error("goal proposal has a stale goal revision");
  if (proposal.change.kind === "revoke" && state.goal?.status !== "active")
    throw new Error("only an active goal can be revoked");
}
function applyGoalDecision(state, decision) {
  const proposal = state.goalProposal;
  if (proposal === void 0 || proposal.revision !== decision.proposalRevision)
    throw new Error("goal decision names a superseded or absent proposal");
  if (state.goalDecision?.proposalRevision === proposal.revision)
    throw new Error("goal proposal was already reviewed");
  if (proposal.baseRevision !== (state.goal?.revision ?? 0))
    throw new Error("goal decision has a stale goal revision");
  if (decision.outcome === "rejected")
    return state.goal;
  const revision3 = (state.goal?.revision ?? 0) + 1;
  if (!Number.isSafeInteger(revision3))
    throw new Error("goal revision limit reached");
  const common = { revision: revision3, proposalRevision: proposal.revision, decidedAt: decision.decidedAt };
  if (proposal.change.kind === "replace")
    return { ...common, status: "active", definition: proposal.change.definition };
  if (state.goal?.status !== "active")
    throw new Error("only an active goal can be revoked");
  return { ...common, status: "revoked", definition: state.goal.definition, revocationReason: proposal.change.reason };
}

// packages/team/modules/runtime/lib/types/goal-review-text.js
function literal(value) {
  return value.replace(/[\\`*_{}\[\]()<>#+.!|~\-]/gu, "\\$&").replace(/\r?\n/gu, "\n> ");
}
function field(title, values) {
  return `### ${title}

${values.length === 0 ? "None." : values.map((value) => `> ${literal(value)}`).join("\n\n")}`;
}
function definitionText(definition2) {
  const plan = readProjectPlan(definition2.plan);
  const detailed = plan === void 0 ? definition2.plan : [
    ...plan.members.map((member) => `${member.name} \u2190 ${member.parent}
\u804C\u8D23\uFF1A${member.function}\uFF1B${member.responsibility}
\u6A21\u578B\uFF1A${member.modelProvider} / ${member.model} / ${member.reasoningEffort}
\u6280\u80FD\uFF1A${member.skills.join(", ")}`),
    ...plan.tasks.map((task) => `${task.id}\uFF1A${task.description}
\u6267\u884C\uFF1A${task.owner}\uFF1B\u590D\u6838\uFF1A${task.reviewer}\uFF1B${task.critical ? "\u53CC\u519B\u5E08\u5BA1\u6838" : "\u72EC\u7ACB\u590D\u6838"}
\u524D\u7F6E\uFF1A${task.dependencies.join(", ")}
\u8F93\u5165\uFF1A${task.inputs.join(", ")}
\u8F93\u51FA\uFF1A${task.outputs.join(", ")}
\u9A8C\u6536\uFF1A${task.acceptanceCriteria.join("\uFF1B")}`),
    `\u8D44\u6E90\u9884\u7B97\uFF1A\u4E0B\u7EA7\u6210\u5458 ${plan.resources.maxMembers}\uFF0C\u6A21\u578B\u8BF7\u6C42\u5E76\u53D1 ${plan.resources.maxConcurrentRequests}`,
    ...plan.previousTasks.map((task) => `\u65E7\u4EFB\u52A1 ${task.id}\uFF1A${task.action}\uFF1B${task.reason}`),
    `\u5931\u8D25\u4E0E\u6062\u590D\uFF1A${plan.recovery}`
  ].join("\n\n");
  return [
    field("Objective", [definition2.objective]),
    field("Acceptance criteria", definition2.acceptanceCriteria),
    ...detailed === void 0 ? [] : [field("Complete Team plan", [detailed])],
    field("Coverage within the named targets and actions", [definition2.scope.coverage]),
    field("Targets", definition2.scope.targets),
    field("Allowed actions", definition2.scope.allowedActions),
    field("Excluded targets", definition2.scope.excludedTargets),
    field("Constraints", definition2.scope.constraints),
    ...definition2.scope.execution === void 0 ? [] : [
      field("Execution resources (enforced for supported tools)", [JSON.stringify(definition2.scope.execution)])
    ]
  ].join("\n\n");
}
function renderGoalReview(proposal, current) {
  const proposed = proposal.change.kind === "replace" ? definitionText(proposal.change.definition) : field("Reason for withdrawal", [proposal.change.reason]);
  const prior = current === void 0 ? "No confirmed goal." : `Status: ${current.status}. Revision: ${current.revision}.

${definitionText(current.definition)}`;
  return `## Proposed ${proposal.change.kind === "replace" ? "goal" : "withdrawal"} \xB7 ${proposal.revision}

${proposed}

## Current goal

${prior}`;
}

// packages/team/modules/runtime/lib/types/goals.js
var TeamGoals = class {
  ctx;
  journal;
  roster;
  lifecycle;
  maxBytes;
  requireConfirmed;
  requireExecutionScope;
  requireStructuredPlans;
  planLimits;
  reviewing = /* @__PURE__ */ new WeakSet();
  epochs = /* @__PURE__ */ new Map();
  /**
   * @param ctx - Trusted Host context owning the human question provider.
   * @param journal - Serialized Team event writer.
   * @param roster - Exact live Team membership resolver.
   * @param lifecycle - Plugin disposal signal.
   * @param maxBytes - Maximum encoded goal proposal size.
   * @param requireConfirmed - Block delegation before the first user confirmation.
   * @param requireExecutionScope - Require structured resource rules for newly confirmed work.
   */
  constructor(ctx, journal, roster, lifecycle, maxBytes, requireConfirmed, requireExecutionScope, requireStructuredPlans = false, planLimits) {
    this.ctx = ctx;
    this.journal = journal;
    this.roster = roster;
    this.lifecycle = lifecycle;
    this.maxBytes = maxBytes;
    this.requireConfirmed = requireConfirmed;
    this.requireExecutionScope = requireExecutionScope;
    this.requireStructuredPlans = requireStructuredPlans;
    this.planLimits = planLimits;
    ctx.on("agent/disposed", ({ agent }) => {
      this.epochs.get(agent)?.controller.abort(new TeamError("Team Lead disposed", "TEAM_DISPOSED"));
      this.epochs.delete(agent);
    });
    ctx.effect(() => () => {
      for (const epoch of this.epochs.values())
        epoch.controller.abort(new TeamError("Team goals disposed", "TEAM_DISPOSED"));
      this.epochs.clear();
    }, "agentTeams.goalEpochs");
  }
  /**
   * Read detached goal records visible to every member.
   * @param caller - Exact live Team member.
   * @returns confirmed goal, latest proposal, and its latest review outcome.
   */
  read(caller) {
    const state = this.journal.state(this.roster.membership(caller).root);
    return structuredClone({
      ...state.goal === void 0 ? {} : { goal: state.goal },
      ...state.goalProposal === void 0 ? {} : { goalProposal: state.goalProposal },
      ...state.goalDecision === void 0 ? {} : { goalDecision: state.goalDecision }
    });
  }
  /**
   * Save a complete proposal without changing the current execution goal.
   * @param caller - Exact live Lead.
   * @param request - Both current revisions and the complete proposed change.
   * @param signal - Caller cancellation before the write is admitted.
   * @returns the committed pending proposal.
   */
  async propose(caller, request, signal) {
    const root = this.requireLead(caller);
    const parsed = teamGoalChangeSchema.safeParse(request.change);
    if (!parsed.success)
      throw new RemoteError("TEAM_GOAL_INVALID", `\u76EE\u6807\u63D0\u6848\u5B57\u6BB5\u65E0\u6548\uFF1A${parsed.error.issues.map((issue) => `${issue.path.join(".") || "scope.execution"}: ${issue.message}`).join("; ")}`, {
        fields: parsed.error.issues.map((issue) => issue.path.join("."))
      });
    if (this.requireExecutionScope && parsed.data.kind === "replace" && parsed.data.definition.scope.execution === void 0) {
      throw new RemoteError("TEAM_GOAL_INVALID", "this Team requires explicit file, web and program execution scope", { fields: ["scope.execution"] });
    }
    if (Buffer.byteLength(JSON.stringify(parsed.data), "utf8") > this.maxBytes) {
      throw new RemoteError("TEAM_GOAL_TOO_LARGE", `goal proposal exceeds ${this.maxBytes} bytes`, { maxBytes: this.maxBytes });
    }
    if (parsed.data.kind === "replace" && this.requireStructuredPlans) {
      try {
        const plan = readProjectPlan(parsed.data.definition.plan);
        if (plan === void 0)
          throw new Error("plan must be a JSON project plan with members, tasks, resources, reviewPolicy, previousTasks and recovery; use team_help start");
        validateTaskTransition(this.journal.state(root), plan);
        const limits = this.planLimits;
        if (limits !== void 0) {
          for (const member of plan.members) {
            let depth = 1;
            let parent = member.parent;
            while (parent !== "lead") {
              depth++;
              parent = plan.members.find((candidate) => candidate.name === parent).parent;
            }
            if (depth > limits.depth)
              throw new Error(`member ${member.name} exceeds the configured delegation depth ${limits.depth}`);
          }
          if (plan.version === 2 && plan.automation?.provision === "on-demand") {
            if (!limits.automatic)
              throw new Error("on-demand provisioning is disabled; enable autoProvisionPlannedMembers or propose manual automation");
            if (this.ctx.subagents.getProvider(limits.provider) === void 0)
              throw new Error(`planned member provider ${limits.provider} is not registered`);
          }
        }
        if (limits !== void 0 && (plan.resources.maxMembers > limits.members || plan.resources.maxConcurrentRequests > limits.requests || plan.tasks.length > limits.tasks || plan.members.some((member) => member.skills.length > limits.skills))) {
          throw new Error("project plan exceeds the configured member, request, task or per-member skill budget");
        }
        for (const member of plan.members)
          await caller.ctx.llm.resolveCallConfig({
            provider: member.modelProvider,
            model: member.model,
            reasoningEffort: member.reasoningEffort
          }, signal);
        const modules = /* @__PURE__ */ new Map();
        for (const name of new Set(plan.members.flatMap((member) => member.skills))) {
          const resolved = await this.ctx.waterfall("team/resolve-skill", { agent: caller, name, signal }, () => Promise.reject(new Error(`no installed skill provider resolves ${name}; use team_skill_catalog`)));
          modules.set(name, Buffer.byteLength(resolved.content, "utf8"));
        }
        const moduleBytes = (name) => {
          const bytes = modules.get(name);
          if (bytes === void 0)
            throw new Error(`missing resolved skill ${name}`);
          return bytes;
        };
        if (limits !== void 0 && plan.members.some((member) => member.skills.reduce((bytes, name) => bytes + moduleBytes(name), 0) > limits.skillBytes)) {
          throw new Error("project skill selection exceeds the configured instruction byte budget; choose smaller stage-specific modules");
        }
      } catch (error) {
        throw new RemoteError("TEAM_GOAL_INVALID", error instanceof Error ? error.message : String(error), { fields: ["plan"] });
      }
    }
    return await this.journal.transact(root.id, async () => {
      signal.throwIfAborted();
      this.lifecycle.signal.throwIfAborted();
      this.requireLead(caller);
      const state = this.journal.state(root);
      if (request.expectedProposalRevision !== (state.goalProposal?.revision ?? 0) || request.expectedGoalRevision !== (state.goal?.revision ?? 0)) {
        throw this.stale(root);
      }
      const revision3 = request.expectedProposalRevision + 1;
      if (!Number.isSafeInteger(revision3) || revision3 < 1)
        throw new RemoteError("TEAM_GOAL_REVISION_LIMIT", "goal proposal revision limit reached", {});
      const proposal = { revision: revision3, baseRevision: request.expectedGoalRevision, proposedBy: caller.id, change: parsed.data };
      assertGoalProposal(state, proposal);
      await this.journal.appendAndFlush(root, "team/goal-proposed", { version: 2, teamId: TeamId(root.id), proposal });
      return structuredClone(proposal);
    });
  }
  /**
   * Ask the human to review one exact persisted proposal; missing answers never grant authority.
   * @param caller - Exact live Lead; children must relay questions to it.
   * @param proposalRevision - Proposal currently displayed for review.
   * @param signal - Caller cancellation, including cancellation while waiting for an answer.
   * @returns committed review state, or a stale-review error without changing the goal.
   */
  async review(caller, proposalRevision, signal) {
    const root = this.requireLead(caller);
    if (this.reviewing.has(root))
      throw new RemoteError("TEAM_GOAL_REVIEW_PENDING", "a goal review is already awaiting the user", {});
    const questions = this.ctx.get("userQuestions");
    if (questions === void 0)
      throw new RemoteError("TEAM_GOAL_NO_REVIEWER", "a user question provider is required to confirm this goal", {});
    const proposal = this.reviewable(root, proposalRevision);
    const approve = proposal.change.kind === "replace" ? "Confirm this goal and scope" : "Revoke this goal";
    const questionId = `team-goal-${proposal.revision}`;
    this.reviewing.add(root);
    try {
      const combined = AbortSignal.any([signal, this.lifecycle.signal]);
      const answer = await questions.ask({
        agent: caller,
        signal: combined,
        questions: [{
          id: questionId,
          question: "Review the Team goal, named targets, actions, and acceptance criteria.",
          detail: renderGoalReview(proposal, this.journal.state(root).goal),
          options: [{ label: approve }, { label: "Request changes" }],
          intent: { kind: "plan-review", approve }
        }]
      }).catch((error) => {
        if (error instanceof UserQuestionError && error.code === "NO_PROVIDER") {
          throw new RemoteError("TEAM_GOAL_NO_REVIEWER", "no human question answerer is available", {}, { cause: error });
        }
        throw error;
      });
      const matching = answer.answers.filter((item) => item.id === questionId);
      const selected = matching.length === 1 ? matching[0] : void 0;
      const accepted = selected?.selected.length === 1 && selected.selected[0] === approve && !selected.custom?.trim();
      await this.journal.transact(root.id, async () => {
        combined.throwIfAborted();
        this.requireLead(caller);
        this.reviewable(root, proposalRevision);
        const decision = {
          proposalRevision,
          outcome: accepted ? "accepted" : "rejected",
          comment: selected?.custom ?? "",
          decidedAt: Date.now(),
          channel: "user-question"
        };
        applyGoalDecision(this.journal.state(root), decision);
        this.epoch(root);
        try {
          await this.journal.appendAndFlush(root, "team/goal-decided", { version: 2, teamId: TeamId(root.id), decision });
        } finally {
          this.epoch(root);
        }
      });
      return this.read(caller);
    } finally {
      this.reviewing.delete(root);
    }
  }
  /**
   * Check current Team execution admission without interpreting target strings as a sandbox.
   * @param root - Exact live Team Lead.
   * @returns a denial reason, or undefined when execution can proceed.
   */
  denial(root) {
    const goal = this.journal.state(root).goal;
    if (goal?.status === "revoked")
      return `Team goal revision ${goal.revision} was revoked by the user; request a new user review.`;
    if (goal === void 0 && this.requireConfirmed) {
      return 'Team delegation requires a user-confirmed goal and scope. Lead: call team_help({topic:"start"}), then team_goal({action:"read"}); submit the complete proposal with action "submit" to open user confirmation.';
    }
    return void 0;
  }
  /**
   * Capture cancellation for operations admitted under the current goal revision.
   * @param root - Exact live Team Lead.
   * @param signal - Caller-owned cancellation signal.
   * @returns a signal aborted by caller, plugin disposal, or an accepted goal change.
   */
  admit(root, signal) {
    const denied = this.denial(root);
    if (denied !== void 0)
      throw new TeamError(denied, "TEAM_GOAL_NOT_ACTIVE");
    return this.capture(root, signal);
  }
  /**
   * Bind cancellation to a revision without granting execution admission.
   * @param root - Exact live Team Lead.
   * @param signal - Caller-owned cancellation.
   * @returns cancellation for this revision, including Lead work before a first confirmation.
   */
  capture(root, signal) {
    return AbortSignal.any([signal, this.lifecycle.signal, this.epoch(root).controller.signal]);
  }
  /** Exact Lead identity cannot be replaced with an object carrying the same id. */
  requireLead(caller) {
    const membership = this.roster.membership(caller);
    if (membership.role !== "lead")
      throw new TeamError("only the Team Lead may propose or request a goal review", "TEAM_LEAD_REQUIRED");
    return membership.root;
  }
  /** A response applies only to the proposal and goal the user actually saw. */
  reviewable(root, revision3) {
    const state = this.journal.state(root);
    const proposal = state.goalProposal;
    if (proposal === void 0 || proposal.revision !== revision3 || proposal.baseRevision !== (state.goal?.revision ?? 0) || state.goalDecision?.proposalRevision === revision3) {
      throw this.stale(root);
    }
    return structuredClone(proposal);
  }
  /** Report the revisions the editor must show before requesting another review. */
  stale(root) {
    const state = this.journal.state(root);
    return new RemoteError("TEAM_GOAL_STALE", "goal or proposal changed; review the latest values", {
      goalRevision: state.goal?.revision ?? 0,
      proposalRevision: state.goalProposal?.revision ?? 0
    });
  }
  /** Rotate cancellation once per accepted revision while keeping durable inboxes. */
  epoch(root) {
    const revision3 = this.journal.state(root).goal?.revision ?? 0;
    const prior = this.epochs.get(root);
    if (prior?.revision === revision3)
      return prior;
    const epoch = { revision: revision3, controller: new AbortController() };
    this.epochs.set(root, epoch);
    if (prior !== void 0) {
      const reason = `Team goal changed from revision ${prior.revision} to ${revision3}`;
      prior.controller.abort(new TeamError(reason, "TEAM_GOAL_CHANGED"));
      for (const member of this.journal.state(root).members) {
        this.ctx.agents.get(member.id)?.cancel({ kind: "hook", reason }, { keepInbox: true });
      }
    }
    return epoch;
  }
};

// packages/team/modules/runtime/lib/types/lifecycle.js
var TeamRuntimeLifecycle = class {
  disposalTimeoutMs;
  controller = new AbortController();
  /**
   * @param disposalTimeoutMs - maximum wait for one disposal settlement operation.
   */
  constructor(disposalTimeoutMs) {
    this.disposalTimeoutMs = disposalTimeoutMs;
  }
  /** Signal aborted exactly when Team runtime admission closes. */
  get signal() {
    return this.controller.signal;
  }
  /** Whether Team runtime admission is closed. */
  get disposed() {
    return this.signal.aborted;
  }
  /** The exact cancellation reason used to distinguish expected disposal rejection. */
  get reason() {
    const reason = this.signal.reason;
    return reason;
  }
  /** Whether a rejection is the runtime cancellation, directly or through an Error cause chain. */
  isCancellation(reason) {
    const seen = /* @__PURE__ */ new Set();
    let current = reason;
    while (!seen.has(current)) {
      if (this.disposed && current === this.reason)
        return true;
      if (this.disposed && current instanceof TeamError && current.code === "TEAM_DISPOSED")
        return true;
      if (!(current instanceof Error))
        return false;
      seen.add(current);
      current = current.cause;
    }
    return false;
  }
  /** Close Team runtime admission and cancel admitted interruptible work. */
  close() {
    this.controller.abort(new TeamError("Agent Teams service disposed", "TEAM_DISPOSED"));
  }
  /**
   * Await admitted operations and retain failures other than runtime cancellation.
   * @param operations - admitted operations captured after the admission cutoff.
   * @param failures - aggregate destination for unexpected rejection or timeout.
   */
  async settle(operations, failures) {
    if (operations.length === 0)
      return;
    try {
      const outcomes = await this.withTimeout(Promise.allSettled(operations));
      for (const outcome of outcomes) {
        if (outcome.status === "rejected" && !this.isCancellation(outcome.reason))
          failures.push(outcome.reason);
      }
    } catch (error) {
      failures.push(error);
    }
  }
  /**
   * Bound one runtime settlement operation.
   * @param operation - settlement that may otherwise block HMR or process shutdown.
   * @returns the operation result.
   */
  async withTimeout(operation) {
    let timer;
    const timeout = new Promise((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(new TeamError(`Agent Teams runtime disposal exceeded ${this.disposalTimeoutMs}ms`, "TEAM_DISPOSAL_TIMEOUT"));
      }, this.disposalTimeoutMs);
    });
    try {
      return await Promise.race([operation, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }
};

// packages/team/modules/runtime/lib/types/mailbox.js
import { randomUUID as randomUUID3 } from "node:crypto";
import { brandString as brandString6 } from "@deepseek-ai/dsh-brand";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import { SubagentError } from "@deepseek-ai/dsh-subagent";
import { steerHostSubagentPrompt } from "dsh-team-workbench/compat-subagent/internal";

// packages/team/modules/runtime/lib/types/roster.js
import { randomUUID as randomUUID2 } from "node:crypto";
import { addAbortListener } from "node:events";
import { brandString as brandString3 } from "@deepseek-ai/dsh-brand";
import { ReasoningEffortId as ReasoningEffortId2 } from "@deepseek-ai/dsh-llm";
import { foldSubagentDescriptor, parentAgentOptionsForDelegation } from "@deepseek-ai/dsh-subagent";

// packages/team/modules/runtime/lib/types/session-message.js
function pendingInboxMessages(events) {
  const inbox = { "next-turn": [], "next-step": [] };
  for (const event of events) {
    if (event.type !== "agent/inbox/spliced")
      continue;
    const pending = inbox[event.data.target];
    pending.splice(event.data.start, event.data.removedCount ?? 0, ...event.data.inserted);
  }
  return [...inbox["next-turn"], ...inbox["next-step"]];
}
function messageAccepted(events, predicate) {
  return events.some((event) => event.type === "user/message" && predicate(event.data)) || pendingInboxMessages(events).some(predicate);
}

// packages/team/modules/runtime/lib/types/skill-state.js
import { z as z5 } from "zod";
import { brandString as brandString2 } from "@deepseek-ai/dsh-brand";
var id = z5.string().min(1).transform((value) => brandString2(value));
var revision2 = z5.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
var teamSelectedSkillSchema = z5.object({
  name: z5.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  digest: z5.string().regex(/^[a-f0-9]{64}$/u),
  purpose: z5.string().trim().min(1),
  content: z5.string().min(1).refine((value) => !value.includes("\r"), "skill content must use LF line endings")
}).strict();
var teamSkillSelectionSchema = z5.object({
  memberId: id,
  selectedBy: id,
  revision: revision2.min(1),
  goalRevision: revision2,
  skills: z5.array(teamSelectedSkillSchema).refine((skills) => new Set(skills.map((skill) => skill.name)).size === skills.length, "selected skill names must be unique")
}).strict();
var teamSkillSelectionViewSchema = z5.object({
  memberId: id,
  revision: revision2,
  goalRevision: revision2,
  active: z5.boolean(),
  skills: z5.array(z5.object({ name: z5.string(), digest: z5.string(), purpose: z5.string(), bytes: revision2 }).strict())
}).strict();
function assertTeamSkillSelection(state, selection) {
  const target = state.members.find((member) => member.id === selection.memberId);
  const previous = state.skillSelections?.find((value) => value.memberId === selection.memberId);
  const initial = target?.phase === "provisioning" && previous === void 0 && selection.revision === 1;
  if (String(selection.memberId) !== state.id && target?.phase !== "active" && !initial) {
    throw new Error("skill target must be active or receiving its initial provisioning choice");
  }
  if (String(selection.selectedBy) !== state.id) {
    if (!state.members.some((member) => member.id === selection.selectedBy && member.phase === "active")) {
      throw new Error("skill selector is not an active Team member");
    }
    if (selection.selectedBy !== selection.memberId && selection.selectedBy !== target?.parentId) {
      throw new Error("only the member, its direct parent, or Lead may select its skills");
    }
  }
  if (selection.revision !== (previous?.revision ?? 0) + 1)
    throw new Error("skill selection revision is not contiguous");
  if (state.goal?.status === "revoked" || selection.goalRevision !== (state.goal?.revision ?? 0)) {
    throw new Error("skill selection does not belong to the current active goal");
  }
}
function teamSkillSelectionView(state, selection) {
  return {
    memberId: selection.memberId,
    revision: selection.revision,
    goalRevision: selection.goalRevision,
    active: state.goal?.status !== "revoked" && selection.goalRevision === (state.goal?.revision ?? 0),
    skills: selection.skills.map((skill) => ({
      name: skill.name,
      digest: skill.digest,
      purpose: skill.purpose,
      bytes: new TextEncoder().encode(skill.content).length
    }))
  };
}

// packages/team/modules/runtime/lib/types/roster.js
var MEMBER_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
function resolveActiveMember(root, state, rawName) {
  const name = rawName.trim();
  if (name === "lead")
    return { id: root.id, name };
  const member = state.members.find((candidate) => candidate.name === name);
  if (member === void 0 || member.phase !== "active") {
    throw new TeamError(`active teammate "${name}" not found`, "TEAM_MEMBER_NOT_FOUND");
  }
  return { id: member.id, name };
}
var TeamRoster = class {
  ctx;
  journal;
  lifecycle;
  maxMembers;
  maxDepth;
  enabledPresets;
  prepareSkills;
  copySkills;
  workspaceRuntime;
  defaultMemberReasoningEffort;
  resolveSpawn;
  inFlightCreations = /* @__PURE__ */ new Set();
  expertCreations = /* @__PURE__ */ new WeakMap();
  /** A fresh member can enter its first tool before its creator checkpoints the active roster edge. */
  memberPublications = /* @__PURE__ */ new Map();
  retiring = /* @__PURE__ */ new Set();
  integrations = /* @__PURE__ */ new Map();
  /**
   * @param ctx - Team service context with Agent, Session, persistence, and subagent services.
   * @param journal - authoritative Lead-log transaction owner.
   * @param lifecycle - shared Team runtime admission cutoff.
   * @param maxMembers - maximum immutable roster entries per Team.
   * @param maxDepth - maximum delegation depth below the Team Lead.
   * @param enabledPresets - root preset ids allowed to use Teams, or '*' for every preset.
   * @param prepareSkills - Resolve and validate a new member's selected instruction versions.
   * @param copySkills - Reuse one predecessor's saved instruction bytes for a successor.
   */
  constructor(ctx, journal, lifecycle, maxMembers, maxDepth, enabledPresets, prepareSkills, copySkills, workspaceRuntime, defaultMemberReasoningEffort = "inherit", resolveSpawn) {
    this.ctx = ctx;
    this.journal = journal;
    this.lifecycle = lifecycle;
    this.maxMembers = maxMembers;
    this.maxDepth = maxDepth;
    this.enabledPresets = enabledPresets;
    this.prepareSkills = prepareSkills;
    this.copySkills = copySkills;
    this.workspaceRuntime = workspaceRuntime;
    this.defaultMemberReasoningEffort = defaultMemberReasoningEffort;
    this.resolveSpawn = resolveSpawn;
  }
  /**
   * Reinstall a rostered member's process-local caps before a cold activation.
   * @param root - exact Team Lead whose log owns the member.
   * @param memberId - target or ancestor member to resume.
   */
  restoreWorkspaceCap(root, memberId) {
    if (this.workspaceRuntime === void 0)
      return;
    const member = this.journal.state(root).members.find((candidate) => candidate.id === memberId);
    if (member === void 0 || member.phase === "failed" || member.workspace === void 0) {
      throw new TeamError("legacy Team member has no private workspace; preserve its history and create an isolated successor", "TEAM_MEMBER_NOT_READY");
    }
    this.workspaceRuntime.restore(memberId, member.workspace);
  }
  /** Release execution caps after Team disposal has drained child activations. */
  releaseWorkspaceCaps() {
    this.workspaceRuntime?.dispose();
  }
  /**
   * Hold a member's next step until its private-copy integration finishes.
   * @param agent - Member whose next step must wait.
   * @param signal - Cancellation while integration is pending.
   */
  async waitForIntegration(agent, signal) {
    const pending = this.integrations.get(agent.id);
    if (pending === void 0)
      return;
    const cancelled = Promise.withResolvers();
    const subscription = addAbortListener(signal, () => {
      cancelled.reject(signal.reason);
    });
    try {
      await Promise.race([pending, cancelled.promise]);
      signal.throwIfAborted();
    } finally {
      subscription[Symbol.dispose]();
    }
  }
  /**
   * Integrate one inactive member while preventing its next step from entering.
   * @param root - Exact Team Lead owning the shared workspace.
   * @param memberId - Member whose private changes are published.
   * @param signal - Cancellation before or during publication.
   * @param admitPath - Optional check applied to each changed path.
   * @param publication - Exact independently accepted artifact receipts.
   * @returns the recorded integration receipt.
   */
  async integrateWorkspace(root, memberId, signal, admitPath, publication) {
    return this.withInactiveWorkspace(root, memberId, signal, (runtime, workspace) => runtime.integrate(root, workspace, signal, admitPath, publication));
  }
  /**
   * Refresh a retained member's inputs while its next model step is held.
   * @param root - Exact owning Lead.
   * @param memberId - Inactive target member.
   * @param paths - Explicit existing relative input files.
   * @param signal - Goal and caller cancellation.
   * @returns refreshed file paths.
   */
  async refreshWorkspace(root, memberId, paths, signal) {
    return this.withInactiveWorkspace(root, memberId, signal, async (runtime, workspace) => ({ paths: await runtime.refresh(root, workspace, paths, signal) }));
  }
  async withInactiveWorkspace(root, memberId, signal, operation) {
    if (this.workspaceRuntime === void 0)
      throw new TeamError("Team member workspace isolation is disabled", "TEAM_INVALID_ARGUMENT");
    const pending = this.integrations.get(memberId);
    if (pending !== void 0) {
      await pending;
      return await this.withInactiveWorkspace(root, memberId, signal, operation);
    }
    const released = Promise.withResolvers();
    this.integrations.set(memberId, released.promise);
    try {
      signal.throwIfAborted();
      const member = this.journal.state(root).members.find((candidate) => candidate.id === memberId);
      if (member?.phase !== "active" || member.workspace === void 0 || availability(this.ctx.agents.get(memberId)) === "running") {
        throw new TeamError("only an inactive isolated teammate can integrate. Read list_agents and team_workspace get; wait for its current turn to finish before publishing. Do not restart its task or retire it to bypass this check.", "TEAM_MEMBER_NOT_READY");
      }
      return await operation(this.workspaceRuntime, member.workspace);
    } finally {
      this.integrations.delete(memberId);
      released.resolve();
    }
  }
  /**
   * Whether one roster child is retired or is crossing the retirement cutoff.
   * @param root - Exact Team Lead.
   * @param memberId - Member being checked.
   * @returns whether retirement blocks new work.
   */
  isRetiredOrRetiring(root, memberId) {
    return this.retiring.has(memberId) || this.journal.state(root).members.find((member) => member.id === memberId)?.phase === "retired";
  }
  /**
   * Deny direct Agent/LLM/tool entry for a retired Team child, including a cold-created Agent.
   * @param agent - Child attempting to run.
   * @returns denial reason, or undefined when the child may run.
   */
  retirementDenial(agent) {
    for (const root of this.ctx.agents.list()) {
      const state = this.journal.state(root);
      const member = state.members.find((candidate) => candidate.id === agent.id);
      if (member === void 0 || agent.session.header.parentSession !== (member.parentId ?? root.id))
        continue;
      let current = member;
      while (current !== void 0) {
        if (this.isRetiredOrRetiring(root, current.id))
          return `Team member "${current.name}" is retired`;
        if (this.workspaceRuntime !== void 0 && current.workspace === void 0) {
          return `Team member "${current.name}" uses a legacy shared workspace and cannot run under workspace isolation`;
        }
        current = state.members.find((candidate) => candidate.id === current?.parentId);
      }
      return void 0;
    }
    return void 0;
  }
  /** Resolve enablement from the root's live composition, including a blank-session preset change. */
  enabledMembership(membership) {
    if (this.enabledPresets.includes("*"))
      return membership;
    const { root } = membership;
    const preset = root.ctx.get("agentPresets")?.composedPreset(root.ctx) ?? root.session.header.agentPreset;
    return preset !== void 0 && this.enabledPresets.includes(preset) ? membership : void 0;
  }
  /**
   * Resolve one exact live Agent's Team role.
   * @param agent - exact live Agent used as the authority credential.
   * @returns its root, Team identity, role, and model-facing name.
   */
  membership(agent) {
    const membership = this.tryMembership(agent);
    if (membership === void 0) {
      throw new TeamError(`agent "${agent.id}" is not a member of an active Agent Team`, "TEAM_NOT_MEMBER");
    }
    return membership;
  }
  /**
   * Resolve a caller without throwing for scoped installation and lifecycle observers.
   * @param agent - candidate exact live Agent.
   * @returns Team membership, or undefined for non-Team subagents and stale identities.
   */
  tryMembership(agent) {
    if (this.ctx.agents.get(agent.id) !== agent)
      return void 0;
    try {
      if (agent.session.header.isSeeded && agent.session.header.origin !== "subagent" && !this.subagentDescriptor(agent)) {
        return this.enabledMembership({ root: agent, id: TeamId(agent.id), role: "lead", name: "lead" });
      }
      let parentId = agent.session.header.parentSession;
      const seen = /* @__PURE__ */ new Set([agent.id]);
      while (parentId !== void 0 && !seen.has(parentId)) {
        seen.add(parentId);
        const root = this.ctx.agents.get(parentId);
        if (root !== void 0) {
          const member = this.journal.state(root).members.find((candidate) => candidate.id === agent.id);
          if (member?.phase === "active" || member?.phase === "provisioning") {
            if ((member.parentId ?? root.id) !== agent.session.header.parentSession)
              return void 0;
            return this.enabledMembership({ root, id: TeamId(root.id), role: "teammate", name: member.name });
          }
          parentId = root.session.header.parentSession;
        } else {
          break;
        }
      }
      if (this.subagentDescriptor(agent))
        return void 0;
      return this.enabledMembership({ root: agent, id: TeamId(agent.id), role: "lead", name: "lead" });
    } catch {
      return void 0;
    }
  }
  /**
   * Resolve the Team whose goal governs a member or an ordinary delegated descendant.
   * @param agent - Exact live caller, including legacy subagents.
   * @returns the ancestor membership without enrolling the descendant in its roster.
   */
  governingMembership(agent) {
    if (this.ctx.agents.get(agent.id) !== agent)
      return void 0;
    let current = agent;
    const seen = /* @__PURE__ */ new Set();
    while (current !== void 0 && !seen.has(current.id)) {
      seen.add(current.id);
      const membership = this.tryMembership(current);
      if (membership !== void 0)
        return membership;
      const parentId = current.session.header.parentSession;
      current = parentId === void 0 ? void 0 : this.ctx.agents.get(parentId);
    }
    return void 0;
  }
  /**
   * List the runtime-enriched roster visible to one Team member.
   * @param membership - exact caller membership resolved by this roster.
   * @returns Lead and teammate rows in creation order.
   */
  list(membership) {
    const { root } = membership;
    const state = this.journal.state(root);
    const result = [{
      id: root.id,
      name: "lead",
      role: "lead",
      status: availability(root),
      ...root.options.model === void 0 ? {} : { model: root.options.model },
      diagnostics: []
    }];
    for (const member of state.members) {
      const live = this.ctx.agents.get(member.id);
      const teamFunction = memberFunction(state, member);
      const route = state.modelRoutes?.find((candidate) => candidate.memberId === member.id);
      const model = route?.model ?? live?.options.model ?? member.model ?? root.options.model;
      const parentName = member.parentId === void 0 || member.parentId === root.id ? "lead" : state.members.find((parent) => parent.id === member.parentId)?.name;
      result.push({
        id: member.id,
        name: member.name,
        role: "teammate",
        ...teamFunction === void 0 ? {} : { teamFunction },
        ...memberRoleRevision(state, member.id) === 0 ? {} : { roleRevision: memberRoleRevision(state, member.id) },
        status: member.phase === "retired" ? "retired" : member.phase === "failed" ? "failed" : member.phase === "provisioning" ? "provisioning" : availability(live),
        description: member.description,
        provider: member.provider,
        context: member.context,
        parentId: member.parentId ?? root.id,
        ...parentName === void 0 ? {} : { parentName },
        ...model === void 0 ? {} : { model },
        ...(route?.modelProvider ?? member.modelProvider) === void 0 ? {} : { modelProvider: route?.modelProvider ?? member.modelProvider },
        ...(route?.reasoningEffort ?? (route === void 0 ? member.reasoningEffort : void 0)) === void 0 ? {} : { reasoningEffort: route?.reasoningEffort ?? member.reasoningEffort },
        ...route === void 0 ? {} : { modelRouteRevision: route.revision },
        ...member.persona === void 0 ? {} : { persona: member.persona },
        ...member.expert === void 0 ? {} : { expert: { ...member.expert } },
        diagnostics: [
          ...member.error === void 0 ? [] : [member.error],
          ...this.workspaceRuntime !== void 0 && member.phase === "active" && member.workspace === void 0 ? ["Legacy shared workspace: this member cannot run until an isolated successor is created"] : []
        ]
      });
    }
    return result;
  }
  /**
   * Read an existing member's next-request override from the Lead log.
   * @param agent - Exact live Team member.
   * @returns selected route, or undefined when the creation profile remains in use.
   */
  modelRouteFor(agent) {
    const membership = this.tryMembership(agent);
    if (membership?.role !== "teammate")
      return void 0;
    const route = this.journal.state(membership.root).modelRoutes?.find((candidate) => candidate.memberId === agent.id);
    if (route === void 0)
      return void 0;
    return {
      provider: route.modelProvider,
      model: route.model,
      ...route.reasoningEffort === void 0 ? {} : { reasoningEffort: ReasoningEffortId2(route.reasoningEffort) }
    };
  }
  /**
   * Change the next-request route without replacing an existing member Session.
   * @param caller - Exact live Lead or direct parent.
   * @param request - Existing teammate and registered model selection.
   * @param signal - Cancellation before the durable route is committed.
   * @returns the updated roster row.
   */
  async configureModel(caller, request, signal) {
    if (this.lifecycle.disposed)
      throw new TeamError("Agent Teams service is disposing", "TEAM_DISPOSED");
    const membership = this.membership(caller);
    const root = membership.root;
    const name = request.target.trim();
    const initial = this.journal.state(root).members.find((member) => member.name === name);
    if (initial === void 0 || initial.phase === "failed" || initial.phase === "provisioning") {
      throw new TeamError(`retained teammate "${name}" not found`, "TEAM_MEMBER_NOT_FOUND");
    }
    this.assertMemberLifecycleAuthority(caller, root, initial);
    const expectedRevision = request.expectedRevision ?? this.journal.state(root).modelRoutes?.find((route) => route.memberId === initial.id)?.revision ?? 0;
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
      throw new TeamError("expected model revision must be a nonnegative safe integer", "TEAM_INVALID_ARGUMENT");
    }
    const provider = requiredText(request.modelProvider, "modelProvider", 200);
    const model = requiredText(request.model, "model", 200);
    signal.throwIfAborted();
    let reasoningEffort = request.reasoningEffort;
    if (reasoningEffort === void 0) {
      const info = await caller.ctx.llm.resolveModelInfo(provider, model, signal);
      const rank = ["off", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"];
      reasoningEffort = info.reasoning?.efforts.filter((effort) => rank.includes(effort.id)).sort((left, right) => rank.indexOf(right.id) - rank.indexOf(left.id))[0]?.id ?? info.reasoning?.defaultEffort;
    }
    const selected = await caller.ctx.llm.resolveCallConfig({
      provider,
      model,
      ...reasoningEffort === void 0 ? {} : { reasoningEffort: ReasoningEffortId2(reasoningEffort) }
    }, signal);
    await this.journal.transact(root.id, async () => {
      signal.throwIfAborted();
      const state = this.journal.state(root);
      const member = state.members.find((candidate) => candidate.id === initial.id);
      if (member === void 0 || member.phase === "failed" || member.phase === "provisioning") {
        throw new TeamError("teammate changed before model selection", "TEAM_MEMBER_NOT_READY");
      }
      this.assertMemberLifecycleAuthority(caller, root, member);
      const prior = state.modelRoutes?.find((candidate) => candidate.memberId === member.id);
      if ((prior?.revision ?? 0) !== expectedRevision) {
        throw new TeamError("model selection changed; read list_agents and retry with the current modelRouteRevision", "TEAM_MEMBER_STALE_REVISION");
      }
      if (prior?.modelProvider === selected.provider && prior.model === selected.model && prior.reasoningEffort === selected.reasoningEffort)
        return;
      await this.journal.appendAndFlush(root, "team/member-model-route", {
        version: 2,
        teamId: TeamId(root.id),
        route: {
          ...state.goal === void 0 ? {} : { goalRevision: state.goal.revision },
          memberId: member.id,
          revision: (prior?.revision ?? 0) + 1,
          modelProvider: selected.provider,
          model: selected.model,
          ...selected.reasoningEffort === void 0 ? {} : { reasoningEffort: selected.reasoningEffort }
        }
      });
    });
    const updated = this.list(membership).find((member) => member.id === initial.id);
    if (updated === void 0)
      throw new TeamError("updated teammate is absent from the roster", "TEAM_MEMBER_NOT_FOUND");
    return updated;
  }
  /**
   * Assign an inactive retained member a responsibility without changing its Session or persona.
   * @param caller - Exact live Lead or direct parent.
   * @param request - Expected role revision, responsibility, and recorded reason.
   * @param signal - Cancellation before durable publication.
   * @returns updated retained member.
   */
  async configureRole(caller, request, signal) {
    if (this.lifecycle.disposed)
      throw new TeamError("Agent Teams service is disposing", "TEAM_DISPOSED");
    const membership = this.membership(caller);
    const root = membership.root;
    const parsed = teamMemberFunctionSchema.safeParse(request.teamFunction);
    if (!parsed.success || !Number.isSafeInteger(request.expectedRevision) || request.expectedRevision < 0) {
      throw new TeamError("configure_role requires a supported function and nonnegative expected_revision", "TEAM_INVALID_ARGUMENT");
    }
    const reason = requiredText(request.reason, "reason", 4096);
    await this.journal.transact(root.id, async () => {
      signal.throwIfAborted();
      const state = this.journal.state(root);
      const member2 = state.members.find((candidate) => candidate.name === request.target.trim());
      if (member2 === void 0 || !["active", "retired"].includes(member2.phase)) {
        throw new TeamError("configure_role requires an existing active or retired member", "TEAM_MEMBER_NOT_FOUND");
      }
      this.assertMemberLifecycleAuthority(caller, root, member2);
      if (availability(this.ctx.agents.get(member2.id)) === "running" || state.tasks.some((task) => task.ownerId === member2.id && task.status === "in_progress" && (task.work === void 0 || task.work.plan.goalRevision === (state.goal?.revision ?? 0)) && task.work?.execution?.phase !== "submitted")) {
        throw new TeamError("finish or release the current execution before changing responsibility", "TEAM_MEMBER_NOT_READY");
      }
      const revision3 = memberRoleRevision(state, member2.id);
      if (revision3 !== request.expectedRevision) {
        throw new TeamError(`role revision is ${revision3}; read list_agents before configuring this member`, "TEAM_MEMBER_STALE_REVISION");
      }
      if (memberFunction(state, member2) === parsed.data)
        return;
      await this.journal.appendAndFlush(root, "team/member-role", {
        version: 2,
        teamId: TeamId(root.id),
        role: {
          ...state.goal === void 0 ? {} : { goalRevision: state.goal.revision },
          memberId: member2.id,
          revision: revision3 + 1,
          teamFunction: parsed.data,
          reason
        }
      });
    });
    const member = this.list(membership).find((candidate) => candidate.name === request.target.trim());
    if (member === void 0)
      throw new TeamError("configured member is absent", "TEAM_MEMBER_NOT_FOUND");
    return member;
  }
  /**
   * Create one named, continuable child of the calling Team member.
   * @param caller - exact live Team member.
   * @param request - name, responsibility, prompt, composition, model settings, and cancellation.
   * @returns the active roster row.
   */
  async spawn(caller, request) {
    if (this.lifecycle.disposed)
      throw new TeamError("Agent Teams service is disposing", "TEAM_DISPOSED");
    const operation = this.spawnAdmitted(caller, request);
    this.inFlightCreations.add(operation);
    try {
      return await operation;
    } finally {
      this.inFlightCreations.delete(operation);
    }
  }
  /**
   * Locate the Team-local expert continuation, coalescing concurrent first assignments.
   * @param caller - Exact live Team member.
   * @param request - Expert reference and settings used only for first creation.
   * @returns the current member; an existing binding receives no new prompt.
   */
  async ensureExpert(caller, request) {
    request.signal.throwIfAborted();
    if (this.lifecycle.disposed)
      throw new TeamError("Agent Teams service is disposing", "TEAM_DISPOSED");
    const membership = this.membership(caller);
    let creating = this.expertCreations.get(membership.root);
    const pending = creating?.get(request.expert.id);
    if (pending !== void 0) {
      const cancelled = Promise.withResolvers();
      const listener = addAbortListener(request.signal, () => {
        cancelled.reject(request.signal.reason);
      });
      try {
        const result = await Promise.race([pending, cancelled.promise]);
        request.signal.throwIfAborted();
        return { member: structuredClone(result.member), reused: true };
      } finally {
        listener[Symbol.dispose]();
      }
    }
    const existing = this.list(membership).find((member) => member.expert?.id === request.expert.id && member.status !== "failed");
    if (existing !== void 0)
      return { member: existing, reused: true };
    if (creating === void 0) {
      creating = /* @__PURE__ */ new Map();
      this.expertCreations.set(membership.root, creating);
    }
    const operation = this.spawn(caller, request);
    creating.set(request.expert.id, operation);
    try {
      const result = await operation;
      return { member: result.member, reused: false };
    } finally {
      creating.delete(request.expert.id);
    }
  }
  /**
   * Return admitted creation operations captured for ordered disposal.
   * @returns detached snapshot ordered only by Set insertion.
   */
  pendingCreations() {
    return [...this.inFlightCreations];
  }
  /**
   * Reconcile provisioning state when one Team member Session starts.
   * @param agent - newly started exact live Agent.
   * @param signal - shared runtime cancellation.
   */
  async recoverFor(agent, signal) {
    signal.throwIfAborted();
    const membership = this.tryMembership(agent);
    if (membership?.role === "lead") {
      if (this.workspaceRuntime !== void 0) {
        for (const member of this.journal.state(membership.root).members) {
          if (member.phase === "active" && member.workspace !== void 0)
            this.restoreWorkspaceCap(membership.root, member.id);
        }
      }
      await this.reconcileProvisioning(membership.root, signal);
    }
  }
  /**
   * Retire an idle member while retaining its Session, identity, and private workspace.
   * @param caller - Exact live parent or Team Lead.
   * @param targetName - Durable member name.
   * @param signal - Cancellation before retirement commits.
   * @returns the retired roster row.
   */
  async retire(caller, targetName, signal) {
    const membership = this.membership(caller);
    const root = membership.root;
    const name = targetName.trim();
    const initial = this.journal.state(root).members.find((member) => member.name === name);
    if (initial?.phase !== "active")
      throw new TeamError(`active teammate "${name}" not found`, "TEAM_MEMBER_NOT_FOUND");
    this.assertMemberLifecycleAuthority(caller, root, initial);
    if (this.retiring.has(initial.id))
      throw new TeamError("teammate retirement is already in progress", "TEAM_MEMBER_NOT_READY");
    this.assertRetirable(root, initial);
    this.retiring.add(initial.id);
    try {
      const parent = this.ctx.agents.get(initial.parentId ?? root.id);
      if (this.ctx.agents.get(initial.id) !== void 0) {
        if (parent === void 0)
          throw new TeamError("teammate parent is unavailable", "TEAM_MEMBER_NOT_READY");
        await this.stopTeammates(parent, [initial.id]);
      }
      await this.journal.transact(root.id, async () => {
        signal.throwIfAborted();
        const current = this.journal.state(root).members.find((member) => member.id === initial.id);
        if (current?.phase !== "active")
          throw new TeamError("teammate changed before retirement", "TEAM_MEMBER_NOT_READY");
        this.assertRetirable(root, current);
        await this.journal.appendAndFlush(root, "team/member-retirement", {
          version: 2,
          teamId: TeamId(root.id),
          memberId: current.id,
          retired: true
        });
      });
      const retired = this.list(membership).find((member) => member.id === initial.id);
      if (retired === void 0)
        throw new TeamError("retired teammate is absent from the roster", "TEAM_MEMBER_NOT_FOUND");
      return retired;
    } finally {
      this.retiring.delete(initial.id);
    }
  }
  /**
   * Reactivate one saved member without creating another Session or repeating its first prompt.
   * @param caller - Exact live parent or Team Lead.
   * @param targetName - Retired member name.
   * @param signal - Cancellation before reactivation commits.
   * @returns the active roster row.
   */
  async reactivate(caller, targetName, signal) {
    const membership = this.membership(caller);
    const root = membership.root;
    const name = targetName.trim();
    const initial = this.journal.state(root).members.find((member) => member.name === name);
    if (initial?.phase !== "retired")
      throw new TeamError(`retired teammate "${name}" not found`, "TEAM_MEMBER_NOT_FOUND");
    this.assertMemberLifecycleAuthority(caller, root, initial);
    if (this.workspaceRuntime !== void 0)
      this.restoreWorkspaceCap(root, initial.id);
    await this.journal.transact(root.id, async () => {
      signal.throwIfAborted();
      const state = this.journal.state(root);
      const current = state.members.find((member) => member.id === initial.id);
      if (current?.phase !== "retired")
        throw new TeamError("teammate changed before reactivation", "TEAM_MEMBER_NOT_READY");
      if (state.members.filter((member) => member.phase === "active" || member.phase === "provisioning").length >= this.maxMembers) {
        throw new TeamError(`Team member limit ${this.maxMembers} reached`, "TEAM_MEMBER_LIMIT");
      }
      this.ancestorIds(root, current.id);
      await this.journal.appendAndFlush(root, "team/member-retirement", {
        version: 2,
        teamId: TeamId(root.id),
        memberId: current.id,
        retired: false
      });
    });
    const active = this.list(membership).find((member) => member.id === initial.id);
    if (active === void 0)
      throw new TeamError("reactivated teammate is absent from the roster", "TEAM_MEMBER_NOT_FOUND");
    return active;
  }
  /** Authorize the Lead or the member's direct delegator. */
  assertMemberLifecycleAuthority(caller, root, member) {
    if (caller !== root && caller.id !== (member.parentId ?? root.id)) {
      throw new TeamError("only the Lead or direct parent can change a teammate lifecycle", "TEAM_INVALID_TARGET");
    }
  }
  /** Check every durable and live obligation that prevents retirement. */
  assertRetirable(root, member) {
    const state = this.journal.state(root);
    const tasks = state.tasks.filter((task) => task.ownerId === member.id && task.status === "in_progress");
    const reviews = state.tasks.filter((task) => task.reviewerId === member.id && task.work?.execution?.phase === "submitted" && task.work.plan.goalRevision === (state.goal?.revision ?? 0));
    const messages = state.messages.filter((message) => message.targetId === member.id && !state.delivered.includes(message.id));
    const children = state.members.filter((child) => child.parentId === member.id && (child.phase === "active" || child.phase === "provisioning"));
    const blockers = {
      integrating: this.integrations.has(member.id),
      running: availability(this.ctx.agents.get(member.id)) === "running",
      tasks: tasks.slice(0, 5).map((task) => ({ id: task.id, revision: task.revision })),
      taskCount: tasks.length,
      reviews: reviews.slice(0, 5).map((task) => task.id),
      reviewCount: reviews.length,
      pendingMessageCount: messages.length,
      children: children.slice(0, 5).map((child) => child.name),
      childCount: children.length
    };
    if (blockers.integrating || blockers.running || tasks.length > 0 || reviews.length > 0 || messages.length > 0 || children.length > 0) {
      throw new TeamError(`teammate has active work, messages, or descendants: ${JSON.stringify(blockers)}. Finish or explicitly release/reassign its tasks, complete or reassign submitted reviews, drain its accepted messages, and retire children first. Wait for running work and integration to settle; do not repeat retire unchanged. History is retained.`, "TEAM_MEMBER_NOT_READY");
    }
  }
  /**
   * Interrupt one live teammate turn without clearing its pending inbox.
   * @param caller - exact live Lead Agent.
   * @param targetName - durable teammate name.
   * @returns the target status sampled before cancellation.
   */
  interrupt(caller, targetName) {
    const membership = this.membership(caller);
    if (membership.role !== "lead")
      throw new TeamError("only the Team Lead can interrupt teammates", "TEAM_LEAD_REQUIRED");
    const state = this.journal.state(membership.root);
    const target = resolveActiveMember(membership.root, state, targetName);
    if (target.id === membership.root.id)
      throw new TeamError("the Team Lead cannot interrupt itself", "TEAM_INVALID_TARGET");
    const live = this.ctx.agents.get(target.id);
    if (live === void 0)
      return { previousStatus: "inactive" };
    const previousStatus = availability(live);
    this.ctx.subagents.interrupt(target.id, { kind: "ancestor", agent: caller });
    return { previousStatus };
  }
  /**
   * Group live roster children by direct parent, with descendants drained before ancestors.
   * @returns parents and their resident roster children in teardown order.
   */
  liveChildrenByRoot() {
    const teams = /* @__PURE__ */ new Map();
    for (const lead of this.ctx.agents.list()) {
      for (const member of this.journal.state(lead).members) {
        const agent = this.ctx.agents.get(member.id);
        const parentId = agent?.session.header.parentSession;
        if (parentId === void 0)
          continue;
        const parent = this.ctx.agents.get(parentId);
        if (parent === void 0)
          continue;
        const children = teams.get(parent) ?? [];
        children.push(member.id);
        teams.set(parent, children);
      }
    }
    const ranked = [...teams].map(([parent, children]) => {
      const membership = this.membership(parent);
      const depth = parent === membership.root ? 0 : this.ancestorIds(membership.root, parent.id).length + 1;
      return { parent, children, depth };
    });
    return new Map(ranked.sort((left, right) => right.depth - left.depth).map(({ parent, children }) => [parent, children]));
  }
  /**
   * Release exact teammate Activations through the continuation lifecycle owner.
   * @param root - exact live direct parent authorizing release.
   * @param childIds - selected roster child ids.
   */
  async stopTeammates(root, childIds) {
    await this.lifecycle.withTimeout(this.ctx.subagents.drainChildren(root, childIds));
  }
  /** Perform one creation admitted before the Team runtime disposal cutoff. */
  async spawnAdmitted(caller, request) {
    const membership = this.membership(caller);
    request = this.resolveSpawn?.(caller, request) ?? request;
    const ancestors = caller === membership.root ? [] : [...this.ancestorIds(membership.root, caller.id), caller.id];
    if (ancestors.length >= this.maxDepth) {
      throw new TeamError(`Team delegation depth cannot exceed ${this.maxDepth}`, "TEAM_DEPTH_LIMIT");
    }
    const signal = AbortSignal.any([request.signal, this.lifecycle.signal]);
    signal.throwIfAborted();
    await this.awaitCallerPublication(caller, membership, signal);
    const root = membership.root;
    const name = this.memberName(request.name);
    const description = requiredText(request.description, "description", 200);
    if (request.persona !== void 0 && request.persona.trim().length === 0) {
      throw new TeamError("member persona must be non-empty when supplied", "TEAM_INVALID_PERSONA");
    }
    const agentOptions = await this.resolveMemberOptions(caller, request.agentOptions, signal);
    signal.throwIfAborted();
    const childId = brandString3(randomUUID2());
    if (request.skills !== void 0 && request.inheritSkillsFrom !== void 0) {
      throw new TeamError("select new skills or inherit a saved choice, not both", "TEAM_SKILLS_INVALID");
    }
    const initialSkills = request.inheritSkillsFrom !== void 0 ? this.copySkills(caller, request.inheritSkillsFrom, childId) : request.skills === void 0 ? void 0 : await this.prepareSkills(caller, childId, request.skills, signal);
    if (this.workspaceRuntime !== void 0 && request.workspaceMode !== "empty") {
      await this.workspaceRuntime.validateSelection(root, this.journal.state(root).goal?.definition.scope.execution, request.workingPaths, signal);
    }
    const member = {
      id: childId,
      parentId: caller.id,
      name,
      description,
      provider: requiredText(request.provider, "provider", 200),
      context: request.context,
      phase: "provisioning",
      ...request.teamFunction === void 0 ? {} : { teamFunction: request.teamFunction },
      ...agentOptions?.provider === void 0 ? {} : { modelProvider: agentOptions.provider },
      ...agentOptions?.model === void 0 ? {} : { model: agentOptions.model },
      ...agentOptions?.reasoningEffort === void 0 ? {} : { reasoningEffort: agentOptions.reasoningEffort },
      ...request.persona === void 0 ? {} : { persona: request.persona },
      ...request.expert === void 0 ? {} : { expert: { ...request.expert } }
    };
    await this.reserveMember(caller, root, member, initialSkills, signal, request);
    const publication = Promise.withResolvers();
    this.memberPublications.set(childId, publication.promise);
    try {
      return await this.activateMember(caller, root, member, request, agentOptions, signal, publication.resolve);
    } finally {
      publication.resolve();
      this.memberPublications.delete(childId);
    }
  }
  /** Persist the roster and initial choice before the continuation can accept work. */
  async reserveMember(caller, root, member, skills, signal, request) {
    const admission = { owned: false };
    try {
      await this.journal.transact(root.id, async () => {
        signal.throwIfAborted();
        if (this.membership(caller).root !== root)
          throw new TeamError("caller changed Teams during member preparation", "TEAM_NOT_MEMBER");
        const state = this.journal.state(root);
        this.resolveSpawn?.(caller, request);
        if (member.expert !== void 0 && state.members.some((candidate) => candidate.expert?.id === member.expert?.id && candidate.phase !== "failed")) {
          throw new TeamError("this expert already has a member in the Team", "TEAM_EXPERT_ALREADY_ASSIGNED");
        }
        const previous = state.members.find((candidate) => candidate.name === member.name);
        if (previous !== void 0) {
          throw new TeamError(previous.phase === "failed" ? `teammate name "${member.name}" belongs to a failed creation and remains reserved; choose a new name to retry` : `teammate name "${member.name}" was already used in this Team; reuse it with send_message or choose a new name`, "TEAM_MEMBER_NAME_TAKEN");
        }
        if (state.members.filter((candidate) => candidate.phase === "active" || candidate.phase === "provisioning").length >= this.maxMembers) {
          throw new TeamError(`Team member limit ${this.maxMembers} reached`, "TEAM_MEMBER_LIMIT");
        }
        if (skills !== void 0)
          assertTeamSkillSelection({ ...state, members: [...state.members, member] }, skills);
        signal.throwIfAborted();
        admission.owned = true;
        await this.journal.appendAndFlush(root, "team/member", { version: 2, teamId: TeamId(root.id), member });
        if (skills !== void 0) {
          signal.throwIfAborted();
          await this.journal.appendAndFlush(root, "team/skills-selected", { version: 2, teamId: TeamId(root.id), selection: skills });
        }
      });
    } catch (error) {
      try {
        if (admission.owned && this.journal.state(root).members.find((candidate) => candidate.id === member.id)?.phase === "provisioning") {
          await this.settleProvisioning(root, { ...member, phase: "failed", error: errorMessage(error) });
        }
      } catch (recordError) {
        throw new AggregateError([error, recordError], "member preparation and durable failure recording both failed");
      }
      throw error instanceof Error ? error : new TeamError(`Team member creation cancelled: ${errorMessage(error)}`, "TEAM_CREATION_CANCELLED", { cause: error });
    }
  }
  /** A descendant requires its direct parent's committed active roster edge. */
  async awaitCallerPublication(caller, membership, signal) {
    if (membership.role === "lead")
      return;
    const pending = this.memberPublications.get(caller.id);
    if (pending !== void 0) {
      const cancelled = Promise.withResolvers();
      const subscription = addAbortListener(signal, () => {
        cancelled.reject(signal.reason);
      });
      try {
        await Promise.race([pending, cancelled.promise]);
        signal.throwIfAborted();
      } finally {
        subscription[Symbol.dispose]();
      }
    }
    if (this.journal.state(membership.root).members.find((member) => member.id === caller.id)?.phase !== "active") {
      throw new TeamError("the delegating member has not completed Team registration", "TEAM_MEMBER_NOT_READY");
    }
  }
  /** Establish the child and publish its active edge before releasing nested creation. */
  async activateMember(caller, root, member, request, agentOptions, signal, publish) {
    const { id: childId, name, description } = member;
    let preparedMember = member;
    let started;
    try {
      if (this.workspaceRuntime !== void 0) {
        const execution = this.journal.state(root).goal?.definition.scope.execution;
        const workspace = await this.workspaceRuntime.create(root, caller, childId, signal, execution, request.workingPaths, request.workspaceMode === "empty");
        preparedMember = { ...member, workspace };
        await this.journal.transact(root.id, async () => {
          signal.throwIfAborted();
          const current = this.journal.state(root).members.find((candidate) => candidate.id === childId);
          if (current?.phase !== "provisioning") {
            throw new TeamError("Team member provisioning changed before workspace preparation", "TEAM_PROVISIONING_CONFLICT");
          }
          await this.journal.appendAndFlush(root, "team/member", {
            version: 2,
            teamId: TeamId(root.id),
            member: preparedMember
          });
        });
      }
      started = await this.ctx.subagents.startActivation({
        delivery: "caller",
        ...preparedMember.workspace === void 0 ? {} : { workspaceCwd: preparedMember.workspace.cwd },
        childId,
        provider: request.provider,
        label: description,
        request: {
          prompt: request.prompt,
          parent: caller,
          ...preparedMember.workspace === void 0 ? {} : { cwd: preparedMember.workspace.cwd },
          ...agentOptions === void 0 ? {} : { agentOptions }
        },
        signal
      });
      void started.result.catch((error) => {
        this.ctx.logger.warn(`Team activation failed: ${errorMessage(error)}`);
      });
      await this.checkpointInitialPrompt(childId, started.messageId, signal);
    } catch (error) {
      publish();
      const failed = {
        ...preparedMember,
        phase: "failed",
        error: errorMessage(error)
      };
      try {
        const phase = await this.settleProvisioning(root, failed);
        await this.stopTeammates(caller, [childId]);
        if (phase === "active") {
          throw new TeamError(`teammate "${name}" became active while its creator reported failure`, "TEAM_PROVISIONING_CONFLICT", { cause: error });
        }
      } catch (recordError) {
        throw new AggregateError([error, recordError], "teammate creation and durable failure recording both failed");
      }
      throw error instanceof Error ? error : new TeamError(`Team member creation cancelled: ${errorMessage(error)}`, "TEAM_CREATION_CANCELLED", { cause: error });
    }
    const active = {
      ...preparedMember,
      phase: "active"
    };
    const settledPhase = await this.settleProvisioning(root, active);
    publish();
    if (settledPhase === "failed") {
      const conflict = new TeamError(`teammate "${name}" was reconciled as failed while creation was in progress`, "TEAM_PROVISIONING_CONFLICT");
      try {
        await this.stopTeammates(caller, [childId]);
      } catch (cleanupError) {
        throw new AggregateError([conflict, cleanupError], "provisioning conflict cleanup failed");
      }
      throw conflict;
    }
    return { member: this.memberView(active) };
  }
  /** Flush the accepted initial inbox item before the Lead can commit `active`. */
  async checkpointInitialPrompt(childId, messageId, signal) {
    while (true) {
      signal.throwIfAborted();
      const session = this.ctx.sessions.get(childId);
      if (session === void 0) {
        const stored = await readPersistedSession(this.ctx.sessionPersistence, childId, signal);
        const suffix = stored.events.slice(stored.inheritedEventCount);
        if (messageAccepted(suffix, (message) => message.id === messageId))
          return;
        throw new TeamError(`teammate "${childId}" initial prompt was not durably accepted`, "TEAM_PROVISIONING_CONFLICT");
      }
      const progress = Promise.withResolvers();
      void progress.promise.catch(() => void 0);
      const stopEvent = this.ctx.on("session/event", (candidate) => {
        if (candidate === session)
          progress.resolve();
      });
      const stopDisposed = this.ctx.on("session/disposed", (candidate) => {
        if (candidate === session)
          progress.resolve();
      });
      const onAbort = () => {
        const reason = signal.reason;
        progress.reject(reason instanceof Error ? reason : new TeamError(`teammate creation aborted: ${errorMessage(reason)}`, "TEAM_DISPOSED"));
      };
      signal.addEventListener("abort", onAbort, { once: true });
      try {
        signal.throwIfAborted();
        await this.ctx.sessions.flush(session);
        const suffix = session.snapshotEvents(session.inheritedEventCount);
        if (messageAccepted(suffix, (message) => message.id === messageId))
          return;
        if (this.ctx.sessions.get(childId) !== session)
          continue;
        await progress.promise;
      } finally {
        signal.removeEventListener("abort", onAbort);
        stopDisposed();
        stopEvent();
      }
    }
  }
  /** Settle provisioning-only members from their independently durable child Sessions. */
  async reconcileProvisioning(root, signal) {
    const provisioning = this.journal.state(root).members.filter((member) => member.phase === "provisioning");
    for (const member of provisioning) {
      signal.throwIfAborted();
      if (this.ctx.agents.get(member.id) !== void 0)
        continue;
      let phase = "failed";
      let failure = "provisioning did not leave a resumable child Session";
      try {
        const loaded = await readPersistedSession(this.ctx.sessionPersistence, member.id, signal);
        const suffix = loaded.events.slice(loaded.inheritedEventCount);
        const descriptor = foldSubagentDescriptor(suffix);
        const acceptedInitialPrompt = messageAccepted(suffix, (message) => message.source.kind === "user");
        if (loaded.header.parentSession === (member.parentId ?? root.id) && descriptor?.mode === "continuable" && descriptor.provider === member.provider && (this.workspaceRuntime === void 0 || member.workspace !== void 0 && loaded.header.cwd === member.workspace.cwd) && acceptedInitialPrompt) {
          phase = "active";
        } else {
          failure = "persisted child Session does not match the provisioned continuation";
        }
      } catch (error) {
        failure = `child Session recovery failed: ${errorMessage(error)}`;
      }
      signal.throwIfAborted();
      await this.journal.transact(root.id, async () => {
        signal.throwIfAborted();
        const current = this.journal.state(root).members.find((candidate) => candidate.id === member.id);
        if (current?.phase !== "provisioning")
          return;
        const settled = {
          ...current,
          phase,
          ...phase === "failed" ? { error: failure } : {}
        };
        await this.journal.appendAndFlush(root, "team/member", {
          version: 2,
          teamId: TeamId(root.id),
          member: settled
        });
      });
    }
  }
  /** Build one runtime member row after successful creation. */
  memberView(member) {
    const live = this.ctx.agents.get(member.id);
    return {
      id: member.id,
      ...member.parentId === void 0 ? {} : { parentId: member.parentId },
      name: member.name,
      role: "teammate",
      status: availability(live),
      description: member.description,
      provider: member.provider,
      context: member.context,
      ...member.modelProvider === void 0 ? {} : { modelProvider: member.modelProvider },
      ...(live?.options.model ?? member.model) === void 0 ? {} : { model: live?.options.model ?? member.model },
      ...member.reasoningEffort === void 0 ? {} : { reasoningEffort: member.reasoningEffort },
      ...member.persona === void 0 ? {} : { persona: member.persona },
      ...member.expert === void 0 ? {} : { expert: { ...member.expert } },
      diagnostics: []
    };
  }
  /** Validate explicit member settings before a durable roster name is reserved. */
  async resolveMemberOptions(parent, requested, signal) {
    const inherited = parentAgentOptionsForDelegation(parent);
    const provider = requested?.provider ?? inherited.provider;
    const model = requested?.model ?? inherited.model;
    if (provider === void 0 || model === void 0) {
      if (requested === void 0)
        return void 0;
      throw new TeamError("member model selection requires a provider and model", "TEAM_INVALID_MODEL");
    }
    const routeChanged = provider !== inherited.provider || model !== inherited.model;
    let reasoningEffort = requested?.reasoningEffort;
    if (reasoningEffort === void 0 && this.defaultMemberReasoningEffort === "highest") {
      const info = await parent.ctx.llm.resolveModelInfo(provider, model, signal);
      const rank = ["off", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"];
      reasoningEffort = info.reasoning?.efforts.filter((effort) => rank.includes(effort.id)).sort((left, right) => rank.indexOf(right.id) - rank.indexOf(left.id))[0]?.id ?? info.reasoning?.defaultEffort;
    }
    reasoningEffort ??= routeChanged ? void 0 : inherited.reasoningEffort;
    const maxTokens = requested?.maxTokens ?? (routeChanged ? void 0 : inherited.maxTokens);
    return await parent.ctx.llm.resolveCallConfig({
      provider,
      model,
      ...reasoningEffort === void 0 ? {} : { reasoningEffort },
      ...maxTokens === void 0 ? {} : { maxTokens }
    }, signal);
  }
  /**
   * Read the ordered parent chain from the durable root roster.
   * @param root - exact live Team Lead.
   * @param targetId - rostered target whose parent chain is needed.
   * @returns intermediate member ids, excluding the Lead and target.
   */
  ancestorIds(root, targetId) {
    const state = this.journal.state(root);
    const result = [];
    const seen = /* @__PURE__ */ new Set([targetId]);
    let member = state.members.find((candidate) => candidate.id === targetId);
    if (member === void 0)
      throw new TeamError("target is not a Team member", "TEAM_MEMBER_NOT_FOUND");
    let parentId = member.parentId ?? root.id;
    while (parentId !== root.id) {
      if (seen.has(parentId))
        throw new TeamError("Team parent chain contains a cycle", "TEAM_INVALID_LINEAGE");
      seen.add(parentId);
      member = state.members.find((candidate) => candidate.id === parentId);
      if (member?.phase !== "active")
        throw new TeamError("Team parent is not active", "TEAM_INVALID_LINEAGE");
      result.unshift(parentId);
      parentId = member.parentId ?? root.id;
    }
    return result;
  }
  /** Validate a never-reused model-facing teammate name. */
  memberName(value) {
    if (!MEMBER_NAME.test(value) || value.length > 64 || value === "lead") {
      throw new TeamError('teammate name must be lower-kebab-case, at most 64 characters, and not "lead"', "TEAM_INVALID_MEMBER_NAME");
    }
    return value;
  }
  /** Append one terminal provisioning edge unless recovery already settled it. */
  async settleProvisioning(root, terminal) {
    return this.journal.transact(root.id, async () => {
      const current = this.journal.state(root).members.find((member) => member.id === terminal.id);
      if (current === void 0) {
        throw new TeamError(`provisioned teammate "${terminal.id}" disappeared`, "TEAM_PROVISIONING_CONFLICT");
      }
      if (current.phase === "retired")
        throw new TeamError("teammate retired during provisioning", "TEAM_PROVISIONING_CONFLICT");
      if (current.phase !== "provisioning")
        return current.phase;
      await this.journal.appendAndFlush(root, "team/member", {
        version: 2,
        teamId: TeamId(root.id),
        member: terminal
      });
      return terminal.phase === "active" ? "active" : "failed";
    });
  }
  /** Whether a Session's own suffix identifies a provider-owned subagent child. */
  subagentDescriptor(agent) {
    return foldSubagentDescriptor(agent.session.snapshotEvents(agent.session.inheritedEventCount)) !== void 0;
  }
};
function availability(agent) {
  return agent?.status === "running" ? "running" : "inactive";
}

// packages/team/modules/runtime/lib/types/task-view.js
import { brandString as brandString5 } from "@deepseek-ai/dsh-brand";

// packages/team/modules/runtime/lib/types/advisers.js
function currentFindings(state, task) {
  const executionId = task.work?.execution?.id;
  if (executionId === void 0 || task.work?.execution?.phase !== "submitted")
    return [];
  const decisions = (state.adviserDecisions ?? []).filter((value) => value.taskId === task.id && value.executionId === executionId && value.goalRevision === state.goal?.revision && (value.adviserRoleRevision ?? 0) === memberRoleRevision(state, value.adviserId) && state.members.some((member) => member.id === value.adviserId && member.phase === "active" && memberFunction(state, member) === value.adviserFunction));
  return ["planning_adviser", "quality_adviser"].map((role) => decisions.findLast((value) => value.adviserFunction === role));
}
function hasDualAdviserApproval(state, task) {
  const [planning, quality] = currentFindings(state, task);
  return planning?.decision === "approve" && quality?.decision === "approve" && planning.adviserId !== quality.adviserId;
}
function hasAdviserRevisionRequest(state, task) {
  return currentFindings(state, task).some((value) => value?.decision === "revise");
}

// packages/team/modules/runtime/lib/types/task-work.js
import { z as z7 } from "zod";
import { brandString as brandString4 } from "@deepseek-ai/dsh-brand";

// packages/team/modules/runtime/lib/types/task-work-types.js
function TeamTaskExecutionId(id2) {
  return id2;
}

// packages/team/modules/runtime/lib/types/task-effects.js
import { z as z6 } from "zod";
import { ToolCallId } from "@deepseek-ai/dsh-llm";
function taskToolNeedsEffectTracking(name, args) {
  return !hasNoExternalTaskEffect(name, args);
}
var taskEffectEventSchema = z6.object({
  version: z6.literal(2),
  teamId: z6.string().min(1).transform(TeamId),
  taskId: z6.string().min(1).transform(TeamTaskId),
  executionId: z6.string().min(1).transform(TeamTaskExecutionId),
  callId: z6.string().min(1).transform(ToolCallId),
  toolName: z6.string().min(1),
  phase: z6.enum(["started", "settled"])
}).strict();
function applyTaskEffectEvent(state, event) {
  const prior = state.taskEffects ?? [];
  const index = prior.findIndex((value) => value.executionId === event.executionId && value.callId === event.callId);
  const previous = prior[index];
  if (event.phase === "started") {
    const task = state.tasks.find((value) => value.id === event.taskId);
    if (task?.work?.execution?.id !== event.executionId || task.work.execution.phase !== "running" || previous !== void 0)
      throw new Error("task effect started outside its current execution");
    return [...prior, event];
  }
  if (previous?.phase !== "started" || previous.teamId !== event.teamId || previous.taskId !== event.taskId || previous.toolName !== event.toolName)
    throw new Error("task effect settled without its matching start");
  const next = [...prior];
  next[index] = event;
  return next;
}
function taskEffectsNeedReview(state, task) {
  const execution = task.work?.execution;
  if (execution === void 0)
    return false;
  const observedCalls = taskEffectCallCount(state, task);
  if (execution.effectReview !== void 0)
    return observedCalls > execution.effectReview.observedCalls;
  return execution.effectTracking !== "observed" || observedCalls > 0;
}
function taskEffectCallCount(state, task) {
  const execution = task.work?.execution;
  if (execution === void 0)
    return 0;
  return (state.taskEffects ?? []).filter((value) => value.taskId === task.id && value.executionId === execution.id).length;
}

// packages/team/modules/runtime/lib/types/task-work.js
var positiveInteger = z7.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
var nonNegativeInteger = z7.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
var text3 = z7.string().trim().min(1);
var sessionId = text3.transform((value) => brandString4(value));
var fileReceipt = z7.object({
  path: text3,
  bytes: nonNegativeInteger,
  sha256: z7.string().regex(/^[a-f0-9]{64}$/)
}).strict();
var environmentReceipt = z7.object({ workspaceRoot: text3, platform: text3, arch: text3, nodeVersion: text3 }).strict();
var taskPlanInputSchema = z7.object({
  inputVersion: text3,
  environmentVersion: text3,
  acceptanceCriteria: z7.array(text3).min(1),
  adviserGate: z7.literal("dual").optional(),
  inputPaths: z7.array(text3).optional()
}).strict();
var taskWorkSchema = z7.object({
  plan: taskPlanInputSchema.extend({
    revision: positiveInteger,
    plannerId: sessionId,
    goalRevision: nonNegativeInteger,
    inputs: z7.array(fileReceipt).optional(),
    environment: environmentReceipt.optional()
  }).strict(),
  attempts: nonNegativeInteger,
  execution: z7.object({
    id: text3.transform(TeamTaskExecutionId),
    ownerId: sessionId,
    planRevision: positiveInteger,
    dependencies: z7.array(z7.object({
      taskId: text3.transform((value) => brandString4(value)),
      revision: positiveInteger
    }).strict()),
    phase: z7.enum(["running", "submitted", "accepted", "rejected", "cancelled"]),
    effectTracking: z7.literal("observed").optional(),
    effectReview: z7.object({
      reviewerId: sessionId,
      resolution: z7.enum(["none", "known"]),
      summary: text3,
      evidence: z7.array(text3).min(1),
      observedCalls: nonNegativeInteger
    }).strict().optional(),
    submission: z7.object({
      result: text3,
      evidence: z7.array(text3).min(1),
      artifacts: z7.array(fileReceipt).optional(),
      environment: environmentReceipt.optional(),
      sideEffects: z7.enum(["none", "known", "unknown"]).optional(),
      sideEffectEvidence: z7.array(text3).optional()
    }).strict().optional(),
    review: z7.object({
      reviewerId: sessionId,
      decision: z7.enum(["accepted", "rejected"]),
      summary: text3,
      evidence: z7.array(text3).min(1)
    }).strict().optional()
  }).strict().optional()
}).strict().superRefine((work, context) => {
  if (work.plan.inputs === void 0 !== (work.plan.environment === void 0)) {
    context.addIssue({ code: "custom", message: "plan input and environment receipts must appear together" });
  }
  if (work.execution?.submission !== void 0 && work.execution.submission.artifacts === void 0 !== (work.execution.submission.environment === void 0)) {
    context.addIssue({ code: "custom", message: "submission artifact and environment receipts must appear together" });
  }
  const run = work.execution;
  if (run === void 0)
    return;
  if (work.attempts === 0 || run.planRevision !== work.plan.revision) {
    context.addIssue({ code: "custom", message: "execution must belong to the current plan and a positive attempt" });
  }
  if (new Set(run.dependencies.map((item) => item.taskId)).size !== run.dependencies.length) {
    context.addIssue({ code: "custom", message: "execution repeats a dependency" });
  }
  if (["submitted", "accepted", "rejected"].includes(run.phase) && run.submission === void 0) {
    context.addIssue({ code: "custom", message: "submitted execution requires its result and evidence" });
  }
  if (run.phase === "running" && (run.submission !== void 0 || run.review !== void 0)) {
    context.addIssue({ code: "custom", message: "running execution cannot have a submission or review" });
  }
  if (run.review !== void 0 && (run.review.reviewerId === run.ownerId || run.review.decision !== run.phase && run.phase !== "cancelled")) {
    context.addIssue({ code: "custom", message: "review must be independent and agree with the execution phase" });
  }
  if (run.effectReview?.reviewerId === run.ownerId) {
    context.addIssue({ code: "custom", message: "external effects require an independent reviewer" });
  }
  if (["accepted", "rejected"].includes(run.phase) && run.review === void 0) {
    context.addIssue({ code: "custom", message: "reviewed execution requires a decision" });
  }
});
function taskWorkChanges(state, task) {
  return taskAssessment(state).changes(task);
}
function taskValidity(state, task) {
  const recorded = taskRecordValidity(state, task);
  return recorded.reusable ? { reusable: false, reasons: ["Current files and local runtime require a fresh recheck."] } : recorded;
}
function taskRecordValidity(state, task) {
  return taskAssessment(state).validity(task);
}
function taskAssessment(state) {
  const byId = new Map(state.tasks.map((task) => [task.id, task]));
  const accepted = /* @__PURE__ */ new Map();
  const changes = (task) => {
    const work = task.work;
    if (work === void 0)
      return [];
    const reasons = [];
    if (state.goal?.status === "revoked")
      reasons.push("The user revoked the Team goal.");
    if (work.plan.goalRevision !== (state.goal?.revision ?? 0))
      reasons.push("The confirmed Team goal changed.");
    for (const consumed of work.execution?.dependencies ?? []) {
      const dependency = byId.get(consumed.taskId);
      if (dependency === void 0 || dependency.revision !== consumed.revision || !validity(dependency).reusable) {
        reasons.push(`Dependency ${consumed.taskId} changed or lost acceptance after this execution started.`);
      }
    }
    return reasons;
  };
  const validity = (task) => {
    const cached = accepted.get(task.id);
    if (cached !== void 0)
      return cached;
    const reasons = changes(task);
    if (task.work === void 0)
      reasons.push("This task has no versioned plan or independent review.");
    else if (task.work.execution?.phase !== "accepted")
      reasons.push("This execution has not passed independent review.");
    if (task.work?.plan.inputs === void 0 || task.work.plan.environment === void 0 || task.work.execution?.submission?.artifacts === void 0 || task.work.execution.submission.environment === void 0) {
      reasons.push("This result has no host-observed input, environment, and artifact receipts.");
    }
    if (taskEffectsNeedReview(state, task))
      reasons.push("Tool execution effects require independent review.");
    if (task.work?.execution?.submission?.sideEffects === "unknown" && task.work.execution.effectReview === void 0) {
      reasons.push("External side effects remain unresolved.");
    }
    if (task.status !== "completed")
      reasons.push("This task is not completed.");
    const result = { reusable: reasons.length === 0, reasons };
    accepted.set(task.id, result);
    return result;
  };
  return { changes, validity };
}

// packages/team/modules/runtime/lib/types/task-view.js
function scopesOverlap(left, right) {
  if (process.platform === "win32") {
    left = left.toLowerCase();
    right = right.toLowerCase();
  }
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}
function taskReady(state, task) {
  if (task.work !== void 0)
    return taskWorkChanges(state, task.status === "pending" ? { ...task, work: { plan: task.work.plan, attempts: task.work.attempts } } : task).length === 0 && task.blockedBy.every((id2) => {
      const dependency = state.tasks.find((candidate) => candidate.id === id2);
      return dependency !== void 0 && taskRecordValidity(state, dependency).reusable;
    });
  return task.blockedBy.every((id2) => state.tasks.find((candidate) => candidate.id === id2)?.status === "completed");
}
function taskDispatchBlocker(state, task) {
  if (task.status === "completed" || task.status === "deleted")
    return void 0;
  if (state.goal?.status === "revoked" || task.work !== void 0 && task.work.plan.goalRevision !== (state.goal?.revision ?? 0))
    return "goal";
  if (!taskReady(state, task))
    return "dependencies";
  if (task.work?.execution?.phase === "submitted") {
    if (task.work.plan.adviserGate === "dual" && !hasDualAdviserApproval(state, task) && !hasAdviserRevisionRequest(state, task))
      return "adviser_review";
    if (task.reviewerId === void 0 || String(task.reviewerId) !== state.id && !state.members.some((member) => member.id === task.reviewerId && member.phase === "active"))
      return "reviewer_missing";
  }
  if (task.status === "pending") {
    if (task.work?.execution?.phase === "rejected")
      return "manual";
    if (task.autoAssign !== true)
      return "manual";
    if (task.requiredSkill !== void 0 && !state.skillSelections?.some((selection) => selection.goalRevision === (state.goal?.revision ?? 0) && state.members.some((member) => member.id === selection.memberId && member.phase === "active") && selection.skills.some((skill) => skill.name === task.requiredSkill)))
      return "skills";
  }
  return void 0;
}
function projectTaskView(state, task) {
  const ownerName = task.ownerId === void 0 ? void 0 : task.ownerId === brandString5(state.id) ? "lead" : state.members.find((member) => member.id === task.ownerId)?.name;
  const reviewerName = task.reviewerId === void 0 ? void 0 : task.reviewerId === brandString5(state.id) ? "lead" : state.members.find((member) => member.id === task.reviewerId)?.name;
  const dispatchBlocker = taskDispatchBlocker(state, task);
  const warnings = /* @__PURE__ */ new Set();
  const resources = resourceConflicts(state, task);
  for (const owner of resources)
    warnings.add(`exclusive resource is owned by task ${owner}`);
  for (const other of state.tasks) {
    if (other.id === task.id || other.status !== "in_progress")
      continue;
    if (task.writeScopes.some((left) => other.writeScopes.some((right) => scopesOverlap(left, right)))) {
      warnings.add(`write scopes overlap with ${other.id}`);
    }
  }
  return {
    ...task.work === void 0 ? {} : { work: structuredClone(task.work) },
    validity: taskValidity(state, task),
    ...dispatchBlocker === void 0 ? {} : { dispatchBlocker },
    id: task.id,
    revision: task.revision,
    subject: task.subject,
    description: task.description,
    status: task.status,
    blockedBy: [...task.blockedBy],
    writeScopes: [...task.writeScopes],
    ...task.autoAssign === void 0 ? {} : { autoAssign: task.autoAssign },
    ...task.requiredSkill === void 0 ? {} : { requiredSkill: task.requiredSkill },
    ...task.inputKey === void 0 ? {} : { inputKey: task.inputKey },
    ...task.result === void 0 ? {} : { result: task.result },
    ...task.evidence === void 0 ? {} : { evidence: [...task.evidence] },
    ...ownerName === void 0 ? {} : { ownerName },
    ...reviewerName === void 0 ? {} : { reviewerName },
    ready: resources.length === 0 && task.status === "pending" && task.work?.execution?.phase !== "rejected" && taskReady(state, task),
    writeScopeWarnings: [...warnings]
  };
}

// packages/team/modules/runtime/lib/types/mailbox.js
var TeamMailbox = class {
  ctx;
  journal;
  roster;
  lifecycle;
  maxPendingMessagesPerMember;
  maxMessageBytes;
  goals;
  retryInitialMs;
  retryMaxMs;
  retryMaxAttempts;
  dispatchTails = /* @__PURE__ */ new Map();
  inFlightMessages = /* @__PURE__ */ new Set();
  inFlightDispatches = /* @__PURE__ */ new Set();
  capacityWaits = /* @__PURE__ */ new Map();
  retries = /* @__PURE__ */ new Map();
  failures = /* @__PURE__ */ new Map();
  capacityRetryScheduled = false;
  /**
   * @param ctx - Team service context with Agent, Session, persistence, and subagent services.
   * @param journal - authoritative Lead-log transaction owner.
   * @param roster - Team membership and member-name resolver.
   * @param lifecycle - shared Team runtime admission cutoff.
   * @param maxPendingMessagesPerMember - per-target queued-minus-delivered limit.
   * @param maxMessageBytes - maximum complete sender-framed delivery size.
   * @param goals - Current user goal admission and revision cancellation.
   * @param retryInitialMs - delay after the first transient delivery failure.
   * @param retryMaxMs - upper bound for transient delivery retry delay.
   */
  constructor(ctx, journal, roster, lifecycle, maxPendingMessagesPerMember, maxMessageBytes, goals, retryInitialMs, retryMaxMs, retryMaxAttempts) {
    this.ctx = ctx;
    this.journal = journal;
    this.roster = roster;
    this.lifecycle = lifecycle;
    this.maxPendingMessagesPerMember = maxPendingMessagesPerMember;
    this.maxMessageBytes = maxMessageBytes;
    this.goals = goals;
    this.retryInitialMs = retryInitialMs;
    this.retryMaxMs = retryMaxMs;
    this.retryMaxAttempts = retryMaxAttempts;
    ctx.on("agent/disposed", ({ agent }) => {
      for (const [targetId, wait] of this.capacityWaits) {
        if (wait.root === agent)
          this.capacityWaits.delete(targetId);
      }
      for (const [targetId, retry] of this.retries) {
        if (retry.root === agent)
          this.clearRetry(targetId);
      }
    });
    this.lifecycle.signal.addEventListener("abort", () => {
      for (const targetId of this.retries.keys())
        this.clearRetry(targetId);
    }, { once: true });
  }
  /**
   * Queue one durable peer message, then attempt immediate delivery.
   * @param caller - exact live sending Team member.
   * @param request - target name, content, and pre-queue cancellation.
   * @returns durable message identity and immediate-delivery observation.
   */
  async send(caller, request) {
    if (this.lifecycle.disposed)
      throw new TeamError("Agent Teams service is disposing", "TEAM_DISPOSED");
    const operation = this.sendAdmitted(caller, {
      ...request,
      signal: AbortSignal.any([request.signal, this.lifecycle.signal])
    });
    return await this.trackDispatch(operation);
  }
  /**
   * Deliver one host-owned notice to the Lead without exposing self-messaging to models.
   * @param root - Exact live Lead owning the approved goal.
   * @param messageId - Stable program-owned identity used across restart and repeated dispatch.
   * @param content - Logged diagnostic or accepted-delivery summary.
   * @param signal - Cancellation tied to the current goal and runtime.
   * @returns the existing or newly queued notice receipt.
   */
  async sendNotice(root, messageId, content, signal) {
    if (this.lifecycle.disposed)
      throw new TeamError("Agent Teams service is disposing", "TEAM_DISPOSED");
    const membership = this.roster.membership(root);
    if (membership.role !== "lead")
      throw new TeamError("host notices require the exact Lead", "TEAM_LEAD_REQUIRED");
    return await this.trackDispatch(this.sendAdmitted(root, {
      target: "lead",
      content,
      signal: AbortSignal.any([signal, this.lifecycle.signal])
    }, void 0, void 0, messageId));
  }
  /**
   * Queue one task execution notification under a stable message id. Recovery can
   * repeat this call without waking the member for the same execution twice.
   * @param root - Exact live Team Lead.
   * @param request - Target and concise task reference.
   * @param messageId - Deterministic identity of the assigned execution.
   * @param taskId - Task that still owns the execution.
   * @param executionId - Execution that still belongs to the target.
   * @param kind - Execute, adviser opinion, or independent submitted-result review.
   * @param adviserRoleRevision - Role version that must still apply when an advisory notification is delivered.
   * @returns the original or newly queued message status.
   */
  async sendTask(root, request, messageId, taskId, executionId, kind, adviserRoleRevision) {
    if (this.lifecycle.disposed)
      throw new TeamError("Agent Teams service is disposing", "TEAM_DISPOSED");
    return await this.trackDispatch(this.sendAdmitted(root, {
      ...request,
      signal: AbortSignal.any([request.signal, this.lifecycle.signal])
    }, void 0, { messageId, taskId, executionId, kind, ...adviserRoleRevision === void 0 ? {} : { adviserRoleRevision } }));
  }
  /**
   * Observe target-side durable receipts and checkpoint their Lead-log acknowledgement.
   * @param session - exact target Session receiving the event.
   * @param event - newly appended Session event.
   */
  observeSessionEvent(session, event) {
    if (this.lifecycle.disposed || event.type !== "user/message" || event.data.source.kind !== "team-message")
      return;
    const source = event.data.source;
    const acknowledgement = Promise.resolve().then(async () => {
      const root = this.ctx.agents.get(brandString6(source.teamId));
      if (root !== void 0)
        await this.checkpointDelivered(root, session, source.messageId);
    }).catch((error) => {
      this.ctx.logger.warn(`Team message "${source.messageId}" acknowledgement failed: ${errorMessage(error)}`);
    });
    void this.trackDispatch(acknowledgement);
  }
  /**
   * Retry durable pending messages relevant to one started Team member.
   * @param agent - newly started exact live Agent.
   * @param signal - shared runtime cancellation.
   */
  async recoverFor(agent, signal) {
    signal.throwIfAborted();
    const membership = this.roster.tryMembership(agent);
    if (membership === void 0)
      return;
    const state = this.journal.state(membership.root);
    const messages = state.messages.filter((message) => !state.delivered.includes(message.id) && this.currentMessage(state, message) && (membership.role === "lead" || message.targetId === agent.id));
    const latestByTarget = new Map(messages.map((message) => [message.targetId, message]));
    for (const message of latestByTarget.values()) {
      signal.throwIfAborted();
      await this.tryDispatch(membership.root, message, signal);
    }
  }
  /**
   * List durable messages with process-local retry observations for one Team.
   * @param caller - Exact live Team member.
   * @returns ordered message summaries without bodies.
   */
  list(caller) {
    const { root } = this.roster.membership(caller);
    const state = this.journal.state(root);
    return state.messages.map((message) => {
      const retry = this.retries.get(message.targetId);
      const error = retry?.messageId === message.id ? retry.error : this.failures.get(message.id);
      const delivered = state.delivered.includes(message.id);
      const current = this.currentMessage(state, message);
      const status = delivered ? "delivered" : !current ? "quarantined" : retry?.messageId === message.id && retry.failures === this.retryMaxAttempts ? "retry-exhausted" : "pending";
      return {
        id: message.id,
        senderId: message.senderId,
        senderName: message.senderName,
        targetId: message.targetId,
        ...message.goalRevision === void 0 ? {} : { goalRevision: message.goalRevision },
        ...message.adoptedFrom === void 0 ? {} : { adoptedFrom: message.adoptedFrom },
        status,
        attempts: retry?.messageId === message.id ? retry.failures : 0,
        ...error === void 0 ? {} : { error },
        ...retry?.messageId !== message.id || retry.nextAttemptAt === void 0 ? {} : { nextAttemptAt: retry.nextAttemptAt }
      };
    });
  }
  /**
   * Return one bounded newest-first mailbox page without message bodies.
   * @param caller - Exact live Team member.
   * @param offset - Number of newer messages to skip.
   * @param limit - Page length from one through fifty.
   * @returns page items and total message count.
   */
  listPage(caller, offset, limit) {
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
      throw new TeamError("mailbox page offset must be nonnegative and limit must be 1 through 50", "TEAM_INVALID_ARGUMENT");
    }
    const messages = this.list(caller);
    return { total: messages.length, items: messages.reverse().slice(offset, offset + limit) };
  }
  /**
   * Read one complete durable item only when the caller selects its id.
   * @param caller - Exact live Team member.
   * @param messageId - Saved message identity.
   * @returns detached message with its complete content.
   */
  get(caller, messageId) {
    const { root } = this.roster.membership(caller);
    const message = this.journal.state(root).messages.find((candidate) => candidate.id === messageId);
    if (message === void 0)
      throw new TeamError(`Team message "${messageId}" not found`, "TEAM_MESSAGE_NOT_FOUND");
    return structuredClone(message);
  }
  /**
   * Explicitly retry one current, undelivered message after transient failures.
   * @param caller - Exact live Team member.
   * @param messageId - Saved message identity.
   * @param signal - Cancellation while attempting delivery.
   * @returns message identity and immediate delivery status.
   */
  async retry(caller, messageId, signal) {
    const { root } = this.roster.membership(caller);
    signal.throwIfAborted();
    const state = this.journal.state(root);
    const message = state.messages.find((candidate) => candidate.id === messageId);
    if (message === void 0)
      throw new TeamError(`Team message "${messageId}" not found`, "TEAM_MESSAGE_NOT_FOUND");
    if (!this.currentMessage(state, message))
      throw new TeamError("historical Team message requires Lead adoption", "TEAM_MESSAGE_QUARANTINED");
    if (state.delivered.includes(messageId))
      return { messageId, status: "accepted" };
    this.clearRetry(message.targetId);
    const accepted = await this.tryDispatch(root, message, signal);
    return { messageId, status: accepted ? "accepted" : "queued" };
  }
  /**
   * Requeue historical content under the current goal on explicit Lead authority.
   * @param caller - Exact live Team Lead.
   * @param messageId - Historical source message.
   * @param signal - Cancellation before admission or delivery.
   * @returns new message identity and immediate delivery status.
   */
  async adopt(caller, messageId, signal) {
    const membership = this.roster.membership(caller);
    if (membership.role !== "lead")
      throw new TeamError("only the Team Lead may adopt historical mail", "TEAM_LEAD_REQUIRED");
    const root = membership.root;
    signal.throwIfAborted();
    const original = this.journal.state(root).messages.find((message) => message.id === messageId);
    if (original === void 0)
      throw new TeamError(`Team message "${messageId}" not found`, "TEAM_MESSAGE_NOT_FOUND");
    if (this.currentMessage(this.journal.state(root), original))
      throw new TeamError("Team message already belongs to the current goal", "TEAM_MESSAGE_CURRENT");
    const target = original.targetId === root.id ? "lead" : this.journal.state(root).members.find((member) => member.id === original.targetId)?.name;
    if (target === void 0)
      throw new TeamError("historical Team message target no longer exists", "TEAM_MEMBER_NOT_FOUND");
    return await this.trackDispatch(this.sendAdmitted(root, {
      target,
      content: original.content,
      signal: AbortSignal.any([signal, this.lifecycle.signal])
    }, messageId));
  }
  /**
   * Wake capacity-blocked deliveries after an independent reservation returns its slot.
   * @param childId - child whose creation or residence reservation ended.
   */
  capacityReleased(childId) {
    if (this.lifecycle.disposed)
      return;
    for (const wait of this.capacityWaits.values()) {
      if (!wait.chain.has(childId))
        wait.retry = true;
    }
    this.scheduleCapacityRetry();
  }
  /**
   * Whether this exact live Lead has mail waiting for resident activation capacity.
   * @param root - Exact Team Lead.
   * @returns whether a delivery waits for capacity.
   */
  hasCapacityWait(root) {
    return [...this.capacityWaits.values()].some((wait) => wait.root === root && wait.blocked);
  }
  /**
   * Whether an automatic delivery timer can produce the next Team change.
   * @param root - Exact Team Lead.
   * @returns whether a delivery retry is scheduled.
   */
  hasScheduledRetry(root) {
    return [...this.retries.values()].some((retry) => retry.root === root && retry.timer !== void 0);
  }
  /** Coalesce release notifications without reconciling unrelated roster provisioning. */
  scheduleCapacityRetry() {
    if (this.capacityRetryScheduled || ![...this.capacityWaits.values()].some((wait) => wait.blocked && wait.retry))
      return;
    this.capacityRetryScheduled = true;
    queueMicrotask(() => {
      this.capacityRetryScheduled = false;
      if (this.lifecycle.disposed) {
        this.capacityWaits.clear();
        return;
      }
      for (const wait of this.capacityWaits.values()) {
        if (!wait.blocked || !wait.retry)
          continue;
        if (this.ctx.agents.get(wait.root.id) !== wait.root || this.roster.tryMembership(wait.root) === void 0) {
          this.capacityWaits.delete(wait.targetId);
          continue;
        }
        const state = this.journal.state(wait.root);
        const message = state.messages.find((candidate) => candidate.targetId === wait.targetId && this.currentMessage(state, candidate) && !state.delivered.includes(candidate.id));
        if (message === void 0) {
          this.capacityWaits.delete(wait.targetId);
          continue;
        }
        if (this.inFlightMessages.has(message.id))
          continue;
        wait.retry = false;
        void this.tryDispatch(wait.root, message, this.lifecycle.signal);
      }
    });
  }
  /**
   * Return admitted dispatch and acknowledgement operations captured for disposal.
   * @returns detached snapshot ordered only by Set insertion.
   */
  pendingDispatches() {
    return [...this.inFlightDispatches];
  }
  /** Queue and dispatch one mailbox item admitted before the disposal cutoff. */
  async sendAdmitted(caller, request, adoptedFrom, taskDispatch, noticeId) {
    const membership = this.roster.membership(caller);
    request.signal.throwIfAborted();
    const root = membership.root;
    const content = structuredClone(request.content);
    const queued = await this.journal.transact(root.id, async () => {
      request.signal.throwIfAborted();
      const exact = this.roster.membership(caller);
      if (exact.root !== root || exact.name !== membership.name) {
        throw new TeamError("sending Team member is no longer live", "TEAM_NOT_MEMBER");
      }
      const state = this.journal.state(root);
      const target = resolveActiveMember(root, state, request.target);
      if (noticeId !== void 0) {
        if (caller !== root || target.id !== root.id)
          throw new TeamError("host notice target must be the Lead", "TEAM_LEAD_REQUIRED");
        const existing = state.messages.find((candidate) => candidate.id === noticeId);
        if (existing !== void 0) {
          if (existing.targetId !== root.id || existing.goalRevision !== (state.goal?.revision ?? 0)) {
            throw new TeamError("host notice identity belongs to another goal", "TEAM_MESSAGE_ID_CONFLICT");
          }
          return { message: existing, dispatch: state.delivered.includes(existing.id) ? Promise.resolve(true) : this.tryDispatch(root, existing, this.lifecycle.signal) };
        }
      }
      if (taskDispatch !== void 0) {
        const task = state.tasks.find((candidate) => candidate.id === taskDispatch.taskId);
        const adviser = state.members.find((candidate) => candidate.id === target.id);
        const advised = taskDispatch.kind === "advice" && memberRoleRevision(state, target.id) === (taskDispatch.adviserRoleRevision ?? 0) && task?.work?.plan.adviserGate === "dual" && adviser?.phase === "active" && (memberFunction(state, adviser) === "planning_adviser" || memberFunction(state, adviser) === "quality_adviser");
        const expectedTarget = taskDispatch.kind === "execute" ? task?.ownerId : taskDispatch.kind === "review" ? task?.reviewerId : advised ? target.id : void 0;
        if (state.goal === void 0 || task?.status !== "in_progress" || task.autoDispatch !== true || task.work?.execution?.id !== taskDispatch.executionId || task.work.execution.phase !== (taskDispatch.kind === "execute" ? "running" : "submitted") || expectedTarget !== target.id || taskDispatch.kind === "review" && task.work.plan.adviserGate === "dual" && !hasDualAdviserApproval(state, task) && !hasAdviserRevisionRequest(state, task) || task.work.plan.goalRevision !== state.goal.revision || !taskReady(state, task)) {
          throw new TeamError("task execution changed before automatic dispatch", "TEAM_TASK_EXECUTION_STALE");
        }
        const existing = state.messages.find((candidate) => candidate.id === taskDispatch.messageId);
        if (existing !== void 0) {
          if (existing.targetId !== target.id || existing.goalRevision !== state.goal.revision) {
            throw new TeamError("task notification identity belongs to another execution", "TEAM_MESSAGE_ID_CONFLICT");
          }
          return { message: existing, dispatch: state.delivered.includes(existing.id) ? Promise.resolve(true) : this.tryDispatch(root, existing, this.lifecycle.signal) };
        }
      }
      if (adoptedFrom !== void 0) {
        const original = state.messages.find((candidate) => candidate.id === adoptedFrom);
        if (original === void 0 || this.currentMessage(state, original) || original.targetId !== target.id) {
          throw new TeamError("historical message or target changed before adoption", "TEAM_MESSAGE_QUARANTINED");
        }
        const existing = state.messages.find((candidate) => candidate.adoptedFrom === adoptedFrom && this.currentMessage(state, candidate));
        if (existing !== void 0) {
          return { message: existing, dispatch: this.tryDispatch(root, existing, this.lifecycle.signal) };
        }
      }
      if (target.id === caller.id && adoptedFrom === void 0 && noticeId === void 0) {
        throw new TeamError("a Team member cannot message itself", "TEAM_SELF_MESSAGE");
      }
      const pendingForTarget = state.messages.filter((candidate) => candidate.targetId === target.id && this.currentMessage(state, candidate) && !state.delivered.includes(candidate.id)).length;
      if (pendingForTarget >= this.maxPendingMessagesPerMember) {
        throw new TeamError(`teammate "${target.name}" has ${pendingForTarget} pending messages`, "TEAM_MAILBOX_FULL");
      }
      const queued2 = {
        ...request.cooldownProvider === void 0 ? {} : { cooldownProvider: request.cooldownProvider },
        ...request.notBefore === void 0 ? {} : { notBefore: request.notBefore },
        id: noticeId ?? taskDispatch?.messageId ?? TeamMessageId(`team-message-${randomUUID3()}`),
        ...taskDispatch === void 0 ? {} : { taskDispatch: {
          taskId: taskDispatch.taskId,
          executionId: taskDispatch.executionId,
          kind: taskDispatch.kind,
          ...taskDispatch.adviserRoleRevision === void 0 ? {} : { adviserRoleRevision: taskDispatch.adviserRoleRevision }
        } },
        senderId: caller.id,
        senderName: membership.name,
        targetId: target.id,
        content,
        goalRevision: state.goal?.revision ?? 0,
        ...adoptedFrom === void 0 ? {} : { adoptedFrom }
      };
      if (Buffer.byteLength(JSON.stringify(this.deliveryContent(queued2)), "utf8") > this.maxMessageBytes) {
        throw new TeamError(`team message exceeds ${this.maxMessageBytes} bytes`, "TEAM_MESSAGE_TOO_LARGE");
      }
      await this.journal.appendAndFlush(root, "team/message/queued", {
        version: 2,
        teamId: TeamId(root.id),
        message: queued2
      });
      return { message: queued2, dispatch: this.tryDispatch(root, queued2, this.lifecycle.signal) };
    });
    const accepted = await queued.dispatch;
    return { messageId: queued.message.id, status: accepted ? "accepted" : "queued" };
  }
  /** Attempt one queued message exactly once in this process at a time. */
  tryDispatch(root, message, signal) {
    if (this.lifecycle.disposed)
      return Promise.resolve(false);
    if (this.goals.denial(root) !== void 0)
      return Promise.resolve(false);
    if (!this.currentMessage(this.journal.state(root), message))
      return Promise.resolve(false);
    if (this.inFlightMessages.has(message.id))
      return Promise.resolve(false);
    this.inFlightMessages.add(message.id);
    const operation = this.trackDispatch(this.tryDispatchAdmitted(root, message, AbortSignal.any([signal, this.lifecycle.signal])));
    const forget = (accepted) => {
      this.inFlightMessages.delete(message.id);
      if (accepted) {
        this.failures.delete(message.id);
        this.clearRetry(message.targetId);
      } else if (!this.capacityWaits.get(message.targetId)?.blocked && !signal.aborted) {
        this.scheduleRetry(root, message.targetId, message.id);
      }
      this.scheduleCapacityRetry();
    };
    void operation.then(forget, () => {
      this.inFlightMessages.delete(message.id);
      if (!signal.aborted)
        this.scheduleRetry(root, message.targetId, message.id);
    });
    return operation;
  }
  /** Retry a target's oldest current message without requiring another Team event. */
  scheduleRetry(root, targetId, failedId) {
    if (this.lifecycle.disposed || this.ctx.agents.get(root.id) !== root)
      return;
    const state = this.journal.state(root);
    const oldest = state.messages.find((message) => message.targetId === targetId && this.currentMessage(state, message) && !state.delivered.includes(message.id));
    if (oldest === void 0 || this.capacityWaits.get(targetId)?.blocked)
      return;
    const prior = this.retries.get(targetId);
    if (prior?.timer !== void 0)
      return;
    const failures = prior?.messageId === oldest.id ? prior.failures + 1 : 1;
    const retry = {
      root,
      targetId,
      messageId: oldest.id,
      failures,
      error: this.failures.get(oldest.id) ?? this.failures.get(failedId) ?? `delivery attempt for ${failedId} did not complete`
    };
    this.retries.set(targetId, retry);
    if (failures >= this.retryMaxAttempts) {
      this.ctx.logger.warn(`Team message "${oldest.id}" automatic retry limit reached; retry it explicitly`);
      return;
    }
    const delay2 = Math.min(2147483647, Math.max(this.deliveryDeadline(root, oldest) - Date.now(), Math.min(this.retryMaxMs, this.retryInitialMs * 2 ** Math.min(failures - 1, 30))));
    retry.nextAttemptAt = Date.now() + delay2;
    retry.timer = setTimeout(() => {
      delete retry.timer;
      delete retry.nextAttemptAt;
      if (this.retries.get(targetId) !== retry || this.lifecycle.disposed)
        return;
      const latest = this.journal.state(root);
      const pending = latest.messages.filter((candidate) => candidate.targetId === targetId && this.currentMessage(latest, candidate) && !latest.delivered.includes(candidate.id));
      const newest = pending.at(-1);
      if (newest === void 0 || pending[0]?.id !== retry.messageId) {
        this.clearRetry(targetId);
        return;
      }
      void this.tryDispatch(root, newest, this.lifecycle.signal);
    }, delay2);
  }
  /** Release one target timer and its process-local failure observations. */
  clearRetry(targetId) {
    const retry = this.retries.get(targetId);
    if (retry?.timer !== void 0)
      clearTimeout(retry.timer);
    this.retries.delete(targetId);
  }
  /** Old or superseded goal messages stay in history without executing. */
  currentMessage(state, message) {
    if (message.goalRevision === void 0 || message.goalRevision !== (state.goal?.revision ?? 0) || state.goal?.status === "revoked")
      return false;
    if (message.taskDispatch === void 0)
      return true;
    const task = state.tasks.find((candidate) => candidate.id === message.taskDispatch?.taskId);
    const kind = message.taskDispatch.kind;
    const adviser = state.members.find((candidate) => candidate.id === message.targetId);
    const advised = kind === "advice" && memberRoleRevision(state, message.targetId) === (message.taskDispatch.adviserRoleRevision ?? 0) && task?.work?.plan.adviserGate === "dual" && adviser?.phase === "active" && (memberFunction(state, adviser) === "planning_adviser" || memberFunction(state, adviser) === "quality_adviser");
    return task?.autoDispatch === true && task.status === "in_progress" && task.work?.execution?.id === message.taskDispatch.executionId && task.work.execution.phase === (kind === "execute" ? "running" : "submitted") && (kind === "execute" ? task.ownerId : kind === "review" ? task.reviewerId : advised ? message.targetId : void 0) === message.targetId && (kind !== "review" || task.work.plan.adviserGate !== "dual" || hasDualAdviserApproval(state, task) || hasAdviserRevisionRequest(state, task)) && taskReady(state, task);
  }
  deliveryDeadline(root, message) {
    const state = this.journal.state(root);
    const route = state.modelRoutes?.find((candidate) => candidate.memberId === message.targetId)?.modelProvider ?? state.members.find((candidate) => candidate.id === message.targetId)?.modelProvider;
    return message.cooldownProvider !== void 0 && route !== void 0 && route !== message.cooldownProvider ? 0 : message.notBefore ?? 0;
  }
  /** Track one dispatch transaction through delivery admission or contained failure. */
  trackDispatch(operation) {
    this.inFlightDispatches.add(operation);
    void operation.then(() => {
      this.inFlightDispatches.delete(operation);
    }, () => {
      this.inFlightDispatches.delete(operation);
    });
    return operation;
  }
  /** Attempt one queued message admitted before the service lifecycle cutoff. */
  async tryDispatchAdmitted(root, message, signal) {
    return await this.serializeDispatch(message, () => this.dispatchThrough(root, message, signal));
  }
  /** Serialize delivery admission for one durable target in queued order. */
  async serializeDispatch(message, operation) {
    const targetId = message.targetId;
    const prior = this.dispatchTails.get(targetId) ?? Promise.resolve();
    const run = prior.then(operation, operation);
    const tail = run.then(() => void 0, () => void 0);
    this.dispatchTails.set(targetId, tail);
    try {
      return await run;
    } finally {
      if (this.dispatchTails.get(targetId) === tail)
        this.dispatchTails.delete(targetId);
    }
  }
  /** Deliver every pending target message through `message` in durable queue order. */
  async dispatchThrough(root, message, signal) {
    const state = this.journal.state(root);
    const pending = state.messages.filter((candidate) => candidate.targetId === message.targetId && this.currentMessage(state, candidate) && !state.delivered.includes(candidate.id));
    const requested = pending.findIndex((candidate) => candidate.id === message.id);
    if (requested < 0)
      return state.delivered.includes(message.id);
    for (const candidate of pending.slice(0, requested + 1)) {
      const ownsInFlight = !this.inFlightMessages.has(candidate.id);
      if (ownsInFlight)
        this.inFlightMessages.add(candidate.id);
      try {
        if (!await this.dispatchOnce(root, candidate, signal))
          return false;
      } finally {
        if (ownsInFlight)
          this.inFlightMessages.delete(candidate.id);
      }
    }
    return true;
  }
  /** Attempt one queued delivery after target-local ordering admits it. */
  async dispatchOnce(root, message, signal) {
    let capacityWait;
    try {
      if (!this.currentMessage(this.journal.state(root), message))
        return false;
      if (this.deliveryDeadline(root, message) > Date.now())
        return false;
      const target = message.targetId === root.id ? root : this.ctx.agents.get(message.targetId);
      if (target !== void 0 && this.targetRecorded(target.session, message.id)) {
        return await this.checkpointDelivered(root, target.session, message.id);
      }
      signal = this.goals.admit(root, signal);
      if (!this.currentMessage(this.journal.state(root), message))
        return false;
      const source = {
        kind: "team-message",
        teamId: TeamId(root.id),
        messageId: message.id,
        senderId: message.senderId,
        senderName: message.senderName
      };
      const content = this.deliveryContent(message);
      if (message.targetId === root.id) {
        const input = createUserMessage({ content, source });
        root.steer(input);
        return await this.checkpointDelivered(root, root.session, message.id);
      }
      if (target === void 0) {
        const recorded = await this.persistedTargetRecorded(message.targetId, message.id, signal);
        if (recorded === void 0)
          return false;
        if (recorded) {
          await this.markDelivered(root, message.id, message.targetId);
          return true;
        }
      }
      const ancestors = this.roster.ancestorIds(root, message.targetId);
      for (const memberId of [...ancestors, message.targetId])
        this.roster.restoreWorkspaceCap(root, memberId);
      capacityWait = {
        root,
        targetId: message.targetId,
        chain: /* @__PURE__ */ new Set([...ancestors, message.targetId]),
        blocked: false,
        retry: false
      };
      this.capacityWaits.set(message.targetId, capacityWait);
      await steerHostSubagentPrompt(this.ctx.subagents, root, message.targetId, content, source, signal, ancestors);
      return target === void 0 ? true : await this.checkpointDelivered(root, target.session, message.id);
    } catch (error) {
      if (capacityWait !== void 0 && !this.lifecycle.disposed && this.ctx.agents.get(root.id) === root && error instanceof SubagentError && error.code === "ACTIVATION_LIMIT_REACHED") {
        capacityWait.blocked = true;
      }
      this.ctx.logger.warn(`team message "${message.id}" remains queued: ${errorMessage(error)}`);
      this.failures.set(message.id, errorMessage(error));
      return false;
    } finally {
      if (capacityWait !== void 0 && !capacityWait.blocked && this.capacityWaits.get(message.targetId) === capacityWait) {
        this.capacityWaits.delete(message.targetId);
      }
    }
  }
  /** Flush one live target receipt before the Lead records its delivered edge. */
  async checkpointDelivered(root, target, messageId) {
    await this.ctx.sessions.flush(target);
    if (!this.targetRecorded(target, messageId))
      return false;
    await this.markDelivered(root, messageId, target.id);
    return true;
  }
  /** Record delivery unless the acknowledgement already exists. */
  async markDelivered(root, messageId, targetId) {
    await this.journal.transact(root.id, async () => {
      const state = this.journal.state(root);
      if (state.delivered.includes(messageId))
        return;
      const queued = state.messages.find((message) => message.id === messageId);
      if (queued === void 0 || queued.targetId !== targetId)
        return;
      await this.journal.appendAndFlush(root, "team/message/delivered", {
        version: 2,
        teamId: TeamId(root.id),
        messageId,
        targetId
      });
    });
  }
  /** Whether a target Session already contains the durable message identity. */
  targetRecorded(session, messageId) {
    const suffix = session.snapshotEvents(session.inheritedEventCount);
    return messageAccepted(suffix, (message) => message.source.kind === "team-message" && message.source.messageId === messageId);
  }
  /** Frame peer content with stable sender and message identity for the receiving model. */
  deliveryContent(message) {
    return [
      { type: "text", text: `Team message ${message.id} from ${message.senderName}:` },
      ...structuredClone(message.content)
    ];
  }
  /** Read an inactive target's durable log before cold resume; uncertainty keeps the mailbox queued. */
  async persistedTargetRecorded(targetId, messageId, signal) {
    try {
      const stored = await readPersistedSession(this.ctx.sessionPersistence, targetId, signal);
      const suffix = stored.events.slice(stored.inheritedEventCount);
      return messageAccepted(suffix, (message) => message.source.kind === "team-message" && message.source.messageId === messageId);
    } catch (error) {
      this.ctx.logger.warn(`cannot read Team message target "${targetId}": ${errorMessage(error)}`);
      this.failures.set(messageId, errorMessage(error));
      return void 0;
    }
  }
};

// packages/team/modules/runtime/lib/types/projection.js
import { z as z8 } from "zod";
import { brandString as brandString7 } from "@deepseek-ai/dsh-brand";

// packages/team/modules/runtime/lib/types/task-graph.js
var TeamTaskGraphError = class extends Error {
  violation;
  /**
   * @param message - concrete invalid dependency relation.
   * @param violation - stable relation category used by Team commands.
   */
  constructor(message, violation) {
    super(message);
    this.violation = violation;
    this.name = "TeamTaskGraphError";
  }
};
function assertTaskGraphCandidate(current, candidate) {
  const tasks = new Map(current.map((task) => [task.id, task]));
  tasks.set(candidate.id, candidate);
  for (const task of tasks.values()) {
    if (task.status === "deleted")
      continue;
    const seen = /* @__PURE__ */ new Set();
    for (const blockerId of task.blockedBy) {
      if (blockerId === task.id) {
        throw new TeamTaskGraphError(`team task "${task.id}" cannot block itself`, "cycle");
      }
      if (seen.has(blockerId)) {
        throw new TeamTaskGraphError(`team task "${task.id}" repeats blocker "${blockerId}"`, "duplicate");
      }
      const blocker = tasks.get(blockerId);
      if (blocker === void 0 || blocker.status === "deleted") {
        throw new TeamTaskGraphError(`blocker task "${blockerId}" for "${task.id}" is missing or deleted`, "missing");
      }
      seen.add(blockerId);
    }
  }
  const visiting = /* @__PURE__ */ new Set();
  const visited = /* @__PURE__ */ new Set();
  const visit = (id2) => {
    if (visiting.has(id2)) {
      throw new TeamTaskGraphError(`task dependency cycle includes "${id2}"`, "cycle");
    }
    if (visited.has(id2))
      return;
    const task = tasks.get(id2);
    if (task === void 0 || task.status === "deleted")
      return;
    visiting.add(id2);
    for (const blockerId of task.blockedBy)
      visit(blockerId);
    visiting.delete(id2);
    visited.add(id2);
  };
  for (const task of tasks.values())
    visit(task.id);
}

// packages/team/modules/runtime/lib/types/expert-types.js
function TeamExpertId(id2) {
  return id2;
}

// packages/team/modules/runtime/lib/types/task-work-event.js
import { assertNever } from "@deepseek-ai/dsh-util-values";
function assertTaskWorkEvent(state, previous, task) {
  const work = task.work;
  const prior = previous?.work;
  if (previous !== void 0 && previous.status === "in_progress" && task.autoAssign === false) {
    const { revision: _revision, autoAssign: _assign, autoDispatch: _dispatch, ...candidate } = task;
    const { revision: _priorRevision, autoAssign: _priorAssign, autoDispatch: _priorDispatch, ...base } = previous;
    if (JSON.stringify(candidate) === JSON.stringify(base) && (task.autoDispatch === previous.autoDispatch || task.autoDispatch === true))
      return;
  }
  if (previous !== void 0 && (task.reviewerId !== previous.reviewerId || work?.execution?.phase === "submitted" && task.autoDispatch !== previous.autoDispatch)) {
    const { revision: _revision, reviewerId: _reviewer, autoDispatch: _dispatch, ...candidate } = task;
    const { revision: _priorRevision, reviewerId: _priorReviewer, autoDispatch: _priorDispatch, ...base } = previous;
    if (JSON.stringify(candidate) === JSON.stringify(base)) {
      if (!["pending", "in_progress"].includes(task.status) || task.reviewerId === void 0 || task.autoDispatch !== previous.autoDispatch && (task.autoDispatch !== true || work?.execution?.phase !== "submitted") || task.reviewerId === task.ownerId || String(task.reviewerId) !== state.id && !state.members.some((member) => member.id === task.reviewerId && member.phase === "active")) {
        throw new Error("review assignment requires an independent active member and unfinished task");
      }
      return;
    }
  }
  if (work === void 0) {
    if (prior !== void 0)
      throw new Error("versioned task work cannot be removed");
    return;
  }
  const activeMember = (id2) => id2 === state.id || state.members.some((candidate) => candidate.id === id2 && candidate.phase === "active");
  const planChanged = prior === void 0 || work.plan.revision !== prior.plan.revision;
  if (planChanged && !activeMember(work.plan.plannerId))
    throw new Error("task planner is not an active Team member");
  if (planChanged) {
    if (prior?.execution?.phase === "running" || prior?.execution?.phase === "submitted" || previous !== void 0 && taskEffectsNeedReview(state, previous)) {
      throw new Error("an unresolved execution cannot be replaced by a new plan");
    }
    if (prior !== void 0 && previous?.inputKey !== void 0)
      throw new Error("a keyed task plan cannot be replaced");
    if (previous !== void 0 && task.inputKey !== previous.inputKey)
      throw new Error("a task input key cannot be replaced");
    if (work.plan.revision !== (prior?.plan.revision ?? 0) + 1 || work.attempts !== (prior?.attempts ?? 0) || work.execution !== void 0 || work.plan.goalRevision !== (state.goal?.revision ?? 0)) {
      throw new Error("new task plan must advance once, capture the current goal, and have no execution");
    }
  } else if (JSON.stringify(work.plan) !== JSON.stringify(prior.plan) || task.subject !== previous?.subject || task.description !== previous.description || JSON.stringify(task.blockedBy) !== JSON.stringify(previous.blockedBy) || JSON.stringify(task.writeScopes) !== JSON.stringify(previous.writeScopes) || task.inputKey !== previous.inputKey) {
    throw new Error("task inputs cannot change within the same plan revision");
  }
  const run = work.execution;
  const oldRun = prior?.execution;
  if (run === void 0) {
    if (!planChanged && (oldRun !== void 0 || work.attempts !== prior.attempts))
      throw new Error("task execution cannot disappear within one plan");
    if (task.status !== "pending" && task.status !== "deleted" || task.ownerId !== void 0 || task.result !== void 0 || task.evidence !== void 0)
      throw new Error("a task without an execution must remain unowned and uncompleted");
    return;
  }
  if (run.id !== `${task.id}/run-${work.attempts}` || run.planRevision !== work.plan.revision)
    throw new Error("task execution identity does not match its attempt and plan");
  if (oldRun?.id !== run.id) {
    if (!activeMember(run.ownerId))
      throw new Error("task executor is not an active Team member");
    if (run.effectReview !== void 0)
      throw new Error("a new execution cannot carry an earlier effect review");
    if (oldRun?.phase === "submitted" || oldRun?.phase === "accepted")
      throw new Error("release or reopen the previous execution before starting another");
    if (work.attempts !== (prior?.attempts ?? 0) + 1 || run.phase !== "running")
      throw new Error("a new task execution must advance the attempt and start running");
    if (run.dependencies.length !== task.blockedBy.length || run.dependencies.some((item) => !task.blockedBy.includes(item.taskId))) {
      throw new Error("task execution must capture every declared dependency");
    }
    for (const consumed of run.dependencies) {
      const dependency = state.tasks.find((candidate) => candidate.id === consumed.taskId);
      if (dependency === void 0 || dependency.revision !== consumed.revision || !taskRecordValidity(state, dependency).reusable) {
        throw new Error("task execution requires current independently accepted dependencies");
      }
    }
    if (taskWorkChanges(state, task).length > 0)
      throw new Error("task execution cannot start under a stale goal");
  } else {
    if (work.attempts !== prior?.attempts || run.ownerId !== oldRun.ownerId || run.effectTracking !== oldRun.effectTracking || run.planRevision !== oldRun.planRevision || JSON.stringify(run.dependencies) !== JSON.stringify(oldRun.dependencies)) {
      throw new Error("task execution identity and consumed versions are immutable");
    }
    const effectReviewChanged = JSON.stringify(run.effectReview) !== JSON.stringify(oldRun.effectReview);
    if (oldRun.review === void 0 && run.review !== void 0 && !activeMember(run.review.reviewerId) || effectReviewChanged && run.effectReview !== void 0 && !activeMember(run.effectReview.reviewerId)) {
      throw new Error("task reviewer is not an active Team member");
    }
    if (effectReviewChanged && (run.effectReview === void 0 || run.effectReview.reviewerId === run.ownerId || run.effectReview.evidence.length === 0 || run.effectReview.observedCalls <= (oldRun.effectReview?.observedCalls ?? -1) || run.effectReview.observedCalls !== taskEffectCallCount(state, task))) {
      throw new Error("external effect review must be independent and advance observed calls");
    }
    if (oldRun.submission !== void 0 && JSON.stringify(run.submission) !== JSON.stringify(oldRun.submission) || oldRun.review !== void 0 && JSON.stringify(run.review) !== JSON.stringify(oldRun.review)) {
      throw new Error("task submission and review records cannot be rewritten");
    }
    if (run.phase === "cancelled" && (JSON.stringify(run.submission) !== JSON.stringify(oldRun.submission) || JSON.stringify(run.review) !== JSON.stringify(oldRun.review))) {
      throw new Error("cancellation must retain exactly the existing submission and review");
    }
    if (!(run.phase === "cancelled" || oldRun.phase === run.phase && effectReviewChanged || oldRun.phase === "running" && run.phase === "submitted" || oldRun.phase === "submitted" && (run.phase === "accepted" || run.phase === "rejected"))) {
      throw new Error(`task execution cannot move from ${oldRun.phase} to ${run.phase}`);
    }
    if (run.phase !== "cancelled" && !effectReviewChanged && taskWorkChanges(state, task).length > 0)
      throw new Error("stale task execution cannot submit or pass review");
  }
  switch (run.phase) {
    case "running":
    case "submitted":
      if (task.status !== "in_progress" || task.ownerId !== run.ownerId || task.result !== void 0 || task.evidence !== void 0) {
        throw new Error("unreviewed task execution must stay in progress without an accepted result");
      }
      break;
    case "accepted":
      if (task.status !== "completed" || task.ownerId !== run.ownerId || task.result !== run.submission?.result || JSON.stringify(task.evidence) !== JSON.stringify(run.submission?.evidence)) {
        throw new Error("accepted task result must match the independently reviewed submission");
      }
      break;
    case "rejected":
    case "cancelled":
      if (task.status !== "pending" && task.status !== "deleted" || task.ownerId !== void 0 || task.result !== void 0 || task.evidence !== void 0) {
        throw new Error("rejected or cancelled execution cannot retain active ownership or an accepted result");
      }
      break;
    default:
      assertNever(run.phase);
  }
}

// packages/team/modules/runtime/lib/types/projection.js
var nonNegativeSafeInteger = z8.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
var positiveSafeInteger = nonNegativeSafeInteger.min(1);
var sessionIdSchema = z8.string().min(1).transform((value) => brandString7(value));
var teamIdSchema = z8.string().min(1).transform((value) => TeamId(value));
var numericTaskIdPattern = /^task-(\d+)$/u;
var teamTaskIdSchema = z8.string().min(1).refine((value) => {
  const match = numericTaskIdPattern.exec(value);
  return match === null || Number.isSafeInteger(Number(match[1]));
}, { message: "numeric task id suffix must be a safe integer" }).transform((value) => TeamTaskId(value));
var teamMessageIdSchema = z8.string().min(1).transform((value) => TeamMessageId(value));
var teamTaskExecutionIdSchema = z8.string().min(1).transform((value) => TeamTaskExecutionId(value));
var coreContentBlockTypes = /* @__PURE__ */ new Set(["text", "reasoning", "image", "tool-call", "tool-result"]);
var imageAttachmentSchema = z8.object({
  attachmentId: z8.string().min(1),
  mediaType: z8.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]),
  bytes: nonNegativeSafeInteger,
  width: positiveSafeInteger,
  height: positiveSafeInteger,
  name: z8.string().optional()
}).strict();
var contentBlockSchema = z8.lazy(() => z8.union([
  z8.object({ type: z8.literal("text"), text: z8.string() }).strict(),
  z8.object({ type: z8.literal("reasoning"), text: z8.string() }).strict(),
  z8.object({ type: z8.literal("image"), attachment: imageAttachmentSchema }).strict(),
  z8.object({
    type: z8.literal("tool-call"),
    id: z8.string().min(1),
    name: z8.string(),
    arguments: z8.string()
  }).strict(),
  // Keep unknown JSON objects by reference; loose-object parsing drops their own __proto__ keys.
  z8.custom((value) => {
    if (typeof value !== "object" || value === null || Array.isArray(value))
      return false;
    const type = value.type;
    return typeof type === "string" && type.length > 0 && !coreContentBlockTypes.has(type);
  })
]));
var memberSettingsFields = {
  teamFunction: z8.enum([
    "planning_adviser",
    "quality_adviser",
    "domain_adviser",
    "group_lead",
    "executor",
    "verifier"
  ]).optional(),
  expert: z8.object({
    id: z8.string().min(1).transform(TeamExpertId),
    revision: positiveSafeInteger,
    name: z8.string().min(1)
  }).strict().optional(),
  modelProvider: z8.string().min(1).optional(),
  model: z8.string().min(1).optional(),
  reasoningEffort: z8.string().min(1).optional(),
  persona: z8.string().optional()
};
var teamMemberSnapshotSchema = z8.object({
  ...memberSettingsFields,
  id: sessionIdSchema,
  parentId: sessionIdSchema.optional(),
  name: z8.string(),
  description: z8.string(),
  provider: z8.string(),
  context: z8.enum(["fresh", "fork"]),
  phase: z8.enum(["provisioning", "active", "failed", "retired"]),
  error: z8.string().optional(),
  workspace: z8.object({
    cwd: z8.string().min(1),
    baselineManifestPath: z8.string().min(1),
    maxMode: z8.enum(["read-only", "workspace-write"])
  }).strict().optional()
}).strict();
var taskEvidenceFields = {
  inputKey: z8.string().min(1).optional(),
  result: z8.string().min(1).optional(),
  evidence: z8.array(z8.string().min(1)).optional()
};
var teamBriefSchema = z8.object({
  revision: positiveSafeInteger,
  goalRevision: nonNegativeSafeInteger.optional(),
  objective: z8.string().min(1),
  authorization: z8.string(),
  decisions: z8.string()
}).strict();
var teamBriefEventSchema = z8.object({
  version: z8.literal(2),
  teamId: teamIdSchema,
  brief: teamBriefSchema
}).strict();
var teamGoalProposedEventSchema = z8.object({
  version: z8.literal(2),
  teamId: teamIdSchema,
  proposal: teamGoalProposalSchema
}).strict();
var teamGoalDecidedEventSchema = z8.object({
  version: z8.literal(2),
  teamId: teamIdSchema,
  decision: teamGoalDecisionSchema
}).strict();
var teamSkillsSelectedEventSchema = z8.object({
  version: z8.literal(2),
  teamId: teamIdSchema,
  selection: teamSkillSelectionSchema
}).strict();
var teamTaskSnapshotSchema = z8.object({
  work: taskWorkSchema.optional(),
  autoAssign: z8.boolean().optional(),
  requiredSkill: z8.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).optional(),
  autoDispatch: z8.boolean().optional(),
  ...taskEvidenceFields,
  id: teamTaskIdSchema,
  revision: positiveSafeInteger,
  subject: z8.string(),
  description: z8.string(),
  status: z8.enum(["pending", "in_progress", "completed", "deleted"]),
  ownerId: sessionIdSchema.optional(),
  reviewerId: sessionIdSchema.optional(),
  blockedBy: z8.array(teamTaskIdSchema),
  writeScopes: z8.array(z8.string())
}).strict();
var teamMessageSnapshotSchema = z8.object({
  cooldownProvider: z8.string().min(1).optional(),
  notBefore: nonNegativeSafeInteger.optional(),
  id: teamMessageIdSchema,
  taskDispatch: z8.object({
    taskId: teamTaskIdSchema,
    executionId: teamTaskExecutionIdSchema,
    adviserRoleRevision: nonNegativeSafeInteger.optional(),
    kind: z8.enum(["execute", "review", "advice"])
  }).strict().optional(),
  goalRevision: nonNegativeSafeInteger.optional(),
  adoptedFrom: teamMessageIdSchema.optional(),
  senderId: sessionIdSchema,
  senderName: z8.string(),
  targetId: sessionIdSchema,
  content: z8.array(contentBlockSchema)
}).strict();
var teamEventSelectorSchema = z8.object({
  version: nonNegativeSafeInteger,
  teamId: teamIdSchema
}).loose();
var teamMemberEventSchema = z8.object({
  version: z8.literal(2),
  teamId: teamIdSchema,
  member: teamMemberSnapshotSchema.refine((member) => member.phase !== "retired", "retirement requires its own event")
}).strict();
var teamMemberRetirementEventSchema = z8.object({
  version: z8.literal(2),
  teamId: teamIdSchema,
  memberId: sessionIdSchema,
  retired: z8.boolean()
}).strict();
var teamMemberModelRouteSchema = z8.object({
  goalRevision: nonNegativeSafeInteger.optional(),
  memberId: sessionIdSchema,
  revision: positiveSafeInteger,
  modelProvider: z8.string().min(1),
  model: z8.string().min(1),
  reasoningEffort: z8.string().min(1).optional()
}).strict();
var teamMemberModelRouteEventSchema = z8.object({
  version: z8.literal(2),
  teamId: teamIdSchema,
  route: teamMemberModelRouteSchema
}).strict();
var teamMemberRoleEventSchema = z8.object({
  version: z8.literal(2),
  teamId: teamIdSchema,
  role: teamMemberRoleSchema
}).strict();
var teamTaskEventSchema = z8.object({
  version: z8.literal(2),
  teamId: teamIdSchema,
  task: teamTaskSnapshotSchema
}).strict();
var teamAdviserDecisionSchema = z8.object({
  id: z8.string().min(1),
  goalRevision: nonNegativeSafeInteger,
  taskId: teamTaskIdSchema,
  executionId: teamTaskExecutionIdSchema,
  adviserId: sessionIdSchema,
  adviserRoleRevision: nonNegativeSafeInteger.optional(),
  adviserFunction: z8.enum(["planning_adviser", "quality_adviser", "domain_adviser"]),
  decision: z8.enum(["approve", "revise"]),
  summary: z8.string().min(1),
  evidence: z8.array(z8.string().min(1)).min(1)
}).strict();
var teamAdviserDecisionEventSchema = z8.object({
  version: z8.literal(2),
  teamId: teamIdSchema,
  finding: teamAdviserDecisionSchema
}).strict();
var teamMessageQueuedEventSchema = z8.object({
  version: z8.literal(2),
  teamId: teamIdSchema,
  message: teamMessageSnapshotSchema
}).strict();
var teamMessageDeliveredEventSchema = z8.object({
  version: z8.literal(2),
  teamId: teamIdSchema,
  messageId: teamMessageIdSchema,
  targetId: sessionIdSchema
}).strict();
function emptyTeamState(rootId) {
  return {
    id: TeamId(rootId),
    members: [],
    tasks: [],
    taskEffects: [],
    messages: [],
    delivered: [],
    nextTaskNumber: 1
  };
}
var teamProjectionEntrySchema = z8.object({
  skillSelections: z8.array(teamSkillSelectionSchema).optional(),
  memberRoles: z8.array(teamMemberRoleSchema).optional(),
  modelRoutes: z8.array(teamMemberModelRouteSchema).optional(),
  ...teamGoalStateFields,
  id: teamIdSchema,
  members: z8.array(teamMemberSnapshotSchema),
  tasks: z8.array(teamTaskSnapshotSchema),
  taskEffects: z8.array(taskEffectEventSchema).optional(),
  adviserDecisions: z8.array(teamAdviserDecisionSchema).optional(),
  messages: z8.array(teamMessageSnapshotSchema),
  delivered: z8.array(teamMessageIdSchema),
  nextTaskNumber: positiveSafeInteger,
  brief: teamBriefSchema.optional(),
  failure: z8.string().optional()
}).strict();
function isTeamEvent(event) {
  return event.type === "team/brief" || event.type === "team/skills-selected" || event.type === "team/goal-proposed" || event.type === "team/goal-decided" || event.type === "team/member" || event.type === "team/member-retirement" || event.type === "team/member-model-route" || event.type === "team/member-role" || event.type === "team/task" || event.type === "team/task-effect" || event.type === "team/adviser-decision" || event.type === "team/message/queued" || event.type === "team/message/delivered";
}
function parsePersisted(type, schema, value) {
  try {
    return schema.parse(value);
  } catch (error) {
    throw new Error(`persisted Agent Teams ${type} payload is invalid`, { cause: error });
  }
}
function parseCurrentTeamEvent(event) {
  switch (event.type) {
    case "team/skills-selected":
      return { ...event, data: parsePersisted(event.type, teamSkillsSelectedEventSchema, event.data) };
    case "team/goal-proposed":
      return { ...event, data: parsePersisted(event.type, teamGoalProposedEventSchema, event.data) };
    case "team/goal-decided":
      return { ...event, data: parsePersisted(event.type, teamGoalDecidedEventSchema, event.data) };
    case "team/brief":
      return { ...event, data: parsePersisted(event.type, teamBriefEventSchema, event.data) };
    case "team/member":
      return { ...event, data: parsePersisted(event.type, teamMemberEventSchema, event.data) };
    case "team/member-retirement":
      return { ...event, data: parsePersisted(event.type, teamMemberRetirementEventSchema, event.data) };
    case "team/member-role":
      return { ...event, data: parsePersisted(event.type, teamMemberRoleEventSchema, event.data) };
    case "team/member-model-route":
      return { ...event, data: parsePersisted(event.type, teamMemberModelRouteEventSchema, event.data) };
    case "team/task":
      return { ...event, data: parsePersisted(event.type, teamTaskEventSchema, event.data) };
    case "team/task-effect":
      return { ...event, data: parsePersisted(event.type, taskEffectEventSchema, event.data) };
    case "team/adviser-decision":
      return { ...event, data: parsePersisted(event.type, teamAdviserDecisionEventSchema, event.data) };
    case "team/message/queued":
      return { ...event, data: parsePersisted(event.type, teamMessageQueuedEventSchema, event.data) };
    case "team/message/delivered":
      return { ...event, data: parsePersisted(event.type, teamMessageDeliveredEventSchema, event.data) };
    /* v8 ignore next 2 -- TeamEventType is closed and every member is handled above. */
    default:
      return event;
  }
}
function applyProjectionEvent(state, event) {
  if (state.failure !== void 0)
    return state;
  if (!isTeamEvent(event))
    return state;
  try {
    const outerSelector = parsePersisted(event.type, teamEventSelectorSchema, event.data);
    if (outerSelector.teamId !== state.id)
      return state;
    if (outerSelector.version !== 2)
      throw new Error(`unsupported Agent Teams event version ${String(outerSelector.version)}`);
    if (event.type === "team/task") {
      const outer = parsePersisted(event.type, teamTaskEventSchema, event.data);
      if (outer.teamId !== state.id)
        return state;
      const carrier = readPortableTeamRecord(outer.task);
      if (carrier !== void 0) {
        const data = z8.object({ teamId: teamIdSchema }).loose().parse(JSON.parse(carrier.payload));
        if (data.teamId !== outer.teamId)
          throw new Error("portable Team event selector differs from its carrier");
        if (carrier.type === "team/task" && "task" in data) {
          const nested = teamTaskSnapshotSchema.parse(data.task);
          if (readPortableTeamRecord(nested) !== void 0)
            throw new Error("nested portable Team event is invalid");
        }
        const decoded = { ...event, type: carrier.type, data };
        if (!isTeamEvent(decoded))
          throw new Error(`unsupported portable Team event ${carrier.type}`);
        event = decoded;
      }
    }
    const selector = parsePersisted(event.type, teamEventSelectorSchema, event.data);
    if (selector.teamId !== state.id)
      return state;
    if (selector.version !== 2) {
      throw new Error(`unsupported Agent Teams event version ${String(selector.version)}`);
    }
    return applyCurrentTeamEvent(state, parseCurrentTeamEvent(event));
  } catch (error) {
    return { ...state, failure: error instanceof Error ? error.message : String(error) };
  }
}
function replaceAt(items, index, item) {
  const next = [...items];
  if (index < 0)
    next.push(item);
  else
    next[index] = item;
  return next;
}
function applyCurrentTeamEvent(state, event) {
  switch (event.type) {
    case "team/skills-selected": {
      const selection = event.data.selection;
      assertTeamSkillSelection(state, selection);
      const prior = state.skillSelections ?? [];
      return { ...state, skillSelections: replaceAt(prior, prior.findIndex((value) => value.memberId === selection.memberId), selection) };
    }
    case "team/goal-proposed": {
      if (String(event.data.proposal.proposedBy) !== state.id)
        throw new Error("only the Team Lead may propose a goal");
      assertGoalProposal(state, event.data.proposal);
      return { ...state, goalProposal: event.data.proposal };
    }
    case "team/goal-decided": {
      const goal = applyGoalDecision(state, event.data.decision);
      return { ...state, goalDecision: event.data.decision, ...goal === void 0 ? {} : { goal } };
    }
    case "team/brief": {
      if (event.data.brief.revision !== (state.brief?.revision ?? 0) + 1) {
        throw new Error("shared brief revision is not contiguous");
      }
      return { ...state, brief: event.data.brief };
    }
    case "team/member": {
      const member = event.data.member;
      const index = state.members.findIndex((candidate) => candidate.id === member.id);
      const prior = state.members[index];
      const named = state.members.find((candidate) => candidate.name === member.name);
      if (named !== void 0 && named.id !== member.id) {
        throw new Error(`teammate name "${member.name}" is reused by another member`);
      }
      if (prior === void 0) {
        if (member.expert !== void 0 && state.members.some((candidate) => candidate.expert?.id === member.expert?.id && candidate.phase !== "failed")) {
          throw new Error("an expert is bound to multiple members in this Team");
        }
        if (member.phase !== "provisioning")
          throw new Error(`teammate "${member.name}" must begin provisioning`);
        if (member.parentId !== void 0 && String(member.parentId) !== state.id && !state.members.some((parent) => parent.id === member.parentId && parent.phase === "active")) {
          throw new Error(`teammate "${member.name}" has no active parent in this Team`);
        }
      } else {
        const legacyCopyRetry = prior.phase === "failed" && member.phase === "provisioning" && prior.workspace === void 0 && member.workspace === void 0 && member.error === void 0 && prior.error?.startsWith("Team workspace snapshot differs at ") === true;
        if (prior.name !== member.name || prior.parentId !== member.parentId || !legacyCopyRetry && (prior.provider !== member.provider || prior.context !== member.context || prior.modelProvider !== member.modelProvider || prior.model !== member.model || prior.reasoningEffort !== member.reasoningEffort || prior.persona !== member.persona) || prior.teamFunction !== member.teamFunction || prior.expert?.id !== member.expert?.id || prior.expert?.revision !== member.expert?.revision || prior.expert?.name !== member.expert?.name || prior.workspace !== void 0 && (member.workspace === void 0 || prior.workspace.cwd !== member.workspace.cwd || prior.workspace.baselineManifestPath !== member.workspace.baselineManifestPath || prior.workspace.maxMode !== member.workspace.maxMode)) {
          throw new Error(`teammate "${member.id}" changed immutable identity fields`);
        }
        const preparedWorkspace = prior.phase === "provisioning" && member.phase === "provisioning" && prior.workspace === void 0 && member.workspace !== void 0 && prior.description === member.description && prior.error === member.error;
        const retryUnmaterialized = prior.phase === "failed" && member.phase === "provisioning" && prior.workspace === void 0 && member.workspace === void 0 && member.error === void 0;
        if (!retryUnmaterialized && (prior.phase !== "provisioning" || member.phase === "provisioning" && !preparedWorkspace)) {
          throw new Error(`teammate "${member.name}" has an invalid ${prior.phase} -> ${member.phase} transition`);
        }
      }
      return { ...state, members: replaceAt(state.members, index, member) };
    }
    case "team/member-retirement": {
      const index = state.members.findIndex((member2) => member2.id === event.data.memberId);
      const member = state.members[index];
      const expected = event.data.retired ? "active" : "retired";
      if (member?.phase !== expected)
        throw new Error(`member retirement requires an existing ${expected} member`);
      return { ...state, members: replaceAt(state.members, index, { ...member, phase: event.data.retired ? "retired" : "active" }) };
    }
    case "team/member-role": {
      const role = event.data.role;
      const member = state.members.find((candidate) => candidate.id === role.memberId);
      const roles = state.memberRoles ?? [];
      const index = roles.findIndex((candidate) => candidate.memberId === role.memberId);
      if (member === void 0 || !["active", "retired"].includes(member.phase) || role.revision !== (roles[index]?.revision ?? 0) + 1) {
        throw new Error("member responsibility requires a retained member and contiguous revision");
      }
      return { ...state, memberRoles: replaceAt(roles, index, role) };
    }
    case "team/member-model-route": {
      const route = event.data.route;
      const member = state.members.find((candidate) => candidate.id === route.memberId);
      if (member === void 0 || member.phase === "failed" || member.phase === "provisioning") {
        throw new Error("model route requires an existing active or retired teammate");
      }
      const routes = state.modelRoutes ?? [];
      const index = routes.findIndex((candidate) => candidate.memberId === route.memberId);
      if (route.revision !== (routes[index]?.revision ?? 0) + 1) {
        throw new Error("member model route revision is not contiguous");
      }
      return { ...state, modelRoutes: replaceAt(routes, index, route) };
    }
    case "team/task": {
      const task = event.data.task;
      const index = state.tasks.findIndex((candidate) => candidate.id === task.id);
      const prior = state.tasks[index];
      if (prior === void 0 && task.revision !== 1) {
        throw new Error(`team task "${task.id}" must begin at revision 1`);
      }
      if (prior !== void 0 && task.revision !== prior.revision + 1) {
        throw new Error(`team task "${task.id}" revision is not contiguous`);
      }
      assertTaskGraphCandidate(state.tasks, task);
      assertTaskWorkEvent(state, prior, task);
      let nextTaskNumber = state.nextTaskNumber;
      const match = numericTaskIdPattern.exec(task.id);
      if (match !== null) {
        const number = Number(match[1]);
        nextTaskNumber = Math.max(nextTaskNumber, number === Number.MAX_SAFE_INTEGER ? number : number + 1);
      }
      return { ...state, tasks: replaceAt(state.tasks, index, task), nextTaskNumber };
    }
    case "team/task-effect":
      return { ...state, taskEffects: applyTaskEffectEvent(state, event.data) };
    case "team/adviser-decision": {
      const finding = event.data.finding;
      const adviser = state.members.find((candidate) => candidate.id === finding.adviserId);
      const task = state.tasks.find((candidate) => candidate.id === finding.taskId);
      if (state.goal?.revision !== finding.goalRevision || state.goal.status !== "active" || memberFunction(state, adviser) !== finding.adviserFunction || memberRoleRevision(state, finding.adviserId) !== (finding.adviserRoleRevision ?? 0) || adviser?.phase !== "active" || !["planning_adviser", "quality_adviser", "domain_adviser"].includes(finding.adviserFunction) || task?.status !== "in_progress" || task.work?.execution?.id !== finding.executionId || task.work.execution.phase !== "submitted" || task.ownerId === finding.adviserId || state.adviserDecisions?.some((candidate) => candidate.id === finding.id)) {
        throw new Error("adviser decision does not match a current independent submitted execution");
      }
      return { ...state, adviserDecisions: [...state.adviserDecisions ?? [], finding] };
    }
    case "team/message/queued": {
      const message = event.data.message;
      if (state.messages.some((candidate) => candidate.id === message.id)) {
        throw new Error(`team message "${message.id}" was queued twice`);
      }
      return { ...state, messages: [...state.messages, message] };
    }
    case "team/message/delivered": {
      const queued = state.messages.find((message) => message.id === event.data.messageId);
      if (queued === void 0)
        throw new Error(`team message "${event.data.messageId}" was delivered before queueing`);
      if (queued.targetId !== event.data.targetId)
        throw new Error(`team message "${event.data.messageId}" target changed`);
      if (state.delivered.includes(event.data.messageId))
        throw new Error(`team message "${event.data.messageId}" was delivered twice`);
      return { ...state, delivered: [...state.delivered, event.data.messageId] };
    }
    /* v8 ignore next 2 -- TeamEventType is closed and every member is handled above. */
    default:
      return state;
  }
}
var teamMemberProjectionSchema = z8.object({
  ...memberSettingsFields,
  modelRouteRevision: positiveSafeInteger.optional(),
  roleRevision: positiveSafeInteger.optional(),
  id: sessionIdSchema,
  parentId: sessionIdSchema.optional(),
  description: z8.string().optional(),
  name: z8.string(),
  role: z8.enum(["lead", "teammate"]),
  phase: z8.enum(["provisioning", "active", "failed", "retired"]),
  error: z8.string().optional()
}).strict();
var teamTaskViewSchema = z8.object({
  dispatchBlocker: z8.enum(["goal", "dependencies", "reviewer_missing", "adviser_review", "skills", "manual"]).optional(),
  work: taskWorkSchema.optional(),
  autoAssign: z8.boolean().optional(),
  requiredSkill: z8.string().optional(),
  validity: z8.object({ reusable: z8.boolean(), reasons: z8.array(z8.string()) }).strict(),
  recovery: z8.object({ reason: z8.literal("owner_inactive"), action: z8.enum(["resume", "reconcile", "review", "inspect"]) }).strict().optional(),
  ...taskEvidenceFields,
  id: teamTaskIdSchema,
  revision: positiveSafeInteger,
  subject: z8.string(),
  description: z8.string(),
  status: z8.enum(["pending", "in_progress", "completed", "deleted"]),
  blockedBy: z8.array(teamTaskIdSchema),
  writeScopes: z8.array(z8.string()),
  ownerName: z8.string().optional(),
  reviewerName: z8.string().optional(),
  ready: z8.boolean(),
  writeScopeWarnings: z8.array(z8.string())
}).strict();
var teamProjectionSchema = z8.object({
  adviserDecisions: z8.array(teamAdviserDecisionSchema).optional(),
  completedTaskCount: z8.number().int().nonnegative().optional(),
  skillSelections: z8.array(teamSkillSelectionViewSchema).optional(),
  ...teamGoalStateFields,
  members: z8.array(teamMemberProjectionSchema),
  tasks: z8.array(teamTaskViewSchema),
  brief: teamBriefSchema.optional(),
  failure: z8.string().optional()
}).strict();
var teamProjectionViews = /* @__PURE__ */ new WeakMap();
function buildTeamProjection(state) {
  const rootId = brandString7(state.id);
  const members = [{ id: rootId, name: "lead", role: "lead", phase: "active" }];
  for (const member of state.members) {
    const teamFunction = memberFunction(state, member);
    const route = state.modelRoutes?.find((candidate) => candidate.memberId === member.id);
    members.push({
      id: member.id,
      ...member.parentId === void 0 ? {} : { parentId: member.parentId },
      description: member.description,
      name: member.name,
      role: "teammate",
      ...teamFunction === void 0 ? {} : { teamFunction },
      ...memberRoleRevision(state, member.id) === 0 ? {} : { roleRevision: memberRoleRevision(state, member.id) },
      phase: member.phase,
      ...(route?.modelProvider ?? member.modelProvider) === void 0 ? {} : { modelProvider: route?.modelProvider ?? member.modelProvider },
      ...(route?.model ?? member.model) === void 0 ? {} : { model: route?.model ?? member.model },
      ...(route?.reasoningEffort ?? (route === void 0 ? member.reasoningEffort : void 0)) === void 0 ? {} : { reasoningEffort: route?.reasoningEffort ?? member.reasoningEffort },
      ...route === void 0 ? {} : { modelRouteRevision: route.revision },
      ...member.persona === void 0 ? {} : { persona: member.persona },
      ...member.expert === void 0 ? {} : { expert: { ...member.expert } },
      ...member.error === void 0 ? {} : { error: member.error }
    });
  }
  return {
    members,
    ...state.adviserDecisions === void 0 ? {} : { adviserDecisions: structuredClone(state.adviserDecisions) },
    ...state.skillSelections === void 0 ? {} : {
      skillSelections: state.skillSelections.map((value) => teamSkillSelectionView(state, value))
    },
    tasks: state.tasks.filter((task) => (task.status === "pending" || task.status === "in_progress") && (task.work === void 0 || task.work.plan.goalRevision === (state.goal?.revision ?? 0))).map((task) => projectTaskView(state, task)),
    completedTaskCount: state.tasks.filter((task) => task.status === "completed").length,
    ...state.brief === void 0 ? {} : { brief: structuredClone(state.brief) },
    ...state.goal === void 0 ? {} : { goal: structuredClone(state.goal) },
    ...state.goalProposal === void 0 ? {} : { goalProposal: structuredClone(state.goalProposal) },
    ...state.goalDecision === void 0 ? {} : { goalDecision: structuredClone(state.goalDecision) },
    ...state.failure === void 0 ? {} : { failure: state.failure }
  };
}
function teamProjectionView(state) {
  if (state.failure !== void 0)
    return buildTeamProjection(state);
  let byTasks = teamProjectionViews.get(state.members);
  if (byTasks === void 0) {
    byTasks = /* @__PURE__ */ new WeakMap();
    teamProjectionViews.set(state.members, byTasks);
  }
  let cached = byTasks.get(state.tasks);
  if (cached === void 0 || cached.skillSelections !== state.skillSelections || cached.modelRoutes !== state.modelRoutes || cached.memberRoles !== state.memberRoles || cached.taskEffects !== state.taskEffects || cached.adviserDecisions !== state.adviserDecisions || cached.brief !== state.brief || cached.goal !== state.goal || cached.goalProposal !== state.goalProposal || cached.goalDecision !== state.goalDecision) {
    cached = {
      memberRoles: state.memberRoles,
      brief: state.brief,
      skillSelections: state.skillSelections,
      modelRoutes: state.modelRoutes,
      taskEffects: state.taskEffects,
      adviserDecisions: state.adviserDecisions,
      view: buildTeamProjection(state),
      ...state.goal === void 0 ? {} : { goal: state.goal },
      ...state.goalProposal === void 0 ? {} : { goalProposal: state.goalProposal },
      ...state.goalDecision === void 0 ? {} : { goalDecision: state.goalDecision }
    };
    byTasks.set(state.tasks, cached);
  }
  return cached.view;
}
var teamProjectionDefinition = {
  key: "agentTeam",
  stateVersion: 19,
  stateSchema: teamProjectionEntrySchema,
  init: (header) => emptyTeamState(header.id),
  apply: applyProjectionEvent,
  wire: { viewSchema: teamProjectionSchema, view: teamProjectionView }
};

// packages/team/modules/runtime/lib/types/task-board.js
import { createHash as createHash3 } from "node:crypto";
import { assertNever as assertNever3 } from "@deepseek-ai/dsh-util-values";

// packages/team/modules/runtime/lib/types/task-work-update.js
import { brandString as brandString8 } from "@deepseek-ai/dsh-brand";
import { assertNever as assertNever2 } from "@deepseek-ai/dsh-util-values";
function planTaskWork(state, input, plannerId, previous, observed) {
  const parsed = taskPlanInputSchema.safeParse(input);
  if (!parsed.success)
    throw new TeamError("a task plan requires input_version, environment_version, and acceptance_criteria", "TEAM_TASK_PLAN_INVALID");
  const { inputPaths, adviserGate, ...declared } = parsed.data;
  const revision3 = (previous?.plan.revision ?? 0) + 1;
  if (!Number.isSafeInteger(revision3))
    throw new TeamError("task plan revision limit reached", "TEAM_TASK_REVISION_LIMIT");
  return { plan: {
    ...declared,
    ...inputPaths === void 0 ? {} : { inputPaths },
    ...adviserGate === void 0 ? {} : { adviserGate },
    revision: revision3,
    plannerId,
    goalRevision: state.goal?.revision ?? 0,
    ...observed === void 0 ? {} : observed
  }, attempts: previous?.attempts ?? 0 };
}
function pendingTask(task) {
  const { result: _result, evidence: _evidence, ownerId: _owner, ...rest } = task;
  return { ...rest, status: "pending" };
}
function requireCurrent(state, task) {
  const changes = taskWorkChanges(state, task);
  if (changes.length > 0)
    throw new TeamError(changes.join(" "), "TEAM_TASK_EXECUTION_STALE");
}
function startExecution(state, task, work, ownerId) {
  requireCurrent(state, { ...task, work: { plan: work.plan, attempts: work.attempts } });
  if (taskEffectsNeedReview(state, task)) {
    throw new TeamError("earlier tool effects still need independent review: read team_task_get for the current revision and execution_id, ask a different member to inspect receipts or actual state, then call team_task_reconcile with side_effects, review_summary, and review_evidence before another attempt", "TEAM_TASK_EFFECT_REVIEW_REQUIRED");
  }
  const busy = state.tasks.find((candidate) => candidate.id !== task.id && candidate.status === "in_progress" && candidate.ownerId === ownerId && candidate.work?.execution?.phase !== "submitted");
  if (busy !== void 0)
    throw new TeamError(`member already owns execution of ${busy.id}`, "TEAM_TASK_MEMBER_BUSY");
  const dependencies = task.blockedBy.map((taskId) => {
    const dependency = state.tasks.find((candidate) => candidate.id === taskId);
    if (dependency === void 0 || !taskRecordValidity(state, dependency).reusable) {
      throw new TeamError(`dependency ${taskId} has no current independently accepted result`, "TEAM_TASK_BLOCKED");
    }
    return { taskId, revision: dependency.revision };
  });
  const attempts = work.attempts + 1;
  if (!Number.isSafeInteger(attempts))
    throw new TeamError("task execution counter limit reached", "TEAM_TASK_REVISION_LIMIT");
  const execution = {
    id: TeamTaskExecutionId(`${task.id}/run-${attempts}`),
    ownerId,
    planRevision: work.plan.revision,
    dependencies,
    phase: "running",
    effectTracking: "observed"
  };
  return { ...pendingTask(task), status: "in_progress", ownerId, work: { plan: work.plan, attempts, execution } };
}
function executionFor(task, request) {
  const execution = task.work?.execution;
  if (execution === void 0 || request.executionId !== execution.id) {
    throw new TeamError("read the task and provide its current execution_id", "TEAM_TASK_EXECUTION_STALE");
  }
  return execution;
}
function evidenceList(values, field2) {
  if (values === void 0 || values.length === 0) {
    throw new TeamError(`${field2} must contain at least one actual verification check or receipt`, "TEAM_TASK_EVIDENCE_REQUIRED");
  }
  return values.map((value) => requiredText(value, field2, Number.MAX_SAFE_INTEGER));
}
function updateTaskWork(state, task, request, callerId, lead, observed) {
  const work = task.work;
  if (request.action === "plan") {
    if (!lead && work?.plan.plannerId !== callerId)
      throw new TeamError("only the task planner or Team Lead may revise the plan", "TEAM_TASK_UNAUTHORIZED");
    if (request.plan === void 0)
      throw new TeamError("plan requires the full task input and environment versions and acceptance criteria", "TEAM_TASK_PLAN_INVALID");
    if (task.inputKey !== void 0 && work !== void 0)
      throw new TeamError("create a new task input_key for a different plan; the keyed task retains its original result", "TEAM_TASK_INPUT_CONFLICT");
    if (work?.execution?.phase === "running" || work?.execution?.phase === "submitted") {
      throw new TeamError("release or review the current execution before replacing its plan", "TEAM_TASK_INVALID_TRANSITION");
    }
    if (taskEffectsNeedReview(state, task)) {
      throw new TeamError("review earlier tool effects before replacing this plan", "TEAM_TASK_EFFECT_REVIEW_REQUIRED");
    }
    return { ...pendingTask(task), work: planTaskWork(state, request.plan, callerId, work, observed?.plan) };
  }
  if (work === void 0) {
    if (request.action === "resume" || request.action === "review")
      throw new TeamError("record a versioned task plan before this operation", "TEAM_TASK_PLAN_REQUIRED");
    return void 0;
  }
  const owner = task.ownerId === callerId;
  const authorizeOwner = () => {
    if (!lead && !owner)
      throw new TeamError("task mutation requires its owner or Team Lead", "TEAM_TASK_UNAUTHORIZED");
  };
  switch (request.action) {
    case "claim":
      if (task.status !== "pending")
        throw new TeamError("only a pending task can start; resume an existing execution instead", "TEAM_TASK_INVALID_TRANSITION");
      return startExecution(state, task, work, callerId);
    case "resume": {
      const execution = executionFor(task, request);
      if (!owner || execution.ownerId !== callerId)
        throw new TeamError("only the executing member can resume this execution", "TEAM_TASK_UNAUTHORIZED");
      if (task.status !== "in_progress" || execution.phase !== "running")
        throw new TeamError("only a running task execution can resume", "TEAM_TASK_INVALID_TRANSITION");
      requireCurrent(state, task);
      if (taskEffectsNeedReview(state, task)) {
        throw new TeamError("independent review of earlier tool effects is required before resuming", "TEAM_TASK_EFFECT_REVIEW_REQUIRED");
      }
      return task;
    }
    case "reconcile": {
      const execution = executionFor(task, request);
      if (execution.ownerId === callerId)
        throw new TeamError("a different member must review tool effects", "TEAM_TASK_SELF_REVIEW");
      if (execution.effectReview !== void 0 && taskEffectCallCount(state, task) <= execution.effectReview.observedCalls) {
        throw new TeamError("no newer tool effects require review", "TEAM_TASK_INVALID_TRANSITION");
      }
      if (request.sideEffects !== "none" && request.sideEffects !== "known") {
        throw new TeamError("reconcile requires a definite external effect finding", "TEAM_TASK_EFFECT_REVIEW_REQUIRED");
      }
      const effectReview = {
        reviewerId: callerId,
        resolution: request.sideEffects,
        summary: requiredText(request.reviewSummary ?? "", "review_summary", Number.MAX_SAFE_INTEGER),
        evidence: evidenceList(request.reviewEvidence, "review_evidence"),
        observedCalls: taskEffectCallCount(state, task)
      };
      return { ...task, work: { ...work, execution: { ...execution, effectReview } } };
    }
    case "complete": {
      const execution = executionFor(task, request);
      if (!owner || execution.ownerId !== callerId)
        throw new TeamError("only the executing member can submit its result", "TEAM_TASK_UNAUTHORIZED");
      if (task.status !== "in_progress" || execution.phase !== "running")
        throw new TeamError("only a running execution can submit a result", "TEAM_TASK_INVALID_TRANSITION");
      requireCurrent(state, task);
      const result = requiredText(request.result ?? "", "result", Number.MAX_SAFE_INTEGER);
      const evidence = evidenceList(request.evidence, "evidence");
      return { ...task, work: { ...work, execution: { ...execution, phase: "submitted", submission: {
        result,
        evidence,
        ...observed?.submission === void 0 ? {} : observed.submission,
        sideEffects: request.sideEffects ?? (execution.effectTracking === "observed" && taskEffectCallCount(state, task) === 0 ? "none" : "unknown"),
        ...request.sideEffectEvidence === void 0 ? {} : { sideEffectEvidence: evidenceList(request.sideEffectEvidence, "side_effect_evidence") }
      } } } };
    }
    case "review": {
      const execution = executionFor(task, request);
      if (execution.ownerId === callerId)
        throw new TeamError("a different member must review the result", "TEAM_TASK_SELF_REVIEW");
      if (task.reviewerId !== void 0 && task.reviewerId !== callerId) {
        const reviewer = String(task.reviewerId) === state.id ? "lead" : state.members.find((member) => member.id === task.reviewerId)?.name ?? String(task.reviewerId);
        throw new TeamError(`only the assigned independent reviewer ${JSON.stringify(reviewer)} may review this result. Send that member the current task_id and execution_id; the Lead can use configure_review to explicitly change the reviewer without rerunning the task.`, "TEAM_TASK_UNAUTHORIZED");
      }
      if (task.status !== "in_progress" || execution.phase !== "submitted" || execution.submission === void 0) {
        throw new TeamError("only the current submitted result can be reviewed", "TEAM_TASK_INVALID_TRANSITION");
      }
      requireCurrent(state, task);
      if (request.reviewDecision === "accepted" && taskEffectsNeedReview(state, task)) {
        throw new TeamError("Before accepting, inspect the recorded tool effects and actual state, then call team_task_reconcile with the current task_id, expected_revision, execution_id, side_effects (none or known), review_summary, and review_evidence (a nonempty string array). Read the updated revision before review. Use review_decision=rejected to record missing evidence without authorizing a retry.", "TEAM_TASK_EFFECT_REVIEW_REQUIRED");
      }
      if (request.reviewDecision === void 0)
        throw new TeamError("review requires accepted or rejected", "TEAM_TASK_REVIEW_REQUIRED");
      const review = {
        reviewerId: callerId,
        decision: request.reviewDecision,
        summary: requiredText(request.reviewSummary ?? "", "review_summary", Number.MAX_SAFE_INTEGER),
        evidence: evidenceList(request.reviewEvidence, "review_evidence")
      };
      const reviewed = { ...execution, phase: request.reviewDecision, review };
      return request.reviewDecision === "accepted" ? { ...task, status: "completed", result: execution.submission.result, evidence: [...execution.submission.evidence], work: { ...work, execution: reviewed } } : { ...pendingTask(task), work: { ...work, execution: reviewed } };
    }
    case "release":
    case "reopen":
    case "delete": {
      authorizeOwner();
      if (request.action === "release" && task.status !== "in_progress" || request.action === "reopen" && task.status !== "completed") {
        throw new TeamError(`cannot ${request.action} a ${task.status} task`, "TEAM_TASK_INVALID_TRANSITION");
      }
      return {
        ...pendingTask(task),
        ...request.action === "delete" ? { status: "deleted" } : {},
        work: { ...work, ...work.execution === void 0 ? {} : { execution: { ...work.execution, phase: "cancelled" } } }
      };
    }
    case "reassign": {
      if (!lead)
        throw new TeamError("only the Team Lead can reassign tasks", "TEAM_LEAD_REQUIRED");
      if (task.status !== "pending" && task.status !== "in_progress" || work.execution?.phase === "submitted") {
        throw new TeamError("release or review the existing result before reassignment", "TEAM_TASK_INVALID_TRANSITION");
      }
      if (request.owner === void 0 || request.owner.trim() === "") {
        return { ...pendingTask(task), work: { ...work, ...work.execution === void 0 ? {} : { execution: { ...work.execution, phase: "cancelled" } } } };
      }
      const name = request.owner.trim();
      const target = name === "lead" ? brandString8(state.id) : state.members.find((member) => member.name === name && member.phase === "active")?.id;
      if (target === void 0)
        throw new TeamError(`active teammate ${name} not found`, "TEAM_MEMBER_NOT_FOUND");
      return startExecution(state, task, work, target);
    }
    case "edit":
    case "set_dependencies":
      authorizeOwner();
      throw new TeamError("revise the complete task plan or create a new keyed task before changing its inputs", "TEAM_TASK_PLAN_REQUIRED");
    case "configure_review":
    case "configure_dispatch":
      return void 0;
    default:
      return assertNever2(request.action);
  }
}

// packages/team/modules/runtime/lib/types/task-board.js
var TASK_GRAPH_ERROR_CODES = {
  missing: "TEAM_TASK_NOT_FOUND",
  duplicate: "TEAM_INVALID_ARGUMENT",
  cycle: "TEAM_TASK_DEPENDENCY_CYCLE"
};
var TeamTaskBoard = class {
  journal;
  roster;
  goals;
  maxTasks;
  deduplicateInputs;
  requireResults;
  requirePlans;
  maxWorkBytes;
  maxReceiptPaths;
  maxReceiptBytes;
  autoDispatchReadyTasks;
  enforceWriteScopeExclusivity;
  autoAssignReadyTasks;
  artifacts;
  inFlightEffects = /* @__PURE__ */ new Set();
  /**
   * @param journal - authoritative Lead-log transaction owner.
   * @param roster - exact live membership resolver.
   * @param goals - goal-revision and runtime cancellation owner.
   * @param maxTasks - maximum pending or in-progress tasks in one Team.
   * @param deduplicateInputs - reuse tasks with identical original inputs.
   * @param requireResults - require a reusable result on completion.
   * @param requirePlans - require a versioned plan before starting a task.
   * @param maxWorkBytes - maximum encoded plan, execution, and review size.
   * @param maxReceiptPaths - maximum input or artifact paths per observation.
   * @param maxReceiptBytes - maximum cumulative bytes hashed in one observation.
   * @param autoDispatchReadyTasks - mark new tasks for durable member notification after assignment.
   * @param enforceWriteScopeExclusivity - reject simultaneous assignments to overlapping declared outputs.
   * @param autoAssignReadyTasks - mark new tasks for idle matching executor assignment.
   * @param artifacts - Host-owned immutable copies of submitted file versions.
   */
  constructor(journal, roster, goals, maxTasks, deduplicateInputs, requireResults, requirePlans, maxWorkBytes, maxReceiptPaths, maxReceiptBytes, autoDispatchReadyTasks = false, enforceWriteScopeExclusivity = false, autoAssignReadyTasks = false, artifacts) {
    this.journal = journal;
    this.roster = roster;
    this.goals = goals;
    this.maxTasks = maxTasks;
    this.deduplicateInputs = deduplicateInputs;
    this.requireResults = requireResults;
    this.requirePlans = requirePlans;
    this.maxWorkBytes = maxWorkBytes;
    this.maxReceiptPaths = maxReceiptPaths;
    this.maxReceiptBytes = maxReceiptBytes;
    this.autoDispatchReadyTasks = autoDispatchReadyTasks;
    this.enforceWriteScopeExclusivity = enforceWriteScopeExclusivity;
    this.autoAssignReadyTasks = autoAssignReadyTasks;
    this.artifacts = artifacts;
  }
  /**
   * Persist an opaque tool start before dispatch under its exact running attempt.
   * @param caller - member dispatching the tool.
   * @param callId - tool-call identity from the model step.
   * @param toolName - dispatched tool name.
   * @param signal - cancellation before dispatch starts.
   * @param args - Logged tool JSON for read-only workspace action classification.
   * @returns fixed identity for the matching settlement, or undefined outside task execution.
   */
  async recordToolEffect(caller, callId, toolName, signal, args) {
    if (!taskToolNeedsEffectTracking(toolName, args))
      return void 0;
    const membership = this.roster.tryMembership(caller);
    if (membership === void 0)
      return void 0;
    const root = membership.root;
    return await this.journal.transact(root.id, async () => {
      signal.throwIfAborted();
      if (this.roster.membership(caller).root !== root)
        throw new TeamError("tool caller changed Teams", "TEAM_NOT_MEMBER");
      const state = this.journal.state(root);
      const matching = state.tasks.filter((value) => value.status === "in_progress" && value.work?.execution?.phase === "running" && value.work.execution.ownerId === caller.id);
      if (matching.length > 1)
        throw new TeamError("member has multiple running task executions", "TEAM_TASK_MEMBER_BUSY");
      const task = matching[0];
      const executionId = task?.work?.execution?.id;
      if (task === void 0 || executionId === void 0)
        return void 0;
      const token = { root, teamId: TeamId(root.id), taskId: task.id, executionId, callId, toolName };
      const event = {
        version: 2,
        teamId: token.teamId,
        taskId: token.taskId,
        executionId: token.executionId,
        callId: token.callId,
        toolName: token.toolName,
        phase: "started"
      };
      await this.journal.appendAndFlush(root, "team/task-effect", event);
      this.inFlightEffects.add(token);
      return token;
    });
  }
  /**
   * Persist tool settlement against the original attempt even if its task was replaced.
   * @param token - identity returned before dispatch.
   */
  async settleToolEffect(token) {
    try {
      await this.journal.transact(token.root.id, async () => {
        const prior = this.journal.state(token.root).taskEffects?.find((value) => value.executionId === token.executionId && value.callId === token.callId && value.taskId === token.taskId);
        if (prior?.phase !== "started")
          throw new TeamError("task tool effect start is missing", "TEAM_TASK_EXECUTION_STALE");
        const event = {
          version: 2,
          teamId: token.teamId,
          taskId: token.taskId,
          executionId: token.executionId,
          callId: token.callId,
          toolName: token.toolName,
          phase: "settled"
        };
        await this.journal.appendAndFlush(token.root, "team/task-effect", event);
      });
    } finally {
      this.inFlightEffects.delete(token);
    }
  }
  /** Observe declared inputs under the caller's current workspace. */
  async observePlan(caller, plan, signal) {
    const cwd = caller.session.header.cwd;
    if (cwd === void 0) {
      if (this.requirePlans || (plan.inputPaths?.length ?? 0) > 0) {
        throw new TeamError("task file receipts require a Session workspace", "TEAM_TASK_PLAN_INVALID");
      }
      return void 0;
    }
    const environment = await observeTaskEnvironment(cwd);
    const inputs = await observeTaskFiles(environment, plan.inputPaths ?? [], this.maxReceiptPaths, this.maxReceiptBytes, signal);
    signal.throwIfAborted();
    return { inputs, environment };
  }
  /** Observe artifacts under the exact member workspace that produced them. */
  async observeSubmission(caller, paths, signal) {
    const cwd = caller.session.header.cwd;
    if (cwd === void 0) {
      if (this.requirePlans || paths.length > 0) {
        throw new TeamError("task artifact receipts require a Session workspace", "TEAM_TASK_WORK_INVALID");
      }
      return void 0;
    }
    const environment = await observeTaskEnvironment(cwd);
    const artifacts = await observeTaskFiles(environment, paths, this.maxReceiptPaths, this.maxReceiptBytes, signal);
    await this.artifacts?.capture(environment, artifacts, signal);
    signal.throwIfAborted();
    return { artifacts, environment };
  }
  /** Bind the request before queueing and recheck its exact caller before any append. */
  async write(caller, signal, operation) {
    const membership = this.roster.membership(caller);
    const { root } = membership;
    const admitted = membership.role === "lead" && this.journal.state(root).goal === void 0 ? this.goals.capture(root, signal) : this.goals.admit(root, signal);
    admitted.throwIfAborted();
    return await this.journal.transact(root.id, async () => {
      admitted.throwIfAborted();
      const current = this.roster.membership(caller);
      if (current.root !== root)
        throw new TeamError("the calling Agent changed Teams while its write was queued", "TEAM_NOT_MEMBER");
      return await operation(current, admitted);
    });
  }
  /**
   * Create one unowned pending task in the Team Lead log.
   * @param request - task text, blockers, and advisory write scopes.
   * @param caller - exact live member whose identity is retained as the planner.
   * @param signal - caller cancellation before append; an appended event finishes its checkpoint.
   * @returns the revision-one task view.
   */
  async create(caller, request, signal) {
    return await this.write(caller, signal, async ({ root }, admitted) => {
      const state = this.journal.state(root);
      const subject2 = requiredText(request.subject, "subject", 200);
      const project = readProjectPlan(state.goal?.definition.plan);
      const planned = project?.tasks.find((task2) => task2.id === request.inputKey);
      if (project !== void 0 && planned === void 0) {
        throw new TeamError("input_key must identify a task in the confirmed project plan; review new work before creating it", "TEAM_TASK_PLAN_REQUIRED");
      }
      if (planned?.critical && request.plan !== void 0 && request.plan.adviserGate !== "dual") {
        request = { ...request, plan: { ...request.plan, adviserGate: "dual" } };
      }
      if (planned !== void 0) {
        if (request.reviewer !== void 0 && request.reviewer !== planned.reviewer) {
          throw new TeamError("reviewer must match the confirmed project task", "TEAM_TASK_PLAN_INVALID");
        }
        const expected = planned.dependencies.map((id3) => state.tasks.find((task2) => task2.inputKey === id3)?.id);
        if (expected.some((id3) => id3 === void 0) || JSON.stringify([...expected].sort()) !== JSON.stringify([...request.blockedBy ?? []].sort()) || JSON.stringify(request.plan?.acceptanceCriteria) !== JSON.stringify(planned.acceptanceCriteria) || JSON.stringify([...request.writeScopes ?? []].sort()) !== JSON.stringify([...planned.outputs].sort()) || JSON.stringify([...request.plan?.inputPaths ?? []].sort()) !== JSON.stringify([...planned.inputs].sort())) {
          throw new TeamError("task dependencies, input paths, output scopes and acceptance criteria must match the confirmed project task; create dependencies first", "TEAM_TASK_PLAN_INVALID");
        }
      }
      const description = requiredText(request.description, "description", 16384);
      const blockedBy = this.dependencies(request.blockedBy ?? [], state);
      const writeScopes = this.writeScopes(request.writeScopes ?? []);
      const requiredSkill = request.requiredSkill === void 0 ? void 0 : requiredText(request.requiredSkill, "required_skill", 200);
      if (requiredSkill !== void 0 && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(requiredSkill)) {
        throw new TeamError("required_skill must be an installed kebab-case skill name", "TEAM_INVALID_ARGUMENT");
      }
      const autoAssign = request.autoAssign ?? this.autoAssignReadyTasks;
      const reviewerId = request.reviewer === void 0 ? void 0 : resolveActiveMember(root, state, requiredText(request.reviewer, "reviewer", 200)).id;
      const work = request.plan === void 0 ? void 0 : planTaskWork(state, request.plan, caller.id, void 0, await this.observePlan(caller, request.plan, admitted));
      const inputKey = request.inputKey === void 0 ? this.deduplicateInputs ? createHash3("sha256").update(JSON.stringify([
        subject2,
        description,
        [...blockedBy].sort(),
        [...writeScopes].sort(),
        ...work === void 0 ? [] : [
          work.plan.inputVersion,
          work.plan.environmentVersion,
          work.plan.acceptanceCriteria,
          work.plan.adviserGate,
          work.plan.goalRevision,
          work.plan.inputs,
          work.plan.environment
        ]
      ])).digest("hex") : void 0 : requiredText(request.inputKey, "input_key", 256);
      const existing = inputKey === void 0 ? void 0 : state.tasks.find((task2) => task2.inputKey === inputKey && task2.status !== "deleted");
      if (existing !== void 0) {
        if (existing.subject !== subject2 || existing.description !== description || JSON.stringify([...existing.blockedBy].sort()) !== JSON.stringify([...blockedBy].sort()) || JSON.stringify([...existing.writeScopes].sort()) !== JSON.stringify([...writeScopes].sort()) || existing.reviewerId !== reviewerId || existing.requiredSkill !== requiredSkill || existing.autoAssign === true !== autoAssign || existing.work?.plan.inputVersion !== work?.plan.inputVersion || existing.work?.plan.environmentVersion !== work?.plan.environmentVersion || existing.work?.plan.adviserGate !== work?.plan.adviserGate || JSON.stringify(existing.work?.plan.inputs) !== JSON.stringify(work?.plan.inputs) || JSON.stringify(existing.work?.plan.environment) !== JSON.stringify(work?.plan.environment) || existing.work?.plan.goalRevision !== work?.plan.goalRevision || JSON.stringify(existing.work?.plan.acceptanceCriteria) !== JSON.stringify(work?.plan.acceptanceCriteria)) {
          throw new TeamError("input_key already identifies different task inputs; use a new input version", "TEAM_TASK_INPUT_CONFLICT");
        }
        if (existing.status === "completed") {
          if (existing.work === void 0)
            return projectTaskView(state, existing);
          const checked = await this.validateReuse(caller, existing.id, admitted);
          if (!checked.validity.reusable)
            throw new TeamError(checked.validity.reasons.join(" "), "TEAM_TASK_EXECUTION_STALE");
          return { ...projectTaskView(state, existing), validity: checked.validity };
        }
        return projectTaskView(state, existing);
      }
      if (this.deduplicateInputs && request.inputKey === void 0) {
        const duplicate = state.tasks.find((task2) => task2.status !== "deleted" && task2.subject === subject2 && JSON.stringify([...task2.blockedBy].sort()) === JSON.stringify([...blockedBy].sort()) && JSON.stringify([...task2.writeScopes].sort()) === JSON.stringify([...writeScopes].sort()) && task2.work?.plan.inputVersion === work?.plan.inputVersion && task2.work?.plan.environmentVersion === work?.plan.environmentVersion && task2.work?.plan.goalRevision === work?.plan.goalRevision);
        if (duplicate !== void 0) {
          throw new TeamError(`task ${duplicate.id} already covers this subject and input version; inspect it or supply a distinct input_key for changed requirements`, "TEAM_TASK_INPUT_CONFLICT");
        }
      }
      const active = state.tasks.filter((task2) => (task2.status === "pending" || task2.status === "in_progress") && (task2.work === void 0 || task2.work.plan.goalRevision === (state.goal?.revision ?? 0))).length;
      if (active >= this.maxTasks) {
        throw new TeamError(`Team task limit ${this.maxTasks} reached`, "TEAM_TASK_LIMIT");
      }
      const id2 = TeamTaskId(`task-${state.nextTaskNumber}`);
      if (state.tasks.some((task2) => task2.id === id2)) {
        throw new TeamError("Team task id space exhausted", "TEAM_TASK_LIMIT");
      }
      const task = {
        id: id2,
        revision: 1,
        subject: subject2,
        description,
        status: "pending",
        ...this.autoDispatchReadyTasks ? { autoDispatch: true } : {},
        blockedBy,
        writeScopes,
        ...autoAssign ? { autoAssign: true } : {},
        ...requiredSkill === void 0 ? {} : { requiredSkill },
        ...reviewerId === void 0 ? {} : { reviewerId },
        ...inputKey === void 0 ? {} : { inputKey },
        ...work === void 0 ? {} : { work }
      };
      this.validateWork(task);
      this.assertTaskGraph(state, task);
      if (work?.plan.environment !== void 0)
        await this.artifacts?.capture(work.plan.environment, work.plan.inputs ?? [], admitted);
      admitted.throwIfAborted();
      if (this.roster.membership(caller).root !== root)
        throw new TeamError("task caller changed Teams during file observation", "TEAM_NOT_MEMBER");
      await this.journal.appendAndFlush(root, "team/task", { version: 2, teamId: TeamId(root.id), task });
      return projectTaskView(state, task);
    });
  }
  /**
   * Return one task, including a deleted tombstone.
   * @param membership - exact caller membership resolved by the Team roster.
   * @param id - Team-local task identity.
   * @returns the latest task value and derived readiness diagnostics.
   */
  get(membership, id2) {
    const { root } = membership;
    const state = this.journal.state(root);
    const task = state.tasks.find((candidate) => candidate.id === id2);
    if (task === void 0)
      throw new TeamError(`team task "${id2}" not found`, "TEAM_TASK_NOT_FOUND");
    return this.withRecovery(membership, state, task);
  }
  /**
   * List current pending and in-progress tasks in numeric creation order.
   * @param membership - exact caller membership resolved by the Team roster.
   * @returns detached current task views.
   */
  list(membership) {
    const { root } = membership;
    const state = this.journal.state(root);
    return state.tasks.filter((task) => (task.status === "pending" || task.status === "in_progress") && (task.work === void 0 || task.work.plan.goalRevision === (state.goal?.revision ?? 0))).map((task) => this.withRecovery(membership, state, task));
  }
  /** Add current member activity without changing the durable task or its revision. */
  withRecovery(membership, state, task) {
    const view = projectTaskView(state, task);
    if (task.status !== "in_progress" || task.ownerId === void 0)
      return view;
    const owner = this.roster.list(membership).find((member) => member.id === task.ownerId);
    if (owner?.status !== "inactive")
      return view;
    const execution = task.work?.execution;
    const action = taskEffectsNeedReview(state, task) ? "reconcile" : execution?.phase === "submitted" ? "review" : execution?.phase === "running" && taskWorkChanges(state, task).length === 0 ? "resume" : "inspect";
    return { ...view, recovery: { reason: "owner_inactive", action } };
  }
  /**
   * List completed tasks in stable creation order, one bounded page at a time.
   * @param membership - exact caller membership resolved by the Team roster.
   * @param request - exclusive creation cursor and requested page size, at most 50.
   * @returns completed task views and a cursor when another page exists.
   */
  listArchive(membership, request) {
    if (!Number.isSafeInteger(request.limit) || request.limit < 1 || request.limit > 50) {
      throw new TeamError("archive page limit must be 1 through 50", "TEAM_INVALID_ARGUMENT");
    }
    const state = this.journal.state(membership.root);
    const start = request.after === void 0 ? 0 : state.tasks.findIndex((task) => task.id === request.after) + 1;
    if (request.after !== void 0 && start === 0)
      throw new TeamError("archive cursor task not found", "TEAM_TASK_NOT_FOUND");
    const page = state.tasks.slice(start).filter((task) => task.status === "completed" || task.work !== void 0 && task.work.plan.goalRevision !== (state.goal?.revision ?? 0)).slice(0, request.limit + 1);
    const tasks = page.slice(0, request.limit).map((task) => projectTaskView(state, task));
    const last = tasks.at(-1);
    return { tasks, ...page.length > request.limit && last !== void 0 ? { nextCursor: last.id } : {} };
  }
  /**
   * Re-observe a completed result's files and local runtime before a caller reuses it.
   * @param caller - current Team member requesting reuse.
   * @param id - completed task identity.
   * @param signal - cancellation for bounded file reads.
   * @returns current receipts and a validity decision scoped to the observed task revision.
   */
  async validateReuse(caller, id2, signal) {
    return await this.validateReuseWithDependencies(caller, id2, signal, /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map());
  }
  /**
   * Validate explicit accepted inputs for a downstream task, including their expected published updates.
   * @param caller - Exact live member requesting the handoff.
   * @param ids - Declared prerequisite task identities, or the final delivery task.
   * @param signal - Cancellation during file and dependency checks.
   * @returns one check per requested task; unrelated changes remain invalid.
   */
  async validateHandoff(caller, ids, signal) {
    const state = this.journal.state(this.roster.membership(caller).root);
    const included = /* @__PURE__ */ new Set();
    const visit = (id2) => {
      if (included.has(id2))
        return;
      included.add(id2);
      for (const dependency of state.tasks.find((task) => task.id === id2)?.blockedBy ?? [])
        visit(dependency);
    };
    for (const id2 of ids)
      visit(id2);
    const nodes = state.tasks.map((task) => ({
      id: task.id,
      dependencies: task.blockedBy,
      artifacts: included.has(task.id) && taskRecordValidity(state, task).reusable ? task.work?.execution?.submission?.artifacts ?? [] : []
    }));
    selectPublicationArtifacts(nodes);
    const replacements = /* @__PURE__ */ new Map();
    for (const receipt of nodes.flatMap((node) => node.artifacts)) {
      const versions = replacements.get(receipt.path) ?? [];
      versions.push(receipt);
      replacements.set(receipt.path, versions);
    }
    const checked = /* @__PURE__ */ new Map();
    const results = [];
    for (const id2 of ids)
      results.push(await this.validateReuseWithDependencies(caller, id2, signal, checked, replacements));
    return results;
  }
  /** Recheck each accepted dependency once under the same cancellation signal. */
  async validateReuseWithDependencies(caller, id2, signal, checked, replacements) {
    const prior = checked.get(id2);
    if (prior !== void 0)
      return prior;
    const membership = this.roster.membership(caller);
    const state = this.journal.state(membership.root);
    const task = state.tasks.find((candidate) => candidate.id === id2);
    if (task === void 0)
      throw new TeamError(`team task "${id2}" not found`, "TEAM_TASK_NOT_FOUND");
    const recorded = structuredClone(task);
    const reasons = [...taskRecordValidity(state, task).reasons];
    let inputs = [];
    let artifacts = [];
    let environment;
    let artifactEnvironment;
    if (recorded.work?.plan.environment !== void 0) {
      try {
        environment = await observeTaskEnvironment(recorded.work.plan.environment.workspaceRoot);
        inputs = await observeTaskFiles(environment, recorded.work.plan.inputPaths ?? [], this.maxReceiptPaths, this.maxReceiptBytes, signal);
      } catch (error) {
        if (signal.aborted)
          throw error;
        reasons.push(`Input recheck failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    const submitted = recorded.work?.execution?.submission;
    if (submitted?.environment !== void 0) {
      try {
        if (this.artifacts === void 0) {
          artifactEnvironment = await observeTaskEnvironment(submitted.environment.workspaceRoot);
          artifacts = await observeTaskFiles(artifactEnvironment, submitted.artifacts?.map((item) => item.path) ?? [], this.maxReceiptPaths, this.maxReceiptBytes, signal);
        } else {
          artifactEnvironment = { ...submitted.environment, platform: process.platform, arch: process.arch, nodeVersion: process.version };
          artifacts = await this.artifacts.verify(artifactEnvironment, submitted.artifacts ?? [], this.maxReceiptPaths, this.maxReceiptBytes, signal);
        }
      } catch (error) {
        if (signal.aborted)
          throw error;
        reasons.push(`Artifact recheck failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    signal.throwIfAborted();
    if (JSON.stringify(environment) !== JSON.stringify(recorded.work?.plan.environment))
      reasons.push("Input runtime changed.");
    if (JSON.stringify(artifactEnvironment) !== JSON.stringify(submitted?.environment))
      reasons.push("Artifact runtime changed.");
    const expectedInputs = recorded.work?.plan.inputs;
    if (expectedInputs === void 0 || inputs.length !== expectedInputs.length || inputs.some((input, index) => {
      const expected = expectedInputs[index];
      const published = replacements.get(input.path) ?? [];
      return ![expected, ...published].some((candidate) => candidate?.path === input.path && candidate.bytes === input.bytes && candidate.sha256 === input.sha256);
    }))
      reasons.push("Task inputs changed.");
    if (JSON.stringify(artifacts) !== JSON.stringify(submitted?.artifacts))
      reasons.push("Task artifacts changed.");
    for (const dependency of recorded.work?.execution?.dependencies ?? []) {
      const dependencyCheck = await this.validateReuseWithDependencies(caller, dependency.taskId, signal, checked, replacements);
      if (!dependencyCheck.validity.reusable || dependencyCheck.revision !== dependency.revision) {
        reasons.push(`Dependency ${dependency.taskId} has no current reusable result.`);
      }
    }
    const currentState = this.journal.state(membership.root);
    const current = currentState.tasks.find((candidate) => candidate.id === id2);
    if (current?.revision !== recorded.revision)
      reasons.push("Task changed during recheck.");
    else
      reasons.push(...taskRecordValidity(currentState, current).reasons);
    if (this.roster.membership(caller).root !== membership.root)
      reasons.push("Task caller changed Teams during recheck.");
    const result = {
      taskId: id2,
      revision: recorded.revision,
      checkedAt: Date.now(),
      validity: { reusable: reasons.length === 0, reasons: [...new Set(reasons)] },
      inputs,
      artifacts,
      ...environment === void 0 ? {} : { environment },
      ...artifactEnvironment === void 0 ? {} : { artifactEnvironment }
    };
    checked.set(id2, result);
    return result;
  }
  /**
   * Compare-and-set one authorized task transition.
   * @param caller - exact live Team member authorizing the mutation.
   * @param request - task identity, expected revision, action, and action fields.
   * @param signal - caller cancellation before append; an appended event finishes its checkpoint.
   * @returns the committed next task revision.
   */
  async update(caller, request, signal) {
    return await this.write(caller, signal, async (membership, admitted) => {
      const root = membership.root;
      const state = this.journal.state(root);
      const current = state.tasks.find((task2) => task2.id === request.taskId);
      if (current === void 0)
        throw new TeamError(`team task "${request.taskId}" not found`, "TEAM_TASK_NOT_FOUND");
      if (current.revision !== request.expectedRevision) {
        throw new TeamError(`stale team task "${current.id}" revision ${request.expectedRevision}; current revision is ${current.revision}. Read team_task_get({"task_id":"${current.id}"}) and verify the current execution before retrying. Current execution: ${current.work?.execution?.id ?? "none"}; phase: ${current.work?.execution?.phase ?? current.status}.`, "TEAM_TASK_STALE_REVISION");
      }
      if (current.status === "deleted")
        throw new TeamError(`team task "${current.id}" is deleted`, "TEAM_TASK_DELETED");
      if (request.action === "reconcile") {
        for (const token of this.inFlightEffects) {
          if (token.root === root && token.taskId === current.id && token.executionId === current.work?.execution?.id) {
            throw new TeamError("wait for running tools to settle before reviewing their effects", "TEAM_TASK_EFFECT_REVIEW_REQUIRED");
          }
        }
      }
      const lead = membership.role === "lead";
      const projectTask = readProjectPlan(state.goal?.definition.plan)?.tasks.find((task2) => task2.id === current.inputKey);
      if (projectTask !== void 0 && (request.action === "reassign" && request.owner?.trim() && request.owner !== projectTask.owner || request.action === "claim" && membership.name !== projectTask.owner || request.action === "configure_review" && request.reviewer !== projectTask.reviewer)) {
        throw new TeamError("owner and reviewer must match the confirmed project task", "TEAM_TASK_UNAUTHORIZED");
      }
      if (request.action === "plan" && projectTask !== void 0 && (JSON.stringify(request.plan?.acceptanceCriteria) !== JSON.stringify(projectTask.acceptanceCriteria) || projectTask.critical && request.plan?.adviserGate !== "dual" || JSON.stringify([...request.plan?.inputPaths ?? []].sort()) !== JSON.stringify([...projectTask.inputs].sort()))) {
        throw new TeamError("revised task plan must retain the confirmed criteria and critical review policy; review project changes first", "TEAM_TASK_PLAN_INVALID");
      }
      if (projectTask !== void 0 && (request.writeScopes !== void 0 && JSON.stringify([...request.writeScopes].sort()) !== JSON.stringify([...projectTask.outputs].sort()) || request.blockedBy !== void 0 && JSON.stringify([...request.blockedBy].sort()) !== JSON.stringify(projectTask.dependencies.map((id2) => state.tasks.find((task2) => task2.inputKey === id2)?.id).sort()))) {
        throw new TeamError("outputs and dependencies must retain the confirmed project plan; review project changes first", "TEAM_TASK_PLAN_INVALID");
      }
      const requestedOwner = request.action === "claim" ? caller.id : request.action === "reassign" && request.owner?.trim() ? resolveActiveMember(root, state, request.owner).id : void 0;
      if (requestedOwner !== void 0 && memberFunction(state, state.members.find((member) => member.id === requestedOwner))?.endsWith("_adviser")) {
        throw new TeamError("advisers cannot own execution tasks; assign an executor or verifier", "TEAM_TASK_UNAUTHORIZED");
      }
      if (request.reviewer !== void 0 && request.action !== "configure_review") {
        throw new TeamError("reviewer requires action configure_review", "TEAM_INVALID_ARGUMENT");
      }
      if (current.work !== void 0 && (request.action === "claim" || request.action === "reassign" && request.owner?.trim())) {
        for (const checked of await this.validateHandoff(caller, current.blockedBy, admitted)) {
          if (!checked.validity.reusable)
            throw new TeamError(`dependency ${checked.taskId}: ${checked.validity.reasons.join(" ")}`, "TEAM_TASK_BLOCKED");
        }
      }
      const owner = current.ownerId === caller.id;
      if (request.action === "review" && request.reviewDecision === "accepted" && current.work?.plan.adviserGate === "dual") {
        if (!hasDualAdviserApproval(state, current)) {
          throw new TeamError("key result requires separate planning and quality adviser approvals on this submitted execution", "TEAM_ADVISER_QUORUM_REQUIRED");
        }
      }
      const authorizeOwner = () => {
        if (!lead && !owner)
          throw new TeamError("task mutation requires its owner or Team Lead", "TEAM_TASK_UNAUTHORIZED");
      };
      let next;
      if (current.work === void 0 && this.requirePlans && (request.action === "claim" || request.action === "reassign" && request.owner?.trim())) {
        throw new TeamError("record a versioned task plan before starting work", "TEAM_TASK_PLAN_REQUIRED");
      }
      const definition2 = request.action === "plan" ? {
        ...current,
        ...request.subject === void 0 ? {} : { subject: requiredText(request.subject, "subject", 200) },
        ...request.description === void 0 ? {} : { description: requiredText(request.description, "description", 16384) },
        ...request.blockedBy === void 0 ? {} : { blockedBy: this.dependencies(request.blockedBy, state, current.id) },
        ...request.writeScopes === void 0 ? {} : { writeScopes: this.writeScopes(request.writeScopes) }
      } : current;
      const observedPlan = request.action === "plan" && request.plan !== void 0 ? await this.observePlan(caller, request.plan, admitted) : void 0;
      const observedSubmission = request.action === "complete" && current.work !== void 0 ? await this.observeSubmission(caller, request.artifactPaths ?? [], admitted) : void 0;
      if (projectTask !== void 0 && request.action === "complete") {
        const paths = observedSubmission?.artifacts.map((artifact) => artifact.path.replaceAll("\\", "/")) ?? [];
        const outputs = projectTask.outputs.map((path) => path.replaceAll("\\", "/"));
        if (outputs.some((scope) => !paths.some((path) => path === scope || path.startsWith(scope + "/"))) || paths.some((path) => !outputs.some((scope) => path === scope || path.startsWith(scope + "/")))) {
          throw new TeamError("artifact_paths must contain actual files covering each planned output, with no undeclared output", "TEAM_TASK_EVIDENCE_REQUIRED");
        }
      }
      const observed = {
        ...observedPlan === void 0 ? {} : { plan: observedPlan },
        ...observedSubmission === void 0 ? {} : { submission: observedSubmission }
      };
      const workUpdate = updateTaskWork(state, definition2, request, caller.id, lead, observed);
      if (workUpdate === current)
        return projectTaskView(state, current);
      if (workUpdate !== void 0)
        next = workUpdate;
      else
        switch (request.action) {
          case "claim":
            if (state.tasks.some((candidate) => candidate.id !== current.id && candidate.ownerId === caller.id && candidate.status === "in_progress" && candidate.work?.execution?.phase !== "submitted")) {
              throw new TeamError("member already owns a running task", "TEAM_TASK_MEMBER_BUSY");
            }
            if (current.ownerId !== void 0 && current.ownerId !== caller.id) {
              throw new TeamError(`team task "${current.id}" is owned by another member`, "TEAM_TASK_ALREADY_CLAIMED");
            }
            if (current.status !== "pending" || !taskReady(state, current)) {
              throw new TeamError(`team task "${current.id}" is not ready to claim`, "TEAM_TASK_BLOCKED");
            }
            next = { ...current, status: "in_progress", ownerId: caller.id };
            break;
          case "release":
            authorizeOwner();
            if (current.status !== "in_progress")
              throw new TeamError("only an in-progress task can be released", "TEAM_TASK_INVALID_TRANSITION");
            next = this.withoutOwner({ ...current, status: "pending" });
            break;
          case "edit":
            authorizeOwner();
            if (request.subject === void 0 && request.description === void 0 && request.writeScopes === void 0) {
              throw new TeamError("task edit requires subject, description, or write_scopes", "TEAM_INVALID_ARGUMENT");
            }
            next = {
              ...current,
              ...request.subject === void 0 ? {} : { subject: requiredText(request.subject, "subject", 200) },
              ...request.description === void 0 ? {} : { description: requiredText(request.description, "description", 16384) },
              ...request.writeScopes === void 0 ? {} : { writeScopes: this.writeScopes(request.writeScopes) }
            };
            break;
          case "configure_review": {
            if (!lead)
              throw new TeamError("only the Team Lead can assign a reviewer", "TEAM_LEAD_REQUIRED");
            if (current.status !== "pending" && current.status !== "in_progress") {
              throw new TeamError("a completed task retains its original review; reopen it before assigning a new reviewer", "TEAM_TASK_INVALID_TRANSITION");
            }
            const reviewer = resolveActiveMember(root, state, requiredText(request.reviewer ?? "", "reviewer", 200));
            if (reviewer.id === current.ownerId) {
              throw new TeamError("the executor cannot review its own result", "TEAM_TASK_SELF_REVIEW");
            }
            const notify = this.autoDispatchReadyTasks && current.work?.execution?.phase === "submitted";
            if (reviewer.id === current.reviewerId && (!notify || current.autoDispatch === true))
              return projectTaskView(state, current);
            next = { ...current, reviewerId: reviewer.id, ...notify ? { autoDispatch: true } : {} };
            break;
          }
          case "configure_dispatch": {
            if (!lead)
              throw new TeamError("only the Team Lead can configure automatic task dispatch", "TEAM_LEAD_REQUIRED");
            if (current.status !== "pending" && !(current.status === "in_progress" && request.autoAssign === false && request.requiredSkill === void 0)) {
              throw new TeamError("only disabling auto_assign is supported during execution or review; enable dispatch or change required_skill while pending", "TEAM_TASK_INVALID_TRANSITION");
            }
            if (request.autoAssign === void 0 && request.requiredSkill === void 0) {
              throw new TeamError("configure_dispatch requires auto_assign or required_skill", "TEAM_INVALID_ARGUMENT");
            }
            const requiredSkill = request.requiredSkill === void 0 ? current.requiredSkill : requiredText(request.requiredSkill, "required_skill", 200);
            if (requiredSkill !== void 0 && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(requiredSkill)) {
              throw new TeamError("required_skill must be an installed kebab-case skill name", "TEAM_INVALID_ARGUMENT");
            }
            next = {
              ...current,
              autoAssign: request.autoAssign ?? current.autoAssign ?? false,
              ...this.autoDispatchReadyTasks ? { autoDispatch: true } : {},
              ...requiredSkill === void 0 ? {} : { requiredSkill }
            };
            break;
          }
          case "set_dependencies":
            authorizeOwner();
            if (request.blockedBy === void 0)
              throw new TeamError("set_dependencies requires blocked_by", "TEAM_INVALID_ARGUMENT");
            next = { ...current, blockedBy: this.dependencies(request.blockedBy, state, current.id) };
            break;
          case "complete":
            authorizeOwner();
            if (current.status !== "in_progress")
              throw new TeamError("only an in-progress task can complete", "TEAM_TASK_INVALID_TRANSITION");
            if (!taskReady(state, current))
              throw new TeamError("task dependencies must remain complete at submission", "TEAM_TASK_BLOCKED");
            if (this.requireResults && (request.result === void 0 || request.result.trim().length === 0)) {
              throw new TeamError("complete requires a reusable result; include verification evidence when available", "TEAM_TASK_RESULT_REQUIRED");
            }
            next = {
              ...current,
              status: "completed",
              ...request.result === void 0 ? {} : { result: requiredText(request.result, "result", 16384) },
              ...request.evidence === void 0 ? {} : { evidence: request.evidence.map((value) => requiredText(value, "evidence", 4096)) }
            };
            break;
          case "reopen":
            authorizeOwner();
            if (current.status !== "completed")
              throw new TeamError("only a completed task can reopen", "TEAM_TASK_INVALID_TRANSITION");
            next = pendingTask(current);
            break;
          case "reassign": {
            if (!lead)
              throw new TeamError("only the Team Lead can reassign tasks", "TEAM_LEAD_REQUIRED");
            if (current.status !== "pending" && current.status !== "in_progress") {
              throw new TeamError("only a pending or in-progress task can be reassigned", "TEAM_TASK_INVALID_TRANSITION");
            }
            if (request.owner === void 0 || request.owner.trim().length === 0) {
              next = this.withoutOwner({ ...current, status: "pending" });
              break;
            }
            if (!taskReady(state, current))
              throw new TeamError(`team task "${current.id}" is blocked`, "TEAM_TASK_BLOCKED");
            const assignee = resolveActiveMember(root, state, request.owner);
            if (state.tasks.some((candidate) => candidate.id !== current.id && candidate.ownerId === assignee.id && candidate.status === "in_progress" && candidate.work?.execution?.phase !== "submitted")) {
              throw new TeamError("member already owns a running task", "TEAM_TASK_MEMBER_BUSY");
            }
            next = { ...current, status: "in_progress", ownerId: assignee.id };
            break;
          }
          case "delete": {
            authorizeOwner();
            const dependent = state.tasks.find((task2) => task2.status !== "deleted" && task2.id !== current.id && task2.blockedBy.includes(current.id));
            if (dependent !== void 0) {
              throw new TeamError(`team task "${current.id}" still blocks "${dependent.id}"`, "TEAM_TASK_HAS_DEPENDENTS");
            }
            next = { ...current, status: "deleted" };
            break;
          }
          /* v8 ignore next 6 -- Work-only actions return or throw in updateTaskWork. */
          case "plan":
          case "resume":
          case "review":
          case "reconcile":
            throw new TeamError("task execution action was not handled", "TEAM_TASK_INVALID_TRANSITION");
          default:
            assertNever3(request.action);
        }
      const task = {
        ...next,
        revision: current.revision + 1
      };
      if (task.reviewerId !== void 0 && task.ownerId === task.reviewerId && task.status === "in_progress") {
        throw new TeamError("task reviewer must be different from the executing member", "TEAM_TASK_SELF_REVIEW");
      }
      if (this.enforceWriteScopeExclusivity && task.status === "in_progress" && task.work?.execution?.phase !== "submitted" && task.writeScopes.length > 0) {
        const conflicting = state.tasks.find((candidate) => candidate.id !== task.id && candidate.status === "in_progress" && candidate.work?.execution?.phase !== "submitted" && task.writeScopes.some((left) => candidate.writeScopes.some((right) => scopesOverlap(left, right))));
        if (conflicting !== void 0) {
          throw new TeamError(`declared output paths overlap with running task ${conflicting.id}; finish or release that task before assigning this one`, "TEAM_TASK_WRITE_SCOPE_CONFLICT");
        }
      }
      if (task.status === "in_progress") {
        const conflict = resourceConflicts(state, task)[0];
        if (conflict !== void 0)
          throw new TeamError(`exclusive resource is owned by task ${conflict}; wait for its acceptance or reconcile and release it`, "TEAM_TASK_RESOURCE_BUSY");
      }
      if (current.status === "completed" && (task.status === "pending" || task.status === "in_progress") && state.tasks.filter((candidate) => candidate.status === "pending" || candidate.status === "in_progress").length >= this.maxTasks) {
        throw new TeamError(`Team task limit ${this.maxTasks} reached`, "TEAM_TASK_LIMIT");
      }
      if (!Number.isSafeInteger(task.revision))
        throw new TeamError("task revision limit reached", "TEAM_TASK_REVISION_LIMIT");
      this.validateWork(task);
      this.assertTaskGraph(state, task);
      if (task.work?.plan.environment !== void 0 && task.work.plan.revision !== current.work?.plan.revision) {
        await this.artifacts?.capture(task.work.plan.environment, task.work.plan.inputs ?? [], admitted);
      }
      admitted.throwIfAborted();
      if (this.roster.membership(caller).root !== root || this.journal.state(root).tasks.find((value) => value.id === current.id)?.revision !== current.revision) {
        throw new TeamError("task caller or revision changed during file observation", "TEAM_TASK_EXECUTION_STALE");
      }
      await this.journal.appendAndFlush(root, "team/task", { version: 2, teamId: TeamId(root.id), task });
      return projectTaskView(state, task);
    });
  }
  /** Validate the bounded durable work value before it enters the Session log. */
  validateWork(task) {
    if (task.work === void 0)
      return;
    if (Buffer.byteLength(JSON.stringify(task.work), "utf8") > this.maxWorkBytes) {
      throw new TeamError(`task work record exceeds ${this.maxWorkBytes} bytes`, "TEAM_TASK_WORK_TOO_LARGE");
    }
    const parsed = taskWorkSchema.safeParse(task.work);
    if (!parsed.success)
      throw new TeamError("task execution or review fields are invalid", "TEAM_TASK_WORK_INVALID");
  }
  /** Validate and de-duplicate dependency ids against the current task graph. */
  dependencies(values, state, self) {
    const seen = /* @__PURE__ */ new Set();
    const result = [];
    for (const id2 of values) {
      if (id2 === self)
        throw new TeamError("a team task cannot block itself", "TEAM_TASK_DEPENDENCY_CYCLE");
      if (seen.has(id2))
        throw new TeamError(`duplicate blocker "${id2}"`, "TEAM_INVALID_ARGUMENT");
      const task = state.tasks.find((candidate) => candidate.id === id2);
      if (task === void 0 || task.status === "deleted") {
        throw new TeamError(`blocker task "${id2}" not found`, "TEAM_TASK_NOT_FOUND");
      }
      seen.add(id2);
      result.push(id2);
    }
    return result;
  }
  /** Normalize and de-duplicate task write scopes. */
  writeScopes(values) {
    return [...new Set(values.map(writeScope))];
  }
  /** Map shared task-graph validation onto stable command error codes. */
  assertTaskGraph(state, candidate) {
    try {
      assertTaskGraphCandidate(state.tasks, candidate);
    } catch (error) {
      if (!(error instanceof TeamTaskGraphError))
        throw error;
      throw new TeamError(error.message, TASK_GRAPH_ERROR_CODES[error.violation], { cause: error });
    }
  }
  /** Remove an optional owner field under exactOptionalPropertyTypes. */
  withoutOwner(task) {
    const { ownerId: _ownerId, ...without } = task;
    return without;
  }
};

// packages/team/modules/runtime/lib/types/skill-selection.js
import { createHash as createHash4 } from "node:crypto";
var TeamSkillSelections = class {
  ctx;
  journal;
  roster;
  goals;
  maxSkills;
  maxBytes;
  /**
   * @param ctx - Context hosting Team skill providers.
   * @param journal - Root Session transaction owner.
   * @param roster - Exact live caller and durable target lookup.
   * @param goals - Current goal admission and revision cancellation.
   * @param maxSkills - Maximum selected modules per member.
   * @param maxBytes - Maximum encoded selection size, including saved content.
   */
  constructor(ctx, journal, roster, goals, maxSkills, maxBytes) {
    this.ctx = ctx;
    this.journal = journal;
    this.roster = roster;
    this.goals = goals;
    this.maxSkills = maxSkills;
    this.maxBytes = maxBytes;
  }
  /**
   * Resolve and validate an initial choice before creating its member or submitting work.
   * @param caller - Exact live parent in the Team.
   * @param memberId - Reserved identity of the future child.
   * @param choices - Only the modules required by the delegated task.
   * @param signal - Caller and goal cancellation throughout resolution.
   * @returns detached revision-one selection ready for the roster transaction.
   */
  async prepare(caller, memberId, choices, signal) {
    signal.throwIfAborted();
    const requested = structuredClone(choices);
    const state = this.journal.state(this.roster.membership(caller).root);
    const goalRevision = state.goal?.revision ?? 0;
    if (requested.length > this.maxSkills)
      throw new TeamError(`skill selection exceeds ${this.maxSkills} modules`, "TEAM_SKILLS_LIMIT");
    const skills = await Promise.all(requested.map(async (choice) => {
      const resolved = await this.ctx.waterfall("team/resolve-skill", { agent: caller, name: choice.name, signal }, () => Promise.reject(new TeamError(`no Team skill provider resolves ${choice.name}`, "TEAM_SKILL_UNAVAILABLE")));
      signal.throwIfAborted();
      if (resolved.name !== choice.name)
        throw new TeamError("skill provider returned a different module", "TEAM_SKILLS_INVALID");
      return { ...resolved, purpose: choice.purpose };
    }));
    signal.throwIfAborted();
    return this.decode({ memberId, selectedBy: caller.id, revision: 1, goalRevision, skills });
  }
  /**
   * Copy one member's pinned instruction bytes to its replacement before the first model request.
   * @param caller - Team Lead or the source member's direct parent.
   * @param sourceId - Existing member whose choice remains in the Team log.
   * @param memberId - Reserved identity of the replacement.
   * @returns Validated revision-one choice, or undefined when the source has no choice.
   */
  copyForSuccessor(caller, sourceId, memberId) {
    const membership = this.roster.membership(caller);
    const state = this.journal.state(membership.root);
    const source = state.members.find((member) => member.id === sourceId);
    if (source === void 0 || caller !== membership.root && source.parentId !== caller.id) {
      throw new TeamError("only the Lead or direct parent can inherit a member skill choice", "TEAM_INVALID_TARGET");
    }
    const previous = state.skillSelections?.find((selection) => selection.memberId === sourceId);
    if (previous === void 0)
      return void 0;
    if (!teamSkillSelectionView(state, previous).active) {
      throw new TeamError("the source skill choice belongs to an earlier goal", "TEAM_SKILLS_STALE_GOAL");
    }
    return this.decode({
      memberId,
      selectedBy: caller.id,
      revision: 1,
      goalRevision: previous.goalRevision,
      skills: structuredClone(previous.skills)
    });
  }
  /**
   * Read compact metadata, including the caller's own choice during provisioning.
   * @param caller - Exact live Team member.
   * @param member - Durable target name; omitted means the caller.
   * @returns Saved choice or revision zero before the first choice.
   */
  read(caller, member) {
    const membership = this.roster.membership(caller);
    const state = this.journal.state(membership.root);
    const targetName = member?.trim() ?? membership.name;
    const targetId = targetName === membership.name ? caller.id : resolveActiveMember(membership.root, state, targetName).id;
    const selection = state.skillSelections?.find((value) => value.memberId === targetId);
    return selection === void 0 ? { memberId: targetId, revision: 0, goalRevision: state.goal?.revision ?? 0, active: false, skills: [] } : teamSkillSelectionView(state, selection);
  }
  /**
   * Read the caller's exact selected instruction version.
   * @param caller - Exact live Team member.
   * @param name - Selected module name.
   * @returns Detached saved content, or undefined when this module is not selected.
   */
  content(caller, name) {
    const state = this.journal.state(this.roster.membership(caller).root);
    const selection = state.skillSelections?.find((value) => value.memberId === caller.id);
    const skill = selection?.skills.find((value) => value.name === name);
    if (skill === void 0 || selection === void 0)
      return void 0;
    if (!teamSkillSelectionView(state, selection).active) {
      throw new TeamError("the selected skills belong to an earlier goal; select the applicable skills for this goal", "TEAM_SKILLS_STALE_GOAL");
    }
    this.checkDigest(skill);
    return { ...skill };
  }
  /**
   * Replace one member's entire choice using the current revision.
   * @param caller - Exact live member, direct parent, or Lead.
   * @param request - Expected revision, target, and fully resolved instruction snapshots.
   * @param signal - Cancellation before the record is appended.
   * @returns Committed metadata; identical choices reuse the current revision.
   */
  async select(caller, request, signal) {
    const membership = this.roster.membership(caller);
    const { root } = membership;
    const admitted = membership.role === "lead" && this.journal.state(root).goal === void 0 ? this.goals.capture(root, signal) : this.goals.admit(root, signal);
    admitted.throwIfAborted();
    return await this.journal.transact(root.id, async () => {
      admitted.throwIfAborted();
      if (this.roster.membership(caller).root !== root)
        throw new TeamError("caller changed Teams while selecting skills", "TEAM_NOT_MEMBER");
      const state = this.journal.state(root);
      const target = resolveActiveMember(root, state, request.member ?? membership.name);
      const previous = state.skillSelections?.find((value) => value.memberId === target.id);
      if (request.expectedRevision !== (previous?.revision ?? 0))
        throw new TeamError("skill selection changed; read its current revision", "TEAM_SKILLS_STALE_REVISION");
      const selection = this.decode({
        memberId: target.id,
        selectedBy: caller.id,
        revision: request.expectedRevision + 1,
        goalRevision: state.goal?.revision ?? 0,
        skills: request.skills
      });
      assertTeamSkillSelection(state, selection);
      if (previous?.goalRevision === selection.goalRevision && JSON.stringify(previous.skills) === JSON.stringify(selection.skills)) {
        return teamSkillSelectionView(state, previous);
      }
      await this.journal.appendAndFlush(root, "team/skills-selected", { version: 2, teamId: membership.id, selection });
      return teamSkillSelectionView(this.journal.state(root), selection);
    });
  }
  /**
   * Rebind reviewed saved skill bytes to the current goal without reading a newer module version.
   * @param caller - Exact Team Lead or direct parent of the selected member.
   * @param member - Retained target name.
   * @param expectedRevision - Saved selection revision reviewed for this goal.
   * @param signal - Cancellation before the new selection is recorded.
   * @returns current-goal selection retaining every prior content digest.
   */
  async rebind(caller, member, expectedRevision, signal) {
    const membership = this.roster.membership(caller);
    const state = this.journal.state(membership.root);
    const target = resolveActiveMember(membership.root, state, member);
    const previous = state.skillSelections?.find((value) => value.memberId === target.id);
    if (caller !== membership.root && state.members.find((value) => value.id === target.id)?.parentId !== caller.id) {
      throw new TeamError("only the Lead or direct parent can approve saved skills for another goal", "TEAM_LEAD_REQUIRED");
    }
    if (previous === void 0 || expectedRevision !== previous.revision) {
      throw new TeamError("read the saved skill selection and its revision before rebinding", "TEAM_SKILLS_STALE_REVISION");
    }
    return await this.select(caller, { member, expectedRevision, skills: structuredClone(previous.skills) }, signal);
  }
  /** Validate detached durable values and deployment limits for every selection writer. */
  decode(value) {
    const parsed = teamSkillSelectionSchema.safeParse(value);
    if (!parsed.success)
      throw new TeamError("invalid skill selection fields", "TEAM_SKILLS_INVALID");
    const selection = parsed.data;
    if (selection.skills.length > this.maxSkills || Buffer.byteLength(JSON.stringify(selection), "utf8") > this.maxBytes) {
      throw new TeamError(`skill selection exceeds ${this.maxSkills} modules or ${this.maxBytes} bytes`, "TEAM_SKILLS_LIMIT");
    }
    for (const skill of selection.skills) {
      if (skill.purpose.length > 200 || /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(skill.purpose)) {
        throw new TeamError("skill purpose must be one short text line", "TEAM_SKILLS_INVALID");
      }
      this.checkDigest(skill);
    }
    return selection;
  }
  /** A saved digest must identify the content used by the model. */
  checkDigest(skill) {
    if (createHash4("sha256").update(skill.content).digest("hex") !== skill.digest) {
      throw new TeamError(`saved content digest differs for ${skill.name}`, "TEAM_SKILLS_DIGEST_MISMATCH");
    }
  }
};

// packages/team/modules/runtime/lib/types/workspace-runtime.js
import { mkdir as mkdir5, stat as stat3 } from "node:fs/promises";
import { isAbsolute as isAbsolute6, join as join4, relative as relative6, resolve as resolve6, sep as sep6 } from "node:path";
import { SandboxedFileSystem } from "@deepseek-ai/dsh-fs-sandbox";
import { SandboxBashExecutor } from "@deepseek-ai/dsh-bash-sandbox";
import { SandboxPwshExecutor } from "@deepseek-ai/dsh-pwsh-sandbox";
import { NodePtcRuntime } from "@deepseek-ai/dsh-ptc-runtime-node";

// packages/team/modules/runtime/lib/types/workspaces.js
import { createHash as createHash5, randomUUID as randomUUID4 } from "node:crypto";
import { constants, createReadStream } from "node:fs";
import { cp, lstat, mkdir as mkdir3, mkdtemp, readFile, readdir, readlink, realpath as realpath4, rename, rm, rmdir, stat as stat2, symlink, unlink as unlink2, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute as isAbsolute3, join as join3, relative as relative3, resolve as resolve3, sep as sep3 } from "node:path";
function isEntry(value) {
  return typeof value === "object" && value !== null && ("kind" in value && value.kind === "file" && "sha256" in value && typeof value.sha256 === "string" && /^[a-f0-9]{64}$/u.test(value.sha256) || "kind" in value && value.kind === "symlink" && "target" in value && typeof value.target === "string");
}
function parseReceipt(value, root) {
  if (typeof value !== "object" || value === null || !("version" in value) || value.version !== 1 || !("paths" in value) || !Array.isArray(value.paths) || !("desired" in value) || typeof value.desired !== "object" || value.desired === null || !("applied" in value) || !Array.isArray(value.applied)) {
    throw new Error("invalid Team workspace integration receipt");
  }
  const candidate = value;
  if (candidate.paths.some((key) => typeof key !== "string") || candidate.applied.some((key) => typeof key !== "string") || new Set(candidate.paths).size !== candidate.paths.length || candidate.applied.some((key) => !candidate.paths.includes(key)) || Object.keys(candidate.desired).length !== candidate.paths.length || candidate.paths.some((key) => !Object.hasOwn(candidate.desired, key) || candidate.desired[key] !== null && !isEntry(candidate.desired[key]))) {
    throw new Error("invalid Team workspace integration receipt");
  }
  for (const key of candidate.paths)
    relativePath(root, key);
  return candidate;
}
function includesPath(key, paths) {
  return paths === void 0 || paths.some((path) => path === "." || key === path || key.startsWith(`${path}/`) || path.startsWith(`${key}/`));
}
function selectedPath(key, limits) {
  const root = key.split("/")[0] ?? "";
  if (chosenDirectory(root, limits?.readOnlySharedDirectories))
    return false;
  if (chosenDirectory(root, limits?.omittedDirectories)) {
    return limits?.includedOmittedPaths !== void 0 && includesPath(key, limits.includedOmittedPaths);
  }
  return includesPath(key, limits?.includedPaths);
}
async function checkAutomaticWorkspaceSize(root, limits, signal) {
  let files = 0;
  let bytes = 0;
  async function walk(directory, prefix) {
    signal?.throwIfAborted();
    for (const item of await readdir(directory, { withFileTypes: true })) {
      signal?.throwIfAborted();
      const key = prefix === "" ? item.name : `${prefix}/${item.name}`;
      if (!selectedPath(key, limits))
        continue;
      const path = join3(directory, item.name);
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
  await walk(root, "");
}
var integrationTails = /* @__PURE__ */ new Map();
function directoryIdentity(name) {
  return process.platform === "win32" ? name.toLowerCase() : name;
}
function chosenDirectory(name, choices) {
  return choices?.some((choice) => directoryIdentity(choice) === directoryIdentity(name)) ?? false;
}
function inside(root, candidate) {
  const rel = relative3(root, candidate);
  return rel === "" || rel !== ".." && !rel.startsWith(`..${sep3}`) && !isAbsolute3(rel);
}
function assertSeparate(sharedRoot, storageRoot) {
  if (inside(sharedRoot, storageRoot) || inside(storageRoot, sharedRoot)) {
    throw new Error("Team workspace storage must be outside the shared workspace");
  }
}
function relativePath(root, key) {
  const parts = key.split("/");
  if (parts.some((part) => part === "" || part === "." || part === ".." || part.includes("\\") || part.includes(":")) || isAbsolute3(key)) {
    throw new Error(`invalid Team workspace path ${JSON.stringify(key)}`);
  }
  const path = resolve3(root, ...parts);
  if (!inside(root, path) || path === root)
    throw new Error(`Team workspace path escapes its root: ${key}`);
  return path;
}
async function digest(path) {
  const hash2 = createHash5("sha256");
  for await (const chunk of createReadStream(path)) {
    if (!Buffer.isBuffer(chunk))
      throw new Error("Team workspace file stream returned non-binary data");
    hash2.update(chunk);
  }
  return hash2.digest("hex");
}
async function scan(root, limits) {
  const entries = /* @__PURE__ */ Object.create(null);
  let files = 0;
  let bytes = 0;
  const topLevelBytes = /* @__PURE__ */ new Map();
  async function walk(directory, prefix) {
    limits?.signal?.throwIfAborted();
    for (const item of await readdir(directory, { withFileTypes: true })) {
      limits?.signal?.throwIfAborted();
      const key = prefix === "" ? item.name : `${prefix}/${item.name}`;
      if (!selectedPath(key, limits))
        continue;
      const path = join3(directory, item.name);
      const info = await lstat(path);
      if (info.isDirectory())
        await walk(path, key);
      else if (info.isFile() || info.isSymbolicLink()) {
        files += 1;
        bytes += info.size;
        const topLevel = key.split("/")[0] ?? key;
        topLevelBytes.set(topLevel, (topLevelBytes.get(topLevel) ?? 0) + info.size);
        if (limits !== void 0 && (files > limits.maxFiles || bytes > limits.maxBytes)) {
          const largest = [...topLevelBytes].sort((left, right) => right[1] - left[1]).slice(0, 3).map(([name, size]) => `${name} ${size} bytes`).join(", ");
          throw new Error(`Team workspace exceeds configured file or byte limit at ${key}: ${files}/${limits.maxFiles} files, ${bytes}/${limits.maxBytes} bytes. Largest scanned roots: ${largest}. Select member working_paths for the required inputs.`);
        }
        if (info.isFile())
          entries[key] = { kind: "file", sha256: await digest(path) };
        else
          entries[key] = { kind: "symlink", target: await readlink(path) };
      } else
        throw new Error(`Team workspace contains unsupported file type: ${key}`);
    }
  }
  await walk(root, "");
  return entries;
}
function checkedDirectoryChoices(limits) {
  const names = [...limits.omittedDirectories ?? [], ...limits.readOnlySharedDirectories ?? []];
  if (names.some((name) => typeof name !== "string"))
    throw new Error("Team workspace directory choices must be strings");
  const identities = names.map(directoryIdentity);
  if (new Set(identities).size !== names.length || names.some((name) => name === "" || name === "." || name === ".." || name.includes("/") || name.includes("\\") || name.includes(":"))) {
    throw new Error("Team workspace directory choices must be distinct top-level names");
  }
}
function checkedLimits(limits) {
  if (!Number.isSafeInteger(limits.maxFiles) || limits.maxFiles < 1 || !Number.isSafeInteger(limits.maxBytes) || limits.maxBytes < 1) {
    throw new Error("Team workspace limits must be positive safe integers");
  }
  checkedDirectoryChoices(limits);
  for (const key of limits.includedPaths ?? []) {
    if (key !== ".")
      relativePath(resolve3("."), key);
  }
  for (const key of limits.includedOmittedPaths ?? [])
    relativePath(resolve3("."), key);
}
async function entryAt(root, key) {
  const path = relativePath(root, key);
  let info;
  try {
    info = await lstat(path);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")
      return void 0;
    throw error;
  }
  if (info.isFile())
    return { kind: "file", sha256: await digest(path) };
  if (info.isSymbolicLink())
    return { kind: "symlink", target: await readlink(path) };
  throw new Error(`Team workspace path is not a regular file: ${key}`);
}
async function assertPlainParents(root, key) {
  const parts = key.split("/");
  for (let count = 1; count < parts.length; count += 1) {
    const parent = relativePath(root, parts.slice(0, count).join("/"));
    try {
      const info = await lstat(parent);
      if (!info.isDirectory() || info.isSymbolicLink())
        throw new Error(`Team workspace parent is not a real directory: ${key}`);
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")
        return;
      throw error;
    }
  }
}
function equalEntry(left, right) {
  return left?.kind === right?.kind && (left?.kind === "file" && right?.kind === "file" ? left.sha256 === right.sha256 : left?.kind === "symlink" && right?.kind === "symlink" ? left.target === right.target : left === right);
}
async function checkedRoot(path) {
  if (!isAbsolute3(path))
    throw new Error("Team workspace paths must be absolute");
  const root = await realpath4(path);
  if (!(await stat2(root)).isDirectory())
    throw new Error(`Team workspace root is not a directory: ${path}`);
  return root;
}
async function removeAllocatedTree(storageRoot, path) {
  if (path === storageRoot || !inside(storageRoot, path))
    throw new Error("Team workspace cleanup path escaped storage");
  const info = await lstat(path);
  if (info.isSymbolicLink()) {
    await unlink2(path);
    return;
  }
  if (!info.isDirectory()) {
    await unlink2(path);
    return;
  }
  for (const name of await readdir(path))
    await removeAllocatedTree(storageRoot, join3(path, name));
  await rmdir(path);
}
async function createMemberWorkspace(sharedPath, storagePath, limits) {
  checkedLimits(limits);
  limits.signal?.throwIfAborted();
  const sharedRoot = await checkedRoot(sharedPath);
  const storageRoot = await checkedRoot(storagePath);
  assertSeparate(sharedRoot, storageRoot);
  const sourceBeforeCopy = await scan(sharedRoot, limits);
  const memberRoot = await mkdtemp(join3(storageRoot, "team-member-"));
  const workspaceRoot = join3(memberRoot, "work");
  try {
    const rootNames = new Map((await readdir(sharedRoot)).map((name) => [directoryIdentity(name), name]));
    for (const name of [...limits.omittedDirectories ?? [], ...limits.readOnlySharedDirectories ?? []]) {
      const actual = rootNames.get(directoryIdentity(name));
      if (actual !== void 0 && !(await lstat(join3(sharedRoot, actual))).isDirectory()) {
        throw new Error(`Team workspace directory choice is not a directory: ${name}`);
      }
    }
    await cp(sharedRoot, workspaceRoot, {
      recursive: true,
      force: false,
      errorOnExist: true,
      dereference: false,
      verbatimSymlinks: true,
      mode: constants.COPYFILE_FICLONE,
      filter: (source) => {
        limits.signal?.throwIfAborted();
        const rel = relative3(sharedRoot, source);
        return rel === "" || selectedPath(rel.split(sep3).join("/"), limits);
      }
    });
    for (const name of limits.readOnlySharedDirectories ?? []) {
      const actual = rootNames.get(directoryIdentity(name));
      if (actual !== void 0) {
        await symlink(await realpath4(join3(sharedRoot, actual)), join3(workspaceRoot, actual), process.platform === "win32" ? "junction" : "dir");
      }
    }
    const sourceAfterCopy = await scan(sharedRoot, limits);
    const copyEntries = await scan(workspaceRoot, limits);
    const keys = /* @__PURE__ */ new Set([...Object.keys(sourceBeforeCopy), ...Object.keys(sourceAfterCopy), ...Object.keys(copyEntries)]);
    const differences = [...keys].filter((key) => !equalEntry(sourceBeforeCopy[key], sourceAfterCopy[key]) || !equalEntry(sourceAfterCopy[key], copyEntries[key]));
    if (differences.length > 0) {
      throw new Error(`Team workspace snapshot differs at ${differences.length} paths: ${differences.slice(0, 5).join(", ")}. Select stable member working_paths that omit changing logs or state, or wait for project writes to finish before creating a new member.`);
    }
    const manifest = {
      version: 1,
      sharedRoot,
      workspaceRoot,
      entries: sourceAfterCopy,
      omittedDirectories: [...limits.omittedDirectories ?? []],
      readOnlySharedDirectories: [...limits.readOnlySharedDirectories ?? []],
      ...limits.includedPaths === void 0 ? {} : { includedPaths: [...limits.includedPaths] },
      ...limits.includedOmittedPaths === void 0 ? {} : { includedOmittedPaths: [...limits.includedOmittedPaths] }
    };
    const baselineManifestPath = join3(memberRoot, "baseline.json");
    await writeFile(baselineManifestPath, JSON.stringify(manifest), { encoding: "utf8", flag: "wx", mode: 384 });
    return { cwd: workspaceRoot, baselineManifestPath };
  } catch (error) {
    await removeAllocatedTree(storageRoot, memberRoot);
    throw error;
  }
}
async function loadManifest(workspace, sharedPath) {
  const sharedRoot = await checkedRoot(sharedPath);
  const workspaceRoot = await checkedRoot(workspace.cwd);
  const manifestPath = resolve3(workspace.baselineManifestPath);
  if (inside(workspaceRoot, manifestPath) || dirname(manifestPath) !== dirname(workspaceRoot)) {
    throw new Error("Team workspace baseline must remain outside the member cwd");
  }
  if (!(await lstat(manifestPath)).isFile())
    throw new Error("Team workspace baseline is not a regular file");
  const parsed = JSON.parse(await readFile(manifestPath, "utf8"));
  if (typeof parsed !== "object" || parsed === null || !("version" in parsed) || parsed.version !== 1 || !("sharedRoot" in parsed) || parsed.sharedRoot !== sharedRoot || !("workspaceRoot" in parsed) || parsed.workspaceRoot !== workspaceRoot || !("entries" in parsed) || typeof parsed.entries !== "object" || parsed.entries === null || !("omittedDirectories" in parsed) || !Array.isArray(parsed.omittedDirectories) || !("readOnlySharedDirectories" in parsed) || !Array.isArray(parsed.readOnlySharedDirectories)) {
    throw new Error("Team workspace baseline does not match its current roots");
  }
  const manifest = parsed;
  if (manifest.includedPaths !== void 0 && (!Array.isArray(manifest.includedPaths) || manifest.includedPaths.some((key) => typeof key !== "string")))
    throw new Error("invalid Team workspace included paths");
  for (const key of manifest.includedPaths ?? [])
    if (key !== ".")
      relativePath(sharedRoot, key);
  if (manifest.includedOmittedPaths !== void 0 && (!Array.isArray(manifest.includedOmittedPaths) || manifest.includedOmittedPaths.some((key) => typeof key !== "string")))
    throw new Error("invalid Team workspace included omitted paths");
  for (const key of manifest.includedOmittedPaths ?? [])
    relativePath(sharedRoot, key);
  checkedDirectoryChoices({
    maxFiles: 1,
    maxBytes: 1,
    omittedDirectories: manifest.omittedDirectories,
    readOnlySharedDirectories: manifest.readOnlySharedDirectories
  });
  for (const [key, entry2] of Object.entries(manifest.entries)) {
    relativePath(sharedRoot, key);
    if (!isEntry(entry2)) {
      throw new Error(`invalid Team workspace baseline entry ${key}`);
    }
  }
  return manifest;
}
async function publishFile(target, bytes) {
  await mkdir3(dirname(target), { recursive: true });
  const temp = join3(dirname(target), `.${basename(target)}.${randomUUID4()}.team-tmp`);
  try {
    await writeFile(temp, bytes, { flag: "wx", mode: 384 });
    await rename(temp, target);
  } finally {
    await rm(temp, { force: true });
  }
}
async function saveReceipt(path, receipt, first) {
  if (first) {
    await writeFile(path, JSON.stringify(receipt), { flag: "wx", mode: 384 });
    return;
  }
  const temp = `${path}.${randomUUID4()}.tmp`;
  try {
    await writeFile(temp, JSON.stringify(receipt), { flag: "wx", mode: 384 });
    await rename(temp, path);
  } finally {
    await rm(temp, { force: true });
  }
}
async function integrateUnchecked(sharedPath, workspace, limits, admitPath) {
  if (limits.publication === void 0)
    throw new Error("Team publication requires independently accepted artifact receipts");
  checkedLimits(limits);
  limits.signal?.throwIfAborted();
  const baseline = await loadManifest(workspace, sharedPath);
  const { includedPaths: _includedPaths, includedOmittedPaths: _includedOmittedPaths, ...integrationLimits } = limits;
  const scanLimits = {
    ...integrationLimits,
    omittedDirectories: baseline.omittedDirectories,
    readOnlySharedDirectories: baseline.readOnlySharedDirectories,
    ...baseline.includedOmittedPaths === void 0 ? {} : { includedOmittedPaths: baseline.includedOmittedPaths }
  };
  const selected = limits.publication.map((file) => file.path);
  const member = await scan(baseline.workspaceRoot, { ...scanLimits, includedPaths: selected, includedOmittedPaths: selected });
  const shared = await scan(baseline.sharedRoot, { ...scanLimits, includedPaths: selected, includedOmittedPaths: selected });
  for (const file of limits.publication) {
    relativePath(baseline.workspaceRoot, file.path);
    const entry2 = member[file.path];
    if (entry2?.kind !== "file" || entry2.sha256 !== file.sha256 || (await stat2(relativePath(baseline.workspaceRoot, file.path))).size !== file.bytes) {
      throw new Error(`Accepted Team artifact changed or is missing: ${file.path}`);
    }
  }
  const paths = [...new Set(selected)].filter((key) => !equalEntry(baseline.entries[key], member[key])).sort();
  if (paths.some((key) => member[key] === void 0)) {
    throw new Error("Team integration never infers deletions from missing member files; retain the shared originals and submit an explicit deletion review");
  }
  const receiptPath = join3(dirname(workspace.baselineManifestPath), "integration.json");
  let previous;
  try {
    previous = parseReceipt(JSON.parse(await readFile(receiptPath, "utf8")), baseline.sharedRoot);
  } catch (error) {
    if (!(typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"))
      throw error;
  }
  if (previous !== void 0 && paths.length === 0 && await Promise.all(previous.paths.map(async (key) => equalEntry(await entryAt(baseline.sharedRoot, key), previous.desired[key] ?? void 0))).then((matches) => matches.every(Boolean))) {
    await rm(receiptPath, { force: true });
    return { paths: previous.paths };
  }
  const desired = Object.fromEntries(paths.map((key) => [key, member[key] ?? null]));
  if (previous !== void 0 && (JSON.stringify(previous.paths) !== JSON.stringify(paths) || JSON.stringify(previous.desired) !== JSON.stringify(desired))) {
    throw new Error("Team workspace changed after integration began; resolve the pending receipt before retrying");
  }
  for (const key of paths) {
    limits.signal?.throwIfAborted();
    await admitPath?.(key);
    await assertPlainParents(baseline.sharedRoot, key);
    if (!equalEntry(shared[key], baseline.entries[key]) && !(previous !== void 0 && equalEntry(shared[key], member[key]))) {
      throw new Error(`Team workspace integration conflict: ${key}`);
    }
    if (member[key]?.kind === "symlink" || baseline.entries[key]?.kind === "symlink") {
      throw new Error(`Team workspace integration cannot change a symbolic link: ${key}`);
    }
  }
  let receipt = previous ?? { version: 1, paths, desired, applied: [] };
  if (previous === void 0 && paths.length > 0)
    await saveReceipt(receiptPath, receipt, true);
  for (const key of paths) {
    limits.signal?.throwIfAborted();
    await admitPath?.(key);
    const target = relativePath(baseline.sharedRoot, key);
    const source = relativePath(baseline.workspaceRoot, key);
    await assertPlainParents(baseline.sharedRoot, key);
    const current = await entryAt(baseline.sharedRoot, key);
    if (previous !== void 0 && equalEntry(current, member[key]))
      continue;
    if (!equalEntry(current, baseline.entries[key])) {
      throw new Error(`Team workspace integration conflict: ${key}`);
    }
    if (!equalEntry(await entryAt(baseline.workspaceRoot, key), member[key])) {
      throw new Error(`Team workspace changed during integration: ${key}`);
    }
    const memberEntry = member[key];
    if (memberEntry !== void 0) {
      const bytes = await readFile(source);
      if (memberEntry.kind !== "file" || createHash5("sha256").update(bytes).digest("hex") !== memberEntry.sha256) {
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
    const entry2 = member[key];
    if (entry2 === void 0)
      throw new Error(`Team artifact disappeared from the publication scan: ${key}`);
    entries[key] = entry2;
  }
  const nextManifest = { ...baseline, entries };
  const manifestTemp = `${workspace.baselineManifestPath}.${randomUUID4()}.tmp`;
  try {
    await writeFile(manifestTemp, JSON.stringify(nextManifest), { flag: "wx", mode: 384 });
    await rename(manifestTemp, workspace.baselineManifestPath);
  } finally {
    await rm(manifestTemp, { force: true });
  }
  if (paths.length > 0 || previous !== void 0)
    await rm(receiptPath, { force: true });
  return { paths };
}
async function integrateMemberWorkspace(sharedPath, workspace, limits, admitPath) {
  if (limits.publication === void 0)
    throw new Error("Team publication requires independently accepted artifact receipts");
  const sharedRoot = await checkedRoot(sharedPath);
  const prior = integrationTails.get(sharedRoot) ?? Promise.resolve();
  const integrate = async () => {
    if (limits.coordinationRoot === void 0)
      return integrateUnchecked(sharedRoot, workspace, limits, admitPath);
    const locks = new CoordinationLocks(limits.coordinationRoot, limits.coordinationWaitMs ?? 3e4, limits.coordinationPollMs ?? 50);
    try {
      return await locks.publish(sharedRoot, limits.signal, () => integrateUnchecked(sharedRoot, workspace, limits, admitPath));
    } finally {
      locks.close();
    }
  };
  const run = prior.then(integrate, integrate);
  const tail = run.then(() => void 0, () => void 0);
  integrationTails.set(sharedRoot, tail);
  try {
    return await run;
  } finally {
    if (integrationTails.get(sharedRoot) === tail)
      integrationTails.delete(sharedRoot);
  }
}

// packages/team/modules/runtime/lib/types/workspace-refresh.js
import { createHash as createHash6, randomUUID as randomUUID5 } from "node:crypto";
import { lstat as lstat2, mkdir as mkdir4, readFile as readFile2, realpath as realpath5, rename as rename2, rm as rm2, writeFile as writeFile2 } from "node:fs/promises";
import { dirname as dirname2, isAbsolute as isAbsolute4, relative as relative4, resolve as resolve4, sep as sep4 } from "node:path";
import { z as z9 } from "zod";
var entry = z9.union([
  z9.object({ kind: z9.literal("file"), sha256: z9.string() }).strict(),
  z9.object({ kind: z9.literal("symlink"), target: z9.string() }).strict()
]);
var manifestSchema = z9.object({
  version: z9.literal(1),
  sharedRoot: z9.string(),
  workspaceRoot: z9.string(),
  entries: z9.record(z9.string(), entry),
  omittedDirectories: z9.array(z9.string()),
  readOnlySharedDirectories: z9.array(z9.string()),
  includedPaths: z9.array(z9.string()).optional(),
  includedOmittedPaths: z9.array(z9.string()).optional()
}).strict();
var hash = (bytes) => createHash6("sha256").update(bytes).digest("hex");
async function refreshMemberInputs(sharedPath, workspace, paths, maxBytes, signal) {
  const sourceRoot = await realpath5(sharedPath);
  const targetRoot = await realpath5(workspace.cwd);
  const manifest = manifestSchema.parse(JSON.parse(await readFile2(workspace.baselineManifestPath, "utf8")));
  if (manifest.sharedRoot !== sourceRoot || manifest.workspaceRoot !== targetRoot || dirname2(resolve4(workspace.baselineManifestPath)) !== dirname2(targetRoot))
    throw new Error("workspace refresh baseline differs");
  if (paths.length === 0 || new Set(paths).size !== paths.length)
    throw new Error("refresh requires distinct existing input files");
  const files = [];
  let total = 0;
  for (const path of paths) {
    signal.throwIfAborted();
    const key = relative4(sourceRoot, resolve4(sourceRoot, path)).split(sep4).join("/");
    if (isAbsolute4(path) || key === "" || key === ".." || key.startsWith("../"))
      throw new Error("refresh input must be project-relative");
    const source = resolve4(sourceRoot, path);
    const target = resolve4(targetRoot, key);
    if (manifest.readOnlySharedDirectories.some((name) => key === name || key.startsWith(`${name}/`))) {
      throw new Error("linked dependencies cannot be refreshed as writable inputs");
    }
    for (const [root, absolute] of [[sourceRoot, source], [targetRoot, target]]) {
      let parent = dirname2(absolute);
      while (parent !== root) {
        try {
          if ((await lstat2(parent)).isSymbolicLink())
            throw new Error("refresh cannot traverse a symbolic link");
        } catch (error) {
          if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
            throw error;
        }
        const next = dirname2(parent);
        if (next === parent)
          throw new Error("refresh escaped workspace");
        parent = next;
      }
    }
    const info = await lstat2(source);
    if (!info.isFile())
      throw new Error(`refresh selects regular input files only: ${key}`);
    total += info.size;
    if (total > maxBytes)
      throw new Error(`refresh exceeds ${maxBytes} bytes`);
    const bytes = await readFile2(source, { signal });
    let previous;
    try {
      if (!(await lstat2(target)).isFile())
        throw new Error(`refresh target is not a regular file: ${key}`);
      previous = hash(await readFile2(target, { signal }));
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
        throw error;
    }
    const baseline = manifest.entries[key];
    if (previous !== void 0 && (baseline?.kind !== "file" || baseline.sha256 !== previous)) {
      throw new Error(`refresh conflict: member edits retained at ${key}; submit or merge them first`);
    }
    if (previous === void 0 && baseline !== void 0)
      throw new Error(`refresh conflict: member removed ${key}`);
    files.push({ key, bytes, digest: hash(bytes), target, ...previous === void 0 ? {} : { previous } });
  }
  for (const file of files) {
    signal.throwIfAborted();
    if (hash(await readFile2(resolve4(sourceRoot, file.key), { signal })) !== file.digest)
      throw new Error(`refresh source changed: ${file.key}`);
    await mkdir4(dirname2(file.target), { recursive: true });
    const temp = `${file.target}.${randomUUID5()}.team-refresh`;
    try {
      await writeFile2(temp, file.bytes, { flag: "wx", mode: 384 });
      signal.throwIfAborted();
      await rename2(temp, file.target);
    } finally {
      await rm2(temp, { force: true });
    }
    manifest.entries[file.key] = { kind: "file", sha256: file.digest };
    const checkpoint = `${workspace.baselineManifestPath}.${randomUUID5()}.tmp`;
    try {
      await writeFile2(checkpoint, JSON.stringify(manifest), { flag: "wx", mode: 384 });
      await rename2(checkpoint, workspace.baselineManifestPath);
    } finally {
      await rm2(checkpoint, { force: true });
    }
  }
  return files.map((file) => file.key);
}

// packages/team/modules/runtime/lib/types/execution-scope.js
import { realpath as realpath6 } from "node:fs/promises";
import { dirname as dirname3, isAbsolute as isAbsolute5, relative as relative5, resolve as resolve5, sep as sep5 } from "node:path";
function workspaceCopyPaths(scope, cwd) {
  if (scope === void 0)
    return void 0;
  const roots = [...scope.readPaths, ...scope.writePaths];
  if (roots.includes("*"))
    return void 0;
  if (roots.some((root) => relative5(cwd, resolve5(cwd, root)) === ""))
    return void 0;
  return workspaceExplicitPaths(scope, cwd);
}
function workspaceExplicitPaths(scope, cwd) {
  if (scope === void 0)
    return [];
  const roots = [...scope.readPaths, ...scope.writePaths];
  const paths = [];
  for (const root of roots) {
    if (root === "*")
      continue;
    const tail = relative5(cwd, resolve5(cwd, root));
    if (tail === "")
      continue;
    if (tail !== ".." && !tail.startsWith(`..${sep5}`) && !isAbsolute5(tail))
      paths.push(tail.split(sep5).join("/"));
  }
  return [...new Set(paths)];
}
function memberExecutionScope(scope, sharedCwd, memberCwd) {
  const map = (root) => {
    if (!isAbsolute5(root))
      return root;
    const tail = relative5(sharedCwd, root);
    return tail === "" || tail !== ".." && !tail.startsWith(`..${sep5}`) && !isAbsolute5(tail) ? resolve5(memberCwd, tail) : root;
  };
  return { ...scope, readPaths: scope.readPaths.map(map), writePaths: scope.writePaths.map(map) };
}
async function canonicalCandidate(path) {
  try {
    return await realpath6(path);
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT")
      throw error;
    const parent = dirname3(path);
    if (parent === path)
      throw error;
    return resolve5(await canonicalCandidate(parent), relative5(parent, path));
  }
}
async function withinExecutionPaths(roots, cwd, path) {
  if (roots.includes("*"))
    return true;
  const candidate = await canonicalCandidate(resolve5(cwd, path));
  for (const root of roots) {
    const base = await canonicalCandidate(resolve5(cwd, root));
    const tail = relative5(base, candidate);
    if (tail === "" || tail !== ".." && !tail.startsWith(`..${sep5}`) && !isAbsolute5(tail))
      return true;
  }
  return false;
}
async function executionScopeDenial(scope, exec, required, originBoundFetch) {
  if (teamCoordinationTools.has(exec.name))
    return void 0;
  if (scope === void 0)
    return required ? "This goal needs explicit execution resources; ask the Lead to propose them for user review." : void 0;
  if (exec.name === "web_search")
    return scope.allowSearch ? void 0 : "Public web search is outside this confirmed goal scope.";
  if (scope.allowUnrestrictedExecution)
    return void 0;
  const args = exec.arguments;
  if (args === null || typeof args !== "object" || Array.isArray(args))
    return "The tool resource arguments cannot be inspected.";
  if (exec.name === "web_fetch") {
    if (!("url" in args) || typeof args.url !== "string")
      return "The fetch target is missing.";
    let url;
    try {
      url = new URL(args.url);
    } catch (error) {
      if (error instanceof TypeError)
        return "The fetch target is not an absolute URL.";
      throw error;
    }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
      return "Only explicit HTTP(S) origins without embedded credentials are supported.";
    if (!scope.webOrigins.includes("*") && !scope.webOrigins.includes(url.origin))
      return `The origin ${url.origin} is outside the confirmed execution scope.`;
    if (!scope.webOrigins.includes("*") && !originBoundFetch)
      return "The active fetch provider cannot enforce an origin-restricted goal.";
    return void 0;
  }
  const fileTool = ["read", "read_image", "write", "edit", "glob", "grep", "str_replace_editor"].includes(exec.name);
  if (!fileTool)
    return `The ${exec.name} tool requires program execution permission, which this confirmed goal does not grant. Use read/glob/grep/write/edit when sufficient. Otherwise ask the Lead to show the needed permission change to the user with team_goal; do not repeat the same denied call.`;
  const cwd = exec.agent?.session.header.cwd;
  if (cwd === void 0)
    return "File scope checks require an immutable Session working directory.";
  const path = "file_path" in args ? args.file_path : "path" in args ? args.path : ["glob", "grep"].includes(exec.name) ? "." : void 0;
  if (typeof path !== "string" || path.trim() === "")
    return "The concrete file path is missing.";
  const writing = exec.name === "write" || exec.name === "edit" || exec.name === "str_replace_editor" && (!("command" in args) || args.command !== "view");
  const roots = writing ? scope.writePaths : scope.readPaths;
  return await withinExecutionPaths(roots, cwd, path) ? void 0 : `The requested ${writing ? "write" : "read"} path is outside this confirmed goal scope: ${path}. Allowed roots: ${JSON.stringify(roots)}. Use paths relative to your own working directory.${["glob", "grep"].includes(exec.name) ? " Set path to an allowed search directory; pattern alone does not change the search root." : ""} Ask the Lead if the task needs additional resources.`;
}

// packages/team/modules/runtime/lib/types/workspace-runtime.js
function allowedMcpToolName(name) {
  return name.length <= 64 && /^mcp__[A-Za-z0-9_-]+__[A-Za-z0-9_-]+$/u.test(name);
}
var TeamWorkspaceRuntime = class {
  ctx;
  config;
  caps = /* @__PURE__ */ new Map();
  /** @param ctx - host services that enforce file and tool execution. @param config - storage, limits, and audited tools. */
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    if (config.maxAutomaticFiles === void 0 !== (config.maxAutomaticBytes === void 0) || config.maxAutomaticFiles !== void 0 && (!Number.isSafeInteger(config.maxAutomaticFiles) || config.maxAutomaticFiles < 1) || config.maxAutomaticBytes !== void 0 && (!Number.isSafeInteger(config.maxAutomaticBytes) || config.maxAutomaticBytes < 1)) {
      throw new Error("Team automatic workspace limits must both be positive safe integers");
    }
    if (!Array.isArray(config.allowedTools) || config.allowedTools.some((name) => !teamAuditedTools.has(name)) || config.additionalMcpTools !== void 0 && (!Array.isArray(config.additionalMcpTools) || config.additionalMcpTools.some((name) => !allowedMcpToolName(name)))) {
      throw new Error("Team isolated members require audited native and exact server-qualified MCP tool names");
    }
  }
  /** Resolve enforcement services at use time so unloaded providers fail closed. */
  requireEnforcement() {
    const policy = this.ctx.get("sandboxPolicy");
    const sandbox = this.ctx.get("sandbox");
    const tools = this.ctx.get("tools");
    const fs = this.ctx.get("fs");
    const shell = this.ctx.get("shell");
    const ptc = this.ctx.get("ptcRuntime");
    if (policy === void 0 || sandbox === void 0 || tools === void 0 || !(fs instanceof SandboxedFileSystem) || this.config.allowedTools.some((name) => name === "bash" || name === "pwsh") && !(shell instanceof SandboxBashExecutor || shell instanceof SandboxPwshExecutor) || this.config.allowedTools.includes("run_code") && !(ptc instanceof NodePtcRuntime)) {
      throw new Error("Team isolated members require sandboxed filesystem, shell, and PTC providers for their allowed tools");
    }
    return { policy, tools };
  }
  /**
   * Check a proposed working set before a durable member name is reserved.
   * @param lead - Team Lead whose cwd owns isolated member copies.
   * @param execution - Confirmed file resources for this Team.
   * @param workingPaths - Optional project-relative member inputs.
   * @param signal - Caller cancellation during the metadata preflight.
   * @returns project-relative paths selected for a member copy.
   */
  async validateSelection(lead, execution, workingPaths, signal) {
    const sharedPath = lead.session.header.cwd;
    if (sharedPath === void 0)
      throw new Error("Team isolated members require a Lead cwd");
    if (workingPaths?.length === 0) {
      throw new Error("working_paths is empty; omit it to use the confirmed project scope, or list existing project-relative inputs");
    }
    const selectedPaths = [];
    for (const requested of workingPaths ?? []) {
      if (typeof requested !== "string" || requested.trim() === "" || isAbsolute6(requested)) {
        throw new Error(`working_paths must contain non-empty paths relative to the Team Lead project ${sharedPath}; an absolute or sibling path cannot be copied into this Team`);
      }
      const path = relative6(sharedPath, resolve6(sharedPath, requested));
      if (path === "" || path === ".." || path.startsWith(`..${sep6}`) || isAbsolute6(path)) {
        throw new Error("Team member working paths must select files below the project root");
      }
      const source = resolve6(sharedPath, requested);
      try {
        await stat3(source);
      } catch (error) {
        if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT")
          throw error;
        throw new Error(`Team member working path does not exist below the Lead project: ${requested}. working_paths selects existing inputs, not future outputs. Select the existing input file/directory; keep deliverables in task write_scopes/artifact_paths and the confirmed write scope. Use team_workspace prepare before creating members.`, { cause: error });
      }
      if (execution !== void 0 && !await withinExecutionPaths(execution.readPaths, sharedPath, requested)) {
        throw new Error(`Team member working path is outside the confirmed read scope: ${requested}`);
      }
      selectedPaths.push(path.split(sep6).join("/"));
    }
    const hasProjectRead = execution?.readPaths.some((root) => {
      if (root === "*")
        return true;
      const tail = relative6(sharedPath, resolve6(sharedPath, root));
      return tail === "" || tail !== ".." && !tail.startsWith(`..${sep6}`) && !isAbsolute6(tail);
    });
    if (execution !== void 0 && execution.readPaths.length > 0 && !hasProjectRead && selectedPaths.length === 0) {
      throw new Error(`This Team's confirmed read paths do not select a working set inside its Lead project ${sharedPath}. Isolated members cannot read sibling projects from this Team. Start the Team in the target project or a common parent, or provide project-relative working_paths within the confirmed read scope.`);
    }
    if (workingPaths === void 0 && workspaceCopyPaths(execution, sharedPath) === void 0 && this.config.maxAutomaticFiles !== void 0 && this.config.maxAutomaticBytes !== void 0) {
      await checkAutomaticWorkspaceSize(sharedPath, {
        maxFiles: this.config.maxAutomaticFiles,
        maxBytes: this.config.maxAutomaticBytes,
        ...this.config.omittedDirectories === void 0 ? {} : { omittedDirectories: this.config.omittedDirectories },
        ...this.config.readOnlySharedDirectories === void 0 ? {} : { readOnlySharedDirectories: this.config.readOnlySharedDirectories },
        includedOmittedPaths: workspaceExplicitPaths(execution, sharedPath).filter((path) => this.config.omittedDirectories?.includes(path.split("/")[0] ?? ""))
      }, signal);
    }
    return selectedPaths;
  }
  /**
   * Capture the Lead workspace and install both caps before child materialization.
   * @param lead - Team Lead whose cwd is the shared integration root.
   * @param caller - direct delegator whose current read-only limit is inherited.
   * @param childId - reserved child Session id.
   * @param signal - caller cancellation during copying.
   * @param execution - Confirmed file roots used to select the project working set.
   * @param workingPaths - Optional project-relative paths selected for this member.
   * @param empty - Start without copying inputs when none are required by the approved task.
   * @returns durable member workspace record.
   */
  async create(lead, caller, childId, signal, execution, workingPaths, empty = false) {
    const sharedPath = lead.session.header.cwd;
    if (sharedPath === void 0)
      throw new Error("Team isolated members require a Lead cwd");
    const { policy } = this.requireEnforcement();
    signal.throwIfAborted();
    await mkdir5(this.config.storageRoot, { recursive: true });
    const selectedPaths = empty ? [] : await this.validateSelection(lead, execution, workingPaths, signal);
    const outputs = empty || execution === void 0 ? [] : workspaceExplicitPaths({ ...execution, readPaths: [] }, sharedPath);
    const includedPaths = empty ? [] : workingPaths === void 0 ? workspaceCopyPaths(execution, sharedPath) : [.../* @__PURE__ */ new Set([...selectedPaths, ...outputs])];
    const includedOmittedPaths = [.../* @__PURE__ */ new Set([...workspaceExplicitPaths(execution, sharedPath), ...selectedPaths])].filter((path) => this.config.omittedDirectories?.some((name) => name === path.split("/")[0]));
    const workspace = await createMemberWorkspace(sharedPath, this.config.storageRoot, {
      ...this.config,
      ...empty ? { readOnlySharedDirectories: [] } : {},
      signal,
      includedOmittedPaths,
      ...includedPaths === void 0 ? {} : { includedPaths }
    });
    const mode = policy.resolve({ session: caller.session }).mode;
    const record = { ...workspace, maxMode: mode === "read-only" ? "read-only" : "workspace-write" };
    this.restore(childId, record);
    return record;
  }
  /**
   * Restore process-local caps from the durable roster before a cold child activation.
   * @param childId - persisted child Session id.
   * @param record - persisted private cwd, baseline, and immutable mode maximum.
   */
  restore(childId, record) {
    const { policy, tools } = this.requireEnforcement();
    const current = this.caps.get(childId);
    if (current !== void 0) {
      if (current.record.cwd !== record.cwd || current.record.baselineManifestPath !== record.baselineManifestPath || current.record.maxMode !== record.maxMode) {
        throw new Error("Team member workspace changed after execution caps were installed");
      }
      return;
    }
    const releaseSandbox = policy.capSessionWorkspace(childId, record.cwd, record.maxMode);
    try {
      const releaseTools = tools.capAgentTools(childId, [
        ...this.config.allowedTools,
        ...this.config.additionalMcpTools ?? []
      ]);
      this.caps.set(childId, { record, release: () => {
        releaseTools();
        releaseSandbox();
      } });
    } catch (error) {
      releaseSandbox();
      throw error;
    }
  }
  /**
   * Check and publish one member's changed regular files to the Lead workspace.
   * @param lead - Team Lead whose cwd was captured at member creation.
   * @param record - durable member workspace record.
   * @param signal - caller cancellation.
   * @param admitPath - current goal's relative-path write admission.
   * @param publication - Exact independently accepted artifact receipts required for publication.
   * @returns applied relative file paths.
   */
  async integrate(lead, record, signal, admitPath, publication) {
    const sharedPath = lead.session.header.cwd;
    if (sharedPath === void 0)
      throw new Error("Team isolated members require a Lead cwd");
    if (publication === void 0)
      throw new Error("Team publication requires independently accepted artifact receipts");
    return await integrateMemberWorkspace(sharedPath, record, { ...this.config, coordinationRoot: this.config.coordinationRoot ?? join4(this.config.storageRoot, ".coordination"), signal, publication }, admitPath);
  }
  /**
   * Refresh explicit input files in a member workspace.
   * @param lead - Exact owning Lead.
   * @param record - Inactive member's recorded workspace.
   * @param paths - Existing project-relative input files.
   * @param signal - Goal and caller cancellation.
   * @returns refreshed relative paths.
   */
  async refresh(lead, record, paths, signal) {
    const cwd = lead.session.header.cwd;
    if (cwd === void 0)
      throw new Error("Team input refresh requires a Lead workspace");
    if (paths.length > this.config.maxFiles)
      throw new Error("Team input refresh exceeds file limit");
    return refreshMemberInputs(cwd, record, paths, this.config.maxBytes, signal);
  }
  /** Release process-local caps after every member activation has stopped. */
  dispose() {
    for (const cap of this.caps.values())
      cap.release();
    this.caps.clear();
  }
};

// packages/team/modules/runtime/lib/types/request-queue.js
import { addAbortListener as addAbortListener2 } from "node:events";
function positiveLimit(name, value) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TeamError(`${name} must be a positive safe integer`, "TEAM_INVALID_CONFIG");
  }
  return value;
}
function resolveRequestLimits(config) {
  const providers = /* @__PURE__ */ new Set();
  const providerConcurrency = (config.providerConcurrency ?? []).map((entry2) => {
    const provider = routeName(entry2.provider, "providerConcurrency.provider");
    if (providers.has(provider))
      throw new TeamError(`duplicate concurrency provider "${provider}"`, "TEAM_INVALID_CONFIG");
    providers.add(provider);
    return { provider, maxConcurrentRequests: positiveLimit("providerConcurrency.maxConcurrentRequests", entry2.maxConcurrentRequests) };
  });
  const models = /* @__PURE__ */ new Set();
  const modelConcurrency = (config.modelConcurrency ?? []).map((entry2) => {
    const provider = routeName(entry2.provider, "modelConcurrency.provider");
    const model = routeName(entry2.model, "modelConcurrency.model");
    const key = modelKey(provider, model);
    if (models.has(key))
      throw new TeamError(`duplicate concurrency model ${key}`, "TEAM_INVALID_CONFIG");
    models.add(key);
    return { provider, model, maxConcurrentRequests: positiveLimit("modelConcurrency.maxConcurrentRequests", entry2.maxConcurrentRequests) };
  });
  return {
    maxConcurrentRequestsPerTeam: positiveLimit("maxConcurrentRequestsPerTeam", config.maxConcurrentRequestsPerTeam ?? 8),
    providerConcurrency,
    modelConcurrency
  };
}
function modelKey(provider, model) {
  return JSON.stringify([provider, model]);
}
function routeName(value, field2) {
  if (value.length === 0 || value !== value.trim()) {
    throw new TeamError(`${field2} must be non-empty without surrounding whitespace`, "TEAM_INVALID_CONFIG");
  }
  return value;
}
var TeamRequestQueue = class {
  limits;
  cooldown;
  pools;
  cooldowns = /* @__PURE__ */ new Map();
  accounts = /* @__PURE__ */ new Map();
  teams = /* @__PURE__ */ new Map();
  providers = /* @__PURE__ */ new Map();
  models = /* @__PURE__ */ new Map();
  waiting = /* @__PURE__ */ new Set();
  closedReason;
  /**
   * @param limits - validated, fully resolved request limits.
   */
  constructor(limits, cooldown, pools = []) {
    this.limits = limits;
    this.cooldown = cooldown;
    this.pools = pools;
    if (new Set(pools.map((pool) => pool.id)).size !== pools.length)
      throw new TeamError("duplicate account pool", "TEAM_INVALID_CONFIG");
    for (const pool of pools) {
      if (pool.id.trim() === "" || pool.providers.length === 0 || new Set(pool.providers).size !== pool.providers.length) {
        throw new TeamError("account pools need unique ids and distinct providers", "TEAM_INVALID_CONFIG");
      }
      const capacity = { limit: positiveLimit("accountPools.maxConcurrentRequests", pool.maxConcurrentRequests), active: 0 };
      for (const provider of pool.providers)
        this.accounts.set(provider, [...this.accounts.get(provider) ?? [], capacity]);
    }
    for (const entry2 of limits.providerConcurrency) {
      this.providers.set(entry2.provider, { limit: entry2.maxConcurrentRequests, active: 0 });
    }
    for (const entry2 of limits.modelConcurrency) {
      this.models.set(modelKey(entry2.provider, entry2.model), { limit: entry2.maxConcurrentRequests, active: 0 });
    }
  }
  /**
   * Reject limits naming unavailable providers once the model registry is resolvable.
   * Model ids are exact routing values, independent of an adapter's advisory catalog.
   * @param available - currently registered provider route names.
   */
  validateProviders(available) {
    const registered = new Set(available);
    for (const { provider } of [
      ...this.limits.providerConcurrency,
      ...this.limits.modelConcurrency,
      ...this.pools.flatMap((pool) => pool.providers.map((provider2) => ({ provider: provider2 })))
    ]) {
      if (!registered.has(provider)) {
        throw new TeamError(`concurrency provider "${provider}" is not registered`, "TEAM_INVALID_CONFIG");
      }
    }
  }
  /**
   * Wait for every applicable quota, then delegate the unchanged stream once.
   * Cancellation while queued never invokes the adapter. Capacity remains owned
   * until the delegated iterator settles, including cancellation and early return.
   * @param teamId - Team whose request consumes capacity.
   * @param options - original immutable model request.
   * @param next - remaining model stream middleware and adapter.
   * @param budget - Confirmed project request limit, additionally bounded by deployment limits.
   * @returns the original stream chunks after admission.
   */
  async *stream(teamId, options, next, budget) {
    const release = await this.acquire(teamId, options, budget);
    try {
      if (this.closedReason !== void 0)
        throw this.closedReason;
      options.signal?.throwIfAborted();
      for await (const chunk of next()) {
        if (chunk.type === "finish" && chunk.reason.kind === "error" && this.cooldown !== void 0) {
          const delay2 = failureCooldownMs(chunk.reason.failure, this.cooldown.rateMs, this.cooldown.quotaMs);
          if (delay2 !== void 0)
            this.pause(options.provider, Date.now() + delay2);
        }
        yield chunk;
      }
    } finally {
      release();
    }
  }
  /**
   * Reject queued and future requests. Active streams retain caller-owned cancellation.
   * @param reason - runtime disposal reason propagated to queued callers.
   */
  close(reason) {
    if (this.closedReason !== void 0)
      return;
    this.closedReason = reason;
    for (const cooldown of this.cooldowns.values())
      clearTimeout(cooldown.timer);
    this.cooldowns.clear();
    for (const entry2 of this.waiting)
      this.reject(entry2, reason);
  }
  /**
   * Hold a provider until its recorded cooldown ends without consuming partial capacity.
   * @param provider - Exact configured provider; no route is substituted.
   * @param until - Absolute cooldown deadline, reconstructed from durable failure and mailbox records.
   */
  pause(provider, until) {
    for (const pool of this.pools)
      if (pool.providers.includes(provider)) {
        for (const sibling of pool.providers)
          this.pauseRoute(sibling, until);
      }
    this.pauseRoute(provider, until);
  }
  pauseRoute(provider, until) {
    if (this.closedReason !== void 0 || until <= Date.now())
      return;
    const previous = this.cooldowns.get(provider);
    if (previous !== void 0 && previous.until >= until)
      return;
    if (previous !== void 0)
      clearTimeout(previous.timer);
    const timer = setTimeout(() => {
      this.cooldowns.delete(provider);
      this.drain();
    }, Math.min(2147483647, until - Date.now()));
    timer.unref();
    this.cooldowns.set(provider, { until, timer });
  }
  /** Reserve all applicable counters together; queued requests own no partial quota. */
  async acquire(teamId, options, budget) {
    if (this.closedReason !== void 0)
      throw this.closedReason;
    options.signal?.throwIfAborted();
    let team = this.teams.get(teamId);
    if (team === void 0) {
      team = { limit: this.limits.maxConcurrentRequestsPerTeam, active: 0 };
      this.teams.set(teamId, team);
    }
    team.limit = Math.min(this.limits.maxConcurrentRequestsPerTeam, budget === void 0 ? this.limits.maxConcurrentRequestsPerTeam : positiveLimit("confirmed request budget", budget));
    const capacities = [team, ...this.accounts.get(options.provider) ?? []];
    const provider = this.providers.get(options.provider);
    const model = this.models.get(modelKey(options.provider, options.model));
    if (provider !== void 0)
      capacities.push(provider);
    if (model !== void 0)
      capacities.push(model);
    const pending = Promise.withResolvers();
    const entry2 = {
      teamId,
      provider: options.provider,
      capacities,
      resolve: pending.resolve,
      reject: pending.reject,
      disposeAbort: () => {
      }
    };
    this.waiting.add(entry2);
    if (options.signal !== void 0) {
      const subscription = addAbortListener2(options.signal, () => {
        this.reject(entry2, options.signal?.reason);
      });
      entry2.disposeAbort = () => {
        subscription[Symbol.dispose]();
      };
    }
    this.drain();
    return await pending.promise;
  }
  /** Admit the oldest eligible requests while allowing independent routes to progress. */
  drain() {
    if (this.closedReason !== void 0)
      return;
    for (const entry2 of this.waiting) {
      if ((this.cooldowns.get(entry2.provider)?.until ?? 0) > Date.now())
        continue;
      if (entry2.capacities.some((capacity) => capacity.active >= capacity.limit))
        continue;
      this.waiting.delete(entry2);
      entry2.disposeAbort();
      for (const capacity of entry2.capacities)
        capacity.active += 1;
      let released = false;
      entry2.resolve(() => {
        if (released)
          return;
        released = true;
        for (const capacity of entry2.capacities)
          capacity.active -= 1;
        this.drain();
        this.retireTeam(entry2.teamId);
      });
    }
  }
  /** Detach a queued cancellation before reporting it to the stream's caller. */
  reject(entry2, reason) {
    if (!this.waiting.delete(entry2))
      return;
    entry2.disposeAbort();
    this.retireTeam(entry2.teamId);
    entry2.reject(reason);
  }
  /** Finished Teams do not retain process-local scheduling state. */
  retireTeam(teamId) {
    if (this.teams.get(teamId)?.active !== 0)
      return;
    if ([...this.waiting].some((entry2) => entry2.teamId === teamId))
      return;
    this.teams.delete(teamId);
  }
};

// packages/team/modules/runtime/lib/types/index.js
var __runInitializers = function(thisArg, initializers, value) {
  var useValue = arguments.length > 2;
  for (var i = 0; i < initializers.length; i++) {
    value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
  }
  return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
  function accept(f) {
    if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
    return f;
  }
  var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
  var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
  var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
  var _, done = false;
  for (var i = decorators.length - 1; i >= 0; i--) {
    var context = {};
    for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
    for (var p in contextIn.access) context.access[p] = contextIn.access[p];
    context.addInitializer = function(f) {
      if (done) throw new TypeError("Cannot add initializers after decoration has completed");
      extraInitializers.push(accept(f || null));
    };
    var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
    if (kind === "accessor") {
      if (result === void 0) continue;
      if (result === null || typeof result !== "object") throw new TypeError("Object expected");
      if (_ = accept(result.get)) descriptor.get = _;
      if (_ = accept(result.set)) descriptor.set = _;
      if (_ = accept(result.init)) initializers.unshift(_);
    } else if (_ = accept(result)) {
      if (kind === "field") initializers.unshift(_);
      else descriptor[key] = _;
    }
  }
  if (target) Object.defineProperty(target, contextIn.name, descriptor);
  done = true;
};
var DEFAULT_MAX_MEMBERS = 16;
var DEFAULT_MAX_DEPTH = 1;
var DEFAULT_MAX_TASKS = 256;
var DEFAULT_MAX_PENDING_MESSAGES = 64;
var DEFAULT_MAX_MESSAGE_BYTES = 65536;
var DEFAULT_DISPOSAL_TIMEOUT_MS = 5e3;
var TeamService = (() => {
  let _classSuper = TypertRemoteService;
  let _instanceExtraInitializers = [];
  let _configureMemberModel_decorators;
  let _configureMemberRole_decorators;
  let _retireMember_decorators;
  let _reactivateMember_decorators;
  let _getWorkspace_decorators;
  let _integrateWorkspace_decorators;
  let _getGoal_decorators;
  let _proposeGoal_decorators;
  let _reviewGoal_decorators;
  let _listMessages_decorators;
  let _listMessagePage_decorators;
  let _getMessage_decorators;
  let _retryMessage_decorators;
  let _adoptMessage_decorators;
  let _listTaskArchive_decorators;
  let _validateTaskReuse_decorators;
  let _readTaskArtifact_decorators;
  return class TeamService extends _classSuper {
    static {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
      _configureMemberModel_decorators = [Remote("configureMemberModel")];
      _configureMemberRole_decorators = [Remote("configureMemberRole")];
      _retireMember_decorators = [Remote("retireMember")];
      _reactivateMember_decorators = [Remote("reactivateMember")];
      _getWorkspace_decorators = [Remote("getWorkspace")];
      _integrateWorkspace_decorators = [Remote("integrateWorkspace")];
      _getGoal_decorators = [Remote("getGoal")];
      _proposeGoal_decorators = [Remote("proposeGoal")];
      _reviewGoal_decorators = [Remote("reviewGoal")];
      _listMessages_decorators = [Remote("listMessages")];
      _listMessagePage_decorators = [Remote("listMessagePage")];
      _getMessage_decorators = [Remote("getMessage")];
      _retryMessage_decorators = [Remote("retryMessage")];
      _adoptMessage_decorators = [Remote("adoptMessage")];
      _listTaskArchive_decorators = [Remote("listTaskArchive")];
      _validateTaskReuse_decorators = [Remote("validateTaskReuse")];
      _readTaskArtifact_decorators = [Remote("readTaskArtifact")];
      __esDecorate(this, null, _configureMemberModel_decorators, { kind: "method", name: "configureMemberModel", static: false, private: false, access: { has: (obj) => "configureMemberModel" in obj, get: (obj) => obj.configureMemberModel }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _configureMemberRole_decorators, { kind: "method", name: "configureMemberRole", static: false, private: false, access: { has: (obj) => "configureMemberRole" in obj, get: (obj) => obj.configureMemberRole }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _retireMember_decorators, { kind: "method", name: "retireMember", static: false, private: false, access: { has: (obj) => "retireMember" in obj, get: (obj) => obj.retireMember }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _reactivateMember_decorators, { kind: "method", name: "reactivateMember", static: false, private: false, access: { has: (obj) => "reactivateMember" in obj, get: (obj) => obj.reactivateMember }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _getWorkspace_decorators, { kind: "method", name: "getWorkspace", static: false, private: false, access: { has: (obj) => "getWorkspace" in obj, get: (obj) => obj.getWorkspace }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _integrateWorkspace_decorators, { kind: "method", name: "integrateWorkspace", static: false, private: false, access: { has: (obj) => "integrateWorkspace" in obj, get: (obj) => obj.integrateWorkspace }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _getGoal_decorators, { kind: "method", name: "getGoal", static: false, private: false, access: { has: (obj) => "getGoal" in obj, get: (obj) => obj.getGoal }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _proposeGoal_decorators, { kind: "method", name: "proposeGoal", static: false, private: false, access: { has: (obj) => "proposeGoal" in obj, get: (obj) => obj.proposeGoal }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _reviewGoal_decorators, { kind: "method", name: "reviewGoal", static: false, private: false, access: { has: (obj) => "reviewGoal" in obj, get: (obj) => obj.reviewGoal }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _listMessages_decorators, { kind: "method", name: "listMessages", static: false, private: false, access: { has: (obj) => "listMessages" in obj, get: (obj) => obj.listMessages }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _listMessagePage_decorators, { kind: "method", name: "listMessagePage", static: false, private: false, access: { has: (obj) => "listMessagePage" in obj, get: (obj) => obj.listMessagePage }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _getMessage_decorators, { kind: "method", name: "getMessage", static: false, private: false, access: { has: (obj) => "getMessage" in obj, get: (obj) => obj.getMessage }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _retryMessage_decorators, { kind: "method", name: "retryMessage", static: false, private: false, access: { has: (obj) => "retryMessage" in obj, get: (obj) => obj.retryMessage }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _adoptMessage_decorators, { kind: "method", name: "adoptMessage", static: false, private: false, access: { has: (obj) => "adoptMessage" in obj, get: (obj) => obj.adoptMessage }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _listTaskArchive_decorators, { kind: "method", name: "listTaskArchive", static: false, private: false, access: { has: (obj) => "listTaskArchive" in obj, get: (obj) => obj.listTaskArchive }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _validateTaskReuse_decorators, { kind: "method", name: "validateTaskReuse", static: false, private: false, access: { has: (obj) => "validateTaskReuse" in obj, get: (obj) => obj.validateTaskReuse }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _readTaskArtifact_decorators, { kind: "method", name: "readTaskArtifact", static: false, private: false, access: { has: (obj) => "readTaskArtifact" in obj, get: (obj) => obj.readTaskArtifact }, metadata: _metadata }, null, _instanceExtraInitializers);
      if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    }
    static inject = ["agents", "sessions", "sessionPersistence", "sessionProjections", "subagents"];
    coordination = __runInitializers(this, _instanceExtraInitializers);
    selectedMembers = /* @__PURE__ */ new WeakSet();
    pendingTaskDispatches = /* @__PURE__ */ new Set();
    taskDispatchRuns = /* @__PURE__ */ new Map();
    memberToolMenus = /* @__PURE__ */ new Map();
    continueRuns = /* @__PURE__ */ new Map();
    static Config = z10.object({
      finalDelivery: z10.union([z10.const("manual"), z10.const("notify"), z10.const("publish-and-notify")]).default("manual"),
      filterToolsByGoal: z10.boolean().default(false),
      resumeIncompleteOnUserContinue: z10.boolean().default(false),
      coordinationRoot: z10.string().min(1),
      coordinationWaitMs: z10.number().step(1).min(1).default(3e4),
      coordinationPollMs: z10.number().step(1).min(1).default(50),
      autoProvisionPlannedMembers: z10.boolean().default(false),
      maxProvisionPerPass: z10.number().step(1).min(1).max(32).default(4),
      plannedMemberProvider: z10.string().min(1).default("spawn"),
      autoAssignReadyTasks: z10.boolean().default(false),
      accountPools: z10.array(z10.object({
        id: z10.string().min(1),
        providers: z10.array(z10.string().min(1)),
        maxConcurrentRequests: z10.number().step(1).min(1)
      })).default([]),
      rateLimitCooldownMs: z10.number().step(1).min(1).max(2147483647).default(6e4),
      quotaCooldownMs: z10.number().step(1).min(1).max(2147483647).default(36e5),
      maxAutomaticResumes: z10.number().step(1).min(1).max(100).default(3),
      enforceWriteScopeExclusivity: z10.boolean().default(false),
      autoDispatchReadyTasks: z10.boolean().default(false),
      workspaceIsolation: z10.union([z10.const(false), z10.object({
        storageRoot: z10.string().min(1).required(),
        maxFiles: z10.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).required(),
        maxBytes: z10.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).required(),
        maxAutomaticFiles: z10.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(2e3),
        maxAutomaticBytes: z10.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(67108864),
        omittedDirectories: z10.array(z10.string().min(1)),
        readOnlySharedDirectories: z10.array(z10.string().min(1)),
        allowedTools: z10.array(z10.string().min(1)).required(),
        additionalMcpTools: z10.array(z10.string().min(1))
      })]).default(false),
      defaultMemberReasoningEffort: z10.union([z10.const("inherit"), z10.const("highest")]).default("inherit"),
      maxSelectedSkillsPerMember: z10.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(4),
      maxSkillSelectionBytes: z10.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(131072),
      requireTaskPlans: z10.boolean().default(false),
      maxTaskWorkBytes: z10.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(65536),
      maxTaskReceiptPaths: z10.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(128),
      maxTaskReceiptBytes: z10.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(268435456),
      maxTaskArtifactReadBytes: z10.number().step(1).min(4096).max(Number.MAX_SAFE_INTEGER).default(65536),
      requireConfirmedGoal: z10.boolean().default(false),
      requireStructuredPlans: z10.boolean().default(false),
      portableEventEnvelope: z10.boolean().default(false),
      requireExecutionScope: z10.boolean().default(false),
      maxGoalBytes: z10.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(65536),
      enabledPresets: z10.array(z10.string()).default(["*"]),
      maxMembers: z10.number().step(1).min(1).default(DEFAULT_MAX_MEMBERS),
      maxResidentMembers: z10.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(8),
      maxConcurrentRequestsPerTeam: z10.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(8),
      providerConcurrency: z10.array(z10.object({
        provider: z10.string().min(1),
        maxConcurrentRequests: z10.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER)
      })).default([]),
      modelConcurrency: z10.array(z10.object({
        provider: z10.string().min(1),
        model: z10.string().min(1),
        maxConcurrentRequests: z10.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER)
      })).default([]),
      maxDepth: z10.number().step(1).min(1).default(DEFAULT_MAX_DEPTH),
      deduplicateTaskInputs: z10.boolean().default(false),
      requireTaskResults: z10.boolean().default(false),
      maxTasks: z10.number().step(1).min(1).default(DEFAULT_MAX_TASKS),
      maxPendingMessagesPerMember: z10.number().step(1).min(1).default(DEFAULT_MAX_PENDING_MESSAGES),
      maxMessageBytes: z10.number().step(1).min(1).default(DEFAULT_MAX_MESSAGE_BYTES),
      mailboxRetryInitialMs: z10.number().step(1).min(1).max(2147483647).default(250),
      mailboxRetryMaxMs: z10.number().step(1).min(1).max(2147483647).default(3e4),
      mailboxRetryMaxAttempts: z10.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(8),
      disposalTimeoutMs: z10.number().step(1).min(1).default(DEFAULT_DISPOSAL_TIMEOUT_MS)
    });
    /** Validated deployment limits used by every Team operation. */
    config;
    workspaces;
    artifacts;
    activity;
    lifecycle;
    journal;
    roster;
    mailbox;
    tasks;
    requests;
    goals;
    skillSelections;
    constructor(ctx, config = {}) {
      if (ctx.get("agentTeams") !== void 0)
        throw new TeamError("Another Team engine already owns agentTeams; disable it before enabling this runtime", "TEAM_ENGINE_CONFLICT");
      super(ctx, "agentTeams");
      this.config = {
        finalDelivery: config.finalDelivery ?? "manual",
        filterToolsByGoal: config.filterToolsByGoal ?? false,
        resumeIncompleteOnUserContinue: config.resumeIncompleteOnUserContinue ?? false,
        ...config.workspaceIsolation === void 0 ? {} : { workspaceIsolation: structuredClone(config.workspaceIsolation) },
        ...config.coordinationRoot === void 0 ? {} : { coordinationRoot: config.coordinationRoot },
        coordinationWaitMs: positiveLimit("coordinationWaitMs", config.coordinationWaitMs ?? 3e4),
        coordinationPollMs: positiveLimit("coordinationPollMs", config.coordinationPollMs ?? 50),
        autoProvisionPlannedMembers: config.autoProvisionPlannedMembers ?? false,
        maxProvisionPerPass: positiveLimit("maxProvisionPerPass", config.maxProvisionPerPass ?? 4),
        plannedMemberProvider: config.plannedMemberProvider ?? "spawn",
        defaultMemberReasoningEffort: config.defaultMemberReasoningEffort ?? "inherit",
        autoDispatchReadyTasks: config.autoDispatchReadyTasks ?? false,
        autoAssignReadyTasks: config.autoAssignReadyTasks ?? false,
        accountPools: structuredClone(config.accountPools ?? []),
        rateLimitCooldownMs: config.rateLimitCooldownMs ?? 6e4,
        quotaCooldownMs: config.quotaCooldownMs ?? 36e5,
        maxAutomaticResumes: config.maxAutomaticResumes ?? 3,
        enforceWriteScopeExclusivity: config.enforceWriteScopeExclusivity ?? false,
        maxSelectedSkillsPerMember: positiveLimit("maxSelectedSkillsPerMember", config.maxSelectedSkillsPerMember ?? 4),
        maxSkillSelectionBytes: positiveLimit("maxSkillSelectionBytes", config.maxSkillSelectionBytes ?? 131072),
        requireTaskPlans: config.requireTaskPlans ?? false,
        maxTaskWorkBytes: positiveLimit("maxTaskWorkBytes", config.maxTaskWorkBytes ?? 65536),
        maxTaskReceiptPaths: positiveLimit("maxTaskReceiptPaths", config.maxTaskReceiptPaths ?? 128),
        maxTaskReceiptBytes: positiveLimit("maxTaskReceiptBytes", config.maxTaskReceiptBytes ?? 268435456),
        maxTaskArtifactReadBytes: positiveLimit("maxTaskArtifactReadBytes", config.maxTaskArtifactReadBytes ?? 65536),
        requireConfirmedGoal: config.requireConfirmedGoal ?? false,
        requireStructuredPlans: config.requireStructuredPlans ?? false,
        portableEventEnvelope: config.portableEventEnvelope ?? false,
        requireExecutionScope: config.requireExecutionScope ?? false,
        maxGoalBytes: positiveLimit("maxGoalBytes", config.maxGoalBytes ?? 65536),
        enabledPresets: [...config.enabledPresets ?? ["*"]],
        maxMembers: positiveLimit("maxMembers", config.maxMembers ?? DEFAULT_MAX_MEMBERS),
        maxResidentMembers: positiveLimit("maxResidentMembers", config.maxResidentMembers ?? 8),
        ...resolveRequestLimits(config),
        maxDepth: positiveLimit("maxDepth", config.maxDepth ?? DEFAULT_MAX_DEPTH),
        deduplicateTaskInputs: config.deduplicateTaskInputs ?? false,
        requireTaskResults: config.requireTaskResults ?? false,
        maxTasks: positiveLimit("maxTasks", config.maxTasks ?? DEFAULT_MAX_TASKS),
        maxPendingMessagesPerMember: positiveLimit("maxPendingMessagesPerMember", config.maxPendingMessagesPerMember ?? DEFAULT_MAX_PENDING_MESSAGES),
        maxMessageBytes: positiveLimit("maxMessageBytes", config.maxMessageBytes ?? DEFAULT_MAX_MESSAGE_BYTES),
        mailboxRetryInitialMs: positiveLimit("mailboxRetryInitialMs", config.mailboxRetryInitialMs ?? 250),
        mailboxRetryMaxMs: positiveLimit("mailboxRetryMaxMs", config.mailboxRetryMaxMs ?? 3e4),
        mailboxRetryMaxAttempts: positiveLimit("mailboxRetryMaxAttempts", config.mailboxRetryMaxAttempts ?? 8),
        disposalTimeoutMs: positiveLimit("disposalTimeoutMs", config.disposalTimeoutMs ?? DEFAULT_DISPOSAL_TIMEOUT_MS)
      };
      if (this.config.mailboxRetryMaxMs > 2147483647 || this.config.mailboxRetryInitialMs > 2147483647) {
        throw new TeamError("mailbox retry delays must not exceed 2147483647 milliseconds", "TEAM_INVALID_ARGUMENT");
      }
      if (this.config.mailboxRetryMaxMs < this.config.mailboxRetryInitialMs) {
        throw new TeamError("mailboxRetryMaxMs must be at least mailboxRetryInitialMs", "TEAM_INVALID_ARGUMENT");
      }
      this.activity = new TeamActivity();
      this.lifecycle = new TeamRuntimeLifecycle(this.config.disposalTimeoutMs);
      this.requests = new TeamRequestQueue(this.config, { rateMs: this.config.rateLimitCooldownMs, quotaMs: this.config.quotaCooldownMs }, this.config.accountPools);
      this.coordination = this.config.coordinationRoot === void 0 ? void 0 : new CoordinationLocks(this.config.coordinationRoot, this.config.coordinationWaitMs, this.config.coordinationPollMs);
      this.journal = new TeamJournal(ctx, (root, type) => {
        this.activity.notify(TeamId(root.id));
        if (type === "team/task" || type === "team/member" || type === "team/goal-decided" || type === "team/adviser-decision" || type === "team/skills-selected" || type === "team/message/delivered" || type === "team/member-role" || type === "team/member-retirement" || type === "team/member-model-route") {
          this.scheduleTaskDispatch(root);
        }
      }, this.config.portableEventEnvelope, this.coordination === void 0 ? void 0 : async (rootId) => {
        this.lifecycle.signal.throwIfAborted();
        await this.coordination.own("team:" + rootId, this.lifecycle.signal);
      });
      this.workspaces = this.config.workspaceIsolation === void 0 || this.config.workspaceIsolation === false ? void 0 : new TeamWorkspaceRuntime(ctx, {
        ...this.config.workspaceIsolation,
        coordinationRoot: this.config.coordinationRoot ?? join5(this.config.workspaceIsolation.storageRoot, ".coordination"),
        coordinationWaitMs: this.config.coordinationWaitMs,
        coordinationPollMs: this.config.coordinationPollMs
      });
      this.artifacts = this.config.workspaceIsolation === void 0 || this.config.workspaceIsolation === false ? void 0 : new TeamArtifactStore(join5(this.config.workspaceIsolation.storageRoot, "artifacts"));
      this.roster = new TeamRoster(ctx, this.journal, this.lifecycle, this.config.maxMembers, this.config.maxDepth, this.config.enabledPresets, (caller, memberId, choices, signal) => this.skillSelections.prepare(caller, memberId, choices, signal), (caller, sourceId, memberId) => this.skillSelections.copyForSuccessor(caller, sourceId, memberId), this.workspaces, this.config.defaultMemberReasoningEffort, (caller, request) => this.resolveSpawnPlan(caller, request));
      this.goals = new TeamGoals(ctx, this.journal, this.roster, this.lifecycle, this.config.maxGoalBytes, this.config.requireConfirmedGoal, this.config.requireExecutionScope, this.config.requireStructuredPlans, {
        members: this.config.maxMembers,
        requests: this.config.maxConcurrentRequestsPerTeam,
        tasks: this.config.maxTasks,
        skills: this.config.maxSelectedSkillsPerMember,
        skillBytes: this.config.maxSkillSelectionBytes,
        depth: this.config.maxDepth,
        automatic: this.config.autoProvisionPlannedMembers,
        provider: this.config.plannedMemberProvider
      });
      this.skillSelections = new TeamSkillSelections(ctx, this.journal, this.roster, this.goals, this.config.maxSelectedSkillsPerMember, this.config.maxSkillSelectionBytes);
      this.mailbox = new TeamMailbox(ctx, this.journal, this.roster, this.lifecycle, this.config.maxPendingMessagesPerMember, this.config.maxMessageBytes, this.goals, this.config.mailboxRetryInitialMs, this.config.mailboxRetryMaxMs, this.config.mailboxRetryMaxAttempts);
      this.tasks = new TeamTaskBoard(this.journal, this.roster, this.goals, this.config.maxTasks, this.config.deduplicateTaskInputs, this.config.requireTaskResults, this.config.requireTaskPlans, this.config.maxTaskWorkBytes, this.config.maxTaskReceiptPaths, this.config.maxTaskReceiptBytes, this.config.autoDispatchReadyTasks, this.config.enforceWriteScopeExclusivity, this.config.autoAssignReadyTasks, this.artifacts);
      ctx.on("subagent/activation-capacity", (parent, childId, next) => {
        const configured = next();
        const membership = this.roster.tryMembership(parent);
        if (membership === void 0)
          return configured;
        if (this.roster.isRetiredOrRetiring(membership.root, childId)) {
          throw new TeamError("reactivate this retired Team member before starting work", "TEAM_MEMBER_RETIRED");
        }
        const member = this.journal.state(membership.root).members.find((candidate) => candidate.id === childId);
        return member !== void 0 && member.phase !== "failed" && (member.parentId ?? membership.root.id) === parent.id ? this.config.maxResidentMembers : configured;
      });
      ctx.inject(["llm"], (modelCtx) => {
        const validateProviders = () => {
          this.requests.validateProviders(modelCtx.llm.listProviders().map((provider) => provider.id));
        };
        modelCtx.on("llm/stream", (options, next) => {
          const agent = options.sessionId === void 0 ? void 0 : ctx.agents.get(options.sessionId);
          const retired = agent === void 0 ? void 0 : this.roster.retirementDenial(agent);
          if (retired !== void 0)
            throw new TeamError(retired, "TEAM_MEMBER_RETIRED");
          const membership = agent === void 0 ? void 0 : this.roster.governingMembership(agent);
          if (membership === void 0)
            return next();
          validateProviders();
          const roster = this.roster;
          const requestSignal = membership.root === agent ? options.signal ?? this.lifecycle.signal : this.goals.admit(membership.root, options.signal ?? this.lifecycle.signal);
          const dispatch = async function* () {
            if (agent !== void 0) {
              await roster.waitForIntegration(agent, requestSignal);
              const denial = roster.retirementDenial(agent);
              if (denial !== void 0)
                throw new TeamError(denial, "TEAM_MEMBER_RETIRED");
            }
            requestSignal.throwIfAborted();
            yield* next();
          };
          return this.requests.stream(membership.id, { ...options, signal: requestSignal }, dispatch, readProjectPlan(this.journal.state(membership.root).goal?.definition.plan)?.resources.maxConcurrentRequests);
        });
      });
      const stepGoalRevisions = /* @__PURE__ */ new WeakMap();
      ctx.on("agent/pre-step", async (payload, next) => {
        await this.roster.waitForIntegration(payload.agent, payload.signal);
        if (this.roster.retirementDenial(payload.agent) !== void 0)
          return { kind: "reject" };
        const decision = await next();
        const membership = this.roster.governingMembership(payload.agent);
        if (membership !== void 0) {
          const state = this.journal.state(membership.root);
          stepGoalRevisions.set(payload.agent, state.goal?.revision ?? 0);
        }
        return membership !== void 0 && membership.root !== payload.agent && this.goals.denial(membership.root) !== void 0 ? { kind: "reject" } : decision;
      });
      ctx.on("agent/disposed", ({ agent }) => {
        this.memberToolMenus.get(agent)?.();
        this.memberToolMenus.delete(agent);
      });
      ctx.effect(() => () => {
        for (const release of this.memberToolMenus.values())
          release();
        this.memberToolMenus.clear();
      }, "team.toolMenus");
      ctx.inject(["tools"], (toolsCtx) => {
        toolsCtx.on("agent/pre-step", async (payload, next) => {
          const decision = await next();
          if (!this.config.filterToolsByGoal)
            return decision;
          const membership = this.roster.governingMembership(payload.agent);
          if (membership === void 0)
            return decision;
          this.memberToolMenus.get(payload.agent)?.();
          this.memberToolMenus.delete(payload.agent);
          const names = currentMemberToolMenu(this.journal.state(membership.root), payload.agent.id, toolsCtx.tools.schemas(payload.agent).map((tool) => tool.name));
          if (names !== void 0)
            this.memberToolMenus.set(payload.agent, capCurrentAgentToolMenu(toolsCtx.tools, payload.agent.id, names));
          return decision;
        });
        const control = /* @__PURE__ */ new Set(["team_goal", "team_help", "team_context", "ask_user_question"]);
        const guardedRoot = (agent, name) => {
          const membership = agent === void 0 ? void 0 : this.roster.governingMembership(agent);
          if (membership === void 0 || membership.root === agent && control.has(name))
            return void 0;
          return membership.root;
        };
        toolsCtx.tools.guard((exec) => {
          const retired = exec.agent === void 0 ? void 0 : this.roster.retirementDenial(exec.agent);
          if (retired !== void 0)
            return retired;
          const membership = exec.agent === void 0 ? void 0 : this.roster.tryMembership(exec.agent);
          if (membership !== void 0 && exec.agent !== void 0) {
            const state = this.journal.state(membership.root);
            if (readProjectPlan(state.goal?.definition.plan)?.version === 2 && !teamCoordinationTools.has(exec.name)) {
              const actor = state.members.find((member) => member.id === exec.agent?.id);
              const adviser = memberFunction(state, actor)?.endsWith("_adviser") === true;
              const executing = state.tasks.some((task) => task.work?.plan.goalRevision === state.goal?.revision && task.ownerId === exec.agent?.id && task.work?.execution?.phase === "running");
              const verifying = state.tasks.some((task) => task.work?.plan.goalRevision === state.goal?.revision && task.reviewerId === exec.agent?.id && task.work?.execution?.phase === "submitted");
              if (membership.role === "lead" && !hasNoExternalTaskEffect(exec.name, exec.arguments)) {
                return "The communicator delegates execution in a version-2 plan; assign a task and publish reviewed artifacts through team_workspace.";
              }
              if (membership.role === "teammate" && !adviser && !executing && !verifying) {
                return "No current task execution is assigned to this member; inspect the task board and wait for an assignment. Submitted work must not be modified.";
              }
            }
          }
          if (membership?.role === "teammate") {
            const state = this.journal.state(membership.root);
            const role = memberFunction(state, state.members.find((member) => member.id === exec.agent?.id));
            if (role?.endsWith("_adviser") && !adviserTools.has(exec.name)) {
              return "Advisers decide and review evidence only. Delegate implementation or verification to an executor/verifier; this role cannot run commands, edit files, claim tasks, or change members.";
            }
            if (role?.endsWith("_adviser") && exec.name === "team_workspace" && typeof exec.arguments === "object" && exec.arguments !== null && "action" in exec.arguments && !["get", "read_artifact", "read_input"].includes(String(exec.arguments.action))) {
              return "Advisers can inspect submitted artifacts but cannot publish or prepare execution workspaces.";
            }
          }
          const root = guardedRoot(exec.agent, exec.name);
          if (root === void 0)
            return void 0;
          const goal = this.journal.state(root).goal;
          const observed = exec.agent === void 0 ? void 0 : stepGoalRevisions.get(exec.agent);
          if (observed !== void 0 && observed !== (goal?.revision ?? 0))
            return "The confirmed Team goal changed after this model step; prepare a new step before executing its tools.";
          return exec.agent === root && goal === void 0 && !["subagent", "workflow"].includes(exec.name) ? void 0 : this.goals.denial(root);
        });
        toolsCtx.on("tools/execute", async (exec, next) => {
          let dispatch = next;
          if (exec.agent !== void 0) {
            await this.roster.waitForIntegration(exec.agent, exec.signal);
            const retired = this.roster.retirementDenial(exec.agent);
            if (retired !== void 0)
              throw new TeamError(retired, "TEAM_MEMBER_RETIRED");
          }
          const root = guardedRoot(exec.agent, exec.name);
          if (root !== void 0) {
            const goal = this.journal.state(root).goal;
            const observed = exec.agent === void 0 ? void 0 : stepGoalRevisions.get(exec.agent);
            if (observed !== void 0 && observed !== (goal?.revision ?? 0))
              throw new TeamError("Team goal changed before tool dispatch", "TEAM_GOAL_CHANGED");
            exec.signal = exec.agent === root && goal === void 0 ? this.goals.capture(root, exec.signal) : this.goals.admit(root, exec.signal);
            if (goal !== void 0 && exec.agent !== void 0) {
              const scope = goal.definition.scope.execution;
              const sharedCwd = root.session.header.cwd;
              const privateCwd = exec.agent === root ? void 0 : exec.agent.session.header.cwd;
              const effective = scope !== void 0 && sharedCwd !== void 0 && privateCwd !== void 0 ? memberExecutionScope(scope, sharedCwd, privateCwd) : scope;
              const denial = await executionScopeDenial(effective, exec, this.config.requireExecutionScope, exec.name === "web_fetch" && (toolsCtx.get("web")?.fetchPreservesOrigin() ?? false));
              if (denial !== void 0)
                throw new TeamError(denial, "TEAM_EXECUTION_SCOPE_DENIED");
              exec.signal.throwIfAborted();
              const resources = goal.definition.scope.execution;
              if (exec.name === "web_fetch" && resources !== void 0 && !resources.allowUnrestrictedExecution && !resources.webOrigins.includes("*")) {
                const args = exec.arguments;
                const web = toolsCtx.get("web");
                if (web === void 0 || args === null || typeof args !== "object" || !("url" in args) || typeof args.url !== "string") {
                  throw new TeamError("scoped fetch is unavailable", "TEAM_EXECUTION_SCOPE_DENIED");
                }
                const origin2 = new URL(args.url).origin;
                dispatch = () => web.withFetchOrigin(origin2, next);
              }
            }
          }
          const token = exec.agent === void 0 ? void 0 : await this.tasks.recordToolEffect(exec.agent, exec.callId, exec.name, exec.signal, exec.arguments);
          try {
            exec.signal.throwIfAborted();
            return await dispatch();
          } finally {
            if (token !== void 0)
              await this.tasks.settleToolEffect(token);
          }
        });
      });
      ctx.on("session/event", (session, event) => {
        this.mailbox.observeSessionEvent(session, event);
        const actor = ctx.agents.get(session.id);
        const membership = actor === void 0 ? void 0 : this.roster.tryMembership(actor);
        const userInputs = event.type === "user/message" ? [event.data] : event.type === "agent/inbox/spliced" && event.data.outcome !== "canceled" ? event.data.inserted : [];
        if (this.config.resumeIncompleteOnUserContinue && membership?.role === "lead" && membership.root === actor && userInputs.some((input) => input.source.kind === "user")) {
          const root = membership.root;
          for (const input of userInputs.filter((input2) => input2.source.kind === "user"))
            queueMicrotask(() => {
              if (this.lifecycle.disposed)
                return;
              const operation = () => this.resumeIncompleteTasks(root, input.id ?? `event:${event.seq}`);
              const run = (this.continueRuns.get(root.id) ?? Promise.resolve()).then(operation, operation);
              this.continueRuns.set(root.id, run);
              void run.catch((error) => {
                if (!this.lifecycle.disposed)
                  this.ctx.logger.warn(`Team continuation failed: ${errorMessage(error)}`);
              }).finally(() => {
                if (this.continueRuns.get(root.id) === run)
                  this.continueRuns.delete(root.id);
              });
            });
        }
        if (membership?.role === "teammate" && event.type === "turn/end" && event.data.reason.kind === "error") {
          void this.scheduleCooldown(membership.root, session.id, event).catch((error) => {
            if (!this.lifecycle.disposed)
              ctx.logger.warn(`Team cooldown scheduling failed: ${errorMessage(error)}`);
          });
        }
      });
      ctx.on("subagent/activation-released", (info) => {
        this.mailbox.capacityReleased(info.childId);
      });
      ctx.on("agent/created", ({ agent }) => {
        this.installMemberModelSelection(agent);
        this.scheduleRecovery(agent);
      });
      ctx.on("agent/status", ({ agent }) => {
        const membership = this.roster.tryMembership(agent);
        if (membership !== void 0) {
          this.activity.notify(membership.id);
          this.scheduleTaskDispatch(membership.root);
        }
      });
      ctx.effect(() => {
        const disposeProjection = ctx.root.sessionProjections.register(teamProjectionDefinition);
        return async () => {
          try {
            await this.disposeRuntime();
          } finally {
            disposeProjection();
          }
        };
      }, "agentTeams.runtimeLifecycle()");
      for (const agent of ctx.agents.list()) {
        this.installMemberModelSelection(agent);
        this.scheduleRecovery(agent);
      }
    }
    /** Install a route selector whose value follows the Lead's durable member revision. */
    installMemberModelSelection(agent) {
      if (this.selectedMembers.has(agent) || this.roster.tryMembership(agent)?.role !== "teammate")
        return;
      this.selectedMembers.add(agent);
      const roster = this.roster;
      const selection = {
        get current() {
          return roster.modelRouteFor(agent);
        },
        assembled: void 0
      };
      agent.ctx.effect(() => installModelSelection(agent.ctx, selection), "agentTeams.memberModelSelection");
      agent.ctx.effect(() => agent.ctx.systemPrompt.section({
        name: "team:member-instructions",
        order: agent.ctx.systemPrompt.getSectionOrder("TEAM_POLICY") + 3,
        text: () => {
          const member = this.listMembers(agent).find((candidate) => candidate.id === agent.id);
          const root = this.roster.membership(agent).root;
          const goal = this.journal.state(root).goal;
          const instructions = goal?.status === "active" ? readProjectPlan(goal.definition.plan)?.members.find((candidate) => candidate.name === member?.name)?.instructions : void 0;
          return [member?.persona, instructions].filter((value) => value !== void 0).join("\n\n");
        }
      }), "agentTeams.memberInstructions");
    }
    /**
     * Resolve one exact live Agent's Team role.
     * @param agent - exact live Agent used as the authority credential.
     * @returns its root, Team identity, role, and model-facing name.
     */
    membership(agent) {
      return this.roster.membership(agent);
    }
    /** Validated selection limits for tool admission before resolving instruction files. */
    get skillSelectionLimits() {
      return { maxSkills: this.config.maxSelectedSkillsPerMember, maxBytes: this.config.maxSkillSelectionBytes };
    }
    /**
     * Read one member's saved skill names, purposes, versions, and goal applicability.
     * @param caller - Exact live Team member.
     * @param member - Durable target name; omitted means the caller.
     * @returns Compact metadata without loading instruction bodies.
     */
    getSkills(caller, member) {
      return this.skillSelections.read(caller, member);
    }
    /**
     * Read an exact instruction version saved for the caller.
     * @param caller - Exact live Team member.
     * @param name - Selected module name.
     * @returns Detached selected content or undefined when not selected; stale goals and corrupt content throw.
     */
    getSkillContent(caller, name) {
      return this.skillSelections.content(caller, name);
    }
    /**
     * Replace the skill choice for a member, its direct child, or any member when called by the Lead.
     * @param caller - Exact live selecting Agent.
     * @param request - Target, current selection revision, and resolved instruction snapshots.
     * @param signal - Cancellation before append; accepted goal changes and runtime disposal also cancel queued writes.
     * @returns Committed selection metadata.
     */
    async selectSkills(caller, request, signal) {
      return await this.skillSelections.select(caller, request, signal);
    }
    /**
     * List the runtime-enriched roster visible to one Team member.
     * @param agent - exact live Team member.
     * @returns Lead and teammate rows in creation order.
     */
    listMembers(agent) {
      return this.roster.list(this.roster.membership(agent));
    }
    /**
     * Change an existing teammate's model for its next request while retaining its Session.
     * @param agent - Exact live Team Lead or the target's direct parent.
     * @param request - Configured provider, model, and optional supported effort.
     * @param signal - Cancellation before the durable route is committed.
     * @returns updated member row.
     */
    async configureMemberModel(agent, request, signal) {
      const membership = this.roster.membership(agent);
      const updated = await this.roster.configureModel(agent, request, this.goals.capture(membership.root, signal));
      await this.mailbox.recoverFor(membership.root, this.lifecycle.signal);
      return updated;
    }
    /**
     * Configure an inactive retained member's responsibility without replacing its Session.
     * @param agent - Exact Lead or direct parent.
     * @param request - Responsibility and expected role revision from listMembers.
     * @param signal - Cancellation before the role is committed.
     * @returns updated member row.
     */
    async configureMemberRole(agent, request, signal) {
      const membership = this.roster.membership(agent);
      return await this.roster.configureRole(agent, request, this.goals.capture(membership.root, signal));
    }
    /**
     * Read bounded current-goal recovery diagnostics without waking members or mutating their work.
     * @param caller - Exact Team member reading the shared board.
     * @param limit - Maximum tasks in this page, between one and fifty.
     * @param after - Exclusive task cursor from the previous page.
     * @returns current goal, aggregate role and skill gaps, and paged task recovery pointers.
     */
    recoverySummary(caller, limit, after) {
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50)
        throw new TeamError("recovery limit must be 1 through 50", "TEAM_INVALID_ARGUMENT");
      const membership = this.roster.membership(caller);
      const state = this.journal.state(membership.root);
      const tasks = state.tasks.filter((task) => task.status === "pending" || task.status === "in_progress").map((task) => this.tasks.get(membership, task.id));
      const issues = tasks.filter((task) => task.dispatchBlocker !== void 0 || task.recovery !== void 0 || task.work?.execution?.phase === "submitted");
      const cursor = after === void 0 ? -1 : issues.findIndex((task) => task.id === after);
      if (after !== void 0 && cursor === -1)
        throw new TeamError("recovery state changed; read the first page again", "TEAM_TASK_STALE_REVISION");
      const page = issues.slice(cursor + 1, cursor + 1 + limit);
      const next = issues.length > cursor + 1 + limit ? page.at(-1)?.id : void 0;
      return {
        goalRevision: state.goal?.revision ?? 0,
        activeGoal: state.goal?.status === "active",
        membersWithoutRole: state.members.filter((member) => member.phase === "active" && memberFunction(state, member) === void 0).length,
        staleSkillSelections: (state.skillSelections ?? []).filter((selection) => selection.goalRevision !== (state.goal?.revision ?? 0)).length,
        totalIssues: issues.length,
        issues: page.map((task) => ({
          taskId: task.id,
          revision: task.revision,
          ...task.work === void 0 ? {} : { goalRevision: task.work.plan.goalRevision },
          ...task.work?.execution === void 0 ? {} : { phase: task.work.execution.phase },
          ...task.ownerName === void 0 ? {} : { ownerName: task.ownerName },
          ...task.reviewerName === void 0 ? {} : { reviewerName: task.reviewerName },
          nextStep: task.dispatchBlocker === "goal" ? "\u6838\u5BF9\u65E7\u76EE\u6807\u4E0E\u73B0\u76EE\u6807\u5DEE\u5F02\uFF0C\u4FDD\u7559\u539F\u6210\u679C\uFF1B\u4E0D\u80FD\u628A\u65E7\u63D0\u4EA4\u76F4\u63A5\u9A8C\u6536\u7ED9\u65B0\u76EE\u6807\u3002" : task.dispatchBlocker === "adviser_review" ? "\u6B63\u5F0F\u89C4\u5212\u4E0E\u8D28\u91CF\u519B\u5E08\u5206\u522B\u5BA1\u6838\u5F53\u524D\u63D0\u4EA4\uFF0C\u7528 team_adviser_review \u8BB0\u5F55\u8BC1\u636E\u3002" : task.work?.execution?.phase === "submitted" ? task.reviewerName === void 0 ? "\u961F\u957F\u7528 configure_review \u6307\u5B9A\u72EC\u7ACB\u590D\u6838\u5458\uFF1B\u4FDD\u7559\u539F\u6267\u884C\u4E0E\u63D0\u4EA4\u8BC1\u636E\u3002" : `\u7531 ${task.reviewerName} \u68C0\u67E5\u5F53\u524D\u6267\u884C\u540E review\uFF1B\u5148\u6838\u5BF9\u4EFB\u52A1\u677F\u4E0E\u90AE\u7BB1\uFF0C\u907F\u514D\u91CD\u590D\u5524\u9192\u3002` : "\u5148\u7528 team_task_get \u6838\u5BF9\u4F9D\u8D56\u3001\u6280\u80FD\u4E0E\u526F\u4F5C\u7528\u8BB0\u5F55\uFF0C\u518D\u6309\u5F53\u524D\u72B6\u6001\u6062\u590D\uFF1B\u4E0D\u8981\u91CD\u590D\u5DF2\u9A8C\u6536\u5DE5\u4F5C\u3002",
          ...task.dispatchBlocker === void 0 ? {} : { blocker: task.dispatchBlocker },
          ...task.work?.execution === void 0 ? {} : { executionId: task.work.execution.id },
          ...task.recovery === void 0 ? {} : { recovery: task.recovery }
        })),
        submitted: {
          currentGoal: tasks.filter((task) => task.work?.execution?.phase === "submitted" && task.work.plan.goalRevision === (state.goal?.revision ?? 0)).length,
          historicalGoal: tasks.filter((task) => task.work?.execution?.phase === "submitted" && task.work.plan.goalRevision !== (state.goal?.revision ?? 0)).length
        },
        advisers: state.members.flatMap((member) => {
          const teamFunction = memberFunction(state, member);
          return member.phase === "active" && teamFunction !== void 0 && teamFunction.endsWith("_adviser") ? [{ name: member.name, teamFunction }] : [];
        }),
        ...next === void 0 ? {} : { nextCursor: next }
      };
    }
    /**
     * Retire an inactive direct child or any inactive member when called by its Lead.
     * @param agent - Exact live parent or Team Lead.
     * @param target - Durable member name whose history and identity remain retained.
     * @param signal - Cancellation before the lifecycle change commits.
     * @returns the retired member's current row.
     */
    async retireMember(agent, target, signal) {
      return await this.roster.retire(agent, target, this.goals.capture(this.roster.membership(agent).root, signal));
    }
    /**
     * Return a retired member to the active roster without submitting another prompt.
     * @param agent - Exact live parent or Team Lead.
     * @param target - Retained member name to reuse.
     * @param signal - Cancellation before the lifecycle change commits.
     * @returns the active member's current row; sending a message starts its next work.
     */
    async reactivateMember(agent, target, signal) {
      return await this.roster.reactivate(agent, target, this.goals.admit(this.roster.membership(agent).root, signal));
    }
    /**
     * Inspect a member's private working copy without reading project contents.
     * @param agent - Exact live Team member.
     * @param target - Durable member name.
     * @returns its saved isolation details, or null for a shared-workspace member.
     */
    getWorkspace(agent, target) {
      const membership = this.roster.membership(agent);
      const member = this.journal.state(membership.root).members.find((candidate) => candidate.name === target);
      if (member === void 0)
        throw new TeamError("Team member not found", "TEAM_MEMBER_NOT_FOUND");
      return member.workspace === void 0 ? null : structuredClone(member.workspace);
    }
    /**
     * Check input paths and automatic-copy limits before reserving a member identity.
     * @param caller - Exact live Lead or delegating Team member.
     * @param workingPaths - Existing paths below the Lead project; omitted uses confirmed resources.
     * @param signal - Cancellation while checking metadata; goal changes also cancel this operation.
     * @returns selected inputs and copy limits; this does not create, copy, or publish files.
     */
    async prepareWorkspace(caller, workingPaths, signal) {
      const membership = this.roster.membership(caller);
      const admitted = this.goals.admit(membership.root, signal);
      admitted.throwIfAborted();
      const goal = this.journal.state(membership.root).goal;
      if (this.workspaces === void 0 || this.config.workspaceIsolation === false || this.config.workspaceIsolation === void 0) {
        return { isolation: false, goalRevision: goal?.revision ?? 0, workingPaths: [], note: "Private workspace isolation is disabled; working_paths cannot isolate shared writes." };
      }
      const paths = await this.workspaces.validateSelection(membership.root, goal?.definition.scope.execution, workingPaths, admitted);
      admitted.throwIfAborted();
      const limits = this.config.workspaceIsolation;
      return {
        isolation: true,
        goalRevision: goal?.revision ?? 0,
        workingPaths: paths,
        limits: {
          maxFiles: limits.maxFiles,
          maxBytes: limits.maxBytes,
          ...limits.maxAutomaticFiles === void 0 ? {} : { maxAutomaticFiles: limits.maxAutomaticFiles },
          ...limits.maxAutomaticBytes === void 0 ? {} : { maxAutomaticBytes: limits.maxAutomaticBytes }
        },
        note: "Inputs must already exist. Empty workingPaths here means automatic selection from confirmed resources. Future deliverables belong in task write scopes and confirmed write paths. Creation rechecks files and scope; this is not a reservation or an execution grant."
      };
    }
    /**
     * Publish an inactive member's changes after checking the captured shared-file versions.
     * @param agent - Exact live Team Lead owning integration.
     * @param target - Durable member name whose work is ready to integrate.
     * @param signal - Cancellation before and during file publication.
     * @returns the paths recorded by the resumable integration receipt.
     */
    async integrateWorkspace(agent, target, signal) {
      const membership = this.roster.membership(agent);
      if (membership.role !== "lead")
        throw new TeamError("only the Team Lead integrates member workspaces", "TEAM_LEAD_REQUIRED");
      const runtime = this.workspaces;
      if (runtime === void 0)
        throw new TeamError("member workspace isolation is disabled", "TEAM_INVALID_ARGUMENT");
      const admitted = this.goals.admit(membership.root, signal);
      const prepare = await this.journal.transact(membership.root.id, () => {
        admitted.throwIfAborted();
        const current = this.roster.membership(agent);
        if (current.root !== membership.root || current.role !== "lead")
          throw new TeamError("Team Lead changed before integration", "TEAM_NOT_MEMBER");
        const member = this.journal.state(current.root).members.find((candidate) => candidate.name === target);
        const view = this.roster.list(current).find((candidate) => candidate.id === member?.id);
        if (member?.workspace === void 0 || member.phase !== "active")
          throw new TeamError("member has no active private workspace", "TEAM_MEMBER_NOT_FOUND");
        if (view?.status !== "inactive")
          throw new TeamError("wait until the member is inactive before integrating files", "TEAM_INVALID_ARGUMENT");
        const state = this.journal.state(current.root);
        const accepted = state.tasks.filter((task) => task.status === "completed" && task.work?.plan.goalRevision === (state.goal?.revision ?? 0) && task.work.execution?.ownerId === member.id && task.work.execution.phase === "accepted" && task.work.execution.review?.reviewerId !== member.id);
        for (const task of accepted)
          for (const artifact of task.work?.execution?.submission?.artifacts ?? []) {
            if (!task.writeScopes.some((scope) => artifact.path === scope || artifact.path.startsWith(`${scope}/`))) {
              throw new TeamError(`accepted artifact is outside task ${task.id} write scopes: ${artifact.path}`, "TEAM_EXECUTION_SCOPE_DENIED");
            }
          }
        const artifacts = selectPublicationArtifacts(state.tasks.map((task) => ({
          id: task.id,
          dependencies: task.blockedBy,
          artifacts: accepted.includes(task) ? task.work?.execution?.submission?.artifacts ?? [] : []
        })));
        if (artifacts.length === 0)
          throw new TeamError("No independently accepted artifacts for this member and current goal. Submit artifact_paths, obtain independent review, then integrate; scratch files and implicit deletions are never published.", "TEAM_TASK_EVIDENCE_REQUIRED");
        return Promise.resolve({
          memberId: member.id,
          artifacts,
          tasks: accepted.map((task) => [task.id, task.revision]),
          rules: state.goal?.definition.scope.execution
        });
      });
      return this.roster.integrateWorkspace(membership.root, prepare.memberId, admitted, async (path) => {
        admitted.throwIfAborted();
        const state = this.journal.state(membership.root);
        if (prepare.tasks.some(([id2, revision3]) => !state.tasks.some((task) => task.id === id2 && task.revision === revision3 && task.status === "completed"))) {
          throw new TeamError("accepted task changed during publication", "TEAM_TASK_EXECUTION_STALE");
        }
        const rules = prepare.rules;
        if (rules === void 0) {
          if (this.config.requireExecutionScope)
            throw new TeamError("integration requires explicit file execution scope", "TEAM_EXECUTION_SCOPE_DENIED");
          return;
        }
        const cwd = membership.root.session.header.cwd;
        if (cwd === void 0 || !await withinExecutionPaths(rules.writePaths, cwd, path)) {
          throw new TeamError(`integration path is outside the confirmed execution scope: ${path}`, "TEAM_EXECUTION_SCOPE_DENIED");
        }
      }, prepare.artifacts);
    }
    /**
     * Refresh explicit inputs of an inactive retained teammate without replacing its identity.
     * @param caller - Exact Team Lead.
     * @param target - Member name from listMembers.
     * @param paths - Existing project-relative input files.
     * @param signal - Goal and caller cancellation.
     * @returns refreshed input paths.
     */
    async refreshWorkspace(caller, target, paths, signal) {
      const membership = this.roster.membership(caller);
      if (membership.role !== "lead")
        throw new TeamError("only the Lead refreshes member inputs", "TEAM_LEAD_REQUIRED");
      const state = this.journal.state(membership.root);
      const admitted = this.goals.admit(membership.root, signal);
      const member = state.members.find((candidate) => candidate.name === target && candidate.phase === "active");
      if (member === void 0 || this.workspaces === void 0)
        throw new TeamError("active isolated member not found", "TEAM_MEMBER_NOT_FOUND");
      await this.workspaces.validateSelection(membership.root, state.goal?.definition.scope.execution, paths, admitted);
      return this.roster.refreshWorkspace(membership.root, member.id, paths, admitted);
    }
    /**
     * Create one named, continuable child of the calling Team member.
     * @param caller - exact live Team member.
     * @param request - name, responsibility, prompt, composition, model settings, and cancellation.
     * @returns the active roster row.
     */
    resolveSpawnPlan(caller, request) {
      const root = this.roster.membership(caller).root;
      const state = this.journal.state(root);
      const plan = readProjectPlan(state.goal?.definition.plan);
      if (this.config.requireStructuredPlans && plan !== void 0) {
        const member = plan.members.find((candidate) => candidate.name === request.name);
        if (member === void 0)
          throw new TeamError("member is absent from the confirmed project roster; review a roster change before creating it", "TEAM_INVALID_ARGUMENT");
        const parent = caller === root ? "lead" : state.members.find((candidate) => candidate.id === caller.id)?.name;
        if (member.parent !== parent || request.agentOptions?.provider !== member.modelProvider || request.agentOptions.model !== member.model || request.teamFunction !== member.function || request.agentOptions.reasoningEffort !== void 0 && request.agentOptions.reasoningEffort !== member.reasoningEffort || JSON.stringify([...request.skills?.map((skill) => skill.name) ?? []].sort()) !== JSON.stringify([...member.skills].sort())) {
          throw new TeamError("member parent, model route and function must match the user-confirmed project plan", "TEAM_INVALID_ARGUMENT");
        }
        if (state.members.filter((candidate) => candidate.phase !== "failed" && candidate.phase !== "retired").length >= plan.resources.maxMembers) {
          throw new TeamError("confirmed member budget reached; reuse an idle member or review an expanded plan", "TEAM_MEMBER_LIMIT");
        }
        if (member.persona !== void 0) {
          if (request.persona !== void 0 && request.persona !== member.persona)
            throw new TeamError("member persona differs from the confirmed version-2 plan", "TEAM_INVALID_ARGUMENT");
          request = { ...request, persona: member.persona };
        }
        if (request.workingPaths === void 0) {
          const produced = plan.tasks.flatMap((task) => task.outputs);
          const inputs = [...new Set(plan.tasks.filter((task) => task.owner === request.name).flatMap((task) => task.inputs))].filter((path) => !produced.some((output) => path === output || path.startsWith(`${output}/`)));
          request = { ...request, ...inputs.length === 0 ? { workspaceMode: "empty" } : { workingPaths: inputs } };
        }
      }
      return request.teamFunction?.endsWith("_adviser") ? { ...request, workspaceMode: "empty" } : request;
    }
    /**
     * Create one continuable member after confirmed scope and roster admission.
     * @param caller - Exact Lead or delegating member.
     * @param request - Named member, role, model, skills, prompt and cancellation.
     * @returns retained member identity and current activity.
     */
    async spawnTeammate(caller, request) {
      const signal = this.goals.admit(this.roster.membership(caller).root, request.signal);
      return await this.roster.spawn(caller, { ...request, signal });
    }
    /**
     * Reuse one expert's existing Team member or provision it once for concurrent callers.
     * @param caller - Exact live Team member.
     * @param request - Expert reference and creation settings used only when absent.
     * @returns the bound member; reuse never submits another prompt.
     */
    async ensureExpertMember(caller, request) {
      const signal = this.goals.admit(this.roster.membership(caller).root, request.signal);
      return await this.roster.ensureExpert(caller, { ...request, signal });
    }
    /**
     * Read the confirmed goal separately from Lead-authored notes.
     * @param agent - Exact live Team member.
     * @returns detached proposal, decision, and current goal records.
     */
    getGoal(agent) {
      return this.goals.read(agent);
    }
    /**
     * Describe deployment controls without exposing model connections, skills or user content.
     * @param agent - Exact live Team member reading the policy.
     * @returns current provisioning limits and the protection actually provided.
     */
    runtimePolicy(agent) {
      this.roster.membership(agent);
      return {
        automaticProvisioning: this.config.autoProvisionPlannedMembers,
        maxProvisionPerPass: this.config.maxProvisionPerPass,
        finalDelivery: this.config.finalDelivery,
        maxDepth: this.config.maxDepth,
        crossProcessCoordination: this.coordination !== void 0,
        fileProtection: this.workspaces === void 0 ? "shared-workspace" : "private-workspaces-and-cooperative-publication",
        strictExternalConfinement: false
      };
    }
    /**
     * Propose a complete objective or withdrawal without changing execution authority.
     * @param agent - Exact live Lead.
     * @param request - Current revisions and the proposed change.
     * @param signal - Cancellation before the write.
     * @returns the pending proposal shown in the native user review.
     */
    async proposeGoal(agent, request, signal) {
      return await this.goals.propose(agent, request, signal);
    }
    /**
     * Ask the user to accept or revise the current persisted proposal.
     * @param agent - Exact live Lead; descendants relay their questions to it.
     * @param proposalRevision - Exact proposal being reviewed.
     * @param signal - Cancellation while awaiting the human answer.
     * @returns committed goal review state; stale answers cannot apply.
     */
    async reviewGoal(agent, proposalRevision, signal) {
      return this.goals.review(agent, proposalRevision, signal);
    }
    /**
     * Queue one durable peer message, then attempt immediate delivery.
     * @param caller - exact live sending Team member.
     * @param request - target name, content, and pre-queue cancellation.
     * @returns durable message identity and immediate-delivery observation.
     */
    async sendMessage(caller, request) {
      return await this.mailbox.send(caller, request);
    }
    /**
     * Read delivery state without copying message bodies into the caller's context.
     * @param agent - Exact live member of this Team.
     * @returns ordered mailbox summaries, including quarantined history.
     */
    listMessages(agent) {
      return this.mailbox.list(agent);
    }
    /**
     * Read a bounded newest-first mailbox page.
     * @param agent - Exact live member of this Team.
     * @param offset - Number of newer records to skip.
     * @param limit - Page length from one through fifty.
     * @returns delivery summaries and the total available count.
     */
    listMessagePage(agent, offset, limit) {
      return this.mailbox.listPage(agent, offset, limit);
    }
    /**
     * Read one message for inspection before recovery or historical adoption.
     * @param agent - Exact live member of this Team.
     * @param messageId - Durable message identity.
     * @returns a detached saved message including its full content.
     */
    getMessage(agent, messageId) {
      return this.mailbox.get(agent, messageId);
    }
    /**
     * Retry delivery of a message belonging to the current confirmed goal.
     * @param agent - Exact live member authorized to recover this message.
     * @param messageId - Durable message identity.
     * @param signal - Cancellation while admitting or attempting delivery.
     * @returns its immediate delivery observation.
     */
    async retryMessage(agent, messageId, signal) {
      return await this.mailbox.retry(agent, messageId, signal);
    }
    /**
     * Requeue a historical message after the Lead explicitly adopts its contents.
     * @param agent - Exact live Team Lead.
     * @param messageId - Historical source message, retained unchanged.
     * @param signal - Cancellation before the new queued record is admitted.
     * @returns the new message's identity and immediate delivery observation.
     */
    async adoptMessage(agent, messageId, signal) {
      return await this.mailbox.adopt(agent, messageId, signal);
    }
    /**
     * Create one unowned pending task in the Team Lead log.
     * @param caller - exact live Team member creating the task.
     * @param request - task text, blockers, and advisory write scopes.
     * @param signal - optional caller cancellation before append; goal changes and runtime disposal always cancel queued writes.
     * @returns the revision-one task view.
     */
    async createTask(caller, request, signal = this.lifecycle.signal) {
      return await this.tasks.create(caller, request, signal);
    }
    /**
     * Return one task, including a deleted tombstone.
     * @param caller - exact live Team member reading the task.
     * @param id - Team-local task identity.
     * @returns the latest task value and derived readiness diagnostics.
     */
    getTask(caller, id2) {
      return this.tasks.get(this.roster.membership(caller), id2);
    }
    /**
     * List pending and in-progress tasks in numeric creation order.
     * @param caller - exact live Team member reading the board.
     * @returns detached current task views.
     */
    listTasks(caller) {
      return this.tasks.list(this.roster.membership(caller));
    }
    /**
     * Record one independently evidenced adviser finding on a submitted execution.
     * @param caller - Exact live adviser member.
     * @param request - Submitted execution, conclusion, and directly checked evidence.
     * @param signal - Cancellation before the durable decision is committed.
     * @returns the saved finding.
     */
    async recordAdviserDecision(caller, request, signal) {
      const membership = this.roster.membership(caller);
      const root = membership.root;
      const admitted = this.goals.admit(root, signal);
      return await this.journal.transact(root.id, async () => {
        admitted.throwIfAborted();
        if (this.roster.membership(caller).root !== root)
          throw new TeamError("adviser is no longer in this Team", "TEAM_NOT_MEMBER");
        const state = this.journal.state(root);
        const adviser = state.members.find((candidate) => candidate.id === caller.id && candidate.phase === "active");
        const adviserFunction = memberFunction(state, adviser);
        if (adviserFunction !== "planning_adviser" && adviserFunction !== "quality_adviser" && adviserFunction !== "domain_adviser") {
          throw new TeamError("only a designated Team adviser can record an adviser decision", "TEAM_ADVISER_REQUIRED");
        }
        const task = state.tasks.find((candidate) => candidate.id === request.taskId);
        if (state.goal?.status !== "active" || task?.status !== "in_progress" || task.work?.execution?.id !== request.executionId || task.work.execution.phase !== "submitted" || task.ownerId === caller.id || task.work.plan.goalRevision !== state.goal.revision) {
          throw new TeamError("adviser decision requires the current independently submitted execution", "TEAM_TASK_EXECUTION_STALE");
        }
        const evidence = request.evidence.map((value) => requiredText(value, "evidence", 4096));
        if (evidence.length === 0)
          throw new TeamError("adviser decision requires checked evidence", "TEAM_TASK_EVIDENCE_REQUIRED");
        const finding = {
          id: `team-adviser-${randomUUID6()}`,
          goalRevision: state.goal.revision,
          taskId: request.taskId,
          executionId: request.executionId,
          adviserId: caller.id,
          adviserRoleRevision: memberRoleRevision(state, caller.id),
          adviserFunction,
          decision: request.decision,
          summary: requiredText(request.summary, "summary", 8192),
          evidence
        };
        await this.journal.appendAndFlush(root, "team/adviser-decision", {
          version: 2,
          teamId: TeamId(root.id),
          finding
        });
        return finding;
      });
    }
    /**
     * Reuse reviewed skill content under the current confirmed goal without upgrading its version.
     * @param caller - Exact Lead or direct parent.
     * @param member - Retained member name.
     * @param expectedRevision - Saved skill selection version.
     * @param signal - Cancellation before publication.
     * @returns metadata for the rebound selection.
     */
    async rebindSkills(caller, member, expectedRevision, signal) {
      return await this.skillSelections.rebind(caller, member, expectedRevision, signal);
    }
    /**
     * Current decisions for one exact execution, in saved order.
     * @param caller - Team member reading the findings.
     * @param taskId - Current task whose execution supplies the decision identity.
     * @returns detached findings for the current goal and execution.
     */
    listAdviserDecisions(caller, taskId) {
      const { root } = this.roster.membership(caller);
      const state = this.journal.state(root);
      const task = state.tasks.find((candidate) => candidate.id === taskId);
      const executionId = task?.work?.execution?.id;
      return executionId === void 0 ? [] : (state.adviserDecisions ?? []).filter((value) => value.taskId === taskId && value.executionId === executionId && value.goalRevision === state.goal?.revision).map((value) => structuredClone(value));
    }
    /**
     * Read a bounded page of completed tasks without consuming the active task quota.
     * @param agent - Exact live Team member.
     * @param request - Exclusive archive cursor and requested page length.
     * @returns retained task views and the next cursor when more completions exist.
     */
    listTaskArchive(agent, request) {
      return this.tasks.listArchive(this.roster.membership(agent), request);
    }
    /**
     * Recheck observed files and environment before reusing a retained task result.
     * @param agent - Exact live Team member requesting verification.
     * @param id - Retained Team task identity.
     * @param signal - Cancellation while inspecting files.
     * @returns the current reuse decision and concrete observations.
     */
    async validateTaskReuse(agent, id2, signal) {
      return await this.tasks.validateReuse(agent, id2, signal);
    }
    /**
     * Check a trusted scheduler's explicit prerequisite set before publishing and preparing downstream inputs.
     * @param agent - Exact live Team member.
     * @param ids - Accepted prerequisites or the final delivery task.
     * @param signal - Cancellation while inspecting versions and files.
     * @returns checked receipts; expected accepted updates do not invalidate the handoff.
     */
    async validateTaskHandoff(agent, ids, signal) {
      return await this.tasks.validateHandoff(agent, ids, signal);
    }
    /**
     * Inspect a submitted artifact without exposing another member's private directory.
     * @param agent - Exact live Team member requesting evidence.
     * @param request - Task, execution, receipt path, and optional continuation offset.
     * @param signal - Cancellation during version checks and bounded reads.
     * @returns verified text and the next byte offset when more remains.
     */
    async readTaskArtifact(agent, request, signal) {
      return await this.readTaskFile(agent, request, "artifact", signal);
    }
    /**
     * Read a task's recorded input without depending on the reviewer's private working set.
     * @param agent - Exact Team member inspecting the current execution.
     * @param request - Task, execution, recorded input path and continuation offset.
     * @param signal - Cancellation during receipt verification and reading.
     * @returns verified UTF-8 input text and the next page offset.
     */
    async readTaskInput(agent, request, signal) {
      return await this.readTaskFile(agent, request, "input", signal);
    }
    async readTaskFile(agent, request, source, signal) {
      const root = this.roster.membership(agent).root;
      const admitted = this.goals.admit(root, signal);
      const state = this.journal.state(root);
      const task = state.tasks.find((candidate) => candidate.id === request.taskId);
      if (task === void 0)
        throw new TeamError(`team task "${request.taskId}" not found`, "TEAM_TASK_NOT_FOUND");
      const execution = task.work?.execution;
      const phases = source === "input" ? ["running", "submitted", "accepted", "rejected"] : ["submitted", "accepted", "rejected"];
      if (execution?.id !== request.executionId || !phases.includes(execution.phase) || task.work?.plan.goalRevision !== (state.goal?.revision ?? 0)) {
        throw new TeamError("read_artifact requires the current submitted execution from team_task_get", "TEAM_TASK_EXECUTION_STALE");
      }
      const receipt = (source === "input" ? task.work?.plan.inputs : execution.submission?.artifacts)?.find((candidate) => candidate.path === request.path);
      const environment = source === "input" ? task.work?.plan.environment : execution.submission?.environment;
      if (receipt === void 0 || environment === void 0) {
        throw new TeamError(`read_${source} requires a ${source} path recorded in the current task version`, "TEAM_INVALID_ARGUMENT");
      }
      const scope = state.goal?.definition.scope.execution;
      const sharedCwd = root.session.header.cwd;
      if (scope !== void 0 && (sharedCwd === void 0 || !await withinExecutionPaths(scope.readPaths, sharedCwd, receipt.path))) {
        throw new TeamError("artifact is outside the confirmed project read scope", "TEAM_EXECUTION_SCOPE_DENIED");
      }
      const byteOffset = request.byteOffset ?? 0;
      let content = await (this.artifacts === void 0 ? readTaskReceiptText(environment, receipt, byteOffset, this.config.maxTaskArtifactReadBytes, this.config.maxTaskReceiptBytes, admitted) : this.artifacts.read(environment, receipt, byteOffset, this.config.maxTaskArtifactReadBytes, this.config.maxTaskReceiptBytes, admitted));
      const response = () => {
        const nextByteOffset = byteOffset + Buffer.byteLength(content);
        return {
          taskId: request.taskId,
          executionId: request.executionId,
          path: receipt.path,
          sha256: receipt.sha256,
          totalBytes: receipt.bytes,
          byteOffset,
          content,
          ...nextByteOffset < receipt.bytes ? { nextByteOffset } : {}
        };
      };
      while (Buffer.byteLength(JSON.stringify(response())) > this.config.maxTaskArtifactReadBytes) {
        const characters = Array.from(content);
        if (characters.length === 0)
          throw new TeamError("artifact read response metadata exceeds its configured byte limit", "TEAM_TASK_WORK_TOO_LARGE");
        content = characters.slice(0, Math.floor(characters.length / 2)).join("");
      }
      if (content.length === 0 && byteOffset < receipt.bytes) {
        throw new TeamError("artifact read byte limit cannot retain one text character", "TEAM_TASK_WORK_TOO_LARGE");
      }
      const current = this.journal.state(root).tasks.find((candidate) => candidate.id === task.id);
      admitted.throwIfAborted();
      if (current?.revision !== task.revision || current.work?.execution?.id !== request.executionId) {
        throw new TeamError("task changed during artifact read; get its current execution", "TEAM_TASK_EXECUTION_STALE");
      }
      return response();
    }
    /**
     * Read the shared brief without changing task or Agent state.
     * @param caller - exact live Team member.
     * @returns detached brief, or null before the Lead records one.
     */
    getBrief(caller) {
      const { root } = this.roster.membership(caller);
      const state = this.journal.state(root);
      const brief = state.brief;
      if (brief === void 0)
        return null;
      const active = state.goal?.status !== "revoked" && brief.goalRevision === (state.goal?.revision ?? 0);
      return active ? { ...structuredClone(brief), active } : {
        revision: brief.revision,
        active,
        ...brief.goalRevision === void 0 ? {} : { goalRevision: brief.goalRevision }
      };
    }
    /**
     * Record the user's objective, existing authorization, and shared decisions.
     * This text supplies context and never changes runtime permission policy.
     * @param caller - exact live Team Lead.
     * @param request - observed revision and fields to replace.
     * @param signal - optional caller cancellation before append; goal changes and runtime disposal always cancel queued writes.
     * @returns the committed next brief revision.
     */
    async updateBrief(caller, request, signal = this.lifecycle.signal) {
      const membership = this.roster.membership(caller);
      if (membership.role !== "lead")
        throw new TeamError("only the Team Lead can edit the shared brief", "TEAM_LEAD_REQUIRED");
      const { root } = membership;
      const admitted = this.goals.capture(root, signal);
      admitted.throwIfAborted();
      return this.journal.transact(root.id, async () => {
        admitted.throwIfAborted();
        const current = this.roster.membership(caller);
        if (current.root !== root || current.role !== "lead")
          throw new TeamError("the calling Agent changed Teams while its write was queued", "TEAM_NOT_MEMBER");
        const state = this.journal.state(root);
        const previous = state.brief;
        if (request.expectedRevision !== (previous?.revision ?? 0)) {
          throw new TeamError("shared brief revision changed; read it before updating", "TEAM_BRIEF_STALE_REVISION");
        }
        const goalRevision = state.goal?.revision ?? 0;
        const currentBrief = previous?.goalRevision === goalRevision ? previous : void 0;
        const brief = {
          revision: (previous?.revision ?? 0) + 1,
          goalRevision,
          objective: requiredText(request.objective ?? currentBrief?.objective ?? "", "objective", 16384),
          authorization: request.authorization === void 0 ? currentBrief?.authorization ?? "" : request.authorization.trim(),
          decisions: request.decisions === void 0 ? currentBrief?.decisions ?? "" : request.decisions.trim()
        };
        if (brief.authorization.length > 16384 || brief.decisions.length > 16384) {
          throw new TeamError("shared brief fields must not exceed 16384 characters", "TEAM_INVALID_ARGUMENT");
        }
        await this.journal.appendAndFlush(root, "team/brief", { version: 2, teamId: TeamId(root.id), brief });
        return structuredClone(brief);
      });
    }
    /**
     * Compare-and-set one authorized task transition.
     * @param caller - exact live Team member authorizing the mutation.
     * @param request - task identity, expected revision, action, and action fields.
     * @param signal - optional caller cancellation before append; goal changes and runtime disposal always cancel queued writes.
     * @returns the committed next task revision.
     */
    async updateTask(caller, request, signal = this.lifecycle.signal) {
      return await this.tasks.update(caller, request, signal);
    }
    /**
     * Wait for the next Team-domain or member-status change.
     * @param caller - exact live Team member waiting for activity.
     * @param timeoutMs - bounded wait duration from ten seconds through one hour.
     * @param signal - caller cancellation for the wait only.
     * @returns one observed change or a timeout result.
     */
    async waitForChange(caller, timeoutMs, signal) {
      const membership = this.roster.membership(caller);
      if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1e4 || timeoutMs > 36e5) {
        throw new TeamError("timeoutMs must be an integer from 10000 through 3600000", "TEAM_INVALID_TIMEOUT");
      }
      signal.throwIfAborted();
      const noProgress = this.waitReadiness(caller);
      if (noProgress !== void 0 && noProgress.reason !== "no-active-peer")
        return { timedOut: false, noProgress };
      return await this.activity.wait(membership.id, caller.id, timeoutMs, signal);
    }
    /**
     * Diagnose whether another Team member can advance a model-owned wait.
     * @param caller - Exact live member considering a wait.
     * @returns a concrete no-progress reason, or undefined when a peer is runnable.
     */
    waitReadiness(caller) {
      const membership = this.roster.membership(caller);
      const active = this.roster.list(membership).filter((member) => member.id !== caller.id && (member.status === "running" || member.status === "provisioning"));
      if (active.some((member) => !this.activity.isWaiting(membership.id, member.id)))
        return void 0;
      if (this.mailbox.hasScheduledRetry(membership.root))
        return void 0;
      if (this.mailbox.hasCapacityWait(membership.root))
        return {
          reason: "resident-capacity-blocked",
          message: "Team delivery is waiting for resident capacity and no peer can advance it. Inspect team_mailbox and list_agents; finish or interrupt unneeded work before retrying."
        };
      if (active.length > 0)
        return {
          reason: "all-peers-waiting",
          message: "Every active peer is also waiting. Reconcile the task dependencies and assign runnable work before waiting again."
        };
      return {
        reason: "no-active-peer",
        message: "No other Team member is running or provisioning. wait_agent cannot make progress or wake inactive teammates. Re-list with list_agents and team_task_list, then use send_message to wake each required inactive teammate before waiting again."
      };
    }
    /**
     * Interrupt one live teammate turn without clearing its pending inbox.
     * @param caller - exact live Lead Agent.
     * @param targetName - durable teammate name.
     * @returns the target status sampled before cancellation.
     */
    interrupt(caller, targetName) {
      return this.roster.interrupt(caller, targetName);
    }
    /**
     * Resolve a caller without throwing, used by scoped-tool installation and observers.
     * @param agent - candidate exact live Agent.
     * @returns Team membership, or undefined for non-Team subagents and stale identities.
     */
    tryMembership(agent) {
      return this.roster.tryMembership(agent);
    }
    /** Queue one contained recovery pass after publication has unwound. */
    scheduleRecovery(agent) {
      queueMicrotask(() => {
        if (this.lifecycle.disposed)
          return;
        void this.recoverFor(agent).catch((error) => {
          if (this.lifecycle.disposed)
            return;
          this.ctx.logger.warn(`Agent Teams recovery for "${agent.id}" failed: ${errorMessage(error)}`);
        });
      });
    }
    /** Reconcile roster provisioning before retrying that member's pending mailbox. */
    async recoverFor(agent) {
      await this.roster.recoverFor(agent, this.lifecycle.signal);
      await this.mailbox.recoverFor(agent, this.lifecycle.signal);
      if (this.roster.tryMembership(agent)?.root === agent) {
        const state = this.journal.state(agent);
        const targets = new Set(state.tasks.filter((task) => task.status === "in_progress" && task.work?.plan.goalRevision === state.goal?.revision).flatMap((task) => [task.ownerId, task.reviewerId, ...task.work?.plan.adviserGate === "dual" ? state.members.filter((member) => memberFunction(state, member)?.endsWith("_adviser")).map((member) => member.id) : []]));
        for (const owner of targets) {
          if (owner === void 0 || owner === agent.id || this.ctx.agents.get(owner) !== void 0)
            continue;
          const stored = await readPersistedSession(this.ctx.sessionPersistence, owner, this.lifecycle.signal);
          const last = stored.events.findLast((event) => event.type === "turn/end");
          const route = stored.events.findLast((event) => event.type === "request/header");
          if (last !== void 0)
            await this.scheduleCooldown(agent, owner, last, route?.data.header.config.provider);
        }
        this.scheduleTaskDispatch(agent);
      }
    }
    async scheduleCooldown(root, memberId, event, recordedProvider) {
      if (this.lifecycle.disposed || event.type !== "turn/end" || event.data.reason.kind !== "error")
        return;
      const delay2 = failureCooldownMs(event.data.reason.error, this.config.rateLimitCooldownMs, this.config.quotaCooldownMs);
      if (delay2 === void 0)
        return;
      const state = this.journal.state(root);
      if (state.goal?.status !== "active")
        return;
      const member = state.members.find((candidate) => candidate.id === memberId && candidate.phase === "active");
      const provider = recordedProvider ?? this.ctx.agents.get(memberId)?.session.requestHeader()?.config.provider ?? state.modelRoutes?.find((route) => route.memberId === memberId)?.modelProvider ?? member?.modelProvider;
      if (provider !== void 0)
        this.requests.pause(provider, event.time + delay2);
      const task = state.tasks.find((candidate) => candidate.status === "in_progress" && candidate.work !== void 0 && candidate.work.plan.goalRevision === state.goal?.revision && (candidate.ownerId === memberId && candidate.work.execution?.phase === "running" || candidate.work.execution?.phase === "submitted" && (candidate.reviewerId === memberId || candidate.work.plan.adviserGate === "dual" && memberFunction(state, member)?.endsWith("_adviser") && !state.adviserDecisions?.some((decision) => decision.adviserId === memberId && decision.taskId === candidate.id && decision.executionId === candidate.work?.execution?.id))));
      const execution = task?.work?.execution;
      if (member === void 0 || task === void 0 || execution === void 0)
        return;
      const kind = execution.phase === "running" ? "execute" : task.reviewerId === memberId ? "review" : "advice";
      const prior = state.messages.filter((message) => message.targetId === memberId && message.id.startsWith("team-message-cooldown-") && message.taskDispatch?.executionId === execution.id && message.taskDispatch.taskId === task.id);
      const id2 = TeamMessageId(`team-message-cooldown-${createHash7("sha256").update(JSON.stringify([root.id, memberId, task.id, execution.id, event.seq])).digest("hex")}`);
      if (prior.some((message) => message.id === id2) || prior.length >= this.config.maxAutomaticResumes)
        return;
      await this.mailbox.sendTask(root, {
        target: member.name,
        signal: this.lifecycle.signal,
        ...provider === void 0 ? {} : { cooldownProvider: provider },
        notBefore: event.time + delay2,
        content: [{ type: "text", text: `\u6A21\u578B\u670D\u52A1\u51B7\u5374\u7ED3\u675F\u540E\u7EED\u63A5 ${task.id}\uFF0C\u4FDD\u7559\u6267\u884C ${execution.id}\u3001\u539F\u6A21\u578B\u548C\u8BB0\u5FC6\u3002\u5148\u8BFB\u53D6\u5F53\u524D\u76EE\u6807\u3001team_task_get \u548C\u5DF2\u5B8C\u6210\u68C0\u67E5\u70B9\uFF1B\u4E0D\u65B0\u5EFA\u6267\u884C\u3001\u4E0D\u91CD\u8DD1\u5DF2\u5B8C\u6210\u5DE5\u5177\u64CD\u4F5C\u3002\u5B58\u5728\u672A\u6838\u5B9E\u5916\u90E8\u526F\u4F5C\u7528\u65F6\u5148\u8BF7\u72EC\u7ACB\u6210\u5458\u6838\u5BF9\uFF1B\u6743\u9650\u3001\u670D\u52A1\u5185\u5BB9\u9650\u5236\u4E0E\u6280\u672F\u5931\u8D25\u5206\u522B\u62A5\u544A\uFF0C\u4E0D\u80FD\u6539\u5199\u7528\u6237\u6388\u6743\u3002` }]
      }, id2, task.id, execution.id, kind, kind === "advice" ? memberRoleRevision(state, memberId) : void 0);
    }
    /** Resume delivered but unfinished work only after a new user turn, preserving its exact execution. */
    async resumeIncompleteTasks(root, userKey) {
      const state = this.journal.state(root);
      if (state.goal?.status !== "active" || readProjectPlan(state.goal.definition.plan)?.version !== 2)
        return;
      for (const task of state.tasks) {
        const work = task.work;
        const execution = work?.execution;
        if (work === void 0 || work.plan.goalRevision !== state.goal.revision || execution === void 0 || !["running", "submitted"].includes(execution.phase))
          continue;
        const targets = execution.phase === "running" ? [execution.ownerId] : [
          task.reviewerId,
          ...work.plan.adviserGate === "dual" ? state.members.filter((member) => memberFunction(state, member)?.endsWith("_adviser") && !state.adviserDecisions?.some((decision) => decision.adviserId === member.id && decision.taskId === task.id && decision.executionId === execution.id && decision.adviserRoleRevision === memberRoleRevision(state, member.id))).map((member) => member.id) : []
        ];
        for (const targetId of targets) {
          const current = this.journal.state(root);
          const member = current.members.find((candidate) => candidate.id === targetId && candidate.phase === "active");
          if (member === void 0 || member.id === root.id || this.roster.list(this.roster.membership(root)).find((candidate) => candidate.id === member.id)?.status !== "inactive")
            continue;
          if (current.messages.some((message) => message.targetId === member.id && message.goalRevision === state.goal?.revision && !current.delivered.includes(message.id)))
            continue;
          const previous = current.messages.filter((message) => message.targetId === member.id && message.id.startsWith("team-message-continue-") && message.taskDispatch?.taskId === task.id && message.taskDispatch.executionId === execution.id);
          if (previous.length >= this.config.maxAutomaticResumes)
            continue;
          const kind = execution.phase === "running" ? "execute" : member.id === task.reviewerId ? "review" : "advice";
          if (kind === "review" && work.plan.adviserGate === "dual" && !hasDualAdviserApproval(current, task) && !hasAdviserRevisionRequest(current, task))
            continue;
          const id2 = TeamMessageId("team-message-continue-" + createHash7("sha256").update(JSON.stringify([
            root.id,
            member.id,
            state.goal.revision,
            task.id,
            execution.id,
            userKey
          ])).digest("hex"));
          await this.mailbox.sendTask(root, { target: member.name, signal: this.lifecycle.signal, content: [{ type: "text", text: `\u7528\u6237\u5DF2\u7EE7\u7EED\u5F53\u524D\u4F1A\u8BDD\u3002\u7EED\u63A5\u4EFB\u52A1 ${task.id}\uFF0C\u4FDD\u7559\u6267\u884C ${execution.id}\u3001\u8EAB\u4EFD\u3001\u6A21\u578B\u3001\u6280\u80FD\u53CA\u5DF2\u6709\u6587\u4EF6\uFF1B\u4E0D\u662F\u65B0\u4E00\u8F6E\u5C1D\u8BD5\u3002\u5148\u8BFB\u53D6 team_task_get \u548C\u73B0\u6709\u68C0\u67E5\u70B9\uFF0C\u7981\u6B62\u91CD\u8DD1\u5DF2\u5B8C\u6210\u64CD\u4F5C\u3002\u8F93\u5165\u53EF\u7528 team_workspace read_input \u6309\u56DE\u6267\u6838\u5BF9\uFF1B\u5B58\u5728\u672A\u77E5\u5916\u90E8\u5F71\u54CD\u65F6\u5148\u7531\u72EC\u7ACB\u590D\u6838\u4EBA\u6838\u5BF9\u5E76 reconcile\u3002\u670D\u52A1\u9650\u5236\u3001\u6280\u672F\u963B\u788D\u548C\u6388\u6743\u5206\u522B\u62A5\u544A\uFF1B\u4E0D\u8981\u6539\u5199\u7528\u9014\u6216\u7528\u6237\u6388\u6743\u3002\u4EC5\u5B8C\u6210\u5C1A\u672A\u5B8C\u6210\u7684${kind === "execute" ? "\u6267\u884C\u4E0E\u63D0\u4EA4" : kind === "review" ? "\u72EC\u7ACB\u590D\u6838" : "\u519B\u5E08\u51B3\u5B9A"}\u3002` }] }, id2, task.id, execution.id, kind, kind === "advice" ? memberRoleRevision(current, member.id) : void 0);
        }
      }
    }
    /** Schedule one coalesced pass after the committing transaction releases the Lead log. */
    scheduleTaskDispatch(root) {
      if (!this.config.autoDispatchReadyTasks && !this.config.autoAssignReadyTasks || this.lifecycle.disposed || this.ctx.agents.get(root.id) !== root)
        return;
      this.pendingTaskDispatches.add(root.id);
      if (this.taskDispatchRuns.has(root.id))
        return;
      queueMicrotask(() => {
        if (this.lifecycle.disposed || this.taskDispatchRuns.has(root.id) || !this.pendingTaskDispatches.has(root.id))
          return;
        const run = this.dispatchReadyTasks(root).catch(async (error) => {
          if (this.lifecycle.disposed || error instanceof TeamError && error.code === "TEAM_GOAL_CHANGED")
            return;
          const detail = errorMessage(error).slice(0, 2e3);
          this.ctx.logger.warn(`Team task dispatch for "${root.id}" failed: ${detail}`);
          const state = this.journal.state(root);
          const marker2 = `dispatch-failure:${createHash7("sha256").update(JSON.stringify([state.goal?.revision, detail])).digest("hex")}`;
          const noticeId = TeamMessageId("team-message-" + marker2.replace(":", "-"));
          if (state.messages.some((message) => message.id === noticeId))
            return;
          try {
            await this.mailbox.sendNotice(root, noticeId, [{ type: "text", text: `${marker2}
\u56E2\u961F\u81EA\u52A8\u6D3E\u5DE5\u672A\u5B8C\u6210\u3002\u4FDD\u7559\u539F\u6210\u5458\u3001\u4EFB\u52A1\u548C\u4EA7\u7269\uFF1B\u5148\u7528 team_goal read\u3001team_context diagnostics\u3001team_mailbox \u68C0\u67E5\u76EE\u6807\u53CA\u963B\u788D\uFF0C\u4E0D\u8981\u65B0\u5EFA\u91CD\u590D\u961F\u4F0D\u6216\u6539\u7528\u666E\u901A subagent\u3002\u4FEE\u590D\u63D0\u4F9B\u65B9\u3001\u6280\u80FD\u6216\u8DEF\u5F84\u914D\u7F6E\u540E\u7EE7\u7EED\u539F\u4EFB\u52A1\u3002\u9519\u8BEF\uFF1A${detail}` }], this.lifecycle.signal);
          } catch (notificationError) {
            if (!this.lifecycle.disposed)
              this.ctx.logger.warn(`Team dispatch diagnostic could not be delivered: ${errorMessage(notificationError)}`);
          }
        }).finally(() => {
          this.taskDispatchRuns.delete(root.id);
          if (this.pendingTaskDispatches.has(root.id))
            this.scheduleTaskDispatch(root);
        });
        this.taskDispatchRuns.set(root.id, run);
      });
    }
    /** Deliver each current assigned execution once through the durable mailbox. */
    async dispatchReadyTasks(root) {
      while (this.pendingTaskDispatches.delete(root.id)) {
        if (this.lifecycle.disposed || this.goals.denial(root) !== void 0)
          return;
        if (this.config.autoProvisionPlannedMembers)
          await provisionPlan(this, root, {
            subagents: this.ctx.subagents,
            provider: this.config.plannedMemberProvider,
            maxNew: this.config.maxProvisionPerPass,
            signal: this.goals.capture(root, this.lifecycle.signal),
            state: () => this.journal.state(root)
          });
        await this.applyProjectRoster(root);
        if (this.config.autoAssignReadyTasks)
          await this.assignReadyTasks(root);
        if (!this.config.autoDispatchReadyTasks)
          continue;
        const state = this.journal.state(root);
        if (state.goal === void 0)
          return;
        for (const task of state.tasks) {
          const execution = task.work?.execution;
          if (task.autoDispatch === true && task.status === "pending" && execution?.phase === "rejected" && task.work?.plan.goalRevision === state.goal.revision) {
            const noticeId = TeamMessageId(`team-message-task-rejected-${createHash7("sha256").update(JSON.stringify([root.id, task.id, execution.id])).digest("hex")}`);
            if (!state.messages.some((message) => message.id === noticeId)) {
              await this.mailbox.sendNotice(root, noticeId, [{ type: "text", text: `\u4EFB\u52A1 ${task.id}\uFF08${task.subject}\uFF09\u7684\u6267\u884C ${execution.id} \u5DF2\u88AB\u72EC\u7ACB\u590D\u6838\u9000\u56DE\u3002\u5148\u7528 team_task_get \u548C team_adviser_review(action=list) \u6838\u5BF9\u4FEE\u8BA2\u7406\u7531\u4E0E\u65E7\u5DE5\u5177\u5F71\u54CD\uFF1B\u9700\u8981\u65F6\u8BF7\u539F\u590D\u6838\u4EBA reconcile\u3002\u53EF\u4FEE\u8BA2\u65F6\u7531\u961F\u957F\u7528 team_task_update(action=reassign, owner=\u539F\u6210\u5458\u540D\u79F0) \u660E\u786E\u5F00\u59CB\u4E0B\u4E00\u6B21\u6267\u884C\uFF0C\u4FDD\u7559\u539F\u6210\u5458\u4E0E\u6210\u679C\uFF1B\u4E0D\u80FD\u53D6\u6D88\u9A8C\u6536\u8981\u6C42\u3001\u4F2A\u9020\u519B\u5E08\u6279\u51C6\u6216\u91CD\u8DD1\u5DF2\u5B8C\u6210\u4EFB\u52A1\u3002\u771F\u5B9E\u5206\u6B67\u5411\u7528\u6237\u8BF4\u660E\uFF0C\u53EA\u6682\u505C\u53D7\u5F71\u54CD\u8DEF\u7EBF\u3002` }], this.lifecycle.signal);
            }
            continue;
          }
          if (task.autoDispatch !== true || task.status !== "in_progress" || execution === void 0 || task.work?.plan.goalRevision !== state.goal.revision || !taskReady(state, task))
            continue;
          if (this.config.autoAssignReadyTasks && execution.phase === "submitted" && (task.reviewerId === void 0 || !state.members.some((member) => member.id === task.reviewerId && member.phase === "active"))) {
            const planned = readProjectPlan(state.goal.definition.plan)?.tasks.find((candidate) => candidate.id === task.inputKey);
            const eligible = this.roster.list(this.roster.membership(root)).filter((member) => member.role === "teammate" && (planned === void 0 || member.name === planned.reviewer) && member.id !== execution.ownerId && member.status === "inactive" && (member.teamFunction === "verifier" || member.teamFunction === "executor") && !state.tasks.some((other) => other.ownerId === member.id && other.work?.execution?.phase === "running"));
            eligible.sort((a, b) => Number(b.teamFunction === "verifier") - Number(a.teamFunction === "verifier") || state.tasks.filter((other) => other.reviewerId === a.id && other.status === "in_progress").length - state.tasks.filter((other) => other.reviewerId === b.id && other.status === "in_progress").length);
            const reviewer = eligible[0];
            if (reviewer !== void 0) {
              await this.tasks.update(root, {
                taskId: task.id,
                expectedRevision: task.revision,
                action: "configure_review",
                reviewer: reviewer.name
              }, this.lifecycle.signal);
              continue;
            }
          }
          const notifications = [];
          if (execution.phase === "running")
            notifications.push({ targetId: execution.ownerId, kind: "execute" });
          if (execution.phase === "submitted") {
            if (task.work.plan.adviserGate === "dual") {
              for (const adviserFunction of ["planning_adviser", "quality_adviser"]) {
                const adviser = state.members.find((candidate) => candidate.phase === "active" && memberFunction(state, candidate) === adviserFunction);
                if (adviser !== void 0)
                  notifications.push({ targetId: adviser.id, kind: "advice" });
              }
            }
            if (task.reviewerId !== void 0 && (task.work.plan.adviserGate !== "dual" || hasDualAdviserApproval(state, task) || hasAdviserRevisionRequest(state, task))) {
              notifications.push({ targetId: task.reviewerId, kind: "review" });
            }
          }
          for (const { targetId, kind } of notifications) {
            if (targetId === root.id)
              continue;
            const member = state.members.find((candidate) => candidate.id === targetId && candidate.phase === "active");
            if (member === void 0)
              continue;
            const revisedAdvisers = kind === "review" && task.work.plan.adviserGate === "dual" ? state.members.filter((candidate) => candidate.phase === "active" && (memberFunction(state, candidate) === "planning_adviser" || memberFunction(state, candidate) === "quality_adviser")).map((candidate) => [candidate.id, memberRoleRevision(state, candidate.id)]).filter(([, revision3]) => revision3 > 0) : [];
            const digest2 = createHash7("sha256").update(JSON.stringify([
              root.id,
              task.id,
              execution.id,
              targetId,
              kind,
              state.goal.revision,
              ...kind === "review" && hasAdviserRevisionRequest(state, task) ? ["adviser-revision"] : [],
              ...kind === "advice" && memberRoleRevision(state, targetId) > 0 ? [memberRoleRevision(state, targetId)] : [],
              ...revisedAdvisers.length === 0 ? [] : [revisedAdvisers]
            ])).digest("hex");
            const messageId = TeamMessageId(`team-message-task-${digest2}`);
            const inputPaths = task.work.plan.inputPaths ?? [];
            if (member.workspace !== void 0 && inputPaths.length > 0 && !state.messages.some((message) => message.id === messageId)) {
              const activity = this.roster.list(this.roster.membership(root)).find((candidate) => candidate.id === member.id);
              if (activity?.status !== "inactive")
                continue;
              try {
                await this.refreshWorkspace(root, member.name, inputPaths, this.lifecycle.signal);
              } catch (error) {
                if (this.lifecycle.signal.aborted)
                  return;
                const detail = errorMessage(error);
                const marker2 = `workspace-preparation:${createHash7("sha256").update(JSON.stringify([task.id, execution.id, detail])).digest("hex")}`;
                if (!this.journal.state(root).messages.some((message) => message.targetId === root.id && message.content.some((block) => block.type === "text" && block.text.includes(marker2)))) {
                  await this.mailbox.sendNotice(root, TeamMessageId("team-message-" + marker2.replace(":", "-")), [{ type: "text", text: `${marker2}
\u4EFB\u52A1 ${task.id} \u6D3E\u53D1\u524D\u7684\u8F93\u5165\u51C6\u5907\u5931\u8D25\uFF0C\u4FDD\u7559\u539F\u6210\u5458\u548C\u6210\u679C\u3002\u8BF7\u6838\u5BF9\u524D\u7F6E\u4EA7\u7269\u662F\u5426\u5DF2\u9A8C\u6536\u5E76\u53D1\u5E03\u3001\u5F53\u524D\u8BA1\u5212\u8F93\u5165\u7248\u672C\u548C\u6210\u5458\u672A\u63D0\u4EA4\u4FEE\u6539\uFF1B\u89E3\u51B3\u51B2\u7A81\u540E\u7EE7\u7EED\u539F\u4EFB\u52A1\uFF0C\u4E0D\u91CD\u505A\u5DF2\u9A8C\u6536\u5DE5\u4F5C\u3002\u9519\u8BEF\u6570\u636E\uFF1A${JSON.stringify(detail)}` }], this.lifecycle.signal);
                }
                continue;
              }
            }
            const text4 = kind === "execute" ? `\u5DF2\u5206\u914D\u56E2\u961F\u4EFB\u52A1 ${task.id}\uFF08${task.subject}\uFF09\uFF0C\u6267\u884C\u7F16\u53F7 ${execution.id}\u3002\u5148\u7528 team_task_get({"task_id":"${task.id}"}) \u6838\u5BF9\u5F53\u524D\u76EE\u6807\u7248\u672C\u3001\u8F93\u5165\u548C\u9A8C\u6536\uFF0C\u518D\u6309\u8BA1\u5212\u6267\u884C\u3002\u63D0\u4EA4\u7ED3\u679C\u987B\u9644\u6587\u4EF6\u4E0E\u9A8C\u8BC1\u8BC1\u636E\uFF0C\u7531\u53E6\u4E00\u540D\u6210\u5458\u72EC\u7ACB\u590D\u6838\u3002\u4E0D\u8981\u91CD\u505A\u5DF2\u9A8C\u6536\u7684\u4EFB\u52A1\u3002` : kind === "advice" ? `\u5173\u952E\u4EFB\u52A1 ${task.id}\uFF08${task.subject}\uFF09\u7684\u6267\u884C ${execution.id} \u5DF2\u63D0\u4EA4\u3002\u4F60\u662F\u519B\u5E08\uFF0C\u53EA\u9700\u5BA1\u9605\u8BE5\u7248\u672C\u7684\u65B9\u6848\u3001\u8BC1\u636E\u4E0E\u53CD\u4F8B\uFF1B\u8C03\u7528 team_task_get\uFF0C\u7528 team_workspace \u7684 read_artifact \u8BFB\u4EA7\u7269\u3001read_input \u8BFB\u8BA1\u5212 inputs \u4E2D\u8BB0\u5F55\u7684\u539F\u59CB\u8F93\u5165\uFF0C\u6309 nextByteOffset \u7EED\u9875\uFF1B\u518D\u7528 team_adviser_review({"action":"record",...}) \u7559\u4E0B\u7B80\u77ED\u72EC\u7ACB\u610F\u89C1\u3002\u4E0D\u5F97\u58F0\u79F0\u672A\u5B9E\u9645\u5B8C\u6210\u7684\u68C0\u67E5\uFF0C\u4E0D\u91CD\u590D\u6267\u884C\u539F\u4EFB\u52A1\u3002` : `\u56E2\u961F\u4EFB\u52A1 ${task.id}\uFF08${task.subject}\uFF09\u7684\u6267\u884C ${execution.id} \u5DF2\u63D0\u4EA4\u3002${hasAdviserRevisionRequest(state, task) ? "\u519B\u5E08\u63D0\u51FA\u4FEE\u8BA2\uFF0C\u5148\u8BFB\u53D6\u5F53\u524D\u610F\u89C1\u5E76\u72EC\u7ACB\u6838\u5BF9\uFF1B\u6709\u5B9E\u8D28\u7F3A\u9677\u53EF rejected\uFF0C\u672A\u6709\u53CC\u6279\u51C6\u4E0D\u5F97 accepted\u3002" : ""}\u4F60\u662F\u6307\u5B9A\u7684\u72EC\u7ACB\u590D\u6838\u4EBA\uFF1B\u5148\u7528 team_task_get({"task_id":"${task.id}"}) \u6838\u5BF9\u5F53\u524D\u63D0\u4EA4\u3001\u6BCF\u9879\u9A8C\u6536\u6761\u4EF6\u53CA\u5B9E\u9645\u8BC1\u636E\u3002\u4F7F\u7528 team_workspace({"action":"read_artifact","task_id":"${task.id}","execution_id":"${execution.id}","file_path":"\u63D0\u4EA4\u8BB0\u5F55\u4E2D\u7684\u76F8\u5BF9\u4EA7\u7269\u8DEF\u5F84"}) \u8BFB\u6210\u679C\uFF1B\u628A action \u6539\u4E3A read_input \u53EF\u8BFB plan.inputs \u4E2D\u8BB0\u5F55\u7684\u539F\u59CB\u8F93\u5165\uFF0C\u5373\u4F7F\u4F60\u7684\u79C1\u6709\u76EE\u5F55\u4E3A\u7A7A\u4E5F\u53EF\u6838\u5BF9\u3002\u6309 nextByteOffset \u539F\u503C\u5206\u9875\uFF0C\u4E0D\u5FC5\u96C6\u6210\u6216\u6269\u5927\u6743\u9650\u3002\u5DE5\u5177\u5F71\u54CD\u672A\u6838\u5BF9\u65F6\uFF0C\u63A5\u53D7\u524D\u5148\u68C0\u67E5\u5B9E\u9645\u72B6\u6001\u5E76\u7528 team_task_reconcile\uFF0C\u518D\u8BFB\u53D6\u6700\u65B0 revision\u3002\u8BC1\u636E\u4E0D\u8DB3\u53EF\u76F4\u63A5 rejected\uFF1Breview \u5FC5\u987B\u63D0\u4F9B execution_id\u3001review_decision\u3001review_summary \u548C\u975E\u7A7A\u5B57\u7B26\u4E32\u6570\u7EC4 review_evidence\uFF0Caccepted \u8FD8\u987B\u9010\u9879 review_checks\u3002\u4E0D\u91CD\u590D\u6267\u884C\u539F\u4EFB\u52A1\u3002`;
            const content = [{ type: "text", text: text4 }];
            try {
              await this.mailbox.sendTask(root, { target: member.name, content, signal: this.lifecycle.signal }, messageId, task.id, execution.id, kind, kind === "advice" ? memberRoleRevision(state, targetId) : void 0);
            } catch (error) {
              if (this.lifecycle.signal.aborted)
                return;
              this.ctx.logger.warn(`Team task ${task.id} notification failed: ${errorMessage(error)}`);
            }
          }
        }
        await this.completeProject(root);
      }
    }
    /** Publish accepted final artifacts and notify the communicator once for the exact approved plan. */
    async completeProject(root) {
      if (this.config.finalDelivery === "manual")
        return;
      const state = this.journal.state(root);
      const goal = state.goal;
      const plan = readProjectPlan(goal?.definition.plan);
      if (goal?.status !== "active" || plan?.version !== 2 || plan.automation?.provision !== "on-demand")
        return;
      const id2 = TeamMessageId(`team-message-complete-${createHash7("sha256").update(JSON.stringify([goal.revision, goal.definition.plan, this.config.finalDelivery])).digest("hex")}`);
      if (state.messages.some((message) => message.id === id2))
        return;
      const tasks = plan.tasks.map((planned) => state.tasks.find((task) => task.inputKey === planned.id && task.work?.plan.goalRevision === goal.revision && task.status === "completed"));
      if (tasks.some((task) => task === void 0))
        return;
      const signal = this.goals.capture(root, this.lifecycle.signal);
      for (const planned of plan.tasks.filter((task) => task.kind === "delivery")) {
        const task = tasks.find((candidate) => candidate?.inputKey === planned.id);
        const [verified] = await this.validateTaskHandoff(root, [task.id], signal);
        if (verified?.validity.reusable !== true || verified.revision !== task.revision)
          throw new TeamError("Final delivery evidence changed; revalidate the original result before publication", "TEAM_TASK_EXECUTION_STALE");
        const owner = state.members.find((member) => member.id === task.ownerId);
        if (this.config.finalDelivery === "publish-and-notify" && owner?.workspace !== void 0 && task.work?.execution?.submission?.artifacts?.length) {
          if (this.roster.list(this.roster.membership(root)).find((member) => member.id === owner.id)?.status !== "inactive")
            return;
          await this.integrateWorkspace(root, owner.name, signal);
        }
      }
      signal.throwIfAborted();
      const publication = this.config.finalDelivery === "publish-and-notify" ? "\u6700\u7EC8\u6587\u4EF6\u5DF2\u5B8C\u6210\u53D7\u68C0\u67E5\u7684\u53D1\u5E03\u3002" : "\u6700\u7EC8\u6210\u679C\u4ECD\u9700\u6309\u63D0\u4EA4\u56DE\u6267\u68C0\u67E5\u5E76\u663E\u5F0F\u53D1\u5E03\uFF1B\u4E0D\u80FD\u5BA3\u79F0\u5DF2\u5199\u5165\u5171\u4EAB\u76EE\u5F55\u3002";
      await this.mailbox.sendNotice(root, id2, [{ type: "text", text: `\u786E\u8BA4\u65B9\u6848\u7248\u672C ${goal.revision} \u7684 ${tasks.length} \u9879\u4EFB\u52A1\u5747\u5DF2\u72EC\u7ACB\u9A8C\u6536\uFF0C${publication}\u8BF7\u8BFB\u53D6\u5F53\u524D\u76EE\u6807\u4E0E team_task_archive \u7684\u9A8C\u6536\u56DE\u6267\uFF0C\u5411\u7528\u6237\u6C47\u603B\u4EA4\u4ED8\u4F4D\u7F6E\u3001\u9010\u9879\u7ED3\u679C\u4E0E\u5DF2\u77E5\u9650\u5236\u3002\u4E0D\u8981\u91CD\u65B0\u6267\u884C\u5DF2\u9A8C\u6536\u4EFB\u52A1\uFF0C\u4E5F\u4E0D\u8981\u628A\u65B9\u6848\u5B8C\u6210\u6269\u5927\u4E3A\u672A\u7ECF\u9A8C\u8BC1\u7684\u4E1A\u52A1\u7ED3\u8BBA\u3002` }], signal);
    }
    async applyProjectRoster(root) {
      const state = this.journal.state(root);
      const goal = state.goal;
      const plan = readProjectPlan(goal?.definition.plan);
      if (goal?.status !== "active" || plan === void 0)
        return;
      const signal = this.goals.admit(root, this.lifecycle.signal);
      for (const planned of plan.members) {
        const member = this.roster.list(this.roster.membership(root)).find((candidate) => candidate.name === planned.name && candidate.status === "inactive");
        if (member === void 0)
          continue;
        const current = this.journal.state(root);
        const route = current.modelRoutes?.find((candidate) => candidate.memberId === member.id);
        if (route?.goalRevision !== goal.revision && (member.modelProvider !== planned.modelProvider || member.model !== planned.model || member.reasoningEffort !== planned.reasoningEffort)) {
          await this.roster.configureModel(root, {
            target: member.name,
            expectedRevision: route?.revision ?? 0,
            modelProvider: planned.modelProvider,
            model: planned.model,
            reasoningEffort: planned.reasoningEffort
          }, signal);
        }
        const role = current.memberRoles?.find((candidate) => candidate.memberId === member.id);
        if (role?.goalRevision !== goal.revision && member.teamFunction !== planned.function) {
          await this.roster.configureRole(root, {
            target: member.name,
            expectedRevision: role?.revision ?? 0,
            teamFunction: planned.function,
            reason: `Confirmed project goal ${goal.revision}`
          }, signal);
        }
        const saved = this.skillSelections.read(root, member.name);
        if (saved.goalRevision !== goal.revision || saved.revision === 0) {
          if (saved.skills.length === planned.skills.length && saved.skills.every((skill) => planned.skills.includes(skill.name))) {
            if (saved.revision > 0)
              await this.skillSelections.rebind(root, member.name, saved.revision, signal);
          } else {
            const skills = await Promise.all(planned.skills.map(async (name) => ({
              ...await this.ctx.waterfall("team/resolve-skill", { agent: root, name, signal }, () => Promise.reject(new TeamError(`skill unavailable: ${name}`, "TEAM_SKILL_UNAVAILABLE"))),
              purpose: planned.responsibility.slice(0, 200).replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, " ")
            })));
            await this.skillSelections.select(root, { member: member.name, expectedRevision: saved.revision, skills }, signal);
          }
        }
      }
    }
    /** Give each ready task one idle executor with its selected current-goal skill. */
    async assignReadyTasks(root) {
      const skipped = /* @__PURE__ */ new Set();
      while (!this.lifecycle.disposed) {
        const state = this.journal.state(root);
        if (state.goal?.status !== "active")
          return;
        const task = state.tasks.find((candidate2) => candidate2.autoAssign === true && candidate2.status === "pending" && candidate2.work?.execution?.phase !== "rejected" && resourceConflicts(state, candidate2).length === 0 && !skipped.has(candidate2.id) && taskReady(state, candidate2));
        if (task === void 0)
          return;
        const members = this.roster.list(this.roster.membership(root));
        const planned = readProjectPlan(state.goal.definition.plan)?.tasks.find((candidate2) => candidate2.id === task.inputKey);
        const candidate = members.find((member) => member.role === "teammate" && (planned === void 0 || member.name === planned.owner) && (member.teamFunction === "executor" || member.teamFunction === "group_lead" || member.teamFunction === "verifier" || member.teamFunction === void 0 && task.requiredSkill !== void 0) && member.status === "inactive" && !state.skillSelections?.some((selection) => selection.memberId === member.id && selection.goalRevision !== state.goal?.revision && selection.skills.length > 0) && !state.tasks.some((other) => other.status === "in_progress" && other.ownerId === member.id && other.work?.execution?.phase !== "submitted") && !state.messages.some((message) => message.targetId === member.id && message.goalRevision === state.goal?.revision && !state.delivered.includes(message.id)) && (task.requiredSkill === void 0 || state.skillSelections?.some((selection) => selection.memberId === member.id && selection.goalRevision === state.goal?.revision && selection.skills.some((skill) => skill.name === task.requiredSkill)) === true));
        if (candidate === void 0) {
          skipped.add(task.id);
          continue;
        }
        try {
          await this.tasks.update(root, {
            taskId: task.id,
            expectedRevision: task.revision,
            action: "reassign",
            owner: candidate.name
          }, this.lifecycle.signal);
        } catch (error) {
          if (this.lifecycle.signal.aborted)
            return;
          skipped.add(task.id);
          this.ctx.logger.warn(`Team task ${task.id} automatic assignment skipped: ${errorMessage(error)}`);
        }
      }
    }
    /** Stop Team-owned live branches and release every waiter before service disposal completes. */
    async disposeRuntime() {
      this.lifecycle.close();
      this.requests.close(new TeamError("Agent Teams service disposed", "TEAM_DISPOSED"));
      this.activity.close();
      const failures = [];
      await this.lifecycle.settle(this.roster.pendingCreations(), failures);
      await this.lifecycle.settle(this.mailbox.pendingDispatches(), failures);
      await this.lifecycle.settle([...this.taskDispatchRuns.values(), ...this.continueRuns.values()], failures);
      for (const [root, childIds] of this.roster.liveChildrenByRoot()) {
        try {
          await this.roster.stopTeammates(root, childIds);
        } catch (error) {
          failures.push(error);
        }
      }
      await this.lifecycle.settle([this.journal.drain()], failures);
      this.roster.releaseWorkspaceCaps();
      this.coordination?.close();
      if (failures.length > 0)
        throw new AggregateError(failures, "Agent Teams runtime disposal failed");
    }
  };
})();
var index_default = TeamService;
export {
  TeamError,
  TeamId,
  TeamMessageId,
  TeamService,
  TeamTaskExecutionId,
  TeamTaskId,
  index_default as default,
  readProjectPlan
};
