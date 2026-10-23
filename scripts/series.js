/**
 * Series — 构建期生成系列总览页 / 系列页，并把「系列徽章 + 系列卡」
 * 注入文章 HTML。
 *
 * 为什么不放前端:系列信息是静态的，构建期写入可以让首屏就有正确
 * 高度（0 CLS）、0 运行时请求；折叠用原生 <details>，0 JS。
 * front-matter:
 *   series: blog-engineering      # 系列 slug（必填）
 *   series_order: 2               # 可选，1-based；全有或全无
 * 系列显示名/简介放 source/_data/series.yml。
 */

'use strict';

const fs = require('fs');
const path = require('path');

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function dateText(post) {
  try {
    return post.date.format('YYYY-MM-DD');
  } catch (e) {
    return '';
  }
}

function categoryName(post) {
  const list = post.categories && post.categories.toArray ? post.categories.toArray() : [];
  return list.length ? list[0].name : '';
}

function groupMinutes(group) {
  let minutes = 0;
  for (const item of group.posts) {
    const text = String(item.post.content || '')
      .replace(/<pre[\s\S]*?<\/pre>/gi, ' ')
      .replace(/<[^>]+>/g, ' ');
    const cjk = (text.match(/[一-鿿]/g) || []).length;
    const latin = text.replace(/[一-鿿]/g, ' ').split(/\s+/).filter(Boolean).length;
    minutes += Math.max(1, Math.round((cjk + latin * 1.5) / 300));
  }
  return minutes;
}

function seriesMeta(group, withUpdated = false) {
  const base = `${group.posts.length} 篇 · 约 ${group.minutes} 分钟`;
  if (!withUpdated) return base;
  return `${base} · 最近更新 ${dateText(group.latest)}`;
}

function normalizeSeries(post) {
  const raw = post.series;
  if (!raw) return null;

  let slug = '';
  let name = '';
  let order = NaN;
  if (typeof raw === 'string') {
    slug = raw.trim();
  } else if (typeof raw === 'object') {
    slug = String(raw.slug || raw.id || raw.name || '').trim();
    name = String(raw.name || '').trim();
    if (raw.order != null) order = Number(raw.order);
  }
  slug = slug.toLowerCase();
  if (!/^[a-z0-9-]+$/.test(slug)) {
    hexo.log.warn(`[series] 非法 slug「${slug}」，已跳过：${post.source || post.path}`);
    return null;
  }
  if (post.series_order != null) order = Number(post.series_order);
  return {
    slug,
    name,
    order: Number.isFinite(order) ? order : NaN,
  };
}

let cache = null;

function buildSeries() {
  if (cache) return cache;

  const data = (hexo.locals.get('data') || {}).series || {};
  const posts = hexo.locals.get('posts').toArray()
    .filter(post => post.published !== false && !post.draft);

  const groups = new Map();
  for (const post of posts) {
    const info = normalizeSeries(post);
    if (!info) continue;
    if (!groups.has(info.slug)) {
      groups.set(info.slug, { slug: info.slug, posts: [] });
    }
    groups.get(info.slug).posts.push({
      post,
      order: info.order,
      name: info.name,
    });
  }

  for (const group of groups.values()) {
    const meta = Object.prototype.hasOwnProperty.call(data, group.slug) ? data[group.slug] : {};
    group.name = String(meta.name || group.posts.find(p => p.name)?.name || group.slug);
    group.description = String(meta.description || '');

    const numbered = group.posts.map(p => p.order).filter(Number.isFinite);
    const unique = new Set(numbered);
    const useOrder = numbered.length === group.posts.length && unique.size === numbered.length;
    if (numbered.length && !useOrder) {
      hexo.log.warn(`[series] ${group.slug}: series_order 缺失或重复，回退按日期排序`);
    }
    group.posts.sort(useOrder
      ? (a, b) => a.order - b.order || a.post.date - b.post.date
      : (a, b) => a.post.date - b.post.date);

    group.entries = group.posts.map((item, i) => ({
      post: item.post,
      index: i + 1,
      total: group.posts.length,
      category: categoryName(item.post),
      prev: i > 0 ? group.posts[i - 1].post : null,
      next: i < group.posts.length - 1 ? group.posts[i + 1].post : null,
    }));
    group.minutes = groupMinutes(group);
    // “最近更新”/系列排序/ sitemap lastmod 都看真实日期,不看系列顺序
    group.latest = group.posts.reduce((a, b) => (b.post.date > a.post.date ? b : a)).post;
    group.byId = new Map(group.entries.map(e => [String(e.post._id), e]));
    group.byPath = new Map(group.entries.map(e => [String(e.post.path), e]));
  }

  cache = {
    groups,
    list: [...groups.values()].sort((a, b) => b.latest.date - a.latest.date),
  };
  return cache;
}

hexo.on('generateBefore', () => {
  cache = null;
});

function sitePath(path) {
  const root = String(hexo.config.root || '/');
  return (root.endsWith('/') ? root : root + '/') + String(path || '').replace(/^\/+/, '');
}

function seriesUrl(slug) {
  return sitePath('series/' + slug + '/');
}

function seriesFeedUrl(slug) {
  return seriesUrl(slug) + 'atom.xml';
}

function postUrl(post) {
  return sitePath(post.path);
}

function seriesEntryFor(page) {
  if (!page || !page.series) return null;
  const info = normalizeSeries(page);
  if (!info) return null;
  const group = buildSeries().groups.get(info.slug);
  if (!group) return null;
  const entry = group.byId.get(String(page._id)) || group.byPath.get(String(page.path)) || null;
  return entry ? { entry, group } : null;
}

function renderBadge(entry, group) {
  const percent = Math.round(entry.index / entry.total * 100);
  return `
<nav class="post-series-badge" aria-label="系列导航">
  <div class="post-series-badge-row">
    <span class="post-series-kicker">系列</span>
    <a class="post-series-name" href="${escapeHtml(seriesUrl(group.slug))}">${escapeHtml(group.name)}</a>
    <span class="post-series-count">第 ${entry.index} 篇 / 共 ${entry.total} 篇</span>
  </div>
  <div class="post-series-progress" aria-hidden="true"><span style="width:${percent}%"></span></div>
</nav>`;
}

function renderSeriesItem(item, current) {
  const title = current
    ? `<span class="post-series-item-title">${escapeHtml(item.post.title)}</span>`
    : `<a class="post-series-item-title" href="${escapeHtml(postUrl(item.post))}">${escapeHtml(item.post.title)}</a>`;
  return `<li${current ? ' class="is-current" aria-current="page"' : ''}>
  <span class="post-series-idx">${String(item.index).padStart(2, '0')}</span>
  <span class="post-series-item-main">
    ${title}
    <span class="post-series-item-meta">${escapeHtml(dateText(item.post))}${item.category ? ' · ' + escapeHtml(item.category) : ''}</span>
  </span>
  ${current ? '<span class="post-series-current">当前</span>' : ''}
</li>`;
}

function renderCard(entry, group) {
  const percent = Math.round(entry.index / entry.total * 100);
  const prev = entry.prev;
  const next = entry.next;
  const prevHtml = prev
    ? `<a class="post-series-step post-series-prev" rel="prev" href="${escapeHtml(postUrl(prev))}">
        <span class="post-series-step-label">系列上一篇</span>
        <strong>${escapeHtml(prev.title)}</strong>
      </a>`
    : `<span class="post-series-step post-series-prev is-disabled">
        <span class="post-series-step-label">系列上一篇</span>
        <strong>已是第一篇</strong>
      </span>`;
  const nextHtml = next
    ? `<a class="post-series-step post-series-next" rel="next" href="${escapeHtml(postUrl(next))}">
        <span class="post-series-step-label">系列下一篇</span>
        <strong>${escapeHtml(next.title)}</strong>
      </a>`
    : `<span class="post-series-step post-series-next is-disabled">
        <span class="post-series-step-label">系列下一篇</span>
        <strong>已是最后一篇</strong>
      </span>`;

  const list = group.entries.map(item => renderSeriesItem(item, item === entry)).join('');

  return `
<section class="post-series-card" aria-label="系列文章">
  <div class="post-series-card-head">
    <div class="post-series-card-heading">
      <span class="post-series-kicker">本文属于系列</span>
      <h2 class="post-series-card-title"><a href="${escapeHtml(seriesUrl(group.slug))}">${escapeHtml(group.name)}</a></h2>
    </div>
    <span class="post-series-count">第 ${entry.index} 篇 / 共 ${entry.total} 篇 · ${percent}%</span>
  </div>
  <div class="post-series-progress" aria-hidden="true"><span style="width:${percent}%"></span></div>
  <div class="post-series-nav">${prevHtml}${nextHtml}</div>
  <details class="post-series-details">
    <summary>展开全部 ${entry.total} 篇</summary>
    <ol class="post-series-list">${list}</ol>
  </details>
  <a class="post-series-all" href="${escapeHtml(seriesUrl(group.slug))}">查看系列全部文章 <span aria-hidden="true">→</span></a>
</section>`;
}

function renderSeriesPage(group) {
  const items = group.entries.map(entry => `<li class="series-item">
  <a class="series-item-link" href="${escapeHtml(postUrl(entry.post))}">
    <span class="series-item-idx">${String(entry.index).padStart(2, '0')}</span>
    <span class="series-item-body">
      <span class="series-item-title">${escapeHtml(entry.post.title)}</span>
      <span class="series-item-desc">${escapeHtml(String(entry.post.description || '').slice(0, 120))}</span>
      <span class="series-item-meta">${escapeHtml(dateText(entry.post))}${entry.category ? ' · ' + escapeHtml(entry.category) : ''}</span>
    </span>
  </a>
</li>`).join('');
  return `
<div class="series-page" data-series="${escapeHtml(group.slug)}">
  ${group.description ? `<p class="series-page-desc">${escapeHtml(group.description)}</p>` : ''}
  <div class="series-page-meta">${seriesMeta(group, true)} · <a class="series-rss" href="${escapeHtml(seriesFeedUrl(group.slug))}">RSS</a></div>
  <ol class="series-page-list">${items}</ol>
  <a class="series-back" href="${escapeHtml(sitePath('series/'))}"><span aria-hidden="true">←</span> 全部系列</a>
</div>`;
}

function renderSeriesIndex(list) {
  const cards = list.map(group => {
    return `<a class="series-index-card" href="${escapeHtml(seriesUrl(group.slug))}">
  <span class="series-index-kicker">系列</span>
  <span class="series-index-name">${escapeHtml(group.name)}</span>
  <span class="series-index-desc">${escapeHtml(group.description)}</span>
  <span class="series-index-meta">${seriesMeta(group, true)}</span>
</a>`;
  }).join('');
  return `
<div class="series-index" data-series-index>
  <p class="series-index-desc">把主题相近的文章串成一条阅读路径，按顺序读比按时间读更连贯。</p>
  <div class="series-index-grid">${cards}</div>
</div>`;
}

function renderArchiveSeries(list) {
  const cards = list.map(group =>
    `<a class="archive-series-card" href="${escapeHtml(seriesUrl(group.slug))}">
      <span class="archive-series-name">${escapeHtml(group.name)}</span>
      <span class="archive-series-meta">${seriesMeta(group)}</span>
    </a>`
  ).join('');
  return `<section class="archive-series" aria-label="系列文章">
  <div class="archive-series-head">
    <h2 class="archive-series-title">系列阅读</h2>
    <a class="archive-series-all" href="${escapeHtml(sitePath('series/'))}">全部系列 <span aria-hidden="true">→</span></a>
  </div>
  <div class="archive-series-grid">${cards}</div>
</section>`;
}

function renderSeriesFeed(group) {
  const config = hexo.config;
  const root = String(config.url || '').replace(/\/+$/, '');
  const site = String(config.title || '');
  const author = String(config.author || '');
  const pageUrl = root + seriesUrl(group.slug);
  const selfUrl = root + seriesFeedUrl(group.slug);
  const updated = (group.latest.updated || group.latest.date).toISOString();
  const entries = group.posts.slice()
    .sort((a, b) => b.post.date - a.post.date)
    .map(({ post }) => {
      const url = root + postUrl(post);
      const summary = String(post.description || '').replace(/\s+/g, ' ').trim();
      return `  <entry>
    <title>${escapeHtml(post.title)}</title>
    <link href="${escapeHtml(url)}"/>
    <id>${escapeHtml(url)}</id>
    <published>${post.date.toISOString()}</published>
    <updated>${(post.updated || post.date).toISOString()}</updated>${summary ? `\n    <summary type="text">${escapeHtml(summary)}</summary>` : ''}
  </entry>`;
    }).join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeHtml(site + ' — ' + group.name)}</title>${group.description ? `\n  <subtitle>${escapeHtml(group.description)}</subtitle>` : ''}
  <link href="${escapeHtml(pageUrl)}" rel="alternate"/>
  <link href="${escapeHtml(selfUrl)}" rel="self" type="application/atom+xml"/>
  <id>${escapeHtml(pageUrl)}</id>
  <updated>${updated}</updated>
  <author>
    <name>${escapeHtml(author)}</name>
    <uri>${escapeHtml(root + '/about/')}</uri>
  </author>
${entries}
</feed>
`;
}

hexo.extend.generator.register('series-pages', function () {
  const { list } = buildSeries();
  const routes = list.map(group => ({
    path: `series/${group.slug}/index.html`,
    layout: 'page',
    data: {
      title: group.name,
      description: group.description,
      content: renderSeriesPage(group),
      series_page: true,
      comment: false,
      // 社交分享优先用系列最新文章的封面
      // 社交分享优先用生成的系列 OG 卡,没有则回退到最新文章封面
      og_image: fs.existsSync(
        path.join(hexo.source_dir, 'images', 'og', `series-${group.slug}.jpg`)
      )
        ? `/images/og/series-${group.slug}.jpg`
        : (group.latest.cover || group.latest.banner || undefined),
    },
  }));
  routes.push({
    path: 'series/index.html',
    layout: 'page',
    data: {
      title: '系列文章',
      description: '按主题成组阅读站内文章。',
      content: renderSeriesIndex(list),
      series_page: true,
      comment: false,
      og_image: '/images/og/page-series.jpg',
    },
  });
  for (const group of list) {
    routes.push({
      path: `series/${group.slug}/atom.xml`,
      data: renderSeriesFeed(group),
    });
  }
  return routes;
});

// 系列页 head 里声明 Atom feed,阅读器/爬虫可以直接订阅
hexo.extend.filter.register('after_render:html', function (str, locals) {
  const page = locals && locals.page;
  if (!str || !page || !page.series_page) return str;
  const match = String(page.path || '').match(/^\/?series\/([a-z0-9-]+)\/(?:index\.html)?$/);
  if (!match) return str;
  const href = seriesFeedUrl(match[1]);
  if (str.includes('data-series-feed')) return str;
  return str.replace('</head>', () =>
    `<link data-series-feed rel="alternate" type="application/atom+xml" title="${escapeHtml(page.title || '')}" href="${escapeHtml(href)}">\n` +
    `<link data-series-json-feed rel="alternate" type="application/feed+json" title="${escapeHtml(page.title || '')}" href="${escapeHtml(href.replace(/atom\.xml$/, 'feed.json'))}">\n</head>`);
});

hexo.extend.filter.register('after_render:html', function (str, locals) {
  const page = locals && locals.page;
  if (!str) return str;

  // 归档页顶部加一条系列入口,让系列在导航之外也有落点
  if (!page || !page.__post) {
    // 只注入主归档页;年/月归档和 /archives/page/2/ 不重复放系列块
    const mainArchive = !page.year && !page.month && page.current === 1;
    if (mainArchive && str.includes('<div class="archive-container') && !str.includes('archive-series')) {
      const { list } = buildSeries();
      if (list.length) {
        return str.replace('<div class="archive-container', () => renderArchiveSeries(list) + '<div class="archive-container');
      }
    }
    return str;
  }
  if (!page.title) return str;
  if (!page.series) return str;
  if (str.includes('post-series-badge')) return str;

  const found = seriesEntryFor(page);
  if (!found || found.entry.total < 2) return str;
  const { entry, group } = found;

  let out = str;
  const badge = renderBadge(entry, group);
  const contentAt = out.indexOf('<div class="article-content markdown-body');
  if (contentAt !== -1) {
    out = out.slice(0, contentAt) + badge + '\n' + out.slice(contentAt);
  } else {
    hexo.log.warn(`[series] 未找到 article-content 锚点:${page.path}`);
  }

  const card = renderCard(entry, group);
  const anchors = [
    '<div class="post-copyright-info',
    '<div class="article-nav ',
    '<div class="comment-container',
  ];
  for (const anchor of anchors) {
    const at = out.indexOf(anchor);
    if (at !== -1) {
      out = out.slice(0, at) + card + '\n' + out.slice(at);
      return out;
    }
  }
  hexo.log.warn(`[series] 未找到系列卡插入锚点:${page.path}`);
  return out;
});

// 系列页由 generator 直接产出，hexo-generator-sitemap 只遍历 posts/pages，
// 不会自动收录。这里在路由写盘前把系列 URL 追加进 sitemap.xml。
function streamToString(stream) {
  if (typeof stream === 'string') return Promise.resolve(stream);
  if (!stream || typeof stream.on !== 'function') return Promise.resolve('');
  return new Promise(resolve => {
    let data = '';
    stream.on('data', chunk => { data += chunk; });
    stream.on('end', () => resolve(data));
    stream.on('error', () => resolve(''));
  });
}

hexo.extend.filter.register('after_generate', function () {
  const { list } = buildSeries();

  let routeStream;
  try {
    routeStream = hexo.route.get('sitemap.xml');
  } catch (e) {
    return;
  }
  if (!routeStream) return;

  const root = String(hexo.config.url || '').replace(/\/+$/, '');
  const entries = [{
    loc: root + '/series/',
    lastmod: list.length ? dateText(list[0].latest) : '',
    priority: '0.7',
  }].concat(list.map(group => ({
    loc: root + '/series/' + group.slug + '/',
    lastmod: dateText(group.latest),
    priority: '0.6',
  })));

  const extra = entries.map(e => `  <url>
    <loc>${escapeHtml(e.loc)}</loc>
    ${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}
    <changefreq>monthly</changefreq>
    <priority>${e.priority}</priority>
  </url>
`).join('');

  return streamToString(routeStream).then(xml => {
    if (!xml) return;
    if (!xml.includes('</urlset>')) {
      hexo.log.warn('[series] sitemap.xml 缺少 </urlset>,系列 URL 未追加');
      return;
    }
    // 页面 canonical 是目录 URL,sitemap 也统一去掉 index.html
    let out = xml.replace(/<loc>([^<]*?)\/index\.html<\/loc>/g, (m, path) => `<loc>${path}/</loc>`);
    out = out.replace('</urlset>', () => (list.length ? extra : '') + '</urlset>');
    hexo.route.set('sitemap.xml', out);
  });
});

module.exports = {
  buildSeries,
  seriesUrl,
};

// Hexo 的脚本之间通过同一个 hexo 实例通信(require 出来的模块拿不到
// 脚本作用域里的 hexo 变量),llms.txt 生成器用这个入口取系列列表。
hexo.__cjBuildSeries = buildSeries;
hexo.__cjSeriesUrl = seriesUrl;
