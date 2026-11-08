/** External model fixture with explicit request entry, completion, and cancellation. */

import { addAbortListener } from 'node:events'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import { MockAdapter, textResponse } from '../../../core/agent-loop/tests/mock-adapter.ts'

/** One provider request that remains active until released or cancelled. */
export interface ControlledCall {
  readonly options: GenerateOptions
  readonly release: () => void
  readonly finished: Promise<void>
}

/** Real Agent loops use this adapter in place of a remote model service. */
export class ControlledAdapter extends MockAdapter {
  readonly calls: ControlledCall[] = []
  active = 0
  peak = 0

  constructor() {
    super([], { efforts: [
      { id: ReasoningEffortId('low'), name: 'Low' },
      { id: ReasoningEffortId('high'), name: 'High' },
    ] }, 4096)
  }

  override async * stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    options.signal?.throwIfAborted()
    const gate = Promise.withResolvers<undefined>()
    const finished = Promise.withResolvers<undefined>()
    this.requests.push(options)
    this.calls.push({ options, release: () => { gate.resolve(undefined) }, finished: finished.promise })
    this.active += 1
    this.peak = Math.max(this.peak, this.active)
    const subscription = options.signal === undefined ? undefined : addAbortListener(options.signal, () => {
      gate.reject(options.signal?.reason)
    })
    try {
      await gate.promise
      yield * textResponse('Controlled model completed this request.')
    } finally {
      subscription?.[Symbol.dispose]()
      this.active -= 1
      finished.resolve(undefined)
    }
  }
}
