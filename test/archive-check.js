/* 归档页写作足迹：热力图存在、有文章格子、移动端不撑破 */
'use strict';

const puppeteer = require('puppeteer-core');
const { startServer } = require('./static-server');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.PORT || 4221);
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

  await page.goto(`${BASE}/archives/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1500);
  const state = await page.evaluate(() => ({
    card: !!document.querySelector('.writing-heatmap'),
    cells: document.querySelectorAll('.wh-cell').length,
    active: document.querySelectorAll('.wh-l1, .wh-l2, .wh-l3, .wh-l4').length,
    months: document.querySelectorAll('.wh-month').length,
    stats: document.querySelector('.writing-heatmap-stats')?.textContent || '',
    archiveList: !!document.querySelector('.archive-container'),
    posts: document.querySelectorAll('.article-title').length,
    firstTitle: document.querySelector('.article-title')?.textContent.trim() || '',
    paginator: !!document.querySelector('.paginator'),
    likeButtons: document.querySelectorAll('.like-btn').length,
    overflow: document.documentElement.scrollWidth - innerWidth,
  }));
  check('写作足迹卡片存在', state.card);
  check('热力图格子已生成', state.cells >= 100, String(state.cells));
  check('有文章日期的高亮格', state.active >= 5, String(state.active));
  check('月份标签已生成', state.months >= 5, String(state.months));
  check('累计输出统计存在', /万字|字/.test(state.stats), state.stats);
  check('原归档列表仍在', state.archiveList);
  check('归档首页有分页', state.posts > 0 && state.posts <= 10 && state.paginator, JSON.stringify({ posts: state.posts, paginator: state.paginator }));
  check('归档条目没有错误插入点赞按钮', state.likeButtons === 0, String(state.likeButtons));
  check('桌面无横向溢出', state.overflow <= 2, String(state.overflow));

  const pagerPage = await browser.newPage();
  await pagerPage.setViewport({ width: 1440, height: 1000 });
  await pagerPage.goto(`${BASE}/archives/page/2/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(600);
  const pagerState = await pagerPage.evaluate(() => ({
    posts: document.querySelectorAll('.article-title').length,
    firstTitle: document.querySelector('.article-title')?.textContent.trim() || '',
    paginator: !!document.querySelector('.paginator'),
  }));
  check('归档第 2 页与首页不同', pagerState.posts > 0 && pagerState.firstTitle !== state.firstTitle && pagerState.paginator, JSON.stringify(pagerState));
  await pagerPage.close();

  const monthPage = await browser.newPage();
  await monthPage.setViewport({ width: 1440, height: 1000 });
  await monthPage.goto(`${BASE}/archives/2026/10/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(600);
  const monthState = await monthPage.evaluate(() => ({
    posts: document.querySelectorAll('.article-title').length,
  }));
  check('月归档只列当月文章', monthState.posts > 0 && monthState.posts < state.posts, JSON.stringify(monthState));
  await monthPage.close();

  const yearPage = await browser.newPage();
  await yearPage.setViewport({ width: 1440, height: 1000 });
  await yearPage.goto(`${BASE}/archives/2026/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(800);
  const yearState = await yearPage.evaluate(() => ({
    heatmap: !!document.querySelector('.writing-heatmap'),
    list: !!document.querySelector('.archive-container'),
  }));
  check('年归档页不重复注入全局热力图', !yearState.heatmap && yearState.list, JSON.stringify(yearState));
  await yearPage.close();

  const mobile = await browser.newPage();
  await mobile.setViewport({ width: 390, height: 844 });
  const mErrors = [];
  mobile.on('pageerror', e => mErrors.push(String(e.message || e).slice(0, 120)));
  await mobile.goto(`${BASE}/archives/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1200);
  const m = await mobile.evaluate(() => {
    const card = document.querySelector('.writing-heatmap');
    return {
      card: !!card,
      visible: card ? card.getBoundingClientRect().width > 0 : false,
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  check('移动端热力图可见', m.card && m.visible, JSON.stringify(m));
  check('移动端无横向溢出', m.overflow <= 2, String(m.overflow));
  check('移动端零错误', mErrors.length === 0, mErrors.slice(0, 2).join(' | '));
  await mobile.close();

  check('零页面错误', errors.length === 0, errors.slice(0, 2).join(' | '));

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  await browser.close();
  server.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('崩溃:', e); process.exit(1); });
