/**
 * Archive heatmap — 归档页顶部的“写作足迹”热力图。
 *
 * 构建期输出内联 SVG：不引图表库、不跑运行时 JS，
 * 19 篇文章也只有十几 KB DOM。颜色用 CSS 变量，跟随明暗主题。
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

hexo.extend.filter.register('after_render:html', function (str, locals) {
  const page = locals && locals.page;
  if (!str || !page || !str.includes('<div class="archive-container')) return str;
  if (page.current && page.current !== 1) return str;

  const posts = hexo.locals.get('posts').toArray()
    .filter(post => post.published !== false && !post.draft);
  if (!posts.length) return str;

  const counts = new Map();
  let words = 0;
  for (const post of posts) {
    const key = dayKey(post.date);
    counts.set(key, (counts.get(key) || 0) + 1);
    words += textLength(post.content);
  }
  const activeDays = counts.size;

  const WEEKS = 28;
  const CELL = 12;
  const GAP = 4;
  const STEP = CELL + GAP;
  const LEFT = 24;
  const TOP = 18;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // 本周周一
  const monday = new Date(today);
  const dow = (monday.getDay() + 6) % 7; // 0 = Monday
  monday.setDate(monday.getDate() - dow);
  // 往前 WEEKS-1 周
  const start = new Date(monday);
  start.setDate(start.getDate() - (WEEKS - 1) * 7);

  const cells = [];
  const monthLabels = [];
  let lastMonth = -1;
  for (let w = 0; w < WEEKS; w++) {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + w * 7);
    const month = weekStart.getMonth();
    if (month !== lastMonth) {
      monthLabels.push(`<text class="wh-month" x="${LEFT + w * STEP}" y="10">${month + 1}月</text>`);
      lastMonth = month;
    }
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + d);
      if (date > today) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const count = counts.get(key) || 0;
      const level = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4;
      const x = LEFT + w * STEP;
      const y = TOP + d * STEP;
      const tip = count ? `${key} · ${count} 篇` : key;
      cells.push(`<rect class="wh-cell wh-l${level}" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2"><title>${escapeHtml(tip)}</title></rect>`);
    }
  }

  const wordLabel = words >= 10000
    ? `${(words / 10000).toFixed(1)} 万字`
    : `${words.toLocaleString('en-US')} 字`;
  const width = LEFT + WEEKS * STEP;
  const height = TOP + 7 * STEP;

  const heatmap = `<section class="writing-heatmap" aria-label="写作足迹">
  <div class="writing-heatmap-head">
    <div>
      <h2 class="writing-heatmap-title">写作足迹</h2>
      <p class="writing-heatmap-sub">过去 ${WEEKS} 周 · ${posts.length} 篇 · ${activeDays} 个写作日</p>
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
</section>`;

  return str.replace('<div class="archive-container', heatmap + '<div class="archive-container');
});
