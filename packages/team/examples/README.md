# 可编辑示例

project-plan-v2.json 是合成项目模板。提交前把 provider、model、reasoningEffort 替换成 list_team_models 的真实结果，准备 fixture.txt，并核对项目范围。占位符不能直接执行。

部署配置以 bundle 的 cordis.patch.yml 为默认值。调整 agent-team 行时复制完整 config，再修改需要的上限；参考 docs/customization.md。不要将示例当作个人密钥或通用全权限配置。

[profile-customization.patch.yml](profile-customization.patch.yml)是完整的可编辑运行配置，演示成员、并发和额外技能目录；应用前按文件注释准备目录。[project-evidence](custom-skills/project-evidence/SKILL.md)是可复制的自定义技能示例，不会自动替换模式原有技能。

[realtime-3d-production](custom-skills/realtime-3d-production/SKILL.md)将空间接口、并行资产、多视角看图、动画与性能复核连成一条流程；这是可选模块，只有明确选择时才读取正文。
