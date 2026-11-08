import type { SkillDefinition } from '@deepseek-ai/dsh-skill';
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
/**
 * Resolve the active project before discovering a mode's local skills.
 * @param ctx - Registry owner; directory-free skill catalogs may omit workingDirectory.
 * @param agent - Session requesting the skill.
 * @param signal - Cancellation during directory validation.
 * @returns Scoped lookup using the committed directory, or the initial directory on older hosts.
 */
export declare function resolveSkillLookup(ctx: Context, agent: Agent, signal: AbortSignal): Promise<{
    scope: Agent;
    cwd?: string;
    signal: AbortSignal;
}>;
/**
 * Read one module from this package's fixed skill tree.
 * @param name - Exact team-* catalog name.
 * @param signal - Caller cancellation while reading the file.
 * @param reference - Optional module-local Markdown reference filename.
 * @param maxBytes - Optional caller-configured document byte limit.
 * @returns LF-normalized body and its SHA-256 digest.
 */
export declare function readBundledSkill(name: string, signal: AbortSignal, reference?: string, maxBytes?: number): Promise<{
    name: string;
    digest: string;
    content: string;
}>;
/**
 * Read only the fixed package's skill metadata; professional bodies do not enter the model catalog.
 * @param signal - Cancellation while reading immutable package files.
 * @returns exact names and single-line descriptions, sorted by name.
 */
export declare function listBundledSkills(signal: AbortSignal): Promise<{
    name: string;
    description: string;
}[]>;
/**
 * Resolve a model-invocable mode skill first, then a bundled module with the same exact name.
 * @param ctx - Skill registry owner.
 * @param agent - Caller whose mode determines available skills.
 * @param name - Exact skill name.
 * @param signal - Cancellation for provider reads.
 * @param maxBytes - Optional document byte limit for bundled modules.
 * @returns Saved model-visible content and its digest.
 */
export declare function resolveTeamSkill(ctx: Context, agent: Agent, name: string, signal: AbortSignal, maxBytes?: number): Promise<{
    name: string;
    digest: string;
    content: string;
}>;
/**
 * Pin the model-visible body and resource hint of an existing mode skill.
 * @param skill - Resolved definition from the caller's mode.
 * @param signal - Cancellation while collecting referenced local resources.
 * @param maxBytes - Maximum encoded bytes of the body and resource snapshots.
 * @returns Saved model-visible content and its digest.
 */
export declare function snapshotModeSkill(skill: SkillDefinition, signal?: AbortSignal, maxBytes?: number): Promise<{
    name: string;
    digest: string;
    content: string;
}>;
