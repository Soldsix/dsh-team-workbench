/** Atomic admission for Team model requests sharing Team, provider, and model capacity. */
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm';
import type { TeamId, TeamRequestLimits } from './types.ts';
/**
 * Validate one positive safe-integer deployment limit.
 * @param name - configuration field used in failure messages.
 * @param value - supplied or explicitly defaulted limit.
 * @returns the validated limit.
 */
export declare function positiveLimit(name: string, value: number): number;
/**
 * Resolve request limits without changing model context, output, or reasoning settings.
 * @param config - Team deployment request limits.
 * @returns detached limits with defaults and unique route entries.
 */
export declare function resolveRequestLimits(config: TeamRequestLimits): Required<TeamRequestLimits>;
/** Own queued admissions; callers own active streams and release capacity after stream settlement. */
export declare class TeamRequestQueue {
    private readonly limits;
    private readonly cooldown?;
    private readonly pools;
    private readonly cooldowns;
    private readonly accounts;
    private readonly teams;
    private readonly providers;
    private readonly models;
    private readonly waiting;
    private closedReason;
    /**
     * @param limits - validated, fully resolved request limits.
     */
    constructor(limits: Required<TeamRequestLimits>, cooldown?: {
        rateMs: number;
        quotaMs: number;
    } | undefined, pools?: readonly {
        id: string;
        providers: readonly string[];
        maxConcurrentRequests: number;
    }[]);
    /**
     * Reject limits naming unavailable providers once the model registry is resolvable.
     * Model ids are exact routing values, independent of an adapter's advisory catalog.
     * @param available - currently registered provider route names.
     */
    validateProviders(available: readonly string[]): void;
    /**
     * Wait for every applicable quota, then delegate the unchanged stream once.
     * Cancellation while queued never invokes the adapter. Capacity remains owned
     * until the delegated iterator settles, including cancellation and early return.
     * @param teamId - Team whose request consumes capacity.
     * @param options - original immutable model request.
     * @param next - remaining model stream middleware and adapter.
     * @param budget - Confirmed project request limit, additionally bounded by deployment limits.
     * @returns the original stream chunks after admission.
     */
    stream(teamId: TeamId, options: GenerateOptions, next: () => AsyncIterable<StreamChunk>, budget?: number): AsyncIterable<StreamChunk>;
    /**
     * Reject queued and future requests. Active streams retain caller-owned cancellation.
     * @param reason - runtime disposal reason propagated to queued callers.
     */
    close(reason: Error): void;
    /**
     * Hold a provider until its recorded cooldown ends without consuming partial capacity.
     * @param provider - Exact configured provider; no route is substituted.
     * @param until - Absolute cooldown deadline, reconstructed from durable failure and mailbox records.
     */
    pause(provider: string, until: number): void;
    private pauseRoute;
    /** Reserve all applicable counters together; queued requests own no partial quota. */
    private acquire;
    /** Admit the oldest eligible requests while allowing independent routes to progress. */
    private drain;
    /** Detach a queued cancellation before reporting it to the stream's caller. */
    private reject;
    /** Finished Teams do not retain process-local scheduling state. */
    private retireTeam;
}
