/** Serialized selection and pinned-content reads for reusable Team members. */
import { createHash } from 'node:crypto'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { Context } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { TeamError } from './error.ts'
import type { TeamJournal } from './journal.ts'
import { resolveActiveMember, type TeamRoster } from './roster.ts'
import type { TeamGoals } from './goals.ts'
import { teamSkillSelectionSchema, assertTeamSkillSelection, teamSkillSelectionView } from './skill-state.ts'
import type { SelectTeamSkillsRequest, TeamSelectedSkill, TeamSkillChoice, TeamSkillSelection, TeamSkillSelectionView } from './skill-types.ts'
import type {} from './host-types.ts'

/** Owns exact member identity, revision, size, and goal checks for skill choices. */
export class TeamSkillSelections {
  /**
   * @param ctx - Context hosting Team skill providers.
   * @param journal - Root Session transaction owner.
   * @param roster - Exact live caller and durable target lookup.
   * @param goals - Current goal admission and revision cancellation.
   * @param maxSkills - Maximum selected modules per member.
   * @param maxBytes - Maximum encoded selection size, including saved content.
   */
  constructor(
    private readonly ctx: Context,
    private readonly journal: TeamJournal,
    private readonly roster: TeamRoster,
    private readonly goals: TeamGoals,
    private readonly maxSkills: number,
    private readonly maxBytes: number,
  ) {}

  /**
   * Resolve and validate an initial choice before creating its member or submitting work.
   * @param caller - Exact live parent in the Team.
   * @param memberId - Reserved identity of the future child.
   * @param choices - Only the modules required by the delegated task.
   * @param signal - Caller and goal cancellation throughout resolution.
   * @returns detached revision-one selection ready for the roster transaction.
   */
  async prepare(caller: Agent, memberId: SessionId, choices: readonly TeamSkillChoice[], signal: AbortSignal): Promise<TeamSkillSelection> {
    signal.throwIfAborted()
    const requested = structuredClone(choices)
    const state = this.journal.state(this.roster.membership(caller).root)
    const goalRevision = state.goal?.revision ?? 0
    if (requested.length > this.maxSkills) throw new TeamError(`skill selection exceeds ${this.maxSkills} modules`, 'TEAM_SKILLS_LIMIT')
    const skills = await Promise.all(requested.map(async (choice) => {
      const resolved = await this.ctx.waterfall('team/resolve-skill', { agent: caller, name: choice.name, signal },
        () => Promise.reject(new TeamError(`no Team skill provider resolves ${choice.name}`, 'TEAM_SKILL_UNAVAILABLE')))
      signal.throwIfAborted()
      if (resolved.name !== choice.name) throw new TeamError('skill provider returned a different module', 'TEAM_SKILLS_INVALID')
      return { ...resolved, purpose: choice.purpose }
    }))
    signal.throwIfAborted()
    return this.decode({ memberId, selectedBy: caller.id, revision: 1, goalRevision, skills })
  }

  /**
   * Copy one member's pinned instruction bytes to its replacement before the first model request.
   * @param caller - Team Lead or the source member's direct parent.
   * @param sourceId - Existing member whose choice remains in the Team log.
   * @param memberId - Reserved identity of the replacement.
   * @returns Validated revision-one choice, or undefined when the source has no choice.
   */
  copyForSuccessor(caller: Agent, sourceId: SessionId, memberId: SessionId): TeamSkillSelection | undefined {
    const membership = this.roster.membership(caller)
    const state = this.journal.state(membership.root)
    const source = state.members.find(member => member.id === sourceId)
    if (source === undefined || caller !== membership.root && source.parentId !== caller.id) {
      throw new TeamError('only the Lead or direct parent can inherit a member skill choice', 'TEAM_INVALID_TARGET')
    }
    const previous = state.skillSelections?.find(selection => selection.memberId === sourceId)
    if (previous === undefined) return undefined
    if (!teamSkillSelectionView(state, previous).active) {
      throw new TeamError('the source skill choice belongs to an earlier goal', 'TEAM_SKILLS_STALE_GOAL')
    }
    return this.decode({ memberId, selectedBy: caller.id, revision: 1,
      goalRevision: previous.goalRevision, skills: structuredClone(previous.skills) })
  }

  /**
   * Read compact metadata, including the caller's own choice during provisioning.
   * @param caller - Exact live Team member.
   * @param member - Durable target name; omitted means the caller.
   * @returns Saved choice or revision zero before the first choice.
   */
  read(caller: Agent, member?: string): TeamSkillSelectionView {
    const membership = this.roster.membership(caller)
    const state = this.journal.state(membership.root)
    const targetName = member?.trim() ?? membership.name
    const targetId = targetName === membership.name ? caller.id : resolveActiveMember(membership.root, state, targetName).id
    const selection = state.skillSelections?.find(value => value.memberId === targetId)
    return selection === undefined
      ? { memberId: targetId, revision: 0, goalRevision: state.goal?.revision ?? 0, active: false, skills: [] }
      : teamSkillSelectionView(state, selection)
  }

  /**
   * Read the caller's exact selected instruction version.
   * @param caller - Exact live Team member.
   * @param name - Selected module name.
   * @returns Detached saved content, or undefined when this module is not selected.
   */
  content(caller: Agent, name: string): TeamSelectedSkill | undefined {
    const state = this.journal.state(this.roster.membership(caller).root)
    const selection = state.skillSelections?.find(value => value.memberId === caller.id)
    const skill = selection?.skills.find(value => value.name === name)
    if (skill === undefined || selection === undefined) return undefined
    if (!teamSkillSelectionView(state, selection).active) {
      throw new TeamError('the selected skills belong to an earlier goal; select the applicable skills for this goal', 'TEAM_SKILLS_STALE_GOAL')
    }
    this.checkDigest(skill)
    return { ...skill }
  }

  /**
   * Replace one member's entire choice using the current revision.
   * @param caller - Exact live member, direct parent, or Lead.
   * @param request - Expected revision, target, and fully resolved instruction snapshots.
   * @param signal - Cancellation before the record is appended.
   * @returns Committed metadata; identical choices reuse the current revision.
   */
  async select(caller: Agent, request: SelectTeamSkillsRequest, signal: AbortSignal): Promise<TeamSkillSelectionView> {
    const membership = this.roster.membership(caller)
    const { root } = membership
    const admitted = membership.role === 'lead' && this.journal.state(root).goal === undefined
      ? this.goals.capture(root, signal) : this.goals.admit(root, signal)
    admitted.throwIfAborted()
    return await this.journal.transact(root.id, async () => {
      admitted.throwIfAborted()
      if (this.roster.membership(caller).root !== root) throw new TeamError('caller changed Teams while selecting skills', 'TEAM_NOT_MEMBER')
      const state = this.journal.state(root)
      const target = resolveActiveMember(root, state, request.member ?? membership.name)
      const previous = state.skillSelections?.find(value => value.memberId === target.id)
      if (request.expectedRevision !== (previous?.revision ?? 0)) throw new TeamError('skill selection changed; read its current revision', 'TEAM_SKILLS_STALE_REVISION')
      const selection = this.decode({
        memberId: target.id, selectedBy: caller.id, revision: request.expectedRevision + 1,
        goalRevision: state.goal?.revision ?? 0, skills: request.skills,
      })
      assertTeamSkillSelection(state, selection)
      if (previous?.goalRevision === selection.goalRevision && JSON.stringify(previous.skills) === JSON.stringify(selection.skills)) {
        return teamSkillSelectionView(state, previous)
      }
      await this.journal.appendAndFlush(root, 'team/skills-selected', { version: 2, teamId: membership.id, selection })
      return teamSkillSelectionView(this.journal.state(root), selection)
    })
  }

  /**
   * Rebind reviewed saved skill bytes to the current goal without reading a newer module version.
   * @param caller - Exact Team Lead or direct parent of the selected member.
   * @param member - Retained target name.
   * @param expectedRevision - Saved selection revision reviewed for this goal.
   * @param signal - Cancellation before the new selection is recorded.
   * @returns current-goal selection retaining every prior content digest.
   */
  async rebind(caller: Agent, member: string, expectedRevision: number,
    signal: AbortSignal): Promise<TeamSkillSelectionView> {
    const membership = this.roster.membership(caller)
    const state = this.journal.state(membership.root)
    const target = resolveActiveMember(membership.root, state, member)
    const previous = state.skillSelections?.find(value => value.memberId === target.id)
    if (caller !== membership.root && state.members.find(value => value.id === target.id)?.parentId !== caller.id) {
      throw new TeamError('only the Lead or direct parent can approve saved skills for another goal', 'TEAM_LEAD_REQUIRED')
    }
    if (previous === undefined || expectedRevision !== previous.revision) {
      throw new TeamError('read the saved skill selection and its revision before rebinding', 'TEAM_SKILLS_STALE_REVISION')
    }
    return await this.select(caller, { member, expectedRevision, skills: structuredClone(previous.skills) }, signal)
  }

  /** Validate detached durable values and deployment limits for every selection writer. */
  private decode(value: unknown): TeamSkillSelection {
    const parsed = teamSkillSelectionSchema.safeParse(value)
    if (!parsed.success) throw new TeamError('invalid skill selection fields', 'TEAM_SKILLS_INVALID')
    const selection = parsed.data
    if (selection.skills.length > this.maxSkills || Buffer.byteLength(JSON.stringify(selection), 'utf8') > this.maxBytes) {
      throw new TeamError(`skill selection exceeds ${this.maxSkills} modules or ${this.maxBytes} bytes`, 'TEAM_SKILLS_LIMIT')
    }
    for (const skill of selection.skills) {
      if (skill.purpose.length > 200 || /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(skill.purpose)) {
        throw new TeamError('skill purpose must be one short text line', 'TEAM_SKILLS_INVALID')
      }
      this.checkDigest(skill)
    }
    return selection
  }

  /** A saved digest must identify the content used by the model. */
  private checkDigest(skill: TeamSelectedSkill): void {
    if (createHash('sha256').update(skill.content).digest('hex') !== skill.digest) {
      throw new TeamError(`saved content digest differs for ${skill.name}`, 'TEAM_SKILLS_DIGEST_MISMATCH')
    }
  }
}
