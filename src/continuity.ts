/** Keep the current turn open while its owned background work is still live. */
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { JobId, JobView } from '@deepseek-ai/dsh-jobs'
import type {} from '@deepseek-ai/dsh-agent-preset-registry'
import type {} from '@deepseek-ai/dsh-tool-jobs'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'

/** Install per-agent controls and a cancellable event-driven wait at turn end. */
export function installBackgroundContinuity(ctx: Context, excludedPresets: ReadonlySet<string>): void {
  const lifecycle = new AbortController()
  const detached = new WeakMap<Agent, Set<JobId>>()
  const tracked = new WeakMap<Agent, Set<JobId>>()
  const maxTokensTurn = new WeakMap<Agent, number>()
  const installed = new Map<Agent, () => void>()

  function enabled(agent: Agent): boolean {
    const preset = ctx.get('agentPresets')?.composedPreset(agent.ctx) ?? agent.session.header.agentPreset
    return preset === undefined || !excludedPresets.has(preset)
  }

  function liveJobs(agent: Agent): JobView[] {
    const ignored = detached.get(agent)
    const relevant = tracked.get(agent)
    return ctx.jobs.list(agent.id).filter(job => job.owner === agent.id
      && (job.status === 'running' || job.status === 'stopping') && relevant?.has(job.id) === true && !ignored?.has(job.id))
  }

  function remember(agent: Agent, job: JobView): void {
    let relevant = tracked.get(agent)
    if (relevant === undefined) { relevant = new Set(); tracked.set(agent, relevant) }
    relevant.add(job.id)
  }

  function addScope(agent: Agent): () => void {
    const scope = agent.ctx
    const disposers: Array<() => void> = []
    try {
      disposers.push(ctx.jobs.events.subscribe({ owner: agent.id }, (event) => {
        if (event.type === 'registered' && event.job.owner === agent.id && agent.status === 'running') remember(agent, event.job)
        else if (event.type === 'removed' || event.type === 'settled') tracked.get(agent)?.delete(event.job.id)
      }))
      disposers.push(scope.systemPrompt.section({
        name: 'team:background-continuity',
        order: scope.systemPrompt.getSectionOrder('TOOL_JOBS') + 1,
        text: '本次任务需要的后台作业未结束时，会话会等待作业状态变化再继续；等待不消耗模型请求。收集结果并检查失败项后再报告最终完成。只有用户要求保持运行的服务或驻留进程，才用 team_job_policy 标记 detach；普通任务不要为了结束回复而脱离跟踪。用户的新消息与停止操作优先。',
      }))
      disposers.push(scope.tools.register(defineTool({
        name: 'team_job_policy',
        description: '调整当前会话自己的后台作业是否阻止本轮结束。detach 仅用于需要长期运行的服务；follow 恢复等待任务完成。',
        parameters: {
          job_id: { type: 'string', required: true, description: '当前会话的后台作业 ID。' },
          action: { type: 'string', required: true, enum: ['detach', 'follow'], description: 'detach 放行长期服务，follow 等待作业结束。' },
        },
        output: { schema: { type: 'object', additionalProperties: false, properties: {
          job_id: { type: 'string', required: true }, action: { type: 'string', required: true }, status: { type: 'string', required: true },
        } }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
        execute(args, exec) {
          if (exec.agent !== agent) throw new Error('只能调整当前会话自己的后台作业。')
          const job = ctx.jobs.list(agent.id).find(candidate => candidate.id === args.job_id && candidate.owner === agent.id)
          if (job === undefined) throw new Error('未找到当前会话拥有的后台作业。')
          let ignored = detached.get(agent)
          if (ignored === undefined) { ignored = new Set(); detached.set(agent, ignored) }
          if (args.action === 'detach') ignored.add(job.id)
          else { ignored.delete(job.id); remember(agent, job) }
          return Promise.resolve({ job_id: job.id, action: args.action, status: job.status })
        },
      })))
    } catch (error: unknown) {
      for (const dispose of disposers.reverse()) dispose()
      throw error
    }
    return () => { for (const dispose of disposers.reverse()) dispose() }
  }

  function maybeInstall(agent: Agent): void {
    if (!enabled(agent)) { installed.get(agent)?.(); installed.delete(agent); return }
    if (!installed.has(agent)) installed.set(agent, addScope(agent))
  }

  for (const agent of ctx.agents.list()) maybeInstall(agent)
  ctx.on('agent/created', ({ agent }) => { maybeInstall(agent) })
  ctx.on('agent/disposed', ({ agent }) => { installed.get(agent)?.(); installed.delete(agent) })
  ctx.on('session/event', (session, event) => {
    const agent = ctx.agents.get(session.id)
    if (agent === undefined) return
    if (event.type === 'agent-preset/selected') { maybeInstall(agent); return }
    if (event.type === 'turn/start') { maxTokensTurn.delete(agent); return }
    if (event.type === 'assistant/message' && event.data.stream.some(record => record.type === 'chunk'
      && record.chunk.type === 'finish' && record.chunk.reason.kind === 'max-tokens')) {
      maxTokensTurn.set(agent, event.data.turn)
      return
    }
    if (event.type !== 'tool/call' || event.data.name !== 'job_output' || !installed.has(agent)) return
    let args: unknown
    try { args = JSON.parse(event.data.arguments) } catch { return }
    if (typeof args !== 'object' || args === null || !('job_id' in args) || typeof args.job_id !== 'string') return
    const job = ctx.jobs.list(agent.id).find(candidate => candidate.owner === agent.id && candidate.id === args.job_id)
    if (job !== undefined) remember(agent, job)
  })

  ctx.on('agent/turn-stopping', async ({ agent, turn, signal }) => {
    if (!installed.has(agent) || lifecycle.signal.aborted || signal.aborted) return
    if (maxTokensTurn.get(agent) === turn) return
    if (agent.inbox.nextStep.length > 0 || agent.inbox.nextTurn.length > 0) return
    const initial = liveJobs(agent)
    if (initial.length === 0) return
    const watched = new Set(initial.map(job => job.id))
    await new Promise<void>((resolve) => {
      let settled = false
      let unsubscribeJobs = () => {}
      let unsubscribeInput = () => {}
      const finish = (): void => {
        if (settled) return
        settled = true
        unsubscribeJobs()
        unsubscribeInput()
        signal.removeEventListener('abort', finish)
        lifecycle.signal.removeEventListener('abort', finish)
        resolve()
      }
      unsubscribeJobs = ctx.jobs.events.subscribe({ owner: agent.id }, (event) => {
        if (event.type === 'removed' && watched.has(event.job.id)) {
          watched.delete(event.job.id)
          if (liveJobs(agent).every(job => !watched.has(job.id))) finish()
          return
        }
        if (event.type !== 'settled' || !watched.has(event.job.id) || event.job.owner !== agent.id) return
        queueMicrotask(() => {
          if (settled || signal.aborted || lifecycle.signal.aborted) return
          const id = event.job.id
          const announced = agent.inbox.nextStep.some(message => message.source.kind === 'tool-jobs'
            && message.content.some(block => block.type === 'text' && block.text.includes(id)))
          if (!announced) {
            const detail = event.job.detail === undefined ? '' : `，${event.job.detail}`
            agent.inject(createUserMessage({
              source: { kind: 'tool-jobs', form: 'notice', summary: `后台作业 ${id} 已结束` },
              content: [{ type: 'text', text: `后台作业 ${id} 状态：${event.job.status}${detail}。请用 job_output 收集结果，核对失败项和验收条件后继续。` }],
            }))
          }
          finish()
        })
      })
      unsubscribeInput = ctx.on('agent/inbox/inserted', ({ agent: owner }) => { if (owner === agent) finish() })
      signal.addEventListener('abort', finish, { once: true })
      lifecycle.signal.addEventListener('abort', finish, { once: true })
      if (signal.aborted || lifecycle.signal.aborted || agent.inbox.nextStep.length > 0
        || agent.inbox.nextTurn.length > 0 || liveJobs(agent).every(job => !watched.has(job.id))) finish()
    })
    signal.throwIfAborted()
  })

  ctx.effect(() => () => {
    lifecycle.abort()
    for (const dispose of installed.values()) dispose()
    installed.clear()
  }, 'team.backgroundContinuity')
}
