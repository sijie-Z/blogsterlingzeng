/* 系列导航:系列页 / 徽章 / 文末卡 / 当前项 / SPA / 移动端 */
'use strict';

const puppeteer = require('puppeteer-core');
const { startServer } = require('./static-server');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.PORT || 4230);
const BASE = `http://127.0.0.1:${PORT}`;
const SERIES_INDEX = '/series/';
const SERIES = '/series/blog-engineering/';
const ARTICLE = '/2026/10/22/font-subset-and-cls/';
const PREV = '/2026/10/21/live2d-cubism5-migration/';
const PLAIN = '/2026/04/22/docker-getting-started/';
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
  await page.evaluateOnNewDocument(() => localStorage.setItem('waifu-disabled', 'true'));
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 160)));
  page.on('response', r => {
    if (r.status() === 404 && r.url().startsWith(BASE) && !r.url().endsWith('/null')) {
      errors.push('404 ' + r.url().slice(0, 160));
    }
  });

  console.log('=== 1. 系列总览 ===');
  await page.goto(BASE + SERIES_INDEX, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(900);
  const index = await page.evaluate(() => ({
    title: document.querySelector('.page-template-content h1')?.textContent.trim() || '',
    cards: [...document.querySelectorAll('.series-index-card')].map(a => ({
      href: a.getAttribute('href'),
      name: a.querySelector('.series-index-name')?.textContent.trim() || '',
      meta: a.querySelector('.series-index-meta')?.textContent.trim() || '',
    })),
    overflow: document.documentElement.scrollWidth - innerWidth,
  }));
  check('系列总览可访问', index.title === '系列文章', index.title);
  check('四个系列卡', index.cards.length === 4, JSON.stringify(index.cards));
  check('系列卡链接正确', index.cards.some(c => c.href === SERIES), JSON.stringify(index.cards));
  check('系列卡显示篇数', index.cards.every(c => /篇/.test(c.meta)), JSON.stringify(index.cards));
  check('总览无横向溢出', index.overflow <= 2, String(index.overflow));

  console.log('=== 2. 系列页 ===');
  await page.goto(BASE + SERIES, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(700);
  const series = await page.evaluate(() => ({
    h1: document.querySelector('.page-template-content h1')?.textContent.trim() || '',
    desc: document.querySelector('.series-page-desc')?.textContent.trim() || '',
    items: [...document.querySelectorAll('.series-item')].map(li => ({
      idx: li.querySelector('.series-item-idx')?.textContent.trim(),
      title: li.querySelector('.series-item-title')?.textContent.trim(),
      href: li.querySelector('a')?.getAttribute('href'),
      meta: li.querySelector('.series-item-meta')?.textContent.trim(),
    })),
    meta: document.querySelector('.series-page-meta')?.textContent.trim() || '',
    back: document.querySelector('.series-back')?.getAttribute('href'),
    overflow: document.documentElement.scrollWidth - innerWidth,
  }));
  check('系列页标题', series.h1 === '博客工程化', series.h1);
  check('系列简介非空', series.desc.length > 8, series.desc);
  check('系列页 7 篇', series.items.length === 7, String(series.items.length));
  check('顺序按 series_order', series.items.map(i => i.idx).join(',') === '01,02,03,04,05,06,07', JSON.stringify(series.items.map(i => i.idx)));
  check('第一项是建站文章', series.items[0]?.href === '/2026/05/08/hexo-blog-setup-guide/', JSON.stringify(series.items[0]));
  check('系列页显示日期分类', series.items.every(i => /2026-\d\d-\d\d/.test(i.meta)), JSON.stringify(series.items.map(i => i.meta)));
  check('返回全部系列', series.back === '/series/', series.back);
  check('系列页无横向溢出', series.overflow <= 2, String(series.overflow));
  check('系列页显示预估阅读时间', /约 \d+ 分钟/.test(series.meta), series.meta);
  const feed = await page.evaluate(async () => {
    const res = await fetch('/series/blog-engineering/atom.xml');
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    return {
      status: res.status,
      entries: doc.querySelectorAll('entry').length,
      error: doc.querySelector('parsererror')?.textContent.slice(0, 80) || '',
      self: doc.querySelector('link[rel="self"]')?.getAttribute('href') || '',
      head: !!document.querySelector('link[data-series-feed]'),
    };
  });
  check('系列 Atom 可访问且合法', feed.status === 200 && !feed.error, JSON.stringify(feed));
  check('系列 Atom 含 7 篇文章', feed.entries === 7, String(feed.entries));
  check('系列页声明 Atom feed', feed.head && feed.self.includes('/series/blog-engineering/atom.xml'), JSON.stringify(feed));

  console.log('=== 2.5 归档页系列入口 ===');
  await page.goto(BASE + '/archives/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(700);
  const archiveSeries = await page.evaluate(() => ({
    section: !!document.querySelector('.archive-series'),
    cards: [...document.querySelectorAll('.archive-series-card')].map(a => ({
      href: a.getAttribute('href'),
      text: a.textContent.replace(/\s+/g, ' ').trim(),
    })),
    overflow: document.documentElement.scrollWidth - innerWidth,
  }));
  check('归档页有系列入口', archiveSeries.section && archiveSeries.cards.length === 4, JSON.stringify(archiveSeries.cards));
  check('归档系列卡链接正确', archiveSeries.cards.some(c => c.href === SERIES), JSON.stringify(archiveSeries.cards));
  check('归档系列卡显示篇数/时长', archiveSeries.cards.every(c => /篇\s*[·・]\s*约\s*\d+\s*分钟/.test(c.text)), JSON.stringify(archiveSeries.cards));
  check('归档页无横向溢出', archiveSeries.overflow <= 2, String(archiveSeries.overflow));
  await page.goto(BASE + '/archives/2026/10/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(400);
  const monthSeries = await page.evaluate(() => document.querySelectorAll('.archive-series').length);
  check('月归档不重复系列块', monthSeries === 0, String(monthSeries));
  await page.goto(BASE + '/archives/page/2/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(400);
  const pageSeries = await page.evaluate(() => document.querySelectorAll('.archive-series').length);
  check('分页归档不重复系列块', pageSeries === 0, String(pageSeries));

  console.log('=== 3. 文章内徽章与系列卡 ===');
  await page.goto(BASE + ARTICLE, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1600);
  const article = await page.evaluate(() => {
    const badge = document.querySelector('.post-series-badge');
    const card = document.querySelector('.post-series-card');
    const content = document.querySelector('.article-content');
    const related = document.querySelector('.related-posts');
    return {
      badge: !!badge,
      badgeCount: badge?.querySelector('.post-series-count')?.textContent.trim() || '',
      badgeHref: badge?.querySelector('.post-series-name')?.getAttribute('href') || '',
      badgeBeforeContent: !!(badge && content && badge.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING),
      card: !!card,
      cardCount: card?.querySelector('.post-series-count')?.textContent.trim() || '',
      current: card?.querySelector('.post-series-list li.is-current')?.textContent.replace(/\s+/g, ' ').trim() || '',
      currentAria: card?.querySelector('.post-series-list li.is-current')?.getAttribute('aria-current') || '',
      listCount: card?.querySelectorAll('.post-series-list li').length || 0,
      prevHref: card?.querySelector('.post-series-prev')?.getAttribute('href') || '',
      prevRel: card?.querySelector('.post-series-prev')?.getAttribute('rel') || '',
      nextHref: card?.querySelector('.post-series-next')?.getAttribute('href') || '',
      nextTag: card?.querySelector('.post-series-next')?.tagName || '',
      nextText: card?.querySelector('.post-series-next')?.textContent.replace(/\s+/g, ' ').trim() || '',
      details: !!card?.querySelector('details'),
      progress: card?.querySelector('.post-series-progress > span')?.style.width || '',
      seriesBeforeRelated: !!(related && card && card.compareDocumentPosition(related) & Node.DOCUMENT_POSITION_FOLLOWING),
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  check('文章有系列徽章', article.badge, JSON.stringify(article));
  check('徽章显示第 3/7 篇', article.badgeCount === '第 3 篇 / 共 7 篇', article.badgeCount);
  check('徽章链接到系列页', article.badgeHref === SERIES, article.badgeHref);
  check('徽章在正文之前', article.badgeBeforeContent);
  check('文章有系列卡', article.card);
  check('系列卡进度 43%', article.cardCount.includes('43%'), article.cardCount);
  check('当前项已标记', article.current.includes('当前') && article.currentAria === 'page', JSON.stringify(article.current));
  check('系列列表 7 项', article.listCount === 7, String(article.listCount));
  check('上一篇指向 Live2D 文章', article.prevHref === PREV && article.prevRel === 'prev', JSON.stringify({ href: article.prevHref, rel: article.prevRel }));
  check('下一篇指向系列第 4 篇（资源交付）', article.nextTag === 'A' && article.nextHref === '/2026/10/23/responsive-banner-live2d-texture/', JSON.stringify({ tag: article.nextTag, href: article.nextHref }));
  check('原生 details 折叠', article.details);
  check('进度条 43%', article.progress === '43%', article.progress);
  check('系列卡在相关阅读之前', article.seriesBeforeRelated, JSON.stringify({ related: article.seriesBeforeRelated }));
  check('文章无横向溢出', article.overflow <= 2, String(article.overflow));

  console.log('=== 4. SPA 跳转 ===');
  const seriesLink = await page.$('.post-series-name');
  await seriesLink.click();
  await page.waitForFunction(() => location.pathname === '/series/blog-engineering/' && !!document.querySelector('.series-page'), { timeout: 10000 }).catch(() => {});
  await sleep(250);
  const spa = await page.evaluate(() => ({
    path: location.pathname,
    h1: document.querySelector('.page-template-content h1')?.textContent.trim() || '',
    items: document.querySelectorAll('.series-item').length,
    overflow: document.documentElement.scrollWidth - innerWidth,
  }));
  check('SPA 进入系列页', spa.path === '/series/blog-engineering/' && spa.h1 === '博客工程化', JSON.stringify(spa));
  check('SPA 后系列列表存在', spa.items === 7, String(spa.items));
  check('SPA 后无横向溢出', spa.overflow <= 2, String(spa.overflow));
  await page.goBack().catch(() => {});
  await page.waitForFunction(() => location.pathname === '/2026/10/22/font-subset-and-cls/' && !!document.querySelector('.post-series-badge'), { timeout: 10000 }).catch(() => {});
  await sleep(250);
  const back = await page.evaluate(() => ({
    path: location.pathname,
    badge: document.querySelector('.post-series-badge')?.textContent.includes('第 3 篇') || false,
  }));
  check('后退回到文章且徽章恢复', back.path === ARTICLE && back.badge, JSON.stringify(back));

  await page.evaluate(() => { const d = document.querySelector('.post-series-details'); if (d) d.open = true; });
  await sleep(200);
  const firstItem = await page.$('.post-series-list li:not(.is-current) .post-series-item-title');
  if (firstItem) {
    await firstItem.click();
    await page.waitForFunction(() => location.pathname.includes('hexo-blog-setup-guide') && !!document.querySelector('.post-series-badge'), { timeout: 10000 }).catch(() => {});
    await sleep(250);
    const first = await page.evaluate(() => ({
      count: document.querySelector('.post-series-badge .post-series-count')?.textContent.trim() || '',
      prev: document.querySelector('.post-series-prev')?.tagName || '',
      prevText: document.querySelector('.post-series-prev')?.textContent.replace(/\s+/g, ' ').trim() || '',
    }));
    check('系列首篇显示第 1 篇', first.count === '第 1 篇 / 共 7 篇', first.count);
    check('系列首篇上一篇禁用', first.prev === 'SPAN' && first.prevText.includes('已是第一篇'), JSON.stringify(first));
  } else {
    check('系列列表可点击', false, '未找到列表链接');
  }

  console.log('=== 5. 普通文章不受影响 ===');
  await page.goto(BASE + PLAIN, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(900);
  const plain = await page.evaluate(() => ({
    badge: !!document.querySelector('.post-series-badge'),
    card: !!document.querySelector('.post-series-card'),
    related: !!document.querySelector('.related-posts'),
  }));
  check('普通文章无系列徽章', !plain.badge);
  check('普通文章无系列卡', !plain.card);
  check('普通文章相关阅读仍在', plain.related, JSON.stringify(plain));

  console.log('=== 6. 移动端 ===');
  const mobile = await browser.newPage();
  await mobile.evaluateOnNewDocument(() => localStorage.setItem('waifu-disabled', 'true'));
  await mobile.setViewport({ width: 390, height: 844 });
  const mErrors = [];
  mobile.on('pageerror', e => mErrors.push(String(e.message || e).slice(0, 120)));
  await mobile.goto(BASE + ARTICLE, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1200);
  const m = await mobile.evaluate(() => {
    const nav = document.querySelector('.post-series-nav');
    return {
      badge: !!document.querySelector('.post-series-badge'),
      card: !!document.querySelector('.post-series-card'),
      display: nav ? getComputedStyle(nav).display : '',
      columns: nav ? getComputedStyle(nav).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      summaryH: Math.round(document.querySelector('.post-series-details summary')?.getBoundingClientRect().height || 0),
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  check('移动端徽章/系列卡存在', m.badge && m.card, JSON.stringify(m));
  check('移动端前后篇单列', m.display === 'grid' && m.columns === 1, JSON.stringify(m));
  check('折叠触控高度 ≥ 44px', m.summaryH >= 44, String(m.summaryH));
  check('移动端无横向溢出', m.overflow <= 2, String(m.overflow));
  await mobile.goto(BASE + SERIES, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(700);
  const mSeriesOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check('移动端系列页无横向溢出', mSeriesOverflow <= 2, String(mSeriesOverflow));
  check('移动端零页面错误', mErrors.length === 0, mErrors.slice(0, 2).join(' | '));
  await mobile.close();

  console.log('=== 7. 页面错误 ===');
  check('零页面错误/站内 404', errors.length === 0, errors.slice(0, 3).join(' | '));

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  await browser.close();
  server.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('崩溃:', e); process.exit(1); });
