import { describe, expect, it } from 'vitest'
import { SessionId } from '@deepseek-ai/dsh-session'
import { TeamActivity } from '../src/activity.ts'
import { TeamId } from '../src/types.ts'

describe('Team wait leases', () => {
  for (const members of [8, 20, 32]) {
    it(`releases ${members} mutually waiting members when one becomes runnable`, async () => {
      const activity = new TeamActivity()
      const teamId = TeamId(`wait-team-${members}`)
      const controllers = Array.from({ length: members }, () => new AbortController())
      const ids = controllers.map((_controller, index) => SessionId(`member-${index}`))
      const waits = ids.map((id, index) => activity.wait(teamId, id, 10_000, controllers[index]!.signal))
      expect(activity.waitingMembers(teamId)).toEqual(ids)
      controllers[members - 1]!.abort(new Error('last waiter cancelled'))
      await expect(waits[members - 1]).rejects.toThrow('last waiter cancelled')
      expect(await Promise.all(waits.slice(0, -1))).toEqual(
        Array.from({ length: members - 1 }, () => ({ timedOut: false })),
      )
      expect(activity.waitingMembers(teamId)).toEqual([])
      activity.close()
    })
  }

  it('retains an external worker as runnable while another member waits', async () => {
    const activity = new TeamActivity()
    const teamId = TeamId('external-worker-team')
    const waiterId = SessionId('waiting-parent')
    const workerId = SessionId('working-grandchild')
    const controller = new AbortController()
    const waiting = activity.wait(teamId, waiterId, 10_000, controller.signal)
    expect(activity.isWaiting(teamId, waiterId)).toBe(true)
    expect(activity.isWaiting(teamId, workerId)).toBe(false)
    activity.notify(teamId)
    await expect(waiting).resolves.toEqual({ timedOut: false })
    expect(activity.waitingMembers(teamId)).toEqual([])
    activity.close()
  })
})
