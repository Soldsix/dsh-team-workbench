import { Context } from '@deepseek-ai/cordis'
import Subagents from '@deepseek-ai/dsh-subagent'
import { liveConfig } from '../../../settings/settings/tests/live-config.ts'
import { mountWorkingDirectoryFixture } from '../../../subagent/subagent/tests/working-directory-fixture.ts'

/** Compose current subagent dependencies and Loader-owned volatile defaults. */
export async function mountTeamTestSubagents(ctx: Context) {
  await mountWorkingDirectoryFixture(ctx)
  return (await liveConfig(ctx, Subagents)).fiber
}
