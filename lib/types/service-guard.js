const missing = 'Team runtime is unavailable; restore the Team plugin before continuing this retained Team. No substitute task was dispatched.';
const ownsTeam = (events) => events.some(event => event.type.startsWith('team/'));
/** Mount independent lifecycle and tool guards; unloading the runtime cannot remove this guard. */
export function installTeamServiceGuard(ctx) {
    const known = new WeakSet();
    const liveLinked = (agent) => {
        if (known.has(agent))
            return true;
        const seen = new Set();
        let current = agent;
        while (current !== undefined && !seen.has(current.id)) {
            seen.add(current.id);
            if (ownsTeam(current.session.snapshotEvents())) {
                known.add(agent);
                return true;
            }
            const parent = current.session.header.parentSession;
            current = parent === undefined ? undefined : ctx.agents.get(parent);
        }
        return false;
    };
    const linked = async (agent, signal) => {
        if (liveLinked(agent))
            return true;
        let parent = agent.session.header.parentSession;
        const seen = new Set([agent.id]);
        while (parent !== undefined) {
            if (seen.has(parent))
                throw new Error('Cannot verify Team ancestry: cyclic parent records');
            seen.add(parent);
            const handle = await ctx.sessionPersistence.open(parent, 'read', { signal });
            try {
                const { events } = await handle.read(undefined, undefined, { signal });
                if (ownsTeam(events)) {
                    known.add(agent);
                    return true;
                }
                parent = handle.header.parentSession;
            }
            finally {
                await handle.close();
            }
        }
        return false;
    };
    ctx.on('agent/pre-step', async ({ agent, signal }, next) => {
        if (ctx.get('agentTeams') === undefined) {
            if (await linked(agent, signal))
                throw new Error(missing);
        }
        else if (!known.has(agent))
            await linked(agent, signal);
        if (known.has(agent) && ctx.get('agentTeams') === undefined)
            throw new Error(missing);
        return next();
    });
    ctx.effect(() => ctx.tools.guard(exec => exec.agent !== undefined && ctx.get('agentTeams') === undefined && liveLinked(exec.agent)
        ? missing : undefined), 'team: retained-session guard');
}
