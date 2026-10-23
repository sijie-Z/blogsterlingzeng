# Third-Party Notices

本仓库根目录的 MIT License 适用于本站自有代码与内容（文章、页面、`custom.css` / `custom.js` 等）。

以下第三方组件按各自许可分发：

## 1. Live2D Widget — GPL-3.0-or-later

- 位置：`source/live2d/`
- 来源：[stevenjoezhang/live2d-widget](https://github.com/stevenjoezhang/live2d-widget)（npm `live2d-widgets@1.0.1`）
- 许可全文：[source/live2d/LICENSE](source/live2d/LICENSE)
- 本地修改说明：[source/live2d/NOTICE.md](source/live2d/NOTICE.md)

## 2. Live2D Cubism Core — Live2D Proprietary Software License (Redistributable Code)

- 位置：`source/live2d/live2dcubismcore.min.js`
- 版权：Live2D Inc.
- 说明：随网站分发，不属于 GPL 或 CC 许可范围。

## 3. DeepSeek 大肥鱼（鲸鱼娘）Live2D 模型 — CC BY-NC-SA 4.0

- 位置：`source/live2d/model/ds-whale-girl/`
- 作者：上善无形 / ZipZipPipe / 氵六青
- 来源：[A8Chann/dsh-pet-live2d](https://github.com/A8Chann/dsh-pet-live2d)（v3.3.3）
- 许可全文：[source/live2d/model/ds-whale-girl/LICENSE](source/live2d/model/ds-whale-girl/LICENSE)
- 本地修改说明：[source/live2d/model/ds-whale-girl/NOTICE.txt](source/live2d/model/ds-whale-girl/NOTICE.txt)
- 本站修改：主纹理由 2048×2048 PNG 重采样为 1024×1024 WebP（1.7MB → 308KB），
  仅改变编码与分辨率，模型几何与贴图内容未改；衍生版本仍按 CC BY-NC-SA 4.0 分发。

## 4. Font Awesome 6.2.1 Pro — Font Awesome Pro License

- 位置：`source/fontawesome/webfonts/*.subset.woff2`（由主题随附字体按实际使用图标裁剪）
- 来源：随 `hexo-theme-redefine` 提供的 Font Awesome 6.2.1 Pro
- 说明：Font Awesome Pro 字体与图标的使用、自托管和再分发需遵循 Font Awesome Pro 许可；
  部署或商用前请确认账号授权覆盖本用法。子集可通过 `npm run build:fonts` 重新生成。
