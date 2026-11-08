/** Model-visible fields of a complete project plan. */
export declare const PROJECT_PLAN_PARAMETER: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly description: "完整方案对象。模型先查 list_team_models，技能先查 team_skill_catalog。成员、任务和依赖对齐；previousTasks 处理当前目标未完成任务，已归档项不必重复，首次传 []。";
    readonly properties: {
        readonly format: {
            readonly type: "string";
            readonly required: true;
            readonly enum: readonly ["dsh-team-project-plan"];
        };
        readonly version: {
            readonly type: "integer";
            readonly required: true;
            readonly enum: readonly [1, 2];
        };
        readonly automation: {
            readonly type: "object";
            readonly additionalProperties: false;
            readonly description: "Required for version 2; omitted on version 1. On-demand provisions only the approved roster within its budget.";
            readonly properties: {
                readonly provision: {
                    readonly type: "string";
                    readonly required: true;
                    readonly enum: readonly ["manual", "on-demand"];
                };
                readonly requirePlanningGate: {
                    readonly type: "boolean";
                    readonly required: true;
                };
            };
        };
        readonly members: {
            readonly type: "array";
            readonly required: true;
            readonly items: {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                        readonly required: true;
                    };
                    readonly parent: {
                        readonly type: "string";
                        readonly required: true;
                    };
                    readonly function: {
                        readonly type: "string";
                        readonly required: true;
                        readonly enum: readonly ["planning_adviser", "quality_adviser", "domain_adviser", "group_lead", "executor", "verifier"];
                    };
                    readonly modelProvider: {
                        readonly type: "string";
                        readonly required: true;
                    };
                    readonly model: {
                        readonly type: "string";
                        readonly required: true;
                    };
                    readonly reasoningEffort: {
                        readonly type: "string";
                        readonly required: true;
                    };
                    readonly responsibility: {
                        readonly type: "string";
                        readonly required: true;
                    };
                    readonly skills: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                    readonly persona: {
                        readonly type: "string";
                        readonly description: "Version 2: explicit role style for a new member. Existing mode personas remain unchanged.";
                    };
                    readonly instructions: {
                        readonly type: "string";
                        readonly description: "Version 2: goal-bound technical instructions, checks, handoff and stop conditions. Shown before approval; loaded for this member only.";
                    };
                };
            };
        };
        readonly tasks: {
            readonly type: "array";
            readonly required: true;
            readonly items: {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly required: true;
                        readonly description: "后续 team_task_create 的 input_key 使用此值。";
                    };
                    readonly owner: {
                        readonly type: "string";
                        readonly required: true;
                    };
                    readonly reviewer: {
                        readonly type: "string";
                        readonly required: true;
                    };
                    readonly description: {
                        readonly type: "string";
                        readonly required: true;
                    };
                    readonly kind: {
                        readonly type: "string";
                        readonly required: true;
                        readonly enum: readonly ["plan", "route", "execution", "key_result", "delivery"];
                        readonly description: "四类关键节点自动要求双军师；日常执行选 execution。完整项目至少有一个 delivery。";
                    };
                    readonly dependencies: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                    readonly inputs: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                    readonly exclusiveResources: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                        readonly description: "Version 2: exact exclusive browser/device/account keys. Active tasks retain a key through independent acceptance; uncertain operations require reconciliation before release.";
                    };
                    readonly outputs: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                    readonly acceptanceCriteria: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                    readonly critical: {
                        readonly type: "boolean";
                        readonly required: true;
                        readonly description: "方案、路线、关键成果和最终交付选 true，必须同时有两位军师。";
                    };
                };
            };
        };
        readonly resources: {
            readonly type: "object";
            readonly required: true;
            readonly additionalProperties: false;
            readonly properties: {
                readonly maxMembers: {
                    readonly type: "integer";
                    readonly required: true;
                };
                readonly maxConcurrentRequests: {
                    readonly type: "integer";
                    readonly required: true;
                };
            };
        };
        readonly reviewPolicy: {
            readonly type: "string";
            readonly required: true;
            readonly enum: readonly ["independent-and-dual-for-critical"];
        };
        readonly previousTasks: {
            readonly type: "array";
            readonly required: true;
            readonly items: {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly required: true;
                    };
                    readonly action: {
                        readonly type: "string";
                        readonly required: true;
                        readonly enum: readonly ["retain_history", "replan"];
                    };
                    readonly reason: {
                        readonly type: "string";
                        readonly required: true;
                    };
                };
            };
        };
        readonly recovery: {
            readonly type: "string";
            readonly required: true;
        };
    };
};
