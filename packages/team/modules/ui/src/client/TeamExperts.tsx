/** Native editor for durable experts and their current Team bindings. */
import { useEffect, useId, useRef, useState } from 'react'
import { isRemoteFailure } from '@deepseek-ai/dsh-api-gateway/client'
import type { TeamExpertDefinition, TeamExpertView, TeamMemberProjection } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TeamExpertCatalog, TeamExpertOperations } from './expert-catalog.ts'
import type { NS } from './locales.ts'
import css from './TeamExperts.module.css'

interface Draft {
  readonly base: TeamExpertView | null
  readonly definition: TeamExpertDefinition
  readonly skillsText: string
  readonly archived: boolean
}

function fromProfile(profile: TeamExpertView): Draft {
  return { base: profile, definition: profile.definition, skillsText: profile.definition.skills.join('\n'), archived: profile.archived }
}

function definitionOf(draft: Draft): TeamExpertDefinition {
  return { ...draft.definition, skills: draft.skillsText.split('\n').map(value => value.trim()).filter(Boolean) }
}

function isEdited(draft: Draft): boolean {
  return draft.base === null || draft.archived !== draft.base.archived
    || JSON.stringify(definitionOf(draft)) !== JSON.stringify(draft.base.definition)
}

/**
 * Edit reusable expert profiles while preserving unsaved drafts across selection and refresh.
 * @param props - Catalog operations, current Team members, navigation, and localized copy.
 * @returns a searchable catalog, profile editor, and existing conversation links.
 */
export function TeamExperts({ operations, members, openMember, t }: {
  operations: TeamExpertOperations
  members: readonly TeamMemberProjection[]
  openMember: (id: SessionId) => void
  t: TranslateNS<typeof NS>
}) {
  const [catalog, setCatalog] = useState<TeamExpertCatalog | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [selected, setSelected] = useState('')
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const request = useRef<AbortController | null>(null)
  const nextDraft = useRef(0)
  const formId = useId()

  useEffect(() => {
    const controller = new AbortController()
    request.current = controller
    setLoading(true)
    void operations.load(controller.signal).then((value) => {
      if (controller.signal.aborted) return
      setCatalog(value)
      setDrafts((current) => {
        const next = { ...current }
        for (const profile of value.profiles) {
          const draft = next[profile.id]
          if (draft === undefined || !isEdited(draft)) next[profile.id] = fromProfile(profile)
        }
        return next
      })
      setSelected(current => current || value.profiles.find(profile => !profile.archived)?.id || '')
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return
      if (!isRemoteFailure(reason)) throw reason
      setError(t('experts.loadFailed'))
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => { controller.abort() }
  }, [operations, reload, t])

  const draft = drafts[selected]
  const profile = draft?.definition
  const provider = catalog?.models.groups.find(group => group.id === profile?.modelProvider)
  const model = provider?.models.find(value => value.id === profile?.model)
  const busy = loading || saving
  const latest = catalog?.profiles.find(value => value.id === draft?.base?.id)
  const bindings = members.flatMap(member => member.expert !== undefined && member.expert.id === draft?.base?.id
    ? [{ member, revision: member.expert.revision }] : [])
  const needle = search.trim().toLocaleLowerCase()
  const choices = Object.entries(drafts).filter(([key, value]) =>
    (showArchived || !value.archived || key === selected)
    && [value.definition.name, value.definition.description, value.definition.model, ...value.definition.skills]
      .some(text => text?.toLocaleLowerCase().includes(needle)))

  const change = (next: Draft): void => { setDrafts(current => ({ ...current, [selected]: next })); setError(null) }
  const update = (next: TeamExpertDefinition): void => { if (draft !== undefined) change({ ...draft, definition: next }) }
  const save = async (): Promise<void> => {
    const signal = request.current?.signal
    if (draft === undefined || signal === undefined || busy) return
    const cancelled = (): boolean => signal.aborted
    if (cancelled()) return
    const definition = definitionOf(draft)
    if ([definition.name, definition.description, definition.persona].some(value => value.trim() === '')) {
      setError(t('experts.invalid')); return
    }
    setSaving(true); setError(null)
    try {
      const saved = await operations.save(definition, draft.base, draft.archived, signal)
      if (cancelled()) return
      setDrafts((current) => {
        const next = Object.fromEntries(Object.entries(current).filter(([key]) => key !== selected))
        next[saved.id] = fromProfile(saved)
        return next
      })
      setCatalog(current => current === null ? null : {
        ...current, profiles: [...current.profiles.filter(value => value.id !== saved.id), saved],
      })
      setSelected(current => current === selected ? saved.id : current)
    } catch (reason: unknown) {
      if (cancelled()) return
      if (!isRemoteFailure(reason)) throw reason
      if (reason.code === 'team-expert/stale-revision') {
        setError(t('experts.conflict')); setReload(value => value + 1)
      } else {
        setError(t(reason.code === 'team-expert/model-unavailable' ? 'roles.invalidModel'
          : reason.code === 'team-expert/invalid-profile' ? 'experts.invalid' : 'experts.saveFailed'))
      }
    } finally { if (!cancelled()) setSaving(false) }
  }

  return <section className={css.catalog} aria-label={t('view.experts')}>
    <p className={css.hint}>{t('experts.hint')}</p>
    {error !== null && <p role="alert" className={css.error}>{error}</p>}
    {loading && <p role="status" className={css.hint}>{t('loading')}</p>}
    <div className={css.layout}>
      <aside className={css.sidebar}>
        <input type="search" aria-label={t('experts.search')} placeholder={t('experts.search')} value={search}
          onChange={(event) => { setSearch(event.target.value) }} />
        <label className={css.checkbox}><input type="checkbox" checked={showArchived}
          onChange={(event) => { setShowArchived(event.target.checked) }} />{t('experts.showArchived')}</label>
        <div className={css.choices}>
          {choices.map(([key, value]) => <button key={key} type="button" className={css.choice} aria-pressed={key === selected}
            onClick={() => { setSelected(key); setError(null) }}>
            <strong>{value.definition.name || t('experts.untitled')}</strong>
            <span>{value.definition.description || t('roles.description')}</span>
            <small>{value.archived ? t('experts.archived') : value.definition.model ?? t('roles.inherit')}
              {isEdited(value) ? ` · ${t('experts.unsaved')}` : ''}</small>
          </button>)}
          {!loading && choices.length === 0 && <p className={css.hint}>{t('experts.empty')}</p>}
        </div>
        <div className={css.actions}>
          <button className={css.button} type="button" disabled={busy} onClick={() => {
            const key = `draft:${++nextDraft.current}`
            setDrafts(current => ({ ...current, [key]: {
              base: null, definition: { name: '', description: '', persona: '', instructions: '', skills: [] }, skillsText: '', archived: false,
            } }))
            setSelected(key); setSearch(''); setError(null)
          }}>{t('experts.add')}</button>
          <button className={css.textButton} type="button" disabled={busy} onClick={() => { setError(null); setReload(value => value + 1) }}>
            {t('experts.refresh')}
          </button>
        </div>
      </aside>
      {draft !== undefined && profile !== undefined ? <div className={css.editor}>
        <header className={css.editorHeader}><h2>{profile.name || t('experts.untitled')}</h2>
          <span className={css.hint}>{draft.base === null ? t('experts.unsaved') : t('experts.revision', { revision: draft.base.revision })}</span>
        </header>
        {latest !== undefined && draft.base !== null && latest.revision !== draft.base.revision && <div className={css.conflict}>
          <p>{t('experts.newRevision', { revision: latest.revision })}</p>
          <button type="button" className={css.button} disabled={busy} onClick={() => { change(fromProfile(latest)) }}>{t('experts.reloadSelected')}</button>
        </div>}
        {catalog?.models.failures.map(failure => <p key={failure.id} className={css.error}>{failure.name}: {failure.message}</p>)}
        <fieldset className={css.fields} disabled={busy}>
          <label>{t('experts.name')}<input value={profile.name} onChange={(event) => { update({ ...profile, name: event.target.value }) }} /></label>
          <label>{t('roles.description')}<input maxLength={200} value={profile.description} onChange={(event) => { update({ ...profile, description: event.target.value }) }} /></label>
          <div className={css.models}>
            <label>{t('roles.provider')}<select value={profile.modelProvider ?? ''} onChange={(event) => {
              const group = catalog?.models.groups.find(value => value.id === event.target.value)
              const { modelProvider: _provider, model: _model, reasoningEffort: _effort, ...definition } = profile
              update({ ...definition, ...(group?.models[0] === undefined ? {} : { modelProvider: group.id, model: group.models[0].id }) })
            }}>
              <option value="">{t('roles.inherit')}</option>
              {profile.modelProvider !== undefined && provider === undefined
                && <option value={profile.modelProvider}>{profile.modelProvider}</option>}
              {catalog?.models.groups.map(group => <option key={group.id} value={group.id}
                disabled={group.models.length === 0}>{group.name}</option>)}
            </select></label>
            <label>{t('model')}<select value={profile.model ?? ''} disabled={provider === undefined} onChange={(event) => {
              const { reasoningEffort: _effort, ...definition } = profile
              update({ ...definition, model: event.target.value })
            }}>
              {profile.model === undefined ? <option value="">{t('roles.inherit')}</option>
                : model === undefined && <option value={profile.model}>{profile.model}</option>}
              {provider?.models.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}
            </select></label>
            <label>{t('reasoningEffort')}<select value={profile.reasoningEffort ?? ''} onChange={(event) => {
              const { reasoningEffort: _effort, ...definition } = profile
              update(event.target.value === '' ? definition : { ...definition, reasoningEffort: event.target.value })
            }}>
              <option value="">{t('roles.defaultEffort')}</option>
              {profile.reasoningEffort !== undefined && !model?.reasoning?.efforts.some(effort => effort.id === profile.reasoningEffort)
                && <option value={profile.reasoningEffort}>{profile.reasoningEffort}</option>}
              {model?.reasoning?.efforts.map(effort => <option key={effort.id} value={effort.id}>{effort.name}</option>)}
            </select></label>
          </div>
          <p className={css.hint}>{t('experts.modelHint')}</p>
          <div className={css.field}>
            <label htmlFor={`${formId}-persona`}>{t('roles.persona')}</label>
            <textarea id={`${formId}-persona`} rows={4} value={profile.persona}
              onChange={(event) => { update({ ...profile, persona: event.target.value }) }} />
          </div>
          <div className={css.field}>
            <label htmlFor={`${formId}-instructions`}>{t('roles.instructions')}</label>
            <textarea id={`${formId}-instructions`} rows={7} className={css.instructions} value={profile.instructions}
              onChange={(event) => { update({ ...profile, instructions: event.target.value }) }} />
          </div>
          <div className={css.field}>
            <label htmlFor={`${formId}-skills`}>{t('experts.skills')}</label>
            <textarea id={`${formId}-skills`} rows={3} value={draft.skillsText}
              onChange={(event) => { change({ ...draft, skillsText: event.target.value }) }} />
          </div>
          <p className={css.hint}>{t('experts.skillsHint')}</p>
          <label className={css.checkbox}><input type="checkbox" disabled={draft.base === null} checked={draft.archived}
            onChange={(event) => { change({ ...draft, archived: event.target.checked }) }} />{t('experts.archive')}</label>
        </fieldset>
        <div className={css.footer}><span role="status" className={css.hint}>{t(isEdited(draft) ? 'experts.unsaved' : 'experts.saved')}</span>
          <button type="button" className={css.primaryButton} disabled={busy || !isEdited(draft)} onClick={() => { void save() }}>{t(saving ? 'roles.saving' : 'experts.save')}</button>
        </div>
        <section className={css.bindings}>
          <h3>{t('experts.bindings')}</h3>
          <p className={css.hint}>{t('experts.bindingHint')}</p>
          {bindings.map(({ member, revision }) => <div key={member.id} className={css.binding}>
            <span>{member.name} · {t('experts.revision', { revision })}</span>
            <button type="button" className={css.textButton} disabled={member.phase !== 'active'} onClick={() => { openMember(member.id) }}>{t('open')}</button>
          </div>)}
          {bindings.length === 0 && <p className={css.hint}>{t('experts.unassigned')}</p>}
        </section>
      </div> : <p className={css.hint}>{t('experts.select')}</p>}
    </div>
  </section>
}
