/**
 * Skip Assets — 可选地从构建产物中移除已被替换的源文件。
 *
 * Live2D 纹理已从 1.7MB PNG 换成 308KB WebP（index.json 指向 .webp）。
 * 但浏览器可能仍缓存着旧的 index.json（GitHub Pages 默认 10 分钟），
 * 这段时间里如果 PNG 不存在，模型会缺纹理。因此默认保留 PNG 作为
 * 兼容回退；确认缓存过期后，可在部署环境设置
 * CJ_SKIP_OLD_TEXTURES=1 再构建，省掉这 1.7MB 的部署体积。
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SKIP = process.env.CJ_SKIP_OLD_TEXTURES === '1'
  ? ['live2d/model/ds-whale-girl/textures/texture_00.png']
  : [];

hexo.extend.filter.register('after_generate', function () {
  // 生产部署不需要 source map;主题的 10MB mermaid map 也在其中
  for (const path of hexo.route.list()) {
    if (path.endsWith('.map')) {
      try { hexo.route.remove(path); } catch (e) {}
    }
  }
  const theme = hexo.theme.config || {};
  const plugins = theme.plugins || {};
  const extras = [];
  if (!(plugins.mermaid && plugins.mermaid.enable)) {
    extras.push('js/libs/mermaid.min.js', 'js/build/libs/mermaid.min.js');
  }
  if (!(theme.comment && theme.comment.system === 'waline')) {
    extras.push('js/libs/waline.js', 'js/build/libs/waline.js');
  }
  // essays 页已改用 Intl 格式化日期,不再需要 375KB 的 moment
  extras.push('js/libs/moment-with-locales.min.js', 'js/build/libs/moment-with-locales.min.js');
  // 全量图标 CSS 已由 fontawesome-icons-subset.css 取代
  if (fs.existsSync(path.join(hexo.source_dir, 'css', 'fontawesome-icons-subset.css'))) {
    extras.push(
      'fontawesome/fontawesome.min.css',
      'fontawesome/brands.min.css',
      'fontawesome/solid.min.css',
      'fontawesome/regular.min.css'
    );
    // 主题还会复制 8.4MB 的全量 webfonts 和其余样式表;页面只引用
    // /fontawesome/webfonts/*.subset.woff2,这些都不再需要部署。
    for (const route of hexo.route.list()) {
      if (route.startsWith('webfonts/') || /^fontawesome\/[^/]+\.css$/.test(route)) {
        extras.push(route);
      }
    }
  }
  for (const path of extras) {
    try { if (hexo.route.get(path)) hexo.route.remove(path); } catch (e) {}
  }
  for (const path of SKIP) {
    try {
      if (hexo.route.get(path)) {
        hexo.route.remove(path);
      }
    } catch (e) {
      // route 不存在时忽略
    }
  }
});
