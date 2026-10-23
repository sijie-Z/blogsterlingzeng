/**
 * JSON Feed 1.1 — 站点级 feed.json。
 *
 * Atom 仍然保留给传统阅读器；JSON Feed 面向只支持 JSON 的聚合器
 * （以及用脚本消费博客的场景）。内容与 Atom 一致：全文 HTML、
 * 绝对 URL、稳定 id。系列级 feed 由 series.js 生成。
 */

'use strict';

function siteRoot() {
  return String(hexo.config.url || '').replace(/\/+$/, '');
}

function absolute(path) {
  const root = siteRoot();
  const value = String(path == null ? '' : path);
  if (!value) return root + '/';
  if (/^https?:\/\//i.test(value)) return value;
  return root + '/' + value.replace(/^\/+/, '');
}

function absolutizeHtml(html) {
  const root = siteRoot();
  return String(html == null ? '' : html)
    .replace(/\b(src|href)="\/(?!\/)/g, (m, attr) => `${attr}="${root}/`)
    .replace(/\bsrcset="([^"]*)"/g, (m, value) => {
      const next = value.replace(/(^|,\s*)\/(?!\/)/g, (mm, prefix) => prefix + root + '/');
      return `srcset="${next}"`;
    });
}

function plainText(html) {
  return String(html || '')
    .replace(/<pre[\s\S]*?<\/pre>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function postSummary(post) {
  const raw = String(post.description || '').trim();
  if (raw) return raw;
  return plainText(post.content).slice(0, 180);
}

function postImage(post) {
  const cover = post.cover || (post.banner && (post.banner.dark || post.banner.light)) || '';
  return cover ? absolute(cover) : undefined;
}

function feedItem(post) {
  const url = absolute(post.path);
  const tags = post.tags && post.tags.toArray ? post.tags.toArray().map(tag => tag.name) : [];
  const categories = post.categories && post.categories.toArray ? post.categories.toArray().map(c => c.name) : [];
  const item = {
    id: url,
    url,
    title: String(post.title || ''),
    content_html: absolutizeHtml(post.content),
    summary: postSummary(post),
    date_published: post.date.toISOString(),
    date_modified: (post.updated || post.date).toISOString(),
    language: 'zh-CN',
    tags: [...new Set([...categories, ...tags])],
    authors: [{ name: String(hexo.config.author || ''), url: absolute('/about/') }],
  };
  const image = postImage(post);
  if (image) item.image = image;
  return item;
}

function feedMeta() {
  const theme = hexo.theme.config || {};
  const og = theme.open_graph || {};
  const config = hexo.config || {};
  return {
    version: 'https://jsonfeed.org/version/1.1',
    title: String(config.title || ''),
    home_page_url: absolute('/'),
    feed_url: absolute('/feed.json'),
    description: String(og.description || config.description || ''),
    icon: absolute('/images/favicon.png'),
    favicon: absolute('/images/favicon.png'),
    language: 'zh-CN',
    authors: [{ name: String(config.author || ''), url: absolute('/about/') }],
  };
}

function sortedPosts() {
  return hexo.locals.get('posts').toArray()
    .filter(post => post.published !== false && !post.draft)
    .sort((a, b) => b.date - a.date);
}

hexo.extend.generator.register('json-feed', function () {
  const routes = [{
    path: 'feed.json',
    data: JSON.stringify(Object.assign(feedMeta(), { items: sortedPosts().map(feedItem) }), null, 2) + '\n',
  }];

  // 系列级 JSON Feed:和系列 Atom 同时提供,文章按发布时间倒序
  if (typeof hexo.__cjBuildSeries === 'function') {
    const { list } = hexo.__cjBuildSeries();
    for (const group of list) {
      const meta = Object.assign(feedMeta(), {
        title: `${String(hexo.config.title || '')} — ${group.name}`,
        home_page_url: absolute(`/series/${group.slug}/`),
        feed_url: absolute(`/series/${group.slug}/feed.json`),
        description: group.description || feedMeta().description,
        items: group.posts.slice()
          .sort((a, b) => b.post.date - a.post.date)
          .map(({ post }) => feedItem(post)),
      });
      routes.push({
        path: `series/${group.slug}/feed.json`,
        data: JSON.stringify(meta, null, 2) + '\n',
      });
    }
  }
  return routes;
});

// 所有页面都声明站点 JSON Feed，阅读器在一个页面就能发现两种格式
hexo.extend.filter.register('after_render:html', function (str) {
  if (!str || !str.includes('</head>') || str.includes('data-json-feed')) return str;
  const href = absolute('/feed.json');
  const type = 'application/feed+json';
  const title = String((hexo.config && hexo.config.title) || '');
  return str.replace('</head>', () =>
    `<link data-json-feed rel="alternate" type="${type}" title="${title.replace(/"/g, '&quot;')}" href="${href}">\n</head>`);
});

module.exports = {
  absolute,
  absolutizeHtml,
  feedItem,
  feedMeta,
  sortedPosts,
};
