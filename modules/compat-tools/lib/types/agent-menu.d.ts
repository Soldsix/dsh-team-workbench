/** Exact-Session tool menus layered below the existing inherited execution ceilings. */
import type { SessionId } from '@deepseek-ai/dsh-session';
/** Host-private provider hook; it is not serialized into model requests or Session records. */
export declare const agentMenuHook: unique symbol;
/**
 * Narrow one Session's menu without narrowing its children's independent roles.
 * @param runtime - Compatibility Tools service implementing the host-private hook.
 * @param sessionId - Exact Session receiving this additional restriction.
 * @param names - Allowed tool names; inherited security caps still intersect.
 * @returns disposer that removes only this menu restriction.
 */
export declare function capCurrentAgentToolMenu(runtime: object, sessionId: SessionId, names: readonly string[]): () => void;
