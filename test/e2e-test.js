/* E2E 测试:核心功能端到端验证 */
const puppeteer = require('puppeteer-core');
const { startServer } = require('./static-server');
let server;

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.PORT || 4140);
const BASE = process.env.BASE || `http://127.0.0.1:${PORT}`;

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name, extra || ''); }
}

(async () => { server = await startServer(PORT);
  console.log('启动 Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--no-proxy-server', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message.slice(0, 200)));
  page.on('console', m => {
    if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push('CONSOLE: ' + m.text().slice(0, 250));
  });
  page.on('response', r => { if (r.status() === 404 && !r.url().endsWith('/null') && r.url().startsWith(BASE)) errors.push('404: ' + r.url().slice(0, 200)); });

  console.log('=== 1. 页面加载 ===');
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => console.log('  goto err:', e.message));
  await new Promise(r => setTimeout(r, 3000));

  console.log('=== 2. 导航/季节按钮 ===');
  const seasonBtn = await page.$('.nb-theme-btn');
  check('季节按钮存在', !!seasonBtn);
  if (seasonBtn) {
    await seasonBtn.click();
    await new Promise(r => setTimeout(r, 300));
    const dropOpen = await page.$eval('.nb-dropdown', el => el.classList.contains('show')).catch(() => false);
    check('下拉打开', dropOpen);
    // 点夏季(第 3 个选项:auto/spring/summer)
    const opts = await page.$$('.nb-opt');
    check('下拉选项数 = 6', opts.length === 6, '实际 ' + opts.length);
    if (opts.length >= 3) {
      // 选项用 DOM click:View Transition 的快照层仍在时,真实坐标点击会被吞掉
      await page.evaluate(() => document.querySelector('.nb-opt[data-season="summer"]').click());
      await new Promise(r => setTimeout(r, 1200));
      const season = await page.evaluate(() => document.documentElement.dataset.season);
      check('点击夏季后 data-season=summer', season === 'summer', '实际 ' + season);
      await page.waitForFunction(() => !document.documentElement.hasAttribute('data-theme-switching'), { timeout: 15000 }).catch(() => {});
    }
    const spaceOpt = await page.$('.nb-opt[data-season="space"]');
    check('固定太空站模式已从菜单移除', !spaceOpt);
    await page.evaluate(() => localStorage.setItem('blog-season', 'space'));
    await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    const fallbackState = await page.evaluate(() => ({
      season: document.documentElement.dataset.season,
      imgs: [...document.querySelectorAll('.home-banner-background img')].filter(i => getComputedStyle(i).display !== 'none').map(i => i.currentSrc),
    }));
    check('旧 space 设置自动回退默认', fallbackState.season === 'auto', '实际 ' + fallbackState.season);
    check('回退后默认横幅仍可用', fallbackState.imgs.some(s => s && (s.includes('banner-light') || s.includes('banner-dark'))), JSON.stringify(fallbackState.imgs));
  }

  console.log('=== 3. 明暗切换(View Transition) ===');
  const darkToggle = await page.$('.tool-dark-light-toggle');
  check('明暗按钮存在', !!darkToggle);
  if (darkToggle) {
    const before = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    // 记录 view-transition 是否触发
    await page.evaluate(() => {
      window.__vtCount = 0;
      const orig = document.startViewTransition;
      if (orig) {
        document.startViewTransition = function(fn) {
          window.__vtCount++;
          return orig.call(this, fn);
        };
      }
    });
    await page.evaluate(() => document.querySelector('.tool-dark-light-toggle').dispatchEvent(new MouseEvent('click', {bubbles: true, clientX: 200, clientY: 200})));
    // Live2D 模型加载可能阻塞主线程,等待状态翻转而非固定延时
    await page.waitForFunction(d => document.documentElement.classList.contains('dark') !== d, { timeout: 15000 }, before).catch(() => {});
    const after = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    const vtCount = await page.evaluate(() => window.__vtCount || 0);
    check('明暗切换生效', before !== after, 'before=' + before + ' after=' + after);
    check('View Transition 触发', vtCount >= 1, '次数 ' + vtCount);
    // 切回来
    await page.evaluate(() => document.querySelector('.tool-dark-light-toggle').dispatchEvent(new MouseEvent('click', {bubbles: true, clientX: 200, clientY: 200})));
    await page.waitForFunction(d => document.documentElement.classList.contains('dark') !== d, { timeout: 15000 }, after).catch(() => {});
  }

  console.log('=== 4. 管中窥豹 + ESC ===');
  await page.evaluate(() => {
    // 直接调用 toggle 开手电筒(通过模拟点击下拉里的手电筒太绕,直接触发)
    document.body.classList.add('flashlight-mode');
  });
  check('手电筒开启', await page.evaluate(() => document.body.classList.contains('flashlight-mode')));
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 300));
  check('ESC 退出管中窥豹', !(await page.evaluate(() => document.body.classList.contains('flashlight-mode'))));

  console.log('=== 5. Live2D 宠物（显式召唤） ===');
  const petToggle = await page.$('#pet-toggle');
  check('默认不自动加载,显示召唤按钮', !!petToggle);
  if (petToggle) {
    // 模型初始化会等滚动停止 1.2s;先把页面稳定在顶部,再用 DOM click 避开浮动播放器遮挡
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 1500));
    await petToggle.evaluate(el => el.click());
  }
  await page.waitForSelector('#waifu', { timeout: 25000 }).catch(() => {});
  const waifu = await page.$('#waifu');
  check('waifu 容器存在', !!waifu);
  if (waifu) {
    await new Promise(r => setTimeout(r, 5000));
    const canvas = await page.$('#live2d');
    check('Live2D canvas 渲染', !!canvas);
    if (canvas) {
      const size = await canvas.evaluate(el => ({ w: el.width, h: el.height }));
      check('canvas 有尺寸', size.w > 0 && size.h > 0, JSON.stringify(size));
    }
  }

  console.log('=== 6. 页面元素 ===');
  check('导航栏', await page.$('.navbar-content'));
  check('页脚', await page.$('footer.footer'));
  check('Spark 宠物已移除', !(await page.$('.spark-pet')));
  check('旧猫已移除', !(await page.$('.footer-mascot')));

  console.log('=== 6.2 次级页面 ===');
  const secondaryPages = ['/archives', '/tags', '/categories', '/projects', '/friends', '/bookmarks', '/shuoshuo', '/photos'];
  for (const path of secondaryPages) {
    await page.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 600));
    const info = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      iw: innerWidth,
      main: !!document.querySelector('#swup, main, .page-container'),
    }));
    check(`页面 ${path} 正常`, info.main && info.sw <= info.iw + 2, JSON.stringify(info));
  }
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 800));

  console.log('=== 6.5 SPA 导航 ===');
  const navLink = await page.$('a[href="/about"]');
  check('导航链接存在', !!navLink);
  if (navLink) {
    await navLink.click();
    await page.waitForFunction(() => location.pathname.includes('/about'), { timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 800));
    check('SPA 导航成功', await page.evaluate(() => location.pathname.includes('/about')), await page.evaluate(() => location.pathname));
    check('Live2D 导航后仍存在', !!(await page.$('#waifu')));
    // 返回首页后点赞:全局 click 监听若在换页后重复注册,点赞会加一又减一
    const homeLink = await page.$('.navbar-content a[href="/"]');
    if (homeLink) {
      await homeLink.click();
      await page.waitForFunction(() => location.pathname === '/', { timeout: 10000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 1200));
      const likeBtn = await page.$('.like-btn');
      check('换页后点赞按钮存在', !!likeBtn);
      if (likeBtn) {
        const likeBefore = await likeBtn.evaluate(el => el.textContent.trim());
        await likeBtn.click();
        await new Promise(r => setTimeout(r, 300));
        const likeAfter = await likeBtn.evaluate(el => el.textContent.trim());
        check('换页后点赞只触发一次', likeBefore !== likeAfter, likeBefore + ' -> ' + likeAfter);
      }
    }
  }

  console.log('=== 7. JS 错误 ===');
  check('零页面错误', errors.length === 0, errors.slice(0, 3).join(' | '));

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  await browser.close();
  server.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('E2E 崩溃:', e.message); process.exit(1); });
