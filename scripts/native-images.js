/**
 * Native image loading — 用浏览器原生 loading="lazy" 代替主题的
 * loading.svg + data-src 方案。
 *
 * 主题的懒加载依赖运行时 JS：无 JS / 爬虫只能看到 loading.svg 占位图。
 * 原生 loading 有宽高约束时不会产生 CLS，也不需要额外脚本。
 */

'use strict';

hexo.extend.filter.register('after_render:html', function (str) {
  if (!str || !str.includes('<img')) return str;
  return str.replace(/<img\b([^>]*)>/g, (match, attrs) => {
    let out = attrs;
    if (!/\bloading\s*=/.test(out)) out += ' loading="lazy"';
    if (!/\bdecoding\s*=/.test(out)) out += ' decoding="async"';
    return `<img${out}>`;
  });
});
