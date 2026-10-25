/**
 * Asset version — 给主题入口 main.js 加版本查询串。
 *
 * 主题脚本没有内容哈希,Cloudflare 默认缓存 4 小时;不让入口带上
 * 新版本号,浏览器会继续用旧的 main.js 和旧模块,滚动补丁要等缓存
 * 过期才生效。main.js 内部的 navbarShrink/utils 导入由 theme-patch
 * 一并加查询串。
 */

'use strict';

const THEME_JS_VERSION = '20261026a';

hexo.extend.filter.register('after_render:html', function (str) {
  if (!str || !str.includes('/js/build/main.js')) return str;
  return str.replace(
    /(<script\b[^>]*\bsrc="\/js\/build\/main\.js)(")/g,
    `$1?v=${THEME_JS_VERSION}$2`
  );
});
