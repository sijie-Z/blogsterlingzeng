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
  // 站点时区是 Asia/Shanghai;00:00–07:59 的日期在 UTC 构建里会漂到前一天,
  // 之前 hexo-series-reading-path 因此在 CI/线上变成了另一个 URL。
  const dateMatch = meta.match(/^date:\s*(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}):(\d{2}))?/m);
  if (dateMatch) {
    const hour = dateMatch[2] === undefined ? 0 : Number(dateMatch[2]);
    if (hour < 8) {
      errors.push(`${file}: date 时间早于 08:00（或只有日期），UTC 构建会把文章路径移到前一天；请使用 08:00 之后的时间`);
    }
  }
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

// 构建后的可见页面不能残留 Markdown 标记。主题对中文标点、
// 个别数字/箭头组合和脚注内联代码的解析并不总符合源码预期。
const PUBLIC = path.join(ROOT, 'public');
function checkRenderedHtml(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkRenderedHtml(file);
      continue;
    }
    if (!entry.name.endsWith('.html')) continue;
    const html = fs.readFileSync(file, 'utf8');
    const visible = html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(script|style|pre|code)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
    const rel = path.relative(PUBLIC, file).replace(/\\/g, '/');
    if (visible.includes('**')) errors.push(`${rel}: 页面残留未渲染的 ** 标记`);
    const footnotes = html.match(/<section class="footnotes"[\s\S]*?<\/section>/);
    if (footnotes && footnotes[0].includes('`')) {
      errors.push(`${rel}: 脚注残留未渲染的反引号`);
    }
  }
}
if (fs.existsSync(PUBLIC)) checkRenderedHtml(PUBLIC);

// Pages CMS 配置必须和实际目录、字段保持一致，否则线上编辑器会静默失效。
try {
  const yaml = require('js-yaml');
  const cms = yaml.load(fs.readFileSync(path.join(ROOT, '.pages.yml'), 'utf8'));
  const collections = cms.content || [];
  const posts = collections.find((entry) => entry.name === 'posts');
  const essays = collections.find((entry) => entry.name === 'essays');
  const media = Array.isArray(cms.media) ? cms.media[0] : cms.media;
  if (!posts || posts.type !== 'collection' || posts.path !== 'source/_posts') {
    errors.push('.pages.yml: 文章 collection 必须指向 source/_posts');
  } else {
    const names = new Set((posts.fields || []).map((field) => field.name));
    for (const field of ['title', 'slug', 'date', 'description', 'categories', 'tags', 'cover', 'series', 'body']) {
      if (!names.has(field)) errors.push(`.pages.yml: 文章缺少 ${field} 字段`);
    }
    if (!posts.filename || !String(posts.filename.template || '').includes('{fields.slug}')) {
      errors.push('.pages.yml: 文章文件名模板必须使用 {fields.slug}');
    }
    if (!Array.isArray(posts.view && posts.view.sort)) {
      errors.push('.pages.yml: view.sort 必须是数组');
    }
    if (!posts.view || !posts.view.default || posts.view.default.order !== 'desc') {
      errors.push('.pages.yml: view.default.order 必须是 desc');
    }
    const body = (posts.fields || []).find((field) => field.name === 'body');
    if (!body || body.type !== 'code' || !body.options || body.options.format !== 'markdown') {
      errors.push('.pages.yml: 正文必须用 code + markdown，rich-text 会删 <!-- more -->');
    }
  }
  if (!essays || essays.type !== 'file' || essays.path !== 'source/_data/essays.yml' || essays.list !== true) {
    errors.push('.pages.yml: 说说必须是 source/_data/essays.yml 的顶层数组');
  }
  if (!media || media.input !== 'source/images' || media.output !== '/images') {
    errors.push('.pages.yml: 图片必须从 source/images 上传并输出到 /images');
  }
  if (!cms.settings || !cms.settings.content || cms.settings.content.merge !== true) {
    errors.push('.pages.yml: settings.content.merge 必须开启，避免保存时丢 front matter');
  }
} catch (e) {
  errors.push(`.pages.yml: 解析失败 ${e.message}`);
}

errors.forEach(e => console.log('ERROR', e));
warnings.forEach(w => console.log('WARN ', w));
console.log(`\n${files.length} 篇文章,${errors.length} 个错误,${warnings.length} 个警告`);
process.exit(errors.length ? 1 : 0);
