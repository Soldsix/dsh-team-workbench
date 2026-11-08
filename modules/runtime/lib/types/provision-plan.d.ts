/** Materialize user-approved version-2 plans without inventing work or changing model routes. */
import type { Agent } from '@deepseek-ai/dsh-agent';
import type SubagentRuntime from '@deepseek-ai/dsh-subagent';
import type { TeamService } from './index.ts';
import type { TeamState } from './projection.ts';
/** Host-owned controls; no model can enlarge these deployment limits. */
export interface ProvisionControls {
    readonly subagents: SubagentRuntime;
    readonly provider: string;
    readonly maxNew: number;
    readonly signal: AbortSignal;
    readonly state: () => TeamState;
}
/** Provision approved members only for independent ready work and materialize their exact plan tasks. */
export declare function provisionPlan(service: TeamService, root: Agent, controls: ProvisionControls): Promise<void>;
