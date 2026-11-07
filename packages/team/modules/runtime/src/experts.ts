/** Optional durable expert catalog and Team-local continuation assignment plugin. */
import { randomUUID } from 'node:crypto'
import { Context, Service } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import type { KvTable } from '@deepseek-ai/dsh-storage-domain'
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type {} from './index.ts'
import { expertDefinitionSchema, teamExpertDomainSpec } from './expert-spec.ts'
import { TeamExpertId } from './expert-types.ts'
import type { TeamExpertDefinition, TeamExpertRecord, TeamExpertView } from './expert-types.ts'
import type { AssignTeamExpertRequest } from './host-types.ts'
import type { EnsureExpertMemberResult } from './types.ts'

export type * from './expert-types.ts'
export { TeamExpertId } from './expert-types.ts'
export type { AssignTeamExpertRequest } from './host-types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    teamExperts: TeamExpertService
  }
}

/**
 * Parse a complete expert definition received from a model or client.
 * @param input - Untrusted JSON-decoded profile fields.
 * @returns the validated definition with trimmed identifiers.
 */
export function parseTeamExpertDefinition(input: unknown): TeamExpertDefinition {
  const parsed = expertDefinitionSchema.safeParse(input)
  if (!parsed.success) {
    throw new RemoteError('team-expert/invalid-profile', 'expert profile fields are invalid', {
      fields: parsed.error.issues.map(issue => issue.path.join('.')),
    })
  }
  return parsed.data
}

/** Durable expert profiles; assignment never rewrites an existing member's persona. */
export class TeamExpertService extends TypertRemoteService {
  static inject = ['agents', 'agentTeams', 'storageDomain', 'llm']
  private table!: KvTable<TeamExpertId, TeamExpertRecord>

  constructor(ctx: Context) {
    super(ctx, 'teamExperts')
  }

  /** Open the authoritative catalog before publishing the service. */
  protected async [Service.init](): Promise<void> {
    const domain = await this.ctx.storageDomain.open(teamExpertDomainSpec)
    this.ctx.effect(() => () => domain.close(), 'teamExperts.domainClose')
    this.table = domain.table('experts')
  }

  /**
   * Read the catalog without resolving models or starting turns.
   * @param includeArchived - Include profiles hidden from normal assignment.
   * @returns detached profiles in stable creation order.
   */
  @Remote('list')
  list(includeArchived: boolean): TeamExpertView[] {
    const actor = this.ctx.agents.currentInitiator()
    const membership = actor === undefined ? undefined : this.ctx.agentTeams.membership(actor)
    return [...this.table.entries()]
      .filter(([, value]) => includeArchived || !value.archived)
      .filter(([, value]) => membership === undefined || value.ownerTeamId === undefined || value.ownerTeamId === membership.root.id)
      .map(([id, value]) => ({ id, ...structuredClone(value) }))
      .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
  }

  /**
   * Read one profile, including an archived profile.
   * @param id - Stable catalog identity.
   * @returns a detached profile; missing identities throw.
   */
  @Remote('get')
  get(id: TeamExpertId): TeamExpertView {
    const record = this.table.get(id)
    if (record === undefined) throw new RemoteError('team-expert/not-found', `expert "${id}" not found`, { expertId: id })
    this.assertReader(id, record, this.ctx.agents.currentInitiator())
    return { id, ...structuredClone(record) }
  }

  /**
   * Save a new reusable role without generating a model response.
   * @param definition - Validated full role definition.
   * @param signal - Cancellation before the durable write is admitted.
   * @returns the committed revision-one profile.
   */
  @Remote('create')
  async create(definition: TeamExpertDefinition, signal: AbortSignal): Promise<TeamExpertView> {
    const actor = this.ctx.agents.currentInitiator()
    const copy = parseTeamExpertDefinition(definition)
    await this.validateRoute(copy, signal)
    signal.throwIfAborted()
    const ownership = actor === undefined ? {} : {
      ownerTeamId: this.ctx.agentTeams.membership(actor).root.id,
      ownerMemberId: actor.id,
    }
    const id = TeamExpertId(randomUUID())
    const now = Date.now()
    const record: TeamExpertRecord = { definition: copy, revision: 1, createdAt: now, updatedAt: now, archived: false,
      ...ownership }
    await this.table.put(id, record)
    return { id, ...structuredClone(record) }
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
  @Remote('update')
  async update(
    id: TeamExpertId,
    expectedRevision: number,
    definition: TeamExpertDefinition,
    archived: boolean,
    signal: AbortSignal,
  ): Promise<TeamExpertView> {
    const actor = this.ctx.agents.currentInitiator()
    const current = this.get(id)
    this.assertEditor(id, current, actor)
    this.assertRevision(current, expectedRevision)
    const copy = parseTeamExpertDefinition(definition)
    await this.validateRoute(copy, signal)
    signal.throwIfAborted()
    const record = await this.table.update(id, (previous) => {
      this.assertEditor(id, previous, actor)
      this.assertRevision(previous, expectedRevision)
      if (previous.revision === Number.MAX_SAFE_INTEGER) {
        throw new RemoteError('team-expert/revision-limit', 'expert revision counter is exhausted', { expertId: id })
      }
      return { ...previous, definition: copy, archived, revision: previous.revision + 1, updatedAt: Date.now() }
    })
    return { id, ...structuredClone(record) }
  }

  /** Local profiles are visible only to their Team and the user. */
  private assertReader(id: TeamExpertId, record: TeamExpertRecord, actor: Agent | undefined): void {
    if (actor === undefined || record.ownerTeamId === undefined) return
    if (this.ctx.agentTeams.membership(actor).root.id !== record.ownerTeamId) {
      throw new RemoteError('team-expert/edit-denied', 'this profile belongs to another Team', { expertId: id })
    }
  }

  /** Shared templates remain user-managed; model edits stay with the author, its parent, or the Team Lead. */
  private assertEditor(id: TeamExpertId, record: TeamExpertRecord, actor: Agent | undefined): void {
    if (actor === undefined) return
    const membership = this.ctx.agentTeams.membership(actor)
    const author = this.ctx.agentTeams.listMembers(actor).find(member => member.id === record.ownerMemberId)
    if (record.ownerTeamId !== membership.root.id
      || membership.role !== 'lead' && actor.id !== record.ownerMemberId && author?.parentId !== actor.id) {
      throw new RemoteError('team-expert/edit-denied', 'shared templates require a user edit; model edits must belong to this member or its child in this Team', { expertId: id })
    }
  }

  /**
   * Locate this expert's member in the calling Team, creating one only when absent.
   * A reused member receives no prompt; send new work explicitly after inspecting its tasks.
   * @param caller - Exact live parent in an enabled Team.
   * @param request - Catalog revision, initial task, and continuation composition.
   * @returns the member and whether its existing Session was reused.
   */
  async assign(caller: Agent, request: AssignTeamExpertRequest): Promise<EnsureExpertMemberResult> {
    const profile = this.get(request.expertId)
    this.assertReader(request.expertId, profile, caller)
    this.assertRevision(profile, request.expectedRevision)
    if (profile.archived) throw new RemoteError('team-expert/archived', 'archived experts cannot be assigned', { expertId: profile.id })
    const definition = profile.definition
    const persona = [
      definition.persona,
      ...(definition.instructions.length === 0 ? [] : [`AGENT.md\n${definition.instructions}`]),
      ...(definition.skills.length === 0 ? [] : [
        `Consult these skills when available: ${definition.skills.join(', ')}. Report unavailable skills before relying on them.`,
      ]),
    ].join('\n\n')
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
    })
  }

  /** Check configured route capabilities without changing provider defaults or generating text. */
  private async validateRoute(definition: TeamExpertDefinition, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted()
    if (definition.modelProvider === undefined || definition.model === undefined) return
    try {
      await this.ctx.llm.resolveCallConfig({
        provider: definition.modelProvider,
        model: definition.model,
        ...definition.reasoningEffort === undefined ? {} : { reasoningEffort: ReasoningEffortId(definition.reasoningEffort) },
      }, signal)
    } catch (error) {
      signal.throwIfAborted()
      throw new RemoteError('team-expert/model-unavailable', 'expert model or reasoning effort is unavailable', {
        provider: definition.modelProvider, model: definition.model,
      }, { cause: error })
    }
  }

  /** Reject stale profile edits and assignments before changing durable state. */
  private assertRevision(record: TeamExpertRecord, expectedRevision: number): void {
    if (record.revision !== expectedRevision) {
      throw new RemoteError('team-expert/stale-revision', 'expert revision changed; read the profile before continuing', {
        expectedRevision, actualRevision: record.revision,
      })
    }
  }
}

export default TeamExpertService
