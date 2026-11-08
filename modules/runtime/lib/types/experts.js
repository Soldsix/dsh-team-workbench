var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
/** Optional durable expert catalog and Team-local continuation assignment plugin. */
import { randomUUID } from 'node:crypto';
import { Service } from '@deepseek-ai/cordis';
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm';
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { expertDefinitionSchema, teamExpertDomainSpec } from "./expert-spec.js";
import { TeamExpertId } from "./expert-types.js";
export { TeamExpertId } from "./expert-types.js";
/**
 * Parse a complete expert definition received from a model or client.
 * @param input - Untrusted JSON-decoded profile fields.
 * @returns the validated definition with trimmed identifiers.
 */
export function parseTeamExpertDefinition(input) {
    const parsed = expertDefinitionSchema.safeParse(input);
    if (!parsed.success) {
        throw new RemoteError('team-expert/invalid-profile', 'expert profile fields are invalid', {
            fields: parsed.error.issues.map(issue => issue.path.join('.')),
        });
    }
    return parsed.data;
}
/** Durable expert profiles; assignment never rewrites an existing member's persona. */
let TeamExpertService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _list_decorators;
    let _get_decorators;
    let _create_decorators;
    let _update_decorators;
    return class TeamExpertService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _list_decorators = [Remote('list')];
            _get_decorators = [Remote('get')];
            _create_decorators = [Remote('create')];
            _update_decorators = [Remote('update')];
            __esDecorate(this, null, _list_decorators, { kind: "method", name: "list", static: false, private: false, access: { has: obj => "list" in obj, get: obj => obj.list }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _get_decorators, { kind: "method", name: "get", static: false, private: false, access: { has: obj => "get" in obj, get: obj => obj.get }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: obj => "create" in obj, get: obj => obj.create }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _update_decorators, { kind: "method", name: "update", static: false, private: false, access: { has: obj => "update" in obj, get: obj => obj.update }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static inject = ['agents', 'agentTeams', 'storageDomain', 'llm'];
        table = __runInitializers(this, _instanceExtraInitializers);
        constructor(ctx) {
            super(ctx, 'teamExperts');
        }
        /** Open the authoritative catalog before publishing the service. */
        async [Service.init]() {
            const domain = await this.ctx.storageDomain.open(teamExpertDomainSpec);
            this.ctx.effect(() => () => domain.close(), 'teamExperts.domainClose');
            this.table = domain.table('experts');
        }
        /**
         * Read the catalog without resolving models or starting turns.
         * @param includeArchived - Include profiles hidden from normal assignment.
         * @returns detached profiles in stable creation order.
         */
        list(includeArchived) {
            const actor = this.ctx.agents.currentInitiator();
            const membership = actor === undefined ? undefined : this.ctx.agentTeams.membership(actor);
            return [...this.table.entries()]
                .filter(([, value]) => includeArchived || !value.archived)
                .filter(([, value]) => membership === undefined || value.ownerTeamId === undefined || value.ownerTeamId === membership.root.id)
                .map(([id, value]) => ({ id, ...structuredClone(value) }))
                .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
        }
        /**
         * Read one profile, including an archived profile.
         * @param id - Stable catalog identity.
         * @returns a detached profile; missing identities throw.
         */
        get(id) {
            const record = this.table.get(id);
            if (record === undefined)
                throw new RemoteError('team-expert/not-found', `expert "${id}" not found`, { expertId: id });
            this.assertReader(id, record, this.ctx.agents.currentInitiator());
            return { id, ...structuredClone(record) };
        }
        /**
         * Save a new reusable role without generating a model response.
         * @param definition - Validated full role definition.
         * @param signal - Cancellation before the durable write is admitted.
         * @returns the committed revision-one profile.
         */
        async create(definition, signal) {
            const actor = this.ctx.agents.currentInitiator();
            const copy = parseTeamExpertDefinition(definition);
            await this.validateRoute(copy, signal);
            signal.throwIfAborted();
            const ownership = actor === undefined ? {} : {
                ownerTeamId: this.ctx.agentTeams.membership(actor).root.id,
                ownerMemberId: actor.id,
            };
            const id = TeamExpertId(randomUUID());
            const now = Date.now();
            const record = { definition: copy, revision: 1, createdAt: now, updatedAt: now, archived: false,
                ...ownership };
            await this.table.put(id, record);
            return { id, ...structuredClone(record) };
        }
        /**
         * Replace a profile using its last observed revision; bound members keep their saved copy.
         * @param id - Stable catalog identity.
         * @param expectedRevision - Revision observed before editing.
         * @param definition - Validated complete replacement definition.
         * @param archived - Whether to hide the profile from new assignments.
         * @param signal - Cancellation before the durable write is admitted.
         * @returns the committed next profile revision.
         */
        async update(id, expectedRevision, definition, archived, signal) {
            const actor = this.ctx.agents.currentInitiator();
            const current = this.get(id);
            this.assertEditor(id, current, actor);
            this.assertRevision(current, expectedRevision);
            const copy = parseTeamExpertDefinition(definition);
            await this.validateRoute(copy, signal);
            signal.throwIfAborted();
            const record = await this.table.update(id, (previous) => {
                this.assertEditor(id, previous, actor);
                this.assertRevision(previous, expectedRevision);
                if (previous.revision === Number.MAX_SAFE_INTEGER) {
                    throw new RemoteError('team-expert/revision-limit', 'expert revision counter is exhausted', { expertId: id });
                }
                return { ...previous, definition: copy, archived, revision: previous.revision + 1, updatedAt: Date.now() };
            });
            return { id, ...structuredClone(record) };
        }
        /** Local profiles are visible only to their Team and the user. */
        assertReader(id, record, actor) {
            if (actor === undefined || record.ownerTeamId === undefined)
                return;
            if (this.ctx.agentTeams.membership(actor).root.id !== record.ownerTeamId) {
                throw new RemoteError('team-expert/edit-denied', 'this profile belongs to another Team', { expertId: id });
            }
        }
        /** Shared templates remain user-managed; model edits stay with the author, its parent, or the Team Lead. */
        assertEditor(id, record, actor) {
            if (actor === undefined)
                return;
            const membership = this.ctx.agentTeams.membership(actor);
            const author = this.ctx.agentTeams.listMembers(actor).find(member => member.id === record.ownerMemberId);
            if (record.ownerTeamId !== membership.root.id
                || membership.role !== 'lead' && actor.id !== record.ownerMemberId && author?.parentId !== actor.id) {
                throw new RemoteError('team-expert/edit-denied', 'shared templates require a user edit; model edits must belong to this member or its child in this Team', { expertId: id });
            }
        }
        /**
         * Locate this expert's member in the calling Team, creating one only when absent.
         * A reused member receives no prompt; send new work explicitly after inspecting its tasks.
         * @param caller - Exact live parent in an enabled Team.
         * @param request - Catalog revision, initial task, and continuation composition.
         * @returns the member and whether its existing Session was reused.
         */
        async assign(caller, request) {
            const profile = this.get(request.expertId);
            this.assertReader(request.expertId, profile, caller);
            this.assertRevision(profile, request.expectedRevision);
            if (profile.archived)
                throw new RemoteError('team-expert/archived', 'archived experts cannot be assigned', { expertId: profile.id });
            const definition = profile.definition;
            const persona = [
                definition.persona,
                ...(definition.instructions.length === 0 ? [] : [`AGENT.md\n${definition.instructions}`]),
                ...(definition.skills.length === 0 ? [] : [
                    `Consult these skills when available: ${definition.skills.join(', ')}. Report unavailable skills before relying on them.`,
                ]),
            ].join('\n\n');
            return await this.ctx.agentTeams.ensureExpertMember(caller, {
                name: request.name,
                description: definition.description,
                prompt: request.prompt,
                context: request.context,
                provider: request.provider,
                ...request.skills === undefined ? {} : { skills: request.skills },
                signal: request.signal,
                expert: { id: profile.id, revision: profile.revision, name: definition.name },
                persona,
                agentOptions: {
                    ...definition.modelProvider === undefined ? {} : { provider: definition.modelProvider, model: definition.model },
                    ...definition.reasoningEffort === undefined ? {} : { reasoningEffort: ReasoningEffortId(definition.reasoningEffort) },
                },
            });
        }
        /** Check configured route capabilities without changing provider defaults or generating text. */
        async validateRoute(definition, signal) {
            signal.throwIfAborted();
            if (definition.modelProvider === undefined || definition.model === undefined)
                return;
            try {
                await this.ctx.llm.resolveCallConfig({
                    provider: definition.modelProvider,
                    model: definition.model,
                    ...definition.reasoningEffort === undefined ? {} : { reasoningEffort: ReasoningEffortId(definition.reasoningEffort) },
                }, signal);
            }
            catch (error) {
                signal.throwIfAborted();
                throw new RemoteError('team-expert/model-unavailable', 'expert model or reasoning effort is unavailable', {
                    provider: definition.modelProvider, model: definition.model,
                }, { cause: error });
            }
        }
        /** Reject stale profile edits and assignments before changing durable state. */
        assertRevision(record, expectedRevision) {
            if (record.revision !== expectedRevision) {
                throw new RemoteError('team-expert/stale-revision', 'expert revision changed; read the profile before continuing', {
                    expectedRevision, actualRevision: record.revision,
                });
            }
        }
    };
})();
export { TeamExpertService };
export default TeamExpertService;
