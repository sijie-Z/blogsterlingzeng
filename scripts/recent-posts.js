/**
 * Recent posts on 404 — 404 页原来只有搜索和几个入口，这里补 5 篇最近文章。
 * 构建期写入，运行时不发请求。
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
  if (!str) return str;
  // 用页面结构识别 404,比 page.path/permalink 在不同 Hexo 版本下更稳
  if (!str.includes('class="not-found"')) return str;
  if (str.includes('class="cj-recent"')) return str;

  const posts = [];
  hexo.locals.get('posts').forEach(post => posts.push(post));
  if (!posts.length) return str;
  posts.sort((a, b) => (b.date ? b.date.valueOf() : 0) - (a.date ? a.date.valueOf() : 0));

  const items = posts.slice(0, 5).map(post =>
    `<li><a href="/${String(post.path || '').replace(/^\/+/, '')}">${escapeHtml(post.title)}</a>` +
    `<time datetime="${post.date ? post.date.format('YYYY-MM-DD') : ''}">${post.date ? post.date.format('YYYY-MM-DD') : ''}</time></li>`
  ).join('');

  const block = '<section class="cj-recent" aria-label="最近文章">' +
    '<h2 class="cj-recent-title">最近文章</h2><ul>' + items + '</ul></section>';

  const hint = /<p class="not-found-hint">[\s\S]*?<\/p>/;
  if (hint.test(str)) return str.replace(hint, match => match + block);
  const mainClose = str.lastIndexOf('</main>');
  if (mainClose !== -1) return str.slice(0, mainClose) + block + str.slice(mainClose);
  return str;
});
