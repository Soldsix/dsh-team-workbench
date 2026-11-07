# 贡献与开发

参与讨论与贡献需遵守[社区参与规范](docs/community.md)。问题报告使用合成任务和脱敏诊断；安全问题按[安全说明](SECURITY.md)处理。

开发依赖固定在 package-lock.json。使用 Node `^22.19 || >=24`，执行 `npm ci`。另行准备已构建的 DSH `0.2.1-rc.2` 检出，将 `DSH_DEV_HOST` 指向它；开发 fixture 只通过链接或副本读取该检出，不在其中安装或修改。

依次执行 `node scripts/setup-dev.mjs`、`node scripts/typecheck.mjs --emit`、`npm run build`、`npm run check:published-types`、`npm test`、`npm run test:ui`、`npm run test:compat`、`npm run check`。再执行 `npm run pack` 生成 bundle。普通用户只需要发行包，不需要上述源码工具链。

构建读取 setup-dev 准备的 source fixture，固定打包工作目录与浏览器模块的符号链接路径，避免外部 DSH 检出位置进入生成注释。更换 DSH_DEV_HOST 时使用新的开发目录，不复用指向另一个宿主的 fixture。发布归档必须与所附测试证据对应；修改运行代码、默认技能或包配置后，旧证据不能继续批准新包。

发布类型检查使用独立 Host／Client 消费者，解析已构建声明而非插件源码，并验证翻译函数与会话标识没有退化为 any；去掉本地扩展的反向用例必须失败。它使用固定宿主的声明环境，跳过宿主声明内部检查，不代表任意原生 UI 包组合都能通过裸 NodeNext 检查。空的 type import 会被声明输出移除，需保留依赖扩展时使用空的 type export。

真实宿主验收使用 `python scripts/host-smoke.py --cli <官方DSH的lib/bin.js> --archive <构建后的tgz> --run <新的临时目录> --workers 8`。Python 依赖见 requirements-qa.txt；没有 Chrome 的环境可安装 Playwright Chromium。所有端口由系统分配，模型由本地脚本模拟，不使用真实账户或人设。

修改调度、持久字段或工具，覆盖有效路径、拒绝路径、取消、重启和重复投递。修改 UI 时检查真实安装后的界面、深浅主题、键盘和窄屏，不以静态原型替代。输出到 private-qa 的原始日志、登录 URL 和配置不得提交。

发布前运行清单检查，确认锁定版本、许可证、源码与部署包哈希、内部模块及必要类型输出。不要在缺少真实验证的情况下扩大宿主兼容范围。PR 附上实际执行命令与限制，不将未运行的 CI 记为通过。

生成文件、内容固定的技能及两处会保留原换行的构建输入使用精确字节检出，避免 Git 换行转换改变发布摘要。官方 AdsPower 资料保留上游空白；空白检查例外只覆盖该目录的行尾空格和两份生成声明的末尾空行，普通源码仍接受完整检查。
