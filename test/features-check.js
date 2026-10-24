/* 新功能回归:边注、内链悬停预览、Live2D 显式召唤 */
'use strict';

const puppeteer = require('puppeteer-core');
const { startServer } = require('./static-server');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.PORT || 4170);
const BASE = `http://127.0.0.1:${PORT}`;
const ARTICLE = '/2026/10/23/static-assets-cleanup/';
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
  try {
    await browser.defaultBrowserContext().overridePermissions(BASE, ['clipboard-read', 'clipboard-write']);
  } catch (e) {}
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 160)));
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('waifu-disabled', 'true');
    localStorage.removeItem('cj-pet');
  });

  console.log('=== 1. 边注:窄屏卡片 ===');
  await page.goto(BASE + ARTICLE, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1600);
  const initial = await page.evaluate(() => ({
    refs: document.querySelectorAll('.mn-ref > button').length,
    notes: document.querySelectorAll('.mn').length,
    display: (() => { const n = document.querySelector('.mn'); return n ? getComputedStyle(n).display : 'missing'; })(),
    overflow: document.documentElement.scrollWidth - innerWidth,
    pet: !!document.getElementById('pet-toggle'),
    live2dScript: [...document.querySelectorAll('script')].some(s => (s.src || '').includes('autoload.js')),
  }));
  check('边注引用有 2 个', initial.refs === 2, String(initial.refs));
  check('边注正文构建期存在', initial.notes === 2, String(initial.notes));
  check('1440px 边注默认收起', initial.display === 'none', initial.display);
  check('1440px 无横向溢出', initial.overflow <= 0, String(initial.overflow));
  check('默认显示召唤宠物按钮', initial.pet);
  check('默认不请求 Live2D 脚本', !initial.live2dScript);

  await page.evaluate(() => document.querySelector('.mn-ref > button').scrollIntoView({ block: 'center' }));
  await sleep(250);
  await page.click('.mn-ref > button');
  await sleep(350);
  const sheet = await page.evaluate(() => {
    const el = document.getElementById('mn-sheet');
    const r = el && el.getBoundingClientRect();
    return el ? {
      open: el.classList.contains('is-open'),
      ariaHidden: el.getAttribute('aria-hidden'),
      position: getComputedStyle(el).position,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      text: el.textContent.trim(),
      focused: document.activeElement && document.activeElement.className,
      inViewport: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
    } : null;
  });
  check('点击引用打开边注卡片', !!sheet && sheet.open, JSON.stringify(sheet));
  check('卡片固定在视口内', !!sheet && sheet.position === 'fixed' && sheet.inViewport, JSON.stringify(sheet && sheet.rect));
  check('卡片内容非空', !!sheet && sheet.text.length > 10, sheet && sheet.text.slice(0, 30));
  check('打开后焦点进入关闭按钮', !!sheet && sheet.focused === 'mn-sheet-close', sheet && sheet.focused);

  await page.keyboard.press('Escape');
  await sleep(250);
  const closed = await page.evaluate(() => ({
    open: document.getElementById('mn-sheet').classList.contains('is-open'),
    ariaHidden: document.getElementById('mn-sheet').getAttribute('aria-hidden'),
    focusOnRef: document.activeElement === document.querySelector('.mn-ref > button'),
  }));
  check('Esc 收起卡片', !closed.open && closed.ariaHidden === 'true', JSON.stringify(closed));
  check('收起后焦点回到引用', closed.focusOnRef);

  console.log('=== 2. 边注:宽屏页边 ===');
  await page.setViewport({ width: 1680, height: 1000 });
  await sleep(500);
  const wide = await page.evaluate(() => {
    const note = document.querySelector('.mn');
    const ref = document.querySelector('.mn-ref > button');
    const article = document.querySelector('.article-content');
    const rect = el => el.getBoundingClientRect();
    const n = rect(note), a = rect(article), r = rect(ref);
    return {
      display: getComputedStyle(note).display,
      note: { x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width) },
      articleX: Math.round(a.x),
      refY: Math.round(r.y),
      dy: Math.round(Math.abs(n.y - r.y)),
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  check('1680px 边注显示', wide.display === 'block', wide.display);
  check('边注在正文左侧页边', wide.note.x < wide.articleX - 100, JSON.stringify(wide));
  check('边注与引用纵向对齐', wide.dy < 140, String(wide.dy));
  check('1680px 无横向溢出', wide.overflow <= 0, String(wide.overflow));

  console.log('=== 3. 内链悬停预览 ===');
  const data = await page.evaluate(async () => {
    const res = await fetch('/link-preview.json');
    const json = await res.json();
    return { ok: res.ok, count: Object.keys(json).length, article: json[location.pathname] || null };
  });
  check('预览 JSON 可访问', data.ok && data.count >= 25, JSON.stringify({ ok: data.ok, count: data.count }));
  check('当前文章有预览数据', !!data.article && data.article.title.includes('33MB'), JSON.stringify(data.article && data.article.title));

  const hover = await page.evaluate(() => {
    const link = [...document.querySelectorAll('.article-content a[href^="/"]')]
      .find(a => a.getAttribute('href').includes('font-subset'));
    if (!link) return null;
    link.scrollIntoView({ block: 'center' });
    return link.getAttribute('href');
  });
  // 等 scroll 事件落地:滚动会主动收起预览,先滚再悬停
  await sleep(400);
  await page.evaluate(() => {
    const link = [...document.querySelectorAll('.article-content a[href^="/"]')]
      .find(a => a.getAttribute('href').includes('font-subset'));
    link.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }));
  });
  await sleep(1400);
  const card = await page.evaluate(() => {
    const el = document.querySelector('.link-preview-card');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      show: el.classList.contains('show'),
      ariaHidden: el.getAttribute('aria-hidden'),
      title: el.querySelector('.lp-title')?.textContent || '',
      cover: el.querySelector('.lp-cover')?.getAttribute('src') || '',
      meta: el.querySelector('.lp-meta')?.textContent || '',
      inViewport: r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
      pointerEvents: getComputedStyle(el).pointerEvents,
    };
  });
  check('悬停内链出现预览卡', !!card && card.show, hover || 'no link');
  check('预览卡有标题/封面/日期', !!card && card.title.length > 4 && /\/images\//.test(card.cover) && card.meta.includes('2026'), JSON.stringify(card && { title: card.title, cover: card.cover, meta: card.meta }));
  check('预览卡在视口内且不挡鼠标', !!card && card.inViewport && card.pointerEvents === 'none', JSON.stringify(card && card.inViewport));

  await page.evaluate(() => {
    const link = [...document.querySelectorAll('.article-content a[href^="/"]')].find(a => a.getAttribute('href').includes('font-subset'));
    link.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
  });
  await sleep(300);
  const hidden = await page.evaluate(() => {
    const el = document.querySelector('.link-preview-card');
    return !el || !el.classList.contains('show');
  });
  check('移出链接后预览卡收起', hidden);

  console.log('=== 4. 公式复制 LaTeX ===');
  await page.goto(BASE + '/2026/08/28/quant-reversal-execution-gap/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1300);
  const math = await page.evaluate(() => {
    const block = document.querySelector('.katex-block');
    const btn = block && block.querySelector('.math-copy-btn');
    return {
      blocks: document.querySelectorAll('.katex-block').length,
      button: !!btn,
      label: btn && btn.getAttribute('aria-label'),
      tex: block ? (block.querySelector('annotation[encoding="application/x-tex"]') || {}).textContent || '' : '',
    };
  });
  check('块级公式有复制按钮', math.blocks >= 2 && math.button, JSON.stringify({ blocks: math.blocks }));
  check('按钮有可访问名称', !!math.label && math.label.includes('LaTeX'), math.label);
  check('公式保留 TeX 源码', math.tex.includes('\\operatorname{corr}'), math.tex.slice(0, 40));

  await page.click('.katex-block .math-copy-btn');
  await sleep(500);
  const copied = await page.evaluate(async () => ({
    feedback: document.querySelector('.math-copy-btn')?.textContent || '',
    clip: await navigator.clipboard.readText().catch(() => ''),
  }));
  check('点击后反馈已复制', copied.feedback === '✓', copied.feedback);
  check('剪贴板拿到 LaTeX', copied.clip.includes('\\operatorname{corr}') || copied.clip.includes('\\left'), JSON.stringify(copied.clip.slice(0, 40)));

  console.log('=== 5. 脚注悬停预览 ===');
  await page.goto(BASE + '/2026/10/23/hexo-series-reading-path/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1300);
  const fnHref = await page.evaluate(() => {
    const ref = document.querySelector('.footnote-ref a');
    ref.scrollIntoView({ block: 'center' });
    return ref.getAttribute('href');
  });
  await sleep(350);
  await page.evaluate(() => {
    const ref = document.querySelector('.footnote-ref a');
    ref.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }));
  });
  await sleep(900);
  const fp = await page.evaluate(() => {
    const el = document.querySelector('.footnote-preview-card');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      show: el.classList.contains('show'),
      text: el.textContent,
      pointerEvents: getComputedStyle(el).pointerEvents,
      inViewport: r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
      backref: !!el.querySelector('.footnote-backref'),
    };
  });
  check('脚注引用指向文末定义', fnHref === '#fn-cls', String(fnHref));
  check('悬停脚注引用出现预览', !!fp && fp.show, JSON.stringify(fp && fp.show));
  check('预览内容是脚注正文', !!fp && fp.text.includes('PerformanceObserver'), fp && fp.text.slice(0, 40));
  check('预览卡不挡鼠标且在视口内', !!fp && fp.pointerEvents === 'none' && fp.inViewport, JSON.stringify(fp && { pe: fp.pointerEvents, v: fp.inViewport }));
  check('预览里没有返回箭头', !!fp && !fp.backref);

  await page.evaluate(() => {
    const ref = document.querySelector('.footnote-ref a');
    ref.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
  });
  await sleep(300);
  check('移出后预览收起', await page.evaluate(() => {
    const el = document.querySelector('.footnote-preview-card');
    return !el || !el.classList.contains('show');
  }));

  await page.evaluate(() => document.querySelector('.footnote-ref a').focus());
  await sleep(900);
  check('键盘聚焦也能预览', await page.evaluate(() => {
    const el = document.querySelector('.footnote-preview-card');
    return !!el && el.classList.contains('show');
  }));

  console.log('=== 6. 阅读设置:字号与专注模式 ===');
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(BASE + ARTICLE, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1300);
  await page.evaluate(() => {
    localStorage.removeItem('cj-read-size');
    localStorage.removeItem('cj-focus');
  });
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(1200);

  const readCard = await page.evaluate(() => ({
    card: !!document.querySelector('.post-side-read-card'),
    buttons: document.querySelectorAll('.post-side-read-card .read-size-btn').length,
    focus: !!document.querySelector('.post-side-read-card .read-focus-btn'),
    current: document.querySelector('.post-side-read-card .read-size-btn[aria-pressed="true"]')?.getAttribute('data-read-size'),
  }));
  check('侧栏有阅读设置卡', readCard.card && readCard.buttons === 3 && readCard.focus, JSON.stringify(readCard));
  check('默认字号为中号', readCard.current === 'm', readCard.current);

  await page.click('.post-side-read-card .read-size-btn[data-read-size="l"]');
  await sleep(250);
  const big = await page.evaluate(() => ({
    attr: document.documentElement.getAttribute('data-read-size'),
    font: getComputedStyle(document.querySelector('.article-content.markdown-body')).fontSize,
    stored: localStorage.getItem('cj-read-size'),
    pressed: document.querySelector('.post-side-read-card .read-size-btn[data-read-size="l"]').getAttribute('aria-pressed'),
  }));
  check('切到大号字生效并记住', big.attr === 'l' && big.stored === 'l' && parseFloat(big.font) > 16 && big.pressed === 'true', JSON.stringify(big));

  await page.click('.post-side-read-card .read-focus-btn');
  await sleep(350);
  const focusOn = await page.evaluate(() => {
    const toc = document.querySelector('.toc-content-container');
    const exit = document.getElementById('focus-exit');
    const article = document.querySelector('.article-content-container');
    const r = article ? article.getBoundingClientRect() : null;
    return {
      cls: document.documentElement.classList.contains('cj-focus'),
      tocDisplay: toc ? getComputedStyle(toc).display : 'missing',
      exit: !!exit && getComputedStyle(exit).display !== 'none',
      centered: !!r && Math.abs((r.left + r.right) / 2 - innerWidth / 2) < 30,
      stored: localStorage.getItem('cj-focus'),
    };
  });
  check('专注模式收起目录', focusOn.cls && focusOn.tocDisplay === 'none', JSON.stringify(focusOn));
  check('专注模式显示退出按钮', focusOn.exit);
  check('专注模式正文居中', focusOn.centered, JSON.stringify(focusOn));

  await page.keyboard.press('Escape');
  await sleep(300);
  const focusOff = await page.evaluate(() => ({
    cls: document.documentElement.classList.contains('cj-focus'),
    exit: !!document.getElementById('focus-exit'),
    stored: localStorage.getItem('cj-focus'),
    tocDisplay: getComputedStyle(document.querySelector('.toc-content-container')).display,
  }));
  check('Esc 退出专注并恢复目录', !focusOff.cls && !focusOff.exit && focusOff.stored === 'off' && focusOff.tocDisplay !== 'none', JSON.stringify(focusOff));

  // 刷新后保持字号与专注模式(首屏前由 head 内联脚本应用)
  await page.click('.post-side-read-card .read-focus-btn');
  await sleep(250);
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(1300);
  const persisted = await page.evaluate(() => ({
    attr: document.documentElement.getAttribute('data-read-size'),
    cls: document.documentElement.classList.contains('cj-focus'),
    font: getComputedStyle(document.querySelector('.article-content.markdown-body')).fontSize,
    exit: !!document.getElementById('focus-exit'),
  }));
  check('刷新后字号保持', persisted.attr === 'l' && parseFloat(persisted.font) > 16, JSON.stringify(persisted));
  check('刷新后专注模式保持', persisted.cls && persisted.exit, JSON.stringify(persisted));

  await page.click('#focus-exit');
  await sleep(250);
  check('退出按钮关闭专注', await page.evaluate(() => !document.documentElement.classList.contains('cj-focus')));

  console.log('=== 7. 阅读设置:窄屏 ===');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await sleep(500);
  const mobile = await page.evaluate(() => {
    const toggle = document.getElementById('read-toggle');
    const r = toggle ? toggle.getBoundingClientRect() : null;
    return {
      toggle: !!toggle,
      display: toggle ? getComputedStyle(toggle).display : 'missing',
      visible: !!r && r.width > 0 && r.bottom <= innerHeight && r.top >= 0,
      sheetClosed: !document.getElementById('read-sheet')?.classList.contains('is-open'),
    };
  });
  check('窄屏显示 Aa 阅读按钮', mobile.toggle && mobile.display !== 'none' && mobile.visible, JSON.stringify(mobile));
  check('窄屏设置卡默认收起', mobile.sheetClosed);

  await page.click('#read-toggle');
  await sleep(350);
  const readSheet = await page.evaluate(() => {
    const el = document.getElementById('read-sheet');
    const r = el ? el.getBoundingClientRect() : null;
    return {
      open: !!el && el.classList.contains('is-open'),
      buttons: el ? el.querySelectorAll('.read-size-btn').length : 0,
      inViewport: !!r && r.top >= 0 && r.bottom <= innerHeight,
      focused: document.activeElement && document.activeElement.className,
    };
  });
  check('Aa 打开底部设置卡', readSheet.open && readSheet.buttons === 3 && readSheet.inViewport, JSON.stringify(readSheet));
  check('设置卡打开后焦点进入关闭按钮', readSheet.focused === 'read-sheet-close', readSheet.focused);

  await page.click('#read-sheet .read-size-btn[data-read-size="s"]');
  await sleep(250);
  const small = await page.evaluate(() => ({
    attr: document.documentElement.getAttribute('data-read-size'),
    font: getComputedStyle(document.querySelector('.article-content.markdown-body')).fontSize,
    stored: localStorage.getItem('cj-read-size'),
  }));
  check('卡片里也能切换字号', small.attr === 's' && parseFloat(small.font) < 16 && small.stored === 's', JSON.stringify(small));

  await page.keyboard.press('Escape');
  await sleep(300);
  check('Esc 收起设置卡', await page.evaluate(() => !document.getElementById('read-sheet').classList.contains('is-open')));

  await page.evaluate(() => {
    localStorage.removeItem('cj-read-size');
    localStorage.removeItem('cj-focus');
  });

  console.log('=== 8. 页面错误 ===');
  check('零页面错误', errors.length === 0, errors.join(' | '));

  await browser.close();
  server.close();
  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail ? 1 : 0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
