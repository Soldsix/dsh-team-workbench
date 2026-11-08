/** Durable dispatch observations and conservative recovery of task attempts. */

import { z } from 'zod'
import { hasNoExternalTaskEffect } from './tool-capabilities.ts'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import type { TeamState } from './projection.ts'
import { TeamId, TeamTaskId } from './types.ts'
import type { TeamTaskSnapshot } from './types.ts'
import { TeamTaskExecutionId } from './task-work-types.ts'
import type { TeamTaskEffectEvent } from './task-work-types.ts'

/**
 * Return whether a tool needs an opaque dispatch record for task recovery.
 * @param name - Registered tool name.
 * @param args - Logged tool JSON for action-specific read-only observations.
 * @returns whether task recovery must track its dispatch.
 */
export function taskToolNeedsEffectTracking(name: string, args?: unknown): boolean {
  return !hasNoExternalTaskEffect(name, args)
}

/** JSON validation for one logged dispatch observation. */
export const taskEffectEventSchema = z.object({
  version: z.literal(2),
  teamId: z.string().min(1).transform(TeamId),
  taskId: z.string().min(1).transform(TeamTaskId),
  executionId: z.string().min(1).transform(TeamTaskExecutionId),
  callId: z.string().min(1).transform(ToolCallId),
  toolName: z.string().min(1),
  phase: z.enum(['started', 'settled']),
}).strict() as z.ZodType<TeamTaskEffectEvent>

/**
 * Apply a dispatch observation after validating its exact task and call identity.
 * @param state - accepted Team state before the event.
 * @param event - decoded dispatch observation.
 * @returns latest observation for each call, including settled calls.
 */
export function applyTaskEffectEvent(state: TeamState, event: TeamTaskEffectEvent): TeamTaskEffectEvent[] {
  const prior = state.taskEffects ?? []
  const index = prior.findIndex(value => value.executionId === event.executionId && value.callId === event.callId)
  const previous = prior[index]
  if (event.phase === 'started') {
    const task = state.tasks.find(value => value.id === event.taskId)
    if (task?.work?.execution?.id !== event.executionId || task.work.execution.phase !== 'running'
      || previous !== undefined) throw new Error('task effect started outside its current execution')
    return [...prior, event]
  }
  if (previous?.phase !== 'started' || previous.teamId !== event.teamId || previous.taskId !== event.taskId
    || previous.toolName !== event.toolName) throw new Error('task effect settled without its matching start')
  const next = [...prior]
  next[index] = event
  return next
}

/**
 * Identify an attempt whose external effects have not been independently reviewed.
 * @param state - current Team state with durable dispatch observations.
 * @param task - task whose latest execution may be resumed or replaced.
 * @returns whether independent recovery is required.
 */
export function taskEffectsNeedReview(state: TeamState, task: TeamTaskSnapshot): boolean {
  const execution = task.work?.execution
  if (execution === undefined) return false
  const observedCalls = taskEffectCallCount(state, task)
  if (execution.effectReview !== undefined) return observedCalls > execution.effectReview.observedCalls
  return execution.effectTracking !== 'observed' || observedCalls > 0
}

/**
 * Count logged calls in the latest attempt, including calls that settled.
 * @param state - Current Team state with durable dispatch observations.
 * @param task - Task whose latest attempt is inspected.
 * @returns distinct calls in that attempt.
 */
export function taskEffectCallCount(state: TeamState, task: TeamTaskSnapshot): number {
  const execution = task.work?.execution
  if (execution === undefined) return 0
  return (state.taskEffects ?? []).filter(value => value.taskId === task.id && value.executionId === execution.id).length
}
