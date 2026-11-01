/**
 * 视频库数据 — 把 source/_data/videos.yml 输出成 /videos.json。
 * 页面只读这个静态 JSON，收藏状态在浏览器本地。
 */

'use strict';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePath(value) {
  const input = clean(value);
  if (!input) return '';
  if (input.startsWith('source/')) return '/' + input.slice(7);
  return input;
}

function isSafeUrl(value) {
  return /^(https?:\/\/|\/)/i.test(value);
}

function normalizeDate(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const pad = (number) => String(number).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map((tag) => clean(String(tag))).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
  return [];
}

hexo.extend.generator.register('video-library-data', function (locals) {
  const data = (locals.data && locals.data.videos) || (hexo.locals.get('data') || {}).videos || [];
  const items = (Array.isArray(data) ? data : []).map((item) => {
    if (!item || typeof item !== 'object') return null;
    const id = clean(item.id);
    const title = clean(item.title);
    const src = normalizePath(item.video || item.src);
    if (!id || !title || !src || !isSafeUrl(src)) return null;
    const cover = normalizePath(item.cover);
    return {
      id,
      title,
      description: clean(item.description),
      category: clean(item.category) || '未分类',
      src,
      cover: isSafeUrl(cover) ? cover : '',
      tags: normalizeTags(item.tags),
      date: normalizeDate(item.date),
      duration: clean(item.duration),
    };
  }).filter(Boolean);

  return {
    path: 'videos.json',
    data: JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), items }),
  };
});
