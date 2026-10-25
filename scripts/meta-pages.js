/**
 * Page meta — 归档年/月页与首页分页的标题和描述。
 *
 * 主题让这些页面继承站点级 title/description，分页页和年/月归档
 * 因此出现大量重复标题。这里在构建期补成各自唯一的标题与描述。
 */

'use strict';

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function replaceTag(str, pattern, html) {
  return str.replace(pattern, () => html);
}

hexo.extend.filter.register('after_render:html', function (str, locals) {
  const page = locals && locals.page;
  if (!str || !page) return str;

  const siteTitle = hexo.config.title || 'Sterling Zeng';

  if (page.year || page.month) {
    const label = page.month
      ? `归档：${page.year} 年 ${page.month} 月`
      : `归档：${page.year} 年`;
    const posts = hexo.locals.get('posts').toArray()
      .filter(post => post.published !== false && !post.draft)
      .filter(post => post.date.year() === page.year)
      .filter(post => !page.month || post.date.month() + 1 === page.month);
    const description = `${label}，共 ${posts.length} 篇文章。`;
    str = replaceTag(str, /<meta name="description" content="[^"]*">/,
      `<meta name="description" content="${esc(description)}">`);
    str = replaceTag(str, /<meta property="og:description" content="[^"]*">/,
      `<meta property="og:description" content="${esc(description)}">`);
    str = replaceTag(str, /<meta name="twitter:description" content="[^"]*">/,
      `<meta name="twitter:description" content="${esc(description)}">`);
    str = replaceTag(str, /<meta property="og:title" content="[^"]*">/,
      `<meta property="og:title" content="${esc(label)}">`);
    str = replaceTag(str, /<meta name="twitter:title" content="[^"]*">/,
      `<meta name="twitter:title" content="${esc(label)}">`);
    return str;
  }

  const pager = String(page.path || '').match(/^\/?page\/(\d+)\//);
  if (pager && Number(pager[1]) > 1) {
    const n = Number(pager[1]);
    const label = `第 ${n} 页`;
    const description = `${siteTitle} ${label}，继续浏览较早的文章。`;
    str = replaceTag(str, /<title>[\s\S]*?<\/title>/, `<title>${esc(label)} | ${esc(siteTitle)}</title>`);
    str = replaceTag(str, /<meta name="description" content="[^"]*">/,
      `<meta name="description" content="${esc(description)}">`);
    str = replaceTag(str, /<meta property="og:description" content="[^"]*">/,
      `<meta property="og:description" content="${esc(description)}">`);
    str = replaceTag(str, /<meta name="twitter:description" content="[^"]*">/,
      `<meta name="twitter:description" content="${esc(description)}">`);
    str = replaceTag(str, /<meta property="og:title" content="[^"]*">/,
      `<meta property="og:title" content="${esc(label)}">`);
    str = replaceTag(str, /<meta name="twitter:title" content="[^"]*">/,
      `<meta name="twitter:title" content="${esc(label)}">`);
  }

  // 分类页和标签页同名时(如“前端开发”),og:title 会完全一样;
  // 加上类型前缀,社交卡片才能区分。
  if (page.category || page.tag) {
    const label = page.category ? `分类：${page.category}` : `标签：${page.tag}`;
    str = replaceTag(str, /<meta property="og:title" content="[^"]*">/,
      `<meta property="og:title" content="${esc(label)}">`);
    str = replaceTag(str, /<meta name="twitter:title" content="[^"]*">/,
      `<meta name="twitter:title" content="${esc(label)}">`);
  }

  return str;
});
