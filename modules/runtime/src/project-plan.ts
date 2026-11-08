/** Structured project plans stored with the user-reviewed goal. */
import { z } from 'zod'
import type { TeamState } from './projection.ts'

const text = z.string().trim().min(1)
const memberName = text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
const projectPath = text.refine(value => !/^(?:[a-z]:|\/|\\)/iu.test(value)
  && !value.replaceAll('\\', '/').split('/').some(part => part === '..' || part === '.' || part === ''), 'expected a project-relative file or directory path')
/** Complete roster, work graph, resource budget, and recovery plan. */
export const projectPlanSchema = z.object({
  format: z.literal('dsh-team-project-plan'),
  version: z.union([z.literal(1), z.literal(2)]),
  automation: z.object({ provision: z.enum(['manual', 'on-demand']), requirePlanningGate: z.boolean() }).strict().optional(),
  members: z.array(z.object({ name: memberName, parent: memberName,
    function: z.enum(['planning_adviser', 'quality_adviser', 'domain_adviser', 'group_lead', 'executor', 'verifier']),
    modelProvider: text, model: text, reasoningEffort: text,
    responsibility: text, skills: z.array(text).min(1),
    persona: text.optional(), instructions: text.optional(),
  }).strict()).min(1),
  tasks: z.array(z.object({ id: text, owner: text, reviewer: text, description: text,
    kind: z.enum(['plan', 'route', 'execution', 'key_result', 'delivery']),
    dependencies: z.array(text), inputs: z.array(projectPath), outputs: z.array(projectPath),
    exclusiveResources: z.array(text.regex(/^[a-z0-9][a-z0-9:._/-]*$/u)).optional(),
    acceptanceCriteria: z.array(text).min(1), critical: z.boolean(),
  }).strict()).min(1),
  resources: z.object({ maxMembers: z.number().int().positive(), maxConcurrentRequests: z.number().int().positive() }).strict(),
  reviewPolicy: z.literal('independent-and-dual-for-critical'),
  previousTasks: z.array(z.object({ id: text, action: z.enum(['retain_history', 'replan']), reason: text }).strict()),
  recovery: text,
}).strict().superRefine((plan, ctx) => {
  if (plan.version === 1 && plan.automation !== undefined || plan.version === 2 && plan.automation === undefined) {
    ctx.addIssue({ code: 'custom', message: 'automation is required only for version 2; version 1 retains manual provisioning' })
  }
  const names = new Set(plan.members.map(member => member.name))
  const ids = new Set(plan.tasks.map(task => task.id))
  if (names.size !== plan.members.length || names.has('lead') || ids.size !== plan.tasks.length) {
    ctx.addIssue({ code: 'custom', message: 'member and task names must be unique; lead is reserved' })
  }
  if (plan.members.length > plan.resources.maxMembers) ctx.addIssue({ code: 'custom', message: 'roster exceeds member budget' })
  for (const member of plan.members) {
    if (plan.version === 1 && (member.persona !== undefined || member.instructions !== undefined)) ctx.addIssue({ code: 'custom', message: 'member persona and instructions require plan version 2' })
    if (new Set(member.skills).size !== member.skills.length) ctx.addIssue({ code: 'custom', message: `duplicate skill for ${member.name}` })
    const visited = new Set([member.name])
    let parent = member.parent
    while (parent !== 'lead') {
      if (!names.has(parent) || visited.has(parent)) {
        ctx.addIssue({ code: 'custom', message: `invalid parent chain for ${member.name}` }); break
      }
      visited.add(parent)
      const ancestor = plan.members.find(candidate => candidate.name === parent)
      if (ancestor === undefined) break
      parent = ancestor.parent
    }
  }
  const completed = new Set<string>()
  const visit = (id: string, parents: Set<string>): void => {
    if (parents.has(id) || !ids.has(id)) { ctx.addIssue({ code: 'custom', message: `invalid dependency ${id}` }); return }
    if (completed.has(id)) return
    const task = plan.tasks.find(candidate => candidate.id === id)
    if (task === undefined) return
    for (const dependency of task.dependencies) visit(dependency, new Set([...parents, id]))
    completed.add(id)
  }
  for (const task of plan.tasks) {
    if (task.exclusiveResources !== undefined && (plan.version === 1
      || new Set(task.exclusiveResources).size !== task.exclusiveResources.length)) {
      ctx.addIssue({ code: 'custom', message: `exclusiveResources requires version 2 and distinct resource keys for ${task.id}` })
    }
    if (task.critical !== (task.kind !== 'execution')) ctx.addIssue({ code: 'custom', message: `critical must match task kind for ${task.id}` })
    if (!names.has(task.owner) || !names.has(task.reviewer) || task.owner === task.reviewer) {
      ctx.addIssue({ code: 'custom', message: `task ${task.id} needs different configured owner and reviewer` })
    }
    const owner = plan.members.find(member => member.name === task.owner)
    if (owner?.function.endsWith('_adviser')) ctx.addIssue({ code: 'custom', message: `adviser cannot execute ${task.id}` })
    if (plan.members.find(member => member.name === task.reviewer)?.function.endsWith('_adviser')) {
      ctx.addIssue({ code: 'custom', message: `task ${task.id} needs a separate verifier; advisers review the decision separately` })
    }
    if (new Set(task.dependencies).size !== task.dependencies.length || new Set(task.outputs).size !== task.outputs.length) {
      ctx.addIssue({ code: 'custom', message: `duplicate dependency or output in ${task.id}` })
    }
    visit(task.id, new Set())
  }
  if (plan.version === 2 && plan.automation?.requirePlanningGate) {
    const dependsOnPlan = (id: string, visited = new Set<string>()): boolean => {
      if (visited.has(id)) return false
      visited.add(id)
      const task = plan.tasks.find(candidate => candidate.id === id)
      return task !== undefined && (task.kind === 'plan' || task.dependencies.some(dependency => dependsOnPlan(dependency, visited)))
    }
    for (const task of plan.tasks) if (task.kind !== 'plan' && !dependsOnPlan(task.id)) {
      ctx.addIssue({ code: 'custom', message: `task ${task.id} must depend on a dual-reviewed plan task` })
    }
  }
  if (!plan.tasks.some(task => task.kind === 'delivery')) ctx.addIssue({ code: 'custom', message: 'project plan requires a final delivery task' })
  if (plan.tasks.some(task => task.critical)
    && (!plan.members.some(member => member.function === 'planning_adviser')
      || !plan.members.some(member => member.function === 'quality_adviser'))) {
    ctx.addIssue({ code: 'custom', message: 'critical tasks require both planning and quality advisers' })
  }
})

/**
 * Decode a project plan without interpreting legacy prose as an approved roster.
 * @param textValue - JSON saved in the goal plan field.
 * @returns validated plan, or undefined for a historical prose plan.
 */
export function readProjectPlan(textValue: string | undefined): z.infer<typeof projectPlanSchema> | undefined {
  if (textValue === undefined || !textValue.trim().startsWith('{')) return undefined
  let value: unknown
  try { value = JSON.parse(textValue) } catch (error: unknown) { if (error instanceof SyntaxError) return undefined; throw error }
  if (typeof value !== 'object' || value === null || !('format' in value) || value.format !== 'dsh-team-project-plan') return undefined
  return projectPlanSchema.parse(value)
}

/**
 * Check that every unfinished task has an explicit treatment in a replacement plan.
 * @param state - Current task history.
 * @param plan - Complete proposed plan.
 */
export function validateTaskTransition(state: TeamState, plan: z.infer<typeof projectPlanSchema>): void {
  if (plan.version === 2) {
    const collision = plan.tasks.find(planned => state.tasks.some(task => task.inputKey === planned.id && task.status !== 'deleted'))
    if (collision !== undefined) throw new Error(`task id ${collision.id} already belongs to an earlier goal; use a new versioned id and retain the previous evidence in history`)
  }
  const unfinished = state.tasks.filter(task => task.status === 'pending' || task.status === 'in_progress')
  const current = unfinished.filter(task => task.work === undefined || task.work.plan.goalRevision === (state.goal?.revision ?? 0))
  for (const task of current) if (!plan.previousTasks.some(item => item.id === task.id)) {
    throw new Error(`previousTasks must classify ${task.id} as retain_history or replan; earlier effects and evidence remain in history`)
  }
  if (new Set(plan.previousTasks.map(item => item.id)).size !== plan.previousTasks.length
    || plan.previousTasks.some(item => !unfinished.some(task => task.id === item.id))) {
    throw new Error('previousTasks must contain each unfinished task exactly once and no unknown task')
  }
}
