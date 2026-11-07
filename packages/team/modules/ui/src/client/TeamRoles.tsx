/** Team role editor with provider-owned model and reasoning selections. */
import { useEffect, useRef, useState } from 'react'
import type { TeamRoleProfile } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { NS } from './locales.ts'
import type { TeamRoleOperations, TeamRoleSettings } from './role-settings.ts'
import css from './TeamAction.module.css'

const roleFields: readonly (keyof TeamRoleProfile)[] = [
  'description', 'persona', 'instructions', 'modelProvider', 'model', 'reasoningEffort',
]

function sameRole(left: TeamRoleProfile, right: TeamRoleProfile): boolean {
  return roleFields.every(field => left[field] === right[field])
}

function mergeRole(base: TeamRoleProfile, draft: TeamRoleProfile, incoming: TeamRoleProfile): TeamRoleProfile {
  const value = (field: keyof TeamRoleProfile): string | undefined => draft[field] === base[field] ? incoming[field] : draft[field]
  const modelProvider = value('modelProvider')
  const model = value('model')
  const reasoningEffort = value('reasoningEffort')
  return {
    description: value('description') ?? '', persona: value('persona') ?? '', instructions: value('instructions') ?? '',
    ...modelProvider === undefined ? {} : { modelProvider },
    ...model === undefined ? {} : { model },
    ...reasoningEffort === undefined ? {} : { reasoningEffort },
  }
}

function mergeProfiles(
  base: Record<string, TeamRoleProfile>, draft: Record<string, TeamRoleProfile>, incoming: Record<string, TeamRoleProfile>,
): Record<string, TeamRoleProfile> {
  const merged: Record<string, TeamRoleProfile> = { ...incoming }
  for (const [id, previous] of Object.entries(base)) {
    const edited = draft[id]
    if (edited === undefined) { Reflect.deleteProperty(merged, id); continue }
    const latest = incoming[id]
    if (latest === undefined) {
      if (!sameRole(previous, edited)) merged[id] = edited
      continue
    }
    merged[id] = mergeRole(previous, edited, latest)
  }
  for (const [id, edited] of Object.entries(draft)) if (base[id] === undefined) merged[id] = edited
  return merged
}

/**
 * Edit reusable roles; existing member descriptors remain tied to their creation snapshot.
 * @param props - model catalog/settings operations and localized copy.
 * @returns the role list, editor, and save feedback.
 */
export function TeamRoles({ operations, t }: { operations: TeamRoleOperations; t: TranslateNS<typeof NS> }) {
  const [settings, setSettings] = useState<TeamRoleSettings | null>(null)
  const [profiles, setProfiles] = useState<Record<string, TeamRoleProfile>>({})
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)
  const draftRevision = useRef(0)
  useEffect(() => {
    let disposed = false
    void operations.loadRoles().then((value) => {
      if (disposed) return
      setSettings(value)
      setProfiles(value.profiles)
      setSelected(Object.keys(value.profiles)[0] ?? '')
      setDirty(false)
    }).catch((reason: unknown) => { if (!disposed) setError(String(reason)) })
    return () => { disposed = true }
  }, [operations])

  const profile = profiles[selected]
  const provider = settings?.catalog.groups.find(group => group.id === profile?.modelProvider)
  const model = provider?.models.find(candidate => candidate.id === profile?.model)
  const update = (next: TeamRoleProfile): void => {
    draftRevision.current += 1
    setProfiles(current => ({ ...current, [selected]: next }))
    setDirty(true)
    setSaved(false)
  }
  const reload = async (): Promise<void> => {
    if (settings === null) return
    setBusy(true)
    try {
      const latest = await operations.loadRoles()
      setProfiles(current => mergeProfiles(settings.profiles, current, latest.profiles))
      setSettings(latest)
      setError(null)
      setSaved(false)
    } catch (reason: unknown) { setError(String(reason)) }
    finally { setBusy(false) }
  }
  const save = async (): Promise<void> => {
    if (settings === null) return
    setError(null)
    for (const [id, candidate] of Object.entries(profiles)) {
      const route = settings.catalog.groups.find(group => group.id === candidate.modelProvider)
      const choice = route?.models.find(item => item.id === candidate.model)
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id) || candidate.description.trim() === '' || candidate.persona.trim() === '') {
        setError(t('roles.invalid')); return
      }
      if ((candidate.modelProvider !== undefined || candidate.model !== undefined) && choice === undefined) {
        setError(t('roles.invalidModel')); return
      }
      if (candidate.reasoningEffort !== undefined && !choice?.reasoning?.efforts.some(effort => effort.id === candidate.reasoningEffort)) {
        setError(t('roles.invalidEffort')); return
      }
    }
    setBusy(true)
    const savingRevision = draftRevision.current
    try {
      const revision = await operations.saveRoles(profiles, settings.revision)
      setSettings({ ...settings, revision, profiles })
      setSaved(draftRevision.current === savingRevision)
      if (draftRevision.current === savingRevision) setDirty(false)
    } catch (reason: unknown) {
      setError(String(reason))
    } finally {
      setBusy(false)
    }
  }

  return <section className={css.roles}>
    <h3>{t('roles.templates')}</h3>
    <p className={css.sectionHint}>{t('roles.hint')}</p>
    {error !== null && <p className={css.error} role="alert">{error}</p>}
    {settings === null && error === null && <p role="status">{t('loading')}</p>}
    {settings !== null && <>
      {settings.catalog.failures.map(failure => <p key={failure.id} className={css.warning}>{failure.name}: {failure.message}</p>)}
      <div className={css.roleColumns}>
        <div className={css.roleList}>
          {Object.entries(profiles).map(([id, value]) => <button key={id} type="button"
            className={id === selected ? `${css.roleChoice} ${css.roleSelected}` : css.roleChoice}
            onClick={() => { setSelected(id) }}>
            <strong>{id}</strong><span>{value.description}</span>
            <small>{value.model ?? t('roles.inherit')}</small>
          </button>)}
          <button type="button" className={css.secondaryButton} onClick={() => {
            let number = Object.keys(profiles).length + 1
            while (profiles[`member-${number}`] !== undefined) number += 1
            const id = `member-${number}`
            draftRevision.current += 1
            setProfiles(current => ({ ...current, [id]: { description: '', persona: '', instructions: '' } }))
            setSelected(id); setSaved(false); setDirty(true)
          }}>{t('roles.add')}</button>
        </div>
        {profile !== undefined && <div className={css.roleForm}>
          <div className={css.roleFormHeader}><strong>{selected}</strong>
            <button type="button" className={css.textButton} onClick={() => {
              const next = Object.fromEntries(Object.entries(profiles).filter(([id]) => id !== selected))
              draftRevision.current += 1
              setProfiles(next); setSelected(Object.keys(next)[0] ?? ''); setSaved(false); setDirty(true)
            }}>{t('roles.remove')}</button>
          </div>
          <label>{t('roles.description')}<input value={profile.description} onChange={(event) => { update({ ...profile, description: event.target.value }) }} /></label>
          <div className={css.modelFields}>
            <label>{t('roles.provider')}<select value={profile.modelProvider ?? ''} onChange={(event) => {
              const group = settings.catalog.groups.find(candidate => candidate.id === event.target.value)
              const { modelProvider: _provider, model: _model, reasoningEffort: _effort, ...role } = profile
              update({ ...role, ...(group?.models[0] === undefined ? {} : { modelProvider: group.id, model: group.models[0].id }) })
            }}><option value="">{t('roles.inherit')}</option>{settings.catalog.groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
            <label>{t('model')}<select value={profile.model ?? ''} disabled={provider === undefined} onChange={(event) => {
              const { reasoningEffort: _effort, ...role } = profile
              update({ ...role, model: event.target.value })
            }}>{provider === undefined ? <option value="">{t('roles.inherit')}</option> : provider.models.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label>
            <label>{t('reasoningEffort')}<select value={profile.reasoningEffort ?? ''} disabled={model?.reasoning === undefined} onChange={(event) => {
              const { reasoningEffort: _effort, ...role } = profile
              update(event.target.value === '' ? role : { ...role, reasoningEffort: event.target.value })
            }}><option value="">{t(model?.reasoning === undefined ? 'roles.noEffort' : 'roles.defaultEffort')}</option>{model?.reasoning?.efforts.map(effort => <option key={effort.id} value={effort.id}>{effort.name}</option>)}</select></label>
          </div>
          <label>{t('roles.persona')}<textarea rows={5} value={profile.persona} onChange={(event) => { update({ ...profile, persona: event.target.value }) }} /></label>
          <label>{t('roles.instructions')}<textarea rows={8} className={css.instructions} value={profile.instructions} onChange={(event) => { update({ ...profile, instructions: event.target.value }) }} /></label>
        </div>}
      </div>
      <div className={css.editorFooter}>
        <span role="status">{saved ? t('roles.saved') : dirty ? t('roles.unsaved') : t('roles.persisted')}</span>
        {error !== null && <button type="button" className={css.secondaryButton} disabled={busy} onClick={() => { void reload() }}>{t('roles.reload')}</button>}
        <button type="button" className={css.primaryButton} disabled={busy} onClick={() => { void save() }}>{t(busy ? 'roles.saving' : 'roles.save')}</button>
      </div>
    </>}
  </section>
}
