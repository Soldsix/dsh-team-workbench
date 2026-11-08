/** Required arguments and authority for each task update action; state must still be read before mutation. */
export const TASK_ACTION_GUIDES = {
    plan: { required: ['input_version', 'environment_version', 'acceptance_criteria'], note: '队长或原规划人：先处理当前执行；有 input_key 的计划改动用新任务和新 key。input_paths 只列已存在的输入。' },
    configure_dispatch: { required: [], note: '队长：至少提供 auto_assign 或 required_skill，仅用于 pending 任务；先核对目标与技能版本。' },
    configure_review: { required: ['reviewer'], note: '队长：指定不同于执行者的成员；保留现有 execution_id 与提交证据。' },
    claim: { required: [], note: '调用者领取自己执行的就绪任务；不要传 owner。' },
    resume: { required: ['execution_id'], note: '原执行者续接现有 running 执行；先独立核对不明确的外部副作用，不创建新 run。' },
    review: { required: ['execution_id', 'review_decision', 'review_summary', 'review_evidence'], note: '指定的独立复核人：review_evidence 是非空字符串数组。accepted 还须逐项提供 review_checks，并先核对旧工具影响；未验证项可直接 rejected，不授权重跑。不能把 evidence 当作 review_evidence。' },
    reconcile: { required: ['execution_id', 'side_effects', 'review_summary', 'review_evidence'], note: '不同成员核对旧执行的实际影响；side_effects 为 none 或 known。优先用 team_task_reconcile。' },
    release: { required: [], note: '原执行者或队长释放任务；旧副作用记录仍需独立核对。' },
    edit: { required: [], note: '原执行者或队长：至少提供 subject、description、write_scopes 中一项；验收与输入版本改动必须用 plan。' },
    set_dependencies: { required: ['blocked_by'], note: '原执行者或队长设置完整依赖列表；不能让生产任务依赖自己的验收任务。' },
    complete: { required: [], note: '原执行者提交当前执行；有计划的任务必须传 execution_id、result、evidence，artifact_paths 列实际产物。旧无计划任务保留原完成入口。submitted 仅代表提交，不能当作验收通过。' },
    reopen: { required: [], note: '原执行者或队长重新打开 completed 任务；先核对哪些验收受变化影响。' },
    reassign: { required: [], note: '队长用 owner 指定成员；省略 owner 为取消分配。重新分配不能代替旧执行副作用核对。' },
    delete: { required: [], note: '原执行者或队长标记任务 deleted；不删除交付文件或会话历史。' },
};
/**
 * Reject incomplete action arguments before another plan or service check obscures the required next call.
 * @param args - Validated tool JSON carrying one action and optional action fields.
 */
export function assertTaskActionFields(args) {
    const guide = TASK_ACTION_GUIDES[args.action];
    const required = args.action === 'complete' && args.execution_id !== undefined ? ['result', 'evidence'] : guide.required;
    const missing = required.filter(name => args[name] === undefined);
    if (missing.length > 0) {
        throw new Error(`action=${args.action} requires ${missing.join(', ')}. ${guide.note} Read team_help({topic:"tasks",action:"${args.action}"}) for the complete call.`);
    }
}
