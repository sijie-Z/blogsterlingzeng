/* 次级页面结构与语义：标签/分类排序、说说日期、站点视觉兜底、归档元数据 */
'use strict';

const puppeteer = require('puppeteer-core');
const { startServer } = require('./static-server');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.PORT || 4330);
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name, extra || ''); }
}

(async () => {
  const server = await startServer(PORT);
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: true,
    args: ['--no-sandbox', '--no-proxy-server', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 160)));

  console.log('=== 1. 标签页 ===');
  await page.goto(`${BASE}/tags/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(800);
  const tags = await page.evaluate(() => {
    const intro = document.querySelector('.taxonomy-intro');
    const cloud = document.querySelector('.tagcloud-content');
    const chips = [...document.querySelectorAll('.tag-list a')];
    const weights = chips.map(a => Number(a.dataset.weight));
    return {
      introBeforeCloud: !!(intro && cloud && (intro.compareDocumentPosition(cloud) & Node.DOCUMENT_POSITION_FOLLOWING)),
      sorted: weights.every((w, i) => i === 0 || weights[i - 1] >= w),
      blurred: chips.some(a => getComputedStyle(a).filter !== 'none'),
      count: chips.length,
      stats: document.querySelector('.taxonomy-stats')?.textContent || '',
      active: document.querySelectorAll('.tag-list a').length,
    };
  });
  check('标签页引导语在标签云之前', tags.introBeforeCloud);
  check('标签按文章数降序排列', tags.sorted && tags.count > 20, `count=${tags.count}`);
  check('标签胶囊不再按权重模糊', !tags.blurred);
  check('标签页显示文章与标签统计', /篇文章/.test(tags.stats) && /个标签/.test(tags.stats), tags.stats);

  console.log('=== 2. 分类页 ===');
  await page.goto(`${BASE}/categories/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(600);
  const cats = await page.evaluate(() => {
    const intro = document.querySelector('.taxonomy-intro');
    const list = document.querySelector('.all-category-list');
    const counts = [...document.querySelectorAll('.all-category-list-count')].map(el => Number(el.textContent.trim()));
    const items = [...document.querySelectorAll('.all-category-list-item')];
    return {
      introBeforeList: !!(intro && list && (intro.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING)),
      sorted: counts.every((n, i) => i === 0 || counts[i - 1] >= n),
      grid: list ? getComputedStyle(list).display : '',
      fullWidth: items.every(li => li.getBoundingClientRect().width > 300),
      stats: document.querySelector('.taxonomy-stats')?.textContent || '',
    };
  });
  check('分类页引导语在列表之前', cats.introBeforeList);
  check('分类按文章数降序排列', cats.sorted, JSON.stringify(cats));
  check('分类卡片两列铺满可用宽度', cats.grid === 'grid' && cats.fullWidth, JSON.stringify(cats));
  check('分类页显示文章与分类统计', /篇文章/.test(cats.stats) && /个分类/.test(cats.stats), cats.stats);

  console.log('=== 3. 说说页 ===');
  await page.goto(`${BASE}/shuoshuo/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(900);
  const essays = await page.evaluate(() => ({
    ids: document.querySelectorAll('#shuoshuo-content').length,
    loading: document.body.textContent.includes('Loading Date'),
    dates: [...document.querySelectorAll('.essay-date')].map(el => el.textContent.trim()),
  }));
  check('说说页 id 唯一', essays.ids === 1, String(essays.ids));
  check('说说页没有 Loading Date 占位符', !essays.loading);
  check('说说页日期已格式化', essays.dates.length > 0 && essays.dates.every(d =>
    /^\d{4}年\d{1,2}月\d{1,2}日$/.test(d) || /^\d{4}\/\d{2}\/\d{2}$/.test(d) || /^\d+\s*(天|小时|分钟)前$/.test(d)
  ), JSON.stringify(essays.dates.slice(0, 2)));
  const rawEssays = await fetch(`${BASE}/shuoshuo/`).then(r => r.text());
  check('说说页静态 HTML 已写入日期', !rawEssays.includes('Loading Date') && /\d{4}年\d{1,2}月\d{1,2}日/.test(rawEssays));

  console.log('=== 4. 站点视觉 ===');
  await page.goto(`${BASE}/photos/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1500);
  const photos = await page.evaluate(() => ({
    title: document.querySelector('h1')?.textContent.trim() || '',
    intro: !!document.querySelector('.photos-intro'),
    masonry: document.querySelectorAll('.masonry-item').length,
    staticFallback: (document.querySelector('noscript')?.textContent || '').match(/photos-static-item/g)?.length || 0,
  }));
  check('站点视觉标题正确', photos.title === '站点视觉', photos.title);
  check('站点视觉有导语', photos.intro);
  check('站点视觉画廊正常加载', photos.masonry === 6, String(photos.masonry));
  check('站点视觉有无脚本静态兜底', photos.staticFallback === 6, String(photos.staticFallback));
  const photosFooter = await page.evaluate(() => {
    const footer = document.querySelector('footer.footer');
    const info = footer?.querySelector('.info-container');
    return { hidden: footer?.classList.contains('footer-hidden'), opacity: info ? getComputedStyle(info).opacity : null };
  });
  check('短页面页脚保持可见', !photosFooter.hidden && photosFooter.opacity === '1', JSON.stringify(photosFooter));

  console.log('=== 5. 归档元数据与语义 ===');
  await page.goto(`${BASE}/archives/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(900);
  const archive = await page.evaluate(() => ({
    description: document.querySelector('meta[name="description"]')?.content || '',
    ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
    h3: document.querySelectorAll('.archive-row h3.article-title').length,
    rows: document.querySelectorAll('.archive-row').length,
    paginator: !!document.querySelector('.paginator'),
  }));
  check('归档 meta 描述是页面自己的', /归档/.test(archive.description), archive.description);
  check('归档 og:title 是页面标题', archive.ogTitle === '归档', archive.ogTitle);
  check('归档文章标题使用 h3', archive.h3 === archive.rows && archive.rows >= 20, JSON.stringify({ h3: archive.h3, rows: archive.rows }));
  check('归档没有多余分页器', !archive.paginator);

  console.log('=== 6. 其他页面语义 ===');
  await page.goto(`${BASE}/about/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(500);
  const about = await page.evaluate(() => [...document.querySelectorAll('hr')].some(hr => hr.nextElementSibling && hr.nextElementSibling.tagName === 'HR'));
  check('关于页没有连续分隔线', !about);

  await page.goto(`${BASE}/friends/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(500);
  const friendsH2 = await page.evaluate(() => [...document.querySelectorAll('main h2')].some(h => h.textContent.trim() === '申请友链'));
  check('友链申请是 h2', friendsH2);

  await page.goto(`${BASE}/series/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(700);
  const seriesHeadings = await page.evaluate(() => [...document.querySelectorAll('.series-index-name')].map(el => el.tagName));
  check('系列名称使用 h2', seriesHeadings.length > 0 && seriesHeadings.every(tag => tag === 'H2'), JSON.stringify(seriesHeadings));

  const sideTool = await page.evaluate(() => {
    const el = document.querySelector('.tool-scroll-to-top');
    return { role: el?.getAttribute('role'), tab: el?.getAttribute('tabindex'), label: el?.getAttribute('aria-label') };
  });
  check('回到顶部有可访问名称与键盘入口', sideTool.role === 'button' && sideTool.tab === '0' && /回到顶部/.test(sideTool.label || ''), JSON.stringify(sideTool));

  console.log('=== 7. 移动端浮动控件 ===');
  const mobile = await browser.newPage();
  await mobile.setViewport({ width: 390, height: 844 });
  await mobile.goto(`${BASE}/2026/10/24/reading-experience-as-features/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1600);
  const floating = () => mobile.evaluate(() => {
    const toggle = document.getElementById('read-toggle');
    const rail = document.querySelector('.right-side-tools-container');
    return {
      down: document.documentElement.classList.contains('cj-scroll-down'),
      toggle: toggle ? getComputedStyle(toggle).opacity : null,
      pointer: toggle ? getComputedStyle(toggle).pointerEvents : null,
      rail: rail ? getComputedStyle(rail).opacity : null,
    };
  });
  const f1 = await floating();
  check('移动端浮动按钮初始可见', f1.toggle === '1', JSON.stringify(f1));
  await mobile.evaluate(() => window.scrollTo(0, 900));
  await sleep(800);
  const f2 = await floating();
  check('向下阅读浮动按钮收起', f2.down && f2.toggle === '0' && f2.pointer === 'none', JSON.stringify(f2));
  await mobile.evaluate(() => window.scrollTo(0, 600));
  await sleep(800);
  const f3 = await floating();
  check('向上滚动浮动按钮恢复', !f3.down && f3.toggle === '1', JSON.stringify(f3));
  await mobile.close();

  check('零页面错误', errors.length === 0, errors.slice(0, 2).join(' | '));

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  await browser.close();
  server.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('崩溃:', e); process.exit(1); });
