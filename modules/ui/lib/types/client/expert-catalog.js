/**
 * Bind catalog operations without changing the model or mode settings.
 * @param ctx - Client context declaring remote, remote.teamExperts, and remote.session.
 * @returns cancellable reads and revision-checked profile writes.
 */
export function createTeamExpertOperations(ctx) {
    return {
        async load(signal) {
            signal.throwIfAborted();
            const [profiles, models] = await Promise.all([ctx.remote.teamExperts.list(true), ctx.remote.session.modelCatalog()]);
            signal.throwIfAborted();
            if (!profiles.ok)
                throw profiles.error;
            if (!models.ok)
                throw models.error;
            return { profiles: profiles.value, models: models.value };
        },
        async save(definition, previous, archived, signal) {
            const result = previous === null
                ? await ctx.remote.teamExperts.create(definition, signal)
                : await ctx.remote.teamExperts.update(previous.id, previous.revision, definition, archived, signal);
            if (!result.ok)
                throw result.error;
            return result.value;
        },
    };
}
