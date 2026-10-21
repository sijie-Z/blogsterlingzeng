# Live2D 组件来源与许可

本目录包含 Live2D Widget 的构建产物（`autoload.js`、`waifu-tips.js`、`waifu.css`、`chunk/*`），
来自 [stevenjoezhang/live2d-widget](https://github.com/stevenjoezhang/live2d-widget)，
对应 npm `live2d-widgets@1.0.1`。

## 许可

- **Live2D Widget 代码**：GPL-3.0-or-later，完整文本见本目录 [LICENSE](LICENSE)。
- **Live2D Cubism Core**（`live2dcubismcore.min.js`）：Live2D Inc. 专有软件，
  按 Live2D Proprietary Software License 的 Redistributable Code 条款随网站分发，
  版权归 Live2D Inc.，不属于 GPL 或本目录模型的 CC 许可范围。
- **DeepSeek 大肥鱼（鲸鱼娘）模型**：CC BY-NC-SA 4.0，
  作者与来源见 [model/ds-whale-girl/LICENSE](model/ds-whale-girl/LICENSE)；
  本站仅作个人非商业展示。

## 本地修改

- `autoload.js`：IIFE + `window.__live2dAutoloaded` 守卫，避免 Swup 换页时重复执行；
  本地化 Cubism Core；资源加版本参数；移除 `switch-model` / `switch-texture` 工具。
- `waifu-tips.js`：动态导入 `chunk/index2.js` 时加版本参数。
- `waifu-tips.json`：移除远程模型回退列表。
- `chunk/index2.js`：暴露 `window.__l2dApp`；空闲帧率限制 30fps；`deltaTime` 上限 50ms。
- `waifu.css`：入场改为 transform/opacity；画布 200px；桌面位置左移 12px。

对应源代码：上游仓库 <https://github.com/stevenjoezhang/live2d-widget>，
本地修改见本仓库提交历史与上述文件。
