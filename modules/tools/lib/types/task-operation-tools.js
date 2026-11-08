import { TeamTaskExecutionId, TeamTaskId } from 'dsh-team-workbench/runtime';
import { defineTool } from '@deepseek-ai/dsh-tools';
/**
 * Register explicit submit and review tools while retaining team_task_update for compatibility.
 * @param scoped - Exact Agent tool scope.
 * @param agent - Current member.
 * @param ctx - Team service owner.
 * @returns effect disposers.
 */
export function installTaskOperationTools(scoped, agent, ctx) {
    const identity = { task_id: { type: 'string', required: true }, expected_revision: { type: 'integer', required: true },
        execution_id: { type: 'string', required: true } };
    const output = { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] };
    return [scoped.tools.register(defineTool({
            name: 'team_task_submit', description: '执行成员提交当前执行。先 team_task_get，复制当前 revision 和 execution_id。提交不等于验收；产物填实际相对路径，evidence 填真实检查结果。',
            parameters: { ...identity, result: { type: 'string', required: true },
                evidence: { type: 'array', required: true, items: { type: 'string' } },
                artifact_paths: { type: 'array', required: true, items: { type: 'string' } },
                side_effects: { type: 'string', required: true, enum: ['none', 'known', 'unknown'] },
            }, output,
            async execute(args, exec) {
                return JSON.stringify(await ctx.agentTeams.updateTask(agent, { taskId: TeamTaskId(args.task_id),
                    expectedRevision: args.expected_revision, executionId: TeamTaskExecutionId(args.execution_id), action: 'complete',
                    result: args.result, evidence: args.evidence, artifactPaths: args.artifact_paths, sideEffects: args.side_effects }, exec.signal));
            },
        })), scoped.tools.register(defineTool({
            name: 'team_task_review', description: '独立复核人审核提交。逐条核对验收，缺失证据选 rejected。不能审核自己成果；有未核实工具影响时先 team_task_reconcile，再读取最新版本。',
            parameters: { ...identity, review_decision: { type: 'string', required: true, enum: ['accepted', 'rejected'] },
                review_summary: { type: 'string', required: true }, review_evidence: { type: 'array', required: true, items: { type: 'string' } },
                review_checks: { type: 'array', required: true, items: { type: 'object', additionalProperties: false, properties: {
                            criterion: { type: 'integer', required: true }, verified: { type: 'boolean', required: true }, evidence: { type: 'string', required: true },
                        } } },
            }, output,
            async execute(args, exec) {
                const task = ctx.agentTeams.getTask(agent, TeamTaskId(args.task_id));
                if (args.review_decision === 'accepted') {
                    const criteria = task.work?.plan.acceptanceCriteria ?? [];
                    if (args.review_checks.length !== criteria.length || criteria.some((_criterion, index) => args.review_checks.filter(check => check.criterion === index + 1 && check.verified && check.evidence.trim() !== '').length !== 1)) {
                        throw new Error('accepted requires exactly one verified review_checks entry per acceptance criterion; otherwise choose rejected');
                    }
                }
                return JSON.stringify(await ctx.agentTeams.updateTask(agent, { taskId: task.id, expectedRevision: args.expected_revision,
                    executionId: TeamTaskExecutionId(args.execution_id), action: 'review', reviewDecision: args.review_decision,
                    reviewSummary: args.review_summary, reviewEvidence: args.review_evidence }, exec.signal));
            },
        }))];
}
