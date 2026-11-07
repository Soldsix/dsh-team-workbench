/** Saved Team roles edited through the existing revision-checked Settings API. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type { ModelCatalog } from '@deepseek-ai/dsh-api-session-controller/types'
import type { TeamRoleProfile } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { JsonValue } from '@deepseek-ai/dsh-util-values'

/** One editable settings generation and its current model choices. */
export interface TeamRoleSettings {
  readonly revision: number
  readonly profiles: Record<string, TeamRoleProfile>
  readonly catalog: ModelCatalog
}

/** Host operations used by the role editor. */
export interface TeamRoleOperations {
  /** Read role profiles and exact provider-owned reasoning choices. */
  loadRoles(): Promise<TeamRoleSettings>
  /** Replace the role dictionary at its observed settings revision. */
  saveRoles(profiles: Record<string, TeamRoleProfile>, revision: number): Promise<number>
}

/** Validate the profile field read from the Settings JSON value. */
function readProfiles(value: JsonValue): Record<string, TeamRoleProfile> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Team role settings must be an object')
  const profiles = value['memberProfiles'] === undefined ? {} : value['memberProfiles']
  if (profiles === null || typeof profiles !== 'object' || Array.isArray(profiles)) throw new Error('Team memberProfiles must be an object')
  const result: Record<string, TeamRoleProfile> = {}
  for (const [id, profile] of Object.entries(profiles)) {
    if (profile === null || typeof profile !== 'object' || Array.isArray(profile)
      || typeof profile['description'] !== 'string' || typeof profile['persona'] !== 'string'
      || typeof profile['instructions'] !== 'string') throw new Error(`Invalid Team role ${id}`)
    const modelProvider = profile['modelProvider']
    const model = profile['model']
    const reasoningEffort = profile['reasoningEffort']
    if ((modelProvider !== undefined && typeof modelProvider !== 'string')
      || (model !== undefined && typeof model !== 'string')
      || (reasoningEffort !== undefined && typeof reasoningEffort !== 'string')) throw new Error(`Invalid model settings for Team role ${id}`)
    result[id] = {
      description: profile['description'], persona: profile['persona'], instructions: profile['instructions'],
      ...modelProvider === undefined ? {} : { modelProvider },
      ...model === undefined ? {} : { model },
      ...reasoningEffort === undefined ? {} : { reasoningEffort },
    }
  }
  return result
}

/**
 * Bind role reads and writes to the authenticated Settings and Session remotes.
 * @param ctx - browser plugin declaring both remote namespaces.
 * @returns revision-checked role operations.
 */
export function createTeamRoleOperations(ctx: Context): TeamRoleOperations {
  return {
    async loadRoles() {
      const [settings, catalog] = await Promise.all([ctx.remote.settings.describe(), ctx.remote.session.modelCatalog()])
      if (!settings.ok) throw new Error(settings.error.message)
      if (!catalog.ok) throw new Error(catalog.error.message)
      const namespace = settings.value.namespaces.find(value => value.ns === 'tool-agent-team')
      if (namespace === undefined) throw new Error('Team role settings are unavailable')
      return { revision: namespace.revision, profiles: readProfiles(namespace.value), catalog: catalog.value }
    },
    async saveRoles(profiles, revision) {
      const value: Record<string, JsonValue> = {}
      for (const [id, profile] of Object.entries(profiles)) value[id] = { ...profile }
      const response = await ctx.remote.settings.mutate('tool-agent-team', [{ op: 'set', path: ['memberProfiles'], value }], revision)
      if (!response.ok) throw new Error(response.error.message)
      return response.value.revision
    },
  }
}
