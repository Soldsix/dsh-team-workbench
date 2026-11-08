/** Exact native-tool classifications shared by resource admission and recovery. */
/** Team operations whose own service enforces membership, goal, and object-level permissions. */
export declare const teamCoordinationTools: ReadonlySet<string>;
/** Collaboration and observation tools available to decision-only advisers. */
export declare const adviserTools: ReadonlySet<string>;
/**
 * Identify calls whose effects are confined to durable coordination records or read-only observations.
 * @param name - Exact registered tool name; unknown names remain opaque.
 * @param args - Logged tool JSON; only recognized read-only workspace actions omit effect tracking.
 * @returns whether task recovery may omit an external-effect observation.
 */
export declare function hasNoExternalTaskEffect(name: string, args?: unknown): boolean;
/** Native tools with reviewed workspace isolation support; deployment still selects the actual allowlist. */
export declare const teamAuditedTools: ReadonlySet<string>;
