/**
 * Accessibility fixes — 构建期给缺少 alt 的图片补空 alt。
 *
 * 主题的头像/社交图标等装饰性图片没有 alt,读屏会念出完整 URL。
 * 这些图片旁边都有可见文字说明,按装饰性图片处理(alt="")最合适。
 */

'use strict';

hexo.extend.filter.register('after_render:html', function (str) {
  if (!str || !str.includes('<img')) return str;
  return str.replace(/<img\b([^>]*?)(\/?)>/g, (match, attrs, slash) => {
    if (/\balt=/.test(attrs)) return match;
    return `<img${attrs} alt=""${slash ? ' /' : ''}>`;
  });
});
