import { TeamExpertId, parseTeamExpertDefinition } from '@dsh-workbench/team-runtime/experts';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { INITIAL_SKILLS_PARAMETER, requireInitialSkills } from "./skill-parameters.js";
/**
 * Register expert tools in one enabled Team member scope.
 * @param agent - Exact live member owning the tool registrations.
 * @param ctx - Plugin context with the expert service.
 * @param providers - Configured continuable-subagent routes.
 * @returns a disposer for this member's tool registrations.
 */
export function installExpertTools(agent, ctx, providers) {
    const disposers = [];
    const output = { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] };
    try {
        disposers.push(agent.ctx.tools.register(defineTool({
            name: 'team_expert_catalog',
            description: 'List a bounded page of expert summaries; use id to read one complete profile when needed. User-managed templates are shared, while model-authored profiles belong to their Team. Read existing members and task results before assigning more work.',
            parameters: {
                id: { type: 'string', description: 'Read one expert by stable id; omit to list profiles.' },
                include_archived: { type: 'boolean', description: 'Include archived profiles in the list.' },
                offset: { type: 'integer', description: 'Next page offset returned by an earlier listing; omit for the first page.' },
            },
            output,
            execute(args) {
                ctx.agentTeams.membership(agent);
                if (args.id !== undefined) {
                    const id = TeamExpertId(args.id);
                    const profile = JSON.stringify(ctx.agents.withInitiator(agent, () => ctx.teamExperts.get(id)));
                    if (Buffer.byteLength(profile, 'utf8') > providers.maxExpertProfileBytes) {
                        throw new Error('expert profile exceeds maxExpertProfileBytes; increase the profile byte limit');
                    }
                    return Promise.resolve(profile);
                }
                const offset = args.offset ?? 0;
                if (!Number.isSafeInteger(offset) || offset < 0)
                    throw new Error('expert catalog offset must be a non-negative safe integer');
                const profiles = ctx.agents.withInitiator(agent, () => ctx.teamExperts.list(args.include_archived ?? false));
                const items = [];
                let nextOffset = offset;
                for (const profile of profiles.slice(offset, offset + providers.expertCatalogPageSize)) {
                    const summary = { id: String(profile.id), revision: profile.revision, name: profile.definition.name,
                        description: profile.definition.description, archived: profile.archived };
                    const candidate = { items: [...items, summary], nextOffset: nextOffset + 1 < profiles.length ? nextOffset + 1 : null };
                    if (Buffer.byteLength(JSON.stringify(candidate), 'utf8') > providers.maxExpertCatalogBytes) {
                        if (items.length === 0)
                            throw new Error('one expert summary exceeds maxExpertCatalogBytes; increase the catalog byte limit');
                        break;
                    }
                    items.push(summary);
                    nextOffset += 1;
                }
                const result = JSON.stringify({ items, nextOffset: nextOffset < profiles.length ? nextOffset : null });
                if (Buffer.byteLength(result, 'utf8') > providers.maxExpertCatalogBytes) {
                    throw new Error('maxExpertCatalogBytes cannot hold an empty catalog page');
                }
                return Promise.resolve(result);
            },
        })));
        disposers.push(agent.ctx.tools.register(defineTool({
            name: 'team_expert_save',
            description: 'Create or revise a Team-local expert profile without starting a model turn. Shared templates require user edits: omit id to create a local version. A member edits its own authored profile or a direct child’s; the Lead manages profiles in this Team. Existing members keep their logged persona and bound revision. Model limits come from DSH. Skill names are candidates, selected separately for each task.',
            parameters: {
                id: { type: 'string', description: 'Omit to create; supply with expected_revision to update.' },
                expected_revision: { type: 'integer', description: 'Last observed revision, required for updates.' },
                name: { type: 'string', required: true, description: 'Human-readable expert name.' },
                description: { type: 'string', required: true, description: 'Responsibility, at most 200 characters.' },
                persona: { type: 'string', required: true, description: 'Role, working style, and collaboration instructions.' },
                instructions: { type: 'string', required: true, description: 'Expert AGENT.md contents; may be empty.' },
                skills: { type: 'array', required: true, items: { type: 'string' }, description: 'Existing skill names to consult.' },
                model_provider: { type: 'string', description: 'Configured provider; requires model. Omit both to inherit.' },
                model: { type: 'string', description: 'Exact configured model id.' },
                reasoning_effort: { type: 'string', description: 'Effort supported by the configured model.' },
                archived: { type: 'boolean', description: 'Hide an existing expert from new assignments.' },
            },
            output,
            async execute(args, exec) {
                ctx.agentTeams.membership(agent);
                const definition = parseTeamExpertDefinition({
                    name: args.name, description: args.description, persona: args.persona,
                    instructions: args.instructions, skills: args.skills,
                    ...args.model_provider === undefined ? {} : { modelProvider: args.model_provider },
                    ...args.model === undefined ? {} : { model: args.model },
                    ...args.reasoning_effort === undefined ? {} : { reasoningEffort: args.reasoning_effort },
                });
                if (args.id === undefined) {
                    if (args.expected_revision !== undefined || args.archived === true)
                        throw new Error('new experts cannot have an expected revision or start archived');
                    return JSON.stringify(await ctx.agents.withInitiator(agent, () => ctx.teamExperts.create(definition, exec.signal)));
                }
                if (args.expected_revision === undefined)
                    throw new Error('updating an expert requires expected_revision');
                const id = TeamExpertId(args.id);
                const expectedRevision = args.expected_revision;
                const archived = args.archived ?? ctx.agents.withInitiator(agent, () => ctx.teamExperts.get(id).archived);
                const updated = await ctx.agents.withInitiator(agent, () => ctx.teamExperts.update(id, expectedRevision, definition, archived, exec.signal));
                return JSON.stringify(updated);
            },
        })));
        disposers.push(agent.ctx.tools.register(defineTool({
            name: 'team_expert_assign',
            description: 'Reuse this expert’s existing member in the current Team, or create it once when absent. The prompt runs only on first creation. Reuse sends no message and does not repeat work; inspect the returned target and task results, then send_message for genuinely new work. Compare the returned bound revision with the catalog: editing a profile does not rewrite an existing conversation.',
            parameters: {
                id: { type: 'string', required: true, description: 'Stable id from team_expert_catalog.' },
                expected_revision: { type: 'integer', required: true, description: 'Current catalog revision.' },
                name: { type: 'string', required: true, description: 'Unique lowercase hyphenated member name, used only for first creation.' },
                prompt: { type: 'string', required: true, description: 'Initial task, used only when creating a new member.' },
                skills: INITIAL_SKILLS_PARAMETER,
                context: { type: 'string', enum: ['fresh', 'fork'], description: 'Fresh context or completed-prefix fork; defaults to fresh.' },
            },
            output,
            async execute(args, exec) {
                const existing = ctx.agentTeams.listMembers(agent).some(member => member.expert?.id === TeamExpertId(args.id) && member.status !== 'failed');
                if (!existing)
                    requireInitialSkills(args.skills, providers.requireMemberSkills);
                const context = args.context ?? 'fresh';
                const result = await ctx.teamExperts.assign(agent, {
                    expertId: TeamExpertId(args.id), expectedRevision: args.expected_revision,
                    name: args.name, prompt: [{ type: 'text', text: args.prompt }], context,
                    provider: context === 'fresh' ? providers.freshProvider : providers.forkProvider,
                    ...args.skills === undefined ? {} : { skills: args.skills },
                    signal: exec.signal,
                });
                const { id: _id, name, ...member } = result.member;
                return JSON.stringify({ reused: result.reused, member: { target: name, ...member } });
            },
        })));
    }
    catch (error) {
        for (const dispose of disposers.reverse())
            dispose();
        throw error;
    }
    return () => { for (const dispose of disposers.reverse())
        dispose(); };
}
