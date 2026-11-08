import { ReasoningEffortId } from '@deepseek-ai/dsh-llm';
import { TeamTaskId } from '@dsh-workbench/team-runtime';
import { defineTool } from '@deepseek-ai/dsh-tools';
/**
 * Register retained-member and bounded task-history operations.
 * @param scoped - Exact caller's registration scope.
 * @param agent - Live caller used for service admission.
 * @param ctx - Plugin context declaring the Team service.
 * @param freshProvider - Configured provider for a successor's new Session.
 * @returns the combined registration disposer.
 */
export function installHistoryTools(scoped, agent, ctx, freshProvider) {
    const member = scoped.tools.register(defineTool({
        name: 'team_member',
        description: 'Manage a retained Team member. configure_model changes its next-request model and effort in place, preserving its name, Session, tasks, persona, and skills. A running request finishes on its current model. configure_role assigns an inactive member a responsibility in place, retaining its persona and skills. successor explicitly creates a separate member for a handoff.',
        parameters: {
            action: { type: 'string', enum: ['retire', 'reactivate', 'configure_model', 'configure_role', 'successor'], required: true },
            target: { type: 'string', required: true, description: 'Existing durable member name.' },
            expected_revision: { type: 'integer', description: 'For configure_role use roleRevision; for configure_model use modelRouteRevision from list_agents. Unchanged creation settings use 0.' },
            team_function: { type: 'string', enum: ['planning_adviser', 'quality_adviser', 'domain_adviser', 'group_lead', 'executor', 'verifier'], description: 'Required for configure_role: responsibility of this retained member.' },
            reason: { type: 'string', description: 'Required for configure_role: why this responsibility matches the confirmed plan.' },
            new_name: { type: 'string', description: 'Required for successor: unique new member name.' },
            model_provider: { type: 'string', description: 'Required for configure_model or successor: configured model provider.' },
            model: { type: 'string', description: 'Required for configure_model or successor: exact model id.' },
            reasoning_effort: { type: 'string', description: 'Optional supported effort; configure_model otherwise selects the strongest supported effort.' },
            prompt: { type: 'string', description: 'Required for successor: handoff context, not permission to start a task before assignment.' },
            persona: { type: 'string', description: 'Optional replacement persona; otherwise retain the prior member persona.' },
            working_paths: { type: 'array', items: { type: 'string' }, description: 'Project-relative files needed by the successor.' },
        },
        output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
        async execute(args, exec) {
            if (args.action === 'retire')
                return JSON.stringify(await ctx.agentTeams.retireMember(agent, args.target, exec.signal));
            if (args.action === 'reactivate')
                return JSON.stringify(await ctx.agentTeams.reactivateMember(agent, args.target, exec.signal));
            if (args.action === 'configure_role') {
                if (args.expected_revision === undefined || args.team_function === undefined || args.reason === undefined) {
                    throw new Error('configure_role requires expected_revision, team_function, and reason; inspect list_agents first');
                }
                return JSON.stringify(await ctx.agentTeams.configureMemberRole(agent, {
                    target: args.target, expectedRevision: args.expected_revision, teamFunction: args.team_function, reason: args.reason,
                }, exec.signal));
            }
            if (args.action === 'configure_model') {
                if (args.model_provider === undefined || args.model === undefined) {
                    throw new Error('configure_model requires model_provider and model; inspect list_team_models first');
                }
                const updated = await ctx.agentTeams.configureMemberModel(agent, {
                    target: args.target, ...args.expected_revision === undefined ? {} : { expectedRevision: args.expected_revision },
                    modelProvider: args.model_provider, model: args.model,
                    ...args.reasoning_effort === undefined ? {} : { reasoningEffort: args.reasoning_effort },
                }, exec.signal);
                return JSON.stringify({ member: updated, effective: 'next_request' });
            }
            if (args.new_name === undefined || args.model_provider === undefined || args.model === undefined
                || args.prompt === undefined) {
                throw new Error('successor requires new_name, model_provider, model, and prompt; inspect list_agents and list_team_models first');
            }
            const previous = ctx.agentTeams.listMembers(agent).find(member => member.name === args.target && member.role === 'teammate');
            if (previous === undefined)
                throw new Error(`Team member ${args.target} does not exist`);
            if (previous.status === 'running' || previous.status === 'provisioning') {
                throw new Error('Wait for the previous member to become inactive before creating a successor');
            }
            const unfinished = ctx.agentTeams.listTasks(agent).filter(task => task.ownerName === previous.name
                && task.status === 'in_progress');
            if (unfinished.length > 0) {
                throw new Error(`Resolve or release the previous member's running tasks before succession: ${unfinished.map(task => task.id).join(', ')}`);
            }
            const persona = args.persona ?? previous.persona;
            const next = await ctx.agentTeams.spawnTeammate(agent, {
                name: args.new_name, description: previous.description ?? previous.name,
                prompt: [{ type: 'text', text: `You are the model-change successor of member "${previous.name}" (${previous.id}). Read team_goal, team_context, team_task_list, and team_task_archive to understand the confirmed goal and retained results. The prior Session remains available to the Lead. This is a handoff only: do not start project work, claim a task, change files, or repeat prior work until a task is explicitly assigned to you on the shared board and the Lead sends the assignment. Pending tasks owned by the prior member require explicit reassignment. Handoff context: ${args.prompt}` }],
                context: 'fresh', provider: freshProvider, signal: exec.signal,
                agentOptions: { provider: args.model_provider, model: args.model,
                    ...args.reasoning_effort === undefined ? {} : { reasoningEffort: ReasoningEffortId(args.reasoning_effort) } },
                ...persona === undefined ? {} : { persona },
                inheritSkillsFrom: previous.id,
                ...args.working_paths === undefined ? {} : { workingPaths: args.working_paths },
            });
            return JSON.stringify({ member: next.member, predecessor: { name: previous.name, sessionId: previous.id },
                pendingTasks: ctx.agentTeams.listTasks(agent).filter(task => task.ownerName === previous.name)
                    .map(task => ({ id: task.id, revision: task.revision, status: task.status })) });
        },
    }));
    try {
        const archive = scoped.tools.register(defineTool({
            name: 'team_task_archive',
            description: 'List compact completed-task history separately from the active board, or check whether one retained result is still reusable. Use action check immediately before adoption: it observes current inputs, artifacts, and environment. Listing alone does not validate files. Read one complete record with team_task_get.',
            parameters: {
                action: { type: 'string', enum: ['list', 'check'], required: true },
                after: { type: 'string', description: 'Exclusive archive cursor from the preceding list page.' },
                limit: { type: 'integer', description: 'Required for list: number of records, 1 through 50.' },
                task_id: { type: 'string', description: 'Required for check: retained task identity.' },
            },
            output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
            async execute(args, exec) {
                if (args.action === 'check') {
                    if (args.task_id === undefined || args.after !== undefined || args.limit !== undefined)
                        throw new Error('check requires only task_id');
                    return JSON.stringify(await ctx.agentTeams.validateTaskReuse(agent, TeamTaskId(args.task_id), exec.signal));
                }
                if (args.limit === undefined || args.task_id !== undefined)
                    throw new Error('list requires limit and an optional after cursor');
                const page = ctx.agentTeams.listTaskArchive(agent, {
                    limit: args.limit, ...args.after === undefined ? {} : { after: TeamTaskId(args.after) },
                });
                return JSON.stringify({ tasks: page.tasks.map(task => ({ id: task.id, revision: task.revision, subject: task.subject,
                        ownerName: task.ownerName, status: task.status, validity: task.validity })),
                    ...page.nextCursor === undefined ? {} : { nextCursor: page.nextCursor } });
            },
        }));
        return () => { archive(); member(); };
    }
    catch (error) {
        member();
        throw error;
    }
}
