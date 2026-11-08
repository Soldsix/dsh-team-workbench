/** On-demand independent adviser findings for key submitted Team results. */
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { TeamTaskExecutionId, TeamTaskId } from '@deepseek-ai/dsh-experimental-agent-team'
import { defineTool } from '@deepseek-ai/dsh-tools'

/**
 * Register the current-execution adviser review tool in one Team member scope.
 * @param scoped - Exact member's tool registration scope.
 * @param agent - Member recording or reading the finding.
 * @param ctx - Team service context.
 * @returns tool registration disposer.
 */
export function installAdviserTool(scoped: Context, agent: Agent, ctx: Context): () => void {
  return scoped.tools.register(defineTool({
    name: 'team_adviser_review',
    description: 'Read or record an independent adviser finding for one submitted task execution. Key results marked adviser_gate=dual need separate planning and quality adviser approvals before independent acceptance. Advisers inspect a short evidence packet, then return idle; routine work stays with executor and verifier members.',
    parameters: {
      action: { type: 'string', required: true, enum: ['list', 'record'] },
      task_id: { type: 'string', required: true, description: 'Current shared task id.' },
      execution_id: { type: 'string', description: 'Required for record: submitted execution id from team_task_get.' },
      decision: { type: 'string', enum: ['approve', 'revise'], description: 'Required for record: independently checked conclusion.' },
      summary: { type: 'string', description: 'Required for record: concise reasoning about the submitted result.' },
      evidence: { type: 'array', items: { type: 'string' }, description: 'Required for record: direct checks or artifact receipts actually reviewed.' },
    },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    async execute(args, exec) {
      const taskId = TeamTaskId(args.task_id)
      if (args.action === 'list') {
        if (args.execution_id !== undefined || args.decision !== undefined || args.summary !== undefined
          || args.evidence !== undefined) throw new Error('list requires only task_id')
        return JSON.stringify({ findings: ctx.agentTeams.listAdviserDecisions(agent, taskId) })
      }
      if (args.execution_id === undefined || args.decision === undefined || args.summary === undefined
        || args.evidence === undefined) {
        throw new Error('record requires execution_id, decision, summary, and evidence')
      }
      const finding = await ctx.agentTeams.recordAdviserDecision(agent, {
        taskId, executionId: TeamTaskExecutionId(args.execution_id), decision: args.decision,
        summary: args.summary, evidence: args.evidence,
      }, exec.signal)
      return JSON.stringify({ finding })
    },
  }))
}
