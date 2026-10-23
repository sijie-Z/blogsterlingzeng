/**
 * Font preload — 首屏标题/正文字体提前下载。
 *
 * 字体 swap 会触发整页排队重算;本地 woff2 只有 50KB 左右,
 * 提前 preload 可以让首次布局直接用正确度量。
 * 等宽字体只用于代码块(首屏外),不 preload。
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FONTS = [
  ['/fonts/Chillax/Chillax-Variable.woff2', 'fonts/Chillax/Chillax-Variable.woff2'],
  ['/fonts/Geist/GeistVF.woff2', 'fonts/Geist/GeistVF.woff2'],
];

hexo.extend.filter.register('after_render:html', function (str) {
  if (!str || !str.includes('</head>') || str.includes('data-cj-font-preload')) return str;
  const links = FONTS
    .filter(([, file]) => {
      const themeFile = path.join(hexo.theme_dir || '', 'source', file);
      return fs.existsSync(themeFile) || fs.existsSync(path.join(hexo.source_dir, file));
    })
    .map(([href]) => `<link data-cj-font-preload rel="preload" href="${href}" as="font" type="font/woff2" crossorigin>`)
    .join('\n');
  if (!links) return str;
  return str.replace('</head>', () => links + '\n</head>');
});
