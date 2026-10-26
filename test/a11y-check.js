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

  await page.goto(BASE + '/projects/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(600);
  const diagrams = await page.evaluate(() =>
    [...document.querySelectorAll('.project-arch')].map(fig => {
      const svg = fig.querySelector('svg');
      return {
        role: svg?.getAttribute('role') || '',
        labelled: svg?.getAttribute('aria-labelledby') || '',
        title: !!document.getElementById(svg?.getAttribute('aria-labelledby') || ''),
        focusable: fig.tabIndex === 0,
      };
    })
  );
  check('项目架构图可访问且可聚焦', diagrams.length === 3 && diagrams.every(d => d.role === 'img' && d.labelled && d.title && d.focusable), JSON.stringify(diagrams));

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
    { timeout: 4000 }
  ).then(() => true).catch(() => false);
  const viewerOpen = await page.evaluate(() => ({
    active: !!document.querySelector('.image-viewer-container.active'),
    focus: document.activeElement?.classList.contains('image-viewer-close') || false,
  }));
  check('Enter 打开图片查看器并聚焦关闭', viewerOpen.active && focusedClose && viewerOpen.focus, JSON.stringify(viewerOpen));
  const viewerNav = await page.evaluate(() => {
    const mask = document.querySelector('.image-viewer-container.active');
    return ['prev', 'next'].map(kind => {
      const btn = mask?.querySelector('.image-viewer-' + kind);
      return btn ? {
        kind,
        disabled: btn.disabled,
        aria: btn.getAttribute('aria-disabled'),
        className: btn.classList.contains('is-disabled'),
      } : { kind, missing: true };
    });
  });
  check('查看器不可用方向按钮真正禁用', viewerNav.every(s => !s.missing && s.disabled === s.className && (s.disabled ? s.aria === 'true' : s.aria === null)), JSON.stringify(viewerNav));
  await sleep(400);
  const viewerCaption = await page.evaluate(() => {
    const img = document.querySelector('.image-viewer-container.active .image-viewer-frame img');
    const cap = document.querySelector('.image-viewer-container.active .image-viewer-caption');
    return {
      text: (cap && cap.textContent || '').trim(),
      alt: (img?.alt || '').trim(),
      describedBy: img?.getAttribute('aria-describedby') || '',
    };
  });
  const expectedCaptionLink = viewerCaption.text && viewerCaption.text !== viewerCaption.alt ? 'image-viewer-caption' : '';
  check('图片查看器说明不重复关联', viewerCaption.text.length > 4 && viewerCaption.describedBy === expectedCaptionLink, JSON.stringify(viewerCaption));
  await page.keyboard.press('Escape');
  await sleep(500);
  const viewerClosed = await page.evaluate(() => ({
    active: !!document.querySelector('.image-viewer-container.active'),
    back: document.activeElement?.tagName === 'IMG',
  }));
  check('Esc 关闭后焦点回到图片', !viewerClosed.active && viewerClosed.back, JSON.stringify(viewerClosed));
  const footnotes = await page.evaluate(() => ({
    refs: document.querySelectorAll('.footnote-ref a').length,
    notes: document.querySelectorAll('.footnotes li').length,
    backrefs: document.querySelectorAll('.footnote-backref').length,
  }));
  check('脚注引用、文末列表与返回链接对应', footnotes.refs === 1 && footnotes.notes === 1 && footnotes.backrefs === 1, JSON.stringify(footnotes));
  const codeBtn = await page.evaluate(() => {
    const btn = document.querySelector('.copy-button');
    return btn ? { tag: btn.tagName, role: btn.getAttribute('role'), tab: btn.tabIndex } : { missing: true };
  });
  check('代码按钮可键盘操作', !codeBtn.missing && (codeBtn.tag === 'BUTTON' || codeBtn.role === 'button') && codeBtn.tab === 0, JSON.stringify(codeBtn));

  const citeTab = await page.evaluate(async () => {
    const trigger = document.querySelector('.post-side-share');
    if (!trigger) return { missing: true };
    trigger.click();
    await new Promise(r => setTimeout(r, 200));
    const menu = document.querySelector('.cite-menu');
    if (!menu) return { missing: true, reason: 'menu' };
    const item = document.activeElement;
    return {
      missing: false,
      menuOpen: true,
      firstIsItem: menu.contains(item),
      itemText: (item && item.textContent || '').trim(),
    };
  });
  if (!citeTab.missing) {
    await page.keyboard.press('Tab');
    await sleep(250);
    const citeAfterTab = await page.evaluate(() => ({
      menu: !!document.querySelector('.cite-menu'),
      skip: document.activeElement?.classList.contains('skip-link') || false,
      focus: document.activeElement?.className || document.activeElement?.tagName || '',
    }));
    check('引用菜单 Tab 不跳回 skip link', citeTab.firstIsItem && !citeAfterTab.menu && !citeAfterTab.skip, JSON.stringify({ citeTab, citeAfterTab }));
  } else {
    check('引用菜单 Tab 不跳回 skip link', false, JSON.stringify(citeTab));
  }

  const blocked = await browser.newPage();
  await blocked.evaluateOnNewDocument(() => {
    Storage.prototype.getItem = function () { throw new Error('storage blocked'); };
    Storage.prototype.setItem = function () { throw new Error('storage blocked'); };
  });
  await blocked.goto(BASE + '/2026/10/23/hexo-series-reading-path/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(900);
  const blockedSize = await blocked.evaluate(() => {
    const btn = document.querySelector('.read-size-btn[data-read-size="s"]');
    if (!btn) return { missing: true };
    btn.click();
    return { attr: document.documentElement.getAttribute('data-read-size') };
  });
  check('禁用 localStorage 时字号按钮仍生效', blockedSize.attr === 's', JSON.stringify(blockedSize));
  await blocked.click('.nb-theme-btn');
  await blocked.click('.nb-opt[data-season="winter"]');
  await sleep(650);
  const blockedSeasonBefore = await blocked.evaluate(() => document.documentElement.dataset.season || null);
  await blocked.evaluate(() => window.swup?.navigate('/about/'));
  await blocked.waitForFunction(() => location.pathname === '/about/', { timeout: 8000 }).catch(() => {});
  await sleep(700);
  const blockedSeasonAfter = await blocked.evaluate(() => document.documentElement.dataset.season || null);
  check('禁用 localStorage 时季节设置换页不丢失', blockedSeasonBefore === 'winter' && blockedSeasonAfter === 'winter', JSON.stringify({ blockedSeasonBefore, blockedSeasonAfter }));
  await blocked.close();

  // 新开页面直接打开搜索:验证 overlay 的 inert observer 按当前节点绑定,
  // 关闭后焦点确实回到搜索按钮(而不是被 inert 吞掉)。
  await page.goto(BASE + '/about/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(900);
  await page.click('.desktop .search-popup-trigger');
  await page.waitForFunction(() => document.querySelector('.search-pop-overlay')?.classList.contains('active'), { timeout: 4000 }).catch(() => {});
  await page.waitForFunction(() => document.activeElement?.classList.contains('search-input'), { timeout: 3000 }).catch(() => {});
  await page.keyboard.press('Escape');
  const searchFocusBack = await page.waitForFunction(
    () => document.activeElement?.classList.contains('search-popup-trigger'),
    { timeout: 3000 }
  ).then(() => true).catch(() => false);
  check('首次加载搜索关闭后焦点回到按钮', searchFocusBack);

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(BASE + '/2026/10/23/hexo-series-reading-path/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(800);
  await page.evaluate(() => document.querySelector('.markdown-body img')?.click());
  await sleep(500);
  const pinch = await page.evaluate(async () => {
    const mask = document.querySelector('.image-viewer-container.active');
    const img = mask?.querySelector('.image-viewer-frame img');
    if (!img) return { missing: true };
    const touch = (id, x, y) => new Touch({ identifier: id, target: mask, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y });
    const fire = (type, dist) => {
      const touches = [touch(1, 195 - dist / 2, 420), touch(2, 195 + dist / 2, 420)];
      mask.dispatchEvent(new TouchEvent(type, { touches, targetTouches: touches, changedTouches: touches, bubbles: true, cancelable: true }));
    };
    fire('touchstart', 80);
    fire('touchmove', 240);
    fire('touchend', 240);
    await new Promise(r => setTimeout(r, 300));
    const scale = Number((img.style.transform.match(/scale\(([\d.]+)\)/) || [])[1] || 1);
    return { missing: false, scale };
  });
  check('双指缩放放大图片', !pinch.missing && pinch.scale > 1.2, JSON.stringify(pinch));

  await page.goto(BASE + '/2026/10/23/hexo-series-reading-path/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(500);
  const skipFocus = await page.evaluate(() => {
    const link = document.querySelector('.skip-link');
    if (!link) return 'missing';
    link.focus();
    link.click();
    return document.activeElement?.id || document.activeElement?.tagName || '';
  });
  check('skip link 把焦点移到正文', skipFocus === 'main-content', skipFocus);

  await page.goto(BASE + '/shuoshuo/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(700);
  const essayDates = await page.evaluate(() =>
    [...document.querySelectorAll('.essay-date')].map(el => el.textContent.trim())
  );
  check('说说页日期已格式化', essayDates.length > 0 && !essayDates.some(text => text.includes('Loading')), JSON.stringify(essayDates.slice(0, 3)));

  await page.goto(BASE + '/2026/10/23/hexo-series-reading-path/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(600);
  await page.evaluate(() => document.querySelector('.markdown-body img')?.click());
  await sleep(400);
  await page.evaluate(() => window.swup?.navigate('/about/'));
  await page.waitForFunction(() => location.pathname === '/about/', { timeout: 5000 }).catch(() => {});
  await sleep(500);
  const afterViewerNav = await page.evaluate(() => ({
    inert: [...document.querySelectorAll('[inert]')].filter(el => !el.classList.contains('navbar-drawer')).length,
    active: !!document.querySelector('.image-viewer-container.active'),
  }));
  check('SPA 换页清除查看器 inert', afterViewerNav.inert === 0 && !afterViewerNav.active, JSON.stringify(afterViewerNav));

  check('零页面错误', errors.length === 0, errors.slice(0, 2).join(' | '));

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  await browser.close();
  server.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('崩溃:', e); process.exit(1); });
