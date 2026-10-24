/**
 * Breadcrumbs — 文章页可见的面包屑，与 JSON-LD 的 BreadcrumbList 对齐。
 *
 * 构建期插入,零运行时;当前页用 aria-current="page",分隔符对读屏隐藏。
 */

'use strict';

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

hexo.extend.filter.register('after_render:html', function (str, locals) {
  const page = locals && locals.page;
  if (!str || !page || !page.__post || !page.title) return str;
  if (str.includes('data-cj-breadcrumbs')) return str;

  const categories = page.categories && page.categories.toArray ? page.categories.toArray() : [];
  const category = categories[0];
  const root = String(hexo.config.root || '/');
  const home = (root.endsWith('/') ? root : root + '/');
  const title = String(page.title);
  const shortTitle = [...title].length > 32 ? [...title].slice(0, 32).join('') + '…' : title;

  const parts = [`<a href="${escapeHtml(home)}">首页</a>`];
  if (category) {
    parts.push(`<a href="${escapeHtml('/' + String(category.path || '').replace(/^\/+/, ''))}">${escapeHtml(category.name)}</a>`);
  }
  parts.push(`<span aria-current="page">${escapeHtml(shortTitle)}</span>`);
  const nav = `<nav class="cj-breadcrumbs" data-cj-breadcrumbs aria-label="面包屑">${parts.join('<span class="cj-breadcrumbs-sep" aria-hidden="true">/</span>')}</nav>`;

  const marker = '<div class="article-title relative w-full">';
  if (!str.includes(marker)) return str;
  return str.replace(marker, () => nav + marker);
});
