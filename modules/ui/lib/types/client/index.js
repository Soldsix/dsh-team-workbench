/** Browser entry registering the Agent Teams conversation-header action. */
import teamRemote from 'dsh-team-workbench/runtime/remote';
import { inject as viewInject, registerAgentTeamUi } from "./mount.js";
/** The optional Team plugin mounts its own Remote contribution. */
export const inject = ['remote'];
/**
 * Mount Team remotes before the native views and release both with this plugin.
 * @param ctx - Client context with the Remote carrier available.
 */
export async function apply(ctx) {
    const unmount = await ctx.remote.$mount(teamRemote);
    ctx.effect(() => unmount, 'client-ui-agent-team: remotes');
    await ctx.plugin({ inject: viewInject, apply: registerAgentTeamUi }).await();
}
