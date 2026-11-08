/** Team membership, continuable-child provisioning, and roster-owned teardown. */
import { memberFunction, memberRoleRevision, teamMemberFunctionSchema } from "./member-role.js";
import { randomUUID } from 'node:crypto';
import { addAbortListener } from 'node:events';
import { brandString } from '@deepseek-ai/dsh-brand';
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm';
import { foldSubagentDescriptor, parentAgentOptionsForDelegation } from '@deepseek-ai/dsh-subagent';
import { errorMessage, TeamError } from "./error.js";
import { readPersistedSession } from "./persisted.js";
import { messageAccepted } from "./session-message.js";
import { TeamId } from "./types.js";
import { requiredText } from "./validation.js";
import { assertTeamSkillSelection } from "./skill-state.js";
const MEMBER_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
/**
 * Resolve one active Team member by model-facing name, including the Lead pseudo-row.
 * @param root - exact live Team Lead.
 * @param state - current Team state.
 * @param rawName - candidate member name.
 * @returns resolved durable id and normalized name.
 */
export function resolveActiveMember(root, state, rawName) {
    const name = rawName.trim();
    if (name === 'lead')
        return { id: root.id, name };
    const member = state.members.find(candidate => candidate.name === name);
    if (member === undefined || member.phase !== 'active') {
        throw new TeamError(`active teammate "${name}" not found`, 'TEAM_MEMBER_NOT_FOUND');
    }
    return { id: member.id, name };
}
/** Owns Team identities and the lifecycle of rostered continuable children. */
export class TeamRoster {
    ctx;
    journal;
    lifecycle;
    maxMembers;
    maxDepth;
    enabledPresets;
    prepareSkills;
    copySkills;
    workspaceRuntime;
    defaultMemberReasoningEffort;
    resolveSpawn;
    inFlightCreations = new Set();
    expertCreations = new WeakMap();
    /** A fresh member can enter its first tool before its creator checkpoints the active roster edge. */
    memberPublications = new Map();
    retiring = new Set();
    integrations = new Map();
    /**
     * @param ctx - Team service context with Agent, Session, persistence, and subagent services.
     * @param journal - authoritative Lead-log transaction owner.
     * @param lifecycle - shared Team runtime admission cutoff.
     * @param maxMembers - maximum immutable roster entries per Team.
     * @param maxDepth - maximum delegation depth below the Team Lead.
     * @param enabledPresets - root preset ids allowed to use Teams, or '*' for every preset.
     * @param prepareSkills - Resolve and validate a new member's selected instruction versions.
     * @param copySkills - Reuse one predecessor's saved instruction bytes for a successor.
     */
    constructor(ctx, journal, lifecycle, maxMembers, maxDepth, enabledPresets, prepareSkills, copySkills, workspaceRuntime, defaultMemberReasoningEffort = 'inherit', resolveSpawn) {
        this.ctx = ctx;
        this.journal = journal;
        this.lifecycle = lifecycle;
        this.maxMembers = maxMembers;
        this.maxDepth = maxDepth;
        this.enabledPresets = enabledPresets;
        this.prepareSkills = prepareSkills;
        this.copySkills = copySkills;
        this.workspaceRuntime = workspaceRuntime;
        this.defaultMemberReasoningEffort = defaultMemberReasoningEffort;
        this.resolveSpawn = resolveSpawn;
    }
    /**
     * Reinstall a rostered member's process-local caps before a cold activation.
     * @param root - exact Team Lead whose log owns the member.
     * @param memberId - target or ancestor member to resume.
     */
    restoreWorkspaceCap(root, memberId) {
        if (this.workspaceRuntime === undefined)
            return;
        const member = this.journal.state(root).members.find(candidate => candidate.id === memberId);
        if (member === undefined || member.phase === 'failed' || member.workspace === undefined) {
            throw new TeamError('legacy Team member has no private workspace; preserve its history and create an isolated successor', 'TEAM_MEMBER_NOT_READY');
        }
        this.workspaceRuntime.restore(memberId, member.workspace);
    }
    /** Release execution caps after Team disposal has drained child activations. */
    releaseWorkspaceCaps() {
        this.workspaceRuntime?.dispose();
    }
    /**
     * Hold a member's next step until its private-copy integration finishes.
     * @param agent - Member whose next step must wait.
     * @param signal - Cancellation while integration is pending.
     */
    async waitForIntegration(agent, signal) {
        const pending = this.integrations.get(agent.id);
        if (pending === undefined)
            return;
        const cancelled = Promise.withResolvers();
        const subscription = addAbortListener(signal, () => { cancelled.reject(signal.reason); });
        try {
            await Promise.race([pending, cancelled.promise]);
            signal.throwIfAborted();
        }
        finally {
            subscription[Symbol.dispose]();
        }
    }
    /**
     * Integrate one inactive member while preventing its next step from entering.
     * @param root - Exact Team Lead owning the shared workspace.
     * @param memberId - Member whose private changes are published.
     * @param signal - Cancellation before or during publication.
     * @param admitPath - Optional check applied to each changed path.
     * @param publication - Exact independently accepted artifact receipts.
     * @returns the recorded integration receipt.
     */
    async integrateWorkspace(root, memberId, signal, admitPath, publication) {
        return this.withInactiveWorkspace(root, memberId, signal, (runtime, workspace) => runtime.integrate(root, workspace, signal, admitPath, publication));
    }
    /**
     * Refresh a retained member's inputs while its next model step is held.
     * @param root - Exact owning Lead.
     * @param memberId - Inactive target member.
     * @param paths - Explicit existing relative input files.
     * @param signal - Goal and caller cancellation.
     * @returns refreshed file paths.
     */
    async refreshWorkspace(root, memberId, paths, signal) {
        return this.withInactiveWorkspace(root, memberId, signal, async (runtime, workspace) => ({ paths: await runtime.refresh(root, workspace, paths, signal) }));
    }
    async withInactiveWorkspace(root, memberId, signal, operation) {
        if (this.workspaceRuntime === undefined)
            throw new TeamError('Team member workspace isolation is disabled', 'TEAM_INVALID_ARGUMENT');
        const pending = this.integrations.get(memberId);
        if (pending !== undefined) {
            await pending;
            return await this.withInactiveWorkspace(root, memberId, signal, operation);
        }
        const released = Promise.withResolvers();
        this.integrations.set(memberId, released.promise);
        try {
            signal.throwIfAborted();
            const member = this.journal.state(root).members.find(candidate => candidate.id === memberId);
            if (member?.phase !== 'active' || member.workspace === undefined
                || availability(this.ctx.agents.get(memberId)) === 'running') {
                throw new TeamError('only an inactive isolated teammate can integrate. Read list_agents and team_workspace get; wait for its current turn to finish before publishing. Do not restart its task or retire it to bypass this check.', 'TEAM_MEMBER_NOT_READY');
            }
            return await operation(this.workspaceRuntime, member.workspace);
        }
        finally {
            this.integrations.delete(memberId);
            released.resolve();
        }
    }
    /**
     * Whether one roster child is retired or is crossing the retirement cutoff.
     * @param root - Exact Team Lead.
     * @param memberId - Member being checked.
     * @returns whether retirement blocks new work.
     */
    isRetiredOrRetiring(root, memberId) {
        return this.retiring.has(memberId)
            || this.journal.state(root).members.find(member => member.id === memberId)?.phase === 'retired';
    }
    /**
     * Deny direct Agent/LLM/tool entry for a retired Team child, including a cold-created Agent.
     * @param agent - Child attempting to run.
     * @returns denial reason, or undefined when the child may run.
     */
    retirementDenial(agent) {
        for (const root of this.ctx.agents.list()) {
            const state = this.journal.state(root);
            const member = state.members.find(candidate => candidate.id === agent.id);
            if (member === undefined || agent.session.header.parentSession !== (member.parentId ?? root.id))
                continue;
            let current = member;
            while (current !== undefined) {
                if (this.isRetiredOrRetiring(root, current.id))
                    return `Team member "${current.name}" is retired`;
                if (this.workspaceRuntime !== undefined && current.workspace === undefined) {
                    return `Team member "${current.name}" uses a legacy shared workspace and cannot run under workspace isolation`;
                }
                current = state.members.find(candidate => candidate.id === current?.parentId);
            }
            return undefined;
        }
        return undefined;
    }
    /** Resolve enablement from the root's live composition, including a blank-session preset change. */
    enabledMembership(membership) {
        if (this.enabledPresets.includes('*'))
            return membership;
        const { root } = membership;
        const preset = root.ctx.get('agentPresets')?.composedPreset(root.ctx) ?? root.session.header.agentPreset;
        return preset !== undefined && this.enabledPresets.includes(preset) ? membership : undefined;
    }
    /**
     * Resolve one exact live Agent's Team role.
     * @param agent - exact live Agent used as the authority credential.
     * @returns its root, Team identity, role, and model-facing name.
     */
    membership(agent) {
        const membership = this.tryMembership(agent);
        if (membership === undefined) {
            throw new TeamError(`agent "${agent.id}" is not a member of an active Agent Team`, 'TEAM_NOT_MEMBER');
        }
        return membership;
    }
    /**
     * Resolve a caller without throwing for scoped installation and lifecycle observers.
     * @param agent - candidate exact live Agent.
     * @returns Team membership, or undefined for non-Team subagents and stale identities.
     */
    tryMembership(agent) {
        if (this.ctx.agents.get(agent.id) !== agent)
            return undefined;
        try {
            // An ordinary seeded fork owns a new Team. Its parent may still be live,
            // but malformed parent Team state must not remove the fork's tools.
            if (agent.session.header.isSeeded && agent.session.header.origin !== 'subagent'
                && !this.subagentDescriptor(agent)) {
                return this.enabledMembership({ root: agent, id: TeamId(agent.id), role: 'lead', name: 'lead' });
            }
            let parentId = agent.session.header.parentSession;
            const seen = new Set([agent.id]);
            while (parentId !== undefined && !seen.has(parentId)) {
                seen.add(parentId);
                const root = this.ctx.agents.get(parentId);
                if (root !== undefined) {
                    const member = this.journal.state(root).members.find(candidate => candidate.id === agent.id);
                    if (member?.phase === 'active' || member?.phase === 'provisioning') {
                        if ((member.parentId ?? root.id) !== agent.session.header.parentSession)
                            return undefined;
                        return this.enabledMembership({ root, id: TeamId(root.id), role: 'teammate', name: member.name });
                    }
                    parentId = root.session.header.parentSession;
                }
                else {
                    break;
                }
            }
            // A continuation can briefly outlive its parent during child-first teardown.
            // Do not reinterpret that durable child as a new implicit root Team. A host-
            // resumed ordinary fork has no descriptor in its own suffix and remains a
            // valid new root whose inherited Team records stay outside its projected Team state.
            if (this.subagentDescriptor(agent))
                return undefined;
            return this.enabledMembership({ root: agent, id: TeamId(agent.id), role: 'lead', name: 'lead' });
        }
        catch {
            // This method is used by lifecycle observers and teardown discovery. A
            // malformed durable stream is surfaced by authoritative Team operations;
            // the non-throwing probe must not veto unrelated Agent lifecycle edges.
            return undefined;
        }
    }
    /**
     * Resolve the Team whose goal governs a member or an ordinary delegated descendant.
     * @param agent - Exact live caller, including legacy subagents.
     * @returns the ancestor membership without enrolling the descendant in its roster.
     */
    governingMembership(agent) {
        if (this.ctx.agents.get(agent.id) !== agent)
            return undefined;
        let current = agent;
        const seen = new Set();
        while (current !== undefined && !seen.has(current.id)) {
            seen.add(current.id);
            const membership = this.tryMembership(current);
            if (membership !== undefined)
                return membership;
            const parentId = current.session.header.parentSession;
            current = parentId === undefined ? undefined : this.ctx.agents.get(parentId);
        }
        return undefined;
    }
    /**
     * List the runtime-enriched roster visible to one Team member.
     * @param membership - exact caller membership resolved by this roster.
     * @returns Lead and teammate rows in creation order.
     */
    list(membership) {
        const { root } = membership;
        const state = this.journal.state(root);
        const result = [{
                id: root.id,
                name: 'lead',
                role: 'lead',
                status: availability(root),
                ...root.options.model === undefined ? {} : { model: root.options.model },
                diagnostics: [],
            }];
        for (const member of state.members) {
            const live = this.ctx.agents.get(member.id);
            const teamFunction = memberFunction(state, member);
            const route = state.modelRoutes?.find(candidate => candidate.memberId === member.id);
            const model = route?.model ?? live?.options.model ?? member.model ?? root.options.model;
            const parentName = member.parentId === undefined || member.parentId === root.id
                ? 'lead' : state.members.find(parent => parent.id === member.parentId)?.name;
            result.push({
                id: member.id,
                name: member.name,
                role: 'teammate',
                ...teamFunction === undefined ? {} : { teamFunction },
                ...memberRoleRevision(state, member.id) === 0 ? {} : { roleRevision: memberRoleRevision(state, member.id) },
                status: member.phase === 'retired'
                    ? 'retired'
                    : member.phase === 'failed'
                        ? 'failed'
                        : member.phase === 'provisioning'
                            ? 'provisioning'
                            : availability(live),
                description: member.description,
                provider: member.provider,
                context: member.context,
                parentId: member.parentId ?? root.id,
                ...parentName === undefined ? {} : { parentName },
                ...model === undefined ? {} : { model },
                ...(route?.modelProvider ?? member.modelProvider) === undefined
                    ? {} : { modelProvider: route?.modelProvider ?? member.modelProvider },
                ...(route?.reasoningEffort ?? (route === undefined ? member.reasoningEffort : undefined)) === undefined
                    ? {} : { reasoningEffort: route?.reasoningEffort ?? member.reasoningEffort },
                ...route === undefined ? {} : { modelRouteRevision: route.revision },
                ...member.persona === undefined ? {} : { persona: member.persona },
                ...member.expert === undefined ? {} : { expert: { ...member.expert } },
                diagnostics: [
                    ...member.error === undefined ? [] : [member.error],
                    ...this.workspaceRuntime !== undefined && member.phase === 'active' && member.workspace === undefined
                        ? ['Legacy shared workspace: this member cannot run until an isolated successor is created'] : [],
                ],
            });
        }
        return result;
    }
    /**
     * Read an existing member's next-request override from the Lead log.
     * @param agent - Exact live Team member.
     * @returns selected route, or undefined when the creation profile remains in use.
     */
    modelRouteFor(agent) {
        const membership = this.tryMembership(agent);
        if (membership?.role !== 'teammate')
            return undefined;
        const route = this.journal.state(membership.root).modelRoutes
            ?.find(candidate => candidate.memberId === agent.id);
        if (route === undefined)
            return undefined;
        return {
            provider: route.modelProvider,
            model: route.model,
            ...route.reasoningEffort === undefined ? {} : { reasoningEffort: ReasoningEffortId(route.reasoningEffort) },
        };
    }
    /**
     * Change the next-request route without replacing an existing member Session.
     * @param caller - Exact live Lead or direct parent.
     * @param request - Existing teammate and registered model selection.
     * @param signal - Cancellation before the durable route is committed.
     * @returns the updated roster row.
     */
    async configureModel(caller, request, signal) {
        if (this.lifecycle.disposed)
            throw new TeamError('Agent Teams service is disposing', 'TEAM_DISPOSED');
        const membership = this.membership(caller);
        const root = membership.root;
        const name = request.target.trim();
        const initial = this.journal.state(root).members.find(member => member.name === name);
        if (initial === undefined || initial.phase === 'failed' || initial.phase === 'provisioning') {
            throw new TeamError(`retained teammate "${name}" not found`, 'TEAM_MEMBER_NOT_FOUND');
        }
        this.assertMemberLifecycleAuthority(caller, root, initial);
        const expectedRevision = request.expectedRevision ?? this.journal.state(root).modelRoutes
            ?.find(route => route.memberId === initial.id)?.revision ?? 0;
        if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
            throw new TeamError('expected model revision must be a nonnegative safe integer', 'TEAM_INVALID_ARGUMENT');
        }
        const provider = requiredText(request.modelProvider, 'modelProvider', 200);
        const model = requiredText(request.model, 'model', 200);
        signal.throwIfAborted();
        let reasoningEffort = request.reasoningEffort;
        if (reasoningEffort === undefined) {
            const info = await caller.ctx.llm.resolveModelInfo(provider, model, signal);
            const rank = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'];
            reasoningEffort = info.reasoning?.efforts
                .filter(effort => rank.includes(effort.id))
                .sort((left, right) => rank.indexOf(right.id) - rank.indexOf(left.id))[0]?.id
                ?? info.reasoning?.defaultEffort;
        }
        const selected = await caller.ctx.llm.resolveCallConfig({
            provider, model,
            ...reasoningEffort === undefined ? {} : { reasoningEffort: ReasoningEffortId(reasoningEffort) },
        }, signal);
        await this.journal.transact(root.id, async () => {
            signal.throwIfAborted();
            const state = this.journal.state(root);
            const member = state.members.find(candidate => candidate.id === initial.id);
            if (member === undefined || member.phase === 'failed' || member.phase === 'provisioning') {
                throw new TeamError('teammate changed before model selection', 'TEAM_MEMBER_NOT_READY');
            }
            this.assertMemberLifecycleAuthority(caller, root, member);
            const prior = state.modelRoutes?.find(candidate => candidate.memberId === member.id);
            if ((prior?.revision ?? 0) !== expectedRevision) {
                throw new TeamError('model selection changed; read list_agents and retry with the current modelRouteRevision', 'TEAM_MEMBER_STALE_REVISION');
            }
            if (prior?.modelProvider === selected.provider && prior.model === selected.model
                && prior.reasoningEffort === selected.reasoningEffort)
                return;
            await this.journal.appendAndFlush(root, 'team/member-model-route', {
                version: 2,
                teamId: TeamId(root.id),
                route: {
                    ...state.goal === undefined ? {} : { goalRevision: state.goal.revision },
                    memberId: member.id,
                    revision: (prior?.revision ?? 0) + 1,
                    modelProvider: selected.provider,
                    model: selected.model,
                    ...selected.reasoningEffort === undefined ? {} : { reasoningEffort: selected.reasoningEffort },
                },
            });
        });
        const updated = this.list(membership).find(member => member.id === initial.id);
        if (updated === undefined)
            throw new TeamError('updated teammate is absent from the roster', 'TEAM_MEMBER_NOT_FOUND');
        return updated;
    }
    /**
     * Assign an inactive retained member a responsibility without changing its Session or persona.
     * @param caller - Exact live Lead or direct parent.
     * @param request - Expected role revision, responsibility, and recorded reason.
     * @param signal - Cancellation before durable publication.
     * @returns updated retained member.
     */
    async configureRole(caller, request, signal) {
        if (this.lifecycle.disposed)
            throw new TeamError('Agent Teams service is disposing', 'TEAM_DISPOSED');
        const membership = this.membership(caller);
        const root = membership.root;
        const parsed = teamMemberFunctionSchema.safeParse(request.teamFunction);
        if (!parsed.success || !Number.isSafeInteger(request.expectedRevision) || request.expectedRevision < 0) {
            throw new TeamError('configure_role requires a supported function and nonnegative expected_revision', 'TEAM_INVALID_ARGUMENT');
        }
        const reason = requiredText(request.reason, 'reason', 4096);
        await this.journal.transact(root.id, async () => {
            signal.throwIfAborted();
            const state = this.journal.state(root);
            const member = state.members.find(candidate => candidate.name === request.target.trim());
            if (member === undefined || !['active', 'retired'].includes(member.phase)) {
                throw new TeamError('configure_role requires an existing active or retired member', 'TEAM_MEMBER_NOT_FOUND');
            }
            this.assertMemberLifecycleAuthority(caller, root, member);
            if (availability(this.ctx.agents.get(member.id)) === 'running'
                || state.tasks.some(task => task.ownerId === member.id && task.status === 'in_progress'
                    && (task.work === undefined || task.work.plan.goalRevision === (state.goal?.revision ?? 0))
                    && task.work?.execution?.phase !== 'submitted')) {
                throw new TeamError('finish or release the current execution before changing responsibility', 'TEAM_MEMBER_NOT_READY');
            }
            const revision = memberRoleRevision(state, member.id);
            if (revision !== request.expectedRevision) {
                throw new TeamError(`role revision is ${revision}; read list_agents before configuring this member`, 'TEAM_MEMBER_STALE_REVISION');
            }
            if (memberFunction(state, member) === parsed.data)
                return;
            await this.journal.appendAndFlush(root, 'team/member-role', {
                version: 2, teamId: TeamId(root.id), role: {
                    ...state.goal === undefined ? {} : { goalRevision: state.goal.revision },
                    memberId: member.id, revision: revision + 1, teamFunction: parsed.data, reason,
                },
            });
        });
        const member = this.list(membership).find(candidate => candidate.name === request.target.trim());
        if (member === undefined)
            throw new TeamError('configured member is absent', 'TEAM_MEMBER_NOT_FOUND');
        return member;
    }
    /**
     * Create one named, continuable child of the calling Team member.
     * @param caller - exact live Team member.
     * @param request - name, responsibility, prompt, composition, model settings, and cancellation.
     * @returns the active roster row.
     */
    async spawn(caller, request) {
        if (this.lifecycle.disposed)
            throw new TeamError('Agent Teams service is disposing', 'TEAM_DISPOSED');
        const operation = this.spawnAdmitted(caller, request);
        this.inFlightCreations.add(operation);
        try {
            return await operation;
        }
        finally {
            this.inFlightCreations.delete(operation);
        }
    }
    /**
     * Locate the Team-local expert continuation, coalescing concurrent first assignments.
     * @param caller - Exact live Team member.
     * @param request - Expert reference and settings used only for first creation.
     * @returns the current member; an existing binding receives no new prompt.
     */
    async ensureExpert(caller, request) {
        request.signal.throwIfAborted();
        if (this.lifecycle.disposed)
            throw new TeamError('Agent Teams service is disposing', 'TEAM_DISPOSED');
        const membership = this.membership(caller);
        let creating = this.expertCreations.get(membership.root);
        const pending = creating?.get(request.expert.id);
        if (pending !== undefined) {
            const cancelled = Promise.withResolvers();
            const listener = addAbortListener(request.signal, () => { cancelled.reject(request.signal.reason); });
            try {
                const result = await Promise.race([pending, cancelled.promise]);
                request.signal.throwIfAborted();
                return { member: structuredClone(result.member), reused: true };
            }
            finally {
                listener[Symbol.dispose]();
            }
        }
        const existing = this.list(membership).find(member => member.expert?.id === request.expert.id && member.status !== 'failed');
        if (existing !== undefined)
            return { member: existing, reused: true };
        if (creating === undefined) {
            creating = new Map();
            this.expertCreations.set(membership.root, creating);
        }
        const operation = this.spawn(caller, request);
        creating.set(request.expert.id, operation);
        try {
            const result = await operation;
            return { member: result.member, reused: false };
        }
        finally {
            creating.delete(request.expert.id);
        }
    }
    /**
     * Return admitted creation operations captured for ordered disposal.
     * @returns detached snapshot ordered only by Set insertion.
     */
    pendingCreations() {
        return [...this.inFlightCreations];
    }
    /**
     * Reconcile provisioning state when one Team member Session starts.
     * @param agent - newly started exact live Agent.
     * @param signal - shared runtime cancellation.
     */
    async recoverFor(agent, signal) {
        signal.throwIfAborted();
        const membership = this.tryMembership(agent);
        if (membership?.role === 'lead') {
            if (this.workspaceRuntime !== undefined) {
                for (const member of this.journal.state(membership.root).members) {
                    if (member.phase === 'active' && member.workspace !== undefined)
                        this.restoreWorkspaceCap(membership.root, member.id);
                }
            }
            await this.reconcileProvisioning(membership.root, signal);
        }
    }
    /**
     * Retire an idle member while retaining its Session, identity, and private workspace.
     * @param caller - Exact live parent or Team Lead.
     * @param targetName - Durable member name.
     * @param signal - Cancellation before retirement commits.
     * @returns the retired roster row.
     */
    async retire(caller, targetName, signal) {
        const membership = this.membership(caller);
        const root = membership.root;
        const name = targetName.trim();
        const initial = this.journal.state(root).members.find(member => member.name === name);
        if (initial?.phase !== 'active')
            throw new TeamError(`active teammate "${name}" not found`, 'TEAM_MEMBER_NOT_FOUND');
        this.assertMemberLifecycleAuthority(caller, root, initial);
        if (this.retiring.has(initial.id))
            throw new TeamError('teammate retirement is already in progress', 'TEAM_MEMBER_NOT_READY');
        this.assertRetirable(root, initial);
        this.retiring.add(initial.id);
        try {
            const parent = this.ctx.agents.get(initial.parentId ?? root.id);
            if (this.ctx.agents.get(initial.id) !== undefined) {
                if (parent === undefined)
                    throw new TeamError('teammate parent is unavailable', 'TEAM_MEMBER_NOT_READY');
                await this.stopTeammates(parent, [initial.id]);
            }
            await this.journal.transact(root.id, async () => {
                signal.throwIfAborted();
                const current = this.journal.state(root).members.find(member => member.id === initial.id);
                if (current?.phase !== 'active')
                    throw new TeamError('teammate changed before retirement', 'TEAM_MEMBER_NOT_READY');
                this.assertRetirable(root, current);
                await this.journal.appendAndFlush(root, 'team/member-retirement', {
                    version: 2, teamId: TeamId(root.id), memberId: current.id, retired: true,
                });
            });
            const retired = this.list(membership).find(member => member.id === initial.id);
            if (retired === undefined)
                throw new TeamError('retired teammate is absent from the roster', 'TEAM_MEMBER_NOT_FOUND');
            return retired;
        }
        finally {
            this.retiring.delete(initial.id);
        }
    }
    /**
     * Reactivate one saved member without creating another Session or repeating its first prompt.
     * @param caller - Exact live parent or Team Lead.
     * @param targetName - Retired member name.
     * @param signal - Cancellation before reactivation commits.
     * @returns the active roster row.
     */
    async reactivate(caller, targetName, signal) {
        const membership = this.membership(caller);
        const root = membership.root;
        const name = targetName.trim();
        const initial = this.journal.state(root).members.find(member => member.name === name);
        if (initial?.phase !== 'retired')
            throw new TeamError(`retired teammate "${name}" not found`, 'TEAM_MEMBER_NOT_FOUND');
        this.assertMemberLifecycleAuthority(caller, root, initial);
        if (this.workspaceRuntime !== undefined)
            this.restoreWorkspaceCap(root, initial.id);
        await this.journal.transact(root.id, async () => {
            signal.throwIfAborted();
            const state = this.journal.state(root);
            const current = state.members.find(member => member.id === initial.id);
            if (current?.phase !== 'retired')
                throw new TeamError('teammate changed before reactivation', 'TEAM_MEMBER_NOT_READY');
            if (state.members.filter(member => member.phase === 'active' || member.phase === 'provisioning').length >= this.maxMembers) {
                throw new TeamError(`Team member limit ${this.maxMembers} reached`, 'TEAM_MEMBER_LIMIT');
            }
            this.ancestorIds(root, current.id);
            await this.journal.appendAndFlush(root, 'team/member-retirement', {
                version: 2, teamId: TeamId(root.id), memberId: current.id, retired: false,
            });
        });
        const active = this.list(membership).find(member => member.id === initial.id);
        if (active === undefined)
            throw new TeamError('reactivated teammate is absent from the roster', 'TEAM_MEMBER_NOT_FOUND');
        return active;
    }
    /** Authorize the Lead or the member's direct delegator. */
    assertMemberLifecycleAuthority(caller, root, member) {
        if (caller !== root && caller.id !== (member.parentId ?? root.id)) {
            throw new TeamError('only the Lead or direct parent can change a teammate lifecycle', 'TEAM_INVALID_TARGET');
        }
    }
    /** Check every durable and live obligation that prevents retirement. */
    assertRetirable(root, member) {
        const state = this.journal.state(root);
        const tasks = state.tasks.filter(task => task.ownerId === member.id && task.status === 'in_progress');
        const reviews = state.tasks.filter(task => task.reviewerId === member.id && task.work?.execution?.phase === 'submitted'
            && task.work.plan.goalRevision === (state.goal?.revision ?? 0));
        const messages = state.messages.filter(message => message.targetId === member.id && !state.delivered.includes(message.id));
        const children = state.members.filter(child => child.parentId === member.id
            && (child.phase === 'active' || child.phase === 'provisioning'));
        const blockers = {
            integrating: this.integrations.has(member.id), running: availability(this.ctx.agents.get(member.id)) === 'running',
            tasks: tasks.slice(0, 5).map(task => ({ id: task.id, revision: task.revision })), taskCount: tasks.length,
            reviews: reviews.slice(0, 5).map(task => task.id), reviewCount: reviews.length,
            pendingMessageCount: messages.length, children: children.slice(0, 5).map(child => child.name), childCount: children.length,
        };
        if (blockers.integrating || blockers.running || tasks.length > 0 || reviews.length > 0 || messages.length > 0 || children.length > 0) {
            throw new TeamError(`teammate has active work, messages, or descendants: ${JSON.stringify(blockers)}. `
                + 'Finish or explicitly release/reassign its tasks, complete or reassign submitted reviews, drain its accepted messages, and retire children first. Wait for running work and integration to settle; do not repeat retire unchanged. History is retained.', 'TEAM_MEMBER_NOT_READY');
        }
    }
    /**
     * Interrupt one live teammate turn without clearing its pending inbox.
     * @param caller - exact live Lead Agent.
     * @param targetName - durable teammate name.
     * @returns the target status sampled before cancellation.
     */
    interrupt(caller, targetName) {
        const membership = this.membership(caller);
        if (membership.role !== 'lead')
            throw new TeamError('only the Team Lead can interrupt teammates', 'TEAM_LEAD_REQUIRED');
        const state = this.journal.state(membership.root);
        const target = resolveActiveMember(membership.root, state, targetName);
        if (target.id === membership.root.id)
            throw new TeamError('the Team Lead cannot interrupt itself', 'TEAM_INVALID_TARGET');
        const live = this.ctx.agents.get(target.id);
        if (live === undefined)
            return { previousStatus: 'inactive' };
        const previousStatus = availability(live);
        this.ctx.subagents.interrupt(target.id, { kind: 'ancestor', agent: caller });
        return { previousStatus };
    }
    /**
     * Group live roster children by direct parent, with descendants drained before ancestors.
     * @returns parents and their resident roster children in teardown order.
     */
    liveChildrenByRoot() {
        const teams = new Map();
        for (const lead of this.ctx.agents.list()) {
            for (const member of this.journal.state(lead).members) {
                const agent = this.ctx.agents.get(member.id);
                const parentId = agent?.session.header.parentSession;
                if (parentId === undefined)
                    continue;
                const parent = this.ctx.agents.get(parentId);
                if (parent === undefined)
                    continue;
                const children = teams.get(parent) ?? [];
                children.push(member.id);
                teams.set(parent, children);
            }
        }
        const ranked = [...teams].map(([parent, children]) => {
            const membership = this.membership(parent);
            const depth = parent === membership.root ? 0 : this.ancestorIds(membership.root, parent.id).length + 1;
            return { parent, children, depth };
        });
        return new Map(ranked.sort((left, right) => right.depth - left.depth).map(({ parent, children }) => [parent, children]));
    }
    /**
     * Release exact teammate Activations through the continuation lifecycle owner.
     * @param root - exact live direct parent authorizing release.
     * @param childIds - selected roster child ids.
     */
    async stopTeammates(root, childIds) {
        await this.lifecycle.withTimeout(this.ctx.subagents.drainChildren(root, childIds));
    }
    /** Perform one creation admitted before the Team runtime disposal cutoff. */
    async spawnAdmitted(caller, request) {
        const membership = this.membership(caller);
        request = this.resolveSpawn?.(caller, request) ?? request;
        const ancestors = caller === membership.root ? [] : [...this.ancestorIds(membership.root, caller.id), caller.id];
        if (ancestors.length >= this.maxDepth) {
            throw new TeamError(`Team delegation depth cannot exceed ${this.maxDepth}`, 'TEAM_DEPTH_LIMIT');
        }
        const signal = AbortSignal.any([request.signal, this.lifecycle.signal]);
        signal.throwIfAborted();
        await this.awaitCallerPublication(caller, membership, signal);
        const root = membership.root;
        const name = this.memberName(request.name);
        const description = requiredText(request.description, 'description', 200);
        if (request.persona !== undefined && request.persona.trim().length === 0) {
            throw new TeamError('member persona must be non-empty when supplied', 'TEAM_INVALID_PERSONA');
        }
        const agentOptions = await this.resolveMemberOptions(caller, request.agentOptions, signal);
        signal.throwIfAborted();
        const childId = brandString(randomUUID());
        if (request.skills !== undefined && request.inheritSkillsFrom !== undefined) {
            throw new TeamError('select new skills or inherit a saved choice, not both', 'TEAM_SKILLS_INVALID');
        }
        const initialSkills = request.inheritSkillsFrom !== undefined
            ? this.copySkills(caller, request.inheritSkillsFrom, childId)
            : request.skills === undefined ? undefined : await this.prepareSkills(caller, childId, request.skills, signal);
        if (this.workspaceRuntime !== undefined && request.workspaceMode !== 'empty') {
            await this.workspaceRuntime.validateSelection(root, this.journal.state(root).goal?.definition.scope.execution, request.workingPaths, signal);
        }
        const member = {
            id: childId,
            parentId: caller.id,
            name,
            description,
            provider: requiredText(request.provider, 'provider', 200),
            context: request.context,
            phase: 'provisioning',
            ...request.teamFunction === undefined ? {} : { teamFunction: request.teamFunction },
            ...agentOptions?.provider === undefined ? {} : { modelProvider: agentOptions.provider },
            ...agentOptions?.model === undefined ? {} : { model: agentOptions.model },
            ...agentOptions?.reasoningEffort === undefined ? {} : { reasoningEffort: agentOptions.reasoningEffort },
            ...request.persona === undefined ? {} : { persona: request.persona },
            ...request.expert === undefined ? {} : { expert: { ...request.expert } },
        };
        await this.reserveMember(caller, root, member, initialSkills, signal, request);
        const publication = Promise.withResolvers();
        this.memberPublications.set(childId, publication.promise);
        try {
            return await this.activateMember(caller, root, member, request, agentOptions, signal, publication.resolve);
        }
        finally {
            publication.resolve();
            this.memberPublications.delete(childId);
        }
    }
    /** Persist the roster and initial choice before the continuation can accept work. */
    async reserveMember(caller, root, member, skills, signal, request) {
        const admission = { owned: false };
        try {
            await this.journal.transact(root.id, async () => {
                signal.throwIfAborted();
                if (this.membership(caller).root !== root)
                    throw new TeamError('caller changed Teams during member preparation', 'TEAM_NOT_MEMBER');
                const state = this.journal.state(root);
                this.resolveSpawn?.(caller, request);
                if (member.expert !== undefined && state.members.some(candidate => candidate.expert?.id === member.expert?.id && candidate.phase !== 'failed')) {
                    throw new TeamError('this expert already has a member in the Team', 'TEAM_EXPERT_ALREADY_ASSIGNED');
                }
                const previous = state.members.find(candidate => candidate.name === member.name);
                if (previous !== undefined) {
                    throw new TeamError(previous.phase === 'failed'
                        ? `teammate name "${member.name}" belongs to a failed creation and remains reserved; choose a new name to retry`
                        : `teammate name "${member.name}" was already used in this Team; reuse it with send_message or choose a new name`, 'TEAM_MEMBER_NAME_TAKEN');
                }
                if (state.members.filter(candidate => candidate.phase === 'active' || candidate.phase === 'provisioning').length >= this.maxMembers) {
                    throw new TeamError(`Team member limit ${this.maxMembers} reached`, 'TEAM_MEMBER_LIMIT');
                }
                if (skills !== undefined)
                    assertTeamSkillSelection({ ...state, members: [...state.members, member] }, skills);
                signal.throwIfAborted();
                admission.owned = true;
                await this.journal.appendAndFlush(root, 'team/member', { version: 2, teamId: TeamId(root.id), member });
                if (skills !== undefined) {
                    signal.throwIfAborted();
                    await this.journal.appendAndFlush(root, 'team/skills-selected', { version: 2, teamId: TeamId(root.id), selection: skills });
                }
            });
        }
        catch (error) {
            try {
                if (admission.owned && this.journal.state(root).members.find(candidate => candidate.id === member.id)?.phase === 'provisioning') {
                    await this.settleProvisioning(root, { ...member, phase: 'failed', error: errorMessage(error) });
                }
            }
            catch (recordError) {
                throw new AggregateError([error, recordError], 'member preparation and durable failure recording both failed');
            }
            throw error instanceof Error ? error : new TeamError(`Team member creation cancelled: ${errorMessage(error)}`, 'TEAM_CREATION_CANCELLED', { cause: error });
        }
    }
    /** A descendant requires its direct parent's committed active roster edge. */
    async awaitCallerPublication(caller, membership, signal) {
        if (membership.role === 'lead')
            return;
        const pending = this.memberPublications.get(caller.id);
        if (pending !== undefined) {
            const cancelled = Promise.withResolvers();
            const subscription = addAbortListener(signal, () => { cancelled.reject(signal.reason); });
            try {
                await Promise.race([pending, cancelled.promise]);
                signal.throwIfAborted();
            }
            finally {
                subscription[Symbol.dispose]();
            }
        }
        if (this.journal.state(membership.root).members.find(member => member.id === caller.id)?.phase !== 'active') {
            throw new TeamError('the delegating member has not completed Team registration', 'TEAM_MEMBER_NOT_READY');
        }
    }
    /** Establish the child and publish its active edge before releasing nested creation. */
    async activateMember(caller, root, member, request, agentOptions, signal, publish) {
        const { id: childId, name, description } = member;
        let preparedMember = member;
        let started;
        try {
            if (this.workspaceRuntime !== undefined) {
                const execution = this.journal.state(root).goal?.definition.scope.execution;
                const workspace = await this.workspaceRuntime.create(root, caller, childId, signal, execution, request.workingPaths, request.workspaceMode === 'empty');
                preparedMember = { ...member, workspace };
                await this.journal.transact(root.id, async () => {
                    signal.throwIfAborted();
                    const current = this.journal.state(root).members.find(candidate => candidate.id === childId);
                    if (current?.phase !== 'provisioning') {
                        throw new TeamError('Team member provisioning changed before workspace preparation', 'TEAM_PROVISIONING_CONFLICT');
                    }
                    await this.journal.appendAndFlush(root, 'team/member', {
                        version: 2, teamId: TeamId(root.id), member: preparedMember,
                    });
                });
            }
            started = await this.ctx.subagents.startActivation({
                delivery: 'caller',
                ...preparedMember.workspace === undefined ? {} : { workspaceCwd: preparedMember.workspace.cwd },
                childId,
                provider: request.provider,
                label: description,
                request: {
                    prompt: request.prompt,
                    parent: caller,
                    ...preparedMember.workspace === undefined ? {} : { cwd: preparedMember.workspace.cwd },
                    ...agentOptions === undefined ? {} : { agentOptions },
                },
                signal,
            });
            void started.result.catch(error => { this.ctx.logger.warn(`Team activation failed: ${errorMessage(error)}`); });
            await this.checkpointInitialPrompt(childId, started.messageId, signal);
        }
        catch (error) {
            publish();
            const failed = {
                ...preparedMember,
                phase: 'failed',
                error: errorMessage(error),
            };
            try {
                const phase = await this.settleProvisioning(root, failed);
                await this.stopTeammates(caller, [childId]);
                if (phase === 'active') {
                    throw new TeamError(`teammate "${name}" became active while its creator reported failure`, 'TEAM_PROVISIONING_CONFLICT', { cause: error });
                }
            }
            catch (recordError) {
                throw new AggregateError([error, recordError], 'teammate creation and durable failure recording both failed');
            }
            throw error instanceof Error ? error : new TeamError(`Team member creation cancelled: ${errorMessage(error)}`, 'TEAM_CREATION_CANCELLED', { cause: error });
        }
        const active = {
            ...preparedMember,
            phase: 'active',
        };
        // Once the continuation accepted its first prompt, it is a real child. If
        // this checkpoint fails, keep the in-memory active edge instead of inventing
        // an impossible active -> failed transition; restart reconciliation covers
        // the provisioning-only durable prefix.
        const settledPhase = await this.settleProvisioning(root, active);
        publish();
        if (settledPhase === 'failed') {
            const conflict = new TeamError(`teammate "${name}" was reconciled as failed while creation was in progress`, 'TEAM_PROVISIONING_CONFLICT');
            try {
                await this.stopTeammates(caller, [childId]);
            }
            catch (cleanupError) {
                /* v8 ignore next -- requires the independently tested HMR settlement conflict and cleanup failure together. */
                throw new AggregateError([conflict, cleanupError], 'provisioning conflict cleanup failed');
            }
            throw conflict;
        }
        return { member: this.memberView(active) };
    }
    /** Flush the accepted initial inbox item before the Lead can commit `active`. */
    async checkpointInitialPrompt(childId, messageId, signal) {
        while (true) {
            signal.throwIfAborted();
            const session = this.ctx.sessions.get(childId);
            if (session === undefined) {
                const stored = await readPersistedSession(this.ctx.sessionPersistence, childId, signal);
                const suffix = stored.events.slice(stored.inheritedEventCount);
                if (messageAccepted(suffix, message => message.id === messageId))
                    return;
                throw new TeamError(`teammate "${childId}" initial prompt was not durably accepted`, 'TEAM_PROVISIONING_CONFLICT');
            }
            const progress = Promise.withResolvers();
            // Abort can win while the durability flush is still pending; mark the
            // later-awaited rejection handled without changing its eventual result.
            void progress.promise.catch(() => undefined);
            const stopEvent = this.ctx.on('session/event', (candidate) => {
                if (candidate === session)
                    progress.resolve();
            });
            const stopDisposed = this.ctx.on('session/disposed', (candidate) => {
                if (candidate === session)
                    progress.resolve();
            });
            const onAbort = () => {
                const reason = signal.reason;
                progress.reject(reason instanceof Error
                    ? reason
                    : new TeamError(`teammate creation aborted: ${errorMessage(reason)}`, 'TEAM_DISPOSED'));
            };
            signal.addEventListener('abort', onAbort, { once: true });
            try {
                signal.throwIfAborted();
                await this.ctx.sessions.flush(session);
                // oxlint-disable-next-line typescript/no-deprecated -- Existing Session history read; migration deferred.
                const suffix = session.snapshotEvents(session.inheritedEventCount);
                if (messageAccepted(suffix, message => message.id === messageId))
                    return;
                if (this.ctx.sessions.get(childId) !== session)
                    continue;
                await progress.promise;
            }
            finally {
                signal.removeEventListener('abort', onAbort);
                stopDisposed();
                stopEvent();
            }
        }
    }
    /** Settle provisioning-only members from their independently durable child Sessions. */
    async reconcileProvisioning(root, signal) {
        const provisioning = this.journal.state(root).members.filter(member => member.phase === 'provisioning');
        for (const member of provisioning) {
            signal.throwIfAborted();
            // A live child means creation is still completing in this process. Its
            // creator owns the terminal member edge.
            if (this.ctx.agents.get(member.id) !== undefined)
                continue;
            let phase = 'failed';
            let failure = 'provisioning did not leave a resumable child Session';
            try {
                const loaded = await readPersistedSession(this.ctx.sessionPersistence, member.id, signal);
                const suffix = loaded.events.slice(loaded.inheritedEventCount);
                const descriptor = foldSubagentDescriptor(suffix);
                const acceptedInitialPrompt = messageAccepted(suffix, message => message.source.kind === 'user');
                if (loaded.header.parentSession === (member.parentId ?? root.id)
                    && descriptor?.mode === 'continuable'
                    && descriptor.provider === member.provider
                    && (this.workspaceRuntime === undefined || member.workspace !== undefined
                        && loaded.header.cwd === member.workspace.cwd)
                    && acceptedInitialPrompt) {
                    phase = 'active';
                }
                else {
                    failure = 'persisted child Session does not match the provisioned continuation';
                }
            }
            catch (error) {
                failure = `child Session recovery failed: ${errorMessage(error)}`;
            }
            signal.throwIfAborted();
            await this.journal.transact(root.id, async () => {
                signal.throwIfAborted();
                const current = this.journal.state(root).members.find(candidate => candidate.id === member.id);
                if (current?.phase !== 'provisioning')
                    return;
                const settled = {
                    ...current,
                    phase,
                    ...phase === 'failed' ? { error: failure } : {},
                };
                await this.journal.appendAndFlush(root, 'team/member', {
                    version: 2,
                    teamId: TeamId(root.id),
                    member: settled,
                });
            });
        }
    }
    /** Build one runtime member row after successful creation. */
    memberView(member) {
        const live = this.ctx.agents.get(member.id);
        return {
            id: member.id,
            ...member.parentId === undefined ? {} : { parentId: member.parentId },
            name: member.name,
            role: 'teammate',
            status: availability(live),
            description: member.description,
            provider: member.provider,
            context: member.context,
            ...member.modelProvider === undefined ? {} : { modelProvider: member.modelProvider },
            ...(live?.options.model ?? member.model) === undefined ? {} : { model: live?.options.model ?? member.model },
            ...member.reasoningEffort === undefined ? {} : { reasoningEffort: member.reasoningEffort },
            ...member.persona === undefined ? {} : { persona: member.persona },
            ...member.expert === undefined ? {} : { expert: { ...member.expert } },
            diagnostics: [],
        };
    }
    /** Validate explicit member settings before a durable roster name is reserved. */
    async resolveMemberOptions(parent, requested, signal) {
        const inherited = parentAgentOptionsForDelegation(parent);
        const provider = requested?.provider ?? inherited.provider;
        const model = requested?.model ?? inherited.model;
        if (provider === undefined || model === undefined) {
            if (requested === undefined)
                return undefined;
            throw new TeamError('member model selection requires a provider and model', 'TEAM_INVALID_MODEL');
        }
        const routeChanged = provider !== inherited.provider || model !== inherited.model;
        let reasoningEffort = requested?.reasoningEffort;
        if (reasoningEffort === undefined && this.defaultMemberReasoningEffort === 'highest') {
            const info = await parent.ctx.llm.resolveModelInfo(provider, model, signal);
            const rank = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'];
            reasoningEffort = info.reasoning?.efforts
                .filter(effort => rank.includes(effort.id))
                .sort((left, right) => rank.indexOf(right.id) - rank.indexOf(left.id))[0]?.id
                ?? info.reasoning?.defaultEffort;
        }
        reasoningEffort ??= routeChanged ? undefined : inherited.reasoningEffort;
        const maxTokens = requested?.maxTokens ?? (routeChanged ? undefined : inherited.maxTokens);
        return await parent.ctx.llm.resolveCallConfig({
            provider,
            model,
            ...reasoningEffort === undefined ? {} : { reasoningEffort },
            ...maxTokens === undefined ? {} : { maxTokens },
        }, signal);
    }
    /**
     * Read the ordered parent chain from the durable root roster.
     * @param root - exact live Team Lead.
     * @param targetId - rostered target whose parent chain is needed.
     * @returns intermediate member ids, excluding the Lead and target.
     */
    ancestorIds(root, targetId) {
        const state = this.journal.state(root);
        const result = [];
        const seen = new Set([targetId]);
        let member = state.members.find(candidate => candidate.id === targetId);
        if (member === undefined)
            throw new TeamError('target is not a Team member', 'TEAM_MEMBER_NOT_FOUND');
        let parentId = member.parentId ?? root.id;
        while (parentId !== root.id) {
            if (seen.has(parentId))
                throw new TeamError('Team parent chain contains a cycle', 'TEAM_INVALID_LINEAGE');
            seen.add(parentId);
            member = state.members.find(candidate => candidate.id === parentId);
            if (member?.phase !== 'active')
                throw new TeamError('Team parent is not active', 'TEAM_INVALID_LINEAGE');
            result.unshift(parentId);
            parentId = member.parentId ?? root.id;
        }
        return result;
    }
    /** Validate a never-reused model-facing teammate name. */
    memberName(value) {
        if (!MEMBER_NAME.test(value) || value.length > 64 || value === 'lead') {
            throw new TeamError('teammate name must be lower-kebab-case, at most 64 characters, and not "lead"', 'TEAM_INVALID_MEMBER_NAME');
        }
        return value;
    }
    /** Append one terminal provisioning edge unless recovery already settled it. */
    async settleProvisioning(root, terminal) {
        return this.journal.transact(root.id, async () => {
            const current = this.journal.state(root).members.find(member => member.id === terminal.id);
            /* v8 ignore next 3 -- the append-only provisioning event is committed by this operation before settlement. */
            if (current === undefined) {
                throw new TeamError(`provisioned teammate "${terminal.id}" disappeared`, 'TEAM_PROVISIONING_CONFLICT');
            }
            if (current.phase === 'retired')
                throw new TeamError('teammate retired during provisioning', 'TEAM_PROVISIONING_CONFLICT');
            if (current.phase !== 'provisioning')
                return current.phase;
            await this.journal.appendAndFlush(root, 'team/member', {
                version: 2,
                teamId: TeamId(root.id),
                member: terminal,
            });
            return terminal.phase === 'active' ? 'active' : 'failed';
        });
    }
    /** Whether a Session's own suffix identifies a provider-owned subagent child. */
    subagentDescriptor(agent) {
        // oxlint-disable-next-line typescript/no-deprecated -- Existing Session history read; migration deferred.
        return foldSubagentDescriptor(agent.session.snapshotEvents(agent.session.inheritedEventCount)) !== undefined;
    }
}
/** Turn availability is independent of whether the Agent is loaded. */
function availability(agent) {
    return agent?.status === 'running' ? 'running' : 'inactive';
}
