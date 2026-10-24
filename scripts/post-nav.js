/**
 * Post navigation — 构建期为文章生成“更早一篇 / 更新一篇”。
 *
 * 非系列文章走到文末原来没有任何继续阅读入口；这里按发布日期排序，
 * 同时输出 head 里的 rel=prev/next，方便浏览器和爬虫理解顺序。
 * 纯静态 HTML，运行时不发请求。
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

let ordered = null;

hexo.on('generateBefore', () => { ordered = null; });

function postsByDate() {
  if (ordered) return ordered;
  const list = [];
  hexo.locals.get('posts').forEach(post => list.push(post));
  list.sort((a, b) => (b.date ? b.date.valueOf() : 0) - (a.date ? a.date.valueOf() : 0));
  ordered = list;
  return list;
}

function hrefOf(post) {
  return '/' + String(post.path || '').replace(/^\/+/, '');
}

function dateOf(post) {
  return post.date ? post.date.format('YYYY-MM-DD') : '';
}

hexo.extend.filter.register('after_render:html', function (str, locals) {
  const page = locals && locals.page;
  if (!str || !page) return str;
  if (!(page.layout === 'post' || page.__post)) return str;
  if (str.includes('class="cj-post-nav"')) return str;

  const list = postsByDate();
  const route = '/' + String(page.path || '').replace(/^\/+/, '');
  const index = list.findIndex(post => hrefOf(post) === route);
  if (index === -1) return str;

  // 列表按新到旧排序:index-1 是更新的一篇,index+1 是更早的一篇
  const newer = index > 0 ? list[index - 1] : null;
  const older = index < list.length - 1 ? list[index + 1] : null;
  if (!newer && !older) return str;

  const card = (post, kind, label, rel) => {
    if (!post) {
      return '<span class="cj-post-nav-item is-empty" aria-hidden="true"></span>';
    }
    return `<a class="cj-post-nav-item is-${kind}" href="${escapeHtml(hrefOf(post))}" rel="${rel}">` +
      `<span class="cj-post-nav-label">${label}</span>` +
      `<span class="cj-post-nav-title">${escapeHtml(post.title)}</span>` +
      `<span class="cj-post-nav-date">${escapeHtml(dateOf(post))}</span></a>`;
  };

  const nav = '<nav class="cj-post-nav" aria-label="文章导航">' +
    card(older, 'prev', '← 更早一篇', 'prev') +
    card(newer, 'next', '更新一篇 →', 'next') +
    '</nav>';

  let out = str;
  const backlinks = out.indexOf('<section class="cj-backlinks"');
  if (backlinks !== -1) {
    out = out.slice(0, backlinks) + nav + out.slice(backlinks);
  } else {
    const copyright = out.indexOf('<div class="post-copyright-info');
    if (copyright !== -1) out = out.slice(0, copyright) + nav + out.slice(copyright);
    else {
      const mainClose = out.lastIndexOf('</main>');
      if (mainClose !== -1) out = out.slice(0, mainClose) + nav + out.slice(mainClose);
    }
  }

  if (!out.includes('<link rel="prev"') && !out.includes('<link rel="next"')) {
    const links = [
      older ? `<link rel="prev" href="${escapeHtml(hrefOf(older))}">` : '',
      newer ? `<link rel="next" href="${escapeHtml(hrefOf(newer))}">` : '',
    ].filter(Boolean).join('\n');
    if (links) out = out.replace('</head>', () => links + '\n</head>');
  }

  return out;
});
