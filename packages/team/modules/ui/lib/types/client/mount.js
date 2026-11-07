/** Source-safe Agent Teams browser registration. */
import { TeamAction } from "./TeamAction.js";
import { en, NS, zh } from "./locales.js";
import { createTeamRoleOperations } from "./role-settings.js";
import { createTeamExpertOperations } from "./expert-catalog.js";
import { createTeamGoalOperations } from "./goal-operations.js";
import { createTeamMailboxOperations } from "./mailbox-operations.js";
import { createTeamMemberOperations } from "./member-operations.js";
import { createTeamTaskOperations } from "./task-operations.js";
import { TeamView } from "./TeamView.js";
import { selectTeam } from "./team-view-data.js";
import { createTeamProjectionRecovery } from "./projection-recovery-store.js";
/** Required browser services for navigation, slots, and localized copy. */
export const inject = ['sessions', 'uiWorkspace', 'slots', 'locale', 'remote', 'remote.settings', 'remote.session', 'remote.teamExperts', 'remote.agentTeams'];
/**
 * Register Team dictionaries, the header action, and the conversation view.
 * Both views read the Lead Session's `agentTeam` projection from the shared
 * Session store and request a missing cold baseline when opened.
 * @param ctx - Client Context carrying the injected navigation, locale, slot, and Session services.
 */
export function registerAgentTeamUi(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'client-ui-agent-team: dictionaries');
    const t = ctx.locale.bind(NS);
    // The Team Remote imports Host Session types; this browser service uses the Client Session face.
    const sessions = ctx.sessions;
    const leadSessionId = (sessionId) => {
        const state = sessions.list.getSnapshot();
        const team = selectTeam(state, sessionId, sessions.subagentAddress(sessionId)?.parentSessionId);
        const knownLead = team?.members.find(member => member.role === 'lead')?.id;
        if (knownLead !== undefined)
            return knownLead;
        let current = sessionId;
        const seen = new Set();
        while (!seen.has(current)) {
            seen.add(current);
            const parent = sessions.subagentAddress(current)?.parentSessionId;
            if (parent === undefined)
                break;
            current = parent;
        }
        return current;
    };
    const recovery = createTeamProjectionRecovery(leadSessionId, async (sessionId, signal) => {
        const result = await ctx.remote.session.projections({ sessionId }, signal);
        if (!result.ok)
            throw new Error(result.error.message);
        return result.value?.values.agentTeam;
    });
    ctx.effect(() => () => { recovery.dispose(); }, 'teamUI.projectionRecovery');
    const actions = {
        useRecoveredTeam: recovery.useRecoveredTeam,
        async refreshTeam(sessionId, force = false) {
            await sessions.refreshProjections(leadSessionId(sessionId));
            if (force || selectTeam(sessions.list.getSnapshot(), sessionId, sessions.subagentAddress(sessionId)?.parentSessionId) === undefined) {
                await recovery.refresh(sessionId);
            }
        },
        roles: createTeamRoleOperations(ctx),
        experts: createTeamExpertOperations(ctx),
        goals: createTeamGoalOperations(ctx, leadSessionId),
        mailbox: createTeamMailboxOperations(ctx, leadSessionId),
        members: createTeamMemberOperations(ctx, leadSessionId),
        taskArchive: createTeamTaskOperations(ctx, leadSessionId),
        openTeammate(sessionId, childSessionId) {
            const parentSessionId = leadSessionId(sessionId);
            if ((sessions.retainInfo(sessionId).getSnapshot().retainedBy.mainView ?? 0) === 0)
                return;
            if (childSessionId === parentSessionId) {
                ctx.uiWorkspace.openSession(parentSessionId);
                return;
            }
            ctx.uiWorkspace.openSession({
                parentSessionId: sessions.list.getSnapshot().projectionsBySession[parentSessionId]?.values.agentTeam
                    ?.members.find(member => member.id === childSessionId)?.parentId ?? parentSessionId,
                childSessionId,
                ...sessions.subagentAddress(childSessionId) ?? { mode: 'continuable' },
            });
        },
    };
    ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
        name: 'conversation.session.header.actions',
        id: 'agent-team',
        order: -20,
        locale: NS,
        inject: () => actions,
    }, TeamAction));
    ctx.slots.inject('conversation.view', () => ctx.slots.register({
        name: 'conversation.view',
        id: 'agent-team',
        order: 5,
        locale: NS,
        label: () => t('view.title'),
        inject: () => actions,
    }, TeamView));
}
