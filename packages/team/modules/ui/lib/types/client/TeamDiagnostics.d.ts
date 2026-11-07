import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { DisplayTeam } from './team-view-data.ts';
import { NS } from './locales.ts';
/**
 * Create a metadata-only diagnostic snapshot suitable for local support review.
 * @param team - Current Team projection.
 * @param now - Export time, kept explicit for deterministic replay.
 * @returns identifiers and workflow counters without goal text, file paths or model credentials.
 */
export declare function diagnosticSnapshot(team: DisplayTeam, now: number): {
    format: string;
    version: number;
    exportedAt: number;
    goal: {
        revision: number;
        status: string;
    };
    members: {
        id: import("@deepseek-ai/dsh-session").SessionId;
        parentId: import("@deepseek-ai/dsh-session").SessionId | undefined;
        role: "lead" | "teammate";
        function: import("@dsh-workbench/team-runtime/client").TeamMemberFunction | undefined;
        phase: import("@dsh-workbench/team-runtime/client").TeamMemberPhase;
        legacy: boolean;
        selectedSkills: number;
    }[];
    tasks: {
        id: import("@dsh-workbench/team-runtime/client").TeamTaskId;
        revision: number;
        status: import("@dsh-workbench/team-runtime/client").TeamTaskStatus;
        executionId: import("@dsh-workbench/team-runtime/client").TeamTaskExecutionId | undefined;
        phase: "accepted" | "rejected" | "cancelled" | "running" | "submitted" | undefined;
        goalRevision: number | undefined;
        dependencies: import("@dsh-workbench/team-runtime/client").TeamTaskId[];
        blocker: import("../../../runtime/src/types.ts").TeamTaskDispatchBlocker | undefined;
        reusable: boolean;
        requiredCriteria: number;
    }[];
    completed: number;
    evidence: {
        adviserDecisions: number;
    };
    limits: {
        externalConfinementVerified: boolean;
        toolHealthVerified: boolean;
        providerCostKnown: boolean;
    };
};
/** Display only observed workflow diagnostics and explicitly identify unverified host resources. */
export declare function TeamDiagnostics({ team, t }: {
    team: DisplayTeam;
} & PropsLocale<typeof NS>): import("react").JSX.Element;
