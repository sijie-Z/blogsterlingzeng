/* 次级页面结构与语义：标签/分类排序、说说日期、站点视觉兜底、归档元数据 */
'use strict';

const puppeteer = require('puppeteer-core');
const { startServer } = require('./static-server');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.PORT || 4330);
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

  console.log('=== 1. 标签页 ===');
  await page.goto(`${BASE}/tags/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(800);
  const tags = await page.evaluate(() => {
    const intro = document.querySelector('.taxonomy-intro');
    const cloud = document.querySelector('.tagcloud-content');
    const chips = [...document.querySelectorAll('.tag-list a')];
    const weights = chips.map(a => Number(a.dataset.weight));
    return {
      introBeforeCloud: !!(intro && cloud && (intro.compareDocumentPosition(cloud) & Node.DOCUMENT_POSITION_FOLLOWING)),
      sorted: weights.every((w, i) => i === 0 || weights[i - 1] >= w),
      blurred: chips.some(a => getComputedStyle(a).filter !== 'none'),
      count: chips.length,
      stats: document.querySelector('.taxonomy-stats')?.textContent || '',
      active: document.querySelectorAll('.tag-list a').length,
    };
  });
  check('标签页引导语在标签云之前', tags.introBeforeCloud);
  check('标签按文章数降序排列', tags.sorted && tags.count > 20, `count=${tags.count}`);
  check('标签胶囊不再按权重模糊', !tags.blurred);
  check('标签页显示文章与标签统计', /篇文章/.test(tags.stats) && /个标签/.test(tags.stats), tags.stats);

  console.log('=== 2. 分类页 ===');
  await page.goto(`${BASE}/categories/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(600);
  const cats = await page.evaluate(() => {
    const intro = document.querySelector('.taxonomy-intro');
    const list = document.querySelector('.all-category-list');
    const counts = [...document.querySelectorAll('.all-category-list-count')].map(el => Number(el.textContent.trim()));
    const items = [...document.querySelectorAll('.all-category-list-item')];
    return {
      introBeforeList: !!(intro && list && (intro.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING)),
      sorted: counts.every((n, i) => i === 0 || counts[i - 1] >= n),
      grid: list ? getComputedStyle(list).display : '',
      fullWidth: items.every(li => li.getBoundingClientRect().width > 300),
      stats: document.querySelector('.taxonomy-stats')?.textContent || '',
    };
  });
  check('分类页引导语在列表之前', cats.introBeforeList);
  check('分类按文章数降序排列', cats.sorted, JSON.stringify(cats));
  check('分类卡片两列铺满可用宽度', cats.grid === 'grid' && cats.fullWidth, JSON.stringify(cats));
  check('分类页显示文章与分类统计', /篇文章/.test(cats.stats) && /个分类/.test(cats.stats), cats.stats);

  console.log('=== 3. 说说页 ===');
  await page.goto(`${BASE}/shuoshuo/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(900);
  const essays = await page.evaluate(() => ({
    ids: document.querySelectorAll('#shuoshuo-content').length,
    loading: document.body.textContent.includes('Loading Date'),
    dates: [...document.querySelectorAll('.essay-date')].map(el => el.textContent.trim()),
  }));
  check('说说页 id 唯一', essays.ids === 1, String(essays.ids));
  check('说说页没有 Loading Date 占位符', !essays.loading);
  check('说说页日期已格式化', essays.dates.length > 0 && essays.dates.every(d =>
    /^\d{4}年\d{1,2}月\d{1,2}日$/.test(d) || /^\d{4}\/\d{2}\/\d{2}$/.test(d) || /^\d+\s*(天|小时|分钟)前$/.test(d)
  ), JSON.stringify(essays.dates.slice(0, 2)));
  const rawEssays = await fetch(`${BASE}/shuoshuo/`).then(r => r.text());
  check('说说页静态 HTML 已写入日期', !rawEssays.includes('Loading Date') && /\d{4}年\d{1,2}月\d{1,2}日/.test(rawEssays));

  console.log('=== 4. 站点视觉 ===');
  await page.goto(`${BASE}/photos/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1500);
  const photos = await page.evaluate(() => ({
    title: document.querySelector('h1')?.textContent.trim() || '',
    intro: !!document.querySelector('.photos-intro'),
    masonry: document.querySelectorAll('.masonry-item').length,
    staticFallback: document.querySelectorAll('.photos-static-fallback .photos-static-item').length,
    noscript: !!document.querySelector('noscript'),
  }));
  check('站点视觉标题正确', photos.title === '站点视觉', photos.title);
  check('站点视觉有导语', photos.intro);
  check('站点视觉画廊正常加载', photos.masonry === 6, String(photos.masonry));
  check('站点视觉有无脚本静态兜底', photos.staticFallback === 6 && photos.noscript, JSON.stringify(photos));
  const photosFooter = await page.evaluate(() => {
    const footer = document.querySelector('footer.footer');
    const info = footer?.querySelector('.info-container');
    return { hidden: footer?.classList.contains('footer-hidden'), opacity: info ? getComputedStyle(info).opacity : null };
  });
  check('短页面页脚保持可见', !photosFooter.hidden && photosFooter.opacity === '1', JSON.stringify(photosFooter));

  console.log('=== 5. 归档元数据与语义 ===');
  await page.goto(`${BASE}/archives/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(900);
  const archive = await page.evaluate(() => ({
    description: document.querySelector('meta[name="description"]')?.content || '',
    ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
    h3: document.querySelectorAll('.archive-row h3.article-title').length,
    rows: document.querySelectorAll('.archive-row').length,
    paginator: !!document.querySelector('.paginator'),
  }));
  check('归档 meta 描述是页面自己的', /归档/.test(archive.description), archive.description);
  check('归档 og:title 是页面标题', archive.ogTitle === '归档', archive.ogTitle);
  check('归档文章标题使用 h3', archive.h3 === archive.rows && archive.rows >= 20, JSON.stringify({ h3: archive.h3, rows: archive.rows }));
  check('归档没有多余分页器', !archive.paginator);

  console.log('=== 6. 其他页面语义 ===');
  await page.goto(`${BASE}/about/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(500);
  const about = await page.evaluate(() => [...document.querySelectorAll('hr')].some(hr => hr.nextElementSibling && hr.nextElementSibling.tagName === 'HR'));
  check('关于页没有连续分隔线', !about);

  await page.goto(`${BASE}/friends/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(500);
  const friendsH2 = await page.evaluate(() => [...document.querySelectorAll('main h2')].some(h => h.textContent.trim() === '申请友链'));
  check('友链申请是 h2', friendsH2);

  await page.goto(`${BASE}/series/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(700);
  const seriesHeadings = await page.evaluate(() => [...document.querySelectorAll('.series-index-name')].map(el => el.tagName));
  check('系列名称使用 h2', seriesHeadings.length > 0 && seriesHeadings.every(tag => tag === 'H2'), JSON.stringify(seriesHeadings));

  console.log('=== 6.5 高视口页脚遮挡 ===');
  const tall = await browser.newPage();
  await tall.setViewport({ width: 1680, height: 1050 });
  await tall.goto(`${BASE}/series/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1100);
  const footerOverlap = await tall.evaluate(() => {
    const link = document.querySelector('.series-archive-link');
    const footer = document.querySelector('footer.footer .info-container');
    if (!link || !footer) return { missing: true };
    const a = link.getBoundingClientRect();
    const b = footer.getBoundingClientRect();
    return {
      missing: false,
      overlap: Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)),
      linkBottom: Math.round(a.bottom),
      footerTop: Math.round(b.top),
    };
  });
  check('系列页页脚不遮挡归档入口', !footerOverlap.missing && footerOverlap.overlap <= 2, JSON.stringify(footerOverlap));
  await tall.close();

  const sideTool = await page.evaluate(() => {
    const el = document.querySelector('.tool-scroll-to-top');
    return { role: el?.getAttribute('role'), tab: el?.getAttribute('tabindex'), label: el?.getAttribute('aria-label') };
  });
  check('回到顶部有可访问名称与键盘入口', sideTool.role === 'button' && sideTool.tab === '0' && /回到顶部/.test(sideTool.label || ''), JSON.stringify(sideTool));

  console.log('=== 7. 移动端浮动控件 ===');
  const mobile = await browser.newPage();
  await mobile.setViewport({ width: 390, height: 844 });
  await mobile.goto(`${BASE}/2026/10/24/reading-experience-as-features/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1600);
  const floating = () => mobile.evaluate(() => {
    const toggle = document.getElementById('read-toggle');
    const cite = document.getElementById('mobile-cite');
    const rail = document.querySelector('.right-side-tools-container');
    return {
      down: document.documentElement.classList.contains('cj-scroll-down'),
      inline: !!(toggle && toggle.classList.contains('read-action-btn') &&
        cite && cite.classList.contains('cite-action-btn')),
      fixed: !!document.querySelector('.read-toggle, .mobile-cite'),
      toggle: toggle ? getComputedStyle(toggle).opacity : null,
      toggleSize: toggle ? [Math.round(toggle.getBoundingClientRect().width), Math.round(toggle.getBoundingClientRect().height)] : null,
      citeSize: cite ? [Math.round(cite.getBoundingClientRect().width), Math.round(cite.getBoundingClientRect().height)] : null,
      rail: rail ? getComputedStyle(rail).display : null,
    };
  });
  const f1 = await floating();
  check('移动端阅读/引用按钮已内联', f1.inline && !f1.fixed, JSON.stringify(f1));
  check('移动端内联按钮触控目标 >=44px', f1.toggleSize?.every(v => v >= 44) && f1.citeSize?.every(v => v >= 44), JSON.stringify({ toggle: f1.toggleSize, cite: f1.citeSize }));
  check('移动端右侧工具条隐藏', f1.rail === 'none', JSON.stringify(f1));
  await mobile.evaluate(() => window.scrollTo(0, 900));
  await sleep(800);
  const f2 = await floating();
  check('向下阅读标记生效且内联按钮仍可见', f2.down && f2.toggle === '1', JSON.stringify(f2));
  await mobile.evaluate(() => window.scrollTo(0, 600));
  await sleep(800);
  const f3 = await floating();
  check('向上滚动清除收起状态', !f3.down, JSON.stringify(f3));

  console.log('=== 8. 静态 HTML 卫生 ===');
  const homeRaw = await fetch(`${BASE}/`).then(r => r.text());
  const projectsRaw = await fetch(`${BASE}/projects/`).then(r => r.text());
  const redirectRaw = await fetch(`${BASE}/archives/page/2/`).then(r => r.text());
  check('搜索框有静态 aria-label', /aria-label="站内搜索"/.test(homeRaw));
  check('首屏展示真实身份与求职方向', homeRaw.includes('home-hero-identity') && homeRaw.includes('GIS 大四') && homeRaw.includes('前端 / 全栈 / AI 应用工程') && !homeRaw.includes('>Lv3<'));
  check('页脚提供可见返回顶部入口', /class="footer-back-top" href="#main-content"/.test(homeRaw));
  check('页脚保留精确运行时间与全部入口', !homeRaw.includes('2026 - 2026') && !homeRaw.includes('customize-info') && homeRaw.includes('runtime_hours') && homeRaw.includes('data-runtime="seconds"') && homeRaw.includes('footer-runtime-mobile') && ['/resume/', '/archives/', '/tags/', '/bookmarks/', '/shuoshuo/', '/photos/', '/atom.xml', 'https://github.com/sijie-Z', 'mailto:19150649985@163.com', 'https://beian.miit.gov.cn/'].every(href => homeRaw.includes(href)));
  const blankLinks = [...homeRaw.matchAll(/<a[^>]*target="_blank"[^>]*>/g)]
    .filter(m => !/rel="[^"]*noopener/.test(m[0]));
  check('新窗口外链都带 noopener', blankLinks.length === 0, String(blankLinks.length));
  check('项目页没有空锚点', !/<a id="[^"]*"><\/a>/.test(projectsRaw));
  check('归档跳转页有 h1', /<h1>/.test(redirectRaw));
  const page2Raw = await fetch(`${BASE}/page/2/`).then(r => r.text());
  const page3Raw = await fetch(`${BASE}/page/3/`).then(r => r.text());
  check('分页首页不输出固定背景', !page2Raw.includes('home-banner-background') && !page3Raw.includes('home-banner-background') && page2Raw.includes('home-article-item') && page3Raw.includes('home-article-item'));
  check('首页仍保留首屏背景', homeRaw.includes('home-banner-background'));

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(() => window.swup?.navigate('/page/2/'));
  await page.waitForFunction(() => location.pathname === '/page/2/', { timeout: 8000 });
  check('SPA 进入分页会移除背景', await page.evaluate(() => !document.querySelector('.home-banner-background') && !!document.querySelector('.home-article-item')));
  await page.evaluate(() => window.swup?.navigate('/'));
  await page.waitForFunction(() => location.pathname === '/', { timeout: 8000 });
  await sleep(700);
  check('SPA 返回首页会恢复背景', await page.evaluate(() => !!document.querySelector('.home-banner-background')));
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.bringToFront();
  await page.evaluate(() => window.scrollBy(0, -100));
  await sleep(100);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForFunction(() => document.querySelector('footer.footer')?.classList.contains('at-bottom'), { timeout: 8000 });
  await sleep(550);
  const desktopFooter = await page.evaluate(() => {
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height, width: r.width };
    };
    const footer = document.querySelector('footer.footer');
    const info = footer.querySelector('.info-container');
    const utility = footer.querySelector('.footer-utility');
    return {
      height: footer.getBoundingClientRect().height,
      primary: !!footer.querySelector('.footer-primary'),
      meta: !!footer.querySelector('.footer-meta'),
      social: getComputedStyle(footer.querySelector('.footer-extra-icons')).display,
      info: rect(info),
      footer: rect(footer),
      metaRect: rect(footer.querySelector('.footer-meta')),
      icons: rect(footer.querySelector('.footer-extra-icons')),
      utility: rect(utility),
      utilityBorderTop: parseFloat(getComputedStyle(utility).borderTopWidth),
    };
  });
  check('桌面页脚不超过 100px 且保留主次两行', desktopFooter.height <= 100 && desktopFooter.primary && desktopFooter.meta && desktopFooter.social === 'flex' && desktopFooter.utility.height > 0, JSON.stringify(desktopFooter));
  const expectedWidth = Math.min(1200, desktopFooter.footer.width * 0.8);
  check('宽屏页脚保持两行两列并与正文同宽', desktopFooter.info.height > 60 && desktopFooter.info.height <= 110 && Math.abs(desktopFooter.info.width - expectedWidth) <= 2 && Math.abs((desktopFooter.info.left + desktopFooter.info.right) / 2 - (desktopFooter.footer.left + desktopFooter.footer.right) / 2) <= 4 && Math.abs(desktopFooter.icons.right - desktopFooter.info.right) <= 2 && desktopFooter.utility.top >= desktopFooter.metaRect.bottom && desktopFooter.utility.left >= desktopFooter.info.left - 1 && desktopFooter.utility.right <= desktopFooter.info.right + 1 && desktopFooter.utilityBorderTop === 0, JSON.stringify({ info: desktopFooter.info, footer: desktopFooter.footer, expectedWidth, meta: desktopFooter.metaRect, icons: desktopFooter.icons, utility: desktopFooter.utility }));

  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(700);
  await page.evaluate(() => window.scrollBy(0, -100));
  await sleep(100);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForFunction(() => document.querySelector('footer.footer')?.classList.contains('at-bottom'), { timeout: 8000 });
  const mobileFooter = await page.evaluate(() => {
    const runtime = document.querySelector('.footer-runtime-mobile');
    return {
      height: document.querySelector('footer.footer').getBoundingClientRect().height,
      social: getComputedStyle(document.querySelector('.footer-extra-icons')).display,
      runtime: getComputedStyle(runtime).display !== 'none' && /\d+ 天/.test(runtime.textContent) && /\d{2}:\d{2}:\d{2}/.test(runtime.textContent),
      utilityRight: document.querySelector('.footer-utility').getBoundingClientRect().right,
      viewport: innerWidth,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
    };
  });
  check('390px 页脚不超过 160px 且社交入口与秒级运行时间可见', mobileFooter.height <= 160 && mobileFooter.social === 'flex' && mobileFooter.runtime && mobileFooter.utilityRight <= mobileFooter.viewport && !mobileFooter.overflow, JSON.stringify(mobileFooter));

  await page.setViewport({ width: 320, height: 568 });
  await sleep(300);
  await page.evaluate(() => window.scrollBy(0, -100));
  await sleep(100);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForFunction(() => document.querySelector('footer.footer')?.classList.contains('at-bottom'), { timeout: 8000 });
  const narrowFooter = await page.evaluate(() => ({
    height: document.querySelector('footer.footer').getBoundingClientRect().height,
    social: getComputedStyle(document.querySelector('.footer-extra-icons')).display,
    utilityRight: document.querySelector('.footer-utility').getBoundingClientRect().right,
    viewport: innerWidth,
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
  }));
  check('320px 页脚不超过 170px 且链接不被裁切', narrowFooter.height <= 170 && narrowFooter.social === 'flex' && narrowFooter.utilityRight <= narrowFooter.viewport && !narrowFooter.overflow, JSON.stringify(narrowFooter));

  const thumbs = [...homeRaw.matchAll(/<div class="home-article-thumbnail[^"]*">\s*<a\b[^>]*>/g)].map(m => m[0]);
  check('首页缩略图不重复进入 Tab 顺序', thumbs.length > 0 && thumbs.every(tag => /tabindex="-1"/.test(tag) && /aria-hidden="true"/.test(tag)), JSON.stringify({ count: thumbs.length }));
  const readMore = [...homeRaw.matchAll(/<a\b[^>]*>\s*阅读全文[\s\S]*?<\/a>/g)].map(m => m[0]);
  check('首页阅读全文不重复进入 Tab 顺序', readMore.length > 0 && readMore.every(tag => /tabindex="-1"/.test(tag) && /aria-hidden="true"/.test(tag)), JSON.stringify({ count: readMore.length }));

  await mobile.bringToFront();
  await mobile.evaluate(() => window.scrollTo(0, 0));
  await sleep(400);
  await mobile.evaluate(() => document.querySelector('.mn-ref > button')?.click());
  await sleep(300);
  const marginBefore = await mobile.evaluate(() => ({
    open: document.querySelector('.mn-sheet')?.classList.contains('is-open') || false,
    swup: document.getElementById('swup')?.inert || false,
    skip: document.querySelector('.skip-link')?.inert || false,
  }));
  await mobile.keyboard.press('Escape');
  await sleep(250);
  const marginAfter = await mobile.evaluate(() => ({
    swup: document.getElementById('swup')?.inert || false,
    skip: document.querySelector('.skip-link')?.inert || false,
  }));
  check('边注卡隔离 body 外背景并在关闭后恢复', marginBefore.open && marginBefore.swup && marginBefore.skip && !marginAfter.swup && !marginAfter.skip, JSON.stringify({ marginBefore, marginAfter }));
  await mobile.click('#read-toggle');
  await sleep(350);
  const inlineRead = await mobile.evaluate(() => document.getElementById('read-sheet')?.classList.contains('is-open') || false);
  check('内联 Aa 打开阅读设置卡', inlineRead);
  const sheetSize = await mobile.evaluate(() => {
    const btn = document.querySelector('#read-sheet .read-size-btn[data-read-size="l"]');
    if (!btn) return { missing: true };
    const pre = document.querySelector('.article-content td.code pre, .article-content pre');
    const codeBefore = pre ? parseFloat(getComputedStyle(pre).fontSize) : null;
    btn.click();
    const codeAfter = pre ? parseFloat(getComputedStyle(pre).fontSize) : null;
    return {
      open: document.getElementById('read-sheet')?.classList.contains('is-open') || false,
      size: document.documentElement.getAttribute('data-read-size'),
      codeBefore,
      codeAfter,
    };
  });
  check('设置卡内调字号不关闭卡片', sheetSize.open && sheetSize.size === 'l', JSON.stringify(sheetSize));
  check('阅读字号同时放大代码', sheetSize.codeBefore > 0 && sheetSize.codeAfter > sheetSize.codeBefore, JSON.stringify(sheetSize));
  await mobile.click('#read-sheet .read-focus-btn');
  await sleep(300);
  const focusOn = await mobile.evaluate(() => ({
    enabled: document.documentElement.classList.contains('cj-focus'),
    active: document.activeElement?.id || '',
  }));
  check('开启专注后焦点移到退出按钮', focusOn.enabled && focusOn.active === 'focus-exit', JSON.stringify(focusOn));
  await mobile.click('#focus-exit');
  await sleep(250);
  const focusOff = await mobile.evaluate(() => ({
    enabled: document.documentElement.classList.contains('cj-focus'),
    active: document.activeElement?.id || '',
  }));
  check('退出专注后焦点回到阅读设置', !focusOff.enabled && focusOff.active === 'read-toggle', JSON.stringify(focusOff));
  await mobile.keyboard.press('Escape');
  await sleep(250);
  await mobile.click('#mobile-cite');
  await sleep(350);
  const inlineCite = await mobile.evaluate(() => !!document.querySelector('.cite-menu'));
  check('内联引用按钮打开菜单', inlineCite);
  await mobile.keyboard.press('Escape');
  await sleep(250);

  await mobile.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1000);
  const socialOverlap = await mobile.evaluate(() => {
    const cta = document.querySelector('.home-hero-cta-secondary')?.getBoundingClientRect();
    const social = document.querySelector('.social-contacts')?.getBoundingClientRect();
    if (!cta || !social) return { missing: true };
    const width = Math.max(0, Math.min(cta.right, social.right) - Math.max(cta.left, social.left));
    const height = Math.max(0, Math.min(cta.bottom, social.bottom) - Math.max(cta.top, social.top));
    return { missing: false, area: width * height };
  });
  check('移动端社交区不遮挡简历按钮', !socialOverlap.missing && socialOverlap.area === 0, JSON.stringify(socialOverlap));
  await mobile.setViewport({ width: 320, height: 568 });
  await sleep(500);
  const narrowNav = await mobile.evaluate(() => ['.nb-theme-btn', '.nb-timer-btn', '.navbar-bar', '.mobile .search-popup-trigger'].map(selector => {
    const el = document.querySelector(selector);
    if (!el) return { selector, missing: true };
    const rect = el.getBoundingClientRect();
    return {
      selector,
      display: getComputedStyle(el).display,
      left: Math.round(rect.left),
      right: Math.round(rect.right),
    };
  }));
  check('320px 导航控件不被裁切', narrowNav.every(item => !item.missing && (item.display === 'none' || (item.left >= -1 && item.right <= 321))), JSON.stringify(narrowNav));
  await mobile.close();

  console.log('=== 9. 打印样式 ===');
  await page.emulateMediaType('print');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(700);
  const printHome = await page.evaluate(() => ({
    banner: getComputedStyle(document.querySelector('.home-banner-container')).display,
    sidebar: getComputedStyle(document.querySelector('.home-sidebar-container')).display,
    list: getComputedStyle(document.querySelector('.home-article-list')).display,
  }));
  check('打印首页隐藏横幅和侧栏', printHome.banner === 'none' && printHome.sidebar === 'none' && printHome.list === 'block', JSON.stringify(printHome));
  await page.goto(`${BASE}/2026/10/23/hexo-series-reading-path/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(700);
  const printArticle = await page.evaluate(() => {
    const scroller = document.querySelector('.article-content .table-scroll');
    const table = document.querySelector('.article-content table');
    const content = document.querySelector('.article-content');
    const pre = document.querySelector('.article-content pre');
    return {
      overflow: getComputedStyle(scroller).overflow,
      tableWidth: Math.round(table.getBoundingClientRect().width),
      contentWidth: Math.round(content.getBoundingClientRect().width),
      preWrap: getComputedStyle(pre).whiteSpace,
    };
  });
  check('打印表格展开不横向裁切', printArticle.overflow === 'visible' && printArticle.tableWidth <= printArticle.contentWidth, JSON.stringify(printArticle));
  check('打印代码自动换行', printArticle.preWrap === 'pre-wrap', JSON.stringify(printArticle));
  await page.emulateMediaType('screen');

  check('零页面错误', errors.length === 0, errors.slice(0, 2).join(' | '));

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  await browser.close();
  server.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('崩溃:', e); process.exit(1); });
