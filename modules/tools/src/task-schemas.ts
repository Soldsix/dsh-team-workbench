/** Shared model schemas for versioned task plans and reviewed executions. */

import type { TeamTaskPlanInput } from '@deepseek-ai/dsh-experimental-agent-team'

/** Complete plan fields accepted together when creating or revising a task. */
export const TASK_PLAN_PARAMETERS = {
  input_version: { type: 'string', description: 'Version or content digest of the task inputs; declare changes explicitly.' },
  environment_version: { type: 'string', description: 'Version of the relevant tools, devices, and runtime conditions.' },
  acceptance_criteria: { type: 'array', items: { type: 'string' }, description: 'Concrete checks an independent reviewer must perform.' },
  adviser_gate: { type: 'string', enum: ['dual'], description: 'For a key result only: require separate planning and quality adviser approvals before independent acceptance.' },
  input_paths: { type: 'array', items: { type: 'string' }, description: 'Concrete workspace-relative input files to inspect and hash when recording the plan.' },
} as const

const FILE_RECEIPT_VALUE_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  path: { type: 'string', required: true }, bytes: { type: 'integer', required: true }, sha256: { type: 'string', required: true },
} } as const
const ENVIRONMENT_RECEIPT_VALUE_SCHEMA = { type: 'object', additionalProperties: false, properties: {
  workspaceRoot: { type: 'string', required: true }, platform: { type: 'string', required: true },
  arch: { type: 'string', required: true }, nodeVersion: { type: 'string', required: true },
} } as const

/** Structured execution details returned by task tools. */
export const TASK_WORK_VALUE_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    plan: { type: 'object', required: true, additionalProperties: false, properties: {
      revision: { type: 'integer', required: true }, plannerId: { type: 'string', required: true },
      goalRevision: { type: 'integer', required: true }, inputVersion: { type: 'string', required: true },
      environmentVersion: { type: 'string', required: true }, acceptanceCriteria: { type: 'array', required: true, items: { type: 'string' } },
      adviserGate: { type: 'string', enum: ['dual'] },
      inputPaths: { type: 'array', items: { type: 'string' } },
      inputs: { type: 'array', items: FILE_RECEIPT_VALUE_SCHEMA }, environment: ENVIRONMENT_RECEIPT_VALUE_SCHEMA,
    } },
    attempts: { type: 'integer', required: true },
    execution: { type: 'object', additionalProperties: false, properties: {
      id: { type: 'string', required: true }, ownerId: { type: 'string', required: true }, planRevision: { type: 'integer', required: true },
      phase: { type: 'string', required: true, enum: ['running', 'submitted', 'accepted', 'rejected', 'cancelled'] },
      effectTracking: { type: 'string', enum: ['observed'] },
      effectReview: { type: 'object', additionalProperties: false, properties: {
        reviewerId: { type: 'string', required: true }, resolution: { type: 'string', required: true, enum: ['none', 'known'] },
        observedCalls: { type: 'integer', required: true },
        summary: { type: 'string', required: true }, evidence: { type: 'array', required: true, items: { type: 'string' } },
      } },
      dependencies: { type: 'array', required: true, items: { type: 'object', additionalProperties: false, properties: {
        taskId: { type: 'string', required: true }, revision: { type: 'integer', required: true },
      } } },
      submission: { type: 'object', additionalProperties: false, properties: {
        result: { type: 'string', required: true }, evidence: { type: 'array', required: true, items: { type: 'string' } },
        artifacts: { type: 'array', items: FILE_RECEIPT_VALUE_SCHEMA },
        environment: ENVIRONMENT_RECEIPT_VALUE_SCHEMA,
        sideEffects: { type: 'string', enum: ['none', 'known', 'unknown'] },
        sideEffectEvidence: { type: 'array', items: { type: 'string' } },
      } },
      review: { type: 'object', additionalProperties: false, properties: {
        reviewerId: { type: 'string', required: true }, decision: { type: 'string', required: true, enum: ['accepted', 'rejected'] },
        summary: { type: 'string', required: true }, evidence: { type: 'array', required: true, items: { type: 'string' } },
      } },
    } },
  },
} as const

/**
 * Resolve complete model plan fields without silently ignoring a partial version update.
 * @param args - Optional model-facing plan fields.
 * @returns the complete declared plan, or undefined when all three fields are omitted.
 */
export function modelTaskPlan(
  args: { input_version?: string
    environment_version?: string
    acceptance_criteria?: string[]
    input_paths?: string[]
    adviser_gate?: 'dual' },
): TeamTaskPlanInput | undefined {
  if (args.input_version === undefined && args.environment_version === undefined
    && args.acceptance_criteria === undefined && args.input_paths === undefined && args.adviser_gate === undefined) return undefined
  if (args.input_version === undefined || args.environment_version === undefined || args.acceptance_criteria === undefined) {
    throw new Error('provide input_version, environment_version, and acceptance_criteria together')
  }
  return { inputVersion: args.input_version, environmentVersion: args.environment_version, acceptanceCriteria: args.acceptance_criteria,
    ...args.adviser_gate === undefined ? {} : { adviserGate: args.adviser_gate },
    ...args.input_paths === undefined ? {} : { inputPaths: args.input_paths } }
}
