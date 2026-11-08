/** Durable Team mailbox admission, target-local dispatch, acknowledgement, and recovery. */
import { memberFunction, memberRoleRevision } from "./member-role.js";
import { randomUUID } from 'node:crypto';
import { brandString } from '@deepseek-ai/dsh-brand';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { SubagentError } from '@deepseek-ai/dsh-subagent';
import { steerHostSubagentPrompt } from 'dsh-team-workbench/compat-subagent/internal';
import { errorMessage, TeamError } from "./error.js";
import { readPersistedSession } from "./persisted.js";
import { resolveActiveMember } from "./roster.js";
import { messageAccepted } from "./session-message.js";
import { taskReady } from "./task-view.js";
import { hasAdviserRevisionRequest, hasDualAdviserApproval } from "./advisers.js";
import { TeamId, TeamMessageId } from "./types.js";
/** Owns every process-local state transition for the durable Team mailbox. */
export class TeamMailbox {
    ctx;
    journal;
    roster;
    lifecycle;
    maxPendingMessagesPerMember;
    maxMessageBytes;
    goals;
    retryInitialMs;
    retryMaxMs;
    retryMaxAttempts;
    dispatchTails = new Map();
    inFlightMessages = new Set();
    inFlightDispatches = new Set();
    capacityWaits = new Map();
    retries = new Map();
    failures = new Map();
    capacityRetryScheduled = false;
    /**
     * @param ctx - Team service context with Agent, Session, persistence, and subagent services.
     * @param journal - authoritative Lead-log transaction owner.
     * @param roster - Team membership and member-name resolver.
     * @param lifecycle - shared Team runtime admission cutoff.
     * @param maxPendingMessagesPerMember - per-target queued-minus-delivered limit.
     * @param maxMessageBytes - maximum complete sender-framed delivery size.
     * @param goals - Current user goal admission and revision cancellation.
     * @param retryInitialMs - delay after the first transient delivery failure.
     * @param retryMaxMs - upper bound for transient delivery retry delay.
     */
    constructor(ctx, journal, roster, lifecycle, maxPendingMessagesPerMember, maxMessageBytes, goals, retryInitialMs, retryMaxMs, retryMaxAttempts) {
        this.ctx = ctx;
        this.journal = journal;
        this.roster = roster;
        this.lifecycle = lifecycle;
        this.maxPendingMessagesPerMember = maxPendingMessagesPerMember;
        this.maxMessageBytes = maxMessageBytes;
        this.goals = goals;
        this.retryInitialMs = retryInitialMs;
        this.retryMaxMs = retryMaxMs;
        this.retryMaxAttempts = retryMaxAttempts;
        ctx.on('agent/disposed', ({ agent }) => {
            for (const [targetId, wait] of this.capacityWaits) {
                if (wait.root === agent)
                    this.capacityWaits.delete(targetId);
            }
            for (const [targetId, retry] of this.retries) {
                if (retry.root === agent)
                    this.clearRetry(targetId);
            }
        });
        this.lifecycle.signal.addEventListener('abort', () => {
            for (const targetId of this.retries.keys())
                this.clearRetry(targetId);
        }, { once: true });
    }
    /**
     * Queue one durable peer message, then attempt immediate delivery.
     * @param caller - exact live sending Team member.
     * @param request - target name, content, and pre-queue cancellation.
     * @returns durable message identity and immediate-delivery observation.
     */
    async send(caller, request) {
        if (this.lifecycle.disposed)
            throw new TeamError('Agent Teams service is disposing', 'TEAM_DISPOSED');
        const operation = this.sendAdmitted(caller, {
            ...request,
            signal: AbortSignal.any([request.signal, this.lifecycle.signal]),
        });
        return await this.trackDispatch(operation);
    }
    /**
     * Deliver one host-owned notice to the Lead without exposing self-messaging to models.
     * @param root - Exact live Lead owning the approved goal.
     * @param messageId - Stable program-owned identity used across restart and repeated dispatch.
     * @param content - Logged diagnostic or accepted-delivery summary.
     * @param signal - Cancellation tied to the current goal and runtime.
     * @returns the existing or newly queued notice receipt.
     */
    async sendNotice(root, messageId, content, signal) {
        if (this.lifecycle.disposed)
            throw new TeamError('Agent Teams service is disposing', 'TEAM_DISPOSED');
        const membership = this.roster.membership(root);
        if (membership.role !== 'lead')
            throw new TeamError('host notices require the exact Lead', 'TEAM_LEAD_REQUIRED');
        return await this.trackDispatch(this.sendAdmitted(root, { target: 'lead', content,
            signal: AbortSignal.any([signal, this.lifecycle.signal]) }, undefined, undefined, messageId));
    }
    /**
     * Queue one task execution notification under a stable message id. Recovery can
     * repeat this call without waking the member for the same execution twice.
     * @param root - Exact live Team Lead.
     * @param request - Target and concise task reference.
     * @param messageId - Deterministic identity of the assigned execution.
     * @param taskId - Task that still owns the execution.
     * @param executionId - Execution that still belongs to the target.
     * @param kind - Execute, adviser opinion, or independent submitted-result review.
     * @param adviserRoleRevision - Role version that must still apply when an advisory notification is delivered.
     * @returns the original or newly queued message status.
     */
    async sendTask(root, request, messageId, taskId, executionId, kind, adviserRoleRevision) {
        if (this.lifecycle.disposed)
            throw new TeamError('Agent Teams service is disposing', 'TEAM_DISPOSED');
        return await this.trackDispatch(this.sendAdmitted(root, {
            ...request, signal: AbortSignal.any([request.signal, this.lifecycle.signal]),
        }, undefined, { messageId, taskId, executionId, kind, ...adviserRoleRevision === undefined ? {} : { adviserRoleRevision } }));
    }
    /**
     * Observe target-side durable receipts and checkpoint their Lead-log acknowledgement.
     * @param session - exact target Session receiving the event.
     * @param event - newly appended Session event.
     */
    observeSessionEvent(session, event) {
        if (this.lifecycle.disposed || event.type !== 'user/message' || event.data.source.kind !== 'team-message')
            return;
        const source = event.data.source;
        const acknowledgement = Promise.resolve().then(async () => {
            const root = this.ctx.agents.get(brandString(source.teamId));
            if (root !== undefined)
                await this.checkpointDelivered(root, session, source.messageId);
        }).catch((error) => {
            this.ctx.logger.warn(`Team message "${source.messageId}" acknowledgement failed: ${errorMessage(error)}`);
        });
        void this.trackDispatch(acknowledgement);
    }
    /**
     * Retry durable pending messages relevant to one started Team member.
     * @param agent - newly started exact live Agent.
     * @param signal - shared runtime cancellation.
     */
    async recoverFor(agent, signal) {
        signal.throwIfAborted();
        const membership = this.roster.tryMembership(agent);
        if (membership === undefined)
            return;
        const state = this.journal.state(membership.root);
        const messages = state.messages.filter(message => !state.delivered.includes(message.id)
            && this.currentMessage(state, message)
            && (membership.role === 'lead' || message.targetId === agent.id));
        const latestByTarget = new Map(messages.map(message => [message.targetId, message]));
        for (const message of latestByTarget.values()) {
            signal.throwIfAborted();
            await this.tryDispatch(membership.root, message, signal);
        }
    }
    /**
     * List durable messages with process-local retry observations for one Team.
     * @param caller - Exact live Team member.
     * @returns ordered message summaries without bodies.
     */
    list(caller) {
        const { root } = this.roster.membership(caller);
        const state = this.journal.state(root);
        return state.messages.map((message) => {
            const retry = this.retries.get(message.targetId);
            const error = retry?.messageId === message.id ? retry.error : this.failures.get(message.id);
            const delivered = state.delivered.includes(message.id);
            const current = this.currentMessage(state, message);
            const status = delivered ? 'delivered' : !current ? 'quarantined'
                : retry?.messageId === message.id && retry.failures === this.retryMaxAttempts ? 'retry-exhausted' : 'pending';
            return {
                id: message.id, senderId: message.senderId, senderName: message.senderName,
                targetId: message.targetId,
                ...message.goalRevision === undefined ? {} : { goalRevision: message.goalRevision },
                ...message.adoptedFrom === undefined ? {} : { adoptedFrom: message.adoptedFrom },
                status, attempts: retry?.messageId === message.id ? retry.failures : 0,
                ...error === undefined ? {} : { error },
                ...retry?.messageId !== message.id || retry.nextAttemptAt === undefined ? {} : { nextAttemptAt: retry.nextAttemptAt },
            };
        });
    }
    /**
     * Return one bounded newest-first mailbox page without message bodies.
     * @param caller - Exact live Team member.
     * @param offset - Number of newer messages to skip.
     * @param limit - Page length from one through fifty.
     * @returns page items and total message count.
     */
    listPage(caller, offset, limit) {
        if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
            throw new TeamError('mailbox page offset must be nonnegative and limit must be 1 through 50', 'TEAM_INVALID_ARGUMENT');
        }
        const messages = this.list(caller);
        return { total: messages.length, items: messages.reverse().slice(offset, offset + limit) };
    }
    /**
     * Read one complete durable item only when the caller selects its id.
     * @param caller - Exact live Team member.
     * @param messageId - Saved message identity.
     * @returns detached message with its complete content.
     */
    get(caller, messageId) {
        const { root } = this.roster.membership(caller);
        const message = this.journal.state(root).messages.find(candidate => candidate.id === messageId);
        if (message === undefined)
            throw new TeamError(`Team message "${messageId}" not found`, 'TEAM_MESSAGE_NOT_FOUND');
        return structuredClone(message);
    }
    /**
     * Explicitly retry one current, undelivered message after transient failures.
     * @param caller - Exact live Team member.
     * @param messageId - Saved message identity.
     * @param signal - Cancellation while attempting delivery.
     * @returns message identity and immediate delivery status.
     */
    async retry(caller, messageId, signal) {
        const { root } = this.roster.membership(caller);
        signal.throwIfAborted();
        const state = this.journal.state(root);
        const message = state.messages.find(candidate => candidate.id === messageId);
        if (message === undefined)
            throw new TeamError(`Team message "${messageId}" not found`, 'TEAM_MESSAGE_NOT_FOUND');
        if (!this.currentMessage(state, message))
            throw new TeamError('historical Team message requires Lead adoption', 'TEAM_MESSAGE_QUARANTINED');
        if (state.delivered.includes(messageId))
            return { messageId, status: 'accepted' };
        this.clearRetry(message.targetId);
        const accepted = await this.tryDispatch(root, message, signal);
        return { messageId, status: accepted ? 'accepted' : 'queued' };
    }
    /**
     * Requeue historical content under the current goal on explicit Lead authority.
     * @param caller - Exact live Team Lead.
     * @param messageId - Historical source message.
     * @param signal - Cancellation before admission or delivery.
     * @returns new message identity and immediate delivery status.
     */
    async adopt(caller, messageId, signal) {
        const membership = this.roster.membership(caller);
        if (membership.role !== 'lead')
            throw new TeamError('only the Team Lead may adopt historical mail', 'TEAM_LEAD_REQUIRED');
        const root = membership.root;
        signal.throwIfAborted();
        const original = this.journal.state(root).messages.find(message => message.id === messageId);
        if (original === undefined)
            throw new TeamError(`Team message "${messageId}" not found`, 'TEAM_MESSAGE_NOT_FOUND');
        if (this.currentMessage(this.journal.state(root), original))
            throw new TeamError('Team message already belongs to the current goal', 'TEAM_MESSAGE_CURRENT');
        const target = original.targetId === root.id ? 'lead'
            : this.journal.state(root).members.find(member => member.id === original.targetId)?.name;
        if (target === undefined)
            throw new TeamError('historical Team message target no longer exists', 'TEAM_MEMBER_NOT_FOUND');
        return await this.trackDispatch(this.sendAdmitted(root, {
            target, content: original.content, signal: AbortSignal.any([signal, this.lifecycle.signal]),
        }, messageId));
    }
    /**
     * Wake capacity-blocked deliveries after an independent reservation returns its slot.
     * @param childId - child whose creation or residence reservation ended.
     */
    capacityReleased(childId) {
        if (this.lifecycle.disposed)
            return;
        for (const wait of this.capacityWaits.values()) {
            // A failed descendant resume can release its own restored ancestors;
            // those releases do not make that same descendant runnable.
            if (!wait.chain.has(childId))
                wait.retry = true;
        }
        this.scheduleCapacityRetry();
    }
    /**
     * Whether this exact live Lead has mail waiting for resident activation capacity.
     * @param root - Exact Team Lead.
     * @returns whether a delivery waits for capacity.
     */
    hasCapacityWait(root) {
        return [...this.capacityWaits.values()].some(wait => wait.root === root && wait.blocked);
    }
    /**
     * Whether an automatic delivery timer can produce the next Team change.
     * @param root - Exact Team Lead.
     * @returns whether a delivery retry is scheduled.
     */
    hasScheduledRetry(root) {
        return [...this.retries.values()].some(retry => retry.root === root && retry.timer !== undefined);
    }
    /** Coalesce release notifications without reconciling unrelated roster provisioning. */
    scheduleCapacityRetry() {
        if (this.capacityRetryScheduled || ![...this.capacityWaits.values()].some(wait => wait.blocked && wait.retry))
            return;
        this.capacityRetryScheduled = true;
        queueMicrotask(() => {
            this.capacityRetryScheduled = false;
            if (this.lifecycle.disposed) {
                this.capacityWaits.clear();
                return;
            }
            for (const wait of this.capacityWaits.values()) {
                if (!wait.blocked || !wait.retry)
                    continue;
                if (this.ctx.agents.get(wait.root.id) !== wait.root || this.roster.tryMembership(wait.root) === undefined) {
                    this.capacityWaits.delete(wait.targetId);
                    continue;
                }
                const state = this.journal.state(wait.root);
                const message = state.messages.find(candidate => candidate.targetId === wait.targetId
                    && this.currentMessage(state, candidate) && !state.delivered.includes(candidate.id));
                if (message === undefined) {
                    this.capacityWaits.delete(wait.targetId);
                    continue;
                }
                if (this.inFlightMessages.has(message.id))
                    continue;
                wait.retry = false;
                void this.tryDispatch(wait.root, message, this.lifecycle.signal);
            }
        });
    }
    /**
     * Return admitted dispatch and acknowledgement operations captured for disposal.
     * @returns detached snapshot ordered only by Set insertion.
     */
    pendingDispatches() {
        return [...this.inFlightDispatches];
    }
    /** Queue and dispatch one mailbox item admitted before the disposal cutoff. */
    async sendAdmitted(caller, request, adoptedFrom, taskDispatch, noticeId) {
        const membership = this.roster.membership(caller);
        request.signal.throwIfAborted();
        const root = membership.root;
        const content = structuredClone(request.content);
        const queued = await this.journal.transact(root.id, async () => {
            request.signal.throwIfAborted();
            const exact = this.roster.membership(caller);
            if (exact.root !== root || exact.name !== membership.name) {
                throw new TeamError('sending Team member is no longer live', 'TEAM_NOT_MEMBER');
            }
            const state = this.journal.state(root);
            const target = resolveActiveMember(root, state, request.target);
            if (noticeId !== undefined) {
                if (caller !== root || target.id !== root.id)
                    throw new TeamError('host notice target must be the Lead', 'TEAM_LEAD_REQUIRED');
                const existing = state.messages.find(candidate => candidate.id === noticeId);
                if (existing !== undefined) {
                    if (existing.targetId !== root.id || existing.goalRevision !== (state.goal?.revision ?? 0)) {
                        throw new TeamError('host notice identity belongs to another goal', 'TEAM_MESSAGE_ID_CONFLICT');
                    }
                    return { message: existing, dispatch: state.delivered.includes(existing.id)
                            ? Promise.resolve(true) : this.tryDispatch(root, existing, this.lifecycle.signal) };
                }
            }
            if (taskDispatch !== undefined) {
                const task = state.tasks.find(candidate => candidate.id === taskDispatch.taskId);
                const adviser = state.members.find(candidate => candidate.id === target.id);
                const advised = taskDispatch.kind === 'advice'
                    && memberRoleRevision(state, target.id) === (taskDispatch.adviserRoleRevision ?? 0) && task?.work?.plan.adviserGate === 'dual'
                    && adviser?.phase === 'active' && (memberFunction(state, adviser) === 'planning_adviser'
                    || memberFunction(state, adviser) === 'quality_adviser');
                const expectedTarget = taskDispatch.kind === 'execute' ? task?.ownerId : taskDispatch.kind === 'review'
                    ? task?.reviewerId : advised ? target.id : undefined;
                if (state.goal === undefined || task?.status !== 'in_progress' || task.autoDispatch !== true
                    || task.work?.execution?.id !== taskDispatch.executionId
                    || task.work.execution.phase !== (taskDispatch.kind === 'execute' ? 'running' : 'submitted')
                    || expectedTarget !== target.id
                    || taskDispatch.kind === 'review' && task.work.plan.adviserGate === 'dual'
                        && !hasDualAdviserApproval(state, task) && !hasAdviserRevisionRequest(state, task)
                    || task.work.plan.goalRevision !== state.goal.revision || !taskReady(state, task)) {
                    throw new TeamError('task execution changed before automatic dispatch', 'TEAM_TASK_EXECUTION_STALE');
                }
                const existing = state.messages.find(candidate => candidate.id === taskDispatch.messageId);
                if (existing !== undefined) {
                    if (existing.targetId !== target.id || existing.goalRevision !== state.goal.revision) {
                        throw new TeamError('task notification identity belongs to another execution', 'TEAM_MESSAGE_ID_CONFLICT');
                    }
                    return { message: existing, dispatch: state.delivered.includes(existing.id)
                            ? Promise.resolve(true) : this.tryDispatch(root, existing, this.lifecycle.signal) };
                }
            }
            if (adoptedFrom !== undefined) {
                const original = state.messages.find(candidate => candidate.id === adoptedFrom);
                if (original === undefined || this.currentMessage(state, original) || original.targetId !== target.id) {
                    throw new TeamError('historical message or target changed before adoption', 'TEAM_MESSAGE_QUARANTINED');
                }
                const existing = state.messages.find(candidate => candidate.adoptedFrom === adoptedFrom
                    && this.currentMessage(state, candidate));
                if (existing !== undefined) {
                    return { message: existing, dispatch: this.tryDispatch(root, existing, this.lifecycle.signal) };
                }
            }
            if (target.id === caller.id && adoptedFrom === undefined && noticeId === undefined) {
                throw new TeamError('a Team member cannot message itself', 'TEAM_SELF_MESSAGE');
            }
            const pendingForTarget = state.messages.filter(candidate => candidate.targetId === target.id && this.currentMessage(state, candidate)
                && !state.delivered.includes(candidate.id)).length;
            if (pendingForTarget >= this.maxPendingMessagesPerMember) {
                throw new TeamError(`teammate "${target.name}" has ${pendingForTarget} pending messages`, 'TEAM_MAILBOX_FULL');
            }
            const queued = {
                ...request.cooldownProvider === undefined ? {} : { cooldownProvider: request.cooldownProvider },
                ...request.notBefore === undefined ? {} : { notBefore: request.notBefore },
                id: noticeId ?? taskDispatch?.messageId ?? TeamMessageId(`team-message-${randomUUID()}`),
                ...taskDispatch === undefined ? {} : { taskDispatch: {
                        taskId: taskDispatch.taskId, executionId: taskDispatch.executionId, kind: taskDispatch.kind,
                        ...taskDispatch.adviserRoleRevision === undefined ? {} : { adviserRoleRevision: taskDispatch.adviserRoleRevision },
                    } },
                senderId: caller.id,
                senderName: membership.name,
                targetId: target.id,
                content,
                goalRevision: state.goal?.revision ?? 0,
                ...adoptedFrom === undefined ? {} : { adoptedFrom },
            };
            if (Buffer.byteLength(JSON.stringify(this.deliveryContent(queued)), 'utf8') > this.maxMessageBytes) {
                throw new TeamError(`team message exceeds ${this.maxMessageBytes} bytes`, 'TEAM_MESSAGE_TOO_LARGE');
            }
            await this.journal.appendAndFlush(root, 'team/message/queued', {
                version: 2,
                teamId: TeamId(root.id),
                message: queued,
            });
            // Register dispatch before releasing the root transaction so concurrent
            // senders enter the target-local queue in durable mailbox order.
            return { message: queued, dispatch: this.tryDispatch(root, queued, this.lifecycle.signal) };
        });
        const accepted = await queued.dispatch;
        return { messageId: queued.message.id, status: accepted ? 'accepted' : 'queued' };
    }
    /** Attempt one queued message exactly once in this process at a time. */
    tryDispatch(root, message, signal) {
        if (this.lifecycle.disposed)
            return Promise.resolve(false);
        if (this.goals.denial(root) !== undefined)
            return Promise.resolve(false);
        if (!this.currentMessage(this.journal.state(root), message))
            return Promise.resolve(false);
        if (this.inFlightMessages.has(message.id))
            return Promise.resolve(false);
        this.inFlightMessages.add(message.id);
        const operation = this.trackDispatch(this.tryDispatchAdmitted(root, message, AbortSignal.any([signal, this.lifecycle.signal])));
        const forget = (accepted) => {
            this.inFlightMessages.delete(message.id);
            if (accepted) {
                this.failures.delete(message.id);
                this.clearRetry(message.targetId);
            }
            else if (!this.capacityWaits.get(message.targetId)?.blocked && !signal.aborted) {
                this.scheduleRetry(root, message.targetId, message.id);
            }
            this.scheduleCapacityRetry();
        };
        void operation.then(forget, () => {
            this.inFlightMessages.delete(message.id);
            if (!signal.aborted)
                this.scheduleRetry(root, message.targetId, message.id);
        });
        return operation;
    }
    /** Retry a target's oldest current message without requiring another Team event. */
    scheduleRetry(root, targetId, failedId) {
        if (this.lifecycle.disposed || this.ctx.agents.get(root.id) !== root)
            return;
        const state = this.journal.state(root);
        const oldest = state.messages.find(message => message.targetId === targetId
            && this.currentMessage(state, message) && !state.delivered.includes(message.id));
        if (oldest === undefined || this.capacityWaits.get(targetId)?.blocked)
            return;
        const prior = this.retries.get(targetId);
        if (prior?.timer !== undefined)
            return;
        const failures = prior?.messageId === oldest.id ? prior.failures + 1 : 1;
        const retry = {
            root, targetId, messageId: oldest.id, failures,
            error: this.failures.get(oldest.id) ?? this.failures.get(failedId)
                ?? `delivery attempt for ${failedId} did not complete`,
        };
        this.retries.set(targetId, retry);
        if (failures >= this.retryMaxAttempts) {
            this.ctx.logger.warn(`Team message "${oldest.id}" automatic retry limit reached; retry it explicitly`);
            return;
        }
        const delay = Math.min(2_147_483_647, Math.max(this.deliveryDeadline(root, oldest) - Date.now(), Math.min(this.retryMaxMs, this.retryInitialMs * 2 ** Math.min(failures - 1, 30))));
        retry.nextAttemptAt = Date.now() + delay;
        retry.timer = setTimeout(() => {
            delete retry.timer;
            delete retry.nextAttemptAt;
            if (this.retries.get(targetId) !== retry || this.lifecycle.disposed)
                return;
            const latest = this.journal.state(root);
            const pending = latest.messages.filter(candidate => candidate.targetId === targetId
                && this.currentMessage(latest, candidate) && !latest.delivered.includes(candidate.id));
            const newest = pending.at(-1);
            if (newest === undefined || pending[0]?.id !== retry.messageId) {
                this.clearRetry(targetId);
                return;
            }
            void this.tryDispatch(root, newest, this.lifecycle.signal);
        }, delay);
    }
    /** Release one target timer and its process-local failure observations. */
    clearRetry(targetId) {
        const retry = this.retries.get(targetId);
        if (retry?.timer !== undefined)
            clearTimeout(retry.timer);
        this.retries.delete(targetId);
    }
    /** Old or superseded goal messages stay in history without executing. */
    currentMessage(state, message) {
        if (message.goalRevision === undefined || message.goalRevision !== (state.goal?.revision ?? 0)
            || state.goal?.status === 'revoked')
            return false;
        if (message.taskDispatch === undefined)
            return true;
        const task = state.tasks.find(candidate => candidate.id === message.taskDispatch?.taskId);
        const kind = message.taskDispatch.kind;
        const adviser = state.members.find(candidate => candidate.id === message.targetId);
        const advised = kind === 'advice'
            && memberRoleRevision(state, message.targetId) === (message.taskDispatch.adviserRoleRevision ?? 0) && task?.work?.plan.adviserGate === 'dual'
            && adviser?.phase === 'active' && (memberFunction(state, adviser) === 'planning_adviser'
            || memberFunction(state, adviser) === 'quality_adviser');
        return task?.autoDispatch === true && task.status === 'in_progress'
            && task.work?.execution?.id === message.taskDispatch.executionId
            && task.work.execution.phase === (kind === 'execute' ? 'running' : 'submitted')
            && (kind === 'execute' ? task.ownerId : kind === 'review' ? task.reviewerId : advised ? message.targetId : undefined)
                === message.targetId
            && (kind !== 'review' || task.work.plan.adviserGate !== 'dual' || hasDualAdviserApproval(state, task) || hasAdviserRevisionRequest(state, task))
            && taskReady(state, task);
    }
    deliveryDeadline(root, message) {
        const state = this.journal.state(root);
        const route = state.modelRoutes?.find(candidate => candidate.memberId === message.targetId)?.modelProvider
            ?? state.members.find(candidate => candidate.id === message.targetId)?.modelProvider;
        return message.cooldownProvider !== undefined && route !== undefined && route !== message.cooldownProvider
            ? 0 : message.notBefore ?? 0;
    }
    /** Track one dispatch transaction through delivery admission or contained failure. */
    trackDispatch(operation) {
        this.inFlightDispatches.add(operation);
        void operation.then(() => {
            this.inFlightDispatches.delete(operation);
        }, () => {
            this.inFlightDispatches.delete(operation);
        });
        return operation;
    }
    /** Attempt one queued message admitted before the service lifecycle cutoff. */
    async tryDispatchAdmitted(root, message, signal) {
        return await this.serializeDispatch(message, () => this.dispatchThrough(root, message, signal));
    }
    /** Serialize delivery admission for one durable target in queued order. */
    async serializeDispatch(message, operation) {
        const targetId = message.targetId;
        const prior = this.dispatchTails.get(targetId) ?? Promise.resolve();
        /* v8 ignore next -- dispatch tails absorb rejection, so the recovery callback is a fail-safe backstop. */
        const run = prior.then(operation, operation);
        /* v8 ignore next -- dispatchOnce contains delivery failures and serializeDispatch itself does not throw. */
        const tail = run.then(() => undefined, () => undefined);
        this.dispatchTails.set(targetId, tail);
        try {
            return await run;
        }
        finally {
            if (this.dispatchTails.get(targetId) === tail)
                this.dispatchTails.delete(targetId);
        }
    }
    /** Deliver every pending target message through `message` in durable queue order. */
    async dispatchThrough(root, message, signal) {
        const state = this.journal.state(root);
        const pending = state.messages.filter(candidate => candidate.targetId === message.targetId && this.currentMessage(state, candidate)
            && !state.delivered.includes(candidate.id));
        const requested = pending.findIndex(candidate => candidate.id === message.id);
        if (requested < 0)
            return state.delivered.includes(message.id);
        for (const candidate of pending.slice(0, requested + 1)) {
            const ownsInFlight = !this.inFlightMessages.has(candidate.id);
            if (ownsInFlight)
                this.inFlightMessages.add(candidate.id);
            try {
                if (!await this.dispatchOnce(root, candidate, signal))
                    return false;
            }
            finally {
                if (ownsInFlight)
                    this.inFlightMessages.delete(candidate.id);
            }
        }
        return true;
    }
    /** Attempt one queued delivery after target-local ordering admits it. */
    async dispatchOnce(root, message, signal) {
        let capacityWait;
        try {
            if (!this.currentMessage(this.journal.state(root), message))
                return false;
            if (this.deliveryDeadline(root, message) > Date.now())
                return false;
            const target = message.targetId === root.id ? root : this.ctx.agents.get(message.targetId);
            if (target !== undefined && this.targetRecorded(target.session, message.id)) {
                return await this.checkpointDelivered(root, target.session, message.id);
            }
            signal = this.goals.admit(root, signal);
            if (!this.currentMessage(this.journal.state(root), message))
                return false;
            const source = {
                kind: 'team-message',
                teamId: TeamId(root.id),
                messageId: message.id,
                senderId: message.senderId,
                senderName: message.senderName,
            };
            const content = this.deliveryContent(message);
            if (message.targetId === root.id) {
                const input = createUserMessage({ content, source });
                root.steer(input);
                return await this.checkpointDelivered(root, root.session, message.id);
            }
            if (target === undefined) {
                const recorded = await this.persistedTargetRecorded(message.targetId, message.id, signal);
                if (recorded === undefined)
                    return false;
                if (recorded) {
                    await this.markDelivered(root, message.id, message.targetId);
                    return true;
                }
            }
            const ancestors = this.roster.ancestorIds(root, message.targetId);
            for (const memberId of [...ancestors, message.targetId])
                this.roster.restoreWorkspaceCap(root, memberId);
            capacityWait = {
                root, targetId: message.targetId, chain: new Set([...ancestors, message.targetId]), blocked: false, retry: false,
            };
            this.capacityWaits.set(message.targetId, capacityWait);
            await steerHostSubagentPrompt(this.ctx.subagents, root, message.targetId, content, source, signal, ancestors);
            return target === undefined
                ? true
                : await this.checkpointDelivered(root, target.session, message.id);
        }
        catch (error) {
            if (capacityWait !== undefined && !this.lifecycle.disposed && this.ctx.agents.get(root.id) === root
                && error instanceof SubagentError && error.code === 'ACTIVATION_LIMIT_REACHED') {
                capacityWait.blocked = true;
            }
            this.ctx.logger.warn(`team message "${message.id}" remains queued: ${errorMessage(error)}`);
            this.failures.set(message.id, errorMessage(error));
            return false;
        }
        finally {
            if (capacityWait !== undefined && !capacityWait.blocked && this.capacityWaits.get(message.targetId) === capacityWait) {
                this.capacityWaits.delete(message.targetId);
            }
        }
    }
    /** Flush one live target receipt before the Lead records its delivered edge. */
    async checkpointDelivered(root, target, messageId) {
        await this.ctx.sessions.flush(target);
        if (!this.targetRecorded(target, messageId))
            return false;
        await this.markDelivered(root, messageId, target.id);
        return true;
    }
    /** Record delivery unless the acknowledgement already exists. */
    async markDelivered(root, messageId, targetId) {
        await this.journal.transact(root.id, async () => {
            const state = this.journal.state(root);
            if (state.delivered.includes(messageId))
                return;
            const queued = state.messages.find(message => message.id === messageId);
            if (queued === undefined || queued.targetId !== targetId)
                return;
            await this.journal.appendAndFlush(root, 'team/message/delivered', {
                version: 2,
                teamId: TeamId(root.id),
                messageId,
                targetId,
            });
        });
    }
    /** Whether a target Session already contains the durable message identity. */
    targetRecorded(session, messageId) {
        // oxlint-disable-next-line typescript/no-deprecated -- Existing Session history read; migration deferred.
        const suffix = session.snapshotEvents(session.inheritedEventCount);
        return messageAccepted(suffix, message => message.source.kind === 'team-message'
            && message.source.messageId === messageId);
    }
    /** Frame peer content with stable sender and message identity for the receiving model. */
    deliveryContent(message) {
        return [
            { type: 'text', text: `Team message ${message.id} from ${message.senderName}:` },
            ...structuredClone(message.content),
        ];
    }
    /** Read an inactive target's durable log before cold resume; uncertainty keeps the mailbox queued. */
    async persistedTargetRecorded(targetId, messageId, signal) {
        try {
            const stored = await readPersistedSession(this.ctx.sessionPersistence, targetId, signal);
            const suffix = stored.events.slice(stored.inheritedEventCount);
            return messageAccepted(suffix, message => message.source.kind === 'team-message'
                && message.source.messageId === messageId);
        }
        catch (error) {
            this.ctx.logger.warn(`cannot read Team message target "${targetId}": ${errorMessage(error)}`);
            this.failures.set(messageId, errorMessage(error));
            return undefined;
        }
    }
}
