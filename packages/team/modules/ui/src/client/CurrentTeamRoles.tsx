/** Current member routes shown beside reusable role templates. */
import type { PropsRuntime, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { NS } from './locales.ts'
import { memberFunctionKey, memberModelDisplay, teamHierarchy } from './team-view-data.ts'
import type { DisplayMember } from './team-view-data.ts'
import css from './CurrentTeamRoles.module.css'
import { ProjectPlanView } from './ProjectPlanView.tsx'

type UseSessions = PropsRuntime<'conversation.view'>['useSessions']

function CurrentRole({ member, depth, useSessions, t }: {
  member: DisplayMember
  depth: number
  useSessions: UseSessions
  t: TranslateNS<typeof NS>
}) {
  const selection = useSessions(state => state.projectionsBySession[member.id]?.values.modelSelection)
  const model = memberModelDisplay(member, selection)
  return <li className={css.member} style={{ marginInlineStart: `${Math.min(Math.max(depth - 1, 0), 4) * 12}px` }}>
    <div><strong>{member.expert?.name ?? member.name}</strong>
      {member.role !== 'lead' && <small>{t(memberFunctionKey(member))}</small>}
      <span>{member.description}</span></div>
    <div className={css.route}><span>{model.model ?? t('view.sessionModel')}</span>
      <small>{model.reasoningEffort ?? t('roles.defaultEffort')}</small></div>
  </li>
}

/**
 * Display the actual Team before editable templates.
 * @param props - Current roster, pending plan, Session model choices, and localized labels.
 * @returns a read-only list of member routes.
 */
export function CurrentTeamRoles({ members, plannedTeam, useSessions, t }: {
  members: readonly DisplayMember[]
  plannedTeam?: string | undefined
  useSessions: UseSessions
  t: TranslateNS<typeof NS>
}) {
  return <section className={css.current} aria-label={t('roles.currentTeam')}>
    <header><h3>{t('roles.currentTeam')}</h3><small>{members.length}</small></header>
    {plannedTeam !== undefined && <div className={css.planned}>
      <h4>{t('roles.plannedTeam')}</h4><ProjectPlanView text={plannedTeam} t={t} />
    </div>}
    {members.length === 0 ? <p>{t('roles.noCurrentTeam')}</p>
      : <ul>{teamHierarchy(members).map(({ member, depth }) => <CurrentRole key={member.id} member={member} depth={depth}
        useSessions={useSessions} t={t} />)}</ul>}
  </section>
}
