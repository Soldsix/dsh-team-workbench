// @vitest-environment jsdom
/** The review view keeps the complete large roster and its acceptance criteria accessible. */
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { ProjectPlanView } from '../src/client/ProjectPlanView.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)

it('shows all 32 planned members, exact routes, task evidence requirements and resource limits', () => {
  const plan = { format: 'dsh-team-project-plan', version: 1,
    members: Array.from({ length: 32 }, (_, index) => ({ name: `member-${index}`, parent: 'lead',
      function: index === 0 ? 'planning_adviser' : index === 1 ? 'quality_adviser' : index === 3 ? 'verifier' : 'executor',
      modelProvider: 'configured-provider', model: `configured-${index}`, reasoningEffort: 'max',
      responsibility: `职责 ${index}`, skills: ['team-code-development'] })),
    tasks: [{ id: 'delivery', owner: 'member-2', reviewer: 'member-3', description: '完整交付', kind: 'delivery',
      dependencies: [], inputs: [], outputs: ['reports/result.txt'], acceptanceCriteria: ['逐项验证文件内容'], critical: true }],
    resources: { maxMembers: 32, maxConcurrentRequests: 16 }, reviewPolicy: 'independent-and-dual-for-critical',
    previousTasks: [], recovery: '保留原执行，核对回执后续接' }
  render(<ProjectPlanView text={JSON.stringify(plan)} t={makeTranslate(zh)} />)
  expect(screen.getByText('member-31', { exact: true })).toBeDefined()
  expect(screen.getByText('configured-provider / configured-31 / max', { exact: true })).toBeDefined()
  expect(screen.getByText('逐项验证文件内容', { exact: true })).toBeDefined()
  expect(screen.getByText(zh['plan.dual'], { exact: true })).toBeDefined()
  expect(screen.getAllByText('team-code-development', { exact: false })).toHaveLength(32)
  expect(screen.getByText('保留原执行，核对回执后续接', { exact: true })).toBeDefined()
})
