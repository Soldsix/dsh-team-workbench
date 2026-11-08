import { TeamTaskId, TeamTaskExecutionId } from 'dsh-team-workbench/runtime';
import { defineTool } from '@deepseek-ai/dsh-tools';
/**
 * Register workspace operations for one live Team member.
 * @param scoped - Member-owned registration context.
 * @param agent - Exact live caller retained by each operation.
 * @param ctx - Plugin context declaring the Team service.
 * @returns the tool registration disposer.
 */
export function installWorkspaceTool(scoped, agent, ctx) {
    return scoped.tools.register(defineTool({
        name: 'team_workspace',
        description: 'prepare checks existing relative inputs before spawning. get inspects a member copy. Lead-only refresh adds exact inputs without overwriting edits. read_artifact reads submitted outputs; read_input reads the host-recorded task inputs even when your private directory is empty. Both require task_id, execution_id and the exact relative file_path from team_task_get, and support byte_offset=nextByteOffset. Input hashes must still match. Lead-only integrate publishes accepted artifacts; scratch files and deletions are not published. Conflicts are rejected.',
        parameters: {
            action: { type: 'string', enum: ['prepare', 'get', 'refresh', 'integrate', 'read_artifact', 'read_input'], required: true },
            target: { type: 'string', description: 'Required for get/refresh/integrate: durable teammate name from list_agents. Omit for prepare.' },
            working_paths: { type: 'array', items: { type: 'string' }, description: 'prepare: existing relative inputs, omit for automatic selection. refresh: required nonempty list of exact existing relative files, not directories or future output files.' },
            task_id: { type: 'string', description: 'read_artifact/read_input: task id from team_task_get.' },
            execution_id: { type: 'string', description: 'read_artifact/read_input: exact current execution id.' },
            file_path: { type: 'string', description: 'read_artifact: path from submission.artifacts; read_input: path from plan.inputs. Arbitrary paths are rejected.' },
            byte_offset: { type: 'integer', description: 'read_artifact/read_input: zero initially, then nextByteOffset from the last result. Must be non-negative.' },
        },
        output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
        isConcurrencySafe: args => args.action !== 'integrate' && args.action !== 'refresh',
        async execute(args, exec) {
            if (args.action === 'read_artifact' || args.action === 'read_input') {
                if (!args.task_id?.trim() || !args.execution_id?.trim() || !args.file_path?.trim()
                    || args.target !== undefined || args.working_paths !== undefined) {
                    throw new Error(`${args.action} requires task_id, execution_id, and the recorded relative file_path; omit target and working_paths.`);
                }
                const read = args.action === 'read_input' ? ctx.agentTeams.readTaskInput.bind(ctx.agentTeams) : ctx.agentTeams.readTaskArtifact.bind(ctx.agentTeams);
                return JSON.stringify(await read(agent, { taskId: TeamTaskId(args.task_id),
                    executionId: TeamTaskExecutionId(args.execution_id), path: args.file_path,
                    ...args.byte_offset === undefined ? {} : { byteOffset: args.byte_offset } }, exec.signal));
            }
            if (args.task_id !== undefined || args.execution_id !== undefined || args.file_path !== undefined || args.byte_offset !== undefined) {
                throw new Error('task_id, execution_id, file_path, and byte_offset are only valid for read_artifact/read_input.');
            }
            if (args.action === 'prepare') {
                if (args.target !== undefined)
                    throw new Error('prepare selects inputs before a member exists; omit target.');
                return JSON.stringify(await ctx.agentTeams.prepareWorkspace(agent, args.working_paths, exec.signal));
            }
            if (args.target === undefined || args.target.trim() === '')
                throw new Error(`${args.action} requires target from list_agents.`);
            if (args.action === 'refresh') {
                if (args.working_paths === undefined || args.working_paths.length === 0)
                    throw new Error('refresh requires target and existing relative input files in working_paths; member edits are retained on conflict');
                return JSON.stringify(await ctx.agentTeams.refreshWorkspace(agent, args.target, args.working_paths, exec.signal));
            }
            if (args.working_paths !== undefined)
                throw new Error('working_paths is only valid for prepare or refresh.');
            const value = args.action === 'get' ? ctx.agentTeams.getWorkspace(agent, args.target)
                : await ctx.agentTeams.integrateWorkspace(agent, args.target, exec.signal);
            return JSON.stringify(value);
        },
    }));
}
