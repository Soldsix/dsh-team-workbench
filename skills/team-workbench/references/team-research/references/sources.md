# 专业资料入口

入口核对日期：2026-09-24。此页帮助定位原始资料，未宣称已经安装或运行下列工具。实际项目按 [研究步骤](../SKILL.md) 核对版本、许可证、系统支持和已知问题，保存直接支持结论的具体页面。

## 设备指纹与浏览器

- [FingerprintJS 上游](https://github.com/fingerprintjs/fingerprintjs)：浏览器属性采集与摘要的开源对照；开源库和商业服务分别评估。
- [Chrome DevTools](https://developer.chrome.com/docs/devtools)：脚本、网络、性能与浏览器运行观测入口。
- [Android 标识符](https://developer.android.com/identity/user-data-ids)：核对标识作用范围、平台限制与适用场景。
- [Apple DeviceCheck](https://developer.apple.com/documentation/devicecheck)：核对 DeviceCheck/App Attest 的客户端与服务端职责。

## 移动端与二进制

- [OWASP MASTG](https://mas.owasp.org/MASTG/)：移动应用测试方法与知识索引，按实际平台选择相关章节。
- [JADX 上游](https://github.com/skylot/jadx)：DEX/Java 反编译与已知限制，反编译结果需指令和运行证据核对。
- [Ghidra 上游](https://github.com/NationalSecurityAgency/ghidra)：二进制分析框架与平台支持。
- [Frida JavaScript API](https://frida.re/docs/javascript-api/)：运行时观测 API；脚本必须匹配实际工具版本与桥接环境。

## 安全、协议与测试

- [OWASP WSTG](https://owasp.org/projects/web-security-testing-guide)：Web 安全测试方法，按目标和当前版本选择。
- [OWASP Amass 上游](https://github.com/owasp-amass/amass)：资产发现候选；发现结果与授权范围分别记录。
- [Wireshark 文档](https://www.wireshark.org/docs/)：协议、过滤、重组和工具版本入口。
- [OSS-Fuzz 文档](https://google.github.io/oss-fuzz/)：构建、持续模糊测试和结果复现方法。

## 采用判断

这些入口不构成默认安装清单。先比较项目现有工具和具体缺口，再核对候选的维护、测试、许可证与迁移成本；只引入能通过本项目验收的部分。没有在线访问时使用本地版本资料并标明核对日期，不能将旧知识称为最新。
