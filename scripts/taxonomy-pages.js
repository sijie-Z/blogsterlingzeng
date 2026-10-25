/**
 * Taxonomy pages — 标签页与分类页的引导语和排序。
 *
 * 主题把页面正文放在标签云/分类列表之后，读起来像“先看结论再看说明”。
 * 这里把引导语移到标题下方，并按使用次数给标签和分类排序，
 * 全部在构建期完成，运行时不改 DOM。
 */

'use strict';

function countPosts(hexo) {
  return hexo.locals.get('posts').toArray()
    .filter(post => post.published !== false && !post.draft).length;
}

function sortByWeight(body, itemPattern, weightPattern) {
  const items = body.match(itemPattern);
  if (!items || items.length < 2) return null;
  return items
    .map(item => {
      const match = item.match(weightPattern);
      return { item, weight: match ? Number(match[1]) : 0 };
    })
    .sort((a, b) => b.weight - a.weight)
    .map(entry => entry.item)
    .join('');
}

hexo.extend.filter.register('after_render:html', function (str, locals) {
  const page = locals && locals.page;
  if (!str || !page || page.__post) return str;

  const isTags = str.includes('<div class="tagcloud-content">');
  const isCats = str.includes('<div class="category-list-content">');
  if (!isTags && !isCats) return str;
  if (str.includes('taxonomy-intro')) return str;

  // 把正文里的导语从列表下方移到标题下方
  const introRe = /<div class="page-template-content markdown-body">([\s\S]*?)<\/div>\s*<div class="page-template-comments">/;
  const introMatch = str.match(introRe);
  let intro = introMatch ? introMatch[1].trim() : '';
  if (introMatch) str = str.replace(introRe, '<div class="page-template-comments">');

  const posts = countPosts(hexo);
  const stats = isTags
    ? `${posts} 篇文章，${hexo.locals.get('tags').length} 个标签。`
    : `${posts} 篇文章，${hexo.locals.get('categories').length} 个分类。`;

  const introHtml = `<div class="taxonomy-intro">${intro}<p class="taxonomy-stats">${stats}</p></div>`;
  str = str.replace(/(<h1 class="page-title-header">[\s\S]*?<\/h1>)/, `$1${introHtml}`);

  if (isTags) {
    str = str.replace(/(<ul class="tag-list"[^>]*>)([\s\S]*?)(<\/ul>)/, (all, open, body, close) => {
      const sorted = sortByWeight(body, /<li>[\s\S]*?<\/li>/g, /data-weight="(\d+)"/);
      return sorted ? open + sorted + close : all;
    });
  }

  if (isCats) {
    str = str.replace(/(<ul class="all-category-list">)([\s\S]*?)(<\/ul>)/, (all, open, body, close) => {
      const sorted = sortByWeight(
        body,
        /<li class="all-category-list-item">[\s\S]*?<\/li>/g,
        /<span class="all-category-list-count">(\d+)<\/span>/
      );
      return sorted ? open + sorted + close : all;
    });
  }

  return str;
});
