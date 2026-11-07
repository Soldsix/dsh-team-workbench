# 太阳雨中的小渔港：首稿与长期团队多轮对照

这两个目录均是可独立运行的静态 Three.js 场景，不需要模型账号。`oneshot` 保留 32 位作者未接受外部渲染反馈时的首份组件提交；`multiround` 是同一 37 人团队经过五轮后的成果。首稿并不表示每人只请求一次 API，公共骨架和分工由 QA 驱动提供；QA 另修复了重建场景时主光基准累积的问题。完整说明见仓库的 `docs/harbor-case-study.md`。

## 直接预览

从本目录执行 `python -m http.server 8123 --bind 127.0.0.1`，在浏览器打开 `http://127.0.0.1:8123/multiround/dist/` 或 `http://127.0.0.1:8123/oneshot/dist/`。页面没有应用 UI，使用拖拽和滚轮观察。端口被占用时更换一个本地端口。

## 修改与构建

进入所选 app 目录，执行 `npm ci` 和 `npm run build`。依赖版本由 package-lock.json 固定。`src/components` 中每个编号文件对应一个独立组件；公共 helper 与主场景在同级 src 中。不要在首稿目录覆盖修改后继续使用旧校验清单，复制为新版本再开发。

## 核对

`first-component-sha256.json` 与 `final-component-sha256.json` 分别列出 32 份组件摘要，`verification.json` 是不含私密会话的测试摘要。根目录的 `scripts/scene-smoke.py`、`scripts/scene-detail.py` 与 `scripts/scene-motion.py` 可在本地重新运行；不同设备的帧时和抗锯齿结果可能不同。宏观截图不能替代对全部微小物件与动画极值的检查，剩余限制在案例说明中保留。
