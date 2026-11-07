/** Durable Team goal proposals, human reviews, and cancellation on accepted changes. */
import { UserQuestionError } from '@deepseek-ai/dsh-user-questions';
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol';
import { TeamError } from "./error.js";
import { TeamId } from "./types.js";
import { teamGoalChangeSchema } from "./goal-schema.js";
import { assertGoalProposal, applyGoalDecision } from "./goal-fold.js";
import { renderGoalReview } from "./goal-review-text.js";
import { readProjectPlan, validateTaskTransition } from "./project-plan.js";
/** User review is the only writer of confirmed goals; model services can only propose. */
export class TeamGoals {
    ctx;
    journal;
    roster;
    lifecycle;
    maxBytes;
    requireConfirmed;
    requireExecutionScope;
    requireStructuredPlans;
    planLimits;
    reviewing = new WeakSet();
    epochs = new Map();
    /**
     * @param ctx - Trusted Host context owning the human question provider.
     * @param journal - Serialized Team event writer.
     * @param roster - Exact live Team membership resolver.
     * @param lifecycle - Plugin disposal signal.
     * @param maxBytes - Maximum encoded goal proposal size.
     * @param requireConfirmed - Block delegation before the first user confirmation.
     * @param requireExecutionScope - Require structured resource rules for newly confirmed work.
     */
    constructor(ctx, journal, roster, lifecycle, maxBytes, requireConfirmed, requireExecutionScope, requireStructuredPlans = false, planLimits) {
        this.ctx = ctx;
        this.journal = journal;
        this.roster = roster;
        this.lifecycle = lifecycle;
        this.maxBytes = maxBytes;
        this.requireConfirmed = requireConfirmed;
        this.requireExecutionScope = requireExecutionScope;
        this.requireStructuredPlans = requireStructuredPlans;
        this.planLimits = planLimits;
        ctx.on('agent/disposed', ({ agent }) => {
            this.epochs.get(agent)?.controller.abort(new TeamError('Team Lead disposed', 'TEAM_DISPOSED'));
            this.epochs.delete(agent);
        });
        ctx.effect(() => () => {
            for (const epoch of this.epochs.values())
                epoch.controller.abort(new TeamError('Team goals disposed', 'TEAM_DISPOSED'));
            this.epochs.clear();
        }, 'agentTeams.goalEpochs');
    }
    /**
     * Read detached goal records visible to every member.
     * @param caller - Exact live Team member.
     * @returns confirmed goal, latest proposal, and its latest review outcome.
     */
    read(caller) {
        const state = this.journal.state(this.roster.membership(caller).root);
        return structuredClone({
            ...state.goal === undefined ? {} : { goal: state.goal },
            ...state.goalProposal === undefined ? {} : { goalProposal: state.goalProposal },
            ...state.goalDecision === undefined ? {} : { goalDecision: state.goalDecision },
        });
    }
    /**
     * Save a complete proposal without changing the current execution goal.
     * @param caller - Exact live Lead.
     * @param request - Both current revisions and the complete proposed change.
     * @param signal - Caller cancellation before the write is admitted.
     * @returns the committed pending proposal.
     */
    async propose(caller, request, signal) {
        const root = this.requireLead(caller);
        const parsed = teamGoalChangeSchema.safeParse(request.change);
        if (!parsed.success)
            throw new RemoteError('TEAM_GOAL_INVALID', `目标提案字段无效：${parsed.error.issues.map(issue => `${issue.path.join('.') || 'scope.execution'}: ${issue.message}`).join('; ')}`, {
                fields: parsed.error.issues.map(issue => issue.path.join('.')),
            });
        if (this.requireExecutionScope && parsed.data.kind === 'replace' && parsed.data.definition.scope.execution === undefined) {
            throw new RemoteError('TEAM_GOAL_INVALID', 'this Team requires explicit file, web and program execution scope', { fields: ['scope.execution'] });
        }
        if (Buffer.byteLength(JSON.stringify(parsed.data), 'utf8') > this.maxBytes) {
            throw new RemoteError('TEAM_GOAL_TOO_LARGE', `goal proposal exceeds ${this.maxBytes} bytes`, { maxBytes: this.maxBytes });
        }
        if (parsed.data.kind === 'replace' && this.requireStructuredPlans) {
            try {
                const plan = readProjectPlan(parsed.data.definition.plan);
                if (plan === undefined)
                    throw new Error('plan must be a JSON project plan with members, tasks, resources, reviewPolicy, previousTasks and recovery; use team_help start');
                validateTaskTransition(this.journal.state(root), plan);
                const limits = this.planLimits;
                if (limits !== undefined) {
                    for (const member of plan.members) {
                        let depth = 1;
                        let parent = member.parent;
                        while (parent !== 'lead') {
                            depth++;
                            parent = plan.members.find(candidate => candidate.name === parent).parent;
                        }
                        if (depth > limits.depth)
                            throw new Error(`member ${member.name} exceeds the configured delegation depth ${limits.depth}`);
                    }
                    if (plan.version === 2 && plan.automation?.provision === 'on-demand') {
                        if (!limits.automatic)
                            throw new Error('on-demand provisioning is disabled; enable autoProvisionPlannedMembers or propose manual automation');
                        if (this.ctx.subagents.getProvider(limits.provider) === undefined)
                            throw new Error(`planned member provider ${limits.provider} is not registered`);
                    }
                }
                if (limits !== undefined && (plan.resources.maxMembers > limits.members
                    || plan.resources.maxConcurrentRequests > limits.requests || plan.tasks.length > limits.tasks
                    || plan.members.some(member => member.skills.length > limits.skills))) {
                    throw new Error('project plan exceeds the configured member, request, task or per-member skill budget');
                }
                for (const member of plan.members)
                    await caller.ctx.llm.resolveCallConfig({ provider: member.modelProvider,
                        model: member.model, reasoningEffort: member.reasoningEffort }, signal);
                const modules = new Map();
                for (const name of new Set(plan.members.flatMap(member => member.skills))) {
                    const resolved = await this.ctx.waterfall('team/resolve-skill', { agent: caller, name, signal }, () => Promise.reject(new Error(`no installed skill provider resolves ${name}; use team_skill_catalog`)));
                    modules.set(name, Buffer.byteLength(resolved.content, 'utf8'));
                }
                const moduleBytes = (name) => {
                    const bytes = modules.get(name);
                    if (bytes === undefined)
                        throw new Error(`missing resolved skill ${name}`);
                    return bytes;
                };
                if (limits !== undefined && plan.members.some(member => member.skills.reduce((bytes, name) => bytes + moduleBytes(name), 0) > limits.skillBytes)) {
                    throw new Error('project skill selection exceeds the configured instruction byte budget; choose smaller stage-specific modules');
                }
            }
            catch (error) {
                throw new RemoteError('TEAM_GOAL_INVALID', error instanceof Error ? error.message : String(error), { fields: ['plan'] });
            }
        }
        return await this.journal.transact(root.id, async () => {
            signal.throwIfAborted();
            this.lifecycle.signal.throwIfAborted();
            this.requireLead(caller);
            const state = this.journal.state(root);
            if (request.expectedProposalRevision !== (state.goalProposal?.revision ?? 0)
                || request.expectedGoalRevision !== (state.goal?.revision ?? 0)) {
                throw this.stale(root);
            }
            const revision = request.expectedProposalRevision + 1;
            if (!Number.isSafeInteger(revision) || revision < 1)
                throw new RemoteError('TEAM_GOAL_REVISION_LIMIT', 'goal proposal revision limit reached', {});
            const proposal = { revision, baseRevision: request.expectedGoalRevision, proposedBy: caller.id, change: parsed.data };
            assertGoalProposal(state, proposal);
            await this.journal.appendAndFlush(root, 'team/goal-proposed', { version: 2, teamId: TeamId(root.id), proposal });
            return structuredClone(proposal);
        });
    }
    /**
     * Ask the human to review one exact persisted proposal; missing answers never grant authority.
     * @param caller - Exact live Lead; children must relay questions to it.
     * @param proposalRevision - Proposal currently displayed for review.
     * @param signal - Caller cancellation, including cancellation while waiting for an answer.
     * @returns committed review state, or a stale-review error without changing the goal.
     */
    async review(caller, proposalRevision, signal) {
        const root = this.requireLead(caller);
        if (this.reviewing.has(root))
            throw new RemoteError('TEAM_GOAL_REVIEW_PENDING', 'a goal review is already awaiting the user', {});
        const questions = this.ctx.get('userQuestions');
        if (questions === undefined)
            throw new RemoteError('TEAM_GOAL_NO_REVIEWER', 'a user question provider is required to confirm this goal', {});
        const proposal = this.reviewable(root, proposalRevision);
        const approve = proposal.change.kind === 'replace' ? 'Confirm this goal and scope' : 'Revoke this goal';
        const questionId = `team-goal-${proposal.revision}`;
        this.reviewing.add(root);
        try {
            const combined = AbortSignal.any([signal, this.lifecycle.signal]);
            const answer = await questions.ask({
                agent: caller, signal: combined,
                questions: [{
                        id: questionId,
                        question: 'Review the Team goal, named targets, actions, and acceptance criteria.',
                        detail: renderGoalReview(proposal, this.journal.state(root).goal),
                        options: [{ label: approve }, { label: 'Request changes' }],
                        intent: { kind: 'plan-review', approve },
                    }],
            }).catch((error) => {
                if (error instanceof UserQuestionError && error.code === 'NO_PROVIDER') {
                    throw new RemoteError('TEAM_GOAL_NO_REVIEWER', 'no human question answerer is available', {}, { cause: error });
                }
                throw error;
            });
            const matching = answer.answers.filter(item => item.id === questionId);
            const selected = matching.length === 1 ? matching[0] : undefined;
            const accepted = selected?.selected.length === 1 && selected.selected[0] === approve && !selected.custom?.trim();
            await this.journal.transact(root.id, async () => {
                combined.throwIfAborted();
                this.requireLead(caller);
                this.reviewable(root, proposalRevision);
                const decision = {
                    proposalRevision, outcome: accepted ? 'accepted' : 'rejected',
                    comment: selected?.custom ?? '', decidedAt: Date.now(), channel: 'user-question',
                };
                applyGoalDecision(this.journal.state(root), decision);
                // Establish the old epoch before the committed decision can advance it.
                this.epoch(root);
                try {
                    await this.journal.appendAndFlush(root, 'team/goal-decided', { version: 2, teamId: TeamId(root.id), decision });
                }
                finally {
                    // A failed flush does not undo an already appended in-memory decision.
                    this.epoch(root);
                }
            });
            return this.read(caller);
        }
        finally {
            this.reviewing.delete(root);
        }
    }
    /**
     * Check current Team execution admission without interpreting target strings as a sandbox.
     * @param root - Exact live Team Lead.
     * @returns a denial reason, or undefined when execution can proceed.
     */
    denial(root) {
        const goal = this.journal.state(root).goal;
        if (goal?.status === 'revoked')
            return `Team goal revision ${goal.revision} was revoked by the user; request a new user review.`;
        if (goal === undefined && this.requireConfirmed) {
            return 'Team delegation requires a user-confirmed goal and scope. Lead: call team_help({topic:"start"}), then team_goal({action:"read"}); submit the complete proposal with action "submit" to open user confirmation.';
        }
        return undefined;
    }
    /**
     * Capture cancellation for operations admitted under the current goal revision.
     * @param root - Exact live Team Lead.
     * @param signal - Caller-owned cancellation signal.
     * @returns a signal aborted by caller, plugin disposal, or an accepted goal change.
     */
    admit(root, signal) {
        const denied = this.denial(root);
        if (denied !== undefined)
            throw new TeamError(denied, 'TEAM_GOAL_NOT_ACTIVE');
        return this.capture(root, signal);
    }
    /**
     * Bind cancellation to a revision without granting execution admission.
     * @param root - Exact live Team Lead.
     * @param signal - Caller-owned cancellation.
     * @returns cancellation for this revision, including Lead work before a first confirmation.
     */
    capture(root, signal) {
        return AbortSignal.any([signal, this.lifecycle.signal, this.epoch(root).controller.signal]);
    }
    /** Exact Lead identity cannot be replaced with an object carrying the same id. */
    requireLead(caller) {
        const membership = this.roster.membership(caller);
        if (membership.role !== 'lead')
            throw new TeamError('only the Team Lead may propose or request a goal review', 'TEAM_LEAD_REQUIRED');
        return membership.root;
    }
    /** A response applies only to the proposal and goal the user actually saw. */
    reviewable(root, revision) {
        const state = this.journal.state(root);
        const proposal = state.goalProposal;
        if (proposal === undefined || proposal.revision !== revision || proposal.baseRevision !== (state.goal?.revision ?? 0)
            || state.goalDecision?.proposalRevision === revision) {
            throw this.stale(root);
        }
        return structuredClone(proposal);
    }
    /** Report the revisions the editor must show before requesting another review. */
    stale(root) {
        const state = this.journal.state(root);
        return new RemoteError('TEAM_GOAL_STALE', 'goal or proposal changed; review the latest values', {
            goalRevision: state.goal?.revision ?? 0, proposalRevision: state.goalProposal?.revision ?? 0,
        });
    }
    /** Rotate cancellation once per accepted revision while keeping durable inboxes. */
    epoch(root) {
        const revision = this.journal.state(root).goal?.revision ?? 0;
        const prior = this.epochs.get(root);
        if (prior?.revision === revision)
            return prior;
        const epoch = { revision, controller: new AbortController() };
        this.epochs.set(root, epoch);
        if (prior !== undefined) {
            const reason = `Team goal changed from revision ${prior.revision} to ${revision}`;
            prior.controller.abort(new TeamError(reason, 'TEAM_GOAL_CHANGED'));
            for (const member of this.journal.state(root).members) {
                this.ctx.agents.get(member.id)?.cancel({ kind: 'hook', reason }, { keepInbox: true });
            }
        }
        return epoch;
    }
}
