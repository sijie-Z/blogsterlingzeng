/**
 * Responsive Images — 给首页横幅补充 960w / 1280w WebP 变体。
 *
 * 横幅是首页 LCP 元素，原图 1920px、最大 273KB；手机 390px 宽
 * （DPR 3 也只有 1170px）加载 960/1280 变体即可，省 40%-50% 字节。
 * 变体由 scripts 外的 Chrome 画布预生成并随仓库提交；这里只加
 * srcset/sizes，运行时零成本。
 */

'use strict';

const fs = require('fs');
const path = require('path');

const IMG_DIR = path.join(__dirname, '..', 'source', 'images');
const VARIANTS = new Set(fs.existsSync(IMG_DIR) ? fs.readdirSync(IMG_DIR) : []);
const IMG_RE = /<img\b([^>]*?)\bsrc="(\/images\/(banner-[a-z]+)\.webp)"([^>]*?)>/g;

function hasVariant(name, width) {
  return VARIANTS.has(`${name}-${width}.webp`);
}

hexo.extend.filter.register('after_render:html', function (str) {
  if (!str || !str.includes('/images/banner-')) return str;

  return str.replace(IMG_RE, (match, before, src, name, after) => {
    if (/\bsrcset=/.test(before + after)) return match;
    if (!hasVariant(name, 960) || !hasVariant(name, 1280)) return match;
    const srcset = [
      `/images/${name}-960.webp 960w`,
      `/images/${name}-1280.webp 1280w`,
      `${src} 1920w`,
    ].join(', ');
    return `<img${before} src="${src}" srcset="${srcset}" sizes="100vw"${after}>`;
  });
});
