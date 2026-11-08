/** Shared model schemas for versioned task plans and reviewed executions. */
import type { TeamTaskPlanInput } from 'dsh-team-workbench/runtime';
/** Complete plan fields accepted together when creating or revising a task. */
export declare const TASK_PLAN_PARAMETERS: {
    readonly input_version: {
        readonly type: "string";
        readonly description: "Version or content digest of the task inputs; declare changes explicitly.";
    };
    readonly environment_version: {
        readonly type: "string";
        readonly description: "Version of the relevant tools, devices, and runtime conditions.";
    };
    readonly acceptance_criteria: {
        readonly type: "array";
        readonly items: {
            readonly type: "string";
        };
        readonly description: "Concrete checks an independent reviewer must perform.";
    };
    readonly adviser_gate: {
        readonly type: "string";
        readonly enum: readonly ["dual"];
        readonly description: "For a key result only: require separate planning and quality adviser approvals before independent acceptance.";
    };
    readonly input_paths: {
        readonly type: "array";
        readonly items: {
            readonly type: "string";
        };
        readonly description: "Concrete workspace-relative input files to inspect and hash when recording the plan.";
    };
};
/** Structured execution details returned by task tools. */
export declare const TASK_WORK_VALUE_SCHEMA: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly properties: {
        readonly plan: {
            readonly type: "object";
            readonly required: true;
            readonly additionalProperties: false;
            readonly properties: {
                readonly revision: {
                    readonly type: "integer";
                    readonly required: true;
                };
                readonly plannerId: {
                    readonly type: "string";
                    readonly required: true;
                };
                readonly goalRevision: {
                    readonly type: "integer";
                    readonly required: true;
                };
                readonly inputVersion: {
                    readonly type: "string";
                    readonly required: true;
                };
                readonly environmentVersion: {
                    readonly type: "string";
                    readonly required: true;
                };
                readonly acceptanceCriteria: {
                    readonly type: "array";
                    readonly required: true;
                    readonly items: {
                        readonly type: "string";
                    };
                };
                readonly adviserGate: {
                    readonly type: "string";
                    readonly enum: readonly ["dual"];
                };
                readonly inputPaths: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                    };
                };
                readonly inputs: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly path: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly bytes: {
                                readonly type: "integer";
                                readonly required: true;
                            };
                            readonly sha256: {
                                readonly type: "string";
                                readonly required: true;
                            };
                        };
                    };
                };
                readonly environment: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly workspaceRoot: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly platform: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly arch: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly nodeVersion: {
                            readonly type: "string";
                            readonly required: true;
                        };
                    };
                };
            };
        };
        readonly attempts: {
            readonly type: "integer";
            readonly required: true;
        };
        readonly execution: {
            readonly type: "object";
            readonly additionalProperties: false;
            readonly properties: {
                readonly id: {
                    readonly type: "string";
                    readonly required: true;
                };
                readonly ownerId: {
                    readonly type: "string";
                    readonly required: true;
                };
                readonly planRevision: {
                    readonly type: "integer";
                    readonly required: true;
                };
                readonly phase: {
                    readonly type: "string";
                    readonly required: true;
                    readonly enum: readonly ["running", "submitted", "accepted", "rejected", "cancelled"];
                };
                readonly effectTracking: {
                    readonly type: "string";
                    readonly enum: readonly ["observed"];
                };
                readonly effectReview: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly reviewerId: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly resolution: {
                            readonly type: "string";
                            readonly required: true;
                            readonly enum: readonly ["none", "known"];
                        };
                        readonly observedCalls: {
                            readonly type: "integer";
                            readonly required: true;
                        };
                        readonly summary: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly evidence: {
                            readonly type: "array";
                            readonly required: true;
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                };
                readonly dependencies: {
                    readonly type: "array";
                    readonly required: true;
                    readonly items: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly taskId: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly revision: {
                                readonly type: "integer";
                                readonly required: true;
                            };
                        };
                    };
                };
                readonly submission: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly result: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly evidence: {
                            readonly type: "array";
                            readonly required: true;
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                        readonly artifacts: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly path: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly bytes: {
                                        readonly type: "integer";
                                        readonly required: true;
                                    };
                                    readonly sha256: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                };
                            };
                        };
                        readonly environment: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly workspaceRoot: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly platform: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly arch: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly nodeVersion: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                            };
                        };
                        readonly sideEffects: {
                            readonly type: "string";
                            readonly enum: readonly ["none", "known", "unknown"];
                        };
                        readonly sideEffectEvidence: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                };
                readonly review: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly reviewerId: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly decision: {
                            readonly type: "string";
                            readonly required: true;
                            readonly enum: readonly ["accepted", "rejected"];
                        };
                        readonly summary: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly evidence: {
                            readonly type: "array";
                            readonly required: true;
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                };
            };
        };
    };
};
/**
 * Resolve complete model plan fields without silently ignoring a partial version update.
 * @param args - Optional model-facing plan fields.
 * @returns the complete declared plan, or undefined when all three fields are omitted.
 */
export declare function modelTaskPlan(args: {
    input_version?: string;
    environment_version?: string;
    acceptance_criteria?: string[];
    input_paths?: string[];
    adviser_gate?: 'dual';
}): TeamTaskPlanInput | undefined;
