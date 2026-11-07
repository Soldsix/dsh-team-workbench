/** Member-specific skill choices and exact instruction versions retained by a Team. */
import type { SessionId } from '@deepseek-ai/dsh-session/types'

/** Task-specific module name and purpose selected before a new member starts. */
export interface TeamSkillChoice {
  readonly name: string
  readonly purpose: string
}

/** Exact instruction bytes supplied by a registered Team skill provider. */
export type ResolvedTeamSkill = Omit<TeamSelectedSkill, 'purpose'>

/** One selected skill, including the bytes needed after its installed version changes. */
export interface TeamSelectedSkill {
  readonly name: string
  readonly digest: string
  readonly purpose: string
  /** Selected instruction text with LF line endings. */
  readonly content: string
}

/** Whole member selection, replaced with a contiguous revision. */
export interface TeamSkillSelection {
  readonly memberId: SessionId
  readonly selectedBy: SessionId
  readonly revision: number
  readonly goalRevision: number
  readonly skills: readonly TeamSelectedSkill[]
}

/** Compact selection visible in a task handoff or Team interface. */
export interface TeamSkillSelectionView {
  readonly memberId: SessionId
  readonly revision: number
  readonly goalRevision: number
  readonly active: boolean
  readonly skills: readonly { readonly name: string; readonly digest: string; readonly purpose: string; readonly bytes: number }[]
}

/** Complete replacement chosen by the member, its direct parent, or the Lead. */
export interface SelectTeamSkillsRequest {
  /** Omit to select skills for the caller; otherwise use the durable member name. */
  readonly member?: string
  readonly expectedRevision: number
  readonly skills: readonly TeamSelectedSkill[]
}
