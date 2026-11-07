/** Host-private provider hook; it is not serialized into model requests or Session records. */
export const agentMenuHook = Symbol.for('@dsh-workbench/compat-tools/agent-menu');
/**
 * Narrow one Session's menu without narrowing its children's independent roles.
 * @param runtime - Compatibility Tools service implementing the host-private hook.
 * @param sessionId - Exact Session receiving this additional restriction.
 * @param names - Allowed tool names; inherited security caps still intersect.
 * @returns disposer that removes only this menu restriction.
 */
export function capCurrentAgentToolMenu(runtime, sessionId, names) {
    const install = Reflect.get(runtime, agentMenuHook);
    if (typeof install !== 'function')
        throw new Error('Team tool menus require the bundled compatibility Tools provider');
    const release = install.call(runtime, sessionId, names);
    if (typeof release !== 'function')
        throw new Error('Compatibility Tools returned an invalid menu disposer');
    return () => { release(); };
}
