/** Skill context survives cache restore and tracks only retained model-visible contributions. */
import { describe, expect, it } from 'vitest'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { createUserMessage, type ContextSnapshotSection } from '@deepseek-ai/dsh-llm'
import { skillContextDigest, skillContextProjection, type SkillContextEntry } from '../src/context-projection.ts'

declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    'skills-context-test': {
      kind: 'skills-context-test'
      form: 'snapshot'
      sections: readonly ContextSnapshotSection[]
    }
  }
}

const context = (text: string, name = 'team:skill-instructions', sectionText = text) => createUserMessage({
  content: [{ type: 'text', text }],
  source: { kind: 'skills-context-test', form: 'snapshot', sections: [{ name, text: sectionText }] },
})

describe('retained work-skill context', () => {
  it('retains instruction identity across a cache round trip without storing its body', () => {
    const session = Session.create(SessionId('skill-context'))
    const event = session.append('user/message', context('saved instructions'), { surfaceOp: 'append' })
    const state = skillContextProjection.apply([], event)
    expect(state).toEqual([{ seq: event.seq, digest: skillContextDigest('saved instructions'), messageId: event.data.id }])
    const restored = skillContextProjection.stateSchema.parse(JSON.parse(JSON.stringify(state)))
    expect(restored).toEqual(state)
    expect(JSON.stringify(restored)).not.toContain('saved instructions')
    const unrelated = session.append('user/message', createUserMessage({
      content: [{ type: 'text', text: 'Continue.' }], source: { kind: 'user' },
    }), { surfaceOp: 'append' })
    expect(skillContextProjection.apply(restored, unrelated)).toBe(restored)
  })

  it('ignores other sections and instruction text absent from the displayed message', () => {
    const session = Session.create(SessionId('skill-context-metadata'))
    const state: readonly SkillContextEntry[] = []
    expect(skillContextProjection.apply(state, session.append('user/message', context('metadata', 'team:skills'),
      { surfaceOp: 'append' }))).toBe(state)
    const absent = session.append('user/message', context('metadata', 'team:skill-instructions', 'missing body'), { surfaceOp: 'append' })
    expect(skillContextProjection.apply(state, absent)).toBe(state)
  })

  it('drops only replaced instruction contributions and accepts a later restored version', () => {
    const session = Session.create(SessionId('skill-context-replace'))
    const first = session.append('user/message', context('first instructions'), { surfaceOp: 'append' })
    const second = session.append('user/message', context('second instructions'), { surfaceOp: 'append' })
    const state = [first, second].reduce<readonly SkillContextEntry[]>(
      (value, event) => skillContextProjection.apply(value, event), [])
    const replacement = session.append('user/message', createUserMessage({
      content: [{ type: 'text', text: 'Summary.' }], source: { kind: 'user' },
    }), { surfaceOp: { op: 'replace', startSeq: first.seq, endSeq: first.seq }, sourceEventSeqs: [first.seq] })
    const retained = skillContextProjection.apply(state, replacement)
    expect(retained).toEqual([{ seq: second.seq, digest: skillContextDigest('second instructions'), messageId: second.data.id }])
    const restored = session.append('user/message', context('first instructions'), { surfaceOp: 'append' })
    expect(skillContextProjection.apply(retained, restored)).toEqual([...retained,
      { seq: restored.seq, digest: skillContextDigest('first instructions'), messageId: restored.data.id }])
    expect(state).toHaveLength(2)
  })
})
