/**
 * Backlinks — 构建期扫描所有文章的正文内链,在目标文章里列出“引用本文的文章”。
 *
 * 只扫描 post.content(渲染后的正文),不包含导航、相关阅读、系列卡;
 * 输出纯 HTML,运行时不发请求。
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

function normalize(href) {
  let value = String(href || '').split('#')[0].split('?')[0];
  try { value = decodeURIComponent(value); } catch (e) {}
  value = value.replace(/index\.html$/, '');
  if (!value.startsWith('/')) value = '/' + value;
  if (!value.endsWith('/')) value += '/';
  return value.replace(/\/{2,}/g, '/');
}

function decodeEntities(text) {
  return String(text)
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (match, num) => String.fromCodePoint(Number(num)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function stripTags(html) {
  return decodeEntities(String(html).replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function excerpt(html, index, length, anchorHtml) {
  const start = Math.max(0, index - 500);
  const end = Math.min(html.length, index + length + 500);
  const text = stripTags(html.slice(start, end));
  const anchor = stripTags(anchorHtml);
  const pos = anchor ? text.indexOf(anchor) : -1;
  if (pos === -1) {
    return text.slice(0, 90) + (text.length > 90 ? '…' : '');
  }
  const from = Math.max(0, pos - 32);
  const slice = text.slice(from, from + 96).trim();
  return (from > 0 ? '…' : '') + slice + (from + 96 < text.length ? '…' : '');
}

let cache = null;

function buildMap() {
  if (cache) return cache;
  const posts = hexo.locals.get('posts');
  const byPath = new Map();
  posts.forEach(post => byPath.set(normalize(post.path), post));

  const map = new Map();
  posts.forEach(source => {
    const html = String(source.content || '');
    const seen = new Set();
    const re = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = re.exec(html))) {
      const href = match[1];
      if (!href.startsWith('/') || href.startsWith('//')) continue;
      const target = normalize(href);
      if (target === normalize(source.path) || !byPath.has(target) || seen.has(target)) continue;
      seen.add(target);
      if (!map.has(target)) map.set(target, []);
      map.get(target).push({
        title: String(source.title || ''),
        path: '/' + String(source.path || '').replace(/^\/+/, ''),
        date: source.date ? source.date.valueOf() : 0,
        excerpt: excerpt(html, match.index, match[0].length, match[2]),
      });
    }
  });

  map.forEach(list => list.sort((a, b) => b.date - a.date));
  cache = map;
  return map;
}

hexo.extend.filter.register('after_render:html', function (str, locals) {
  const page = locals && locals.page;
  if (!str || !page) return str;
  if (!(page.layout === 'post' || page.__post)) return str;
  if (str.includes('class="cj-backlinks"')) return str;

  const list = buildMap().get(normalize(page.path)) || [];
  if (!list.length) return str;

  const items = list.slice(0, 5).map(item =>
    `<li><a href="${escapeHtml(item.path)}">${escapeHtml(item.title)}</a>` +
    `<p>${escapeHtml(item.excerpt)}</p></li>`
  ).join('');

  const section =
    `<section class="cj-backlinks" aria-label="引用本文的文章">` +
    `<div class="cj-backlinks-head"><span class="cj-backlinks-title">引用本文的文章</span>` +
    `<span class="cj-backlinks-count">${list.length}</span></div>` +
    `<ul>${items}</ul></section>`;

  const copyright = str.indexOf('<div class="post-copyright-info');
  if (copyright !== -1) {
    return str.slice(0, copyright) + section + str.slice(copyright);
  }
  const giscus = str.indexOf('<div id="giscus-container"');
  if (giscus !== -1) {
    return str.slice(0, giscus) + section + str.slice(giscus);
  }
  return str.replace('</article>', () => section + '</article>');
});
