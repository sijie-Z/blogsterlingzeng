/* 无障碍回归:名称 / alt / 列表语义 / 标题 / 地标 / 原生按钮 */
'use strict';

const puppeteer = require('puppeteer-core');
const { startServer } = require('./static-server');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.PORT || 4291);
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name, extra || ''); }
}

async function audit(page) {
  return page.evaluate(() => {
    const visible = el => el.getClientRects().length > 0;
    const missingAlt = [...document.images].filter(img => !img.hasAttribute('alt')).length;
    const badLinks = [...document.querySelectorAll('a[href]')].filter(a => {
      if (!visible(a)) return false;
      const text = (a.textContent || '').trim();
      const label = (a.getAttribute('aria-label') || a.getAttribute('title') || '').trim();
      const imgAlt = [...a.querySelectorAll('img')].some(i => (i.getAttribute('alt') || '').trim());
      return !text && !label && !imgAlt;
    }).map(a => a.getAttribute('href'));
    const badButtons = [...document.querySelectorAll('button')].filter(b => {
      if (!visible(b)) return false;
      return !(b.textContent || '').trim() && !(b.getAttribute('aria-label') || '').trim();
    }).map(b => b.outerHTML.slice(0, 80));
    const badLists = [...document.querySelectorAll('ul, ol')].filter(list => {
      if (!visible(list)) return false;
      return [...list.children].some(child =>
        !['LI', 'SCRIPT', 'TEMPLATE'].includes(child.tagName)
      );
    }).map(list => list.className || list.tagName);
    return {
      h1: document.querySelectorAll('h1').length,
      main: document.querySelectorAll('main').length,
      nav: document.querySelectorAll('nav, [role="navigation"]').length,
      skip: !!document.querySelector('.skip-link'),
      skipTarget: document.querySelector('.skip-link')?.getAttribute('href') || '',
      missingAlt,
      badLinks,
      badButtons,
      badLists,
      searchTag: document.querySelector('.desktop .search-popup-trigger')?.tagName || '',
      searchLabel: document.querySelector('.desktop .search-popup-trigger')?.getAttribute('aria-label') || '',
    };
  });
}

(async () => {
  const server = await startServer(PORT);
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: true,
    args: ['--no-sandbox', '--no-proxy-server', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => localStorage.setItem('waifu-disabled', 'true'));
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 160)));

  const pages = [
    ['首页', '/'],
    ['文章页', '/2026/10/22/font-subset-and-cls/'],
    ['归档', '/archives/'],
    ['系列页', '/series/blog-engineering/'],
    ['系列总览', '/series/'],
    ['关于', '/about/'],
    ['项目', '/projects/'],
    ['简历', '/resume/'],
    ['404', '/404.html'],
  ];

  for (const [name, path] of pages) {
    console.log(`=== ${name} ${path} ===`);
    await page.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(600);
    const a = await audit(page);
    check(`${name}: 唯一 h1`, a.h1 === 1, String(a.h1));
    check(`${name}: 有 main 与 nav`, a.main === 1 && a.nav >= 1, JSON.stringify({ main: a.main, nav: a.nav }));
    check(`${name}: 图片都有 alt`, a.missingAlt === 0, String(a.missingAlt));
    check(`${name}: 链接都有可访问名称`, a.badLinks.length === 0, JSON.stringify(a.badLinks.slice(0, 3)));
    check(`${name}: 按钮都有可访问名称`, a.badButtons.length === 0, JSON.stringify(a.badButtons.slice(0, 3)));
    check(`${name}: 列表只含 li`, a.badLists.length === 0, JSON.stringify(a.badLists.slice(0, 3)));
    if (path === '/') {
      check('首页: 搜索是原生 button 且有名称', a.searchTag === 'BUTTON' && !!a.searchLabel, JSON.stringify({ tag: a.searchTag, label: a.searchLabel }));
      check('首页: skip link 指向正文', a.skip && a.skipTarget === '#main-content', JSON.stringify({ skip: a.skip, target: a.skipTarget }));
    }
    console.log('  扫描:', JSON.stringify({ missingAlt: a.missingAlt, badLinks: a.badLinks.length, badButtons: a.badButtons.length, badLists: a.badLists.length }));
  }

  console.log('=== 图片查看器键盘 ===');
  await page.goto(BASE + '/2026/10/23/hexo-series-reading-path/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(900);
  const imgA11y = await page.evaluate(() => {
    const img = document.querySelector('.markdown-body img');
    if (!img) return { missing: true };
    img.focus();
    return { missing: false, tab: img.tabIndex, role: img.getAttribute('role'), label: img.getAttribute('aria-label') || '' };
  });
  check('正文图片可聚焦且有名称', !imgA11y.missing && imgA11y.tab === 0 && imgA11y.role === 'button' && !!imgA11y.label, JSON.stringify(imgA11y));
  await page.keyboard.press('Enter');
  const focusedClose = await page.waitForFunction(
    () => document.activeElement?.classList.contains('image-viewer-close'),
    { timeout: 2500 }
  ).then(() => true).catch(() => false);
  const viewerOpen = await page.evaluate(() => ({
    active: !!document.querySelector('.image-viewer-container.active'),
    focus: document.activeElement?.classList.contains('image-viewer-close') || false,
  }));
  check('Enter 打开图片查看器并聚焦关闭', viewerOpen.active && focusedClose && viewerOpen.focus, JSON.stringify(viewerOpen));
  await sleep(400);
  const viewerCaption = await page.evaluate(() => {
    const img = document.querySelector('.image-viewer-container.active .image-viewer-frame img');
    const cap = document.querySelector('.image-viewer-container.active .image-viewer-caption');
    return {
      text: (cap && cap.textContent || '').trim(),
      describedBy: img?.getAttribute('aria-describedby') || '',
    };
  });
  check('图片查看器显示说明并关联', viewerCaption.text.length > 4 && viewerCaption.describedBy === 'image-viewer-caption', JSON.stringify(viewerCaption));
  await page.keyboard.press('Escape');
  await sleep(500);
  const viewerClosed = await page.evaluate(() => ({
    active: !!document.querySelector('.image-viewer-container.active'),
    back: document.activeElement?.tagName === 'IMG',
  }));
  check('Esc 关闭后焦点回到图片', !viewerClosed.active && viewerClosed.back, JSON.stringify(viewerClosed));
  const codeBtn = await page.evaluate(() => {
    const btn = document.querySelector('.copy-button');
    return btn ? { tag: btn.tagName, role: btn.getAttribute('role'), tab: btn.tabIndex } : { missing: true };
  });
  check('代码按钮可键盘操作', !codeBtn.missing && (codeBtn.tag === 'BUTTON' || codeBtn.role === 'button') && codeBtn.tab === 0, JSON.stringify(codeBtn));

  check('零页面错误', errors.length === 0, errors.slice(0, 2).join(' | '));

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  await browser.close();
  server.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('崩溃:', e); process.exit(1); });
