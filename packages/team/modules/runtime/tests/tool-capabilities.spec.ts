/** Resource permission and recovery classification for coordination-only calls. */
import { scopesOverlap } from '../src/task-view.ts'
import { describe, expect, it } from 'vitest'
import type { ToolExecutionToken } from '@deepseek-ai/dsh-tools'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { executionScopeDenial } from '../src/execution-scope.ts'
import { taskToolNeedsEffectTracking } from '../src/task-effects.ts'

describe('Team coordination tools', () => {
  const scope = { readPaths: ['.'], writePaths: [], webOrigins: [], allowSearch: false, allowUnrestrictedExecution: false }
  it.each(['team_adviser_review', 'get_goal', 'team_skills', 'team_skill_catalog', 'web_status', 'team_mailbox', 'send_message'])(
    'admits %s without fabricating an external effect', async (name) => {
      expect(await executionScopeDenial(scope, {
        name, rootCallId: ToolCallId('coordination'), token: Symbol('coordination') as ToolExecutionToken, callId: ToolCallId('coordination'), arguments: {}, signal: new AbortController().signal,
      }, true, false)).toBeUndefined()
      expect(taskToolNeedsEffectTracking(name)).toBe(false)
    },
  )
  it.each(['pwsh', 'mcp__unknown__execute', 'unregistered_tool'])(
    'keeps %s denied and conservatively tracked', async (name) => {
      expect(await executionScopeDenial(scope, {
        name, rootCallId: ToolCallId('external'), token: Symbol('external') as ToolExecutionToken, callId: ToolCallId('external'), arguments: {}, signal: new AbortController().signal,
      }, true, false)).toContain('permission')
      expect(taskToolNeedsEffectTracking(name)).toBe(true)
    },
  )
  it.each(['team_workspace', 'job_kill', 'write', 'web_fetch'])(
    'retains effect observations for %s', (name) => {
      expect(taskToolNeedsEffectTracking(name)).toBe(true)
    },
  )
  it.each(['get', 'prepare'])('omits effect tracking for workspace %s observations', (action) => {
    expect(taskToolNeedsEffectTracking('team_workspace', { action })).toBe(false)
  })
  it.each([{ action: 'integrate' }, { action: 'unknown' }, {}, null])('tracks unknown or writing workspace calls: %j', args => {
    expect(taskToolNeedsEffectTracking('team_workspace', args)).toBe(true)
  })
})

it('matches Windows task output paths without case-based double ownership', () => {
  expect(scopesOverlap('Report', 'report/final.md')).toBe(process.platform === 'win32')
  expect(scopesOverlap('report', 'reports/final.md')).toBe(false)
  expect(scopesOverlap('report', 'report/final.md')).toBe(true)
})
