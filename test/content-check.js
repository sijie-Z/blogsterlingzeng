/* 内容检查:front matter / 本地链接 / 图片 / 文风硬规则 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const POSTS = path.join(ROOT, 'source', '_posts');
const IMAGES = new Set(fs.readdirSync(path.join(ROOT, 'source', 'images')));
const files = fs.readdirSync(POSTS).filter(f => f.endsWith('.md'));
const slugs = new Set(files.map(f => f.replace(/\.md$/, '')));
const KNOWN_PAGES = new Set([
  '/about', '/archives', '/tags', '/categories', '/projects', '/friends',
  '/bookmarks', '/shuoshuo', '/photos', '/resume', '/series',
]);
const OG_DIR = path.join(ROOT, 'source', 'images', 'og');
const OG_MANIFEST = path.join(OG_DIR, 'og-manifest.json');
let ogManifest = {};
try { ogManifest = JSON.parse(fs.readFileSync(OG_MANIFEST, 'utf8')); } catch (e) { ogManifest = {}; }

const errors = [];
const warnings = [];

for (const file of files) {
  const text = fs.readFileSync(path.join(POSTS, file), 'utf8');
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) { errors.push(`${file}: 缺少 front matter`); continue; }
  const meta = fm[1];

  for (const key of ['title', 'date', 'categories', 'description']) {
    if (!new RegExp('^' + key + ':', 'm').test(meta)) warnings.push(`${file}: front matter 缺少 ${key}`);
  }

  const coverMatch = meta.match(/^cover:\s*["']?([^"'\s]+)/m);
  if (coverMatch && coverMatch[1].startsWith('/images/')) {
    const name = decodeURIComponent(coverMatch[1].slice('/images/'.length));
    if (!IMAGES.has(name)) errors.push(`${file}: cover 不存在 ${coverMatch[1]}`);
  }

  const slug = file.replace(/\.md$/, '');
  if (!fs.existsSync(path.join(OG_DIR, `${slug}.jpg`))) {
    errors.push(`${file}: 缺少 OG 分享卡（运行 npm run og:images）`);
  }
  const titleMatch = meta.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  const title = titleMatch ? titleMatch[1].trim() : '';
  const posterTitle = ogManifest[`${slug}.jpg`];
  if (!posterTitle) {
    errors.push(`${file}: OG manifest 缺少 ${slug}.jpg（运行 npm run og:images）`);
  } else if (title && posterTitle !== title) {
    errors.push(`${file}: OG 卡标题过期（清单 "${posterTitle}"，当前 "${title}"），运行 npm run og:images`);
  }

  const body = text.slice(fm[0].length);
  const prose = body
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '');

  for (const m of prose.matchAll(/\]\((\/[^)\s]+)\)/g)) {
    const link = m[1];
    if (link.startsWith('/images/')) {
      const name = decodeURIComponent(link.slice('/images/'.length).split('?')[0]);
      if (!IMAGES.has(name)) errors.push(`${file}: 图片不存在 ${link}`);
      continue;
    }
    if (link.startsWith('/#') || link.startsWith('/live2d/')) continue;
    if (/^\/\d{4}\/\d{2}\/\d{2}\/[\w-]+\/?$/.test(link)) {
      const slug = link.split('/').filter(Boolean).pop();
      if (!slugs.has(slug)) warnings.push(`${file}: 文章链接可能失效 ${link}`);
      continue;
    }
    const base = link.split('#')[0].replace(/\/$/, '');
    if (KNOWN_PAGES.has(base) || /^\/page\/\d+$/.test(base) || /^\/series\/[a-z0-9-]+$/.test(base)) {
      continue;
    }
    warnings.push(`${file}: 未知站内链接 ${link}`);
  }

  const exclamations = (prose.match(/[!！]/g) || []).length;
  if (exclamations) warnings.push(`${file}: ${exclamations} 个感叹号`);
  const emotional = prose.match(/震撼|激动|痛苦|欣喜/g);
  if (emotional) warnings.push(`${file}: 情绪形容词 ${emotional.length} 处`);
}

errors.forEach(e => console.log('ERROR', e));
warnings.forEach(w => console.log('WARN ', w));
console.log(`\n${files.length} 篇文章,${errors.length} 个错误,${warnings.length} 个警告`);
process.exit(errors.length ? 1 : 0);
