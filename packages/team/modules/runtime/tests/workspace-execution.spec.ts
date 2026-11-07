import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { expect, it } from 'vitest'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { SESSION_FORMAT_VERSION, Session, SessionId } from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime, { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import SandboxPolicyService from '@deepseek-ai/dsh-sandbox-policy'
import LocalSandboxProvider from '@deepseek-ai/dsh-sandbox-local'
import SandboxedFileSystem from '@deepseek-ai/dsh-fs-sandbox'
import LocalSubprocessRuntime from '@deepseek-ai/dsh-subprocess-local'
import { SandboxPwshExecutor } from '@deepseek-ai/dsh-pwsh-sandbox'
import { resolvePwshPath } from '@deepseek-ai/dsh-pwsh-local'
import NodePtcRuntime from '@deepseek-ai/dsh-ptc-runtime-node'
import { TeamWorkspaceRuntime } from '../src/workspace-runtime.ts'
import { mountWorkingDirectoryFixture } from '../../../subagent/subagent/tests/working-directory-fixture.ts'
import { assertWorkspaceOutsideTemp, outsideTempWorkspaceParent } from '../../../../scripts/snapshot-workspace-parent.ts'

function session(id: string, cwd: string): Session {
  const sessionId = SessionId(id)
  return Session.create(sessionId, undefined, {
    version: SESSION_FORMAT_VERSION, id: sessionId, createdAt: 0, isSeeded: false, cwd,
  })
}

function agent(active: Session, ctx: Context): Agent {
  return { id: active.id, session: active, ctx } as Agent
}

async function fixture(onTestFinished: (callback: () => Promise<void>) => void, shell: boolean, ptc = false,
  additionalMcpTools?: string[]) {
  const fibers: Array<{ dispose(): Promise<void> }> = []
  const base = await mkdtemp(join(outsideTempWorkspaceParent(), '.dsh-team-isolation-'))
  assertWorkspaceOutsideTemp(base)
  const shared = join(base, 'shared')
  const store = join(base, 'store')
  await mkdir(shared)
  await mkdir(store)
  onTestFinished(async () => {
    for (const fiber of fibers.reverse()) await fiber.dispose()
    const canonical = resolve(base)
    const rel = relative(resolve(outsideTempWorkspaceParent()), canonical)
    if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`)) throw new Error('test cleanup escaped workspace parent')
    await rm(canonical, { recursive: true, force: true })
  })
  const ctx = new Context()
  await mountWorkingDirectoryFixture(ctx)
  fibers.push(await ctx.plugin(SystemPrompt))
  fibers.push(await ctx.plugin(ToolRuntime, { mode: ptc ? 'ptc' : 'native' }))
  fibers.push(await ctx.plugin(SessionProjectionRegistry))
  fibers.push(await ctx.plugin(SandboxPolicyService, { mode: 'danger-full-access', workspaceRoot: shared }))
  fibers.push(await ctx.plugin(LocalSandboxProvider, {}))
  fibers.push(await ctx.plugin(SandboxedFileSystem, { cwd: shared }))
  if (shell || ptc) {
    fibers.push(await ctx.plugin(LocalSubprocessRuntime))
  }
  if (shell) {
    fibers.push(await ctx.plugin(SandboxPwshExecutor, {}))
  }
  if (ptc) fibers.push(await ctx.plugin(NodePtcRuntime, {}))
  const lead = agent(session('team-lead', shared), ctx)
  const runtime = new TeamWorkspaceRuntime(ctx, {
    storageRoot: store, maxFiles: 20, maxBytes: 4096,
    allowedTools: ptc ? ['run_code'] : shell ? ['write', 'edit', 'pwsh'] : ['write', 'edit'],
    ...(additionalMcpTools === undefined ? {} : { additionalMcpTools }),
  })
  const workspace = await runtime.create(lead, lead, SessionId('team-child'), new AbortController().signal)
  const child = session('team-child', workspace.cwd)
  return { base, shared, ctx, lead, runtime, workspace, child }
}

it('exposes only explicitly named MCP tools to a restored isolated member', async ({ onTestFinished }) => {
  const allowed = 'mcp__adspower__check_status_123456789abc'
  const denied = 'mcp__adspower__delete_profile_123456789abc'
  const { ctx, runtime, child } = await fixture(onTestFinished, false, false, [allowed])
  let calls = 0
  for (const name of [allowed, denied]) {
    ctx.tools.register(defineContentToolFixture({
      name, description: name, parameters: {},
      async execute() { calls++; return [{ type: 'text', text: name }] },
    }))
  }
  const member = agent(child, ctx)
  expect(ctx.tools.get(allowed, member)).toBeDefined()
  expect(ctx.tools.get(denied, member)).toBeUndefined()
  const result = await ctx.tools.execute({ signal: new AbortController().signal,
    callId: ToolCallId('mcp-allowed'), name: allowed, arguments: {}, agent: member })
  expect(result.isError, JSON.stringify(result.content)).toBe(false)
  const rejected = await ctx.tools.execute({ signal: new AbortController().signal,
    callId: ToolCallId('mcp-denied'), name: denied, arguments: {}, agent: member })
  expect(rejected.error?.info).toEqual({ name: 'ToolNotFoundError', code: 'UNKNOWN_TOOL' })
  expect(calls).toBe(1)
  expect(() => new TeamWorkspaceRuntime(ctx, {
    storageRoot: 'unused', maxFiles: 1, maxBytes: 1, allowedTools: ['read'],
    additionalMcpTools: ['mcp__adspower__*'],
  })).toThrow(/exact server-qualified MCP/u)
  runtime.dispose()
})

it('real sandboxed filesystem denies child write and edit of the shared root', async ({ onTestFinished }) => {
  const { shared, ctx, runtime, workspace, child } = await fixture(onTestFinished, false)
  const file = join(shared, 'same.txt')
  await writeFile(file, 'shared')
  const fs = ctx.fs as SandboxedFileSystem
  const policy = ctx.sandboxPolicy.resolve({ session: child, mode: 'danger-full-access' })
  expect(policy.mode).toBe('workspace-write')
  await expect(fs.writeText(await fs.resolve(file), 'clobbered', undefined, undefined, policy))
    .rejects.toMatchObject({ code: 'FS_SANDBOX_DENIED' })
  await expect(fs.editText(await fs.resolve(file), { oldString: 'shared', newString: 'clobbered', replaceAll: false },
    undefined, undefined, policy)).rejects.toMatchObject({ code: 'FS_SANDBOX_DENIED' })
  expect(await readFile(file, 'utf8')).toBe('shared')
  const privateFile = join(workspace.cwd, 'own.txt')
  await fs.writeText(await fs.resolve(privateFile), 'private', undefined, undefined, policy)
  expect(await readFile(privateFile, 'utf8')).toBe('private')
  runtime.dispose()
})

it('narrows a root-authorized member to assigned files and its declared artifact directory', async ({ onTestFinished }) => {
  const { shared, ctx, lead, runtime } = await fixture(onTestFinished, false)
  await mkdir(join(shared, 'src'))
  await mkdir(join(shared, '.artifacts', 'selected'), { recursive: true })
  await mkdir(join(shared, '.artifacts', 'other'), { recursive: true })
  await writeFile(join(shared, 'src', 'entry.ts'), 'input')
  await writeFile(join(shared, '.artifacts', 'other', 'unused.md'), 'unused')
  await writeFile(join(shared, 'unrelated.bin'), 'unused')
  const scoped = new TeamWorkspaceRuntime(ctx, {
    storageRoot: join(shared, '..', 'store'), maxFiles: 2, maxBytes: 100,
    omittedDirectories: ['.artifacts'], allowedTools: ['read', 'write'],
  })
  const execution = { readPaths: ['.'], writePaths: ['.artifacts/selected'], webOrigins: [],
    allowSearch: false, allowUnrestrictedExecution: false }
  const selected = await scoped.create(lead, lead, SessionId('selected-member'), new AbortController().signal,
    execution, ['src/entry.ts'])
  expect(await readFile(join(selected.cwd, 'src', 'entry.ts'), 'utf8')).toBe('input')
  await expect(readFile(join(selected.cwd, 'unrelated.bin'))).rejects.toMatchObject({ code: 'ENOENT' })
  await writeFile(join(selected.cwd, '.artifacts', 'selected', 'result.md'), 'result')
  expect(await scoped.integrate(lead, selected, new AbortController().signal, undefined,
    [{ path: '.artifacts/selected/result.md', bytes: 6, sha256: createHash('sha256').update('result').digest('hex') }]))
    .toEqual({ paths: ['.artifacts/selected/result.md'] })
  await expect(scoped.create(lead, lead, SessionId('escaped-member'), new AbortController().signal,
    execution, ['../store'])).rejects.toThrow('below the project root')
  scoped.dispose()
  runtime.dispose()
})

it('preflights existing inputs without copying and explains that future deliverables are not inputs', async ({ onTestFinished }) => {
  const { shared, lead, runtime } = await fixture(onTestFinished, false)
  await mkdir(join(shared, 'src'))
  await writeFile(join(shared, 'src', 'input.js'), 'export const fixture = true\n')
  await writeFile(join(shared, 'unrelated.txt'), 'outside the selected inputs')
  const signal = new AbortController().signal
  const store = resolve(shared, '..', 'store')
  const before = await readdir(store)
  const execution = { readPaths: ['src'], writePaths: ['.artifacts/result'], webOrigins: [],
    allowSearch: false, allowUnrestrictedExecution: false }
  expect(await runtime.validateSelection(lead, execution, ['src/input.js'], signal)).toEqual(['src/input.js'])
  expect(await readdir(store)).toEqual(before)
  await expect(runtime.validateSelection(lead, execution, ['unrelated.txt'], signal))
    .rejects.toThrow(/outside the confirmed read scope/u)
  await expect(runtime.validateSelection(lead, execution, ['.artifacts/result/report.md'], signal))
    .rejects.toThrow(/working_paths selects existing inputs, not future outputs/u)
  expect(await readdir(store)).toEqual(before)
  expect(existsSync(join(shared, '.artifacts'))).toBe(false)
  runtime.dispose()
})

it('rejects sibling-project inputs before preparing an isolated member workspace', async ({ onTestFinished }) => {
  const { base, shared, lead, runtime } = await fixture(onTestFinished, false)
  const sibling = join(base, 'sibling')
  await mkdir(sibling)
  await writeFile(join(sibling, 'input.py'), 'print("fixture")\n')
  await writeFile(join(shared, 'local.py'), 'print("local")\n')
  const execution = { readPaths: [sibling], writePaths: [shared], webOrigins: [],
    allowSearch: false, allowUnrestrictedExecution: false }
  await expect(runtime.validateSelection(lead, execution, [join(sibling, 'input.py')]))
    .rejects.toThrow(/relative to the Team Lead project/u)
  await expect(runtime.validateSelection(lead, execution, ['local.py']))
    .rejects.toThrow(/outside the confirmed read scope/u)
  await expect(runtime.validateSelection(lead, execution, ['sibling/input.py']))
    .rejects.toThrow(/does not exist below the Lead project/u)
  await expect(runtime.validateSelection(lead, execution))
    .rejects.toThrow(/Start the Team in the target project or a common parent/u)
  await expect(runtime.validateSelection(lead, execution, []))
    .rejects.toThrow(/working_paths is empty/u)
  expect(await runtime.validateSelection(lead, { ...execution, readPaths: [base] }, ['local.py']))
    .toEqual(['local.py'])
  expect(() => new TeamWorkspaceRuntime(lead.ctx, {
    storageRoot: join(base, 'store'), maxFiles: 20, maxBytes: 4096, allowedTools: ['team_task_reconcile'],
  })).not.toThrow()
  runtime.dispose()
})

it('requires a narrow working set before an automatic large-project copy', async ({ onTestFinished }) => {
  const { shared, ctx, lead, runtime } = await fixture(onTestFinished, false)
  await writeFile(join(shared, 'first.txt'), 'first')
  await writeFile(join(shared, 'second.txt'), 'second')
  const scoped = new TeamWorkspaceRuntime(ctx, {
    storageRoot: join(shared, '..', 'store'), maxFiles: 20, maxBytes: 4096,
    maxAutomaticFiles: 1, maxAutomaticBytes: 4096, allowedTools: ['read'],
  })
  await expect(scoped.validateSelection(lead)).rejects.toThrow(/working_paths/u)
  expect(await scoped.validateSelection(lead, undefined, ['first.txt'])).toEqual(['first.txt'])
  scoped.dispose()
  runtime.dispose()
})

const pwshAvailable = process.platform === 'win32'
  && spawnSync(resolvePwshPath(), ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', '$true'], { encoding: 'utf8' }).status === 0

it.skipIf(!pwshAvailable)('real sandboxed shell cannot write the shared root from a child cwd', async ({ onTestFinished }) => {
  const { shared, ctx, runtime, workspace, child } = await fixture(onTestFinished, true)
  const target = join(shared, 'shell-escape.txt')
  const executor = ctx.shell as SandboxPwshExecutor
  const policy = ctx.sandboxPolicy.resolve({ session: child, mode: 'danger-full-access' })
  const command = `Set-Content -Path '${target.replaceAll("'", "''")}' -Value escaped -ErrorAction Stop`
  const execution = await executor.execute(executor.resolve({ command, workdir: workspace.cwd, sandboxPolicy: policy }))
  const result = await execution.result()
  expect(result.exitCode).not.toBe(0)
  expect(existsSync(target)).toBe(false)
  runtime.dispose()
}, 20_000)

it('real run_code process cannot write the shared root from a child cwd', async ({ onTestFinished }) => {
  const { shared, ctx, runtime, workspace, child } = await fixture(onTestFinished, false, true)
  const target = join(shared, 'ptc-escape.txt')
  const privateTarget = join(workspace.cwd, 'ptc-private.txt')
  const code = `const fs = await import('node:fs/promises'); let escaped = false; try { await fs.writeFile(${JSON.stringify(target)}, 'escaped'); escaped = true } catch {} await fs.writeFile(${JSON.stringify(privateTarget)}, 'private'); return escaped`
  const result = await ctx.tools.execute({
    signal: new AbortController().signal,
    callId: ToolCallId('team-isolated-run-code'),
    name: 'run_code',
    arguments: { code, description: 'Check isolated workspace writes' },
    agent: agent(child, ctx),
  })
  expect(result.isError, JSON.stringify(result.content)).toBe(false)
  expect(result.content).toHaveLength(1)
  const content = result.content[0]
  expect(content?.type).toBe('text')
  if (content?.type !== 'text') throw new Error('PTC returned a non-text fixture result')
  expect(content.text).toContain('false')
  expect(existsSync(target)).toBe(false)
  expect(await readFile(privateTarget, 'utf8')).toBe('private')
  runtime.dispose()
})
