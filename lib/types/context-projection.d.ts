import z from 'zod';
import { SessionSeq } from '@deepseek-ai/dsh-session';
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session';
import { MessageId, ToolCallId } from '@deepseek-ai/dsh-llm';
/** One visible instruction contribution; bodies remain in the authoritative Session log. */
export interface SkillContextEntry {
    readonly seq: SessionSeq;
    readonly digest: string;
    readonly messageId: string;
}
type ToolResultData = Extract<SessionEvent, {
    type: 'tool/result';
}>['data'];
/** Replacement metadata for one direct skill read; content contains only a retirement marker. */
export interface SkillReadEntry {
    readonly seq: SessionSeq;
    readonly digest: string;
    readonly data: ToolResultData;
}
/** Direct skill reads and the latest completed model response, rebuilt from Session events. */
export interface SkillReadState {
    readonly pendingCalls: readonly string[];
    readonly results: readonly SkillReadEntry[];
    readonly lastAssistantSeq: SessionSeq;
}
declare module '@deepseek-ai/dsh-session-projection/types' {
    interface SessionProjectionStateMap {
        teamSkillContext: readonly SkillContextEntry[];
        teamSkillReads: SkillReadState;
    }
}
/**
 * Identify the exact rendered selection, including its revisions and purposes.
 * @param text - Complete saved instruction contribution.
 * @returns SHA-256 identity used by the retained-context projection.
 */
export declare function skillContextDigest(text: string): string;
/** Host-only state of instruction contributions still present after surface replacements. */
export declare const skillContextProjection: {
    key: "teamSkillContext";
    stateVersion: number;
    stateSchema: z.ZodReadonly<z.ZodArray<z.ZodObject<{
        seq: z.ZodPipe<z.ZodNumber, z.ZodTransform<SessionSeq, number>>;
        digest: z.ZodString;
        messageId: z.ZodString;
    }, z.core.$strict>>>;
    init: () => never[];
    apply(state: NoInfer<readonly SkillContextEntry[]>, event: SessionEvent): readonly SkillContextEntry[];
};
/** Direct skill result metadata with no saved body, including after a cold Session resume. */
export declare const skillReadProjection: {
    key: "teamSkillReads";
    stateVersion: number;
    stateSchema: z.ZodPipe<z.ZodObject<{
        pendingCalls: z.ZodReadonly<z.ZodArray<z.ZodString>>;
        results: z.ZodReadonly<z.ZodArray<z.ZodObject<{
            seq: z.ZodPipe<z.ZodNumber, z.ZodTransform<SessionSeq, number>>;
            digest: z.ZodString;
            data: z.ZodPipe<z.ZodObject<{
                turn: z.ZodNumber;
                step: z.ZodNumber;
                message: z.ZodObject<{
                    id: z.ZodPipe<z.ZodString, z.ZodTransform<MessageId, string>>;
                    role: z.ZodLiteral<"tool">;
                    source: z.ZodObject<{
                        kind: z.ZodLiteral<"tool">;
                        callId: z.ZodPipe<z.ZodString, z.ZodTransform<ToolCallId, string>>;
                    }, z.core.$strict>;
                    toolCallId: z.ZodPipe<z.ZodString, z.ZodTransform<ToolCallId, string>>;
                    isError: z.ZodBoolean;
                    content: z.ZodTuple<[z.ZodObject<{
                        type: z.ZodLiteral<"text">;
                        text: z.ZodString;
                    }, z.core.$strict>], null>;
                }, z.core.$strict>;
                meta: z.ZodOptional<z.ZodJSONSchema>;
            }, z.core.$strict>, z.ZodTransform<{
                turn: number;
                step: number;
                message: {
                    id: MessageId;
                    role: "tool";
                    source: {
                        kind: "tool";
                        callId: ToolCallId;
                    };
                    toolCallId: ToolCallId;
                    isError: boolean;
                    content: [{
                        type: "text";
                        text: string;
                    }];
                };
            } | {
                meta: z.core.util.JSONType;
                turn: number;
                step: number;
                message: {
                    id: MessageId;
                    role: "tool";
                    source: {
                        kind: "tool";
                        callId: ToolCallId;
                    };
                    toolCallId: ToolCallId;
                    isError: boolean;
                    content: [{
                        type: "text";
                        text: string;
                    }];
                };
            }, {
                turn: number;
                step: number;
                message: {
                    id: MessageId;
                    role: "tool";
                    source: {
                        kind: "tool";
                        callId: ToolCallId;
                    };
                    toolCallId: ToolCallId;
                    isError: boolean;
                    content: [{
                        type: "text";
                        text: string;
                    }];
                };
                meta?: z.core.util.JSONType | undefined;
            }>>;
        }, z.core.$strict>>>;
        lastAssistantSeq: z.ZodPipe<z.ZodNumber, z.ZodTransform<SessionSeq, number>>;
    }, z.core.$strict>, z.ZodTransform<SkillReadState, {
        pendingCalls: readonly string[];
        results: readonly {
            seq: SessionSeq;
            digest: string;
            data: {
                turn: number;
                step: number;
                message: {
                    id: MessageId;
                    role: "tool";
                    source: {
                        kind: "tool";
                        callId: ToolCallId;
                    };
                    toolCallId: ToolCallId;
                    isError: boolean;
                    content: [{
                        type: "text";
                        text: string;
                    }];
                };
            } | {
                meta: z.core.util.JSONType;
                turn: number;
                step: number;
                message: {
                    id: MessageId;
                    role: "tool";
                    source: {
                        kind: "tool";
                        callId: ToolCallId;
                    };
                    toolCallId: ToolCallId;
                    isError: boolean;
                    content: [{
                        type: "text";
                        text: string;
                    }];
                };
            };
        }[];
        lastAssistantSeq: SessionSeq;
    }>>;
    init: () => {
        pendingCalls: never[];
        results: never[];
        lastAssistantSeq: SessionSeq;
    };
    apply(state: NoInfer<SkillReadState>, event: SessionEvent): SkillReadState;
};
/**
 * Retire Team-owned skill bodies from the current model surface without changing earlier Session events.
 * @param session - Member Session whose current surface receives versioned replacements.
 * @param activeText - Complete instruction contribution for the current selection, or empty when inactive.
 * @param selectedDigests - Digests whose selected bodies already have an instruction contribution.
 * @param contexts - Retained instruction identities from the Session projection.
 * @param reads - Retained direct reader results and latest completed model response.
 */
export declare function retireSkillBodies(session: Session, activeText: string, selectedDigests: ReadonlySet<string>, contexts: readonly SkillContextEntry[], reads: SkillReadState): void;
export {};
