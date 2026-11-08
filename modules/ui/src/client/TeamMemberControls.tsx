/** Member history and private workspace actions in the native Team view. */
import { useEffect, useRef, useState } from 'react'
import type { TeamMemberProjection, TeamMemberWorkspace, TeamMemberFunction } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ModelCatalog } from '@deepseek-ai/dsh-api-session-controller/types'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { TeamMemberOperations } from './member-operations.ts'
import { memberFunctionKey } from './team-view-data.ts'
import { NS } from './locales.ts'
import css from './TeamView.module.css'

/**
 * Show lifecycle and integration controls only for a selected teammate.
 * @param props - Selected member, live activity, Remote actions, and locale.
 * @returns controls retaining the selected member's history.
 */
export function TeamMemberControls({ sessionId, member, inactive, operations, t }: PropsLocale<typeof NS> & {
  readonly sessionId: SessionId
  readonly member: TeamMemberProjection
  readonly inactive: boolean
  readonly operations: TeamMemberOperations
}) {
  const [workspace, setWorkspace] = useState<TeamMemberWorkspace | null | undefined>(undefined)
  const [catalog, setCatalog] = useState<ModelCatalog | null>(null)
  const [modelProvider, setModelProvider] = useState(member.modelProvider ?? '')
  const [model, setModel] = useState(member.model ?? '')
  const [reasoningEffort, setReasoningEffort] = useState(member.reasoningEffort ?? '')
  const [teamFunction, setTeamFunction] = useState<TeamMemberFunction | ''>(member.teamFunction ?? '')
  const [roleReason, setRoleReason] = useState('')
  const [modelError, setModelError] = useState(false)
  const [modelRead, setModelRead] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const controller = useRef(new AbortController())
  const inFlight = useRef(false)
  const modelDraft = useRef(false)
  const modelBaseRevision = useRef(member.modelRouteRevision ?? 0)

  useEffect(() => {
    const lifetime = new AbortController()
    controller.current = lifetime
    modelDraft.current = false
    modelBaseRevision.current = member.modelRouteRevision ?? 0
    setWorkspace(undefined); setError(null); setNotice(null); setBusy(false); inFlight.current = false
    void operations.workspace(sessionId, member.name).then((value) => {
      if (!lifetime.signal.aborted) setWorkspace(value)
    }, () => { if (!lifetime.signal.aborted) setError(t('member.workspaceFailed')) })
    return () => { lifetime.abort() }
  }, [sessionId, member.id, member.name, operations, t])

  useEffect(() => {
    let current = true
    setCatalog(null); setModelError(false)
    if (!modelDraft.current) {
      modelBaseRevision.current = member.modelRouteRevision ?? 0
      setModelProvider(member.modelProvider ?? ''); setModel(member.model ?? ''); setReasoningEffort(member.reasoningEffort ?? '')
    }
    void operations.models().then((value) => {
      if (!current) return
      setCatalog(value)
      if (modelDraft.current) return
      if (member.modelProvider !== undefined) {
        setModelProvider(member.modelProvider); setModel(member.model ?? ''); setReasoningEffort(member.reasoningEffort ?? '')
        return
      }
      const group = value.groups.find(candidate => candidate.id === value.default.provider)
        ?? value.groups[0]
      const currentModel = group?.models.find(candidate => candidate.id === member.model)
      const selected = currentModel ?? group?.models.find(candidate => candidate.id === value.default.model)
        ?? group?.models[0]
      setModelProvider(group?.id ?? '')
      setModel(selected?.id ?? '')
      setReasoningEffort(currentModel?.reasoning?.efforts.some(effort => effort.id === member.reasoningEffort)
        ? member.reasoningEffort ?? '' : '')
    }, () => { if (current) setModelError(true) })
    return () => { current = false }
  }, [sessionId, member.id, member.modelProvider, member.model, member.reasoningEffort, member.modelRouteRevision, modelRead, operations])

  useEffect(() => { setTeamFunction(member.teamFunction ?? ''); setRoleReason('') }, [member.id, member.teamFunction, member.roleRevision])

  const functions: TeamMemberFunction[] = ['planning_adviser', 'quality_adviser', 'domain_adviser', 'group_lead', 'executor', 'verifier']
  const run = async (action: 'retire' | 'reactivate' | 'integrate' | 'configure' | 'configureRole'): Promise<void> => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true); setError(null); setNotice(null)
    const signal = controller.current.signal
    try {
      if (action === 'configureRole') {
        if (teamFunction === '') return
        await operations.configureRole(sessionId, { target: member.name, expectedRevision: member.roleRevision ?? 0,
          teamFunction, reason: roleReason }, signal)
        if (!signal.aborted) setNotice(t('member.roleSaved'))
      } else if (action === 'configure') {
        const saved = await operations.configureModel(sessionId, {
          target: member.name, expectedRevision: modelBaseRevision.current, modelProvider, model,
          ...reasoningEffort === '' ? {} : { reasoningEffort },
        }, signal)
        if (!signal.aborted) {
          modelDraft.current = false
          modelBaseRevision.current = saved.modelRouteRevision ?? member.modelRouteRevision ?? 0
          setNotice(t('member.modelSaved'))
        }
      } else if (action === 'integrate') {
        const result = await operations.integrate(sessionId, member.name, signal)
        if (!signal.aborted) setNotice(result.paths.length === 0
          ? t('member.integratedEmpty') : t('member.integratedPaths', { paths: result.paths.join(', ') }))
      } else {
        await operations[action](sessionId, member.name, signal)
        if (!signal.aborted) setNotice(t(action === 'retire' ? 'member.retired' : 'member.reactivated'))
      }
    } catch (cause: unknown) {
      const detail = typeof cause === 'object' && cause !== null && 'message' in cause && typeof cause.message === 'string'
        ? cause.message.trim() : ''
      if (!signal.aborted) setError(detail === '' ? t('member.actionFailed') : `${t('member.actionFailed')} ${detail}`)
    } finally {
      if (!signal.aborted) { inFlight.current = false; setBusy(false) }
    }
  }

  const provider = catalog?.groups.find(group => group.id === modelProvider)
  const selectedModel = provider?.models.find(candidate => candidate.id === model)

  return <section className={css.memberActions} aria-label={t('member.actions')}>
    <h3>{t('member.actions')}</h3>
    <div className={css.memberModelForm}>
      <h4>{t('member.modelTitle')}</h4>
      <p className={css.hint}>{t('member.modelHint')}</p>
      {catalog === null ? <div role="status">{t(modelError ? 'member.modelCatalogFailed' : 'loading')}
        {modelError && <button type="button" className={css.button} onClick={() => { setModelRead(value => value + 1) }}>{t('member.retryModels')}</button>}</div> : <>
        <label>{t('roles.provider')}<select value={modelProvider} onChange={(event) => {
          modelDraft.current = true
          const next = catalog.groups.find(group => group.id === event.target.value)
          setModelProvider(event.target.value); setModel(next?.models[0]?.id ?? ''); setReasoningEffort('')
        }}>{provider === undefined && modelProvider !== '' && <option value={modelProvider} disabled>{t('member.unlistedRoute', { name: modelProvider })}</option>}
          {catalog.groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
        <label>{t('model')}<select value={model} onChange={(event) => { modelDraft.current = true; setModel(event.target.value); setReasoningEffort('') }}>
          {selectedModel === undefined && model !== '' && <option value={model} disabled>{t('member.unlistedRoute', { name: model })}</option>}
          {provider?.models.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
        </select></label>
        <label>{t('reasoningEffort')}<select value={reasoningEffort} onChange={(event) => { modelDraft.current = true; setReasoningEffort(event.target.value) }}>
          <option value="">{t('member.highestEffort')}</option>
          {reasoningEffort !== '' && !selectedModel?.reasoning?.efforts.some(effort => effort.id === reasoningEffort)
            && <option value={reasoningEffort} disabled>{reasoningEffort}</option>}
          {selectedModel?.reasoning?.efforts.map(effort => <option key={effort.id} value={effort.id}>{effort.name}</option>)}
        </select></label>
        <button type="button" className={css.button} disabled={busy || model === '' || selectedModel === undefined}
          onClick={() => { void run('configure') }}>{t('member.saveModel')}</button>
      </>}
    </div>
    <div className={css.memberModelForm}>
      <h4>{t('member.roleTitle')}</h4>
      <p className={css.hint}>{t('member.roleHint')}</p>
      <label>{t('member.roleTitle')}<select value={teamFunction} disabled={busy || !inactive} onChange={(event) => {
        const selected = functions.find(value => value === event.target.value)
        setTeamFunction(selected ?? '')
      }}><option value="">{t('member.roleUnset')}</option>
        {functions.map(value => <option key={value} value={value}>{t(memberFunctionKey({ ...member, teamFunction: value }))}</option>)}
      </select></label>
      <label>{t('member.roleReason')}<input value={roleReason} onChange={(event) => { setRoleReason(event.target.value) }} /></label>
      <button type="button" className={css.button} disabled={busy || !inactive || teamFunction === '' || roleReason.trim() === ''}
        onClick={() => { void run('configureRole') }}>{t('member.saveRole')}</button>
    </div>
    {member.phase === 'active' && <button type="button" className={css.button} disabled={busy || !inactive}
      onClick={() => { void run('retire') }}>{t('member.retire')}</button>}
    {member.phase === 'retired' && <button type="button" className={css.button} disabled={busy}
      onClick={() => { void run('reactivate') }}>{t('member.reactivate')}</button>}
    <p className={css.hint}>{member.phase === 'retired' ? t('member.retiredHint') : t('member.retireHint')}</p>
    {workspace === undefined ? <p role="status">{t('member.workspaceLoading')}</p> : workspace === null
      ? <p>{t('member.sharedWorkspace')}</p> : <>
        <p>{t('member.privateWorkspace')}</p>
        <p className={css.preservedText}>{workspace.cwd}</p>
        {member.phase === 'active' && <button type="button" className={css.button} disabled={busy || !inactive}
          onClick={() => { void run('integrate') }}>{t('member.integrate')}</button>}
        <p className={css.hint}>{t('member.integrateHint')}</p>
      </>}
    {error !== null && <p role="alert" className={css.error}>{error}</p>}
    {notice !== null && <p role="status">{notice}</p>}
  </section>
}
