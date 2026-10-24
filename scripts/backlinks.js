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

function safeCodePoint(value, base) {
  const code = parseInt(value, base);
  if (!Number.isFinite(code) || code < 0 || code > 0x10FFFF ||
      (code >= 0xD800 && code <= 0xDFFF)) return null;
  try { return String.fromCodePoint(code); } catch (e) { return null; }
}

function decodeEntities(text) {
  try {
    return String(text)
      .replace(/&#x([0-9a-f]+);/gi, (match, hex) => safeCodePoint(hex, 16) || match)
      .replace(/&#(\d+);/g, (match, num) => safeCodePoint(num, 10) || match)
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  } catch (e) {
    return String(text);
  }
}

function stripTags(html) {
  return decodeEntities(String(html).replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function excerpt(html, index, length, anchorHtml) {
  // 先锁到链接所在的段落,避免把前一段出现的同名文字当成引用上下文
  let start = html.lastIndexOf('<p', index);
  let end = html.indexOf('</p>', index + length);
  if (start === -1 || end === -1 || end < start) {
    start = Math.max(0, index - 300);
    end = Math.min(html.length, index + length + 300);
  } else {
    end += 4;
  }

  const windowHtml = html.slice(start, end);
  const anchorPos = windowHtml.indexOf(anchorHtml);
  const anchorText = stripTags(anchorHtml);
  let before = '';
  let after = '';
  if (anchorPos !== -1) {
    before = stripTags(windowHtml.slice(0, anchorPos));
    after = stripTags(windowHtml.slice(anchorPos + anchorHtml.length));
  } else {
    after = stripTags(windowHtml);
  }

  const left = before.slice(Math.max(0, before.length - 42));
  const right = after.slice(0, 66);
  // 中文正文里链接前后常有空格,stripTags 会把空格吃掉;在拉丁词与中文交界处补一个
  const join = (a, b) => {
    if (!a || !b) return a + b;
    const asciiA = /[A-Za-z0-9]$/.test(a);
    const asciiB = /^[A-Za-z0-9]/.test(b);
    return asciiA === asciiB ? a + b : a + ' ' + b;
  };
  const text = ((before.length > left.length ? '…' : '') +
    join(join(left, anchorText), right)).trim();
  return text + (after.length > right.length ? '…' : '');
}

let cache = null;

// watch / hexo server 模式下同一个进程会反复 generate,缓存必须按构建重置
hexo.on('generateBefore', () => { cache = null; });

function buildMap() {
  if (cache) return cache;
  const posts = hexo.locals.get('posts');
  const byPath = new Map();
  posts.forEach(post => byPath.set(normalize(post.path), post));

  const siteUrl = String(hexo.config.url || '').replace(/\/+$/, '') + '/';
  let siteOrigin = '';
  try { siteOrigin = new URL(siteUrl).origin; } catch (e) {}

  const map = new Map();
  posts.forEach(source => {
    const sourcePath = normalize('/' + String(source.path || ''));
    const html = String(source.content || '');
    const seen = new Set();
    const re = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = re.exec(html))) {
      let resolved;
      try { resolved = new URL(match[1], siteUrl); } catch (e) { continue; }
      // 同源绝对 URL、协议相对 URL 和站内相对路径都归一到 pathname
      if (siteOrigin && resolved.origin !== siteOrigin) continue;
      const target = normalize(resolved.pathname);
      if (target === sourcePath || !byPath.has(target) || seen.has(target)) continue;
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

  // 依次找版权区、各评论系统容器;都不存在时退到 main 末尾,
  // 不依赖主题里并不存在的 </article>
  const markers = [
    '<div class="post-copyright-info',
    '<div id="giscus-container"',
    '<div id="waline-container"',
    '<div id="twikoo-container"',
    '<div id="artalk-container"',
    '<div id="comments"',
    '<section id="comments"',
  ];
  for (const marker of markers) {
    const at = str.indexOf(marker);
    if (at !== -1) return str.slice(0, at) + section + str.slice(at);
  }
  const mainClose = str.lastIndexOf('</main>');
  if (mainClose !== -1) return str.slice(0, mainClose) + section + str.slice(mainClose);
  return str;
});
