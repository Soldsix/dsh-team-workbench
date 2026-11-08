import { describe, expect, it } from 'vitest'
import { emptyTeamState } from '../src/projection.ts'
import { SessionId } from '@deepseek-ai/dsh-session'
import { TeamTaskId } from '../src/types.ts'
import { projectPlanSchema, readProjectPlan, validateTaskTransition } from '../src/project-plan.ts'

function plan() {
  const member = { parent: 'lead', modelProvider: 'configured', model: 'flash', reasoningEffort: 'max',
    responsibility: 'Fixture responsibility', skills: ['team-code-development'] }
  return { format: 'dsh-team-project-plan', version: 1, members: [
    { ...member, name: 'planner', function: 'planning_adviser' },
    { ...member, name: 'quality', function: 'quality_adviser' },
    { ...member, name: 'worker', function: 'executor' },
    { ...member, name: 'verifier', function: 'verifier' },
  ], tasks: [{ id: 'fixture-v1', owner: 'worker', reviewer: 'verifier', description: 'Check fixture',
    kind: 'delivery', dependencies: [] as string[], inputs: ['input.txt'], outputs: ['result.txt'], acceptanceCriteria: ['Observed fixture result'], critical: true }],
  resources: { maxMembers: 8, maxConcurrentRequests: 4 }, reviewPolicy: 'independent-and-dual-for-critical',
  previousTasks: [], recovery: 'Resume original execution after checking receipts' }
}

describe('user-reviewable project plans', () => {
  it('keeps legacy plans manual and requires a review dependency for automated execution', () => {
    const original = plan()
    expect(projectPlanSchema.safeParse({ ...original, automation: { provision: 'on-demand', requirePlanningGate: true } }).success).toBe(false)
    const next = { ...original, version: 2, automation: { provision: 'on-demand', requirePlanningGate: true } }
    expect(projectPlanSchema.safeParse(next).success).toBe(false)
    next.tasks.unshift({ ...next.tasks[0]!, id: 'planning', kind: 'plan', dependencies: [], outputs: [] })
    next.tasks[1]!.dependencies = ['planning']
    expect(projectPlanSchema.safeParse(next).success).toBe(true)
    next.tasks[0]!.dependencies = ['fixture-v1']
    expect(projectPlanSchema.safeParse(next).success).toBe(false)
  })
  it('preserves prose history while refusing it as a structured roster', () => {
    expect(readProjectPlan('Read the file and finish.')).toBeUndefined()
    expect(readProjectPlan('{"overview":"legacy plan"}')).toBeUndefined()
    expect(readProjectPlan('{legacy notes')).toBeUndefined()
    expect(readProjectPlan(JSON.stringify(plan()))?.members).toHaveLength(4)
  })
  it('rejects self-review, unconfigured task members and execution by an adviser', () => {
    const p = plan()
    p.tasks[0]!.reviewer = 'worker'
    expect(projectPlanSchema.safeParse(p).success).toBe(false)
    p.tasks[0]!.reviewer = 'missing'
    expect(projectPlanSchema.safeParse(p).success).toBe(false)
    p.tasks[0]!.reviewer = 'verifier'; p.tasks[0]!.owner = 'planner'
    expect(projectPlanSchema.safeParse(p).success).toBe(false)
  })
  it('rejects missing dual review and cyclic member/task graphs before confirmation', () => {
    const p = plan()
    p.members = p.members.filter(member => member.name !== 'quality')
    expect(projectPlanSchema.safeParse(p).success).toBe(false)
    const cycle = plan()
    cycle.members[0]!.parent = 'worker'; cycle.members[2]!.parent = 'planner'
    expect(projectPlanSchema.safeParse(cycle).success).toBe(false)
    const graph = plan()
    graph.tasks[0]!.dependencies.push('fixture-v1')
    expect(projectPlanSchema.safeParse(graph).success).toBe(false)
  })
  it('requires a named treatment for old unfinished tasks without granting them new authority', () => {
    const state = { ...emptyTeamState(SessionId('lead')), tasks: [{ id: TeamTaskId('task-1'), revision: 1,
      subject: 'Old work', description: 'Retain evidence', status: 'pending' as const, blockedBy: [], writeScopes: [] }] }
    const parsed = projectPlanSchema.parse(plan())
    expect(() => validateTaskTransition(state, parsed)).toThrow('task-1')
    parsed.previousTasks.push({ id: 'task-1', action: 'retain_history', reason: 'Replaced goal' })
    expect(() => validateTaskTransition(state, parsed)).not.toThrow()
    expect(state.tasks[0]!.status).toBe('pending')
  })
  it('rejects reused automatic task ids before confirmation instead of silently skipping the replacement goal', () => {
    const state = { ...emptyTeamState(SessionId('lead')), tasks: [{ id: TeamTaskId('task-1'), revision: 1,
      inputKey: 'fixture-v1', subject: 'Earlier result', description: 'Retain evidence', status: 'completed' as const,
      blockedBy: [], writeScopes: [] }] }
    const next = projectPlanSchema.parse({ ...plan(), version: 2, automation: { provision: 'on-demand', requirePlanningGate: false } })
    expect(() => validateTaskTransition(state, next)).toThrow('new versioned id')
    next.tasks[0]!.id = 'fixture-v2'
    expect(() => validateTaskTransition(state, next)).not.toThrow()
  })
})
