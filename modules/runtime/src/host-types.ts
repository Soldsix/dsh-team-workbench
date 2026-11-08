/** Host-only Team requests containing live Agent configuration. */
import type { Agent, AgentOptions } from '@deepseek-ai/dsh-agent'
import type { ContentBlock } from '@deepseek-ai/dsh-llm/types'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TeamExpertBinding, TeamExpertId } from './expert-types.ts'
import type { TeamMemberFunction } from './types.ts'
import type { ResolvedTeamSkill, TeamSkillChoice } from './skill-types.ts'

declare module '@deepseek-ai/cordis' {
  interface Events {
    /**
     * Resolve one selected module before a new Team member is reserved.
     * @mode waterfall
     * @param request - Exact caller, selected module name, and goal-bound cancellation.
     * @param next - Delegate names not owned by this provider.
     * @returns the named module's LF-normalized instruction body and digest.
     */
    'team/resolve-skill'(request: { agent: Agent; name: string; signal: AbortSignal }, next: () => Promise<ResolvedTeamSkill>): Promise<ResolvedTeamSkill>
  }
}

/** Input for creating one durable teammate. */
export interface SpawnTeammateRequest {
  /** Persistent Team responsibility shown in the roster and workbench. */
  readonly teamFunction?: TeamMemberFunction
  /** Creation-time expert identity, when selected from the durable expert catalog. */
  readonly expert?: TeamExpertBinding
  readonly name: string
  readonly description: string
  readonly prompt: ContentBlock[]
  readonly context: 'fresh' | 'fork'
  readonly provider: string
  /** Child language-model overrides; omitted values inherit a compatible parent selection. */
  readonly agentOptions?: AgentOptions
  /** Project-relative files or directories copied into this member's private workspace. */
  readonly workingPaths?: readonly string[]
  /** Host-resolved empty input set for advisers or tasks with no project inputs. */
  readonly workspaceMode?: 'empty'
  /** Member instructions retained in the Team roster and assembled separately from mode prose. */
  readonly persona?: string
  /** Selected modules resolved and saved before the first prompt; omission selects none. */
  readonly skills?: readonly TeamSkillChoice[]
  /** Existing member whose saved skill text and digests are copied before the successor starts. */
  readonly inheritSkillsFrom?: SessionId
  readonly signal: AbortSignal
}

/** Input for finding or creating the single member bound to an expert in one Team. */
export interface EnsureExpertMemberRequest extends SpawnTeammateRequest {
  readonly expert: TeamExpertBinding
}

/** Catalog-backed assignment; initial prompt is used only when a member must be created. */
export interface AssignTeamExpertRequest {
  readonly expertId: TeamExpertId
  readonly expectedRevision: number
  readonly name: string
  readonly prompt: ContentBlock[]
  readonly context: 'fresh' | 'fork'
  readonly provider: string
  /** Task-specific choices for first creation; reuse retains the existing member's choice. */
  readonly skills?: readonly TeamSkillChoice[]
  readonly signal: AbortSignal
}
