/* 平滑度回归:滚动状态迟滞、进度条、合成层配置、Swup 过渡参数 */
const puppeteer = require('puppeteer-core');
const { startServer } = require('./static-server');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name, extra || ''); }
}

(async () => {
  const server = await startServer();
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--no-proxy-server', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 160)));

  await page.goto('http://127.0.0.1:4140/', { waitUntil: 'networkidle2', timeout: 30000 });
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
  }

  console.log('=== 6. 页面错误 ===');
  check('零页面错误', errors.length === 0, errors.slice(0, 2).join(' | '));

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  await browser.close();
  server.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('崩溃:', e.message); process.exit(1); });
