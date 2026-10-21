/* 构建期为 <img> 补全 width/height 与加载优先级,降低 CLS、避免图片抢首屏带宽 */
'use strict';

const fs = require('fs');
const path = require('path');
const sizeOf = require('image-size');

hexo.extend.filter.register('after_render:html', function (str) {
  if (!str || str.indexOf('<img') === -1) return str;

  return str.replace(/<img\b[^>]*>/gi, tag => {
    const srcMatch = tag.match(/\bsrc="([^"]*)"/i);
    if (!srcMatch) return tag;
    const src = srcMatch[1];
    if (!src || /^(?:[a-z]+:)?\/\//i.test(src) || src.startsWith('data:')) return tag;

    const clean = src.split('?')[0].split('#')[0];
    if (!clean.startsWith('/')) return tag;

    let file;
    try {
      file = path.join(hexo.source_dir, decodeURIComponent(clean.replace(/^\//, '')));
    } catch (e) {
      return tag;
    }
    if (!fs.existsSync(file)) return tag;

    let dims;
    try {
      dims = sizeOf(file);
    } catch (e) {
      return tag;
    }
    if (!dims || !dims.width || !dims.height) return tag;

    const isBanner = /alt="home-banner-background"/i.test(tag);
    const isHero = /sm:rounded-t-large/.test(tag);
    const priority = isBanner || isHero;
    let attrs = '';
    if (!/\bwidth=/i.test(tag)) attrs += ` width="${dims.width}"`;
    if (!/\bheight=/i.test(tag)) attrs += ` height="${dims.height}"`;
    if (!/\bloading=/i.test(tag)) attrs += priority ? ' loading="eager"' : ' loading="lazy"';
    if (!/\bdecoding=/i.test(tag)) attrs += ' decoding="async"';
    if (priority && !/\bfetchpriority=/i.test(tag)) attrs += ' fetchpriority="high"';

    if (!attrs) return tag;
    return tag.replace(/\s*\/?>$/, end => attrs + (end.trim().endsWith('/>') ? ' />' : '>'));
  });
});
