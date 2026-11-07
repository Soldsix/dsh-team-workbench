/** Materialize user-approved version-2 plans without inventing work or changing model routes. */
import type { Agent } from '@deepseek-ai/dsh-agent'
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import { withHostSubagentAncestors } from '@deepseek-ai/dsh-subagent/internal'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type SubagentRuntime from '@deepseek-ai/dsh-subagent'
import type { TeamService } from './index.ts'
import type { TeamState } from './projection.ts'
import { readProjectPlan } from './project-plan.ts'
import { TeamError } from './error.ts'

/** Host-owned controls; no model can enlarge these deployment limits. */
export interface ProvisionControls {
  readonly subagents: SubagentRuntime
  readonly provider: string
  readonly maxNew: number
  readonly signal: AbortSignal
  readonly state: () => TeamState
}

/** Provision approved members only for independent ready work and materialize their exact plan tasks. */
export async function provisionPlan(service: TeamService, root: Agent, controls: ProvisionControls): Promise<void> {
  const state = controls.state()
  const goal = state.goal
  const plan = readProjectPlan(goal?.definition.plan)
  if (goal?.status !== 'active' || plan?.version !== 2 || plan.automation?.provision !== 'on-demand') return
  const ready = plan.tasks.filter(task => !state.tasks.some(saved => saved.inputKey === task.id)
    && task.dependencies.every(id => state.tasks.some(saved => saved.inputKey === id && saved.status === 'completed')))
  if (ready.length === 0) return
  const required = new Set(ready.flatMap(task => [task.owner, task.reviewer]))
  for (const member of plan.members) if (member.function === 'planning_adviser' || member.function === 'quality_adviser') required.add(member.name)
  for (const name of required) {
    let member = plan.members.find(candidate => candidate.name === name)
    while (member !== undefined && member.parent !== 'lead') {
      required.add(member.parent)
      member = plan.members.find(candidate => candidate.name === member?.parent)
    }
  }
  let created = 0
  const remaining = plan.members.filter(member => required.has(member.name))
  // Topological passes create a group's parent before its descendants.
  for (let pass = 0; pass < plan.members.length && created < controls.maxNew; pass++) {
    let changed = false
    for (const member of remaining) {
      controls.signal.throwIfAborted()
      if (controls.state().goal?.revision !== goal.revision) return
      if (controls.state().members.some(saved => saved.name === member.name)) continue
      const chain: SessionId[] = []
      let parentName = member.parent
      let available = true
      while (parentName !== 'lead') {
        const saved = controls.state().members.find(candidate => candidate.name === parentName)
        if (saved?.phase !== 'active') { available = false; break }
        chain.unshift(saved.id)
        parentName = plan.members.find(candidate => candidate.name === parentName)!.parent
      }
      if (!available) continue
      await withHostSubagentAncestors(controls.subagents, root, chain, controls.signal, parent => service.spawnTeammate(parent, {
        name: member.name, description: member.responsibility, teamFunction: member.function,
        persona: member.persona ?? member.responsibility, provider: controls.provider, context: 'fresh', signal: controls.signal,
        skills: member.skills.map(name => ({ name, purpose: member.responsibility.slice(0, 200).replace(/[\p{Cc}\p{Cf}]/gu, ' ') })),
        agentOptions: { provider: member.modelProvider, model: member.model, reasoningEffort: ReasoningEffortId(member.reasoningEffort) },
        prompt: [{ type: 'text', text: `Read the confirmed goal, current task board and your selected skills. You are ${member.name}. Retain this identity. Start project actions only after a task is assigned. Submit evidence for independent review; advisers only decide and review.` }],
      }))
      changed = true
      if (++created >= controls.maxNew) break
    }
    if (!changed) break
  }
  for (const task of ready) {
    controls.signal.throwIfAborted()
    const current = controls.state()
    if (current.goal?.revision !== goal.revision || current.goal.status !== 'active') return
    if (current.tasks.some(saved => saved.inputKey === task.id)) continue
    if (![task.owner, task.reviewer].every(name => current.members.some(saved => saved.name === name && saved.phase === 'active'))) continue
    const dependencies = task.dependencies.map(id => current.tasks.find(saved => saved.inputKey === id)!)
    const checks = await service.validateTaskHandoff(root, dependencies.map(dependency => dependency.id), controls.signal)
    for (const checked of checks) {
      if (!checked.validity.reusable || dependencies.find(dependency => dependency.id === checked.taskId)?.revision !== checked.revision) {
        throw new TeamError(`Downstream task ${task.id} is blocked by ${checked.taskId}: ${checked.validity.reasons.join(' ')} Retain accepted artifacts and inspect the changed input; do not repeat the execution.`, 'TEAM_TASK_EXECUTION_STALE')
      }
    }
    for (const dependency of dependencies) {
      const owner = current.members.find(member => member.id === dependency.ownerId)
      if (owner?.workspace !== undefined && dependency.work?.execution?.submission?.artifacts?.length) {
        if (service.listMembers(root).find(member => member.id === owner.id)?.status !== 'inactive') return
        await service.integrateWorkspace(root, owner.name, controls.signal)
      }
    }
    const owner = plan.members.find(member => member.name === task.owner)!
    await service.createTask(root, {
      inputKey: task.id, subject: task.description.slice(0, 200), description: task.description,
      blockedBy: dependencies.map(dependency => dependency.id), writeScopes: task.outputs,
      reviewer: task.reviewer, requiredSkill: owner.skills[0]!, autoAssign: true,
      plan: { inputVersion: `goal-${goal.revision}:${task.id}`, environmentVersion: `plan-v${plan.version}`,
        inputPaths: task.inputs, acceptanceCriteria: task.acceptanceCriteria,
        ...task.critical ? { adviserGate: 'dual' as const } : {} },
    }, controls.signal)
  }
}
