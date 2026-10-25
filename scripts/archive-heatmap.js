/**
 * Archive page — 归档页的页头、写作足迹热力图与条目元信息。
 *
 * 全部在构建期输出：不引图表库、不跑运行时 JS。
 * 页头统计（篇数 / 字数 / 写作日 / 系列数）和每条文章的
 * 分类、预计阅读时间都来自同一份 posts 数据，避免前端再算一遍。
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

function dayKey(date) {
  return date.format('YYYY-MM-DD');
}

function textLength(html) {
  const text = String(html || '').replace(/<[^>]+>/g, ' ');
  const cjk = (text.match(/[一-鿿]/g) || []).length;
  const latin = text.replace(/[一-鿿]/g, ' ').split(/\s+/).filter(Boolean).length;
  return cjk + latin;
}

function readingMinutes(html) {
  const text = String(html || '')
    .replace(/<pre[\s\S]*?<\/pre>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  const cjk = (text.match(/[一-鿿]/g) || []).length;
  const latin = text.replace(/[一-鿿]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round((cjk + latin * 1.5) / 300));
}

function rangeLabel(first, last) {
  const fy = first.year();
  const ly = last.year();
  if (fy === ly) {
    if (first.month() === last.month()) return `${fy} 年 ${first.month() + 1} 月`;
    return `${fy} 年 ${first.month() + 1} 月到 ${last.month() + 1} 月`;
  }
  return `${fy} 年 ${first.month() + 1} 月到 ${ly} 年 ${last.month() + 1} 月`;
}

hexo.extend.filter.register('after_render:html', function (str, locals) {
  const page = locals && locals.page;
  if (!str || !page || !str.includes('<div class="archive-container')) return str;
  // 年/月归档页只列局部文章，不要注入全局热力图和页头
  if (page.year || page.month) return str;
  if (page.current && page.current !== 1) return str;
  if (str.includes('cj-archive-main')) return str;

  const posts = hexo.locals.get('posts').toArray()
    .filter(post => post.published !== false && !post.draft);
  if (!posts.length) return str;

  const counts = new Map();
  const byUrl = new Map();
  const seriesSlugs = new Set();
  const tagNames = new Set();
  const catNames = new Set();
  let words = 0;

  for (const post of posts) {
    const key = dayKey(post.date);
    counts.set(key, (counts.get(key) || 0) + 1);
    words += textLength(post.content);

    const url = '/' + String(post.path || '').replace(/^\/+/, '');
    byUrl.set(url, post);
    byUrl.set(url.replace(/index\.html$/, ''), post);

    const series = String(post.series || '').split(',')[0].trim();
    if (series) seriesSlugs.add(series);

    const tags = post.tags && post.tags.toArray ? post.tags.toArray() : [];
    for (const tag of tags) tagNames.add(tag.name);

    const cats = post.categories && post.categories.toArray ? post.categories.toArray() : [];
    if (cats.length) catNames.add(cats[0].name);
  }

  const activeDays = counts.size;
  const sorted = posts.slice().sort((a, b) => a.date - b.date);
  const range = rangeLabel(sorted[0].date, sorted[sorted.length - 1].date);

  const wordMain = words >= 10000
    ? (words / 10000).toFixed(1)
    : Math.round(words).toLocaleString('en-US');
  const wordUnit = words >= 10000 ? '<small>万</small>' : '';
  const wordLabel = words >= 10000
    ? `${(words / 10000).toFixed(1)} 万字`
    : `${Math.round(words).toLocaleString('en-US')} 字`;

  const hero = `<header class="archive-hero">
  <div class="archive-hero-top">
    <div class="archive-hero-main">
      <p class="archive-eyebrow">Archive · 写作归档</p>
      <h1 class="archive-hero-title">归档</h1>
      <p class="archive-hero-desc">从 ${escapeHtml(range)}，共 ${posts.length} 篇文章，按时间倒序排列。想按主题读，可以从系列、标签或分类进入。</p>
    </div>
    <ul class="archive-hero-stats" aria-label="写作统计">
      <li><strong>${posts.length}</strong><span>篇文章</span></li>
      <li><strong>${wordMain}${wordUnit}</strong><span>累计字数</span></li>
      <li><strong>${activeDays}</strong><span>个写作日</span></li>
      <li><strong>${seriesSlugs.size}</strong><span>个系列</span></li>
    </ul>
  </div>
  <nav class="archive-hero-links" aria-label="其他浏览方式">
    <a class="archive-hero-link" href="/series/">
      <span class="archive-hero-link-text"><span class="archive-hero-link-name">系列阅读</span><span class="archive-hero-link-meta">${seriesSlugs.size} 个系列 · 按顺序读</span></span>
      <span class="archive-hero-link-arrow" aria-hidden="true">→</span>
    </a>
    <a class="archive-hero-link" href="/tags/">
      <span class="archive-hero-link-text"><span class="archive-hero-link-name">标签</span><span class="archive-hero-link-meta">${tagNames.size} 个标签 · 按关键词</span></span>
      <span class="archive-hero-link-arrow" aria-hidden="true">→</span>
    </a>
    <a class="archive-hero-link" href="/categories/">
      <span class="archive-hero-link-text"><span class="archive-hero-link-name">分类</span><span class="archive-hero-link-meta">${catNames.size} 个分类 · 按领域</span></span>
      <span class="archive-hero-link-arrow" aria-hidden="true">→</span>
    </a>
  </nav>
</header>`;

  const WEEKS = 28;
  const CELL = 12;
  const GAP = 4;
  const STEP = CELL + GAP;
  const LEFT = 24;
  const TOP = 18;

  // 用站点时区生成网格,避免 GitHub Actions(UTC)在凌晨构建时
  // 与文章日期的 Asia/Shanghai 口径差一天。
  const moment = require('moment-timezone');
  const tz = hexo.config.timezone || 'Asia/Shanghai';
  const today = moment.tz(tz).startOf('day');
  const monday = today.clone().startOf('isoWeek');
  const start = monday.clone().subtract(WEEKS - 1, 'weeks');

  const cells = [];
  const monthLabels = [];
  let lastMonth = -1;
  for (let w = 0; w < WEEKS; w++) {
    const weekStart = start.clone().add(w, 'weeks');
    const month = weekStart.month();
    if (month !== lastMonth) {
      monthLabels.push(`<text class="wh-month" x="${LEFT + w * STEP}" y="10">${month + 1}月</text>`);
      lastMonth = month;
    }
    for (let d = 0; d < 7; d++) {
      const date = weekStart.clone().add(d, 'days');
      if (date.isAfter(today)) continue;
      const key = date.format('YYYY-MM-DD');
      const count = counts.get(key) || 0;
      const level = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4;
      const x = LEFT + w * STEP;
      const y = TOP + d * STEP;
      const tip = count ? `${key} · ${count} 篇` : key;
      cells.push(`<rect class="wh-cell wh-l${level}" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2"><title>${escapeHtml(tip)}</title></rect>`);
    }
  }

  const width = LEFT + WEEKS * STEP;
  const height = TOP + 7 * STEP;

  const heatmap = `<section class="writing-heatmap" aria-label="写作足迹">
  <div class="writing-heatmap-head">
    <div>
      <h2 class="writing-heatmap-title">写作足迹</h2>
      <p class="writing-heatmap-sub">过去 ${WEEKS} 周 · ${activeDays} 个写作日</p>
    </div>
    <div class="writing-heatmap-stats"><strong>${wordLabel}</strong><span>累计输出</span></div>
  </div>
  <div class="writing-heatmap-scroll">
    <svg class="writing-heatmap-svg" viewBox="0 0 ${width} ${height + 16}" width="${width}" height="${height + 16}" role="img" aria-label="过去 ${WEEKS} 周的写作热力图">
      ${monthLabels.join('')}
      ${cells.join('')}
      <text class="wh-day" x="10" y="${TOP + CELL + 1}">一</text>
      <text class="wh-day" x="10" y="${TOP + STEP * 3 + CELL + 1}">三</text>
      <text class="wh-day" x="10" y="${TOP + STEP * 5 + CELL + 1}">五</text>
      <g class="wh-legend" transform="translate(${width - 82}, ${height + 6})">
        <text x="0" y="9">少</text>
        <rect class="wh-cell wh-l0" x="14" y="0" width="8" height="8" rx="2"/>
        <rect class="wh-cell wh-l1" x="26" y="0" width="8" height="8" rx="2"/>
        <rect class="wh-cell wh-l2" x="38" y="0" width="8" height="8" rx="2"/>
        <rect class="wh-cell wh-l3" x="50" y="0" width="8" height="8" rx="2"/>
        <rect class="wh-cell wh-l4" x="62" y="0" width="8" height="8" rx="2"/>
        <text x="74" y="9">多</text>
      </g>
    </svg>
  </div>
  <p class="writing-heatmap-foot">每格是一天，颜色越深表示当天写得越多；窄屏可左右滑动查看。</p>
</section>`;

  // 年份标题从 span 提升为 h2,让归档列表有正确的标题层级
  str = str.replace(/<span class="archive-year ([^"]*)">(\d{4})<\/span>/g,
    '<h2 class="archive-year $1">$2</h2>');

  // 每条文章补上分类与预计阅读时间,把条目从“只有标题”变成可扫读的索引
  str = str.replace(
    /<a href="([^"]+)" class="block w-fit">(\s*)<span class="article-title([^"]*)">([\s\S]*?)<\/span>(\s*)<\/a>/g,
    (match, href, gap, titleClass, title) => {
      const post = byUrl.get(href);
      if (!post) return match;
      const cats = post.categories && post.categories.toArray ? post.categories.toArray() : [];
      const cat = cats.length ? cats[0].name : '';
      const minutes = readingMinutes(post.content);
      return `<a href="${href}" class="archive-row">` +
        `<h3 class="article-title${titleClass}">${title}</h3>` +
        `<span class="archive-row-meta">` +
        (cat ? `<span class="archive-row-cat">${escapeHtml(cat)}</span>` : '') +
        `<span class="archive-row-time">${minutes} 分钟</span>` +
        `</span></a>`;
    }
  );

  // 只替换主归档页的 sr-only 标题,页头里已经有一个可见的 h1
  str = str.replace(/<h1 class="sr-only">归档<\/h1>\s*/, '');

  // 单页归档不再需要分页器
  if (!page.total || page.total <= 1) {
    str = str.replace(/<div class="paginator">[\s\S]*?<\/div>\s*/, '');
  }

  // 归档页原本继承站点级 og:title 和描述,这里改成页面自己的
  const description = `归档：${posts.length} 篇文章，从 ${range}，按时间倒序排列。`;
  const meta = [
    [/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(description)}">`],
    [/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeHtml(description)}">`],
    [/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escapeHtml(description)}">`],
    [/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="归档">'],
    [/<meta name="twitter:title" content="[^"]*">/, '<meta name="twitter:title" content="归档">'],
  ];
  for (const [pattern, html] of meta) str = str.replace(pattern, () => html);

  str = str.replace(/<main class="main-content"/, '<main class="main-content cj-archive-main"');
  str = str.replace(/(<main\b[^>]*>)/, m => m + hero + heatmap);

  return str;
});
