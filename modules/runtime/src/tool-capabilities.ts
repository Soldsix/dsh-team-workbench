/** Exact native-tool classifications shared by resource admission and recovery. */

/** Team operations whose own service enforces membership, goal, and object-level permissions. */
export const teamCoordinationTools: ReadonlySet<string> = new Set([
  'team_goal', 'team_help', 'team_context', 'team_mailbox', 'team_workspace', 'team_member',
  'list_agents', 'list_team_models', 'spawn_teammate', 'send_message', 'wait_agent', 'interrupt_agent', 'retire_agent',
  'team_task_create', 'team_task_list', 'team_task_get', 'team_task_update', 'team_task_reconcile', 'team_task_archive',
  'team_task_submit', 'team_task_review',
  'team_adviser_review', 'team_expert_catalog', 'team_expert_save', 'team_expert_assign', 'team_skill', 'team_skill_catalog', 'team_skills',
  'get_goal', 'skill', 'ask_user_question', 'todo_write', 'job_output', 'job_list', 'job_kill', 'web_status',
])

const trackedCoordination = new Set(['team_workspace', 'job_kill'])
const readOnlyTools = new Set(['read', 'read_image', 'glob', 'grep'])

/** Collaboration and observation tools available to decision-only advisers. */
export const adviserTools: ReadonlySet<string> = new Set(['read', 'read_image', 'glob', 'grep', 'web_search', 'web_fetch',
  'web_status', 'team_goal', 'team_help', 'team_context', 'team_mailbox', 'team_workspace',
  'list_agents', 'list_team_models', 'team_task_list', 'team_task_get', 'team_task_archive',
  'team_adviser_review', 'team_skill', 'team_skill_catalog', 'team_skills', 'send_message', 'ask_user_question'])

/**
 * Identify calls whose effects are confined to durable coordination records or read-only observations.
 * @param name - Exact registered tool name; unknown names remain opaque.
 * @param args - Logged tool JSON; only recognized read-only workspace actions omit effect tracking.
 * @returns whether task recovery may omit an external-effect observation.
 */
export function hasNoExternalTaskEffect(name: string, args?: unknown): boolean {
  if (name === 'team_workspace' && args !== null && typeof args === 'object' && 'action' in args
    && (args.action === 'get' || args.action === 'prepare' || args.action === 'read_artifact' || args.action === 'read_input')) return true
  return readOnlyTools.has(name) || teamCoordinationTools.has(name) && !trackedCoordination.has(name)
}

/** Native tools with reviewed workspace isolation support; deployment still selects the actual allowlist. */
export const teamAuditedTools: ReadonlySet<string> = new Set([
  ...teamCoordinationTools, ...readOnlyTools,
  'write', 'edit', 'bash', 'pwsh', 'run_code', 'web_search', 'web_fetch',
])
