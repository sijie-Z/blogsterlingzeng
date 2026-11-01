/**
 * 视频库数据 — 把 source/_data/videos.yml 与 video-topics.yml
 * 输出成 /videos.json。页面只读静态 JSON，收藏在浏览器本地。
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

function normalizeTopics(value) {
  const names = [];
  (Array.isArray(value) ? value : []).forEach((entry) => {
    const name = clean(typeof entry === 'string' ? entry : entry && entry.name);
    if (name && !names.includes(name)) names.push(name);
  });
  return names.slice(0, 10);
}

hexo.extend.generator.register('video-library-data', function (locals) {
  const data = locals.data || hexo.locals.get('data') || {};
  const configuredTopics = normalizeTopics(data['video-topics']);
  const rawItems = Array.isArray(data.videos) ? data.videos : [];

  const items = rawItems.map((item) => {
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
      topic: clean(item.topic || item.category),
      src,
      cover: isSafeUrl(cover) ? cover : '',
      tags: normalizeTags(item.tags),
      date: normalizeDate(item.date),
      duration: clean(item.duration),
    };
  }).filter(Boolean);

  const topics = configuredTopics.slice();
  items.forEach((item) => {
    if (item.topic && !topics.includes(item.topic) && topics.length < 10) {
      topics.push(item.topic);
    }
  });
  const fallbackTopic = topics.includes('其他') ? '其他' : (topics[0] || '未分类');
  items.forEach((item) => {
    if (!item.topic || !topics.includes(item.topic)) item.topic = fallbackTopic;
  });
  if (!topics.length && items.length) topics.push('未分类');

  return {
    path: 'videos.json',
    data: JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), topics, items }),
  };
});
