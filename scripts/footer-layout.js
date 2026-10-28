/**
 * Footer layout — 主信息一行,次级入口一行。
 * 在构建期把版权/备案/运行天数与社交链接包进 primary,
 * 将原有 utility nav 留作第二行,避免运行时重排造成 CLS。
 */

'use strict';

hexo.extend.filter.register('after_render:html', function (str) {
  if (!str || str.includes('class="footer-primary"')) return str;
  const social = str.match(/<div class="footer-extra-icons">[\s\S]*?<\/div>/);
  const footerAt = str.indexOf('<footer');
  const copyrightAt = str.indexOf('<div class="text-center">', footerAt);
  if (!social || footerAt < 0 || copyrightAt < 0 || !str.includes('<nav class="footer-utility"')) return str;

  let out = str.slice(0, copyrightAt) + '<div class="footer-primary"><div class="footer-meta">' + str.slice(copyrightAt);
  out = out.replace(social[0], '');
  out = out.replace('<nav class="footer-utility"', '</div>' + social[0] + '</div><nav class="footer-utility"');

  // 统计关闭时主题仍输出一个空占位 div,会在 meta 行里留下多余间距
  const placeholderAt = out.indexOf('class="relative text-center lg:absolute lg:left-[20px]');
  if (placeholderAt >= 0) {
    const open = out.lastIndexOf('<div', placeholderAt);
    const close = out.indexOf('</div>', placeholderAt);
    if (open >= 0 && close > open && !out.slice(out.indexOf('>', placeholderAt) + 1, close).trim()) {
      out = out.slice(0, open) + out.slice(close + 6);
    }
  }
  return out;
});
