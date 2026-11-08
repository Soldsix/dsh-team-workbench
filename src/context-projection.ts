/** Retained work-skill context identities, rebuilt and advanced by the Session projection registry. */
import { createHash } from 'node:crypto'
import z from 'zod'
import { isReplacementSurfaceEvent, SessionSeq } from '@deepseek-ai/dsh-session'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import { joinContextSections } from '@deepseek-ai/dsh-system-prompt'
import { MessageId, ToolCallId } from '@deepseek-ai/dsh-llm'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'

/** One visible instruction contribution; bodies remain in the authoritative Session log. */
export interface SkillContextEntry {
  readonly seq: SessionSeq
  readonly digest: string
  readonly messageId: string
}

type ToolResultData = Extract<SessionEvent, { type: 'tool/result' }>['data']

/** Replacement metadata for one direct skill read; content contains only a retirement marker. */
export interface SkillReadEntry {
  readonly seq: SessionSeq
  readonly digest: string
  readonly data: ToolResultData
}

/** Direct skill reads and the latest completed model response, rebuilt from Session events. */
export interface SkillReadState {
  readonly pendingCalls: readonly string[]
  readonly results: readonly SkillReadEntry[]
  readonly lastAssistantSeq: SessionSeq
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionStateMap {
    teamSkillContext: readonly SkillContextEntry[]
    teamSkillReads: SkillReadState
  }
}

/**
 * Identify the exact rendered selection, including its revisions and purposes.
 * @param text - Complete saved instruction contribution.
 * @returns SHA-256 identity used by the retained-context projection.
 */
export function skillContextDigest(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

/** Host-only state of instruction contributions still present after surface replacements. */
export const skillContextProjection = {
  key: 'teamSkillContext',
  stateVersion: 1,
  stateSchema: z.array(z.object({
    seq: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).transform(SessionSeq),
    digest: z.string().regex(/^[a-f0-9]{64}$/),
    messageId: z.string(),
  }).strict()).readonly(),
  init: () => [],
  apply(state, event) {
    let retained = state
    if (isReplacementSurfaceEvent(event)) {
      const removed = new Set(event.sourceEventSeqs)
      if (state.some(entry => removed.has(entry.seq))) retained = state.filter(entry => !removed.has(entry.seq))
    }
    if (event.type !== 'user/message') return retained
    const source = event.data.source
    if (!('form' in source) || source.form !== 'snapshot') return retained
    const entries = source.sections.filter(section => section.name === 'team:skill-instructions'
      && event.data.content.some(block => block.type === 'text' && block.text.includes(section.text)))
      .map(section => ({ seq: event.seq, digest: skillContextDigest(section.text), messageId: event.data.id }))
    return entries.length === 0 ? retained : [...retained, ...entries]
  },
} satisfies ProjectionDefinition<'teamSkillContext'>

/** Direct skill result metadata with no saved body, including after a cold Session resume. */
export const skillReadProjection = {
  key: 'teamSkillReads',
  stateVersion: 1,
  stateSchema: z.object({
    pendingCalls: z.array(z.string()).readonly(),
    results: z.array(z.object({
      seq: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).transform(SessionSeq),
      digest: z.string().regex(/^[a-f0-9]{64}$/),
      data: z.object({
        turn: z.number().int().nonnegative(),
        step: z.number().int().nonnegative(),
        message: z.object({
          id: z.string().transform(MessageId),
          role: z.literal('tool'),
          source: z.object({ kind: z.literal('tool'), callId: z.string().transform(ToolCallId) }).strict(),
          toolCallId: z.string().transform(ToolCallId),
          isError: z.boolean(),
          content: z.tuple([z.object({ type: z.literal('text'), text: z.string() }).strict()]),
        }).strict(),
        meta: z.json().optional(),
      }).strict().transform(({ meta, ...rest }) => meta === undefined ? rest : { ...rest, meta }),
    }).strict()).readonly(),
    lastAssistantSeq: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).transform(SessionSeq),
  }).strict().transform((value): SkillReadState => value as SkillReadState),
  init: () => ({ pendingCalls: [], results: [], lastAssistantSeq: SessionSeq(0) }),
  apply(state, event) {
    let results = state.results
    if (isReplacementSurfaceEvent(event)) {
      const removed = new Set(event.sourceEventSeqs)
      if (results.some(entry => removed.has(entry.seq))) results = results.filter(entry => !removed.has(entry.seq))
    }
    if (event.type === 'assistant/message') return { ...state, results, lastAssistantSeq: event.seq }
    if (event.type === 'tool/call' && event.data.name === 'team_skill') {
      return { ...state, results, pendingCalls: [...state.pendingCalls, event.data.callId] }
    }
    if (event.type !== 'tool/result' || !state.pendingCalls.includes(event.data.message.toolCallId)) {
      return results === state.results ? state : { ...state, results }
    }
    const pendingCalls = state.pendingCalls.filter(id => id !== event.data.message.toolCallId)
    const body = event.data.message.content[1]
    if (event.data.message.isError || body?.type !== 'text') return { ...state, results, pendingCalls }
    const data = { ...event.data, message: { ...event.data.message,
      content: [{ type: 'text' as const, text: '工作技能正文已从当前上下文移除；需要时可重新读取。' }],
    } }
    return { ...state, pendingCalls, results: [...results, {
      seq: event.seq, digest: skillContextDigest(body.text), data,
    }] }
  },
} satisfies ProjectionDefinition<'teamSkillReads'>

/**
 * Retire Team-owned skill bodies from the current model surface without changing earlier Session events.
 * @param session - Member Session whose current surface receives versioned replacements.
 * @param activeText - Complete instruction contribution for the current selection, or empty when inactive.
 * @param selectedDigests - Digests whose selected bodies already have an instruction contribution.
 * @param contexts - Retained instruction identities from the Session projection.
 * @param reads - Retained direct reader results and latest completed model response.
 */
export function retireSkillBodies(
  session: Session, activeText: string, selectedDigests: ReadonlySet<string>,
  contexts: readonly SkillContextEntry[], reads: SkillReadState,
): void {
  const surface = new Set(session.surface.nodes)
  const messages = new Map<string, (ReturnType<Session['deriveMessages']>)[number]>(
    session.deriveMessages().map(message => [message.id, message]),
  )
  const latestActive = contexts.findLast(entry => surface.has(entry.seq) && entry.digest === skillContextDigest(activeText))?.seq
  for (const entry of contexts) {
    if (!surface.has(entry.seq) || entry.seq === latestActive) continue
    const message = messages.get(entry.messageId)
    if (message?.role !== 'user') continue
    const source = message.source
    if (!('form' in source) || source.form !== 'snapshot') continue
    const sections = source.sections.filter(section => section.name !== 'team:skill-instructions')
    const content = joinContextSections(sections)
    session.append('user/message', { ...message,
      content: [{ type: 'text', text: content || 'Current runtime context: none. Earlier runtime-context snapshots no longer apply.' }],
      source: { ...source, sections },
    }, { surfaceOp: { op: 'replace', startSeq: entry.seq, endSeq: entry.seq }, sourceEventSeqs: [entry.seq] })
  }
  for (const entry of reads.results) {
    if (!surface.has(entry.seq)) continue
    if (entry.seq > reads.lastAssistantSeq && !selectedDigests.has(entry.digest)) continue
    session.append('tool/result', entry.data,
      { surfaceOp: { op: 'replace', startSeq: entry.seq, endSeq: entry.seq }, sourceEventSeqs: [entry.seq] })
  }
}
