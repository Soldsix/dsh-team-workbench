/** Cooperative writers serialize without deleting another owner's lease. */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { once } from 'node:events'
import { afterEach, expect, it } from 'vitest'
import { CoordinationLocks } from '../src/coordination.ts'

const cleanup: (() => Promise<void>)[] = []
afterEach(async () => { for (const action of cleanup.splice(0).reverse()) await action() })
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'team-coordination-'))
  cleanup.push(() => rm(root, { force: true, recursive: true }))
  const first = new CoordinationLocks(join(root, 'locks'), 2000, 5)
  const second = new CoordinationLocks(join(root, 'locks'), 2000, 5)
  cleanup.push(async () => { first.close(); second.close() })
  return { root, first, second }
}

it('excludes a second Team writer and releases ownership on disposal', async () => {
  const { first, second } = await fixture()
  await Promise.all([first.own('same-team'), first.own('same-team')])
  await expect(second.own('same-team')).rejects.toThrow('Another DSH process')
  await expect(second.own('different-team')).resolves.toBeUndefined()
  first.close()
  await expect(second.own('same-team')).resolves.toBeUndefined()
  await expect(first.own('closed-team')).rejects.toThrow('closed')
})

it('serializes publishers and preserves cancellation without entering the operation', async () => {
  const { root, first, second } = await fixture()
  const entered = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  const controller = new AbortController()
  let touched = false
  const active = first.publish(root, undefined, async () => { entered.resolve(); await release.promise; return 1 })
  await entered.promise
  const rejected = expect(second.publish(root, controller.signal, async () => { touched = true })).rejects.toThrow()
  controller.abort(new Error('cancelled publication'))
  await rejected
  expect(touched).toBe(false)
  release.resolve()
  expect(await active).toBe(1)
  expect(await second.publish(root, undefined, async () => 2)).toBe(2)
})

it('releases the publication lock when the operation fails', async () => {
  const { root, first, second } = await fixture()
  await expect(first.publish(root, undefined, async () => { throw new Error('fixture failure') })).rejects.toThrow('fixture failure')
  expect(await second.publish(root, undefined, async () => 'recovered')).toBe('recovered')
})

it('releases an actual child-process owner lock after that process is killed', async () => {
  const { root, second } = await fixture()
  const key = createHash('sha256').update('crash-team').digest('hex') + '.sqlite'
  const child = spawn(process.execPath, ['--input-type=module', '--eval',
    "import{mkdirSync}from'node:fs';import{DatabaseSync}from'node:sqlite';mkdirSync(process.argv[1],{recursive:true});const db=new DatabaseSync(process.argv[2]);db.exec('BEGIN IMMEDIATE');process.stdout.write('locked');setInterval(()=>{},1000)",
    join(root, 'locks'), join(root, 'locks', key)], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] })
  cleanup.push(async () => { if (child.exitCode === null && child.signalCode === null) { child.kill(); await once(child, 'exit') } })
  await once(child.stdout!, 'data')
  await expect(second.own('crash-team')).rejects.toThrow('Another DSH process')
  const exited = once(child, 'exit')
  child.kill()
  await exited
  await expect(second.own('crash-team')).resolves.toBeUndefined()
})
