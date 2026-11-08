# Windows 执行参考

## 一份项目工具清单

记录工具名、绝对入口、版本、调用者、工作目录、依赖、输入输出、权限、超时、取消与恢复。命令入口来自 DSH 的运行环境。Python、Node、adb、Frida、浏览器 MCP 等分别验证，不能因为其中一个存在就说整套流程可用。

## 参数与引用

简单文件操作用 read/write/edit/glob/grep。PowerShell 路径带空格和中文时用字面字符串和 LiteralPath；复杂内容保存成 UTF-8 文件。调用外部程序用调用运算符 `&` 和独立参数；不要再经过 cmd /c 拼接。对具体工具先核对参数帮助，特别是 JSON、正则、美元符和引号的解析。

DSH 的 pwsh 接受 command、description 等实际字段；不要把别处工具的 cmd 参数拿来。任务专属脚本放在本成员的允许目录，脚本必须说明副作用并保存回执。短脚本仍有执行权限要求，不能把 shell 改写为 python -c 来规避。

原生程序输出不是一律 UTF-8。核对源程序编码、PowerShell 管道与文件编码后再调整；不能拿乱码重新跑有副作用命令。stdout、stderr、退出码、超时与截断都记录，长日志用引用。

## 故障表

| 现象 | 首先确认 | 恢复 |
|---|---|---|
| 程序找不到 | DSH 环境的入口和版本 | 用已验证绝对路径，不随意改全局 PATH |
| 引号/参数报错 | 当前 shell 与原生 argv | 用小型无副作用参数探针，复杂数据转文件 |
| 权限不足 | 目标范围、宿主沙箱、工具层 | 修正合法目录/工具；真实扩围交用户决定 |
| 退出码非零 | stderr、工作目录、依赖 | 只修复具体条件后重试 |
| 超时后仍运行 | job ID 与进程 | 查询或取消，核查已有影响 |
| 代理/证书错误 | 服务进程的实际环境 | 修正项目环境，不全局关闭验证 |

## 后台生命周期

启动返回可管理 job，查询不再启动进程，取消后核对终止及子进程，重启后先查原记录与状态。可管理的外部服务有自己的启动/停止入口；不要让用户的长期 DSH 服务依赖 Codex 工具会话存活。测试用独立端口与数据目录。

## 版本依据

PowerShell 原生参数传递随版本不同，核对 [Microsoft about_Parsing](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_parsing) 与实际 `$PSVersionTable`。记录 Windows PowerShell 与 PowerShell 7 的差别，不混用测试结论。
