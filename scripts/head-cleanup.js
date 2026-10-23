/**
 * Head cleanup — 去掉用不到的外部预连接。
 *
 * 主题默认无条件预连接 Google Fonts,但本站字体全部本地托管;
 * 保留这两个 preconnect 只会多做两次 DNS/TCP 握手(国内网络还常被阻断)。
 */

'use strict';

hexo.extend.filter.register('after_render:html', function (str) {
  if (!str || !str.includes('fonts.googleapis.com')) return str;
  return str
    .replace(/[ \t]*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*\n?/g, '')
    .replace(/[ \t]*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\s*\n?/g, '');
});
