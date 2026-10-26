/**
 * Public contact — 联系地址是站长主动公开的联系方式,不需要边缘混淆。
 * Cloudflare 会尊重 body 内的 email_off 标记,避免把可见地址改写成占位文本,
 * 也避免 SPA 换页后还要依赖只执行一次的 email-decode.min.js。
 */

'use strict';

hexo.extend.filter.register('after_render:html', function (str) {
  if (!str || str.includes('<!--email_off-->') || !/<body\b/i.test(str)) return str;
  return str
    .replace(/<body\b[^>]*>/i, tag => tag + '\n<!--email_off-->')
    .replace(/<\/body>/i, '<!--/email_off-->\n</body>');
});
