# 数独截图求解器

手机浏览器上传 9×9 数独截图，核对识别结果，再按所选规则求解。支持经典、无马、杀手、对角线、奇偶、连续、不规则宫和窗口规则。图片只在浏览器内处理。

在线地址：https://sudoku-snap-rui-2026.pages.dev/

“技巧教学”页面介绍八类题型的规则与突破口。不规则宫与窗口目前需要手动选择；不规则宫可在“宫”编辑方式中按颜色标记九个宫。

## Cloudflare Pages

连接这个 GitHub 仓库时，设置：

- Framework preset：None
- Build command：留空
- Build output directory：`dist`

`dist/` 已包含 OCR 脚本、WASM 核心和英语数字识别模型，无需访问第三方 CDN。`dist/licenses/` 保留了第三方组件的许可信息。

数独截图识别针对原始游戏截图的绿色 9×9 棋盘与标记样式优化。识别结果和自动判断的题型应在求解前核对。

本地规则与杀手合计数字回归检查：`node --test tests/sudoku.test.mjs`。
