# 任务操作与恢复参考

参数以当前工具 schema 与 team_help 的 action 查询为准。下面是关系与字段含义，不是可以直接套用的真实任务 ID。

## 操作表

| 操作 | 要携带的资料 | 成功后核对 |
|---|---|---|
| plan | 最新 revision；完整输入/环境版本与验收；必要时新 input_key | 目标、计划版本与依赖 |
| configure_dispatch | 仅就绪前任务；auto_assign 或 required_skill | 匹配的长期成员及自动派工设置 |
| configure_review | reviewer 的准确成员名 | 执行者与复核人不同 |
| claim | 就绪任务与调用者身份 | execution_id 与唯一执行者 |
| resume | 原 execution_id | 原 run 接续，没有新 run |
| complete | result、evidence；计划任务的 execution_id；真实 artifact_paths | phase 为 submitted，成果仍待验收 |
| review | execution_id、review_decision、review_summary、review_evidence；通过时逐项 review_checks | 复核身份与对象版本匹配 |
| reconcile | 原 execution_id、side_effects、独立核查摘要与证据 | 哪些外部影响已明确、哪些仍未知 |
| reassign | Lead 决定、owner 或明确取消分配 | 旧影响处理完，再安排下一次执行 |
| release / retire | 原任务、消息、下级与复核职责的交接 | 不把副作用或未验收结果遗失 |

## 正确提交示例

执行者先读 task-1 的最新 revision 与 run。提交的 result 是“完成字段校验和异常路径”，evidence 是测试回执、文件摘要与失败条件；artifact_paths 是确实写好的产物。独立复核员读取同一 run 的真实文件，逐项核查“字段必填”“错误可恢复”等验收，再 review。不能仅复制执行者说的“通过”来 accepted。

## 三个常见恢复分支

**版本冲突：** 重读任务，若自己要做的修改已存在则停止；若状态被其他成员改变则重新判断权限和操作。不能把报错中的最新数字机械填进去继续写。

**结果未知：** 超时的 Node 脚本可能仍在后台执行。先查 job、进程、回执和文件，再判断续接或独立 reconcile。外部操作未知时“再跑一次”会重复执行。

**旧目标提交：** 旧 execution 的证据保留，在新的目标版本下列出受影响验收。新任务引用旧成果并只验证差异；不能直接把旧任务 review 为当前目标完成。

## 调度检查

任务有 owner 但 inactive，不等于故障；查看依赖、技能版本、消息、额度与自动派工。先解决阻碍，再唤醒原成员。成员没有任务时不能为了显示运行而造无关工作。军师只读精简审核材料，执行验证交给独立成员；复核等待发生在正式提交后。

## 任务验收清单

任务/目标/输入/环境版本一致；可找到执行者和独立 reviewer；关键成果有审核决定；产物真实且只写允许的范围；旧错误与试过的方法已记录；重复消息没有产生新执行；最终报告区分提交、通过、修订和未完成。
