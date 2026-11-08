/** Reduce model-visible choices to the current role, task and confirmed execution resources. */
import type { SessionId } from '@deepseek-ai/dsh-session'
import type { TeamState } from './projection.ts'
import { memberFunction } from './member-role.ts'
import { readProjectPlan } from './project-plan.ts'
import { adviserTools, teamCoordinationTools } from './tool-capabilities.ts'
import { TeamId } from './types.ts'

/**
 * Select an additional exact-Session ceiling; it cannot grant absent tools.
 * @param state - Authoritative Team state for this request.
 * @param id - Exact requesting member.
 * @param names - Already resolved tool names, including the deployment's security caps.
 * @returns allowed names, or undefined outside a current V2 goal.
 */
export function currentMemberToolMenu(state: TeamState, id: SessionId, names: readonly string[]): string[] | undefined {
  if (state.goal?.status !== 'active' || readProjectPlan(state.goal.definition.plan)?.version !== 2) return undefined
  const member = state.members.find(candidate => candidate.id === id)
  const adviser = memberFunction(state, member)?.endsWith('_adviser') === true
  const executing = state.tasks.some(task => task.ownerId === id && task.work?.plan.goalRevision === state.goal?.revision
    && task.work?.execution?.phase === 'running')
  const verifying = state.tasks.some(task => task.reviewerId === id && task.work?.plan.goalRevision === state.goal?.revision
    && task.work?.execution?.phase === 'submitted')
  const observing = TeamId(id) === state.id || adviser || executing || verifying
  const scope = state.goal.definition.scope.execution
  return names.filter(name => {
    if (adviser && !adviserTools.has(name)) return false
    if (name === 'job_kill') return executing && scope?.allowUnrestrictedExecution === true
    if (teamCoordinationTools.has(name)) return true
    if (!observing) return false
    if (['read', 'read_image', 'glob', 'grep'].includes(name)) return true
    if (name === 'web_search') return scope?.allowSearch === true
    if (name === 'web_fetch') return (scope?.webOrigins.length ?? 0) > 0
    if (!executing || adviser) return false
    if (['write', 'edit', 'str_replace_editor'].includes(name)) return true
    return scope?.allowUnrestrictedExecution === true
  })
}
