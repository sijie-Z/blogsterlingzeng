/* 交互细节回归:真实布局边界、联系方式、音乐、宠物与主题切换 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const puppeteer = require('puppeteer-core');
const { startServer } = require('./static-server');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.PORT || 4140);
const BASE = process.env.BASE || `http://127.0.0.1:${PORT}`;
const ROOT = path.join(__dirname, '..');
const PRIMARY = '19150649985@163.com';
const BACKUP = '1683039482@qq.com';
const ARTICLE = '/2026/10/23/hexo-series-reading-path/';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let pass = 0;
let fail = 0;

function check(name, condition, extra) {
  if (condition) {
    pass++;
    console.log('  PASS', name);
  } else {
    fail++;
    console.log('  FAIL', name, extra || '');
  }
}

function count(text, needle) {
  return text.split(needle).length - 1;
}

(async () => {
  const server = await startServer(PORT);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--no-proxy-server', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', error => errors.push(error.message.slice(0, 180)));
  page.on('request', request => requests.push(request.url()));

  async function reset(width = 1440, height = 900, reduced = false) {
    await page.setViewport({ width, height });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }]);
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.evaluate(() => {
      localStorage.setItem('blog-season', 'auto');
      localStorage.setItem('cj-pet', 'off');
      localStorage.setItem('waifu-disabled', 'true');
      localStorage.setItem('REDEFINE-THEME-STATUS', JSON.stringify({ isDark: false }));
    });
    await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await sleep(250);
  }

  async function waitTheme() {
    await page.waitForFunction(() => !document.documentElement.hasAttribute('data-theme-switching'), { timeout: 8000 });
    await sleep(60);
  }

  try {
    console.log('=== 1. 静态产物与补丁幂等边界 ===');
    const homeHtml = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
    const resumeHtml = fs.readFileSync(path.join(ROOT, 'public/resume/index.html'), 'utf8');
    const typedSource = fs.readFileSync(path.join(ROOT, 'public/js/plugins/typed.js'), 'utf8');
    const typedBuild = fs.readFileSync(path.join(ROOT, 'public/js/build/plugins/typed.js'), 'utf8');
    check('公开联系区块有且仅有一对 email_off 标记', count(homeHtml, '<!--email_off-->') === 1 && count(homeHtml, '<!--/email_off-->') === 1);
    check('构建 HTML 不含邮箱保护占位', !/data-cfemail|email-protection#|\[email protected\]/.test(homeHtml + resumeHtml));
    check('简历以 163 优先、QQ 备用', resumeHtml.includes(`Email：[${PRIMARY}](mailto:${PRIMARY})（优先）`) || (resumeHtml.indexOf(PRIMARY) < resumeHtml.indexOf(BACKUP) && resumeHtml.includes(`mailto:${BACKUP}`)));
    check('Typed 源文件只有一份 reduced-motion 守卫', count(typedSource, 'if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)') === 1);
    check('Typed 构建文件只有一份 reduced-motion 守卫', count(typedBuild, 'if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)') === 1);
    check('首屏只保留一组 inject head 区块', count(homeHtml, '/css/custom.css?v=') === 1 && count(homeHtml, '/js/custom.js?v=') === 1);
    check('音乐文件已部署且播放器无定时加载器', fs.statSync(path.join(ROOT, 'public/music/123.mp3')).size > 2000000 && !homeHtml.includes('setTimeout(load, 12000)'));

    const fixtureRoot = path.join(ROOT, 'test/fixtures/redefine-2.9.0');
    const freshRoot = path.join(ROOT, '.scratch/theme-patch-fresh');
    const freshFiles = ['source/js/utils/sideTools.js', 'source/js/build/utils/sideTools.js'];
    for (const relative of freshFiles) {
      const target = path.join(freshRoot, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(fixtureRoot, relative), target);
    }
    const patchEnv = { ...process.env, CJ_THEME_ROOT: freshRoot };
    const firstPatch = cp.spawnSync(process.execPath, ['scripts/theme-patch.js'], { cwd: ROOT, env: patchEnv, encoding: 'utf8' });
    check('Redefine 原始文件可按顺序完成补丁', firstPatch.status === 0, (firstPatch.stdout || '') + (firstPatch.stderr || ''));
    const firstOutputs = freshFiles.map(relative => fs.readFileSync(path.join(freshRoot, relative), 'utf8'));
    const freshSyntax = freshFiles.every(relative => cp.spawnSync(process.execPath, ['--check', path.join(freshRoot, relative)], { encoding: 'utf8' }).status === 0);
    check('全新安装不会重新引用已移除的播放器变量', freshSyntax && firstOutputs.every(content => !/\baplayer\b/.test(content)), firstOutputs.map(content => (content.match(/aplayer/g) || []).length).join(','));
    const secondPatch = cp.spawnSync(process.execPath, ['scripts/theme-patch.js'], { cwd: ROOT, env: patchEnv, encoding: 'utf8' });
    const secondOutputs = freshFiles.map(relative => fs.readFileSync(path.join(freshRoot, relative), 'utf8'));
    check('原始文件重复打补丁结果完全一致', secondPatch.status === 0 && secondOutputs.every((content, index) => content === firstOutputs[index]));

    console.log('=== 2. 桌面首屏与可见联系方式 ===');
    await reset();
    const hero = await page.evaluate(() => {
      const rect = selector => document.querySelector(selector)?.getBoundingClientRect().toJSON();
      const overlap = (a, b) => a && b && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
      const banner = rect('.home-banner-container');
      const controls = rect('.home-banner-container .absolute.bottom-0\\.5');
      const description = rect('.home-banner-container .description');
      const identity = rect('.home-hero-identity');
      const cta = rect('.home-hero-cta');
      const content = rect('.home-banner-container .content');
      const email = document.querySelector('.home-hero-email');
      return {
        banner, controls, description, identity, cta, content,
        overlaps: [description, identity, cta].map(item => overlap(controls, item)),
        leftAligned: [description, identity, cta].every(item => Math.abs(item.left - description.left) <= 1),
        emailText: email?.textContent.trim(),
        emailHref: email?.getAttribute('href'),
        emailLabel: email?.getAttribute('aria-label'),
        emailTitle: email?.getAttribute('title'),
        arrowTag: document.querySelector('.home-scroll-down')?.tagName,
        arrowName: document.querySelector('.home-scroll-down')?.getAttribute('aria-label'),
      };
    });
    check('首屏邮件入口紧凑且保留真实地址', !hero.emailText && hero.emailHref === `mailto:${PRIMARY}` && hero.emailLabel.includes(PRIMARY) && hero.emailTitle === PRIMARY);
    check('底部控件完整位于首屏内', hero.controls.left >= hero.banner.left - 1 && hero.controls.right <= hero.banner.right + 1 && hero.controls.bottom <= hero.banner.bottom + 1, JSON.stringify(hero.controls));
    check('底部控件不遮标题、身份或 CTA', hero.overlaps.every(value => !value), JSON.stringify(hero.overlaps));
    check('标题、身份与 CTA 左边缘一致', hero.leftAligned);
    check('桌面内容容器与首屏底部对齐', Math.abs(hero.content.bottom - hero.banner.bottom) <= 1, JSON.stringify(hero.content));
    check('下箭头是具名原生按钮', hero.arrowTag === 'BUTTON' && !!hero.arrowName);
    const footerContact = await page.$eval('.footer-extra-icons a[href^="mailto:"]', element => ({ label: element.getAttribute('aria-label'), title: element.getAttribute('title'), href: element.getAttribute('href') }));
    check('页脚邮件图标保留真实地址且无重复文字行', footerContact.label.includes(PRIMARY) && footerContact.title === PRIMARY && footerContact.href === `mailto:${PRIMARY}` && !(await page.$('.footer-contact')));

    await page.click('.nb-theme-btn');
    await page.waitForFunction(() => document.querySelector('.nb-dropdown').classList.contains('show'));
    const season = await page.evaluate(() => {
      const auto = document.querySelector('.nb-opt[data-season="auto"]');
      const space = document.querySelector('.nb-opt[data-season="space"]');
      const rect = document.querySelector('.nb-dropdown').getBoundingClientRect();
      return {
        auto: auto.textContent,
        hasSpace: !!space,
        optionCount: [...document.querySelectorAll('.nb-opt')].filter(element => getComputedStyle(element).display !== 'none').length,
        inside: rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight,
      };
    });
    check('默认模式保留说明且固定太空站已移除', season.auto.includes('浅色太空站，深色雨夜') && !season.hasSpace && season.optionCount === 6);
    check('季节菜单完整位于视口内', season.inside);
    await page.keyboard.press('Escape');
    check('Escape 关闭菜单并归还焦点', await page.evaluate(() => !document.querySelector('.nb-dropdown').classList.contains('show') && document.activeElement === document.querySelector('.nb-theme-btn')));
    await page.click('.nb-timer-btn');
    await page.click('.nb-theme-btn');
    const themeOverTimer = await page.evaluate(() => !document.querySelector('.nb-timer-panel').classList.contains('show') && document.querySelector('.nb-dropdown').classList.contains('show'));
    await page.click('.nb-timer-btn');
    const timerOverTheme = await page.evaluate(() => document.querySelector('.nb-timer-panel').classList.contains('show') && !document.querySelector('.nb-dropdown').classList.contains('show'));
    check('季节与计时器面板互斥打开', themeOverTimer && timerOverTheme);
    await page.keyboard.press('Escape');

    console.log('=== 3. 响应式几何边界 ===');
    for (const [width, height] of [[320, 568], [390, 844], [769, 700], [900, 700]]) {
      await reset(width, height);
      const result = await page.evaluate(() => {
        const rect = selector => document.querySelector(selector)?.getBoundingClientRect().toJSON();
        const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
        const controls = rect('.home-banner-container .absolute.bottom-0\\.5');
        const description = rect('.home-banner-container .description');
        const identity = rect('.home-hero-identity');
        const cta = rect('.home-hero-cta');
        const banner = rect('.home-banner-container');
        return {
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          outside: controls.left < -1 || controls.right > innerWidth + 1 || controls.bottom > banner.bottom + 1,
          overlaps: [description, identity, cta].some(item => overlap(controls, item)),
          emailText: document.querySelector('.home-hero-email')?.textContent.trim(),
          emailHref: document.querySelector('.home-hero-email')?.getAttribute('href'),
        };
      });
      check(`${width}px 首屏无溢出、遮挡且邮件入口紧凑`, !result.overflow && !result.outside && !result.overlaps && !result.emailText && result.emailHref === `mailto:${PRIMARY}`, JSON.stringify(result));
    }

    console.log('=== 4. 文章侧栏与简历 ===');
    for (const width of [881, 1024, 1440]) {
      await page.setViewport({ width, height: 900 });
      await page.goto(`${BASE}${ARTICLE}`, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(250);
      const side = await page.evaluate(primary => {
        const card = document.querySelector('.post-side-author-card').getBoundingClientRect();
        const actions = [...document.querySelectorAll('.post-side-author-links > *')].map(element => ({ rect: element.getBoundingClientRect().toJSON() }));
        const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
        const email = document.querySelector('.post-side-author-links a[href^="mailto:"]');
        return {
          count: actions.length,
          outside: actions.some(({ rect }) => rect.left < card.left - 1 || rect.right > card.right + 1),
          overlaps: actions.some((item, index) => actions.slice(index + 1).some(other => overlap(item.rect, other.rect))),
          label: email?.getAttribute('aria-label'),
          title: email?.getAttribute('title'),
          href: email?.getAttribute('href'),
          hasEmailLine: !!document.querySelector('.post-side-email'),
        };
      }, PRIMARY);
      check(`${width}px 侧栏操作不裁切、不重叠`, side.count === 6 && !side.outside && !side.overlaps, JSON.stringify(side));
      check(`${width}px 侧栏邮件图标保留真实地址且无重复行`, side.label.includes(PRIMARY) && side.title === PRIMARY && side.href === `mailto:${PRIMARY}` && !side.hasEmailLine);
    }

    await page.goto(`${BASE}/resume/`, { waitUntil: 'networkidle2' });
    const resume = await page.evaluate(() => ({
      text: document.querySelector('.resume-page').textContent,
      primary: document.querySelector('a[href="mailto:19150649985@163.com"]')?.textContent,
      backup: document.querySelector('a[href="mailto:1683039482@qq.com"]')?.textContent,
    }));
    check('在线简历可见地址与链接一致', resume.text.includes(`Email：${PRIMARY}（优先）`) && resume.text.includes(`备用邮箱：${BACKUP}`) && resume.primary === PRIMARY && resume.backup === BACKUP);
    await page.goto(`${BASE}/about/`, { waitUntil: 'networkidle2' });
    const about = await page.evaluate(() => document.querySelector('.page-template-content').textContent);
    check('关于页同样以 163 优先、QQ 备用', about.includes(PRIMARY) && about.includes('（优先）') && about.includes('备用邮箱') && about.includes(BACKUP));

    console.log('=== 5. 音乐按需加载与真实播放 ===');
    await reset();
    check('首屏未请求播放器或 MP3', !requests.some(url => /APlayer\.min\.js|plugins\/aplayer\.js|123\.mp3/.test(url)));
    check('音乐入口在桌面可见', await page.$eval('#music-toggle', element => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.bottom <= innerHeight;
    }));
    await page.click('#music-toggle');
    await page.waitForFunction(() => !!window.__cjAPlayer, { timeout: 10000 });
    const loaded = await page.evaluate(() => {
      const player = window.__cjAPlayer;
      const pic = player.template.pic;
      return {
        narrow: player.container.classList.contains('aplayer-narrow'),
        hidden: player.container.classList.contains('hide'),
        pointer: getComputedStyle(pic).pointerEvents,
        paused: player.audio.paused,
        preload: player.audio.preload,
        role: pic.getAttribute('role'),
        tabIndex: pic.tabIndex,
        name: pic.getAttribute('aria-label'),
        mp3: performance.getEntriesByType('resource').some(entry => entry.name.includes('123.mp3')),
      };
    });
    check('播放器紧凑、可点且不会自动播放', loaded.narrow && !loaded.hidden && loaded.pointer === 'auto' && loaded.paused && loaded.preload === 'none');
    check('播放器初始化不请求 MP3', !loaded.mp3 && !requests.some(url => url.includes('123.mp3')));
    check('音乐封面支持键盘与播放状态名称', loaded.role === 'button' && loaded.tabIndex === 0 && loaded.name === '播放背景音乐');
    await page.click('.aplayer-pic');
    await page.waitForFunction(() => !window.__cjAPlayer.audio.paused, { timeout: 5000 });
    check('真实点击封面开始播放并请求音频', requests.some(url => url.includes('123.mp3')));
    await page.click('.aplayer-pic');
    await page.waitForFunction(() => window.__cjAPlayer.audio.paused, { timeout: 5000 });
    check('再次真实点击暂停且更新无障碍状态', await page.$eval('.aplayer-pic', element => element.getAttribute('aria-label') === '播放背景音乐' && element.getAttribute('aria-pressed') === 'false'));
    await page.click('.aplayer-miniswitcher button');
    await page.focus('.aplayer-icon-play');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !window.__cjAPlayer.audio.paused, { timeout: 5000 });
    check('展开播放器的 span 控件支持键盘', await page.$eval('.aplayer-icon-play, .aplayer-icon-pause', element => element.getAttribute('role') === 'button' && element.tabIndex === 0 && !!element.getAttribute('aria-label')));
    await page.evaluate(() => window.__cjAPlayer.pause());
    const mediaRequestCount = requests.filter(url => /APlayer\.min\.js|plugins\/aplayer\.js|123\.mp3/.test(url)).length;
    await page.evaluate(() => { window.__cjPlayerBeforeCollapse = window.__cjAPlayer; });
    await page.click('#music-collapse');
    check('播放器可收起为音乐按钮并暂停', await page.evaluate(() => {
      const root = document.getElementById('aplayer');
      const launcher = document.getElementById('music-toggle');
      return root.classList.contains('cj-music-collapsed') && getComputedStyle(root).display === 'none' && window.__cjAPlayer.audio.paused && !!launcher && document.activeElement === launcher;
    }));
    await page.click('#music-toggle');
    await page.waitForFunction(() => !document.getElementById('aplayer').classList.contains('cj-music-collapsed') && !!document.getElementById('music-collapse'));
    check('重新打开复用实例且不重复下载或自动播放', await page.evaluate(() => {
      return window.__cjAPlayer === window.__cjPlayerBeforeCollapse && window.__cjAPlayer.audio.paused && !document.getElementById('music-toggle');
    }) && requests.filter(url => /APlayer\.min\.js|plugins\/aplayer\.js|123\.mp3/.test(url)).length === mediaRequestCount);
    await page.evaluate(() => document.querySelector('a[href="/about"], a[href="/about/"]').click());
    await page.waitForFunction(() => /^\/about\/?$/.test(location.pathname) && !!window.__cjAPlayer);
    check('SPA 后播放器保留且无重复入口', await page.evaluate(() => document.querySelectorAll('#aplayer').length === 1 && !document.getElementById('music-toggle')));
    check('播放器与宠物入口互不遮挡', await page.evaluate(() => {
      const pet = document.getElementById('pet-toggle').getBoundingClientRect();
      return ['.aplayer-pic', '#music-collapse'].every(selector => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        const x = Math.min(rect.right, pet.right) - Math.max(rect.left, pet.left);
        const y = Math.min(rect.bottom, pet.bottom) - Math.max(rect.top, pet.top);
        return x <= 0 || y <= 0;
      });
    }));

    await reset(390, 844);
    const mobileDarkBefore = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    await page.click('.nb-dark-btn');
    await page.waitForFunction(before => document.documentElement.classList.contains('dark') !== before, { timeout: 8000 }, mobileDarkBefore);
    check('手机可直接切换明暗且无横向溢出', await page.evaluate(expected => {
      const button = document.querySelector('.nb-dark-btn');
      const label = document.documentElement.classList.contains('dark') ? '切换到浅色模式' : '切换到深色模式';
      return button.getAttribute('aria-label') === label && button.getBoundingClientRect().width > 0 && document.querySelector('.nb-timer-btn').getBoundingClientRect().width === 0 && document.documentElement.scrollWidth <= innerWidth + 1 && document.documentElement.classList.contains('dark') !== expected;
    }, mobileDarkBefore));
    await waitTheme();
    await page.click('.nb-dark-btn');
    await page.waitForFunction(before => document.documentElement.classList.contains('dark') === before, { timeout: 8000 }, mobileDarkBefore);
    await waitTheme();
    await page.click('.nb-theme-btn');
    await page.waitForFunction(() => document.querySelector('.nb-dropdown').classList.contains('show'));
    await sleep(300);
    check('手机设置菜单提供音乐入口且无固定控件', await page.evaluate(() => {
      const action = document.querySelector('.nb-music-action');
      const visibleOptions = [...document.querySelectorAll('.nb-opt')].filter(element => getComputedStyle(element).display !== 'none').length;
      return getComputedStyle(action).display === 'flex' && visibleOptions === 7 && !document.getElementById('music-toggle') && !document.getElementById('music-collapse');
    }));
    await page.click('.nb-music-action');
    await page.waitForFunction(() => !!window.__cjAPlayer, { timeout: 10000 });
    check('手机初始化不显示悬浮播放器且不自动播放', await page.evaluate(() => getComputedStyle(document.getElementById('aplayer')).display === 'none' && window.__cjAPlayer.audio.paused && !document.getElementById('music-toggle') && !document.getElementById('music-collapse')));
    await page.click('.nb-theme-btn');
    await page.waitForFunction(() => document.querySelector('.nb-dropdown').classList.contains('show'));
    await sleep(300);
    await page.click('.nb-music-action');
    await page.waitForFunction(() => !window.__cjAPlayer.audio.paused, { timeout: 5000 });
    check('手机菜单内播放后显示暂停动作', await page.$eval('.nb-music-action', element => element.getAttribute('aria-label') === '暂停背景音乐' && element.getAttribute('aria-pressed') === 'true'));
    await page.click('.nb-theme-btn');
    await page.waitForFunction(() => document.querySelector('.nb-dropdown').classList.contains('show'));
    await sleep(300);
    await page.click('.nb-music-action');
    await page.waitForFunction(() => window.__cjAPlayer.audio.paused, { timeout: 5000 });
    check('手机再次点击暂停且不产生悬浮控件', await page.evaluate(() => window.__cjAPlayer.audio.paused && getComputedStyle(document.getElementById('aplayer')).display === 'none' && !document.getElementById('music-toggle') && !document.getElementById('music-collapse')));

    console.log('=== 6. 宠物滚动可见 ===');
    await reset();
    await page.evaluate(() => window.scrollTo(0, 600));
    await sleep(900);
    check('未召唤时入口也不会随下滚消失', await page.$eval('#pet-toggle', element => {
      const style = getComputedStyle(element);
      return style.visibility !== 'hidden' && Number(style.opacity) > 0 && style.pointerEvents !== 'none';
    }));
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(900);
    await page.click('#pet-toggle');
    await page.waitForFunction(() => !!window.__l2dApp, { timeout: 18000 });
    const petErrorCount = errors.length;
    await page.evaluate(() => {
      for (let index = 0; index < 20; index++) {
        document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 80 + index, clientY: 120 + index }));
        document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 80 + index, clientY: 120 + index }));
      }
    });
    check('模型初始化期间鼠标与触摸事件安全', errors.length === petErrorCount, errors.slice(petErrorCount).join(' | '));
    await page.waitForFunction(() => document.querySelector('#waifu.waifu-active'), { timeout: 18000 });
    await page.evaluate(() => window.scrollTo(0, 800));
    await sleep(120);
    const petScrolling = await page.evaluate(() => {
      const waifu = document.getElementById('waifu');
      return {
        visible: getComputedStyle(waifu).visibility !== 'hidden' && Number(getComputedStyle(waifu).opacity) > 0,
        reading: waifu.classList.contains('waifu-reading'),
        paused: !!window.__l2dPaused,
      };
    });
    check('大肥鱼下滚仍可见且不再加隐藏类', petScrolling.visible && !petScrolling.reading, JSON.stringify(petScrolling));
    check('滚动只暂停宠物渲染', petScrolling.paused);
    await sleep(1400);
    check('停止滚动后宠物恢复渲染且仍可见', await page.evaluate(() => {
      const waifu = document.getElementById('waifu');
      return !window.__l2dPaused && typeof window.__l2dApp._drawFrameId === 'number' && Number(getComputedStyle(waifu).opacity) > 0;
    }));

    console.log('=== 7. 明暗语义、快速连点与减少动画 ===');
    await reset(1524, 900);
    const autoLight = await page.evaluate(() => [...document.querySelectorAll('.home-banner-background img')].filter(image => getComputedStyle(image).display !== 'none').map(image => image.currentSrc));
    check('默认浅色使用太空站横幅', autoLight.some(url => url.includes('banner-light')));
    await page.evaluate(() => document.querySelector('.tool-dark-light-toggle').click());
    await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
    await waitTheme();
    const autoDark = await page.evaluate(() => [...document.querySelectorAll('.home-banner-background img')].filter(image => getComputedStyle(image).display !== 'none').map(image => image.currentSrc));
    check('默认深色改用雨夜横幅', autoDark.some(url => url.includes('banner-dark')));
    await page.evaluate(() => localStorage.setItem('blog-season', 'space'));
    await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    const legacyState = await page.evaluate(() => ({
      season: document.documentElement.dataset.season,
      images: [...document.querySelectorAll('.home-banner-background img')].filter(image => getComputedStyle(image).display !== 'none').map(image => image.currentSrc),
    }));
    check('旧 space 设置回退默认并保持深色雨夜', legacyState.season === 'auto' && legacyState.images.some(url => url.includes('banner-dark')), JSON.stringify(legacyState));

    await page.setViewport({ width: 1366, height: 900 });
    check('1366px 笔记本也有可见明暗按钮', await page.$eval('.nb-dark-btn', element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.pointerEvents !== 'none';
    }));
    await page.setViewport({ width: 1524, height: 900 });
    await page.evaluate(() => {
      const original = document.startViewTransition.bind(document);
      window.__cjOriginalVT = original;
      document.startViewTransition = callback => original(() => new Promise(resolve => {
        setTimeout(() => { callback(); resolve(); }, 60);
      }));
    });
    await page.waitForFunction(() => document.querySelector('.nb-dark-btn').getBoundingClientRect().width > 0);
    const darkBefore = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    const toggleRect = await page.$eval('.nb-dark-btn', element => element.getBoundingClientRect().toJSON());
    for (let index = 0; index < 3; index++) {
      await page.mouse.click(toggleRect.left + toggleRect.width / 2, toggleRect.top + toggleRect.height / 2);
      await sleep(25);
    }
    await waitTheme();
    const rapidState = expected => page.evaluate(expectedValue => {
      const dark = document.documentElement.classList.contains('dark');
      const stored = JSON.parse(localStorage.getItem('REDEFINE-THEME-STATUS') || '{}');
      return {
        dark,
        body: document.body.classList.contains('dark-mode'),
        stored: stored.isDark,
        icon: !!document.querySelector('.tool-dark-light-toggle i')?.className.includes(dark ? 'brightness' : 'moon'),
        active: !!window.__cjThemeMotion?.active,
        attr: document.documentElement.hasAttribute('data-theme-switching'),
        expected: dark === expectedValue && document.body.classList.contains('dark-mode') === expectedValue && stored.isDark === expectedValue,
      };
    }, expected);
    let state = await rapidState(!darkBefore);
    check('三次快速真实点击以最后一次为准', state.expected && state.icon && !state.active && !state.attr, JSON.stringify(state));
    for (let index = 0; index < 4; index++) {
      await page.mouse.click(toggleRect.left + toggleRect.width / 2, toggleRect.top + toggleRect.height / 2);
      await sleep(25);
    }
    await waitTheme();
    state = await rapidState(darkBefore);
    check('偶数次连点回到原主题且无残留', state.expected && state.icon && !state.active && !state.attr, JSON.stringify(state));

    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.evaluate(() => {
      document.startViewTransition = window.__cjOriginalVT;
      window.__cjVtCount = 0;
      const original = document.startViewTransition.bind(document);
      document.startViewTransition = callback => { window.__cjVtCount++; return original(callback); };
    });
    const beforeReduced = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    await page.evaluate(() => document.querySelector('.tool-dark-light-toggle').click());
    await sleep(150);
    check('减少动画时立即切换且不启动 View Transition', await page.evaluate(before => window.__cjVtCount === 0 && document.documentElement.classList.contains('dark') !== before && !document.documentElement.hasAttribute('data-theme-switching'), beforeReduced));

    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    await page.evaluate(() => { document.startViewTransition = window.__cjOriginalVT; });
    const petButton = await page.$('#pet-toggle');
    if (petButton) await petButton.click();
    await page.waitForFunction(() => !!window.__l2dApp && document.querySelector('#waifu.waifu-active'), { timeout: 18000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(1400);
    await page.evaluate(() => document.querySelector('.tool-dark-light-toggle').click());
    await sleep(40);
    const themePetPause = await page.evaluate(() => ({ flag: !!window.__l2dThemePaused, frame: window.__l2dApp._drawFrameId }));
    check('明暗快照期间暂停宠物渲染', themePetPause.flag && themePetPause.frame === null, JSON.stringify(themePetPause));
    await waitTheme();
    await sleep(1400);
    check('切换结束后只恢复一个渲染循环', await page.evaluate(() => !window.__l2dThemePaused && typeof window.__l2dApp._drawFrameId === 'number'));

    console.log('=== 8. 写入失败与网络恢复 ===');
    const blocked = await browser.newPage();
    blocked.on('pageerror', error => errors.push(error.message.slice(0, 180)));
    await blocked.setViewport({ width: 1440, height: 900 });
    await blocked.evaluateOnNewDocument(() => {
      const originalSet = Storage.prototype.setItem;
      originalSet.call(localStorage, 'blog-season', 'winter');
      originalSet.call(localStorage, 'cj-read-size', 's');
      Storage.prototype.setItem = function () { throw new Error('writes blocked'); };
      Storage.prototype.removeItem = function () { throw new Error('removes blocked'); };
    });
    await blocked.goto(`${BASE}${ARTICLE}`, { waitUntil: 'networkidle2', timeout: 30000 });
    await blocked.click('.read-size-btn[data-read-size="l"]');
    await blocked.click('.nb-theme-btn');
    await blocked.waitForFunction(() => document.querySelector('.nb-dropdown').classList.contains('show'));
    await sleep(300);
    await blocked.click('.nb-opt[data-season="summer"]');
    await blocked.waitForFunction(() => document.documentElement.dataset.season === 'summer');
    await blocked.evaluate(() => window.swup?.navigate('/about/'));
    await blocked.waitForFunction(() => /^\/about\/?$/.test(location.pathname), { timeout: 8000 });
    check('写入失败时新季节不被可读旧值覆盖', await blocked.evaluate(() => localStorage.getItem('blog-season') === 'winter' && window.__cjStorageFallback['blog-season'] === 'summer' && document.documentElement.dataset.season === 'summer'));
    check('写入失败时新阅读字号不被旧值覆盖', await blocked.evaluate(() => localStorage.getItem('cj-read-size') === 's' && window.__cjPrefs['cj-read-size'] === 'l' && document.documentElement.dataset.readSize === 'l'));
    await blocked.close();

    const retry = await browser.newPage();
    retry.on('pageerror', error => errors.push(error.message.slice(0, 180)));
    await retry.setViewport({ width: 1440, height: 900 });
    await retry.setRequestInterception(true);
    let previewCalls = 0;
    retry.on('request', request => {
      if (request.url().endsWith('/link-preview.json')) {
        previewCalls++;
        if (previewCalls === 1) request.respond({ status: 500, contentType: 'application/json', body: '{}' });
        else request.continue();
      } else request.continue();
    });
    await retry.goto(`${BASE}/2026/10/23/static-assets-cleanup/`, { waitUntil: 'networkidle2', timeout: 30000 });
    await retry.waitForFunction(() => window.__cj_once_linkPreviews === true, { timeout: 10000 });
    const hoverPreview = async () => {
      await retry.evaluate(() => {
        const link = [...document.querySelectorAll('.article-content a[href^="/"]')].find(element => element.getAttribute('href').includes('font-subset'));
        link.scrollIntoView({ block: 'center' });
      });
      await sleep(400);
      await retry.evaluate(() => {
        const link = [...document.querySelectorAll('.article-content a[href^="/"]')].find(element => element.getAttribute('href').includes('font-subset'));
        link.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }));
      });
    };
    const failedResponse = retry.waitForResponse(response => response.url().endsWith('/link-preview.json'), { timeout: 10000 });
    await hoverPreview();
    await failedResponse;
    await sleep(100);
    const failedVisible = await retry.$eval('.link-preview-card', element => element.classList.contains('show')).catch(() => false);
    await retry.evaluate(() => {
      const link = [...document.querySelectorAll('.article-content a[href^="/"]')].find(element => element.getAttribute('href').includes('font-subset'));
      link.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
    });
    await hoverPreview();
    await sleep(900);
    const recovered = await retry.$eval('.link-preview-card', element => element.classList.contains('show') && element.querySelector('.lp-title').textContent.trim().length > 0).catch(() => false);
    check('预览请求一次 500 后会在下次悬停重试', previewCalls >= 2 && !failedVisible && recovered, JSON.stringify({ previewCalls, failedVisible, recovered }));
    await retry.close();

    check('全流程无页面 JavaScript 错误', errors.length === 0, errors.join(' | '));
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail ? 1 : 0);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
