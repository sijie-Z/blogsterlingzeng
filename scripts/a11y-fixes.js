/**
 * Accessibility fixes — 构建期补全静态 HTML 的无障碍属性。
 *
 * 1. 主题的头像/社交图标等装饰图片没有 alt,读屏会念出完整 URL。
 * 2. 外链 target="_blank" 缺少 rel=noopener noreferrer。
 * 3. 搜索输入框只有 placeholder,没有 aria-label。
 */

'use strict';

hexo.extend.filter.register('after_render:html', function (str) {
  if (!str) return str;

  if (str.includes('<img')) {
    str = str.replace(/<img\b([^>]*?)(\/?)>/g, (match, attrs, slash) => {
      if (/\balt=/.test(attrs)) return match;
      return `<img${attrs} alt=""${slash ? ' /' : ''}>`;
    });
  }

  // 首页卡片里缩略图和标题指向同一篇文章,读屏/键盘会遇到两个同名入口。
  // 缩略图只是视觉预览,移出 Tab 顺序和无障碍树,保留标题链接。
  str = str.replace(
    /(<div class="home-article-thumbnail[^"]*">\s*<a\b)([^>]*?)(>)/g,
    (match, start, attrs, close) => {
      if (/\baria-hidden\s*=/.test(attrs)) return match;
      return `${start}${attrs} tabindex="-1" aria-hidden="true"${close}`;
    }
  );

  // “阅读全文”与上方标题指向同一 URL,是第三份重复入口。
  // 保留鼠标点击,但从 Tab 顺序和无障碍树移除。
  if (str.includes('home-article-list')) {
    str = str.replace(
      /<a\b([^>]*)>(\s*阅读全文[\s\S]*?)<\/a>/g,
      (match, attrs, body) => {
        if (/\baria-hidden\s*=/.test(attrs)) return match;
        return `<a${attrs} tabindex="-1" aria-hidden="true">${body}</a>`;
      }
    );
  }

  // 新窗口打开的外部链接统一补 rel,避免 opener 泄漏
  str = str.replace(/<a\b([^>]*)>/g, (match, attrs) => {
    if (!/\btarget\s*=\s*["']_blank["']/.test(attrs)) return match;
    if (!/\brel\s*=/.test(attrs)) return `<a${attrs} rel="noopener noreferrer">`;
    return match.replace(/\brel\s*=\s*["']([^"']*)["']/, (m, value) => {
      const tokens = new Set(String(value).split(/\s+/).filter(Boolean));
      tokens.add('noopener');
      tokens.add('noreferrer');
      return `rel="${[...tokens].join(' ')}"`;
    });
  });

  // 主题搜索框只有 placeholder;静态 HTML 也要有可访问名称
  str = str.replace(/<input\b([^>]*)>/g, (match, attrs) => {
    if (!/\btype\s*=\s*["']search["']/.test(attrs)) return match;
    if (/\baria-label\s*=/.test(attrs)) return match;
    return `<input${attrs} aria-label="站内搜索">`;
  });

  // 主题的 Lv3 对访客没有含义,统一换成真实身份信息。
  str = str.replace(
    /(<(?:span|div) class="(?:author-label|label)[^"]*"[^>]*>)\s*Lv3\s*(<\/(?:span|div)>)/g,
    '$1GIS · 大四$2'
  );

  return str;
});
