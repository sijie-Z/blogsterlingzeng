/**
 * OG image generator — 生成 1200×630 的分享卡片。
 *
 * 这是开发期工具,不进 CI:`npm run og:images` 在本地用 Chrome 渲染,
 * 产物提交到 source/images/og/。标题/系列改名后重新跑一次即可。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const puppeteer = require('puppeteer-core');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'source', 'images', 'og');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SITE = 'sterlingzeng.cn · 技术博客';

function parseFrontMatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  try { return yaml.load(match[1]) || {}; } catch (e) { return {}; }
}

function dataUri(file) {
  if (!file || !fs.existsSync(file)) return '';
  const ext = path.extname(file).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function titleSize(title) {
  const length = [...String(title)].length;
  if (length <= 16) return 66;
  if (length <= 24) return 58;
  if (length <= 34) return 50;
  return 44;
}

function template({ title, kicker, meta, cover, avatar, accent = '#60a5fa' }) {
  const coverStyle = cover ? `background-image:url('${cover}')` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{width:1200px;height:630px;overflow:hidden;background:#070b14}
    body{font-family:"Microsoft YaHei","PingFang SC","Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
    .card{position:relative;width:1200px;height:630px;overflow:hidden;background:
      radial-gradient(900px 520px at 78% 18%, rgba(37,99,235,.38), transparent 62%),
      radial-gradient(700px 420px at 8% 92%, rgba(14,165,233,.20), transparent 60%),
      linear-gradient(135deg,#070b14 0%,#0d1626 55%,#111d31 100%)}
    .cover{position:absolute;inset:0;background-position:center;background-size:cover;opacity:.22;filter:saturate(.85)}
    .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(148,163,184,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.07) 1px,transparent 1px);background-size:44px 44px;mask-image:linear-gradient(180deg,rgba(0,0,0,.9),transparent 78%)}
    .scrim{position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,11,20,.94) 0%,rgba(7,11,20,.72) 55%,rgba(7,11,20,.30) 100%)}
    .content{position:absolute;left:76px;top:74px;right:300px;color:#f8fafc}
    .kicker{display:flex;align-items:center;gap:12px;font-size:19px;letter-spacing:.14em;text-transform:uppercase;color:${accent};font-weight:600}
    .kicker::before{content:"";width:34px;height:3px;border-radius:2px;background:${accent};display:inline-block}
    h1{margin-top:26px;font-size:${titleSize(title)}px;line-height:1.22;font-weight:700;letter-spacing:-.015em;max-height:3.7em;overflow:hidden}
    .meta{margin-top:28px;font-size:20px;line-height:1.5;color:#94a3b8;display:flex;flex-wrap:wrap;gap:8px 16px}
    .meta b{color:#cbd5e1;font-weight:500}
    .brand{position:absolute;right:74px;bottom:62px;display:flex;align-items:center;gap:14px;color:#cbd5e1}
    .avatar{width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid rgba(148,163,184,.45)}
    .brand-name{font-size:19px;font-weight:600;color:#e2e8f0}
    .brand-sub{font-size:13px;color:#7c8ba1;margin-top:3px;letter-spacing:.04em}
    .foot{position:absolute;left:76px;bottom:64px;font-size:16px;color:#64748b;letter-spacing:.08em}
  </style></head><body>
    <div class="card">
      <div class="cover" style="${coverStyle}"></div>
      <div class="grid"></div>
      <div class="scrim"></div>
      <div class="content">
        <div class="kicker">${esc(kicker || SITE)}</div>
        <h1>${esc(title)}</h1>
        <div class="meta">${meta || ''}</div>
      </div>
      <div class="foot">把过程写清楚 · Keep Rolling, Keep Coding</div>
      <div class="brand">
        ${avatar ? `<img class="avatar" src="${avatar}" alt="">` : ''}
        <div><div class="brand-name">Sterling Zeng</div><div class="brand-sub">前端 / 全栈 / AI 应用工程</div></div>
      </div>
    </div>
  </body></html>`;
}

function listPosts() {
  const dir = path.join(ROOT, 'source', '_posts');
  return fs.readdirSync(dir).filter(file => file.endsWith('.md')).map(file => {
    const data = parseFrontMatter(path.join(dir, file));
    return { slug: path.basename(file, '.md'), ...data };
  });
}

function seriesList() {
  const file = path.join(ROOT, 'source', '_data', 'series.yml');
  if (!fs.existsSync(file)) return [];
  try { return Object.entries(yaml.load(fs.readFileSync(file, 'utf8')) || {}); } catch (e) { return []; }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const avatar = dataUri(path.join(ROOT, 'source', 'images', 'avatar.jpg'));
  const fallbackCover = dataUri(path.join(ROOT, 'source', 'images', 'banner-light.webp'));
  const posts = listPosts();
  const series = seriesList();
  const seriesCounts = new Map();
  for (const post of posts) {
    if (post.series) seriesCounts.set(post.series, (seriesCounts.get(post.series) || 0) + 1);
  }

  const jobs = [];
  for (const post of posts) {
    const cover = post.cover ? dataUri(path.join(ROOT, 'source', String(post.cover).replace(/^\//, ''))) : fallbackCover;
    const tags = Array.isArray(post.tags) ? post.tags.slice(0, 3).join(' · ') : '';
    const date = post.date instanceof Date
      ? post.date.toISOString().slice(0, 10)
      : String(post.date || '').slice(0, 10);
    const meta = `<b>${esc(Array.isArray(post.categories) ? post.categories[0] : post.categories || '文章')}</b><span>${esc(tags)}</span><span>${esc(date)}</span>`;
    jobs.push({ name: `${post.slug}.jpg`, html: template({ title: post.title || post.slug, kicker: SITE, meta, cover, avatar }) });
  }
  for (const [slug, info] of series) {
    const count = seriesCounts.get(slug) || 0;
    jobs.push({
      name: `series-${slug}.jpg`,
      html: template({
        title: info.name || slug,
        kicker: '系列阅读',
        meta: `<b>${count} 篇</b><span>${esc(info.description || '')}</span>`,
        cover: fallbackCover,
        avatar,
        accent: '#22d3ee',
      }),
    });
  }
  jobs.push({
    name: 'page-projects.jpg',
    html: template({ title: '项目案例：问题、取舍与证据', kicker: SITE, meta: '<b>MiQroGate</b><span>quant_platform</span><span>DocMind</span>', cover: fallbackCover, avatar }),
  });
  jobs.push({
    name: 'page-about.jpg',
    html: template({ title: '关于我：用代码解决问题', kicker: SITE, meta: '<b>前端 / 全栈 / AI 应用工程</b><span>地信（GIS）· 大四</span>', cover: fallbackCover, avatar }),
  });
  jobs.push({
    name: 'page-resume.jpg',
    html: template({ title: 'Sterling Zeng · 简历', kicker: 'RESUME', meta: '<b>项目经历</b><span>技术栈</span><span>写作与开源</span>', cover: fallbackCover, avatar }),
  });
  jobs.push({
    name: 'page-series.jpg',
    html: template({ title: '系列文章：顺着一条线读完', kicker: '系列阅读', meta: '<b>博客工程化</b><span>Agent 与 RAG 实战</span>', cover: fallbackCover, avatar, accent: '#22d3ee' }),
  });
  jobs.push({
    name: 'home.jpg',
    html: template({ title: "Sterling's Space", kicker: 'KEEP ROLLING, KEEP CODING', meta: '<b>技术笔记</b><span>项目复盘</span><span>性能与工程</span>', cover: fallbackCover, avatar }),
  });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--no-proxy-server', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  for (const job of jobs) {
    await page.setContent(job.html, { waitUntil: 'load' });
    await page.screenshot({ path: path.join(OUT, job.name), type: 'jpeg', quality: 84 });
  }
  await browser.close();
  console.log(`[og] generated ${jobs.length} images in ${path.relative(ROOT, OUT)}`);
}

main().catch(err => { console.error(err); process.exit(1); });
