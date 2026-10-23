/* 跳转与过渡测试:SPA 导航、快速连点、前进后退、主题/季节/搜索/页脚/移动抽屉 */
'use strict';

const puppeteer = require('puppeteer-core');
const { startServer } = require('./static-server');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.PORT || 4140);
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name, extra || ''); }
}

async function installMetrics(page) {
  await page.evaluate(() => {
    window.__tm = { frames: [], longtasks: [], loaf: [], start: performance.now(), stopped: false };
    let last = performance.now();
    const loop = now => {
      window.__tm.frames.push(now - last);
      last = now;
      if (!window.__tm.stopped && performance.now() - window.__tm.start < 8000) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    try {
      new PerformanceObserver(list => {
        for (const e of list.getEntries()) window.__tm.longtasks.push(Math.round(e.duration));
      }).observe({ entryTypes: ['longtask'] });
    } catch (_) {}
    try {
      new PerformanceObserver(list => {
        for (const e of list.getEntries()) window.__tm.loaf.push(Math.round(e.duration));
      }).observe({ type: 'long-animation-frame', buffered: true });
    } catch (_) {}
  });
}

async function readMetrics(page) {
  return page.evaluate(() => {
    window.__tm.stopped = true;
    const f = (window.__tm?.frames || []).filter(x => x > 0).sort((a, b) => a - b);
    const p = q => Math.round(f[Math.min(f.length - 1, Math.floor(f.length * q))] || 0);
    return {
      frames: f.length,
      p50: p(0.5),
      p95: p(0.95),
      max: Math.round(f[f.length - 1] || 0),
      longtasks: (window.__tm?.longtasks || []).slice(0, 6),
      loafMax: Math.max(0, ...(window.__tm?.loaf || [])),
    };
  });
}

async function waitIdle(page, timeout = 8000) {
  return page.waitForFunction(
    () => !document.documentElement.classList.contains('is-animating'),
    { timeout }
  ).then(() => true).catch(() => false);
}

(async () => {
  const server = await startServer(PORT);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--no-proxy-server', '--enable-gpu', '--use-angle=d3d11', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  if (process.env.NO_L2D === '1') {
    await page.evaluateOnNewDocument(() => localStorage.setItem('waifu-disabled', 'true'));
  }
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + String(e.message || e).slice(0, 160)));
  page.on('response', r => {
    if (r.status() === 404 && !r.url().endsWith('/null') && r.url().startsWith(BASE)) {
      errors.push('404 ' + r.url().slice(0, 160));
    }
  });

  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(Number(process.env.WARMUP || 3000));

  console.log('=== 1. 首页 → 文章 ===');
  const articleLink = await page.$('.home-article-title a');
  check('首页文章链接存在', !!articleLink);
  let articleHref = null;
  if (articleLink) {
    articleHref = await articleLink.evaluate(a => a.getAttribute('href'));
    await installMetrics(page);
    await page.evaluate(() => {
      window.__navMarks = { click: 0, start: 0, replace: 0, end: 0 };
      const mark = key => () => { window.__navMarks[key] = performance.now(); };
      window.swup.hooks.on('visit:start', mark('start'));
      window.swup.hooks.on('content:replace', mark('replace'));
      window.swup.hooks.on('visit:end', mark('end'));
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(300);
    await page.evaluate(h => {
      window.__navMarks.click = performance.now();
      const a = [...document.querySelectorAll('a')].find(x => x.getAttribute('href') === h);
      if (a) a.click();
    }, articleHref);
    await page.waitForFunction(h => location.pathname === h, { timeout: 10000 }, articleHref).catch(() => {});
    const idle = await waitIdle(page);
    await sleep(300);
    const state = await page.evaluate(() => ({
      path: location.pathname,
      text: document.querySelector('.article-content')?.textContent.length || 0,
      scrollY: Math.round(scrollY),
      overflow: document.documentElement.scrollWidth - innerWidth,
    }));
    const metrics = await readMetrics(page);
    const navMarks = await page.evaluate(() => {
      const m = window.__navMarks;
      return {
        start: Math.round(m.start - m.click),
        replace: Math.round(m.replace - m.click),
        end: Math.round(m.end - m.click),
      };
    });
    check('导航完成', state.path === articleHref, JSON.stringify(state));
    check('内容已渲染', state.text > 500, JSON.stringify(state));
    check('滚动已回到顶部', state.scrollY < 80, JSON.stringify(state));
    check('无横向溢出', state.overflow <= 2, JSON.stringify(state));
    check('过渡类已清理', idle === true, JSON.stringify(state));
    check('内容替换 < 150ms', navMarks.replace > 0 && navMarks.replace < 150, JSON.stringify(navMarks));
    check('导航完成 < 800ms', navMarks.end > 0 && navMarks.end < 800, JSON.stringify(navMarks));
    check('最长长任务 < 300ms', Math.max(0, ...(metrics.longtasks || [])) < 300, JSON.stringify(metrics));
    const a11y = await page.evaluate(() => {
      const trigger = document.querySelector('.search-popup-trigger');
      return {
        tag: trigger?.tagName || null,
        role: trigger?.getAttribute('role') || null,
        tab: trigger?.getAttribute('tabindex') || null,
        label: trigger?.getAttribute('aria-label') || null,
        keys: trigger?.getAttribute('aria-keyshortcuts') || null,
        skip: !!document.querySelector('.skip-link'),
        main: !!document.querySelector('#main-content'),
      };
    });
    const searchNative = a11y.tag === 'BUTTON';
    check('换页后搜索按钮仍可键盘操作', (searchNative || (a11y.role === 'button' && a11y.tab === '0')) && !!a11y.label && (a11y.keys || '').includes('K'), JSON.stringify(a11y));
    check('skip link 与正文落点存在', a11y.skip && a11y.main, JSON.stringify(a11y));
    console.log('  帧指标', JSON.stringify(metrics));
    console.log('  导航耗时', JSON.stringify(navMarks));
  }

  console.log('=== 2. 文章 → 关于 ===');
  const aboutLink = await page.$('.navbar-content a[href="/about"]');
  check('导航关于链接存在', !!aboutLink);
  if (aboutLink) {
    await installMetrics(page);
    await aboutLink.click();
    await page.waitForFunction(() => location.pathname === '/about', { timeout: 10000 }).catch(() => {});
    const idle = await waitIdle(page);
    await sleep(300);
    const state = await page.evaluate(() => ({
      path: location.pathname,
      text: document.querySelector('.article-content, .page-template-content')?.textContent.length || 0,
      scrollY: Math.round(scrollY),
    }));
    const metrics = await readMetrics(page);
    check('导航完成', state.path === '/about', JSON.stringify(state));
    check('内容已渲染', state.text > 300, JSON.stringify(state));
    check('过渡类已清理', idle === true, JSON.stringify(state));
    await sleep(300);
    const announced = await page.evaluate(() => document.getElementById('route-announcer')?.textContent || '');
    check('换页有路由播报', announced.includes('已导航到'), announced);
    console.log('  帧指标', JSON.stringify(metrics));
  }

  console.log('=== 3. 明暗切换 ===');
  const darkBefore = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await page.evaluate(() => {
    document.querySelector('.tool-dark-light-toggle')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: 200, clientY: 200 })
    );
  });
  await page.waitForFunction(d => document.documentElement.classList.contains('dark') !== d, { timeout: 10000 }, darkBefore).catch(() => {});
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-theme-switching'), { timeout: 10000 }).catch(() => {});
  const darkAfter = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  check('明暗切换完成', darkAfter !== darkBefore, `before=${darkBefore} after=${darkAfter}`);
  await page.evaluate(() => {
    document.querySelector('.tool-dark-light-toggle')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: 200, clientY: 200 })
    );
  });
  await waitIdle(page);
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-theme-switching'), { timeout: 10000 }).catch(() => {});
  await sleep(300);

  console.log('=== 4. 季节菜单 ===');
  await page.click('.nb-theme-btn').catch(() => {});
  await page.waitForFunction(() => document.querySelector('.nb-dropdown')?.classList.contains('show'), { timeout: 5000 }).catch(() => {});
  const spaceOpt = await page.$('.nb-opt[data-season="space"]');
  check('太空站选项存在', !!spaceOpt);
  if (spaceOpt) {
    await spaceOpt.click();
    await page.waitForFunction(() => document.documentElement.dataset.season === 'space', { timeout: 10000 }).catch(() => {});
    await page.waitForFunction(() => !document.documentElement.hasAttribute('data-theme-switching'), { timeout: 10000 }).catch(() => {});
    const season = await page.evaluate(() => document.documentElement.dataset.season);
    check('切换太空站完成', season === 'space', '实际 ' + season);
  }

  console.log('=== 5. 搜索弹层 ===');
  const searchStart = Date.now();
  await page.click('.desktop .search-popup-trigger').catch(() => {});
  const searchOpen = await page.waitForFunction(
    () => document.querySelector('.search-pop-overlay')?.classList.contains('active'),
    { timeout: 5000 }
  ).then(() => true).catch(() => false);
  check('搜索已打开', searchOpen);
  if (searchOpen) {
    const focused = await page.waitForFunction(
      () => document.activeElement?.classList.contains('search-input'),
      { timeout: 2000 }
    ).then(() => true).catch(() => false);
    const focusMs = Date.now() - searchStart;
    check('搜索框立即聚焦', focused && focusMs < 900, `focused=${focused} ${focusMs}ms`);
    const dialog = await page.evaluate(() => {
      const overlay = document.querySelector('.search-pop-overlay.active');
      const input = overlay?.querySelector('.search-input');
      return {
        role: overlay?.getAttribute('role') || null,
        modal: overlay?.getAttribute('aria-modal') || null,
        label: input?.getAttribute('aria-label') || null,
      };
    });
    check('搜索弹层有 dialog 语义', dialog.role === 'dialog' && dialog.modal === 'true' && !!dialog.label, JSON.stringify(dialog));
    for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
    const trapped = await page.evaluate(() => !!document.activeElement?.closest('.search-pop-overlay.active'));
    check('Tab 焦点不离开搜索弹层', trapped);
    await page.keyboard.press('Escape');
    const restored = await page.waitForFunction(
      () => document.activeElement?.classList.contains('search-popup-trigger'),
      { timeout: 2000 }
    ).then(() => true).catch(() => false);
    check('关闭后焦点回到搜索按钮', restored);
    await sleep(300);
    const closed = await page.evaluate(() => !document.querySelector('.search-pop-overlay')?.classList.contains('active'));
    check('Esc 关闭搜索', closed);
    await page.keyboard.down('Control');
    await page.keyboard.press('k');
    await page.keyboard.up('Control');
    const shortcutOpen = await page.waitForFunction(
      () => document.querySelector('.search-pop-overlay')?.classList.contains('active'),
      { timeout: 3000 }
    ).then(() => true).catch(() => false);
    check('Ctrl+K 打开搜索', shortcutOpen);
    await page.keyboard.press('Escape');
    await sleep(300);
    const shortcutClosed = await page.evaluate(() => !document.querySelector('.search-pop-overlay')?.classList.contains('active'));
    check('Esc 关闭快捷键打开的搜索', shortcutClosed);
  }

  console.log('=== 6. 快速连点 ===');
  await installMetrics(page);
  await page.evaluate(() => {
    document.querySelector('a[href="/projects"]')?.click();
    setTimeout(() => document.querySelector('a[href="/archives"]')?.click(), 40);
  });
  await sleep(2500);
  const rapidIdle = await waitIdle(page);
  const rapid = await page.evaluate(() => ({
    path: location.pathname,
    text: document.querySelector('#swup')?.textContent.length || 0,
    overflow: document.documentElement.scrollWidth - innerWidth,
  }));
  const rapidMetrics = await readMetrics(page);
  check('快速连点后页面稳定', ['/projects', '/archives'].includes(rapid.path) && rapid.text > 30 && rapidIdle, JSON.stringify(rapid));
  check('快速连点后无横向溢出', rapid.overflow <= 2, JSON.stringify(rapid));
  console.log('  帧指标', JSON.stringify(rapidMetrics));

  console.log('=== 7. 前进后退 ===');
  const beforeBack = await page.evaluate(() => location.pathname);
  await page.goBack().catch(() => {});
  await sleep(1200);
  await waitIdle(page);
  const afterBack = await page.evaluate(() => location.pathname);
  check('后退完成', afterBack !== beforeBack, `${beforeBack} -> ${afterBack}`);
  await page.goForward().catch(() => {});
  await sleep(1200);
  await waitIdle(page);
  const afterForward = await page.evaluate(() => location.pathname);
  check('前进完成', afterForward === beforeBack, `${afterBack} -> ${afterForward}`);

  console.log('=== 8. 页脚展开 ===');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await sleep(900);
  const atBottom = await page.evaluate(() => document.querySelector('footer.footer')?.classList.contains('at-bottom'));
  check('触底展开', !!atBottom);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(900);
  const backTop = await page.evaluate(() => !document.querySelector('footer.footer')?.classList.contains('at-bottom'));
  check('回顶收回', backTop);
  await sleep(1200);
  const runtimeText = await page.evaluate(() =>
    ['runtime_days', 'runtime_hours', 'runtime_minutes', 'runtime_seconds']
      .map(id => (document.getElementById(id)?.textContent || '').trim())
  );
  check('页脚运行时间正常显示', runtimeText.every(v => v !== ''), JSON.stringify(runtimeText));

  console.log('=== 9. 移动端抽屉 ===');
  const mobile = await browser.newPage();
  await mobile.setViewport({ width: 390, height: 844 });
  const mobileErrors = [];
  mobile.on('pageerror', e => mobileErrors.push(String(e.message || e).slice(0, 120)));
  await mobile.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1500);
  const mobileState = await mobile.evaluate(() => ({
    waifu: !!document.getElementById('waifu'),
    overflow: document.documentElement.scrollWidth - innerWidth,
  }));
  check('移动端不加载宠物', !mobileState.waifu);
  check('移动端无横向溢出', mobileState.overflow <= 2, JSON.stringify(mobileState));
  await mobile.click('.navbar-bar').catch(() => {});
  await sleep(500);
  const drawerOpen = await mobile.evaluate(() => ({
    open: document.body.classList.contains('navbar-drawer-show'),
    inert: document.querySelector('.navbar-drawer')?.hasAttribute('inert'),
  }));
  check('抽屉可打开', drawerOpen.open && !drawerOpen.inert, JSON.stringify(drawerOpen));
  const drawerAbout = await mobile.$('.navbar-drawer a[href="/about"]');
  if (drawerAbout) {
    await drawerAbout.click();
    await mobile.waitForFunction(() => location.pathname === '/about', { timeout: 10000 }).catch(() => {});
    await sleep(800);
    const aboutState = await mobile.evaluate(() => ({ path: location.pathname, text: document.body.textContent.length }));
    check('抽屉导航可用', aboutState.path === '/about' && aboutState.text > 200, JSON.stringify(aboutState));
  }
  check('移动端零页面错误', mobileErrors.length === 0, mobileErrors.slice(0, 2).join(' | '));
  await mobile.close();

  console.log('=== 9.5 800px 平板导航 ===');
  const mid = await browser.newPage();
  await mid.setViewport({ width: 800, height: 900 });
  const midErrors = [];
  mid.on('pageerror', e => midErrors.push(String(e.message || e).slice(0, 120)));
  await mid.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(700);
  const midState = await mid.evaluate(() => {
    const icons = [...document.querySelectorAll('.navbar-content .mobile .icon-item')];
    return {
      icons: icons.map(el => getComputedStyle(el).display),
      desktop: getComputedStyle(document.querySelector('.navbar-content .desktop')).display,
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  check('800px 使用移动菜单', midState.icons.every(d => d !== 'none') && midState.desktop === 'none', JSON.stringify(midState));
  await mid.click('.navbar-content .mobile .navbar-bar').catch(() => {});
  await sleep(450);
  const midDrawer = await mid.evaluate(() => document.body.classList.contains('navbar-drawer-show'));
  check('800px 抽屉可打开', midDrawer);
  check('800px 无横向溢出', midState.overflow <= 2, String(midState.overflow));
  check('800px 零页面错误', midErrors.length === 0, midErrors.slice(0, 2).join(' | '));
  await mid.close();

  console.log('=== 10. 页面错误 ===');
  check('零页面错误/站内 404', errors.length === 0, errors.slice(0, 3).join(' | '));

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  await browser.close();
  server.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('崩溃:', e); process.exit(1); });
