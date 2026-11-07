/** Model-visible fields of a complete project plan. */
export const PROJECT_PLAN_PARAMETER = { type: 'object', additionalProperties: false,
    description: '完整方案对象。模型先查 list_team_models，技能先查 team_skill_catalog。成员、任务和依赖对齐；previousTasks 处理当前目标未完成任务，已归档项不必重复，首次传 []。',
    properties: {
        format: { type: 'string', required: true, enum: ['dsh-team-project-plan'] },
        version: { type: 'integer', required: true, enum: [1, 2] },
        automation: { type: 'object', additionalProperties: false, description: 'Required for version 2; omitted on version 1. On-demand provisions only the approved roster within its budget.', properties: {
                provision: { type: 'string', required: true, enum: ['manual', 'on-demand'] }, requirePlanningGate: { type: 'boolean', required: true },
            } },
        members: { type: 'array', required: true, items: { type: 'object', additionalProperties: false, properties: {
                    name: { type: 'string', required: true }, parent: { type: 'string', required: true },
                    function: { type: 'string', required: true, enum: ['planning_adviser', 'quality_adviser', 'domain_adviser', 'group_lead', 'executor', 'verifier'] },
                    modelProvider: { type: 'string', required: true }, model: { type: 'string', required: true }, reasoningEffort: { type: 'string', required: true },
                    responsibility: { type: 'string', required: true }, skills: { type: 'array', required: true, items: { type: 'string' } },
                    persona: { type: 'string', description: 'Version 2: explicit role style for a new member. Existing mode personas remain unchanged.' },
                    instructions: { type: 'string', description: 'Version 2: goal-bound technical instructions, checks, handoff and stop conditions. Shown before approval; loaded for this member only.' },
                } } },
        tasks: { type: 'array', required: true, items: { type: 'object', additionalProperties: false, properties: {
                    id: { type: 'string', required: true, description: '后续 team_task_create 的 input_key 使用此值。' },
                    owner: { type: 'string', required: true }, reviewer: { type: 'string', required: true }, description: { type: 'string', required: true },
                    kind: { type: 'string', required: true, enum: ['plan', 'route', 'execution', 'key_result', 'delivery'],
                        description: '四类关键节点自动要求双军师；日常执行选 execution。完整项目至少有一个 delivery。' },
                    dependencies: { type: 'array', required: true, items: { type: 'string' } }, inputs: { type: 'array', required: true, items: { type: 'string' } },
                    exclusiveResources: { type: 'array', items: { type: 'string' }, description: 'Version 2: exact exclusive browser/device/account keys. Active tasks retain a key through independent acceptance; uncertain operations require reconciliation before release.' },
                    outputs: { type: 'array', required: true, items: { type: 'string' } }, acceptanceCriteria: { type: 'array', required: true, items: { type: 'string' } },
                    critical: { type: 'boolean', required: true, description: '方案、路线、关键成果和最终交付选 true，必须同时有两位军师。' },
                } } },
        resources: { type: 'object', required: true, additionalProperties: false, properties: {
                maxMembers: { type: 'integer', required: true }, maxConcurrentRequests: { type: 'integer', required: true },
            } },
        reviewPolicy: { type: 'string', required: true, enum: ['independent-and-dual-for-critical'] },
        previousTasks: { type: 'array', required: true, items: { type: 'object', additionalProperties: false, properties: {
                    id: { type: 'string', required: true }, action: { type: 'string', required: true, enum: ['retain_history', 'replan'] }, reason: { type: 'string', required: true },
                } } }, recovery: { type: 'string', required: true },
    },
};
