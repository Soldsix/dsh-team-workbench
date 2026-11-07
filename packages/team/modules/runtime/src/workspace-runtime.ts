/** Host-owned Team member workspace and execution caps. */

import { teamAuditedTools } from './tool-capabilities.ts'
import { mkdir, stat } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-sandbox'
import type {} from '@deepseek-ai/dsh-sandbox-policy'
import type {} from '@deepseek-ai/dsh-tools'
import { SandboxedFileSystem } from '@deepseek-ai/dsh-fs-sandbox'
import { SandboxBashExecutor } from '@deepseek-ai/dsh-bash-sandbox'
import { SandboxPwshExecutor } from '@deepseek-ai/dsh-pwsh-sandbox'
import { NodePtcRuntime } from '@deepseek-ai/dsh-ptc-runtime-node'
import { checkAutomaticWorkspaceSize, createMemberWorkspace, integrateMemberWorkspace } from './workspaces.ts'
import type { MemberWorkspace, WorkspaceIntegration, WorkspaceLimits } from './workspaces.ts'
import type { TeamExecutionScope } from './goal-types.ts'
import type { TeamFileReceipt } from './task-work-types.ts'
import { refreshMemberInputs } from './workspace-refresh.ts'
import { withinExecutionPaths, workspaceCopyPaths, workspaceExplicitPaths } from './execution-scope.ts'

/** MCP tools require their complete, server-qualified public name in the profile. */
function allowedMcpToolName(name: string): boolean {
  return name.length <= 64 && /^mcp__[A-Za-z0-9_-]+__[A-Za-z0-9_-]+$/u.test(name)
}

/** Durable member data used to restore confinement before a cold activation. */
export interface TeamWorkspaceRecord extends MemberWorkspace {
  readonly maxMode: 'read-only' | 'workspace-write'
}

/** Profile-owned isolation settings; the storage root must be outside each shared workspace. */
export interface TeamWorkspaceConfig extends Omit<WorkspaceLimits, 'signal' | 'includedPaths' | 'omittedDirectories' | 'readOnlySharedDirectories'> {
  /** Storage directory for member copies and baseline manifests, outside shared workspaces. */
  readonly storageRoot: string
  /** Fast preflight cap for an automatic complete-project copy. */
  readonly maxAutomaticFiles?: number
  /** Fast preflight byte cap for an automatic complete-project copy. */
  readonly maxAutomaticBytes?: number
  /** Exact audited native tool names allowed for isolated members. */
  readonly allowedTools: string[]
  /** Exact server-qualified MCP tool names added to the member cap. */
  readonly additionalMcpTools?: string[]
  /** Top-level cache directories omitted from member copies. */
  readonly omittedDirectories?: string[]
  /** Top-level dependency directories linked for reads; the sandbox denies writes. */
  readonly readOnlySharedDirectories?: string[]
}

/** Creates member copies and retains process-local execution caps until Team disposal. */
export class TeamWorkspaceRuntime {
  private readonly caps = new Map<SessionId, { record: TeamWorkspaceRecord; release: () => void }>()

  /** @param ctx - host services that enforce file and tool execution. @param config - storage, limits, and audited tools. */
  constructor(private readonly ctx: Context, private readonly config: TeamWorkspaceConfig) {
    if ((config.maxAutomaticFiles === undefined) !== (config.maxAutomaticBytes === undefined)
      || config.maxAutomaticFiles !== undefined && (!Number.isSafeInteger(config.maxAutomaticFiles) || config.maxAutomaticFiles < 1)
      || config.maxAutomaticBytes !== undefined && (!Number.isSafeInteger(config.maxAutomaticBytes) || config.maxAutomaticBytes < 1)) {
      throw new Error('Team automatic workspace limits must both be positive safe integers')
    }
    if (!Array.isArray(config.allowedTools) || config.allowedTools.some(name => !teamAuditedTools.has(name))
      || (config.additionalMcpTools !== undefined
        && (!Array.isArray(config.additionalMcpTools) || config.additionalMcpTools.some(name => !allowedMcpToolName(name))))) {
      throw new Error('Team isolated members require audited native and exact server-qualified MCP tool names')
    }
  }

  /** Resolve enforcement services at use time so unloaded providers fail closed. */
  private requireEnforcement() {
    const policy = this.ctx.get('sandboxPolicy')
    const sandbox = this.ctx.get('sandbox')
    const tools = this.ctx.get('tools')
    const fs = this.ctx.get('fs')
    const shell = this.ctx.get('shell')
    const ptc = this.ctx.get('ptcRuntime')
    if (policy === undefined || sandbox === undefined || tools === undefined
      || !(fs instanceof SandboxedFileSystem)
      || (this.config.allowedTools.some(name => name === 'bash' || name === 'pwsh')
        && !(shell instanceof SandboxBashExecutor || shell instanceof SandboxPwshExecutor))
      || (this.config.allowedTools.includes('run_code') && !(ptc instanceof NodePtcRuntime))) {
      throw new Error('Team isolated members require sandboxed filesystem, shell, and PTC providers for their allowed tools')
    }
    return { policy, tools }
  }

  /**
   * Check a proposed working set before a durable member name is reserved.
   * @param lead - Team Lead whose cwd owns isolated member copies.
   * @param execution - Confirmed file resources for this Team.
   * @param workingPaths - Optional project-relative member inputs.
   * @param signal - Caller cancellation during the metadata preflight.
   * @returns project-relative paths selected for a member copy.
   */
  async validateSelection(lead: Agent, execution?: TeamExecutionScope, workingPaths?: readonly string[],
    signal?: AbortSignal): Promise<string[]> {
    const sharedPath = lead.session.header.cwd
    if (sharedPath === undefined) throw new Error('Team isolated members require a Lead cwd')
    if (workingPaths?.length === 0) {
      throw new Error('working_paths is empty; omit it to use the confirmed project scope, or list existing project-relative inputs')
    }
    const selectedPaths: string[] = []
    for (const requested of workingPaths ?? []) {
      if (typeof requested !== 'string' || requested.trim() === '' || isAbsolute(requested)) {
        throw new Error(`working_paths must contain non-empty paths relative to the Team Lead project ${sharedPath}; an absolute or sibling path cannot be copied into this Team`)
      }
      const path = relative(sharedPath, resolve(sharedPath, requested))
      if (path === '' || path === '..' || path.startsWith(`..${sep}`) || isAbsolute(path)) {
        throw new Error('Team member working paths must select files below the project root')
      }
      const source = resolve(sharedPath, requested)
      try { await stat(source) }
      catch (error: unknown) {
        if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error
        throw new Error(`Team member working path does not exist below the Lead project: ${requested}. working_paths selects existing inputs, not future outputs. Select the existing input file/directory; keep deliverables in task write_scopes/artifact_paths and the confirmed write scope. Use team_workspace prepare before creating members.`, { cause: error })
      }
      if (execution !== undefined && !await withinExecutionPaths(execution.readPaths, sharedPath, requested)) {
        throw new Error(`Team member working path is outside the confirmed read scope: ${requested}`)
      }
      selectedPaths.push(path.split(sep).join('/'))
    }
    const hasProjectRead = execution?.readPaths.some((root) => {
      if (root === '*') return true
      const tail = relative(sharedPath, resolve(sharedPath, root))
      return tail === '' || tail !== '..' && !tail.startsWith(`..${sep}`) && !isAbsolute(tail)
    })
    if (execution !== undefined && execution.readPaths.length > 0 && !hasProjectRead && selectedPaths.length === 0) {
      throw new Error(`This Team's confirmed read paths do not select a working set inside its Lead project ${sharedPath}. Isolated members cannot read sibling projects from this Team. Start the Team in the target project or a common parent, or provide project-relative working_paths within the confirmed read scope.`)
    }
    if (workingPaths === undefined && workspaceCopyPaths(execution, sharedPath) === undefined
      && this.config.maxAutomaticFiles !== undefined && this.config.maxAutomaticBytes !== undefined) {
      await checkAutomaticWorkspaceSize(sharedPath, {
        maxFiles: this.config.maxAutomaticFiles, maxBytes: this.config.maxAutomaticBytes,
        ...this.config.omittedDirectories === undefined ? {} : { omittedDirectories: this.config.omittedDirectories },
        ...this.config.readOnlySharedDirectories === undefined ? {} : { readOnlySharedDirectories: this.config.readOnlySharedDirectories },
        includedOmittedPaths: workspaceExplicitPaths(execution, sharedPath)
          .filter(path => this.config.omittedDirectories?.includes(path.split('/')[0] ?? '')),
      }, signal)
    }
    return selectedPaths
  }

  /**
   * Capture the Lead workspace and install both caps before child materialization.
   * @param lead - Team Lead whose cwd is the shared integration root.
   * @param caller - direct delegator whose current read-only limit is inherited.
   * @param childId - reserved child Session id.
   * @param signal - caller cancellation during copying.
   * @param execution - Confirmed file roots used to select the project working set.
   * @param workingPaths - Optional project-relative paths selected for this member.
   * @param empty - Start without copying inputs when none are required by the approved task.
   * @returns durable member workspace record.
   */
  async create(
    lead: Agent, caller: Agent, childId: SessionId, signal: AbortSignal, execution?: TeamExecutionScope,
    workingPaths?: readonly string[],
    empty = false,
  ): Promise<TeamWorkspaceRecord> {
    const sharedPath = lead.session.header.cwd
    if (sharedPath === undefined) throw new Error('Team isolated members require a Lead cwd')
    const { policy } = this.requireEnforcement()
    signal.throwIfAborted()
    await mkdir(this.config.storageRoot, { recursive: true })
    const selectedPaths = empty ? [] : await this.validateSelection(lead, execution, workingPaths, signal)
    const outputs = empty || execution === undefined ? [] : workspaceExplicitPaths(
      { ...execution, readPaths: [] }, sharedPath,
    )
    const includedPaths = empty ? [] : workingPaths === undefined ? workspaceCopyPaths(execution, sharedPath)
      : [...new Set([...selectedPaths, ...outputs])]
    const includedOmittedPaths = [...new Set([...workspaceExplicitPaths(execution, sharedPath), ...selectedPaths])]
      .filter(path => this.config.omittedDirectories?.some(name => name === path.split('/')[0]))
    const workspace = await createMemberWorkspace(sharedPath, this.config.storageRoot, {
      ...this.config, ...empty ? { readOnlySharedDirectories: [] } : {}, signal, includedOmittedPaths,
      ...includedPaths === undefined ? {} : { includedPaths },
    })
    const mode = policy.resolve({ session: caller.session }).mode
    const record: TeamWorkspaceRecord = { ...workspace, maxMode: mode === 'read-only' ? 'read-only' : 'workspace-write' }
    this.restore(childId, record)
    return record
  }

  /**
   * Restore process-local caps from the durable roster before a cold child activation.
   * @param childId - persisted child Session id.
   * @param record - persisted private cwd, baseline, and immutable mode maximum.
   */
  restore(childId: SessionId, record: TeamWorkspaceRecord): void {
    const { policy, tools } = this.requireEnforcement()
    const current = this.caps.get(childId)
    if (current !== undefined) {
      if (current.record.cwd !== record.cwd || current.record.baselineManifestPath !== record.baselineManifestPath
        || current.record.maxMode !== record.maxMode) {
        throw new Error('Team member workspace changed after execution caps were installed')
      }
      return
    }
    const releaseSandbox = policy.capSessionWorkspace(childId, record.cwd, record.maxMode)
    try {
      const releaseTools = tools.capAgentTools(childId, [
        ...this.config.allowedTools,
        ...(this.config.additionalMcpTools ?? []),
      ])
      this.caps.set(childId, { record, release: () => { releaseTools(); releaseSandbox() } })
    } catch (error) {
      releaseSandbox()
      throw error
    }
  }

  /**
   * Check and publish one member's changed regular files to the Lead workspace.
   * @param lead - Team Lead whose cwd was captured at member creation.
   * @param record - durable member workspace record.
   * @param signal - caller cancellation.
   * @param admitPath - current goal's relative-path write admission.
   * @param publication - Exact independently accepted artifact receipts required for publication.
   * @returns applied relative file paths.
   */
  async integrate(lead: Agent, record: TeamWorkspaceRecord, signal: AbortSignal,
    admitPath?: (relativePath: string) => void | Promise<void>, publication?: readonly TeamFileReceipt[]): Promise<WorkspaceIntegration> {
    const sharedPath = lead.session.header.cwd
    if (sharedPath === undefined) throw new Error('Team isolated members require a Lead cwd')
    if (publication === undefined) throw new Error('Team publication requires independently accepted artifact receipts')
    return await integrateMemberWorkspace(sharedPath, record, { ...this.config, coordinationRoot: this.config.coordinationRoot ?? join(this.config.storageRoot, '.coordination'), signal, publication }, admitPath)
  }

  /**
   * Refresh explicit input files in a member workspace.
   * @param lead - Exact owning Lead.
   * @param record - Inactive member's recorded workspace.
   * @param paths - Existing project-relative input files.
   * @param signal - Goal and caller cancellation.
   * @returns refreshed relative paths.
   */
  async refresh(lead: Agent, record: TeamWorkspaceRecord, paths: readonly string[], signal: AbortSignal): Promise<string[]> {
    const cwd = lead.session.header.cwd
    if (cwd === undefined) throw new Error('Team input refresh requires a Lead workspace')
    if (paths.length > this.config.maxFiles) throw new Error('Team input refresh exceeds file limit')
    return refreshMemberInputs(cwd, record, paths, this.config.maxBytes, signal)
  }

  /** Release process-local caps after every member activation has stopped. */
  dispose(): void {
    for (const cap of this.caps.values()) cap.release()
    this.caps.clear()
  }
}
