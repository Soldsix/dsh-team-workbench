// packages/team/modules/compat-subagent/lib/types/internal.js
var adjacentAgentSendMessageTool = Symbol.for("dsh.subagent.adjacentAgentSendMessageTool");
function markAdjacentAgentSendMessageTool(definition) {
  Object.defineProperty(definition, adjacentAgentSendMessageTool, { value: true });
  return definition;
}
function isAdjacentAgentSendMessageTool(definition) {
  return definition !== void 0 && definition[adjacentAgentSendMessageTool] === true;
}
var deliverSubagentPrompt = Symbol.for("dsh.subagent.deliverPrompt");
var withSubagentAncestors = Symbol.for("dsh.subagent.withAncestors");
function withHostSubagentAncestors(runtime, root, ancestorIds, signal, operation) {
  return runtime[withSubagentAncestors](root, ancestorIds, signal, operation);
}
function queueHostSubagentPrompt(runtime, parent, childId, content, source, signal) {
  return runtime[deliverSubagentPrompt](parent, childId, content, source, signal, "queue");
}
function steerHostSubagentPrompt(runtime, parent, childId, content, source, signal, ancestorIds) {
  return runtime[deliverSubagentPrompt](parent, childId, content, source, signal, "steer", ancestorIds);
}
export {
  adjacentAgentSendMessageTool,
  deliverSubagentPrompt,
  isAdjacentAgentSendMessageTool,
  markAdjacentAgentSendMessageTool,
  queueHostSubagentPrompt,
  steerHostSubagentPrompt,
  withHostSubagentAncestors,
  withSubagentAncestors
};
