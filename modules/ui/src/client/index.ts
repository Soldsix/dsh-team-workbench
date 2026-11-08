/** Browser entry registering the Agent Teams conversation-header action. */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import teamRemote from '@deepseek-ai/dsh-experimental-agent-team/remote'
import { inject as viewInject, registerAgentTeamUi } from './mount.ts'

/** The optional Team plugin mounts its own Remote contribution. */
export const inject = ['remote']
export type { TeamActionInjected, TeamActionProps } from './TeamAction.tsx'
export type {} from './mount.ts'
export type { TeamKey } from './locales.ts'

/**
 * Mount Team remotes before the native views and release both with this plugin.
 * @param ctx - Client context with the Remote carrier available.
 */
export async function apply(ctx: ClientContext): Promise<void> {
  const unmount = await ctx.remote.$mount(teamRemote)
  ctx.effect(() => unmount, 'client-ui-agent-team: remotes')
  await ctx.plugin({ inject: viewInject, apply: registerAgentTeamUi }).await()
}
