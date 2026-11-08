/** Saved skill choices for one member, without transferring instruction bodies. */
import type { TeamProjection } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'
import css from './MemberSkills.module.css'

type Props = PropsLocale<typeof NS> & {
  selection: NonNullable<TeamProjection['skillSelections']>[number] | undefined
}

/**
 * Display a member's selected methods and whether they match the current goal.
 * @param props - Compact saved selection and localized text.
 * @returns skill purposes and expandable version metadata, without starting work.
 */
export function MemberSkills({ selection, t }: Props) {
  const skills = selection?.skills ?? []
  return <section className={css.skills} aria-label={t('skills.title')}>
    <h3>{t('skills.title')}</h3>
    {skills.length === 0 ? <p className={css.hint}>{t('skills.empty')}</p> : <>
      <p className={css.hint} role="status">{t(selection?.active === true ? 'skills.restore' : 'skills.stale')}</p>
      <ul className={css.choices}>{skills.map(skill => <li key={skill.name}>
        <p>{skill.purpose}</p><span>{skill.name}</span>
      </li>)}</ul>
    </>}
    {selection !== undefined && <details className={css.versions}>
      <summary>{t('skills.versions')}</summary>
      <p>{t('skills.revision', { revision: selection.revision })}</p>
      <p>{selection.goalRevision === 0 ? t('skills.unconfirmedGoal') : t('skills.goalRevision', { revision: selection.goalRevision })}</p>
      <ul>{skills.map(skill => <li key={skill.name}>
        <span>{skill.name} · {t('skills.bytes', { bytes: skill.bytes })}</span>
        <code>{skill.digest}</code>
      </li>)}</ul>
    </details>}
  </section>
}
