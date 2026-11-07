/** Inspect inner Team records written through the released portable Session carrier. */
import type { Session, SessionEvent, SessionEventMap } from '@deepseek-ai/dsh-session'
import type { TeamEventType } from '../src/projection.ts'
import { portableTeamRecord, readPortableTeamRecord } from '../src/portable-events.ts'

/**
 * Preserve ordinary events and decode the plugin's recorded carrier for assertions.
 * @param events - Events already read through the official persistence validator.
 * @returns Team records with their original sequence and outer event metadata.
 */
export function recordedTeamEvents(events: readonly SessionEvent[]): readonly SessionEvent[] {
  return events.map(event => {
    if (event.type !== 'team/task') return event
    const record = readPortableTeamRecord(event.data.task)
    if (record === undefined) return event
    return { ...event, type: record.type, data: JSON.parse(record.payload) } as SessionEvent
  })
}

/**
 * Seed a crash-window fixture through the same carrier used by the release bundle.
 * @param session - Synthetic Session that owns this Team record.
 * @param type - Inner coordination event name.
 * @param data - Payload associated with that event type.
 */
export function appendPortableTeamEvent<T extends TeamEventType>(session: Session, type: T, data: SessionEventMap[T]): void {
  session.append('team/task', { version: 2, teamId: data.teamId, task: portableTeamRecord(type, JSON.stringify(data)) })
}
