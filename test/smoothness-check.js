/* 平滑度回归:滚动状态迟滞、进度条、合成层配置、Swup 过渡参数 */
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

(async () => {
  const server = await startServer(PORT);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--no-proxy-server', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 160)));

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3000);

  console.log('=== 1. 合成层与过渡配置 ===');
  const cfg = await page.evaluate(() => {
    const card = document.querySelector('.home-article-item');
    const probe = document.createElement('div');
    probe.className = 'reveal';
    document.body.appendChild(probe);
    const revealWillChange = getComputedStyle(probe).willChange;
    probe.remove();
    document.documentElement.classList.add('is-animating');
    const pageEnter = getComputedStyle(document.querySelector('.page-container')).animationName;
    document.documentElement.classList.remove('is-animating');
    return {
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
      cardBackdrop: card ? getComputedStyle(card).backdropFilter : 'no-card',
      revealWillChange,
      pageEnter,
      slideTranslate: getComputedStyle(document.documentElement).getPropertyValue('--swup-slide-theme-translate').trim(),
      slideDuration: getComputedStyle(document.documentElement).getPropertyValue('--swup-slide-theme-duration-slide').trim(),
    };
  });
  check('全局滚动交给 Swup(auto)', cfg.scrollBehavior === 'auto', cfg.scrollBehavior);
  check('文章卡片不再做 backdrop 模糊', cfg.cardBackdrop === 'none', cfg.cardBackdrop);
  check('reveal 不常驻 will-change', cfg.revealWillChange === 'auto', cfg.revealWillChange);
  const blur = await page.evaluate(() => {
    const read = sel => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).backdropFilter || getComputedStyle(el).webkitBackdropFilter : 'missing';
    };
    const banner = document.querySelector('.home-banner-background');
    return {
      banner: banner ? getComputedStyle(banner).filter : 'missing',
      sidebar: read('.sidebar-content'),
      scrollTop: read('.tool-scroll-to-top'),
      footer: read('footer.footer .info-container'),
    };
  });
  check('首页横幅不再加全屏 blur', blur.banner === 'none', blur.banner);
  check('滚动可见面板不再用 backdrop-filter', [blur.sidebar, blur.scrollTop, blur.footer].every(v => v === 'none'), JSON.stringify(blur));
  check('Swup 换页时关闭 pageEnter 双重动画', cfg.pageEnter === 'none', cfg.pageEnter);
  check('Swup 滑动位移收小到 16px', cfg.slideTranslate === '16px', cfg.slideTranslate);
  check('Swup 滑动时长收小', cfg.slideDuration === '0.32s', cfg.slideDuration);

  console.log('=== 2. 导航栏迟滞 ===');
  const scrollTo = async y => {
    await page.evaluate(top => window.scrollTo(0, top), y);
    await sleep(900);
  };
  const isCompact = () => page.evaluate(() => document.querySelector('.navbar-container').classList.contains('scrolled'));
  await scrollTo(90);
  check('90px 不收缩', !(await isCompact()));
  await scrollTo(110);
  check('110px 收缩', await isCompact());
  await scrollTo(60);
  check('回到 60px 仍保持收缩(迟滞)', await isCompact());
  await scrollTo(30);
  check('30px 展开', !(await isCompact()));

  console.log('=== 3. 进度条仍由主题更新 ===');
  await scrollTo(1200);
  const bar = await page.evaluate(() => document.querySelector('.scroll-progress-bar').style.width);
  check('进度条宽度已更新', parseFloat(bar) > 0, bar);

  console.log('=== 4. 页脚展开迟滞 ===');
  const atBottom = () => page.evaluate(() => document.querySelector('footer.footer').classList.contains('at-bottom'));
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await sleep(900);
  check('触底展开', await atBottom());
  await page.evaluate(() => window.scrollBy(0, -20));
  await sleep(700);
  check('上滚 20px 仍展开', await atBottom());
  await page.evaluate(() => window.scrollBy(0, -220));
  await sleep(700);
  check('上滚 240px 收回', !(await atBottom()));

  console.log('=== 5. Live2D 滚动暂停 ===');
  // 宠物入口只在首页顶部显示,先回到顶部再召唤
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(900);
  const petBtn = await page.$('#pet-toggle');
  if (petBtn) await petBtn.click();
  const hasL2d = await page.waitForFunction(() => !!window.__l2dApp, { timeout: 15000 }).then(() => true).catch(() => false);
  check('Live2D 实例已暴露', hasL2d);
  if (hasL2d) {
    const paused = await page.evaluate(() => {
      window.dispatchEvent(new Event('scroll'));
      return {
        flag: !!window.__l2dPaused,
        frame: window.__l2dApp._drawFrameId,
        waifuClass: document.querySelector('#waifu')?.className || 'missing',
      };
    });
    await sleep(1400);
    const resumed = await page.evaluate(() => ({ flag: !!window.__l2dPaused, frame: window.__l2dApp._drawFrameId }));
    check('滚动时暂停渲染', paused.flag === true && paused.frame === null, JSON.stringify(paused));
    check('停止滚动后恢复', resumed.flag === false && typeof resumed.frame === 'number', JSON.stringify(resumed));

    const tap = await page.evaluate(() => {
      const app = window.__l2dApp;
      const model = app.subdelegates.at(0).getLive2DManager()._models.at(0);
      let motions = 0, exprs = 0;
      const om = model.startRandomMotion && model.startRandomMotion.bind(model);
      const oe = model.setRandomExpression && model.setRandomExpression.bind(model);
      if (om) model.startRandomMotion = (...a) => { motions++; return om(...a); };
      if (oe) model.setRandomExpression = (...a) => { exprs++; return oe(...a); };
      document.getElementById('live2d').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return { motions, exprs };
    });
    check('点击宠物触发动作', tap.motions > 0, JSON.stringify(tap));

    const drag = await page.evaluate(async () => {
      const w = document.getElementById('waifu');
      const c = document.getElementById('live2d');
      const r = c.getBoundingClientRect();
      c.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: r.left + 40, clientY: r.top + 40, button: 0 }));
      document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: r.left + 140, clientY: r.top + 20 }));
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      await new Promise(res => setTimeout(res, 80));
      return { left: w.style.left, top: w.style.top, saved: localStorage.getItem('live2d-position') };
    });
    check('宠物可拖拽并记住位置', !!drag.left && !!drag.top && !!drag.saved, JSON.stringify(drag));
    await page.evaluate(() => {
      localStorage.removeItem('live2d-position');
      const w = document.getElementById('waifu');
      w.style.left = '';
      w.style.top = '';
      w.style.bottom = '';
    });

    const hidden = await page.evaluate(async () => {
      const w = document.getElementById('waifu');
      w.classList.remove('waifu-active');
      w.classList.add('waifu-hidden');
      await new Promise(r => setTimeout(r, 350));
      const stopped = window.__l2dApp._drawFrameId === null;
      w.classList.add('waifu-active');
      w.classList.remove('waifu-hidden');
      await new Promise(r => setTimeout(r, 1000));
      const resumed = typeof window.__l2dApp._drawFrameId === 'number';
      return { stopped, resumed };
    });
    check('隐藏宠物时停止渲染', hidden.stopped, JSON.stringify(hidden));
    check('恢复显示后继续渲染', hidden.resumed, JSON.stringify(hidden));
  }

  console.log('=== 6. 移动端 ===');
  const mPage = await browser.newPage();
  await mPage.setViewport({ width: 390, height: 844 });
  await mPage.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1500);
  const mobile = await mPage.evaluate(() => {
    const info = document.querySelector('footer.footer .info-container');
    return {
      overflow: document.documentElement.scrollWidth - innerWidth,
      waifu: !!document.getElementById('waifu'),
      footerW: Math.round(info ? info.getBoundingClientRect().width : 0),
      footerScrollW: Math.round(info ? info.scrollWidth : 0),
      innerWidth,
      heavyRequests: performance.getEntriesByType('resource').filter(e => /live2d\/(model|waifu-tips|live2dcubismcore|chunk)/.test(e.name)).length,
    };
  });
  check('移动端无横向溢出', mobile.overflow <= 1, JSON.stringify(mobile));
  check('移动端不加载 Live2D 资源', !mobile.waifu && mobile.heavyRequests === 0, JSON.stringify(mobile));
  check('移动端页脚不超宽', mobile.footerW <= mobile.innerWidth + 1 && mobile.footerScrollW <= mobile.innerWidth + 1, JSON.stringify(mobile));
  await mPage.close();

  console.log('=== 7. 减少动态效果 ===');
  const rmPage = await browser.newPage();
  await rmPage.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await rmPage.setViewport({ width: 1440, height: 900 });
  await rmPage.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 });
  const rmReady = await rmPage.waitForFunction(() => !!window.__l2dApp, { timeout: 15000 }).then(() => true).catch(() => false);
  await sleep(600);
  const rm = await rmPage.evaluate(() => ({
    flag: !!window.__l2dReducedMotion,
    frame: window.__l2dApp ? window.__l2dApp._drawFrameId : 'no-app',
  }));
  check('reduced-motion 下不持续渲染', rmReady && rm.flag === true && rm.frame === null, JSON.stringify(rm));
  await rmPage.close();

  console.log('=== 8. 页面错误 ===');
  check('零页面错误', errors.length === 0, errors.slice(0, 2).join(' | '));

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  await browser.close();
  server.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('崩溃:', e.message); process.exit(1); });
