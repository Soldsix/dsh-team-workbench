# 单 HTML 成品

`harbor-oneshot.html` 是首次提交的场景；`harbor-multiround.html` 是五轮优化后的场景。完整保存对应 HTML 后在支持 WebGL 的浏览器直接打开，无需构建、Python 或本地服务器。

Three.js、脚本、样式、贴图生成和模型均在同一 HTML 内。已通过 Chrome 断网文件直开和 `sandbox="allow-scripts"` iframe 检查，32 个组件、动画、旋转、缩放与窗口调整正常，未发出外部资源请求。

保留源码与详情见[完整案例](../../../docs/harbor-case-study.md)。首稿是第一次提交的对照样本，其中滑道后来曾被退回修改；不代表全部初稿已通过最终验收。
