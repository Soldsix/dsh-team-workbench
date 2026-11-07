import { TeamMessageId } from '@dsh-workbench/team-runtime';
import { defineTool } from '@deepseek-ai/dsh-tools';
/**
 * Register mailbox state and explicit recovery for one Team member.
 * @param scoped - Exact Agent-owned tool context.
 * @param agent - Exact live caller.
 * @param ctx - Team service owner.
 * @returns registration disposer.
 */
export function installMailboxTool(scoped, agent, ctx) {
    return scoped.tools.register(defineTool({
        name: 'team_mailbox',
        description: 'Inspect bounded pages of pending, delivered, exhausted, and historical Team messages. Get one message by id to read its content. Retry a current-goal message by its existing id. Only the Lead may explicitly adopt historical contents into the current goal; adoption creates a new message and preserves the original. Do not resend accepted messages.',
        parameters: {
            action: { type: 'string', enum: ['list', 'get', 'retry', 'adopt'], required: true },
            message_id: { type: 'string', description: 'Required for get, retry, or adoption.' },
            offset: { type: 'integer', description: 'Zero-based newest-first list offset. Defaults to 0.' },
            limit: { type: 'integer', description: 'List page size from 1 to 50. Defaults to 20.' },
        },
        output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
        presentCall: args => ({ card: 'generic', title: args.action === 'list' || args.action === 'get' ? '查看团队消息' : '恢复团队消息',
            kind: args.action === 'list' || args.action === 'get' ? 'read' : 'edit' }),
        async execute(args, exec) {
            if (args.action === 'list')
                return JSON.stringify(ctx.agentTeams.listMessagePage(agent, args.offset ?? 0, args.limit ?? 20));
            if (args.message_id === undefined)
                throw new Error('message_id is required for this mailbox action');
            const id = TeamMessageId(args.message_id);
            if (args.action === 'get')
                return JSON.stringify(ctx.agentTeams.getMessage(agent, id));
            return JSON.stringify(args.action === 'retry'
                ? await ctx.agentTeams.retryMessage(agent, id, exec.signal)
                : await ctx.agentTeams.adoptMessage(agent, id, exec.signal));
        },
    }));
}
