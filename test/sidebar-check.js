/* 文章右侧信息卡:存在性 / 阅读进度 / SPA 换页 / 移动端 / CLS */
'use strict';

const puppeteer = require('puppeteer-core');
const { startServer } = require('./static-server');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.PORT || 4160);
const BASE = `http://127.0.0.1:${PORT}`;
const ARTICLE = '/2026/04/22/docker-getting-started/';
const NEXT = '/2026/05/08/hexo-blog-setup-guide/';
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
  page.on('response', r => {
    // 主题在没有封面时会请求相对路径 "null",是已知的无害 404(其他测试同样忽略)
    if (r.status() === 404 && r.url().startsWith(BASE) && !r.url().endsWith('/null')) {
      errors.push('404 ' + r.url().slice(0, 160));
    }
  });
  await page.evaluateOnNewDocument(() => {
    window.__cls = 0;
    try {
      new PerformanceObserver(list => {
        for (const e of list.getEntries()) {
          if (!e.hadRecentInput) window.__cls += e.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (_) {}
  });

  console.log('=== 1. 直接打开文章 ===');
  await page.goto(BASE + ARTICLE, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2200);
  const first = await page.evaluate(() => ({
    stack: !!document.querySelector('.post-side-stack'),
    author: !!document.querySelector('.post-side-author-card'),
    name: document.querySelector('.post-side-name')?.textContent || '',
    bio: document.querySelector('.post-side-bio')?.textContent || '',
    tags: document.querySelectorAll('.post-side-tag').length,
    cat: !!document.querySelector('.post-side-cat-card'),
    toc: !!document.querySelector('.post-toc'),
    overflow: document.documentElement.scrollWidth - innerWidth,
    cls: window.__cls,
  }));
  check('信息卡存在', first.stack);
  check('作者卡存在', first.author && first.name.includes('Sterling'));
  check('简介非空', first.bio.length > 4, first.bio);
  check('标签卡有标签', first.tags >= 2, String(first.tags));
  check('同分类卡存在', first.cat);
  check('目录仍在', first.toc);
  check('无横向溢出', first.overflow <= 2, String(first.overflow));
  check('首屏 CLS < 0.12', first.cls < 0.12, first.cls.toFixed(4));
  console.log('  CLS', first.cls.toFixed(4));

  console.log('=== 2. 阅读进度 ===');
  const before = await page.evaluate(() => parseFloat(document.querySelector('.post-side-ring-fill')?.style.strokeDashoffset || '0'));
  await page.evaluate(() => window.scrollTo(0, Math.round((document.documentElement.scrollHeight - innerHeight) * 0.5)));
  await sleep(400);
  const mid = await page.evaluate(() => {
    const card = document.querySelector('.post-side-author-card');
    const toc = document.querySelector('.toc-content-container');
    return {
      num: Number(document.querySelector('.post-side-progress-num')?.textContent || 0),
      offset: parseFloat(document.querySelector('.post-side-ring-fill')?.style.strokeDashoffset || '0'),
      cardTop: card ? card.getBoundingClientRect().top : null,
      tocTop: toc ? toc.getBoundingClientRect().top : null,
    };
  });
  check('进度数字更新', mid.num >= 35 && mid.num <= 65, String(mid.num));
  check('进度环更新', mid.offset < before - 10, `${before} -> ${mid.offset}`);
  check('作者卡滚动时吸顶', mid.cardTop !== null && Math.abs(mid.cardTop - mid.tocTop) < 24, JSON.stringify(mid));

  console.log('=== 3. SPA 换页 ===');
  await page.evaluate(h => {
    const a = [...document.querySelectorAll('.post-side-cat-list a')].find(x => x.getAttribute('href') === h);
    if (a) a.click();
  }, NEXT);
  await page.waitForFunction(h => location.pathname === h, { timeout: 10000 }, NEXT).catch(() => {});
  await sleep(900);
  const next = await page.evaluate(() => ({
    path: location.pathname,
    stack: !!document.querySelector('.post-side-stack'),
    tags: [...document.querySelectorAll('.post-side-tag')].map(x => x.textContent),
    progress: document.querySelector('.post-side-progress-num')?.textContent,
    overflow: document.documentElement.scrollWidth - innerWidth,
  }));
  check('换页后信息卡仍在', next.stack);
  check('换页后标签已更新', next.tags.some(t => t.includes('Hexo')), JSON.stringify(next.tags));
  check('换页后无横向溢出', next.overflow <= 2, String(next.overflow));

  console.log('=== 4. 移动端 ===');
  const mobile = await browser.newPage();
  await mobile.setViewport({ width: 390, height: 844 });
  const mErrors = [];
  mobile.on('pageerror', e => mErrors.push(String(e.message || e).slice(0, 120)));
  await mobile.goto(BASE + ARTICLE, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1200);
  const m = await mobile.evaluate(() => {
    const toc = document.querySelector('.toc-content-container');
    const stack = document.querySelector('.post-side-stack');
    return {
      tocDisplay: toc ? getComputedStyle(toc).display : 'missing',
      stackVisible: stack ? stack.getBoundingClientRect().width > 0 && getComputedStyle(stack).visibility !== 'hidden' : false,
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  check('移动端侧栏隐藏', m.tocDisplay === 'none' || !m.stackVisible, JSON.stringify(m));
  check('移动端无横向溢出', m.overflow <= 2, String(m.overflow));
  check('移动端零错误', mErrors.length === 0, mErrors.slice(0, 2).join(' | '));
  await mobile.close();

  console.log('=== 5. 页面错误 ===');
  check('零页面错误/站内 404', errors.length === 0, errors.slice(0, 3).join(' | '));

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  await browser.close();
  server.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('崩溃:', e); process.exit(1); });
