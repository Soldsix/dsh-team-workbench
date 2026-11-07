/** A re-evaluated consumer can schedule work on an existing Tool runtime. */
import { Context } from '@deepseek-ai/cordis'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime, { defineContentToolFixture } from '../src/index.ts'
import { expect, it, vi } from 'vitest'

it('dispatches through the scheduler when its consumer loads a second module instance', async () => {
  const ctx = new Context()
  try {
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    ctx.tools.register(defineContentToolFixture({
      name: 'retained-tool', description: 'Read the fixture', parameters: {},
      async execute() { return [{ type: 'text', text: 'retained result' }] },
    }))
    vi.resetModules()
    const consumer = await import('../src/index.ts')
    const scheduler = ctx.tools[consumer.TOOL_RUNTIME_SCHEDULER]
    const prepared = await scheduler.prepare({
      signal: new AbortController().signal, callId: ToolCallId('retained-call'),
      name: 'retained-tool', arguments: {},
    })
    if (prepared.kind !== 'dispatch') throw new Error('the registered fixture did not reach dispatch')
    const dispatched = await scheduler.dispatch(prepared.exec)
    const result = dispatched.kind === 'post-result'
      ? await scheduler.finalize(prepared.exec, dispatched.result)
      : scheduler.finish(prepared.exec, dispatched.result)
    expect(result).toMatchObject({ content: [{ type: 'text', text: 'retained result' }] })
  } finally {
    await ctx.fiber.dispose()
  }
})
