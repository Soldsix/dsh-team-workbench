# 联网研究参考

仅在具体问题需要时读取；本参考不修改项目目标、授权或工具配置。

## 服务诊断表

| 现象 | 先核查 | 可执行下一步 | 不能据此得出的结论 |
|---|---|---|---|
| 当前请求没有 web_search | 当前模式工具、隔离 allowlist、插件注册 | 检查 team_help network 和部署工具清单 | 模型本身不支持搜索 |
| 无 web_search_tool_result | 辅助搜索 endpoint、原生工具能力、实际请求 | 查看 web_status；由部署修正连接；使用已配置备选 | 搜索零结果或用户无授权 |
| WEB_PROVIDER_CREDENTIAL_MISSING | 搜索服务的独立凭据引用 | 由宿主配置安全注入；先完成离线工作 | 聊天密钥必然适用于搜索 |
| HTTP 429 / WEB_SEARCH_RATE_LIMITED | 本地失败状态、账户额度 | 冷却后单次核查，其他独立路线继续 | 应同时创建更多成员重试同一请求 |
| WEB_SEARCH_COOLDOWN | 原失败码与 retryAt | 等程序/下一任务事件；用已批准备选 | 当前任务必须重开 Session |
| WEB_REDIRECT_BLOCKED | 完整目标 URL、目标 origin | 范围内直接读取准确 URL；范围外先说明缺口 | 可以默认跟随任意域名 |
| ENOTFOUND / EAI_AGAIN / TLS 码 | DNS、代理、证书、目标实际可达性 | 修复具体环境或更换已确认来源 | 修改人设会让网络成功 |
| WEB_ORIGIN_RESTRICTION / Team scope 拒绝 | 确认的执行资源 | 在已有范围内选择可用工具；需要扩围才提问 | 全量业务目标等于宿主无限权限 |

本地 available 是注册与配置检查。一个真实查询才证明该连接这次成功，但也不能保证后续额度与网络。搜索强制原生工具仍可能被第三方网关忽略，必须保留可识别的失败而非编造结果。

## 问题与来源包

每份研究包包含：问题 ID、目标版本、检索词、日期、来源 URL、作者/维护组织、发布日期、版本/commit、关键事实、适用条件、反例、实验状态和引用的产物。网页保存位置只写授权目录；个人数据与密钥脱敏。

技术判断优先查官方文档与源码。论坛帖子标为线索：区分原作者研究、二手转载、广告与过期版本。找到源码后先核对实际 commit 和依赖；文章说“支持”不代表当前本机环境可调用。冲突资料列差异和环境，不以多数转载取代原始证据。

## 并行与成本

先共享已知 URL 和结论。资料、源码、复现、独立反证可并行，查询主题和输出各不相同。任务结束保留失败查询、来源不可达与版本不适用的原因。最终答案只引用能直接支撑结论的来源；不能从片段推导完整协议已经实现。

## 参考入口

辅助搜索协议以 [DeepSeek Anthropic API](https://api-docs.deepseek.com/guides/anthropic_api/) 和 [Anthropic Web search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool) 的实际版本为准。协议和模型 ID 会变化，项目开始时记录核查日期。官方语义与第三方网关实测分开写。
