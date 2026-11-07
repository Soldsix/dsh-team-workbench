/** The experimental bundle must carry one parseable, explicit Team layer. */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as yaml from 'js-yaml'
import { entryListSchema, applyEntryPatches } from '@deepseek-ai/cordis-plugin-include'

describe('Agent Teams profile bundle', () => {
  it('composes exactly one implementation per replaced service without changing the original settings', () => {
    const root = fileURLToPath(new URL('..', import.meta.url))
    const patches = yaml.load(readFileSync(resolve(root, 'cordis.patch.yml'), 'utf8'), { schema: entryListSchema })
    const original = ['tools', 'sandbox-policy', 'subagent', 'web', 'web-fetch-http'].map(id => ({
      id, name: `@deepseek-ai/dsh-${id}`, config: { fixture: id },
    }))
    const warnings: string[] = []
    const result = applyEntryPatches(original, patches, message => { warnings.push(message) })
    expect(warnings).toEqual([])
    expect(result.slice(0, 5).every(row => row.disabled === true)).toBe(true)
    expect(original.every(row => !('disabled' in row))).toBe(true)
    expect(result.slice(0, 5).map(row => row.config)).toEqual(original.map(row => row.config))
    expect(result.filter(row => row.id?.startsWith('workbench-'))).toHaveLength(5)
  })
  it('declares a public parseable layer with Team-owned controls', () => {
    const root = fileURLToPath(new URL('..', import.meta.url))
    const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
      private?: boolean
      publishConfig?: { access?: string }
      dependencies?: Record<string, string>
      dsh?: { bundle?: { patch?: string } }
    }
    expect(manifest.private).toBeUndefined()
    expect(manifest.publishConfig?.access).toBe('public')
    expect(manifest.dsh?.bundle?.patch).toBe('./cordis.patch.yml')
    expect(manifest.dependencies).toMatchObject({
      '@dsh-workbench/team-runtime': 'file:modules/runtime',
      '@dsh-workbench/team-ui': 'file:modules/ui',
      '@dsh-workbench/team-tools': 'file:modules/tools',
    })

    const parsed = yaml.load(
      readFileSync(resolve(root, manifest.dsh!.bundle!.patch!), 'utf8'),
      { schema: entryListSchema },
    )
    expect(Array.isArray(parsed)).toBe(true)
    const patches = parsed as {
      id?: string
      disabled?: boolean
      config?: Record<string, unknown>
      insert?: { id?: string; name?: string; config?: Record<string, unknown> }[]
    }[]
    const replacements = patches.filter(patch => patch.id !== undefined)
    expect(replacements.map(patch => patch.id)).toEqual(['tools', 'sandbox-policy', 'subagent', 'web', 'web-fetch-http'])
    expect(replacements.every(patch => patch.config === undefined && patch.disabled === true)).toBe(true)
    const inserted = patches.flatMap(patch => patch.insert ?? [])
    expect(inserted.slice(0, 5).map(entry => [entry.id, entry.name])).toEqual([
      ['workbench-tools', '@dsh-workbench/compat-tools'],
      ['workbench-sandbox-policy', '@dsh-workbench/compat-policy'],
      ['workbench-subagent', '@dsh-workbench/compat-subagent'],
      ['workbench-web', '@dsh-workbench/compat-web'],
      ['workbench-web-fetch-http', '@dsh-workbench/compat-fetch'],
    ])
    expect(inserted.find(entry => entry.id === 'team-workbench-skills')).toMatchObject({
      name: '@dsh-workbench/team',
    })
    expect(inserted.find(entry => entry.id === 'agent-team')).toMatchObject({
      name: '@dsh-workbench/team-runtime',
      config: {
        maxMembers: 256, maxResidentMembers: 64, maxConcurrentRequestsPerTeam: 32,
        finalDelivery: 'publish-and-notify',
        providerConcurrency: [], modelConcurrency: [], maxDepth: 2, enabledPresets: ['*'], requireConfirmedGoal: true,
        requireExecutionScope: true, requireTaskPlans: true, requireTaskResults: true, deduplicateTaskInputs: true,
        workspaceIsolation: { maxFiles: 100000, maxBytes: 2147483648, readOnlySharedDirectories: ['node_modules', '.venv'] },
      },
    })
    expect(inserted.find(entry => entry.id === 'agent-team')?.config?.workspaceIsolation)
      .toMatchObject({ allowedTools: expect.arrayContaining(['team_task_reconcile']) })
    expect(inserted.find(entry => entry.id === 'tool-agent-team')).toMatchObject({
      name: '@dsh-workbench/team-tools',
      config: { freshProvider: 'spawn', forkProvider: 'fork' },
    })
    expect(inserted.find(entry => entry.id === 'team-experts')).toMatchObject({
      name: '@dsh-workbench/team-runtime/experts',
    })
    expect(inserted.find(entry => entry.id === 'ui-agent-team')).toMatchObject({
      name: '@dsh-workbench/team-ui',
    })
  })
})
