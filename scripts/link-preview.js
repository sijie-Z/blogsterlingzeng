/**
 * Link previews — 构建期输出站内链接的预览元数据。
 *
 * 前端 custom.js 在桌面端悬停文章内链时按需读取,
 * 显示标题、摘要、封面和分类日期。只收录文章与页面,不收录标签/分类聚合页。
 */

'use strict';

const fs = require('fs');
const path = require('path');

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function ogExists(hexo, file) {
  try {
    const rel = String(file || '').replace(/^\/+/, '');
    return fs.existsSync(path.join(hexo.source_dir, rel));
  } catch (e) {
    return false;
  }
}

hexo.extend.generator.register('link_previews', function (locals) {
  const data = {};

  const add = (item, type) => {
    if (!item || !item.title) return;
    // locals.pages 的 path 是 about/index.html,前端链接是 /about/
    const route = ('/' + String(item.path || '').replace(/^\/+/, ''))
      .replace(/index\.html$/, '')
      .replace(/\.html$/, '');
    if (route === '/') return;

    let cover = item.cover || '';
    if (!cover && type === 'post' && item.slug) {
      const candidate = `/images/og/${item.slug}.jpg`;
      if (ogExists(hexo, candidate)) cover = candidate;
    }
    if (!cover || !ogExists(hexo, cover)) {
      const pageCard = type === 'page' ? `/images/og/page-${String(item.path || '').split('/')[0]}.jpg` : '';
      cover = pageCard && ogExists(hexo, pageCard) ? pageCard : '/images/og-banner.jpg';
    }

    const description = String(item.description || '').trim() ||
      stripHtml(item.excerpt).slice(0, 110);

    const categories = item.categories;
    const category = categories && categories.length ? categories.first().name : '';
    const date = item.date ? item.date.format('YYYY-MM-DD') : '';
    const meta = type === 'post' ? [date, category].filter(Boolean).join(' · ') : '页面';

    data[route] = {
      title: String(item.title),
      description: description.slice(0, 120),
      cover,
      meta,
      type,
    };
  };

  locals.posts.forEach(post => add(post, 'post'));
  locals.pages.forEach(page => add(page, 'page'));

  return {
    path: 'link-preview.json',
    data: JSON.stringify(data),
  };
});
