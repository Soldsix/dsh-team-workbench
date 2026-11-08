/** Shared Team task DAG commands and runtime-enriched views. */

import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ToolCallId } from '@deepseek-ai/dsh-llm'
import { createHash } from 'node:crypto'
import { assertNever } from '@deepseek-ai/dsh-util-values'
import type { TeamMembership, TeamRoster } from './roster.ts'
import type { TeamGoals } from './goals.ts'
import { TeamError } from './error.ts'
import type { TeamJournal } from './journal.ts'
import type { TeamState } from './projection.ts'
import { resolveActiveMember } from './roster.ts'
import { assertTaskGraphCandidate, TeamTaskGraphError } from './task-graph.ts'
import type { TeamTaskGraphViolation } from './task-graph.ts'
import { TeamId, TeamTaskId } from './types.ts'
import type {
  CreateTeamTaskRequest,
  TeamTaskSnapshot,
  TeamTaskView,
  UpdateTeamTaskRequest,
} from './types.ts'
import { projectTaskView, scopesOverlap, taskReady } from './task-view.ts'
import { pendingTask, planTaskWork, updateTaskWork } from './task-work-update.ts'
import { taskWorkSchema } from './task-work.ts'
import { taskRecordValidity, taskWorkChanges } from './task-work.ts'
import { observeTaskEnvironment, observeTaskFiles } from './task-receipts.ts'
import type { TeamFileReceipt, TeamTaskPlanInput, TeamTaskReuseCheck } from './task-work-types.ts'
import type { TeamTaskEffectEvent, TeamTaskExecutionId } from './task-work-types.ts'
import { taskEffectsNeedReview, taskToolNeedsEffectTracking } from './task-effects.ts'
import { requiredText, writeScope } from './validation.ts'
import { hasDualAdviserApproval } from './advisers.ts'
import { memberFunction } from './member-role.ts'
import { readProjectPlan } from './project-plan.ts'
import { resourceConflicts } from './resource-scheduling.ts'
import type { TeamArtifactStore } from './artifact-store.ts'
import { selectPublicationArtifacts } from './publication.ts'

const TASK_GRAPH_ERROR_CODES: Record<TeamTaskGraphViolation, string> = {
  missing: 'TEAM_TASK_NOT_FOUND',
  duplicate: 'TEAM_INVALID_ARGUMENT',
  cycle: 'TEAM_TASK_DEPENDENCY_CYCLE',
}

/** Fixed dispatch identity retained across cancellation and task replacement. */
export interface TeamTaskEffectToken {
  readonly root: Agent
  readonly teamId: TeamId
  readonly taskId: TeamTaskId
  readonly executionId: TeamTaskExecutionId
  readonly callId: ToolCallId
  readonly toolName: string
}

/** Owns Team task limits, authorization, transitions, and derived views. */
export class TeamTaskBoard {
  private readonly inFlightEffects = new Set<TeamTaskEffectToken>()
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
  constructor(
    private readonly journal: TeamJournal,
    private readonly roster: TeamRoster,
    private readonly goals: TeamGoals,
    private readonly maxTasks: number,
    private readonly deduplicateInputs: boolean,
    private readonly requireResults: boolean,
    private readonly requirePlans: boolean,
    private readonly maxWorkBytes: number,
    private readonly maxReceiptPaths: number,
    private readonly maxReceiptBytes: number,
    private readonly autoDispatchReadyTasks = false,
    private readonly enforceWriteScopeExclusivity = false,
    private readonly autoAssignReadyTasks = false,
    private readonly artifacts?: TeamArtifactStore,
  ) {}

  /**
   * Persist an opaque tool start before dispatch under its exact running attempt.
   * @param caller - member dispatching the tool.
   * @param callId - tool-call identity from the model step.
   * @param toolName - dispatched tool name.
   * @param signal - cancellation before dispatch starts.
   * @param args - Logged tool JSON for read-only workspace action classification.
   * @returns fixed identity for the matching settlement, or undefined outside task execution.
   */
  async recordToolEffect(
    caller: Agent, callId: ToolCallId, toolName: string, signal: AbortSignal, args?: unknown,
  ): Promise<TeamTaskEffectToken | undefined> {
    if (!taskToolNeedsEffectTracking(toolName, args)) return undefined
    const membership = this.roster.tryMembership(caller)
    if (membership === undefined) return undefined
    const root = membership.root
    return await this.journal.transact(root.id, async () => {
      signal.throwIfAborted()
      if (this.roster.membership(caller).root !== root) throw new TeamError('tool caller changed Teams', 'TEAM_NOT_MEMBER')
      const state = this.journal.state(root)
      const matching = state.tasks.filter(value => value.status === 'in_progress' && value.work?.execution?.phase === 'running'
        && value.work.execution.ownerId === caller.id)
      if (matching.length > 1) throw new TeamError('member has multiple running task executions', 'TEAM_TASK_MEMBER_BUSY')
      const task = matching[0]
      const executionId = task?.work?.execution?.id
      if (task === undefined || executionId === undefined) return undefined
      const token = { root, teamId: TeamId(root.id), taskId: task.id, executionId, callId, toolName }
      const event: TeamTaskEffectEvent = { version: 2, teamId: token.teamId, taskId: token.taskId,
        executionId: token.executionId, callId: token.callId, toolName: token.toolName, phase: 'started' }
      await this.journal.appendAndFlush(root, 'team/task-effect', event)
      this.inFlightEffects.add(token)
      return token
    })
  }

  /**
   * Persist tool settlement against the original attempt even if its task was replaced.
   * @param token - identity returned before dispatch.
   */
  async settleToolEffect(token: TeamTaskEffectToken): Promise<void> {
    try {
      await this.journal.transact(token.root.id, async () => {
        const prior = this.journal.state(token.root).taskEffects?.find(value =>
          value.executionId === token.executionId && value.callId === token.callId && value.taskId === token.taskId)
        if (prior?.phase !== 'started') throw new TeamError('task tool effect start is missing', 'TEAM_TASK_EXECUTION_STALE')
        const event: TeamTaskEffectEvent = { version: 2, teamId: token.teamId, taskId: token.taskId,
          executionId: token.executionId, callId: token.callId, toolName: token.toolName, phase: 'settled' }
        await this.journal.appendAndFlush(token.root, 'team/task-effect', event)
      })
    } finally {
      this.inFlightEffects.delete(token)
    }
  }

  /** Observe declared inputs under the caller's current workspace. */
  private async observePlan(caller: Agent, plan: TeamTaskPlanInput, signal: AbortSignal) {
    const cwd = caller.session.header.cwd
    if (cwd === undefined) {
      if (this.requirePlans || (plan.inputPaths?.length ?? 0) > 0) {
        throw new TeamError('task file receipts require a Session workspace', 'TEAM_TASK_PLAN_INVALID')
      }
      return undefined
    }
    const environment = await observeTaskEnvironment(cwd)
    const inputs = await observeTaskFiles(environment, plan.inputPaths ?? [], this.maxReceiptPaths, this.maxReceiptBytes, signal)
    signal.throwIfAborted()
    return { inputs, environment }
  }

  /** Observe artifacts under the exact member workspace that produced them. */
  private async observeSubmission(caller: Agent, paths: readonly string[], signal: AbortSignal) {
    const cwd = caller.session.header.cwd
    if (cwd === undefined) {
      if (this.requirePlans || paths.length > 0) {
        throw new TeamError('task artifact receipts require a Session workspace', 'TEAM_TASK_WORK_INVALID')
      }
      return undefined
    }
    const environment = await observeTaskEnvironment(cwd)
    const artifacts = await observeTaskFiles(environment, paths, this.maxReceiptPaths, this.maxReceiptBytes, signal)
    await this.artifacts?.capture(environment, artifacts, signal)
    signal.throwIfAborted()
    return { artifacts, environment }
  }

  /** Bind the request before queueing and recheck its exact caller before any append. */
  private async write<T>(
    caller: Agent, signal: AbortSignal, operation: (membership: TeamMembership, admitted: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const membership = this.roster.membership(caller)
    const { root } = membership
    const admitted = membership.role === 'lead' && this.journal.state(root).goal === undefined
      ? this.goals.capture(root, signal) : this.goals.admit(root, signal)
    admitted.throwIfAborted()
    return await this.journal.transact(root.id, async () => {
      admitted.throwIfAborted()
      const current = this.roster.membership(caller)
      if (current.root !== root) throw new TeamError('the calling Agent changed Teams while its write was queued', 'TEAM_NOT_MEMBER')
      return await operation(current, admitted)
    })
  }

  /**
   * Create one unowned pending task in the Team Lead log.
   * @param request - task text, blockers, and advisory write scopes.
   * @param caller - exact live member whose identity is retained as the planner.
   * @param signal - caller cancellation before append; an appended event finishes its checkpoint.
   * @returns the revision-one task view.
   */
  async create(caller: Agent, request: CreateTeamTaskRequest, signal: AbortSignal): Promise<TeamTaskView> {
    return await this.write(caller, signal, async ({ root }, admitted) => {
      const state = this.journal.state(root)
      const subject = requiredText(request.subject, 'subject', 200)
      const project = readProjectPlan(state.goal?.definition.plan)
      const planned = project?.tasks.find(task => task.id === request.inputKey)
      if (project !== undefined && planned === undefined) {
        throw new TeamError('input_key must identify a task in the confirmed project plan; review new work before creating it', 'TEAM_TASK_PLAN_REQUIRED')
      }
      if (planned?.critical && request.plan !== undefined && request.plan.adviserGate !== 'dual') {
        request = { ...request, plan: { ...request.plan, adviserGate: 'dual' } }
      }
      if (planned !== undefined) {
        if (request.reviewer !== undefined && request.reviewer !== planned.reviewer) {
          throw new TeamError('reviewer must match the confirmed project task', 'TEAM_TASK_PLAN_INVALID')
        }
        const expected = planned.dependencies.map(id => state.tasks.find(task => task.inputKey === id)?.id)
        if (expected.some(id => id === undefined)
          || JSON.stringify([...expected].sort()) !== JSON.stringify([...(request.blockedBy ?? [])].sort())
          || JSON.stringify(request.plan?.acceptanceCriteria) !== JSON.stringify(planned.acceptanceCriteria)
          || JSON.stringify([...(request.writeScopes ?? [])].sort()) !== JSON.stringify([...planned.outputs].sort())
          || JSON.stringify([...(request.plan?.inputPaths ?? [])].sort()) !== JSON.stringify([...planned.inputs].sort())) {
          throw new TeamError('task dependencies, input paths, output scopes and acceptance criteria must match the confirmed project task; create dependencies first', 'TEAM_TASK_PLAN_INVALID')
        }
      }
      const description = requiredText(request.description, 'description', 16_384)
      const blockedBy = this.dependencies(request.blockedBy ?? [], state)
      const writeScopes = this.writeScopes(request.writeScopes ?? [])
      const requiredSkill = request.requiredSkill === undefined ? undefined
        : requiredText(request.requiredSkill, 'required_skill', 200)
      if (requiredSkill !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(requiredSkill)) {
        throw new TeamError('required_skill must be an installed kebab-case skill name', 'TEAM_INVALID_ARGUMENT')
      }
      const autoAssign = request.autoAssign ?? this.autoAssignReadyTasks
      const reviewerId = request.reviewer === undefined ? undefined
        : resolveActiveMember(root, state, requiredText(request.reviewer, 'reviewer', 200)).id
      const work = request.plan === undefined ? undefined : planTaskWork(state, request.plan, caller.id, undefined,
        await this.observePlan(caller, request.plan, admitted))
      const inputKey = request.inputKey === undefined
        ? this.deduplicateInputs
          ? createHash('sha256').update(JSON.stringify([subject, description, [...blockedBy].sort(), [...writeScopes].sort(),
            ...work === undefined ? [] : [work.plan.inputVersion, work.plan.environmentVersion, work.plan.acceptanceCriteria,
              work.plan.adviserGate, work.plan.goalRevision, work.plan.inputs, work.plan.environment]])).digest('hex')
          : undefined
        : requiredText(request.inputKey, 'input_key', 256)
      const existing = inputKey === undefined ? undefined : state.tasks.find(task => task.inputKey === inputKey && task.status !== 'deleted')
      if (existing !== undefined) {
        if (existing.subject !== subject || existing.description !== description
          || JSON.stringify([...existing.blockedBy].sort()) !== JSON.stringify([...blockedBy].sort())
          || JSON.stringify([...existing.writeScopes].sort()) !== JSON.stringify([...writeScopes].sort())
          || existing.reviewerId !== reviewerId
          || existing.requiredSkill !== requiredSkill || (existing.autoAssign === true) !== autoAssign
          || existing.work?.plan.inputVersion !== work?.plan.inputVersion
          || existing.work?.plan.environmentVersion !== work?.plan.environmentVersion
          || existing.work?.plan.adviserGate !== work?.plan.adviserGate
          || JSON.stringify(existing.work?.plan.inputs) !== JSON.stringify(work?.plan.inputs)
          || JSON.stringify(existing.work?.plan.environment) !== JSON.stringify(work?.plan.environment)
          || existing.work?.plan.goalRevision !== work?.plan.goalRevision
          || JSON.stringify(existing.work?.plan.acceptanceCriteria) !== JSON.stringify(work?.plan.acceptanceCriteria)) {
          throw new TeamError('input_key already identifies different task inputs; use a new input version', 'TEAM_TASK_INPUT_CONFLICT')
        }
        if (existing.status === 'completed') {
          if (existing.work === undefined) return projectTaskView(state, existing)
          const checked = await this.validateReuse(caller, existing.id, admitted)
          if (!checked.validity.reusable) throw new TeamError(checked.validity.reasons.join(' '), 'TEAM_TASK_EXECUTION_STALE')
          return { ...projectTaskView(state, existing), validity: checked.validity }
        }
        return projectTaskView(state, existing)
      }
      if (this.deduplicateInputs && request.inputKey === undefined) {
        const duplicate = state.tasks.find(task => task.status !== 'deleted' && task.subject === subject
          && JSON.stringify([...task.blockedBy].sort()) === JSON.stringify([...blockedBy].sort())
          && JSON.stringify([...task.writeScopes].sort()) === JSON.stringify([...writeScopes].sort())
          && task.work?.plan.inputVersion === work?.plan.inputVersion
          && task.work?.plan.environmentVersion === work?.plan.environmentVersion
          && task.work?.plan.goalRevision === work?.plan.goalRevision)
        if (duplicate !== undefined) {
          throw new TeamError(`task ${duplicate.id} already covers this subject and input version; inspect it or supply a distinct input_key for changed requirements`, 'TEAM_TASK_INPUT_CONFLICT')
        }
      }
      const active = state.tasks.filter(task => (task.status === 'pending' || task.status === 'in_progress')
        && (task.work === undefined || task.work.plan.goalRevision === (state.goal?.revision ?? 0))).length
      if (active >= this.maxTasks) {
        throw new TeamError(`Team task limit ${this.maxTasks} reached`, 'TEAM_TASK_LIMIT')
      }
      const id = TeamTaskId(`task-${state.nextTaskNumber}`)
      if (state.tasks.some(task => task.id === id)) {
        throw new TeamError('Team task id space exhausted', 'TEAM_TASK_LIMIT')
      }
      const task: TeamTaskSnapshot = {
        id,
        revision: 1,
        subject,
        description,
        status: 'pending',
        ...this.autoDispatchReadyTasks ? { autoDispatch: true } : {},
        blockedBy,
        writeScopes,
        ...autoAssign ? { autoAssign: true } : {},
        ...requiredSkill === undefined ? {} : { requiredSkill },
        ...reviewerId === undefined ? {} : { reviewerId },
        ...inputKey === undefined ? {} : { inputKey },
        ...work === undefined ? {} : { work },
      }
      this.validateWork(task)
      this.assertTaskGraph(state, task)
      if (work?.plan.environment !== undefined) await this.artifacts?.capture(work.plan.environment, work.plan.inputs ?? [], admitted)
      admitted.throwIfAborted()
      if (this.roster.membership(caller).root !== root) throw new TeamError('task caller changed Teams during file observation', 'TEAM_NOT_MEMBER')
      await this.journal.appendAndFlush(root, 'team/task', { version: 2, teamId: TeamId(root.id), task })
      return projectTaskView(state, task)
    })
  }

  /**
   * Return one task, including a deleted tombstone.
   * @param membership - exact caller membership resolved by the Team roster.
   * @param id - Team-local task identity.
   * @returns the latest task value and derived readiness diagnostics.
   */
  get(membership: TeamMembership, id: TeamTaskId): TeamTaskView {
    const { root } = membership
    const state = this.journal.state(root)
    const task = state.tasks.find(candidate => candidate.id === id)
    if (task === undefined) throw new TeamError(`team task "${id}" not found`, 'TEAM_TASK_NOT_FOUND')
    return this.withRecovery(membership, state, task)
  }

  /**
   * List current pending and in-progress tasks in numeric creation order.
   * @param membership - exact caller membership resolved by the Team roster.
   * @returns detached current task views.
   */
  list(membership: TeamMembership): TeamTaskView[] {
    const { root } = membership
    const state = this.journal.state(root)
    return state.tasks
      .filter(task => (task.status === 'pending' || task.status === 'in_progress')
        && (task.work === undefined || task.work.plan.goalRevision === (state.goal?.revision ?? 0)))
      .map(task => this.withRecovery(membership, state, task))
  }

  /** Add current member activity without changing the durable task or its revision. */
  private withRecovery(membership: TeamMembership, state: TeamState, task: TeamTaskSnapshot): TeamTaskView {
    const view = projectTaskView(state, task)
    if (task.status !== 'in_progress' || task.ownerId === undefined) return view
    const owner = this.roster.list(membership).find(member => member.id === task.ownerId)
    if (owner?.status !== 'inactive') return view
    const execution = task.work?.execution
    const action = taskEffectsNeedReview(state, task) ? 'reconcile'
      : execution?.phase === 'submitted' ? 'review'
        : execution?.phase === 'running' && taskWorkChanges(state, task).length === 0 ? 'resume' : 'inspect'
    return { ...view, recovery: { reason: 'owner_inactive', action } }
  }

  /**
   * List completed tasks in stable creation order, one bounded page at a time.
   * @param membership - exact caller membership resolved by the Team roster.
   * @param request - exclusive creation cursor and requested page size, at most 50.
   * @returns completed task views and a cursor when another page exists.
   */
  listArchive(membership: TeamMembership, request: { after?: TeamTaskId; limit: number }): {
    tasks: TeamTaskView[]
    nextCursor?: TeamTaskId
  } {
    if (!Number.isSafeInteger(request.limit) || request.limit < 1 || request.limit > 50) {
      throw new TeamError('archive page limit must be 1 through 50', 'TEAM_INVALID_ARGUMENT')
    }
    const state = this.journal.state(membership.root)
    const start = request.after === undefined ? 0 : state.tasks.findIndex(task => task.id === request.after) + 1
    if (request.after !== undefined && start === 0) throw new TeamError('archive cursor task not found', 'TEAM_TASK_NOT_FOUND')
    const page = state.tasks.slice(start).filter(task => task.status === 'completed'
      || task.work !== undefined && task.work.plan.goalRevision !== (state.goal?.revision ?? 0)).slice(0, request.limit + 1)
    const tasks = page.slice(0, request.limit).map(task => projectTaskView(state, task))
    const last = tasks.at(-1)
    return { tasks, ...page.length > request.limit && last !== undefined ? { nextCursor: last.id } : {} }
  }

  /**
   * Re-observe a completed result's files and local runtime before a caller reuses it.
   * @param caller - current Team member requesting reuse.
   * @param id - completed task identity.
   * @param signal - cancellation for bounded file reads.
   * @returns current receipts and a validity decision scoped to the observed task revision.
   */
  async validateReuse(caller: Agent, id: TeamTaskId, signal: AbortSignal): Promise<TeamTaskReuseCheck> {
    return await this.validateReuseWithDependencies(caller, id, signal, new Map(), new Map())
  }

  /**
   * Validate explicit accepted inputs for a downstream task, including their expected published updates.
   * @param caller - Exact live member requesting the handoff.
   * @param ids - Declared prerequisite task identities, or the final delivery task.
   * @param signal - Cancellation during file and dependency checks.
   * @returns one check per requested task; unrelated changes remain invalid.
   */
  async validateHandoff(caller: Agent, ids: readonly TeamTaskId[], signal: AbortSignal): Promise<TeamTaskReuseCheck[]> {
    const state = this.journal.state(this.roster.membership(caller).root)
    const included = new Set<TeamTaskId>()
    const visit = (id: TeamTaskId): void => {
      if (included.has(id)) return
      included.add(id)
      for (const dependency of state.tasks.find(task => task.id === id)?.blockedBy ?? []) visit(dependency)
    }
    for (const id of ids) visit(id)
    const nodes = state.tasks.map(task => ({ id: task.id, dependencies: task.blockedBy,
      artifacts: included.has(task.id) && taskRecordValidity(state, task).reusable
        ? task.work?.execution?.submission?.artifacts ?? [] : [] }))
    selectPublicationArtifacts(nodes)
    const replacements = new Map<string, TeamFileReceipt[]>()
    for (const receipt of nodes.flatMap(node => node.artifacts)) {
      const versions = replacements.get(receipt.path) ?? []
      versions.push(receipt)
      replacements.set(receipt.path, versions)
    }
    const checked = new Map<TeamTaskId, TeamTaskReuseCheck>()
    const results: TeamTaskReuseCheck[] = []
    for (const id of ids) results.push(await this.validateReuseWithDependencies(caller, id, signal, checked, replacements))
    return results
  }

  /** Recheck each accepted dependency once under the same cancellation signal. */
  private async validateReuseWithDependencies(
    caller: Agent, id: TeamTaskId, signal: AbortSignal, checked: Map<TeamTaskId, TeamTaskReuseCheck>,
    replacements: ReadonlyMap<string, readonly TeamFileReceipt[]>,
  ): Promise<TeamTaskReuseCheck> {
    const prior = checked.get(id)
    if (prior !== undefined) return prior
    const membership = this.roster.membership(caller)
    const state = this.journal.state(membership.root)
    const task = state.tasks.find(candidate => candidate.id === id)
    if (task === undefined) throw new TeamError(`team task "${id}" not found`, 'TEAM_TASK_NOT_FOUND')
    const recorded = structuredClone(task)
    const reasons = [...taskRecordValidity(state, task).reasons]
    let inputs: Awaited<ReturnType<typeof observeTaskFiles>> = []
    let artifacts: Awaited<ReturnType<typeof observeTaskFiles>> = []
    let environment: Awaited<ReturnType<typeof observeTaskEnvironment>> | undefined
    let artifactEnvironment: Awaited<ReturnType<typeof observeTaskEnvironment>> | undefined
    if (recorded.work?.plan.environment !== undefined) {
      try {
        environment = await observeTaskEnvironment(recorded.work.plan.environment.workspaceRoot)
        inputs = await observeTaskFiles(environment, recorded.work.plan.inputPaths ?? [],
          this.maxReceiptPaths, this.maxReceiptBytes, signal)
      } catch (error: unknown) {
        if (signal.aborted) throw error
        reasons.push(`Input recheck failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    const submitted = recorded.work?.execution?.submission
    if (submitted?.environment !== undefined) {
      try {
        if (this.artifacts === undefined) {
          artifactEnvironment = await observeTaskEnvironment(submitted.environment.workspaceRoot)
          artifacts = await observeTaskFiles(artifactEnvironment, submitted.artifacts?.map(item => item.path) ?? [],
            this.maxReceiptPaths, this.maxReceiptBytes, signal)
        } else {
          artifactEnvironment = { ...submitted.environment, platform: process.platform, arch: process.arch, nodeVersion: process.version }
          artifacts = await this.artifacts.verify(artifactEnvironment, submitted.artifacts ?? [], this.maxReceiptPaths, this.maxReceiptBytes, signal)
        }
      } catch (error: unknown) {
        if (signal.aborted) throw error
        reasons.push(`Artifact recheck failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    signal.throwIfAborted()
    if (JSON.stringify(environment) !== JSON.stringify(recorded.work?.plan.environment)) reasons.push('Input runtime changed.')
    if (JSON.stringify(artifactEnvironment) !== JSON.stringify(submitted?.environment)) reasons.push('Artifact runtime changed.')
    const expectedInputs = recorded.work?.plan.inputs
    if (expectedInputs === undefined || inputs.length !== expectedInputs.length || inputs.some((input, index) => {
      const expected = expectedInputs[index]
      const published = replacements.get(input.path) ?? []
      return ![expected, ...published].some(candidate => candidate?.path === input.path
        && candidate.bytes === input.bytes && candidate.sha256 === input.sha256)
    })) reasons.push('Task inputs changed.')
    if (JSON.stringify(artifacts) !== JSON.stringify(submitted?.artifacts)) reasons.push('Task artifacts changed.')
    for (const dependency of recorded.work?.execution?.dependencies ?? []) {
      const dependencyCheck = await this.validateReuseWithDependencies(caller, dependency.taskId, signal, checked, replacements)
      if (!dependencyCheck.validity.reusable || dependencyCheck.revision !== dependency.revision) {
        reasons.push(`Dependency ${dependency.taskId} has no current reusable result.`)
      }
    }
    const currentState = this.journal.state(membership.root)
    const current = currentState.tasks.find(candidate => candidate.id === id)
    if (current?.revision !== recorded.revision) reasons.push('Task changed during recheck.')
    else reasons.push(...taskRecordValidity(currentState, current).reasons)
    if (this.roster.membership(caller).root !== membership.root) reasons.push('Task caller changed Teams during recheck.')
    const result: TeamTaskReuseCheck = { taskId: id, revision: recorded.revision, checkedAt: Date.now(),
      validity: { reusable: reasons.length === 0, reasons: [...new Set(reasons)] }, inputs, artifacts,
      ...environment === undefined ? {} : { environment },
      ...artifactEnvironment === undefined ? {} : { artifactEnvironment },
    }
    checked.set(id, result)
    return result
  }

  /**
   * Compare-and-set one authorized task transition.
   * @param caller - exact live Team member authorizing the mutation.
   * @param request - task identity, expected revision, action, and action fields.
   * @param signal - caller cancellation before append; an appended event finishes its checkpoint.
   * @returns the committed next task revision.
   */
  async update(
    caller: Agent,
    request: UpdateTeamTaskRequest,
    signal: AbortSignal,
  ): Promise<TeamTaskView> {
    return await this.write(caller, signal, async (membership, admitted) => {
      const root = membership.root
      const state = this.journal.state(root)
      const current = state.tasks.find(task => task.id === request.taskId)
      if (current === undefined) throw new TeamError(`team task "${request.taskId}" not found`, 'TEAM_TASK_NOT_FOUND')
      if (current.revision !== request.expectedRevision) {
        throw new TeamError(
          `stale team task "${current.id}" revision ${request.expectedRevision}; current revision is ${current.revision}. `
          + `Read team_task_get({"task_id":"${current.id}"}) and verify the current execution before retrying. `
          + `Current execution: ${current.work?.execution?.id ?? 'none'}; phase: ${current.work?.execution?.phase ?? current.status}.`,
          'TEAM_TASK_STALE_REVISION',
        )
      }
      if (current.status === 'deleted') throw new TeamError(`team task "${current.id}" is deleted`, 'TEAM_TASK_DELETED')
      if (request.action === 'reconcile') {
        for (const token of this.inFlightEffects) {
          if (token.root === root && token.taskId === current.id && token.executionId === current.work?.execution?.id) {
            throw new TeamError('wait for running tools to settle before reviewing their effects', 'TEAM_TASK_EFFECT_REVIEW_REQUIRED')
          }
        }
      }
      const lead = membership.role === 'lead'
      const projectTask = readProjectPlan(state.goal?.definition.plan)?.tasks.find(task => task.id === current.inputKey)
      if (projectTask !== undefined && (request.action === 'reassign' && request.owner?.trim() && request.owner !== projectTask.owner
        || request.action === 'claim' && membership.name !== projectTask.owner
        || request.action === 'configure_review' && request.reviewer !== projectTask.reviewer)) {
        throw new TeamError('owner and reviewer must match the confirmed project task', 'TEAM_TASK_UNAUTHORIZED')
      }
      if (request.action === 'plan' && projectTask !== undefined
        && (JSON.stringify(request.plan?.acceptanceCriteria) !== JSON.stringify(projectTask.acceptanceCriteria)
          || projectTask.critical && request.plan?.adviserGate !== 'dual'
          || JSON.stringify([...(request.plan?.inputPaths ?? [])].sort()) !== JSON.stringify([...projectTask.inputs].sort()))) {
        throw new TeamError('revised task plan must retain the confirmed criteria and critical review policy; review project changes first', 'TEAM_TASK_PLAN_INVALID')
      }
      if (projectTask !== undefined && (request.writeScopes !== undefined
        && JSON.stringify([...request.writeScopes].sort()) !== JSON.stringify([...projectTask.outputs].sort())
        || request.blockedBy !== undefined && JSON.stringify([...request.blockedBy].sort()) !== JSON.stringify(
          projectTask.dependencies.map(id => state.tasks.find(task => task.inputKey === id)?.id).sort()))) {
        throw new TeamError('outputs and dependencies must retain the confirmed project plan; review project changes first', 'TEAM_TASK_PLAN_INVALID')
      }
      const requestedOwner = request.action === 'claim' ? caller.id : request.action === 'reassign' && request.owner?.trim()
        ? resolveActiveMember(root, state, request.owner).id : undefined
      if (requestedOwner !== undefined && memberFunction(state, state.members.find(member => member.id === requestedOwner))?.endsWith('_adviser')) {
        throw new TeamError('advisers cannot own execution tasks; assign an executor or verifier', 'TEAM_TASK_UNAUTHORIZED')
      }
      if (request.reviewer !== undefined && request.action !== 'configure_review') {
        throw new TeamError('reviewer requires action configure_review', 'TEAM_INVALID_ARGUMENT')
      }
      if (current.work !== undefined && (request.action === 'claim' || request.action === 'reassign' && request.owner?.trim())) {
        for (const checked of await this.validateHandoff(caller, current.blockedBy, admitted)) {
          if (!checked.validity.reusable) throw new TeamError(`dependency ${checked.taskId}: ${checked.validity.reasons.join(' ')}`, 'TEAM_TASK_BLOCKED')
        }
      }
      const owner = current.ownerId === caller.id
      if (request.action === 'review' && request.reviewDecision === 'accepted'
        && current.work?.plan.adviserGate === 'dual') {
        if (!hasDualAdviserApproval(state, current)) {
          throw new TeamError('key result requires separate planning and quality adviser approvals on this submitted execution',
            'TEAM_ADVISER_QUORUM_REQUIRED')
        }
      }
      const authorizeOwner = (): void => {
        if (!lead && !owner) throw new TeamError('task mutation requires its owner or Team Lead', 'TEAM_TASK_UNAUTHORIZED')
      }
      let next: TeamTaskSnapshot
      if (current.work === undefined && this.requirePlans
        && (request.action === 'claim' || request.action === 'reassign' && request.owner?.trim())) {
        throw new TeamError('record a versioned task plan before starting work', 'TEAM_TASK_PLAN_REQUIRED')
      }
      const definition = request.action === 'plan' ? {
        ...current,
        ...request.subject === undefined ? {} : { subject: requiredText(request.subject, 'subject', 200) },
        ...request.description === undefined ? {} : { description: requiredText(request.description, 'description', 16_384) },
        ...request.blockedBy === undefined ? {} : { blockedBy: this.dependencies(request.blockedBy, state, current.id) },
        ...request.writeScopes === undefined ? {} : { writeScopes: this.writeScopes(request.writeScopes) },
      } : current
      const observedPlan = request.action === 'plan' && request.plan !== undefined
        ? await this.observePlan(caller, request.plan, admitted) : undefined
      const observedSubmission = request.action === 'complete' && current.work !== undefined
        ? await this.observeSubmission(caller, request.artifactPaths ?? [], admitted) : undefined
      if (projectTask !== undefined && request.action === 'complete') {
        const paths = observedSubmission?.artifacts.map(artifact => artifact.path.replaceAll('\\', '/')) ?? []
        const outputs = projectTask.outputs.map(path => path.replaceAll('\\', '/'))
        if (outputs.some(scope => !paths.some(path => path === scope || path.startsWith(scope + '/')))
          || paths.some(path => !outputs.some(scope => path === scope || path.startsWith(scope + '/')))) {
          throw new TeamError('artifact_paths must contain actual files covering each planned output, with no undeclared output', 'TEAM_TASK_EVIDENCE_REQUIRED')
        }
      }
      const observed = {
        ...observedPlan === undefined ? {} : { plan: observedPlan },
        ...observedSubmission === undefined ? {} : { submission: observedSubmission },
      }
      const workUpdate = updateTaskWork(state, definition, request, caller.id, lead, observed)
      if (workUpdate === current) return projectTaskView(state, current)
      if (workUpdate !== undefined) next = workUpdate
      else switch (request.action) {
        case 'claim':
          if (state.tasks.some(candidate => candidate.id !== current.id && candidate.ownerId === caller.id
            && candidate.status === 'in_progress' && candidate.work?.execution?.phase !== 'submitted')) {
            throw new TeamError('member already owns a running task', 'TEAM_TASK_MEMBER_BUSY')
          }
          if (current.ownerId !== undefined && current.ownerId !== caller.id) {
            throw new TeamError(`team task "${current.id}" is owned by another member`, 'TEAM_TASK_ALREADY_CLAIMED')
          }
          if (current.status !== 'pending' || !taskReady(state, current)) {
            throw new TeamError(`team task "${current.id}" is not ready to claim`, 'TEAM_TASK_BLOCKED')
          }
          next = { ...current, status: 'in_progress', ownerId: caller.id }
          break
        case 'release':
          authorizeOwner()
          if (current.status !== 'in_progress') throw new TeamError('only an in-progress task can be released', 'TEAM_TASK_INVALID_TRANSITION')
          next = this.withoutOwner({ ...current, status: 'pending' })
          break
        case 'edit':
          authorizeOwner()
          if (request.subject === undefined && request.description === undefined && request.writeScopes === undefined) {
            throw new TeamError('task edit requires subject, description, or write_scopes', 'TEAM_INVALID_ARGUMENT')
          }
          next = {
            ...current,
            ...request.subject === undefined ? {} : { subject: requiredText(request.subject, 'subject', 200) },
            ...request.description === undefined
              ? {}
              : { description: requiredText(request.description, 'description', 16_384) },
            ...request.writeScopes === undefined ? {} : { writeScopes: this.writeScopes(request.writeScopes) },
          }
          break
        case 'configure_review': {
          if (!lead) throw new TeamError('only the Team Lead can assign a reviewer', 'TEAM_LEAD_REQUIRED')
          if (current.status !== 'pending' && current.status !== 'in_progress') {
            throw new TeamError('a completed task retains its original review; reopen it before assigning a new reviewer', 'TEAM_TASK_INVALID_TRANSITION')
          }
          const reviewer = resolveActiveMember(root, state, requiredText(request.reviewer ?? '', 'reviewer', 200))
          if (reviewer.id === current.ownerId) {
            throw new TeamError('the executor cannot review its own result', 'TEAM_TASK_SELF_REVIEW')
          }
          const notify = this.autoDispatchReadyTasks && current.work?.execution?.phase === 'submitted'
          if (reviewer.id === current.reviewerId && (!notify || current.autoDispatch === true)) return projectTaskView(state, current)
          next = { ...current, reviewerId: reviewer.id, ...notify ? { autoDispatch: true } : {} }
          break
        }
        case 'configure_dispatch': {
          if (!lead) throw new TeamError('only the Team Lead can configure automatic task dispatch', 'TEAM_LEAD_REQUIRED')
          if (current.status !== 'pending' && !(current.status === 'in_progress'
            && request.autoAssign === false && request.requiredSkill === undefined)) {
            throw new TeamError('only disabling auto_assign is supported during execution or review; enable dispatch or change required_skill while pending', 'TEAM_TASK_INVALID_TRANSITION')
          }
          if (request.autoAssign === undefined && request.requiredSkill === undefined) {
            throw new TeamError('configure_dispatch requires auto_assign or required_skill', 'TEAM_INVALID_ARGUMENT')
          }
          const requiredSkill = request.requiredSkill === undefined ? current.requiredSkill
            : requiredText(request.requiredSkill, 'required_skill', 200)
          if (requiredSkill !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(requiredSkill)) {
            throw new TeamError('required_skill must be an installed kebab-case skill name', 'TEAM_INVALID_ARGUMENT')
          }
          next = { ...current, autoAssign: request.autoAssign ?? current.autoAssign ?? false,
            ...this.autoDispatchReadyTasks ? { autoDispatch: true } : {},
            ...requiredSkill === undefined ? {} : { requiredSkill } }
          break
        }
        case 'set_dependencies':
          authorizeOwner()
          if (request.blockedBy === undefined) throw new TeamError('set_dependencies requires blocked_by', 'TEAM_INVALID_ARGUMENT')
          next = { ...current, blockedBy: this.dependencies(request.blockedBy, state, current.id) }
          break
        case 'complete':
          authorizeOwner()
          if (current.status !== 'in_progress') throw new TeamError('only an in-progress task can complete', 'TEAM_TASK_INVALID_TRANSITION')
          if (!taskReady(state, current)) throw new TeamError('task dependencies must remain complete at submission', 'TEAM_TASK_BLOCKED')
          if (this.requireResults && (request.result === undefined || request.result.trim().length === 0)) {
            throw new TeamError('complete requires a reusable result; include verification evidence when available', 'TEAM_TASK_RESULT_REQUIRED')
          }
          next = {
            ...current,
            status: 'completed',
            ...request.result === undefined ? {} : { result: requiredText(request.result, 'result', 16_384) },
            ...request.evidence === undefined ? {} : { evidence: request.evidence.map(value => requiredText(value, 'evidence', 4_096)) },
          }
          break
        case 'reopen':
          authorizeOwner()
          if (current.status !== 'completed') throw new TeamError('only a completed task can reopen', 'TEAM_TASK_INVALID_TRANSITION')
          next = pendingTask(current)
          break
        case 'reassign': {
          if (!lead) throw new TeamError('only the Team Lead can reassign tasks', 'TEAM_LEAD_REQUIRED')
          if (current.status !== 'pending' && current.status !== 'in_progress') {
            throw new TeamError(
              'only a pending or in-progress task can be reassigned',
              'TEAM_TASK_INVALID_TRANSITION',
            )
          }
          if (request.owner === undefined || request.owner.trim().length === 0) {
            next = this.withoutOwner({ ...current, status: 'pending' })
            break
          }
          if (!taskReady(state, current)) throw new TeamError(`team task "${current.id}" is blocked`, 'TEAM_TASK_BLOCKED')
          const assignee = resolveActiveMember(root, state, request.owner)
          if (state.tasks.some(candidate => candidate.id !== current.id && candidate.ownerId === assignee.id
            && candidate.status === 'in_progress' && candidate.work?.execution?.phase !== 'submitted')) {
            throw new TeamError('member already owns a running task', 'TEAM_TASK_MEMBER_BUSY')
          }
          next = { ...current, status: 'in_progress', ownerId: assignee.id }
          break
        }
        case 'delete': {
          authorizeOwner()
          const dependent = state.tasks.find(task =>
            task.status !== 'deleted' && task.id !== current.id && task.blockedBy.includes(current.id))
          if (dependent !== undefined) {
            throw new TeamError(`team task "${current.id}" still blocks "${dependent.id}"`, 'TEAM_TASK_HAS_DEPENDENTS')
          }
          next = { ...current, status: 'deleted' }
          break
        }
        /* v8 ignore next 6 -- Work-only actions return or throw in updateTaskWork. */
        case 'plan':
        case 'resume':
        case 'review':
        case 'reconcile':
          throw new TeamError('task execution action was not handled', 'TEAM_TASK_INVALID_TRANSITION')
        default: assertNever(request.action)
      }
      const task: TeamTaskSnapshot = {
        ...next,
        revision: current.revision + 1,
      }
      if (task.reviewerId !== undefined && task.ownerId === task.reviewerId && task.status === 'in_progress') {
        throw new TeamError('task reviewer must be different from the executing member', 'TEAM_TASK_SELF_REVIEW')
      }
      if (this.enforceWriteScopeExclusivity && task.status === 'in_progress'
        && task.work?.execution?.phase !== 'submitted' && task.writeScopes.length > 0) {
        const conflicting = state.tasks.find(candidate => candidate.id !== task.id
          && candidate.status === 'in_progress' && candidate.work?.execution?.phase !== 'submitted'
          && task.writeScopes.some(left => candidate.writeScopes.some(right => scopesOverlap(left, right))))
        if (conflicting !== undefined) {
          throw new TeamError(`declared output paths overlap with running task ${conflicting.id}; finish or release that task before assigning this one`,
            'TEAM_TASK_WRITE_SCOPE_CONFLICT')
        }
      }
      if (task.status === 'in_progress') {
        const conflict = resourceConflicts(state, task)[0]
        if (conflict !== undefined) throw new TeamError(`exclusive resource is owned by task ${conflict}; wait for its acceptance or reconcile and release it`, 'TEAM_TASK_RESOURCE_BUSY')
      }
      if (current.status === 'completed' && (task.status === 'pending' || task.status === 'in_progress')
        && state.tasks.filter(candidate => candidate.status === 'pending' || candidate.status === 'in_progress').length >= this.maxTasks) {
        throw new TeamError(`Team task limit ${this.maxTasks} reached`, 'TEAM_TASK_LIMIT')
      }
      if (!Number.isSafeInteger(task.revision)) throw new TeamError('task revision limit reached', 'TEAM_TASK_REVISION_LIMIT')
      this.validateWork(task)
      this.assertTaskGraph(state, task)
      if (task.work?.plan.environment !== undefined && task.work.plan.revision !== current.work?.plan.revision) {
        await this.artifacts?.capture(task.work.plan.environment, task.work.plan.inputs ?? [], admitted)
      }
      admitted.throwIfAborted()
      if (this.roster.membership(caller).root !== root
        || this.journal.state(root).tasks.find(value => value.id === current.id)?.revision !== current.revision) {
        throw new TeamError('task caller or revision changed during file observation', 'TEAM_TASK_EXECUTION_STALE')
      }
      await this.journal.appendAndFlush(root, 'team/task', { version: 2, teamId: TeamId(root.id), task })
      return projectTaskView(state, task)
    })
  }

  /** Validate the bounded durable work value before it enters the Session log. */
  private validateWork(task: TeamTaskSnapshot): void {
    if (task.work === undefined) return
    if (Buffer.byteLength(JSON.stringify(task.work), 'utf8') > this.maxWorkBytes) {
      throw new TeamError(`task work record exceeds ${this.maxWorkBytes} bytes`, 'TEAM_TASK_WORK_TOO_LARGE')
    }
    const parsed = taskWorkSchema.safeParse(task.work)
    if (!parsed.success) throw new TeamError('task execution or review fields are invalid', 'TEAM_TASK_WORK_INVALID')
  }

  /** Validate and de-duplicate dependency ids against the current task graph. */
  private dependencies(
    values: readonly TeamTaskId[],
    state: TeamState,
    self?: TeamTaskId,
  ): TeamTaskId[] {
    const seen = new Set<TeamTaskId>()
    const result: TeamTaskId[] = []
    for (const id of values) {
      if (id === self) throw new TeamError('a team task cannot block itself', 'TEAM_TASK_DEPENDENCY_CYCLE')
      if (seen.has(id)) throw new TeamError(`duplicate blocker "${id}"`, 'TEAM_INVALID_ARGUMENT')
      const task = state.tasks.find(candidate => candidate.id === id)
      if (task === undefined || task.status === 'deleted') {
        throw new TeamError(`blocker task "${id}" not found`, 'TEAM_TASK_NOT_FOUND')
      }
      seen.add(id)
      result.push(id)
    }
    return result
  }

  /** Normalize and de-duplicate task write scopes. */
  private writeScopes(values: readonly string[]): string[] {
    return [...new Set(values.map(writeScope))]
  }

  /** Map shared task-graph validation onto stable command error codes. */
  private assertTaskGraph(state: TeamState, candidate: TeamTaskSnapshot): void {
    try {
      assertTaskGraphCandidate(state.tasks, candidate)
    } catch (error: unknown) {
      /* v8 ignore next -- the shared validator is the only statement in the try and throws this exact error. */
      if (!(error instanceof TeamTaskGraphError)) throw error
      throw new TeamError(error.message, TASK_GRAPH_ERROR_CODES[error.violation], { cause: error })
    }
  }

  /** Remove an optional owner field under exactOptionalPropertyTypes. */
  private withoutOwner(task: TeamTaskSnapshot): TeamTaskSnapshot {
    const { ownerId: _ownerId, ...without } = task
    return without
  }
}
