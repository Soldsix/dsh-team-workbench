// packages/team/modules/compat-subagent/lib/types/index.js
import z4 from "@deepseek-ai/schemastery";
import { scopeTarget } from "@deepseek-ai/dsh-scope";
import { assertObjectJsonSchema } from "@deepseek-ai/dsh-tools";
import { canonicalClientTimeZone } from "@deepseek-ai/dsh-util-time";
import { Remote, RemoteError as RemoteError2, TypertRemoteService, principalOf } from "@deepseek-ai/dsh-typert-protocol";

// packages/team/modules/compat-subagent/lib/types/control.js
import { AttachmentError } from "@deepseek-ai/dsh-attachment";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { z } from "zod";

// packages/team/modules/compat-subagent/lib/types/error.js
import { HarnessError } from "@deepseek-ai/dsh-llm";
var SubagentError = class extends HarnessError {
  constructor(message, code, options) {
    super(message, code, options);
    this.name = "SubagentError";
  }
};

// packages/team/modules/compat-subagent/lib/types/control.js
var SESSION_ID_SCHEMA = z.string().min(1);
var CONTROL_ID_SCHEMAS = {
  "subagent.prompt": z.object({
    parentSessionId: SESSION_ID_SCHEMA,
    childSessionId: SESSION_ID_SCHEMA,
    mode: z.literal("continuable"),
    delivery: z.enum(["queue", "steer"])
  }),
  "subagent.interrupt": z.object({
    parentSessionId: SESSION_ID_SCHEMA,
    childSessionId: SESSION_ID_SCHEMA,
    mode: z.literal("continuable")
  })
};
function validateControlRequest(method, payload) {
  const parsed = CONTROL_ID_SCHEMAS[method].safeParse(payload);
  if (!parsed.success) {
    throw new RemoteError("gateway/bad-request", `invalid payload for ${method}`, { issues: parsed.error.issues });
  }
}
function rejectPrompt(error, childSessionId, signal) {
  if (isCancellation(error, signal)) {
    throw new RemoteError("gateway/cancelled", "subagent prompt was cancelled", {}, { cause: error });
  }
  if (error instanceof AttachmentError) {
    throw new RemoteError("subagent/attachment-invalid", error.message, { reason: error.code }, { cause: error });
  }
  if (error instanceof SubagentError) {
    switch (error.code) {
      case "MODEL_DOES_NOT_SUPPORT_IMAGES":
        throw new RemoteError("subagent/attachment-invalid", error.message, { reason: error.code }, { cause: error });
      case "NOT_RESUMABLE":
        throw new RemoteError("subagent/not-resumable", "subagent cannot be resumed", { childSessionId }, { cause: error });
      case "UNAUTHORIZED":
        throw new RemoteError("subagent/unauthorized", "subagent does not belong to this parent", { childSessionId }, { cause: error });
      case "DRAINING":
      case "ACTIVATION_CLOSING":
      case "ACTIVATION_LIMIT_REACHED":
      case "CONTINUATION_UNAVAILABLE":
      case "PERSISTENCE_UNAVAILABLE":
        throw new RemoteError("subagent/delivery-unavailable", "subagent follow-up is temporarily unavailable", { childSessionId }, { cause: error });
      // A code outside the admission vocabulary is not the caller's move to make.
      default:
        break;
    }
  }
  throw new RemoteError("gateway/internal", "subagent prompt failed", {}, { cause: error });
}
function isCancellation(error, signal) {
  return signal.aborted || error instanceof SubagentError && error.code === "CANCELLED";
}

// packages/team/modules/compat-subagent/lib/types/depth.js
function delegationDepthOf(agent) {
  const runtime = agent.options.subagentDepth;
  if (runtime !== void 0 && (!Number.isSafeInteger(runtime) || runtime < 0 || Object.is(runtime, -0))) {
    throw new TypeError("agent subagentDepth must be a non-negative safe integer");
  }
  return Math.max(agent.session.header.delegationDepth ?? 0, runtime ?? 0);
}
function assertSubagentMaxDepth(maxDepth) {
  if (maxDepth !== void 0 && (typeof maxDepth !== "number" || !Number.isSafeInteger(maxDepth) || maxDepth < 0 || Object.is(maxDepth, -0))) {
    throw new TypeError("subagent maxDepth must be a non-negative safe integer");
  }
}

// packages/team/modules/compat-subagent/lib/types/lifecycle.js
import { randomUUID } from "node:crypto";
import { foldConsumedWork } from "@deepseek-ai/dsh-agent";

// packages/team/modules/compat-subagent/lib/types/types.js
function SubagentRunId(id) {
  return id;
}

// packages/team/modules/compat-subagent/lib/types/lifecycle.js
function createLifecycleEmitter(ctx, carrier) {
  return (name, info, parent) => {
    const dispatchArgs = parent === void 0 ? [name, info] : [carrier(parent), name, info];
    for (const callback of ctx.events.dispatch("emit", dispatchArgs)) {
      try {
        const returned = callback(info);
        void Promise.resolve(returned).catch((error) => {
          ctx.logger.warn(`subagent: ${name} listener rejected: ${renderThrown(error)}`);
        });
      } catch (error) {
        ctx.logger.warn(`subagent: ${name} listener threw: ${renderThrown(error)}`);
      }
    }
  };
}
function createActivationObserver(emit, provider, childId, parent) {
  const identity = { runId: SubagentRunId(randomUUID()), provider, id: childId, local: false };
  return {
    start: (child) => {
      identity.local = child !== void 0;
      emit("subagent/start", identity, parent);
    },
    settle: ({ stopReason, output }) => {
      emit("subagent/end", {
        ...identity,
        stopReason,
        ...output.length === 0 ? {} : { lastAssistantMessage: output }
      }, parent);
    }
  };
}
function epochStopReason(events) {
  const { end, droppedUnrun } = foldConsumedWork(events);
  switch (end?.data.reason.kind) {
    case "max-tokens":
      return "max-tokens";
    case "aborted":
    case "interrupted":
      return "aborted";
    case "error":
      return "error";
    // A pre-step rejection — a hook deny, a policy plugin — discarded input
    // this epoch had claimed: the work was declined, not done.
    case "blocked":
      return "refusal";
    // A clean ending and no accounting turn at all share one rule: the epoch
    // finished what it was given unless a cancelled queue says otherwise.
    case void 0:
    case "completed":
      return droppedUnrun ? "aborted" : "completed";
    /* v8 ignore next 4 -- `forked` appears only in constructor seed history, while
     * this function reads an epoch-owned suffix. `TurnEndReason` is merge-extensible,
     * so a backend-added variant cannot be listed; treating an unnameable reason as
     * success would report failed work as completed. */
    default:
      return "error";
  }
}
function renderThrown(value) {
  try {
    return value instanceof Error ? `${value.name}: ${value.message}` : String(value);
  } catch {
    return "<unrenderable thrown value>";
  }
}

// packages/team/modules/compat-subagent/lib/types/manager.js
import { randomUUID as randomUUID2 } from "node:crypto";
import { isAbsolute, resolve } from "node:path";
import { brandString } from "@deepseek-ai/dsh-brand";
import { ReasoningEffortId, contentHasImage, createUserMessage as createUserMessage2, errorChain } from "@deepseek-ai/dsh-llm";
import { SessionLogOffset } from "@deepseek-ai/dsh-session";

// packages/team/modules/compat-subagent/lib/types/child-agent.js
var SubagentDepthError = class extends Error {
  attemptedDepth;
  maxDepth;
  constructor(attemptedDepth, maxDepth) {
    super(`subagent depth ${attemptedDepth} exceeds maxDepth ${maxDepth}`);
    this.attemptedDepth = attemptedDepth;
    this.maxDepth = maxDepth;
    this.name = "SubagentDepthError";
  }
};
function resolveChildDepth(parent, maxDepth) {
  const childDepth = delegationDepthOf(parent) + 1;
  if (!Number.isSafeInteger(childDepth)) {
    throw new RangeError("subagent child depth exceeds the safe-integer range");
  }
  if (maxDepth !== void 0 && childDepth > maxDepth) {
    throw new SubagentDepthError(childDepth, maxDepth);
  }
  return childDepth;
}
function parentAgentOptionsForDelegation(parent) {
  const requestConfig = parent.session.requestHeader()?.config;
  if (requestConfig === void 0)
    return { ...parent.options };
  const { provider: _createdProvider, model: _createdModel, reasoningEffort: _createdReasoningEffort, ...createdOptions } = parent.options;
  return {
    ...createdOptions,
    provider: requestConfig.provider,
    model: requestConfig.model,
    ...requestConfig.reasoningEffort === void 0 ? {} : { reasoningEffort: requestConfig.reasoningEffort }
  };
}
function resolveChildAgentOptions(parent, requested, childDepth) {
  const parentOptions = parentAgentOptionsForDelegation(parent);
  const parentProvider = parentOptions.provider;
  const parentModel = parentOptions.model;
  const parentReasoningEffort = parentOptions.reasoningEffort;
  const parentMaxTokens = parentOptions.maxTokens;
  const resolved = {
    ...parentProvider !== void 0 ? { provider: parentProvider } : {},
    ...parentModel !== void 0 ? { model: parentModel } : {},
    ...parentReasoningEffort !== void 0 ? { reasoningEffort: parentReasoningEffort } : {},
    ...parentMaxTokens !== void 0 ? { maxTokens: parentMaxTokens } : {},
    ...requested,
    subagentDepth: childDepth
  };
  const routeChanged = resolved.provider !== parentProvider || resolved.model !== parentModel;
  if (routeChanged && requested?.reasoningEffort === void 0)
    delete resolved.reasoningEffort;
  return resolved;
}
function childSessionMeta(parent, childDepth, isSeeded, selectedPreset) {
  const parentHeader = parent.session.header;
  const agentPreset = selectedPreset ?? parent.ctx.get("agentPresets")?.composedPreset(parent.ctx);
  return {
    ...parentHeader.cwd !== void 0 ? { cwd: parentHeader.cwd } : {},
    ...agentPreset === void 0 ? {} : { agentPreset },
    parentSession: parentHeader.id,
    isSeeded,
    // Navigation classification only; the descriptor remains the authority
    // for mode and continuation capability.
    origin: "subagent",
    // Durable: the recursion budget must survive persistence and resume.
    delegationDepth: childDepth
  };
}
var SUBAGENT_DELEGATION_CONTEXT = "You are a delegated subagent: your permission scope was fixed when you were started and cannot be widened from inside this session \u2014 operations that require approval are rejected automatically. When the task needs access beyond that scope, do not retry the denied operation; state the limitation in your reply so the delegating agent can handle it.";
function applyChildComposition(childCtx, parent, composition) {
  if (composition.agentPreset !== void 0) {
    const presets = childCtx.get("agentPresets");
    if (presets === void 0) {
      throw new SubagentError("selecting a child agent preset requires the agent-presets service", "PRESET_UNAVAILABLE");
    }
    return presets.mount(childCtx, composition.agentPreset).then(() => {
      applyChildOverrides(childCtx, composition);
    });
  }
  childCtx.get("agentPresets")?.composeFrom(childCtx, parent.ctx);
  applyChildOverrides(childCtx, composition);
}
function applyChildOverrides(childCtx, composition) {
  childCtx.systemPrompt.context({
    name: "subagent:delegation",
    order: childCtx.systemPrompt.getContextOrder("SUBAGENT_DELEGATION"),
    text: SUBAGENT_DELEGATION_CONTEXT
  });
  if (composition.persona !== void 0) {
    childCtx.systemPrompt.section({
      name: "deployment:persona-prefix",
      order: childCtx.systemPrompt.getSectionOrder("DEPLOYMENT_PERSONA_PREFIX"),
      text: composition.persona
    });
  }
  if (composition.toolFilter !== void 0)
    childCtx.tools.restrict(composition.toolFilter);
}
function captureDelegatedPolicyOverrides(parent) {
  const preset = parent.ctx.get("permissionPresets")?.current(parent.session);
  return {
    permissionPreset: preset === "auto" || preset === "danger-full-access" ? preset : void 0,
    sandboxMode: parent.ctx.get("sandboxPolicy")?.overrideOf(parent.session),
    approvalPolicy: parent.ctx.get("approval") === void 0 ? void 0 : "never"
  };
}
function appendDelegatedPolicyOverrides(childSession, overrides) {
  if (overrides.sandboxMode !== void 0) {
    childSession.append("sandbox/mode", { mode: overrides.sandboxMode, source: "delegation" });
  }
  if (overrides.approvalPolicy !== void 0) {
    childSession.append("approval/policy", { policy: overrides.approvalPolicy, source: "delegation" });
  }
  if (overrides.permissionPreset !== void 0) {
    childSession.append("permission/preset", { preset: overrides.permissionPreset });
  }
}

// packages/team/modules/compat-subagent/lib/types/continuation-messages.js
import { boundContextSummary, createUserMessage } from "@deepseek-ai/dsh-llm";
function agentMessageSource(sender) {
  return {
    kind: "agent-message",
    form: "relay",
    senderSessionId: sender.id
  };
}
function createAgentMessage(sender, content) {
  return createUserMessage({
    content: [
      { type: "text", text: `Agent ${sender.id} sent a message: ` },
      ...content
    ],
    source: agentMessageSource(sender)
  });
}
function withContinuableReturnGuidance(parentId, prompt) {
  const encodedParentId = JSON.stringify(parentId);
  return [
    ...prompt,
    {
      type: "text",
      text: `Your parent agent id is ${encodedParentId}. Before you finish, send your result to that agent with send_message({ agent_id: ${encodedParentId}, message: "<self-contained result>" }). The parent shares your workspace but does not automatically receive your transcript, tool output, or reasoning. Send earlier messages as well when a finding changes what the parent should do next; sending a message does not end your turn.`
    }
  ];
}
function settlementSummary(childId, stopReason, continuable) {
  const subject = `Background subagent ${childId}`;
  switch (stopReason) {
    case "completed":
      return continuable ? `${subject} finished and will do no further work unless you send it more.` : `${subject} finished. It cannot receive follow-up messages.`;
    case "aborted":
      return `${subject} was stopped before it finished.`;
    case "max-tokens":
      return `${subject} ran out of room before it finished.`;
    // A pre-step rejection — a hook deny, a policy plugin — discarded input
    // the child had claimed, so the parent must not treat the task as done.
    case "refusal":
      return `${subject} declined the task.`;
    case "error":
      return `${subject} failed before it finished.`;
    /* v8 ignore next 4 -- `SubagentResult['stopReason']` is merge-extensible, so this arm
     * needs a backend that adds a variant; an unnameable ending is reported as unfinished
     * rather than silently as success. */
    default:
      return `${subject} ended abnormally (${String(stopReason)}) before it finished.`;
  }
}
function createSettlementMessage(childId, terminal, continuable = true) {
  const summary = settlementSummary(childId, terminal.stopReason, continuable);
  const closingText = terminal.output.flatMap((block) => block.type === "text" && block.text.length > 0 ? [block] : []);
  return createUserMessage({
    content: [
      { type: "text", text: summary },
      ...closingText.length === 0 ? [{ type: "text", text: "It left no closing message." }] : [{ type: "text", text: "Its closing message:" }, ...closingText],
      ...terminal.structured !== void 0 ? [{ type: "text", text: `Structured result: ${JSON.stringify(terminal.structured)}` }] : [],
      ...terminal.diagnostic !== void 0 ? [{ type: "text", text: terminal.diagnostic }] : []
    ],
    source: {
      kind: "subagent-settled",
      form: "notice",
      summary: boundContextSummary(summary),
      senderSessionId: childId
    }
  });
}

// packages/team/modules/compat-subagent/lib/types/descriptor.js
import { snapshotJsonValue } from "@deepseek-ai/dsh-util-values";
var SUBAGENT_DESCRIPTOR_VERSION = 3;
var DESCRIPTOR_BASE_KEYS = [
  "version",
  "mode",
  "provider",
  "label"
];
var ONE_SHOT_DESCRIPTOR_KEYS = new Set(DESCRIPTOR_BASE_KEYS);
var CONTINUABLE_DESCRIPTOR_KEYS = /* @__PURE__ */ new Set([
  ...DESCRIPTOR_BASE_KEYS,
  "agentProvider",
  "agentModel",
  "agentReasoningEffort",
  "persona",
  "toolFilter",
  "workspaceCwd"
]);
var TOOL_FILTER_KEYS = /* @__PURE__ */ new Set(["allow", "deny"]);
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function assertKnownKeys(value, keys, path) {
  const unknown = Object.keys(value).find((key) => !keys.has(key));
  if (unknown !== void 0) {
    throw new Error(`persisted subagent descriptor ${path} has unknown field "${unknown}"`);
  }
}
function optionalString(value, key) {
  if (!Object.hasOwn(value, key))
    return void 0;
  const field = value[key];
  if (typeof field !== "string") {
    throw new Error(`persisted subagent descriptor ${key} must be a string`);
  }
  return field;
}
function optionalStringArray(value, key) {
  if (!Object.hasOwn(value, key))
    return void 0;
  const field = value[key];
  if (!Array.isArray(field)) {
    throw new Error(`persisted subagent descriptor toolFilter.${key} must be an array of strings`);
  }
  const items = field;
  if (items.some((item) => typeof item !== "string")) {
    throw new Error(`persisted subagent descriptor toolFilter.${key} must be an array of strings`);
  }
  return items;
}
function parseToolFilter(value) {
  if (!isRecord(value)) {
    throw new Error("persisted subagent descriptor toolFilter must be an object");
  }
  assertKnownKeys(value, TOOL_FILTER_KEYS, "toolFilter");
  const allow = optionalStringArray(value, "allow");
  const deny = optionalStringArray(value, "deny");
  if (allow === void 0 && deny === void 0) {
    throw new Error("persisted subagent descriptor toolFilter must declare allow and/or deny");
  }
  return {
    ...allow !== void 0 ? { allow } : {},
    ...deny !== void 0 ? { deny } : {}
  };
}
function parseSubagentDescriptor(value) {
  if (!isRecord(value)) {
    throw new Error("persisted subagent descriptor payload must be an object");
  }
  const version = value["version"];
  if (typeof version !== "number") {
    throw new Error("persisted subagent descriptor version must be a number");
  }
  if (version !== SUBAGENT_DESCRIPTOR_VERSION)
    return void 0;
  const mode = value["mode"];
  if (mode !== "one-shot" && mode !== "continuable") {
    throw new Error('persisted subagent descriptor mode must be "one-shot" or "continuable"');
  }
  assertKnownKeys(value, mode === "one-shot" ? ONE_SHOT_DESCRIPTOR_KEYS : CONTINUABLE_DESCRIPTOR_KEYS, "payload");
  const provider = value["provider"];
  if (typeof provider !== "string") {
    throw new Error("persisted subagent descriptor provider must be a string");
  }
  if (mode === "one-shot") {
    const label2 = optionalString(value, "label");
    return {
      version: SUBAGENT_DESCRIPTOR_VERSION,
      mode,
      provider,
      ...label2 !== void 0 ? { label: label2 } : {}
    };
  }
  const label = value["label"];
  if (typeof label !== "string") {
    throw new Error("persisted subagent descriptor label must be a string");
  }
  const agentProvider = optionalString(value, "agentProvider");
  const agentModel = optionalString(value, "agentModel");
  const agentReasoningEffort = optionalString(value, "agentReasoningEffort");
  const persona = optionalString(value, "persona");
  const workspaceCwd = optionalString(value, "workspaceCwd");
  const toolFilter = Object.hasOwn(value, "toolFilter") ? parseToolFilter(value["toolFilter"]) : void 0;
  return {
    version: SUBAGENT_DESCRIPTOR_VERSION,
    mode,
    provider,
    label,
    ...agentProvider !== void 0 ? { agentProvider } : {},
    ...agentModel !== void 0 ? { agentModel } : {},
    ...agentReasoningEffort !== void 0 ? { agentReasoningEffort } : {},
    ...persona !== void 0 ? { persona } : {},
    ...workspaceCwd !== void 0 ? { workspaceCwd } : {},
    ...toolFilter !== void 0 ? { toolFilter } : {}
  };
}
function snapshotSubagentDescriptor(input) {
  const candidate = {
    version: SUBAGENT_DESCRIPTOR_VERSION,
    mode: input.mode,
    provider: input.provider,
    label: input.label,
    ...input.agentProvider !== void 0 ? { agentProvider: input.agentProvider } : {},
    ...input.agentModel !== void 0 ? { agentModel: input.agentModel } : {},
    ...input.agentReasoningEffort !== void 0 ? { agentReasoningEffort: input.agentReasoningEffort } : {},
    ...input.persona !== void 0 ? { persona: input.persona } : {},
    ...input.toolFilter !== void 0 ? { toolFilter: input.toolFilter } : {}
  };
  const snapshot = snapshotJsonValue(candidate);
  if (snapshot === void 0) {
    throw new Error("subagent descriptor is not losslessly JSON-serializable");
  }
  return snapshot;
}
function foldSubagentDescriptor(events) {
  const event = events.find((candidate) => candidate.type === "subagent/descriptor");
  if (event === void 0)
    return void 0;
  return parseSubagentDescriptor(event.data);
}

// packages/team/modules/compat-subagent/lib/types/catalog.js
import { z as z2 } from "zod";
import { appendChunkedList, chunkedListSchema, iterateChunkedList } from "@deepseek-ai/dsh-chunked-list";
var SUBAGENT_CATALOG_VERSION = 0;
var sessionIdSchema = z2.string();
var oneShotCatalogSchema = z2.object({
  version: z2.union([z2.literal(0), z2.literal(1)]),
  childId: sessionIdSchema,
  childCreatedAt: z2.number().int().nonnegative(),
  mode: z2.literal("one-shot"),
  label: z2.string().optional()
}).strict();
var continuableCatalogSchema = z2.object({
  version: z2.union([z2.literal(0), z2.literal(1)]),
  childId: sessionIdSchema,
  childCreatedAt: z2.number().int().nonnegative(),
  mode: z2.literal("continuable"),
  label: z2.string()
}).strict();
var externalCatalogSchema = oneShotCatalogSchema.extend({ version: z2.literal(2), mode: z2.literal("external") });
var unknownCatalogSchema = oneShotCatalogSchema.extend({ version: z2.literal(1), mode: z2.literal("unknown") });
var eventDataSchema = z2.union([
  oneShotCatalogSchema,
  externalCatalogSchema,
  continuableCatalogSchema,
  unknownCatalogSchema
]);
var viewSchema = z2.array(z2.union([
  oneShotCatalogSchema.omit({ version: true, childId: true, childCreatedAt: true }).extend({
    id: sessionIdSchema,
    createdAt: oneShotCatalogSchema.shape.childCreatedAt
  }),
  externalCatalogSchema.omit({ version: true, childId: true, childCreatedAt: true }).extend({
    id: sessionIdSchema,
    createdAt: externalCatalogSchema.shape.childCreatedAt
  }),
  continuableCatalogSchema.omit({ version: true, childId: true, childCreatedAt: true }).extend({
    id: sessionIdSchema,
    createdAt: continuableCatalogSchema.shape.childCreatedAt
  }),
  unknownCatalogSchema.omit({ version: true, childId: true, childCreatedAt: true }).extend({
    id: sessionIdSchema,
    createdAt: unknownCatalogSchema.shape.childCreatedAt
  })
]));
var stateSchema = z2.object({
  inheritedEventCount: z2.number().int().nonnegative(),
  head: chunkedListSchema(eventDataSchema).optional()
}).strict();
function subagentCatalogEntries(state) {
  const entries = [];
  for (const data of iterateChunkedList(state.head)) {
    const { version: _version, childId, childCreatedAt, ...descriptor } = data;
    entries.push({ id: childId, createdAt: childCreatedAt, ...descriptor });
  }
  return entries;
}
var subagentCatalogProjectionDefinition = {
  key: "subagentCatalog",
  stateSchema,
  init: (_header, inheritedEventCount) => ({ inheritedEventCount }),
  apply: (state, event) => {
    if (event.type !== "subagent/catalog" || event.seq < state.inheritedEventCount)
      return state;
    return { ...state, head: appendChunkedList(state.head, eventDataSchema.parse(event.data)) };
  },
  stateVersion: 6,
  wire: { viewSchema, view: subagentCatalogEntries }
};
function establishCatalogChild(parent, child, descriptor) {
  parent.append("subagent/catalog", {
    version: SUBAGENT_CATALOG_VERSION,
    childId: child.id,
    childCreatedAt: child.createdAt,
    mode: descriptor.mode,
    label: descriptor.label
  });
}
var EXTERNAL_SUBAGENT_CATALOG_VERSION = 2;
function establishExternalCatalogChild(parent, childId, label) {
  parent.append("subagent/catalog", {
    version: EXTERNAL_SUBAGENT_CATALOG_VERSION,
    childId,
    childCreatedAt: Date.now(),
    mode: "external",
    label
  });
}

// packages/team/modules/compat-subagent/lib/types/internal.js
var adjacentAgentSendMessageTool = Symbol.for("dsh.subagent.adjacentAgentSendMessageTool");
function isAdjacentAgentSendMessageTool(definition) {
  return definition !== void 0 && definition[adjacentAgentSendMessageTool] === true;
}
var deliverSubagentPrompt = Symbol.for("dsh.subagent.deliverPrompt");
var withSubagentAncestors = Symbol.for("dsh.subagent.withAncestors");

// packages/team/modules/compat-subagent/lib/types/structured.js
import { ToolArgsError, validateJsonSchemaValue } from "@deepseek-ai/dsh-tools";
var STRUCTURED_OUTPUT_TOOL = "structured_output";
var STRUCTURED_OUTPUT_INSTRUCTION = `When you have your final answer, you MUST report it by calling the \`${STRUCTURED_OUTPUT_TOOL}\` tool with arguments matching its parameter schema exactly. Do not finish with a plain text answer: only the tool call counts as your result.`;
function attachStructuredRuntime(childCtx, schema, canComplete) {
  const staged = /* @__PURE__ */ new Map();
  let pending;
  let captured;
  const schemaEntry = {
    name: STRUCTURED_OUTPUT_TOOL,
    description: "Report your final structured result. Call this exactly once, when your answer is complete; the arguments must match this tool's parameter schema exactly.",
    parameters: { ...schema }
  };
  childCtx.tools.register({
    ...schemaEntry,
    output: {
      schema: {
        type: "object",
        properties: { recorded: { type: "boolean", const: true } },
        required: ["recorded"],
        additionalProperties: false
      },
      render: () => [{ type: "text", text: "Structured output recorded." }]
    },
    execute(args, exec) {
      const violations = validateJsonSchemaValue(schema, args);
      if (violations.length > 0)
        throw new ToolArgsError(violations);
      if (!canComplete())
        throw new Error("Wait for all delegated child tasks to finish and process pending messages before submitting structured output.");
      staged.set(exec, { value: args });
      exec.concludeTurn();
      return Promise.resolve({ recorded: true });
    }
  });
  childCtx.systemPrompt.section({
    name: `tool:${STRUCTURED_OUTPUT_TOOL}`,
    order: childCtx.systemPrompt.getSectionOrder("STRUCTURED_OUTPUT"),
    text: STRUCTURED_OUTPUT_INSTRUCTION
  });
  childCtx.tools.guard((exec) => captured === void 0 && pending === void 0 ? void 0 : `structured output already recorded: the run is complete, so \`${exec.name}\` is not executed`);
  childCtx.on("tools/result", function(exec, result) {
    if (exec.name === STRUCTURED_OUTPUT_TOOL) {
      const entry2 = staged.get(exec);
      if (entry2 === void 0)
        return;
      staged.delete(exec);
      if (result.isError)
        return;
      if (exec.parent === void 0) {
        if (captured === void 0)
          captured = { value: entry2.value };
      } else {
        if (captured === void 0 && pending === void 0) {
          pending = { parent: exec.parent, value: entry2.value };
        }
      }
      return;
    }
    if (pending?.parent !== exec.token)
      return;
    const entry = pending;
    pending = void 0;
    if (result.isError)
      return;
    if (captured === void 0)
      captured = { value: entry.value };
  });
  return {
    captured: () => captured,
    acceptsInput: () => staged.size === 0 && pending === void 0 && captured === void 0
  };
}

// packages/team/modules/compat-subagent/lib/types/activation.js
import { assertNever } from "@deepseek-ai/dsh-util-values";

// packages/team/modules/compat-subagent/lib/types/assistant-output.js
import { joinAssistantStreamText } from "@deepseek-ai/dsh-llm";
var AssistantOutputFold = class {
  message;
  partial = [];
  /**
   * Fold one session event: a non-empty assistant message becomes the
   * candidate final answer, while its embedded stream and any log-only attempt
   * extend the streamed fallback; every other event contributes nothing.
   * @param event - the next observed session event.
   */
  push(event) {
    if (event.type === "assistant/message") {
      const content = event.data.message.content;
      if (content.length > 0)
        this.message = content;
    }
    if (event.type === "assistant/message" || event.type === "assistant/attempt") {
      this.pushText(joinAssistantStreamText(event.data.stream));
    }
  }
  /**
   * Extend the streamed fallback with text observed outside session events.
   * @param text - the next streamed text piece (an empty piece is a no-op).
   */
  pushText(text) {
    if (text.length > 0)
      this.partial.push(text);
  }
  /**
   * Select the final output folded so far.
   * @returns the last non-empty assistant message, else the accumulated
   *   streamed text, or `undefined` when the child produced neither.
   */
  collect() {
    if (this.message !== void 0)
      return this.message;
    const text = this.partial.join("");
    return text.length > 0 ? [{ type: "text", text }] : void 0;
  }
};
function finalAssistantOutput(events) {
  const fold = new AssistantOutputFold();
  for (const event of events)
    fold.push(event);
  return fold.collect();
}

// packages/team/modules/compat-subagent/lib/types/activation.js
var ActivationPool = class {
  slots = /* @__PURE__ */ new Set();
  /**
   * Reserve before reconstruction; release also tolerates unpublished rollback.
   * @param capacity - the maximum simultaneous activations in this pool.
   * @returns an idempotent slot release.
   */
  reserve(capacity) {
    if (this.slots.size >= capacity) {
      throw new SubagentError(`subagent limit reached (active child limit: ${capacity}); wait for an existing child to finish or complete this work with the current agents`, "ACTIVATION_LIMIT_REACHED");
    }
    const slot = Symbol();
    this.slots.add(slot);
    return () => {
      this.slots.delete(slot);
    };
  }
};
function activationAgent(activation) {
  return activation.kind === "local" ? activation.handle.agent : void 0;
}
function requireLocalActivation(activation) {
  switch (activation.kind) {
    case "local":
      return activation;
    case "external":
      throw new SubagentError(`subagent "${activation.childId}" does not accept follow-up input`, "NOT_CONTINUABLE");
    /* v8 ignore next 2 -- Both execution kinds are handled above. */
    default:
      return assertNever(activation);
  }
}
function observeLocalFailure(activation, wake) {
  const child = activation.handle.agent;
  child.ctx.on("agent/error", ({ agent }) => {
    if (agent !== child)
      return;
    activation.failureAt = child.session.seq;
    wake();
  });
  child.ctx.on("session/event", (session, event) => {
    if (session === child.session && event.type === "turn/end" && activation.failureAt !== void 0 && event.seq >= activation.failureAt) {
      activation.failureAt = void 0;
    }
  });
}
function captureLocalResult(activation) {
  const events = activation.handle.agent.session.snapshotEvents(activation.outputStart);
  const output = finalAssistantOutput(events) ?? [];
  const stopReason = activation.failureAt === void 0 ? epochStopReason(events) : "error";
  const structured = activation.structured;
  if (structured !== void 0) {
    const captured = structured.captured();
    if (captured !== void 0)
      return { output, stopReason, structured: captured.value };
    if (stopReason === "completed")
      return { output, stopReason: "error" };
  }
  return { output, stopReason };
}
var ChildLock = class {
  tails = /* @__PURE__ */ new Map();
  /**
   * Run `operation` after every previously queued operation for `childId`.
   * @param childId - the durable child whose operations are linearized.
   * @param operation - the critical section to run in order.
   * @returns the operation's own settlement.
   */
  run(childId, operation) {
    const previous = this.tails.get(childId) ?? Promise.resolve();
    const result = previous.then(operation, operation);
    const tail = result.then(() => void 0, () => void 0);
    this.tails.set(childId, tail);
    void tail.then(() => {
      if (this.tails.get(childId) === tail)
        this.tails.delete(childId);
    });
    return result;
  }
};

// packages/team/modules/compat-subagent/lib/types/manager.js
var __addDisposableResource = function(env, value, async) {
  if (value !== null && value !== void 0) {
    if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
    var dispose, inner;
    if (async) {
      if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
      dispose = value[Symbol.asyncDispose];
    }
    if (dispose === void 0) {
      if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
      dispose = value[Symbol.dispose];
      if (async) inner = dispose;
    }
    if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
    if (inner) dispose = function() {
      try {
        inner.call(this);
      } catch (e) {
        return Promise.reject(e);
      }
    };
    env.stack.push({ value, dispose, async });
  } else if (async) {
    env.stack.push({ async: true });
  }
  return value;
};
var __disposeResources = /* @__PURE__ */ (function(SuppressedError2) {
  return function(env) {
    function fail(e) {
      env.error = env.hasError ? new SuppressedError2(e, env.error, "An error was suppressed during disposal.") : e;
      env.hasError = true;
    }
    var r, s = 0;
    function next() {
      while (r = env.stack.pop()) {
        try {
          if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
          if (r.dispose) {
            var result = r.dispose.call(r.value);
            if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
              fail(e);
              return next();
            });
          } else s |= 1;
        } catch (e) {
          fail(e);
        }
      }
      if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
      if (env.hasError) throw env.error;
    }
    return next();
  };
})(typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
function failureMessage(error) {
  return error instanceof Error ? error.message : "unknown teardown failure";
}
var SubagentManager = class {
  ctx;
  host;
  maxActiveSubagents;
  /** Child session id → its live Activation. Process-local, never durable. */
  resident = /* @__PURE__ */ new Map();
  /** Root identities retain their pool across child settlement without retaining dead roots. */
  rootPools = /* @__PURE__ */ new WeakMap();
  /** Materializations admitted before drain, tracked through publication or rollback. */
  materializations = /* @__PURE__ */ new Set();
  /** Per-child serializer shared by delivery, release, and disposal. */
  locks = new ChildLock();
  /** Structural Cordis owner of every Activation handle. */
  ownerCtx;
  /**
   * Exact roots whose host teardown has begun, with the live lineage members
   * observed under each root. Entries remain until that exact root leaves the
   * Agent registry, closing admission throughout its host's teardown without
   * poisoning a later same-id replacement.
   */
  closingScopes = /* @__PURE__ */ new Map();
  draining = false;
  /**
   * Build one manager inside the service's Agent-injected context.
   * @param ctx - context providing Agents, Sessions, and teardown ownership.
   * @param host - provider dispatch and lifecycle observation owned by the service.
   * @param maxActiveSubagents - the current configured child capacity.
   */
  constructor(ctx, host, maxActiveSubagents) {
    this.ctx = ctx;
    this.host = host;
    this.maxActiveSubagents = maxActiveSubagents;
    const scope = ctx.plugin(function activationOwner() {
    });
    this.ownerCtx = scope.ctx;
    ctx.on("agent/disposed", ({ agent }) => {
      this.closingScopes.delete(agent);
    });
    ctx.effect(function* () {
      yield scope.dispose;
      yield () => this.drain();
    }.bind(this), "subagents.manager()");
  }
  /**
   * Interrupt one live continuable child's current turn under the supplied authority.
   * @param targetSessionId - the durable child session id to interrupt.
   * @param authority - the human parent address or exact live ancestor Agent.
   */
  interrupt(targetSessionId, authority) {
    if (authority.kind === "ancestor") {
      const caller = authority.agent;
      if (this.ctx.agents.get(caller.id) !== caller) {
        throw new SubagentError(`interrupting "${targetSessionId}" requires the exact live ancestor agent`, "UNAUTHORIZED");
      }
      if (caller.id === targetSessionId) {
        throw new SubagentError(`agent "${caller.id}" cannot interrupt itself`, "UNAUTHORIZED");
      }
    }
    const activation = this.resident.get(targetSessionId);
    if (activation === void 0)
      return;
    if (authority.kind === "user") {
      if (activation.parent.id !== authority.parentSessionId) {
        throw new SubagentError(`subagent "${targetSessionId}" belongs to another parent session`, "UNAUTHORIZED");
      }
    } else if (!activation.ancestry.has(authority.agent)) {
      throw new SubagentError(`subagent "${targetSessionId}" is not a live descendant of agent "${authority.agent.id}"`, "UNAUTHORIZED");
    }
    if (activation.closing !== void 0)
      return;
    const kind = authority.kind === "user" ? "user" : "parent";
    if (activation.kind === "local") {
      activation.handle.agent.cancel({ kind }, { keepInbox: true });
    } else {
      activation.controller.abort({ kind });
      void this.dispose(activation).catch(() => void 0);
    }
  }
  /**
   * Close admission, await every already-admitted materialization through
   * publication or rollback, then dispose the stable live Activation graph
   * child-first.
   */
  async drain() {
    this.draining = true;
    for (const pending of this.materializations)
      pending.controller.abort();
    await Promise.all([...this.materializations].map((materialization) => materialization.settled));
    const owned = /* @__PURE__ */ new Set();
    for (const activation of this.resident.values()) {
      for (const child of activation.ownedChildren)
        owned.add(child);
    }
    const roots = [...this.resident.values()].filter((activation) => !owned.has(activation.childId));
    await this.disposeRoots(roots, "activation(s)");
  }
  /**
   * Join progressing child work, leaving idle parked inboxes resident.
   * @param parent - exact live parent whose descendants are observed.
   * @returns whether work was joined and the host must recheck parent completion.
   */
  async waitForChildren(parent) {
    let observed = false;
    while (true) {
      const pending = [...this.materializations].filter((item) => item.lineage.includes(parent));
      const children = [...this.resident.values()].filter((item) => activationAgent(item) !== parent && item.ancestry.has(parent));
      observed ||= children.some((item) => item.kind === "local" && item.handle.agent.status !== "idle");
      await Promise.all(children.flatMap((item) => item.kind === "local" ? [item.handle.agent.whenIdle()] : []));
      const waits = pending.map((item) => item.settled);
      for (const item of children) {
        if (item.kind === "external" || item.closing !== void 0) {
          waits.push(item.result.promise.catch(() => void 0));
          continue;
        }
        if (item.handle.agent.status !== "idle") {
          waits.push(item.handle.agent.whenIdle());
          continue;
        }
        if (item.ownedChildren.size > 0) {
          if ([...item.ownedChildren].some((id) => !this.resident.has(id)))
            waits.push(item.poke.promise);
          continue;
        }
        const inbox = item.handle.agent.inbox;
        if (item.failureAt === void 0 && (inbox.nextTurn.length > 0 || inbox.nextStep.length > 0))
          continue;
        waits.push(Promise.race([item.result.promise.catch(() => void 0), item.poke.promise]));
      }
      if (waits.length > 0) {
        observed = true;
        await Promise.all(waits);
        continue;
      }
      if ([...this.materializations].some((item) => item.lineage.includes(parent) && !pending.includes(item)) || [...this.resident.values()].some((item) => activationAgent(item) !== parent && item.ancestry.has(parent) && !children.includes(item)))
        continue;
      return observed;
    }
  }
  /**
   * Stop the managed descendants of exact live host-owned parents.
   * @param parents - exact live roots whose managed descendants must stop.
   */
  async drainDescendants(parents) {
    const roots = new Set(parents.filter((parent) => this.ctx.agents.get(parent.id) === parent));
    if (roots.size === 0)
      return;
    for (const root of roots) {
      this.closingMembers(root).add(root);
    }
    const targets = [];
    for (const activation of this.resident.values()) {
      const child = activationAgent(activation);
      const lineage = this.liveLineage(child ?? activation.parent);
      const owners = [...roots].filter((root) => child !== root && activation.ancestry.has(root));
      if (owners.length === 0)
        continue;
      targets.push(activation);
      for (const owner of owners) {
        const members = this.closingMembers(owner);
        if (child !== void 0)
          members.add(child);
        for (const agent of lineage)
          members.add(agent);
      }
    }
    const materializations = [...this.materializations].filter((materialization) => {
      const owners = [...roots].filter((root) => materialization.lineage.includes(root));
      for (const owner of owners) {
        const members = this.closingMembers(owner);
        for (const agent of materialization.lineage)
          members.add(agent);
      }
      if (owners.length > 0)
        materialization.controller.abort();
      return owners.length > 0;
    });
    const ownedTargets = /* @__PURE__ */ new Set();
    for (const activation of targets) {
      for (const child of activation.ownedChildren)
        ownedTargets.add(child);
    }
    const targetRoots = targets.filter((activation) => !ownedTargets.has(activation.childId));
    for (const activation of targets) {
      const disposal = this.dispose(activation);
      void disposal.catch(() => void 0);
    }
    await Promise.all(materializations.map((materialization) => materialization.settled));
    await this.disposeRoots(targetRoots, "scoped activation(s)");
  }
  /**
   * Release selected resident direct children of one exact live parent.
   * @param parent - exact live direct parent authorizing the selected release.
   * @param childIds - durable direct-child ids to release when resident.
   */
  async drainChildren(parent, childIds) {
    if (this.ctx.agents.get(parent.id) !== parent) {
      throw new SubagentError("selected child teardown requires the exact live parent agent", "UNAUTHORIZED");
    }
    const targets = [];
    for (const childId of new Set(childIds)) {
      const activation = this.resident.get(childId);
      if (activation === void 0)
        continue;
      if (activation.parent.id !== parent.id || !activation.ancestry.has(parent)) {
        throw new SubagentError(`subagent "${childId}" is not a direct child of agent "${parent.id}"`, "UNAUTHORIZED");
      }
      targets.push(activation);
    }
    for (const activation of targets) {
      const disposal = this.dispose(activation);
      void disposal.catch(() => void 0);
    }
    await this.disposeRoots(targets, "selected activation(s)");
  }
  /**
   * Start one continuable background child and resolve at initial inbox acceptance.
   * Every earlier failure disposes any created handle and rolls back Activation
   * and parent ownership without returning either id.
   * @param spec - provider, delegation request, and caller cancellation.
   * @returns the durable child id and accepted initial prompt message id.
   */
  async startLocal(spec) {
    const request = spec.request;
    const parent = request.parent;
    this.assertAdmitting(parent);
    const persistence = spec.delivery === "caller" ? this.ctx.get("sessionPersistence") : this.requirePersistence();
    assertSubagentMaxDepth(request.maxDepth);
    const childId = spec.childId ?? brandString(randomUUID2());
    this.assertChildIdAvailable(childId);
    const childDepth = resolveChildDepth(parent, request.maxDepth);
    const agentOptions = resolveChildAgentOptions(parent, request.agentOptions, childDepth);
    const agentProvider = agentOptions.provider;
    const agentModel = agentOptions.model;
    const agentReasoningEffort = agentOptions.reasoningEffort;
    const descriptor = snapshotSubagentDescriptor({
      mode: "continuable",
      provider: spec.provider,
      label: spec.label,
      ...agentProvider !== void 0 ? { agentProvider } : {},
      ...agentModel !== void 0 ? { agentModel } : {},
      ...agentReasoningEffort !== void 0 ? { agentReasoningEffort } : {},
      ...spec.workspaceCwd === void 0 ? {} : { workspaceCwd: spec.workspaceCwd }
    });
    const delegatedPolicies = captureDelegatedPolicyOverrides(parent);
    const releaseHold = this.holdOwnership(parent, childId);
    try {
      const cwd = await this.resolveDirectory(request, spec.signal);
      const prepared = await this.host.prepareContinuable(spec.provider, {
        sessionId: childId,
        cwd,
        parent,
        signal: spec.signal
      });
      spec.signal.throwIfAborted();
      this.assertAdmitting(parent);
      const inheritedEventCount = SessionLogOffset(prepared.seed?.length ?? 0);
      const seed = prepared.seed;
      let established;
      const messageId = await this.locks.run(childId, async () => {
        spec.signal.throwIfAborted();
        this.assertAdmitting(parent);
        this.assertChildIdAvailable(childId);
        if (spec.childId !== void 0) {
          const persisted = await persistence?.stat(childId, { signal: spec.signal });
          spec.signal.throwIfAborted();
          this.assertAdmitting(parent);
          this.assertChildIdAvailable(childId);
          if (persisted !== void 0) {
            throw new SubagentError(`subagent "${childId}" already exists`, "DUPLICATE_CHILD");
          }
        }
        const activation = await this.materialize({
          kind: "local",
          childId,
          provider: spec.provider,
          parent,
          create: {
            cwd,
            seed,
            meta: {
              ...childSessionMeta(parent, childDepth, prepared.seed !== void 0, request.agentPreset),
              ...spec.workspaceCwd === void 0 ? {} : { cwd: spec.workspaceCwd }
            },
            inheritedEventCount,
            delegatedPolicies,
            descriptor
          },
          agentOptions,
          composition: { agentPreset: request.agentPreset },
          signal: spec.signal,
          delivery: spec.delivery,
          outputSchema: spec.request.outputSchema
        });
        established = activation;
        const child = requireLocalActivation(activation).handle.agent;
        const childHeader = child.session.header;
        return await this.submitMaterialized(activation, spec.delivery !== "caller" && isAdjacentAgentSendMessageTool(this.ctx.get("tools")?.get("send_message", child)) ? withContinuableReturnGuidance(parent.id, request.prompt) : request.prompt, { source: { kind: "user" }, signal: spec.signal, delivery: "queue" }, parent, () => {
          establishCatalogChild(parent.session, childHeader, descriptor);
        });
      });
      return { ...this.receipt(established), childId, messageId };
    } catch (error) {
      releaseHold();
      throw error;
    }
  }
  /**
   * Start an external backend under activation ownership.
   * @param spec - task, provider, cancellation, and delivery policy.
   * @returns the accepted activation and its result/disposal capabilities.
   */
  async startExternal(spec) {
    const parent = spec.request.parent;
    this.assertAdmitting(parent);
    const pendingId = brandString(randomUUID2());
    const releaseHold = this.holdOwnership(parent, pendingId);
    let activation;
    try {
      const cwd = await this.resolveDirectory(spec.request, spec.signal);
      activation = await this.materialize({
        kind: "external",
        childId: pendingId,
        provider: spec.provider,
        parent,
        signal: spec.signal,
        delivery: spec.delivery,
        start: (signal) => this.host.startExternal(spec.provider, {
          ...spec.request,
          cwd,
          label: spec.label,
          signal
        })
      });
      this.assertAdmitting(parent);
      this.assertLiveParent(parent, activation.childId);
      spec.signal.throwIfAborted();
      if (spec.delivery === "parent") {
        establishExternalCatalogChild(parent.session, activation.childId, spec.label);
      }
      this.announce(activation);
      return this.receipt(activation);
    } catch (error) {
      if (activation !== void 0) {
        try {
          await this.dispose(activation);
        } catch (cleanupError) {
          this.ctx.logger.warn(`subagent "${activation.childId}" admission rollback failed: ${failureMessage(cleanupError)}`);
        }
      }
      throw error;
    } finally {
      releaseHold();
    }
  }
  /** Capture the explicit or inherited directory while the parent still owns startup. */
  async resolveDirectory(request, signal) {
    const cwd = request.cwd !== void 0 && isAbsolute(request.cwd) ? request.cwd : resolve(await this.ctx.workingDirectory.ensure(request.parent, signal), request.cwd ?? ".");
    signal.throwIfAborted();
    return cwd;
  }
  /**
   * Deliver one model-authored message to a direct continuable child or to the
   * sender's direct parent. A missing direct child cold-resumes through the
   * ordinary continuation lifecycle.
   * @param sender - exact live Agent authorizing and originating the message.
   * @param targetId - durable direct-parent or direct-child session id.
   * @param content - model-authored content to deliver.
   * @param options - caller cancellation before acceptance.
   * @returns the accepted message's inbox id.
   */
  async sendMessage(sender, targetId, content, options) {
    if (this.ctx.agents.get(sender.id) !== sender) {
      throw new SubagentError("message delivery requires the exact live sender agent", "UNAUTHORIZED");
    }
    this.assertAdmitting(sender);
    const senderActivation = this.resident.get(sender.id);
    if (senderActivation !== void 0 && senderActivation.kind === "local" && senderActivation.handle.agent === sender && senderActivation.parent.id === targetId) {
      options.signal.throwIfAborted();
      return this.sendToParent(senderActivation, sender, content);
    }
    if (sender.session.header.parentSession === targetId) {
      throw new SubagentError(`agent "${sender.id}" is not a resident continuable child and cannot send to parent "${targetId}"`, "UNAUTHORIZED");
    }
    return this.deliverToChild(sender, targetId, content, {
      signal: options.signal,
      delivery: "steer"
    });
  }
  /**
   * Queue one human-authored prompt as a distinct direct-child turn.
   * @param parent - exact live direct parent authorizing delivery.
   * @param childId - durable direct-child session id.
   * @param content - model-visible prompt blocks.
   * @param source - durable attribution for the human prompt.
   * @param signal - caller cancellation before inbox acceptance.
   * @returns the accepted durable message id.
   */
  async queuePrompt(parent, childId, content, source, signal) {
    return this.deliverToChild(parent, childId, content, { source, signal, delivery: "queue" });
  }
  /**
   * Steer one host-authored prompt to a direct continuable child.
   * @param parent - exact live direct parent authorizing delivery.
   * @param childId - durable direct-child session id.
   * @param content - model-visible prompt blocks.
   * @param source - durable attribution for the host prompt.
   * @param signal - caller cancellation before inbox acceptance.
   * @param resultDelivery - Owner of the activation result; parent delivery preserves ordinary subagent notifications.
   * @returns the accepted durable message id.
   */
  async steerPrompt(parent, childId, content, source, signal, resultDelivery = "parent") {
    return this.deliverToChild(parent, childId, content, { source, signal, delivery: "steer", resultDelivery });
  }
  /** Admit local input synchronously before any teardown can begin. */
  deliver(activation, message, delivery) {
    if (activation.closing !== void 0) {
      throw new SubagentError("subagent activation is being disposed; the message was not accepted", "ACTIVATION_CLOSING");
    }
    const local = requireLocalActivation(activation);
    if (local.structured?.acceptsInput() === false) {
      throw new SubagentError("subagent is submitting or has submitted its structured result; the message was not accepted", "INPUT_CLOSED");
    }
    if (delivery === "steer")
      local.handle.agent.steer(message);
    else
      local.handle.agent.followup(message);
  }
  /**
   * Reject one child identity already owned by a live Agent or Session.
   * @param childId - proposed durable child session id.
   */
  assertChildIdAvailable(childId) {
    if (this.resident.has(childId) || this.ctx.agents.get(childId) !== void 0 || this.ctx.get("sessions")?.get(childId) !== void 0) {
      throw new SubagentError(`subagent "${childId}" already exists`, "DUPLICATE_CHILD");
    }
  }
  /**
   * Pre-register `childId` in a continuation-managed parent's owned set so the
   * parent cannot settle while a caller is still establishing or resuming that
   * child. Returns a releaser for the failure path; it removes only a hold
   * this call added, and leaves ownership in place once a live Activation for
   * the child exists.
   * @param parent - the live direct parent the operation is admitted under.
   * @param childId - the durable child the operation addresses.
   * @returns the failure-path releaser; a no-op when nothing was added.
   */
  holdOwnership(parent, childId) {
    const parentActivation = this.resident.get(parent.id);
    if (parentActivation === void 0 || activationAgent(parentActivation) !== parent)
      return () => {
      };
    if (parentActivation.closing !== void 0) {
      throw new SubagentError(`subagent parent "${parent.id}" is being disposed; the child was not established`, "ACTIVATION_CLOSING");
    }
    if (parentActivation.ownedChildren.has(childId))
      return () => {
      };
    parentActivation.ownedChildren.add(childId);
    return () => {
      const live = this.resident.get(childId);
      if (live !== void 0 && live.closing === void 0)
        return;
      if (parentActivation.ownedChildren.delete(childId))
        this.wake(parentActivation);
    };
  }
  /**
   * Apply activation admission to a resident parent before delivering input.
   * @param parent - exact live Agent receiving the message.
   * @param message - durable user message to deliver.
   * @param delivery - receiving inbox destination.
   */
  sendWaking(parent, message, delivery) {
    const parentActivation = this.resident.get(parent.id);
    if (parentActivation !== void 0 && activationAgent(parentActivation) === parent) {
      try {
        this.deliver(parentActivation, message, delivery);
      } finally {
        this.wake(parentActivation);
      }
      return;
    }
    if (delivery === "steer")
      parent.steer(message);
    else
      parent.followup(message);
  }
  /**
   * Reject new admission once the manager or this exact parent tree began draining.
   * @param agent - exact live Agent whose lineage determines admission.
   */
  assertAdmitting(agent) {
    const closing = this.closingTeardownFor(agent);
    if (closing === void 0)
      return;
    throw new SubagentError(closing === "manager" ? "subagents are draining; the operation was not admitted" : `subagents below parent "${closing.id}" are draining; the operation was not admitted`, "DRAINING");
  }
  /**
   * Authorize one operation against the durable direct-parent lineage.
   * @param parent - exact live Agent claiming direct-parent authority.
   * @param childId - durable child session id addressed by the operation.
   * @param parentSession - durable direct-parent id recorded by the child.
   */
  authorizeLineage(parent, childId, parentSession) {
    this.assertLiveParent(parent, childId);
    if (parentSession !== parent.id) {
      throw new SubagentError(`subagent "${childId}" belongs to another parent session`, "UNAUTHORIZED");
    }
  }
  /** Reject parent authority after the live registry entry changes. */
  assertLiveParent(parent, childId) {
    if (this.ctx.agents.get(parent.id) !== parent) {
      throw new SubagentError(`subagent "${childId}" delivery requires the exact live parent agent`, "UNAUTHORIZED");
    }
  }
  /**
   * Create or resume one child Agent and publish its Activation.
   * @param inputs - reconstruction and admission inputs for the residency epoch.
   * @returns the published process-local Activation.
   */
  materialize(inputs) {
    this.assertAdmitting(inputs.parent);
    inputs.signal.throwIfAborted();
    const lineage = this.liveLineage(inputs.parent);
    const pool = this.resident.get(inputs.parent.id)?.pool ?? this.rootPool(inputs.parent);
    const release = pool.reserve(this.maxActiveSubagents(inputs.parent, inputs.childId));
    let released = false;
    const releaseSlot = () => {
      if (released)
        return;
      released = true;
      release();
      this.host.releaseActivation?.(inputs.parent, inputs.childId);
    };
    const settled = Promise.withResolvers();
    const controller = new AbortController();
    const materialization = {
      lineage,
      settled: settled.promise,
      controller
    };
    this.materializations.add(materialization);
    return this.materializeTracked({ ...inputs, signal: AbortSignal.any([inputs.signal, controller.signal]) }, lineage, pool, releaseSlot).catch((error) => {
      releaseSlot();
      if (error instanceof Error && error.name === "AbortError")
        this.assertAdmitting(inputs.parent);
      throw error;
    }).finally(() => {
      this.materializations.delete(materialization);
      settled.resolve();
    });
  }
  /**
   * Stop and release one Activation through its memoized close transaction.
   * @param activation - exact residency epoch to close.
   * @returns the shared close transaction.
   */
  dispose(activation) {
    return this.close(activation, () => this.finishDisposal(activation, true));
  }
  /** Close admission synchronously and share one release, including startup rollback. */
  close(activation, release) {
    if (activation.closing !== void 0)
      return activation.closing;
    const completion = Promise.withResolvers();
    activation.closing = completion.promise;
    void release().then(completion.resolve, completion.reject);
    return completion.promise;
  }
  /** Dispose independent roots and report every branch failure after all settle. */
  async disposeRoots(roots, failureSubject) {
    const failures = await Promise.all(roots.map(async (activation) => {
      try {
        await this.dispose(activation);
        return void 0;
      } catch (error) {
        return error;
      }
    }));
    const reasons = failures.filter((failure) => failure !== void 0);
    if (reasons.length > 0) {
      throw new SubagentError(`subagent teardown failed for ${reasons.length} ${failureSubject}: ` + reasons.map((reason) => failureMessage(reason)).join("; "), "ACTIVATION_TEARDOWN_FAILED");
    }
  }
  /** Return the retained member set for one exact scoped-teardown root. */
  closingMembers(root) {
    const existing = this.closingScopes.get(root);
    if (existing !== void 0)
      return existing;
    const members = /* @__PURE__ */ new Set();
    this.closingScopes.set(root, members);
    return members;
  }
  /** Return the exact currently resolvable ancestry from `agent` upward. */
  liveLineage(agent) {
    const lineage = [agent];
    const seen = /* @__PURE__ */ new Set([agent.id]);
    let parentSession = agent.session.header.parentSession;
    while (parentSession !== void 0) {
      const parent = this.ctx.agents.get(parentSession);
      if (parent === void 0 || seen.has(parent.id))
        break;
      lineage.push(parent);
      seen.add(parent.id);
      parentSession = parent.session.header.parentSession;
    }
    return lineage;
  }
  /** Return the teardown that closed continuable admission for this agent's lineage. */
  closingTeardownFor(agent) {
    if (this.draining)
      return "manager";
    const lineage = this.liveLineage(agent);
    for (const [root, members] of this.closingScopes) {
      if (members.has(agent) || lineage.includes(root))
        return root;
    }
    return void 0;
  }
  /** Resolve a root's pool once; descendants inherit their resident parent's pool directly. */
  rootPool(parent) {
    let pool = this.rootPools.get(parent);
    if (pool === void 0) {
      pool = new ActivationPool();
      this.rootPools.set(parent, pool);
    }
    return pool;
  }
  /** Perform one tracked materialization through publication or rollback. */
  async materializeTracked(inputs, parentLineage, pool, releaseSlot) {
    const { provider, parent } = inputs;
    let childId = inputs.childId;
    inputs.signal.throwIfAborted();
    let resource;
    if (inputs.kind === "external") {
      const controller = new AbortController();
      const cancelStartup = () => {
        controller.abort(inputs.signal.reason);
      };
      inputs.signal.addEventListener("abort", cancelStartup, { once: true });
      try {
        const run = await inputs.start(controller.signal);
        resource = { kind: "external", run, controller };
        void run.result.catch(() => void 0);
        childId = run.id;
        try {
          this.assertChildIdAvailable(childId);
        } catch (error) {
          await run.dispose();
          throw error;
        }
      } finally {
        inputs.signal.removeEventListener("abort", cancelStartup);
      }
    } else {
      const { create } = inputs;
      let structured;
      const setup = async (childCtx, child) => {
        if (inputs.composition.agentPreset !== void 0) {
          await applyChildComposition(childCtx, parent, inputs.composition);
        }
        if (create !== void 0) {
          if (inputs.composition.agentPreset !== void 0) {
            child.session.append("agent-preset/selected", { agentPreset: inputs.composition.agentPreset });
          }
          child.session.append("subagent/descriptor", create.descriptor);
          appendDelegatedPolicyOverrides(child.session, create.delegatedPolicies);
          const workingDirectory = childCtx.get("workingDirectory");
          if (workingDirectory === void 0)
            throw new Error("local subagents require the working-directory service");
          await workingDirectory.set(child, create.cwd, inputs.signal);
        }
        if (inputs.composition.agentPreset === void 0)
          await applyChildComposition(childCtx, parent, inputs.composition);
        if (inputs.outputSchema !== void 0) {
          structured = attachStructuredRuntime(childCtx, inputs.outputSchema, () => this.resident.get(childId)?.ownedChildren.size === 0 && child.inbox.nextStep.length === 0 && child.inbox.nextTurn.length === 0);
        }
      };
      const handle = create === void 0 ? await this.ownerCtx.agents.resume({
        resumeSessionId: childId,
        parentAgent: parent,
        agentOptions: inputs.agentOptions,
        signal: inputs.signal,
        setup
      }) : await this.ownerCtx.agents.create({
        sessionId: childId,
        parentAgent: parent,
        meta: create.meta,
        ...create.seed === void 0 ? {} : { seed: create.seed },
        inheritedEventCount: create.inheritedEventCount,
        agentOptions: inputs.agentOptions,
        signal: inputs.signal,
        setup
      });
      resource = { kind: "local", handle, outputStart: handle.agent.session.seq, structured, failureAt: void 0, poke: Promise.withResolvers() };
    }
    const observer = this.host.observeActivation(provider, childId, parent);
    const activation = {
      pool,
      releaseSlot,
      childId,
      ...resource,
      parent,
      delivery: inputs.delivery ?? "parent",
      result: Promise.withResolvers(),
      closing: void 0,
      ancestry: new WeakSet(resource.kind === "external" ? parentLineage : [resource.handle.agent, ...parentLineage]),
      ownedChildren: /* @__PURE__ */ new Set(),
      observer,
      announced: false
    };
    void activation.result.promise.catch(() => void 0);
    this.resident.set(childId, activation);
    try {
      this.assertAdmitting(parent);
      inputs.signal.throwIfAborted();
      if (this.ctx.agents.get(parent.id) !== parent)
        throw new SubagentError("subagent parent is no longer live", "UNAUTHORIZED");
      this.acquireOwnership(parent, childId);
      const wakeSettlement = () => {
        this.wake(activation);
      };
      if (activation.kind === "local") {
        observeLocalFailure(activation, wakeSettlement);
        activation.handle.agent.ctx.on("agent/inbox/inserted", wakeSettlement);
        activation.handle.agent.ctx.on("agent/inbox/claimed", wakeSettlement);
        activation.handle.agent.ctx.on("agent/inbox/discarded", wakeSettlement);
      }
      observer.start(activationAgent(activation));
    } catch (error) {
      await this.rollbackUnpublished(activation, error).catch(() => void 0);
      throw error;
    }
    return activation;
  }
  /**
   * Begin settlement observation after initial acceptance is recorded.
   * @param activation - accepted activation to observe.
   */
  announce(activation) {
    if (activation.announced)
      return;
    activation.announced = true;
    if (activation.kind === "local") {
      this.watchLocalSettlement(activation);
    } else {
      const finish = () => this.close(activation, () => this.finishDisposal(activation, false));
      void activation.run.result.then(finish, finish).catch((error) => {
        this.reportTeardownFailure(activation, error);
      });
    }
  }
  /** Release an Activation whose start edge was not published. */
  rollbackUnpublished(activation, error) {
    return this.close(activation, async () => {
      try {
        await (activation.kind === "local" ? activation.handle.dispose() : activation.run.dispose());
      } finally {
        this.resident.delete(activation.childId);
        activation.releaseSlot();
        this.releaseOwnership(activation.childId);
        activation.result.reject(error);
      }
    });
  }
  /** Register the child in a continuation-managed parent's owned set. */
  acquireOwnership(parent, childId) {
    const parentActivation = this.resident.get(parent.id);
    if (parentActivation === void 0)
      return;
    if (parentActivation.closing !== void 0) {
      throw new SubagentError(`subagent parent "${parent.id}" is being disposed; the child was not established`, "ACTIVATION_CLOSING");
    }
    parentActivation.ownedChildren.add(childId);
    this.wake(parentActivation);
  }
  /** Remove one child from its live owner's set and let that owner re-check settlement. */
  releaseOwnership(childId) {
    for (const candidate of this.resident.values()) {
      if (candidate.ownedChildren.delete(childId))
        this.wake(candidate);
    }
  }
  /** Let a settlement watcher re-check residency after relevant state changes. */
  wake(activation) {
    if (activation.kind === "external")
      return;
    activation.poke.resolve();
    activation.poke = Promise.withResolvers();
  }
  /** Follow one Activation to natural settlement. */
  watchLocalSettlement(activation) {
    void (async () => {
      while (true) {
        const idleObservation = activation.poke;
        await activation.handle.agent.whenIdle();
        if (activation.closing !== void 0)
          return;
        const readiness = await this.locks.run(activation.childId, () => Promise.resolve(this.settlementState(activation, idleObservation)));
        if (readiness === "closed")
          return;
        if (readiness === "retry")
          continue;
        if (readiness === "wait") {
          await idleObservation.promise;
          continue;
        }
        const finalSeq = activation.handle.agent.session.seq;
        await this.flushFinalState(activation);
        const attempt = await this.locks.run(activation.childId, () => {
          const state = this.settlementState(activation, idleObservation);
          if (state !== "ready")
            return Promise.resolve(state);
          if (activation.handle.agent.session.seq !== finalSeq) {
            return Promise.resolve("retry");
          }
          let done;
          try {
            void activation.handle.agent.runMaintenance(() => {
              done = this.close(activation, () => this.finishDisposal(activation, false));
              return Promise.resolve();
            });
          } catch (_error) {
            return Promise.resolve("retry");
          }
          return Promise.resolve({ done });
        });
        if (typeof attempt === "string") {
          if (attempt === "closed")
            return;
          continue;
        }
        try {
          await attempt.done;
        } catch (error) {
          this.reportTeardownFailure(activation, error);
        }
        return;
      }
    })();
  }
  /** Report disposal failure once after the natural settlement observer finishes. */
  reportTeardownFailure(activation, error) {
    this.ctx.logger.warn(`subagent "${activation.childId}" activation teardown failed: ${failureMessage(error)}`);
  }
  /** Check pending input and owned children before closing admission. */
  settlementState(activation, observation) {
    if (activation.closing !== void 0)
      return "closed";
    if (activation.poke !== observation)
      return "retry";
    const inbox = activation.handle.agent.inbox;
    if (activation.ownedChildren.size > 0)
      return "wait";
    if (activation.failureAt === void 0 && (inbox.nextTurn.length > 0 || inbox.nextStep.length > 0))
      return "wait";
    return "ready";
  }
  /** Propagate stop synchronously and await descendant startup rollback before release. */
  async finishDisposal(activation, stop) {
    this.wake(activation);
    const { childId } = activation;
    const failures = [];
    let result = { output: [], stopReason: "error" };
    let resultFailure;
    let externalDisposal;
    const child = activationAgent(activation);
    const detail = (error) => child === void 0 ? failureMessage(error) : errorChain(error);
    try {
      if (activation.kind === "external") {
        if (stop) {
          activation.controller.abort({ kind: "parent" });
          externalDisposal = Promise.resolve().then(() => activation.run.dispose());
          void externalDisposal.catch(() => void 0);
        }
        result = await activation.run.result;
      } else {
        if (stop) {
          activation.handle.agent.cancel({ kind: "parent" });
          const idle = activation.handle.agent.whenIdle();
          const children = [...activation.ownedChildren].map((child2) => this.resident.get(child2)).filter((child2) => child2 !== void 0);
          const pending = [...this.materializations].filter((item) => item.lineage.includes(activation.handle.agent));
          const childDisposals = children.map((child2) => this.dispose(child2));
          for (const item of pending)
            item.controller.abort();
          childDisposals.push(...pending.map((item) => item.settled));
          const childFailures = await Promise.all(childDisposals.map(async (disposal) => {
            try {
              await disposal;
              return void 0;
            } catch (error) {
              return error;
            }
          }));
          const reasons = childFailures.filter((reason) => reason !== void 0);
          if (reasons.length > 0) {
            failures.push(new SubagentError(`subagent "${childId}" child teardown failed: ${reasons.map((reason) => failureMessage(reason)).join("; ")}`, "ACTIVATION_TEARDOWN_FAILED"));
          }
          await idle;
          await this.flushFinalState(activation);
        }
        result = captureLocalResult(activation);
      }
    } catch (error) {
      resultFailure = { error };
      failures.push(new SubagentError(`subagent "${childId}" activation teardown failed: ${detail(error)}`, "ACTIVATION_TEARDOWN_FAILED", { cause: error }));
    }
    try {
      if (activation.kind === "local")
        await activation.handle.dispose();
      else
        await (externalDisposal ?? activation.run.dispose());
    } catch (error) {
      failures.push(new SubagentError(`subagent "${childId}" activation handle disposal failed: ${detail(error)}`, "ACTIVATION_TEARDOWN_FAILED", { cause: error }));
    }
    let failure;
    if (failures.length === 1) {
      failure = failures[0];
    } else if (failures.length > 1) {
      failure = new SubagentError(`subagent "${childId}" activation teardown failed at ${failures.length} boundaries: ` + failures.map((item) => detail(item)).join("; "), "ACTIVATION_TEARDOWN_FAILED", { cause: new AggregateError(failures) });
    }
    this.resident.delete(childId);
    activation.releaseSlot();
    const terminal = failure === void 0 ? result : { output: [], stopReason: "error" };
    this.notifySettlement(activation, result);
    this.releaseOwnership(childId);
    activation.observer.settle(terminal);
    if (resultFailure === void 0)
      activation.result.resolve(result);
    else
      activation.result.reject(resultFailure.error);
    if (failure !== void 0)
      throw failure;
  }
  /** Deliver the captured execution result to the durable direct parent after cleanup. */
  notifySettlement(activation, terminal) {
    if (!activation.announced || activation.delivery === "caller")
      return;
    try {
      const parent = this.ctx.agents.get(activation.parent.id);
      if (parent !== activation.parent)
        return;
      const message = createSettlementMessage(activation.childId, terminal, activationAgent(activation) !== void 0);
      if (this.closingTeardownFor(parent) !== void 0) {
        parent.inject(message);
        return;
      }
      this.sendWaking(parent, message, parent.status === "idle" ? "queue" : "steer");
    } catch (error) {
      this.ctx.logger.warn(`subagent "${activation.childId}" settlement notice was not delivered to its parent: ` + errorChain(error));
    }
  }
  /** Request a best-effort final session flush before closing natural-settlement admission. */
  async flushFinalState(activation) {
    try {
      await activation.handle.agent.ctx.sessions.flush(activation.handle.agent.session);
    } catch (error) {
      this.ctx.logger.warn(`subagent "${activation.childId}" best-effort final session flush failed; the persisted state may be unavailable or stale on resume: ${errorChain(error)}`);
    }
  }
  /** Return capabilities bound to an exact activation instead of a future same-id instance. */
  receipt(activation) {
    return {
      childId: activation.childId,
      result: activation.result.promise,
      dispose: () => this.dispose(activation)
    };
  }
  /**
   * Restore the supplied direct-parent chain and steer only the target child.
   * Ancestor restoration submits no messages and keeps each ancestor resident
   * until its descendant has accepted the delivery.
   * @param root - exact live ancestor authorizing the first edge.
   * @param ancestorIds - ordered child ids between root and the target's direct parent.
   * @param childId - final continuable target.
   * @param content - host-authored target message.
   * @param source - durable attribution for the target message.
   * @param signal - cancellation before target acceptance.
   * @returns the accepted target message id.
   */
  async steerDescendantPrompt(root, ancestorIds, childId, content, source, signal) {
    return this.withAncestors(root, ancestorIds, signal, (parent) => this.steerPrompt(parent, childId, content, source, signal, "caller"));
  }
  /** Restore exact retained ancestors without submitting messages; keep their residency through the callback. */
  async withAncestors(root, ancestorIds, signal, operation) {
    const visit = async (parent, index) => {
      const ancestorId = ancestorIds[index];
      if (ancestorId === void 0) {
        signal.throwIfAborted();
        return operation(parent);
      }
      this.assertAdmitting(parent);
      const releaseHold = this.holdOwnership(parent, ancestorId);
      try {
        while (true) {
          signal.throwIfAborted();
          const result = await this.locks.run(ancestorId, async () => {
            const current = this.resident.get(ancestorId);
            if (current?.closing !== void 0) {
              await current.closing;
              return { kind: "closing" };
            }
            const activation = current ?? await this.materializePersisted(parent, ancestorId, signal, "caller");
            this.authorizeLineage(parent, ancestorId, activation.parent.id);
            const pending = visit(requireLocalActivation(activation).handle.agent, index + 1);
            this.announce(activation);
            return { kind: "ready", value: await pending };
          });
          if (result.kind === "ready")
            return result.value;
          this.assertAdmitting(parent);
        }
      } catch (error) {
        releaseHold();
        throw error;
      }
    };
    return visit(root, 0);
  }
  /** Route one parent-originated delivery through residency and cold resume. */
  async deliverToChild(parent, childId, content, options) {
    this.assertAdmitting(parent);
    const releaseHold = this.holdOwnership(parent, childId);
    try {
      return await this.deliverFollowup(parent, childId, content, options);
    } catch (error) {
      releaseHold();
      throw error;
    }
  }
  /** The delivery loop behind {@link deliverToChild}, run under the parent hold. */
  async deliverFollowup(parent, childId, content, options) {
    while (true) {
      const live = await this.locks.run(childId, async () => {
        const activation = this.resident.get(childId);
        if (activation === void 0)
          return this.coldResume(parent, childId, content, options);
        requireLocalActivation(activation);
        const disposal = activation.closing;
        if (disposal !== void 0) {
          return disposal.then(() => void 0, () => void 0);
        }
        if (contentHasImage(content)) {
          await this.assertImageCapable(requireLocalActivation(activation).handle.agent, options.signal);
          if (activation.closing !== void 0) {
            await Promise.allSettled([activation.closing]);
            return void 0;
          }
        }
        const messageId = this.submitAdmitted(activation, content, options, parent);
        this.announce(activation);
        return messageId;
      });
      if (live !== void 0)
        return live;
      this.assertAdmitting(parent);
      options.signal.throwIfAborted();
    }
  }
  /** Deliver one resident continuable child's message to its live direct parent. */
  sendToParent(activation, sender, content) {
    if (activation.closing !== void 0) {
      throw new SubagentError(`subagent "${sender.id}" activation is being disposed; the message was not delivered`, "ACTIVATION_CLOSING");
    }
    const parent = this.ctx.agents.get(activation.parent.id);
    if (parent !== activation.parent) {
      throw new SubagentError("direct parent is not live; the message was not delivered", "PARENT_UNAVAILABLE");
    }
    const message = createAgentMessage(sender, content);
    this.sendAgentMessage(parent, message);
    return message.id;
  }
  /** Send one Agent message while translating only the target's own rejection. */
  sendAgentMessage(parent, message) {
    try {
      this.sendWaking(parent, message, "steer");
    } catch (error) {
      throw new SubagentError("direct parent is not live; the message was not delivered", "PARENT_UNAVAILABLE", { cause: error });
    }
  }
  /**
   * Cold-resume a persisted child and submit the waiting turn. The descriptor
   * supplies every reconstruction input; no subagent provider is dispatched.
   */
  async coldResume(parent, childId, content, options) {
    const activation = await this.materializePersisted(parent, childId, options.signal, options.resultDelivery ?? "parent");
    return await this.submitMaterialized(activation, content, options, parent);
  }
  /** Restore a direct child without submitting a model message. */
  async materializePersisted(parent, childId, signal, delivery) {
    const env_1 = { stack: [], error: void 0, hasError: false };
    try {
      const query = this.requireSessionQuery();
      let observation;
      try {
        observation = await query.observeSession(childId, {
          signal
        });
      } catch (error) {
        signal.throwIfAborted();
        throw new SubagentError(`subagent "${childId}" is unavailable`, "NOT_RESUMABLE", { cause: error });
      }
      const source = __addDisposableResource(env_1, observation, false);
      this.assertAdmitting(parent);
      this.authorizeLineage(parent, childId, source.header.parentSession);
      const ownEvents = source.events.slice(source.inheritedEventCount);
      const descriptor = foldSubagentDescriptor(ownEvents);
      if (descriptor === void 0 || descriptor.mode !== "continuable") {
        throw new SubagentError(`subagent "${childId}" has no supported continuation state and cannot be resumed; choose a different target`, "NOT_RESUMABLE");
      }
      let activation;
      try {
        const independentlySelected = hasIndependentPresetSelection(ownEvents);
        const agentPreset = independentlySelected ? source.projections?.values.agentPreset : void 0;
        if (independentlySelected && typeof agentPreset !== "string") {
          throw new SubagentError(`subagent "${childId}" has no agent preset projection for restoration`, "NOT_RESUMABLE");
        }
        activation = await this.materialize({
          kind: "local",
          childId,
          provider: descriptor.provider,
          parent,
          delivery,
          agentOptions: {
            ...descriptor.agentProvider !== void 0 ? { provider: descriptor.agentProvider } : {},
            ...descriptor.agentModel !== void 0 ? { model: descriptor.agentModel } : {},
            ...descriptor.agentReasoningEffort !== void 0 ? { reasoningEffort: ReasoningEffortId(descriptor.agentReasoningEffort) } : {}
          },
          composition: { agentPreset: agentPreset ?? void 0, persona: descriptor.persona, toolFilter: descriptor.toolFilter },
          signal
        });
      } catch (error) {
        signal.throwIfAborted();
        if (error instanceof SubagentError)
          throw error;
        throw new SubagentError(`subagent "${childId}" is unavailable`, "NOT_RESUMABLE", { cause: error });
      }
      return requireLocalActivation(activation);
    } catch (e_1) {
      env_1.error = e_1;
      env_1.hasError = true;
    } finally {
      __disposeResources(env_1);
    }
  }
  /** Admit a materialized child, commit its creation fact, and release it on failure. */
  async submitMaterialized(activation, content, options, parent, commit) {
    try {
      if (contentHasImage(content)) {
        await this.assertImageCapable(requireLocalActivation(activation).handle.agent, options.signal);
        if (activation.closing !== void 0) {
          throw new SubagentError(`subagent "${activation.childId}" is closing`, "ACTIVATION_CLOSING");
        }
      }
      const messageId = this.submitAdmitted(activation, content, options, parent);
      commit?.();
      this.announce(activation);
      return messageId;
    } catch (error) {
      try {
        await this.dispose(activation);
      } catch (cleanupError) {
        this.ctx.logger.warn(`subagent continuation: disposal after admission or catalog append failure also failed: ${String(cleanupError)}`);
      }
      throw error;
    }
  }
  /** Build and submit one message across the final synchronous admission cutoff. */
  submitAdmitted(activation, content, options, parent) {
    const message = options.source === void 0 ? createAgentMessage(parent, content) : createUserMessage2({ content, source: options.source });
    options.signal.throwIfAborted();
    this.assertAdmitting(parent);
    this.authorizeLineage(parent, activation.childId, activation.parent.id);
    this.acquireOwnership(parent, activation.childId);
    try {
      this.deliver(activation, message, options.delivery);
    } finally {
      this.wake(activation);
    }
    return message.id;
  }
  /** Refuse image content for a child whose fixed model accepts text only. */
  async assertImageCapable(agent, signal) {
    const { provider, model } = agent.options;
    if (provider === void 0 || model === void 0)
      return;
    const llm = this.ctx.get("llm");
    if (llm === void 0)
      return;
    const info = await llm.resolveModelInfo(provider, model, signal);
    if (info.inputModalities !== void 0 && !info.inputModalities.includes("image")) {
      throw new SubagentError(`Model "${model}" does not support image input.`, "MODEL_DOES_NOT_SUPPORT_IMAGES");
    }
  }
  /** Resolve the persistence service continuable children require, or fail loud. */
  requirePersistence() {
    const persistence = this.ctx.get("sessionPersistence");
    if (persistence === void 0) {
      throw new SubagentError("continuable subagents require session persistence (load a dsh-session-persistence backend)", "PERSISTENCE_UNAVAILABLE");
    }
    return persistence;
  }
  /** Resolve the Session query service used for cold child observations. */
  requireSessionQuery() {
    const query = this.ctx.get("sessionQuery");
    if (query === void 0) {
      throw new SubagentError("continuable subagents require session query (load @deepseek-ai/dsh-session-query)", "CONTINUATION_UNAVAILABLE");
    }
    return query;
  }
};
var manager_default = SubagentManager;
function hasIndependentPresetSelection(events) {
  for (const event of events) {
    if (event.type === "subagent/descriptor")
      return false;
    if (event.type === "agent-preset/selected")
      return true;
  }
  return false;
}

// packages/team/modules/compat-subagent/lib/types/list-children.js
var __addDisposableResource2 = function(env, value, async) {
  if (value !== null && value !== void 0) {
    if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
    var dispose, inner;
    if (async) {
      if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
      dispose = value[Symbol.asyncDispose];
    }
    if (dispose === void 0) {
      if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
      dispose = value[Symbol.dispose];
      if (async) inner = dispose;
    }
    if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
    if (inner) dispose = function() {
      try {
        inner.call(this);
      } catch (e) {
        return Promise.reject(e);
      }
    };
    env.stack.push({ value, dispose, async });
  } else if (async) {
    env.stack.push({ async: true });
  }
  return value;
};
var __disposeResources2 = /* @__PURE__ */ (function(SuppressedError2) {
  return function(env) {
    function fail(e) {
      env.error = env.hasError ? new SuppressedError2(e, env.error, "An error was suppressed during disposal.") : e;
      env.hasError = true;
    }
    var r, s = 0;
    function next() {
      while (r = env.stack.pop()) {
        try {
          if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
          if (r.dispose) {
            var result = r.dispose.call(r.value);
            if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
              fail(e);
              return next();
            });
          } else s |= 1;
        } catch (e) {
          fail(e);
        }
      }
      if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
      if (env.hasError) throw env.error;
    }
    return next();
  };
})(typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
async function listChildren(ctx, parentSessionId, signal) {
  const env_1 = { stack: [], error: void 0, hasError: false };
  try {
    const query = ctx.get("sessionQuery");
    if (query === void 0) {
      throw new SubagentError("listing subagents requires the sessionQuery service (load @deepseek-ai/dsh-session-query)", "SUBAGENT_CONTROL_QUERY_UNAVAILABLE");
    }
    const parent = __addDisposableResource2(env_1, await query.observeSession(parentSessionId, {
      ...signal === void 0 ? {} : { signal }
    }), false);
    const entries = parent.projections?.values.subagentCatalog;
    if (entries === void 0) {
      throw new SubagentError("listing subagents requires the registered subagentCatalog projection", "SUBAGENT_CONTROL_PROJECTIONS_UNAVAILABLE");
    }
    return entries;
  } catch (e_1) {
    env_1.error = e_1;
    env_1.hasError = true;
  } finally {
    __disposeResources2(env_1);
  }
}
async function listDescendants(ctx, rootSessionId, signal) {
  const sessions = ctx.get("sessions");
  if (sessions === void 0) {
    throw new SubagentError("listing subagents requires the session store (load @deepseek-ai/dsh-session)", "SUBAGENT_CONTROL_SESSION_STORE_UNAVAILABLE");
  }
  const readChildren = async (id) => {
    assertListingNotCancelled(signal);
    let children;
    try {
      children = await listChildren(ctx, id, signal);
    } catch (error) {
      assertListingNotCancelled(signal);
      throw error;
    }
    assertListingNotCancelled(signal);
    return children;
  };
  const stack = (await readChildren(rootSessionId)).map((entry) => ({ entry, parentId: rootSessionId, depth: 1 })).reverse();
  const visited = /* @__PURE__ */ new Set([rootSessionId]);
  const result = [];
  for (let position = stack.pop(); position !== void 0; position = stack.pop()) {
    const { entry, parentId, depth } = position;
    if (visited.has(entry.id))
      continue;
    visited.add(entry.id);
    let children;
    try {
      children = entry.mode === "external" ? [] : await readChildren(entry.id);
    } catch (error) {
      if (error instanceof SubagentError)
        throw error;
      const code = error instanceof Error && "code" in error ? error.code : void 0;
      result.push({
        kind: "diagnostic",
        id: entry.id,
        parentId,
        depth,
        reason: code === "SESSION_QUERY_CORRUPT_SESSION" || code === "SESSION_QUERY_SOURCE_CONFLICT" ? "corrupt" : "unavailable"
      });
      continue;
    }
    if (entry.mode === "unknown") {
      result.push({ kind: "diagnostic", id: entry.id, parentId, depth, reason: "unsupported" });
    } else {
      const { createdAt: _createdAt, ...identity } = entry;
      result.push({
        ...identity,
        kind: "child",
        parentId,
        depth,
        activity: sessions.get(entry.id) === void 0 ? "inactive" : "running",
        hasChildren: children.length > 0
      });
    }
    for (const child of [...children].reverse()) {
      stack.push({ entry: child, parentId: entry.id, depth: depth + 1 });
    }
  }
  return result;
}
function assertListingNotCancelled(signal) {
  if (signal?.aborted) {
    throw new SubagentError("subagent listing was cancelled", "CANCELLED");
  }
}

// packages/team/modules/compat-subagent/lib/types/archive-admission.js
var __addDisposableResource3 = function(env, value, async) {
  if (value !== null && value !== void 0) {
    if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
    var dispose, inner;
    if (async) {
      if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
      dispose = value[Symbol.asyncDispose];
    }
    if (dispose === void 0) {
      if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
      dispose = value[Symbol.dispose];
      if (async) inner = dispose;
    }
    if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
    if (inner) dispose = function() {
      try {
        inner.call(this);
      } catch (e) {
        return Promise.reject(e);
      }
    };
    env.stack.push({ value, dispose, async });
  } else if (async) {
    env.stack.push({ async: true });
  }
  return value;
};
var __disposeResources3 = /* @__PURE__ */ (function(SuppressedError2) {
  return function(env) {
    function fail(e) {
      env.error = env.hasError ? new SuppressedError2(e, env.error, "An error was suppressed during disposal.") : e;
      env.hasError = true;
    }
    var r, s = 0;
    function next() {
      while (r = env.stack.pop()) {
        try {
          if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
          if (r.dispose) {
            var result = r.dispose.call(r.value);
            if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
              fail(e);
              return next();
            });
          } else s |= 1;
        } catch (e) {
          fail(e);
        }
      }
      if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
      if (env.hasError) throw env.error;
    }
    return next();
  };
})(typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
function installSubagentArchiveAdmission(ctx) {
  ctx.on("workspace/session-activity", async ({ sessionId }, next) => {
    const running = runningDescendants(ctx, sessionId);
    const rest = await next();
    if (running.length === 0)
      return rest;
    const own = { kind: "subagent", items: await Promise.all(running.map((child) => describe(ctx, child))) };
    return [own, ...rest];
  });
  ctx.on("workspace/session-stop", ({ sessionId }) => {
    for (const child of runningDescendants(ctx, sessionId)) {
      try {
        child.cancel({ kind: "parent" });
      } catch (error) {
        ctx.logger.warn(`subagent: cancelling "${child.id}" for an archived Session failed: ${String(error)}`);
      }
    }
  });
}
function runningDescendants(ctx, rootId) {
  const childrenOf = /* @__PURE__ */ new Map();
  for (const agent of ctx.agents.list()) {
    const { parentSession, origin } = agent.session.header;
    if (parentSession === void 0 || origin !== "subagent")
      continue;
    const siblings = childrenOf.get(parentSession) ?? [];
    siblings.push(agent);
    childrenOf.set(parentSession, siblings);
  }
  const running = [];
  const pending = [rootId];
  const visited = /* @__PURE__ */ new Set();
  while (pending.length > 0) {
    const parentId = pending.shift();
    if (visited.has(parentId))
      continue;
    visited.add(parentId);
    for (const child of childrenOf.get(parentId) ?? []) {
      if (child.status === "running")
        running.push(child);
      pending.push(child.id);
    }
  }
  return running;
}
async function describe(ctx, child) {
  const query = ctx.get("sessionQuery");
  if (query === void 0)
    return { id: child.id };
  try {
    const env_1 = { stack: [], error: void 0, hasError: false };
    try {
      const observation = __addDisposableResource3(env_1, await query.observeSession(child.id, { projectionMode: "none" }), false);
      const label = foldSubagentDescriptor(observation.events.slice(observation.inheritedEventCount))?.label;
      return label === void 0 ? { id: child.id } : { id: child.id, label };
    } catch (e_1) {
      env_1.error = e_1;
      env_1.hasError = true;
    } finally {
      __disposeResources3(env_1);
    }
  } catch {
    return { id: child.id };
  }
}

// packages/team/modules/compat-subagent/lib/types/projection.js
import { z as z3 } from "zod";
import { SessionSeq } from "@deepseek-ai/dsh-session";
var activeIntervalSchema = z3.object({
  since: z3.number().int().nonnegative(),
  through: z3.number().int().nonnegative()
}).strict();
var projectionSchema = z3.object({
  settledMs: z3.number().int().nonnegative(),
  active: activeIntervalSchema.optional(),
  lastTurnCompleted: z3.boolean().optional()
}).strict().transform(({ settledMs, active, lastTurnCompleted }) => ({
  settledMs,
  ...active === void 0 ? {} : { active },
  ...lastTurnCompleted === void 0 ? {} : { lastTurnCompleted }
}));
var timingStateSchema = z3.object({
  settledMs: z3.number().int().nonnegative(),
  active: activeIntervalSchema.optional(),
  pendingTurnStart: z3.number().int().nonnegative().optional(),
  descriptorSeen: z3.boolean(),
  lastTurnCompleted: z3.boolean().optional()
}).strict();
var subagentTimingProjectionDefinition = {
  key: "subagentTiming",
  stateSchema: timingStateSchema,
  init: () => ({ descriptorSeen: false, settledMs: 0 }),
  apply: (state, event) => {
    if (event.type === "turn/start") {
      const { lastTurnCompleted: _closed, ...openState } = state;
      return state.descriptorSeen ? { ...openState, active: { since: event.time, through: event.time } } : { ...openState, pendingTurnStart: event.time };
    }
    if (event.type === "subagent/descriptor") {
      const activeSince = state.active?.since ?? state.pendingTurnStart;
      return {
        descriptorSeen: true,
        settledMs: 0,
        ...activeSince === void 0 ? {} : { active: { since: activeSince, through: event.time } }
      };
    }
    if (event.type === "turn/end") {
      if (!state.descriptorSeen) {
        if (state.pendingTurnStart === void 0)
          return state;
        const { pendingTurnStart: _closed, ...next } = state;
        return next;
      }
      if (state.active === void 0)
        return state;
      const { active, ...rest } = state;
      return {
        ...rest,
        settledMs: state.settledMs + Math.max(0, event.time - active.since),
        lastTurnCompleted: event.data.reason.kind === "completed"
      };
    }
    if (state.active === void 0)
      return state;
    return { ...state, active: { ...state.active, through: event.time } };
  },
  wire: {
    viewSchema: projectionSchema,
    view: (state) => ({
      settledMs: state.settledMs,
      ...state.active === void 0 ? {} : { active: state.active },
      ...state.lastTurnCompleted === void 0 ? {} : { lastTurnCompleted: state.lastTurnCompleted }
    })
  },
  stateVersion: 3
};
var identityValueSchema = z3.discriminatedUnion("mode", [
  z3.object({
    mode: z3.literal("one-shot"),
    label: z3.string().optional(),
    seq: z3.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).transform(SessionSeq)
  }).strict(),
  z3.object({
    mode: z3.literal("continuable"),
    label: z3.string(),
    seq: z3.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).transform(SessionSeq)
  }).strict()
]);
var identitySchema = identityValueSchema.nullable();
var identityStateSchema = z3.object({
  identity: identityValueSchema.optional()
}).strict();
function descriptorIdentity(event) {
  let descriptor;
  try {
    descriptor = foldSubagentDescriptor([event]);
  } catch {
    descriptor = void 0;
  }
  if (descriptor === void 0)
    return void 0;
  return descriptor.mode === "one-shot" ? {
    mode: "one-shot",
    ...descriptor.label !== void 0 ? { label: descriptor.label } : {},
    seq: event.seq
  } : { mode: "continuable", label: descriptor.label, seq: event.seq };
}
var subagentIdentityProjectionDefinition = {
  key: "subagent",
  stateSchema: identityStateSchema,
  init: () => ({}),
  apply: (state, event) => {
    if (event.type !== "subagent/descriptor")
      return state;
    const identity = descriptorIdentity(event);
    return identity === void 0 ? {} : { identity };
  },
  wire: { viewSchema: identitySchema, view: (state) => state.identity ?? null },
  // Bumped when the identity gained its `seq` field: an older checkpoint row
  // would replay into a value the schema rejects, so it must refold instead.
  stateVersion: 2
};

// packages/team/modules/compat-subagent/lib/types/out-of-process.js
import { accessSync, constants, statSync } from "node:fs";
import { isAbsolute as isAbsolute2 } from "node:path";
var MAX_SUBAGENT_DIAGNOSTIC_BYTES = 4096;
var DIAGNOSTIC_TRUNCATION_SUFFIX = "\n[diagnostic truncated]";
var utf8Encoder = new TextEncoder();
var utf8Decoder = new TextDecoder();
function limitSubagentDiagnostic(diagnostic) {
  const bytes = utf8Encoder.encode(diagnostic);
  if (bytes.byteLength <= MAX_SUBAGENT_DIAGNOSTIC_BYTES)
    return diagnostic;
  const suffixBytes = utf8Encoder.encode(DIAGNOSTIC_TRUNCATION_SUFFIX).byteLength;
  let prefixBytes = MAX_SUBAGENT_DIAGNOSTIC_BYTES - suffixBytes;
  while ((bytes[prefixBytes] & 192) === 128) {
    prefixBytes -= 1;
  }
  return utf8Decoder.decode(bytes.subarray(0, prefixBytes)) + DIAGNOSTIC_TRUNCATION_SUFFIX;
}
function normalizeSubagentDiagnostic(result) {
  return result.diagnostic === void 0 ? result : { ...result, diagnostic: limitSubagentDiagnostic(result.diagnostic) };
}
var NO_START_CAPABILITIES = Object.freeze({
  agentOptions: false,
  agentPreset: false,
  outputSchema: false,
  depthLimit: false
});
function assertPositiveFinite(prefix, name, value) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${prefix}: ${name} must be a positive finite number`);
  }
}
function isEnterableDirectory(path) {
  try {
    if (!statSync(path).isDirectory())
      return false;
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
function assertUsableCwd(prefix, label, cwd) {
  if (!isAbsolute2(cwd)) {
    throw new Error(`${prefix}: ${label} must be an absolute path: ${cwd}`);
  }
  if (!isEnterableDirectory(cwd)) {
    throw new Error(`${prefix}: ${label} is not an accessible directory: ${cwd}`);
  }
  return cwd;
}
function toError(value) {
  return value instanceof Error ? value : new Error(String(value));
}
async function settleRunResult(parts) {
  try {
    const result = await parts.attempt();
    return parts.cancelled() ? { output: parts.collectOutput(), stopReason: "aborted" } : normalizeSubagentDiagnostic(result);
  } catch (error) {
    if (parts.cancelled())
      return { output: parts.collectOutput(), stopReason: "aborted" };
    try {
      parts.onError?.(toError(error), "error");
    } catch {
    }
    const collected = parts.collectDiagnostic?.();
    const diagnostic = collected === void 0 ? void 0 : limitSubagentDiagnostic(collected);
    return {
      output: parts.collectOutput(),
      ...diagnostic === void 0 ? {} : { diagnostic },
      stopReason: "error"
    };
  } finally {
    parts.signal.removeEventListener("abort", parts.onAbort);
  }
}
function subprocessRunHandle(parts) {
  let disposal;
  return {
    id: parts.id,
    result: parts.result,
    dispose() {
      if (disposal !== void 0)
        return disposal;
      parts.signal.removeEventListener("abort", parts.onAbort);
      parts.requestCancel();
      disposal = parts.teardown();
      return disposal;
    }
  };
}

// packages/team/modules/compat-subagent/lib/types/index.js
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
var SubagentRuntime = (() => {
  let _classSuper = TypertRemoteService;
  let _instanceExtraInitializers = [];
  let _prompt_decorators;
  let _interruptByParent_decorators;
  return class SubagentRuntime extends _classSuper {
    static {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
      _prompt_decorators = [Remote("prompt")];
      _interruptByParent_decorators = [Remote("interruptByParent")];
      __esDecorate(this, null, _prompt_decorators, { kind: "method", name: "prompt", static: false, private: false, access: { has: (obj) => "prompt" in obj, get: (obj) => obj.prompt }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _interruptByParent_decorators, { kind: "method", name: "interruptByParent", static: false, private: false, access: { has: (obj) => "interruptByParent" in obj, get: (obj) => obj.interruptByParent }, metadata: _metadata }, null, _instanceExtraInitializers);
      if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    }
    config = __runInitializers(this, _instanceExtraInitializers);
    static Config = z4.object({
      maxDepth: z4.number().step(1).min(0).max(Number.MAX_SAFE_INTEGER).default(1).volatile(),
      maxActiveSubagents: z4.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(8).volatile()
    });
    static inject = ["workingDirectory"];
    providers = /* @__PURE__ */ new Map();
    manager;
    /**
     * The contained lifecycle-edge publisher. Built here because scoped dispatch
     * keys its carrier by this exact service instance, whose own context filter
     * composes into the carrier.
     */
    emitLifecycle;
    constructor(ctx, config) {
      super(ctx, "subagents");
      this.config = config;
      this.emitLifecycle = createLifecycleEmitter(this.ctx, (parent) => scopeTarget(this, parent));
      ctx.inject(["agents"], (childCtx) => {
        const manager = new manager_default(childCtx, {
          startExternal: (name, request) => {
            const provider = this.expectProvider(name);
            return provider.start(request);
          },
          prepareContinuable: (name, request) => this.prepareContinuable(name, request),
          observeActivation: (provider, childId, parent) => this.observeActivation(provider, childId, parent),
          releaseActivation: (parent, childId) => this.emitLifecycle("subagent/activation-released", { parent, childId }, parent)
        }, (parent, childId) => this.ctx.waterfall(scopeTarget(this, parent), "subagent/activation-capacity", parent, childId, () => this.config.maxActiveSubagents.get()));
        this.manager = manager;
        childCtx.effect(() => () => {
          if (this.manager === manager)
            this.manager = void 0;
        }, "subagents.managerBinding()");
      });
      ctx.inject(["sessionProjections"], (projectionCtx) => {
        projectionCtx.sessionProjections.register(subagentCatalogProjectionDefinition);
        projectionCtx.sessionProjections.register(subagentTimingProjectionDefinition);
        projectionCtx.sessionProjections.register(subagentIdentityProjectionDefinition);
      });
      ctx.inject(["agents"], (agentsCtx) => {
        installSubagentArchiveAdmission(agentsCtx);
      });
    }
    /**
     * Resolve a delegation tool's depth policy against the current user setting.
     * @param configured - Explicit tool limit, or provider-managed for external delegation.
     * @returns The numeric limit, or undefined when the provider owns depth enforcement.
     */
    resolveMaxDepth(configured) {
      if (configured === "provider-managed")
        return void 0;
      if (configured !== void 0)
        return configured;
      const depth = this.config.maxDepth.get();
      assertSubagentMaxDepth(depth);
      return depth;
    }
    /**
     * Establish a managed child with backend-specific execution capabilities.
     * @param spec - task, backend, and result recipient.
     * @returns identities, execution result, and exact-activation disposal. A reserved
     * childId requires a local backend and guarantees an accepted messageId.
     */
    async startActivation(spec) {
      const provider = this.expectProvider(spec.provider);
      if (spec.childId !== void 0 && provider.prepareContinuable === void 0) {
        throw new SubagentError("reserved child ids require a local backend", "UNSUPPORTED_CAPABILITY");
      }
      assertSubagentMaxDepth(spec.request.maxDepth);
      this.assertCapabilities(provider, { ...spec.request, signal: spec.signal });
      const manager = this.requireManager();
      if (this.ctx.get("agents")?.get(spec.request.parent.id) !== spec.request.parent) {
        throw new SubagentError("subagent creation requires the exact live parent agent", "UNAUTHORIZED");
      }
      if (spec.request.outputSchema !== void 0)
        assertObjectJsonSchema(spec.request.outputSchema);
      return provider.prepareContinuable === void 0 ? manager.startExternal(spec) : manager.startLocal(spec);
    }
    /**
     * Join progressing descendants without cancelling them. Idle descendants whose
     * inboxes require a later wake stay resident and do not delay host completion.
     * @param parent - the exact parent whose descendant work is observed.
     * @returns whether work was joined; hosts recheck parent idle after true.
     */
    async waitForChildren(parent) {
      return this.manager?.waitForChildren(parent) ?? false;
    }
    /** Host-only residency operation; its callback cannot outlive the retained ancestor chain. */
    [withSubagentAncestors](root, ancestorIds, signal, operation) {
      return this.requireManager().withAncestors(root, ancestorIds, signal, operation);
    }
    /**
     * Steer one model-authored message to the sender's direct parent or direct
     * continuable child. A running target admits it at the nearest step boundary;
     * an idle target starts a turn, and an absent direct child cold-resumes from
     * persistence. The service derives durable sender attribution from the exact
     * live sender. Caller cancellation stops only pre-acceptance work.
     * @param sender - exact live Agent authorizing and originating the message.
     * @param targetId - durable direct-parent or direct-child session id.
     * @param content - model-authored content to deliver.
     * @param options - caller cancellation before inbox acceptance.
     * @returns the accepted message's inbox id.
     * @throws when continuation services are unavailable, adjacency is rejected,
     *   or the message was not admitted.
     */
    async sendMessage(sender, targetId, content, options) {
      return this.requireManager().sendMessage(sender, targetId, content, options);
    }
    /**
     * Deliver one host-protocol message to a direct continuable child.
     * Symbol-keyed so host adapters can preserve their own source descriptors without
     * widening the public Service Definition or impersonating an Agent sender.
     * @param parent - exact live direct parent authorizing delivery.
     * @param childId - durable direct-child session id.
     * @param content - host-authored content to deliver.
     * @param source - durable host-protocol source descriptor.
     * @param signal - caller cancellation before inbox acceptance.
     * @param delivery - Queue as a distinct turn or Steer at the nearest step.
     * @returns the accepted message's inbox id.
     */
    [deliverSubagentPrompt](parent, childId, content, source, signal, delivery, ancestorIds) {
      if (delivery === "steer" && ancestorIds !== void 0 && ancestorIds.length > 0)
        return this.requireManager().steerDescendantPrompt(parent, ancestorIds, childId, content, source, signal);
      return delivery === "steer" ? this.requireManager().steerPrompt(parent, childId, content, source, signal, ancestorIds === void 0 ? "parent" : "caller") : this.requireManager().queuePrompt(parent, childId, content, source, signal);
    }
    /**
     * Interrupt one live child's current execution under a human parent
     * address or an exact live ancestor Agent. Fire-and-return: the cancel
     * signal is issued before this returns, but the target may keep running
     * until it observes the signal. Unclaimed pending inbox work, the Activation,
     * and published descendants are preserved; claimed work is not requeued.
     * Once the interrupted Agent is idle, a waking send resumes the parked FIFO
     * queue. External backends stop their single execution. An absent target
     * is an accepted no-op, as is a manager-less composition, which cannot own a
     * live Activation.
     * @param targetSessionId - the durable child session id to interrupt.
     * @param authority - the human parent address or exact live ancestor Agent.
     * @throws {SubagentError} `UNAUTHORIZED` when the authority does not own the
     *   live target.
     */
    interrupt(targetSessionId, authority) {
      this.manager?.interrupt(targetSessionId, authority);
    }
    /**
     * Close subagent admission below exact live parent Agents, stop only their
     * visible descendant Activations synchronously, then await admitted scoped
     * materializations and release those forests child-first. The scoped cutoff
     * lasts until each exact parent leaves the registry; unrelated parent trees
     * remain live.
     * @param parents - exact host-owned parent Agents entering teardown.
     * @returns once every retained descendant activation released its execution handle.
     * @throws an aggregate error after all branches settle when any failed.
     */
    async drainDescendants(parents) {
      const manager = this.manager;
      if (manager === void 0)
        return;
      await manager.drainDescendants(parents);
    }
    /**
     * Release selected resident direct children of one exact live
     * parent. Other children of the same parent remain admitted and resident.
     * Absent targets and a manager-less composition are accepted no-ops.
     * @param parent - exact live direct parent authorizing the selected release.
     * @param childIds - durable direct-child ids to release when resident.
     * @returns once every selected activation released its execution handle.
     * @throws {SubagentError} `UNAUTHORIZED` when a resident target belongs to a
     *   different parent or the supplied parent identity is stale.
     */
    async drainChildren(parent, childIds) {
      const manager = this.manager;
      if (manager === void 0)
        return;
      await manager.drainChildren(parent, childIds);
    }
    /**
     * Read the parent's durable direct-child catalog without loading or resuming an Agent.
     * The service owns and releases the live-preferred Session observation.
     * @param parentSessionId - parent whose direct children are requested.
     * @param signal - cancellation forwarded to the Session query.
     * @returns catalog children in parent event order.
     * @throws {@link SubagentError} when query or catalog projection is unavailable.
     * @throws SessionQueryError when the parent cannot be read or the query is cancelled.
     */
    listChildren(parentSessionId, signal) {
      return listChildren(this.ctx, parentSessionId, signal);
    }
    /**
     * Recursively list reachable parent catalogs in stable pre-order, preserving
     * each catalog's event order. Each row carries its catalog parent and depth;
     * external children are leaves; one-shot and unknown-mode children remain
     * traversal nodes. Unknown modes
     * produce unsupported diagnostics. Unreadable child catalogs produce corrupt
     * or unavailable diagnostics and stop only that branch. Root read failures,
     * missing services or projections, and cancellation reject the whole listing.
     * Each catalog is observed once and released before the next read. No Agent
     * is loaded or resumed; Sessions absent from reachable catalogs are omitted.
     * @param rootSessionId - session whose catalog starts descendant discovery.
     * @param signal - cancellation forwarded to and checked around each catalog read.
     * @returns children and branch diagnostics in parent-catalog pre-order.
     * @throws {@link SubagentError} when listing dependencies are unavailable or the caller cancels.
     * @throws SessionQueryError when the root catalog cannot be read.
     */
    listDescendants(rootSessionId, signal) {
      return listDescendants(this.ctx, rootSessionId, signal);
    }
    /**
     * Deliver one browser-authored message to a continuable child through the
     * exact live direct parent, retaining the caller-minted request identity and
     * validated browser zone on the accepted message. Success identifies the
     * message the child's inbox accepted; later execution is independent of this
     * call. Queue delivery targets a later turn; steer delivery targets the
     * nearest step and retains the Agent loop's best-effort fallback semantics.
     * Image parts are admitted and persisted through the attachment store
     * before delivery, and the child's model must accept image input.
     * Cold resume at capacity rejects with `subagent/delivery-unavailable`.
     * @param request - durable address, delivery, minted identity, content, and optional browser zone.
     * @param signal - carrier cancellation, owning the call until inbox acceptance.
     * @returns the accepted message's inbox identity.
     * @throws {RemoteError} `gateway/bad-request`, `subagent/attachment-invalid`,
     *   `subagent/invalid-time-zone`, `subagent/parent-unavailable`,
     *   `subagent/not-resumable`, `subagent/unauthorized`,
     *   `subagent/delivery-unavailable`, `gateway/cancelled`, or `gateway/internal`.
     */
    async prompt(request, signal) {
      const { parentSessionId, childSessionId, clientTimeZone, delivery } = request;
      validateControlRequest("subagent.prompt", request);
      const canonicalTimeZone = clientTimeZone === void 0 ? void 0 : canonicalClientTimeZone(clientTimeZone);
      if (clientTimeZone !== void 0 && canonicalTimeZone === void 0) {
        throw new RemoteError2("subagent/invalid-time-zone", "clientTimeZone must be UTC or a valid IANA Area/Location name", { value: clientTimeZone });
      }
      const parent = this.ctx.get("agents")?.get(parentSessionId);
      if (parent === void 0) {
        throw new RemoteError2("subagent/parent-unavailable", `parent session "${parentSessionId}" is not live`, { parentSessionId });
      }
      const principal = principalOf(this.ctx.invocation);
      const source = {
        kind: "user",
        rpcId: request.requestId,
        ...canonicalTimeZone === void 0 ? {} : { clientTimeZone: canonicalTimeZone },
        ...principal === void 0 ? {} : { principal }
      };
      try {
        let content;
        if (request.content.every((part) => part.type === "text")) {
          content = request.content.map((part) => ({ type: "text", text: part.text }));
        } else {
          const attachments = this.ctx.get("attachments");
          if (attachments === void 0)
            throw new Error("subagent image prompt requires an attachment store");
          content = await attachments.admitPromptContent(request.content);
        }
        return {
          messageId: await this[deliverSubagentPrompt](parent, childSessionId, content, source, signal, delivery)
        };
      } catch (error) {
        return rejectPrompt(error, childSessionId, signal);
      }
    }
    /**
     * Remote face of {@link interrupt} under one durable parent address. No
     * catalog, history, persistence, or parent Agent lookup runs: the core
     * primitive alone authorizes the address against the live Activation, which
     * is what keeps a live child interruptible while its parent Agent is offline.
     * Absent, idle, and already-completed targets are accepted no-ops there.
     * @param childSessionId - durable child session id to interrupt.
     * @param parentSessionId - durable direct parent whose authority is claimed.
     * @param mode - required continuable-address discriminator.
     * @returns acknowledgement that the cancel signal was admitted, not that the target is quiescent.
     * @throws {RemoteError} `gateway/bad-request` for an empty id,
     *   `subagent/unauthorized` when the address does not own the live target,
     *   otherwise `gateway/internal`.
     */
    interruptByParent(childSessionId, parentSessionId, mode) {
      validateControlRequest("subagent.interrupt", { childSessionId, parentSessionId, mode });
      try {
        this.interrupt(childSessionId, { kind: "user", parentSessionId });
      } catch (error) {
        if (error instanceof SubagentError && error.code === "UNAUTHORIZED") {
          throw new RemoteError2("subagent/unauthorized", "subagent does not belong to this parent", { childSessionId }, { cause: error });
        }
        throw new RemoteError2("gateway/internal", "subagent interrupt failed", {}, { cause: error });
      }
      return { accepted: true };
    }
    /**
     * Register a provider under its name. Registration is effect-scoped and HMR
     * safe; removing a provider blocks new starts but does not revoke runs that
     * were already returned to their holders. Providers without either execution
     * method are rejected with UNSUPPORTED_CAPABILITY before registration.
     * @param provider - the trusted provider implementation.
     * @returns the exact Cordis effect disposer.
     */
    registerProvider(provider) {
      const name = provider.name;
      if (provider.start === void 0 && provider.prepareContinuable === void 0) {
        throw new SubagentError(`subagent provider "${name}" must implement start or prepareContinuable`, "UNSUPPORTED_CAPABILITY");
      }
      return this.ctx.effect(function* () {
        if (this.providers.has(name)) {
          throw new SubagentError(`a subagent provider named "${name}" is already registered`, "DUPLICATE_PROVIDER");
        }
        this.providers.set(name, provider);
        yield () => {
          this.providers.delete(name);
          this.emitLifecycle("subagent/provider-removed", name);
        };
        this.ctx.emit("subagent/provider-added", provider);
      }.bind(this), "subagents.registerProvider()");
    }
    /**
     * Look up a provider by name.
     * @param name - the provider name.
     * @returns the provider, or undefined when absent.
     */
    getProvider(name) {
      return this.providers.get(name);
    }
    /**
     * List registered provider names in insertion order.
     * @returns the registered names.
     */
    list() {
      return [...this.providers.keys()];
    }
    /**
     * Resolve one provider's detached continuable-creation contribution. Method
     * presence on the provider IS the capability, so a provider without it is
     * rejected before the manager reserves any child resources.
     */
    async prepareContinuable(name, request) {
      const provider = this.expectProvider(name);
      return provider.prepareContinuable(request);
    }
    /** Look up a provider for dispatch or fail loud. */
    expectProvider(name) {
      const provider = this.providers.get(name);
      if (provider === void 0) {
        throw new SubagentError(`no subagent provider registered for "${name}"`, "NO_PROVIDER");
      }
      return provider;
    }
    /** Resolve the subagent manager or fail loud. */
    requireManager() {
      if (this.manager === void 0) {
        throw new SubagentError("continuable subagents require the agents service", "CONTINUATION_UNAVAILABLE");
      }
      return this.manager;
    }
    /**
     * Build the lifecycle observer for one continuable Activation's residency
     * epoch, so the manager publishes its edges without owning event dispatch.
     */
    observeActivation(provider, childId, parent) {
      return createActivationObserver(this.emitLifecycle, provider, childId, parent);
    }
    /** Reject the first requested capability that the provider lacks. */
    assertCapabilities(provider, request) {
      if (request.agentPreset !== void 0 && (!provider.capabilities.agentPreset || provider.inheritsParentContext)) {
        throw new SubagentError(`subagent provider "${provider.name}" does not support independent agent preset selection`, "UNSUPPORTED_CAPABILITY");
      }
      const needs = [
        { when: request.agentOptions !== void 0, cap: "agentOptions" },
        { when: request.outputSchema !== void 0, cap: "outputSchema" },
        { when: request.maxDepth !== void 0, cap: "depthLimit" }
      ];
      for (const { when, cap } of needs) {
        if (when && !provider.capabilities[cap]) {
          throw new SubagentError(`subagent provider "${provider.name}" does not support the "${cap}" capability`, "UNSUPPORTED_CAPABILITY");
        }
      }
    }
  };
})();
var index_default = SubagentRuntime;
export {
  AssistantOutputFold,
  NO_START_CAPABILITIES,
  STRUCTURED_OUTPUT_TOOL,
  SUBAGENT_DESCRIPTOR_VERSION,
  SubagentDepthError,
  SubagentError,
  SubagentRunId,
  SubagentRuntime,
  appendDelegatedPolicyOverrides,
  applyChildComposition,
  assertPositiveFinite,
  assertSubagentMaxDepth,
  assertUsableCwd,
  captureDelegatedPolicyOverrides,
  childSessionMeta,
  index_default as default,
  delegationDepthOf,
  finalAssistantOutput,
  foldSubagentDescriptor,
  parentAgentOptionsForDelegation,
  resolveChildAgentOptions,
  resolveChildDepth,
  settleRunResult,
  snapshotSubagentDescriptor,
  subprocessRunHandle
};
