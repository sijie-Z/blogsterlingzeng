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

  const mobileCite = await page.evaluate(() => {
    const btn = document.getElementById('mobile-cite');
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return {
      visible: getComputedStyle(btn).display !== 'none',
      inViewport: r.top >= 0 && r.bottom <= innerHeight,
      label: btn.getAttribute('aria-label'),
      haspopup: btn.getAttribute('aria-haspopup'),
    };
  });
  check('窄屏显示引用按钮', !!mobileCite && mobileCite.visible && mobileCite.inViewport && mobileCite.haspopup === 'menu', JSON.stringify(mobileCite));
  await page.click('#mobile-cite');
  await sleep(350);
  const mobileCiteMenu = await page.evaluate(() => {
    const menu = document.querySelector('.cite-menu');
    if (!menu) return null;
    const r = menu.getBoundingClientRect();
    return {
      items: menu.querySelectorAll('[role="menuitem"]').length,
      inViewport: r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
      expanded: document.getElementById('mobile-cite').getAttribute('aria-expanded'),
    };
  });
  check('窄屏引用菜单可打开', !!mobileCiteMenu && mobileCiteMenu.items >= 6 && mobileCiteMenu.inViewport && mobileCiteMenu.expanded === 'true', JSON.stringify(mobileCiteMenu));
  await page.keyboard.press('Escape');
  await sleep(250);
  check('窄屏 Esc 关闭引用菜单', await page.evaluate(() => !document.querySelector('.cite-menu')));

  // 专注模式 + 引用菜单:Esc 只关菜单,不应退出专注
  await page.evaluate(() => document.querySelector('.post-side-read-card .read-focus-btn').click());
  await sleep(300);
  await page.click('#mobile-cite');
  await sleep(300);
  await page.keyboard.press('Escape');
  await sleep(300);
  const focusEsc = await page.evaluate(() => ({
    focus: document.documentElement.classList.contains('cj-focus'),
    menu: !!document.querySelector('.cite-menu'),
  }));
  check('专注模式下 Esc 只关引用菜单', focusEsc.focus && !focusEsc.menu, JSON.stringify(focusEsc));
  await page.evaluate(() => { const exit = document.getElementById('focus-exit'); if (exit) exit.click(); });
  await sleep(200);

  await page.evaluate(() => {
    localStorage.removeItem('cj-read-size');
    localStorage.removeItem('cj-focus');
  });

  console.log('=== 8. 引用与反向链接 ===');
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(BASE + '/2026/05/10/docmind-rag-knowledge-base/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1400);

  const backlinks = await page.evaluate(() => {
    const section = document.querySelector('.cj-backlinks');
    if (!section) return null;
    return {
      count: section.querySelectorAll('li').length,
      badge: section.querySelector('.cj-backlinks-count')?.textContent || '',
      excerpt: section.querySelector('li p')?.textContent || '',
      links: [...section.querySelectorAll('li a')].map(a => a.getAttribute('href')),
      inArticle: !!section.closest('.article-content-container'),
    };
  });
  check('目标文章显示反向链接', !!backlinks && backlinks.count >= 3 && backlinks.inArticle, JSON.stringify(backlinks && backlinks.count));
  check('反向链接带正确段落上下文', !!backlinks && backlinks.excerpt.includes('这条训练链路后来也接进了') && backlinks.excerpt.includes('DocMind'), backlinks && backlinks.excerpt.slice(0, 50));
  check('反向链接计数不少于展示条目', !!backlinks && Number(backlinks.badge) >= backlinks.count, JSON.stringify(backlinks && { badge: backlinks.badge, count: backlinks.count }));

  const backlinkStatus = await page.evaluate(async urls => {
    const out = [];
    for (const url of urls.slice(0, 3)) {
      const res = await fetch(url);
      out.push(res.status);
    }
    return out;
  }, backlinks ? backlinks.links : []);
  check('反向链接目标可访问', backlinkStatus.length > 0 && backlinkStatus.every(s => s === 200), JSON.stringify(backlinkStatus));

  const citation = await page.evaluate(() => {
    const el = document.getElementById('cj-citation');
    return {
      data: el ? JSON.parse(el.textContent) : null,
      meta: [...document.querySelectorAll('meta[name^="citation_"]')].map(m => ({ name: m.name, content: m.content })),
      share: (() => {
        const btn = document.querySelector('.post-side-share');
        return btn ? { haspopup: btn.getAttribute('aria-haspopup'), expanded: btn.getAttribute('aria-expanded') } : null;
      })(),
    };
  });
  const metaNames = citation.meta.map(m => m.name);
  check('citation meta 完整', ['citation_title', 'citation_author', 'citation_publication_date', 'citation_language'].every(n => metaNames.includes(n)), JSON.stringify(metaNames));
  check('citation 日期格式正确', citation.meta.find(m => m.name === 'citation_publication_date')?.content === '2026/05/10', citation.meta.find(m => m.name === 'citation_publication_date')?.content);
  check('citation JSON 与页面一致', !!citation.data && citation.data.title.includes('DocMind') && citation.data.url.startsWith('https://'), JSON.stringify(citation.data && { title: citation.data.title, url: citation.data.url }));
  check('分享按钮声明菜单', !!citation.share && citation.share.haspopup === 'menu' && citation.share.expanded === 'false', JSON.stringify(citation.share));

  await page.click('.post-side-share');
  await sleep(300);
  const citeMenu = await page.evaluate(() => {
    const el = document.querySelector('.cite-menu');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      role: el.getAttribute('role'),
      items: el.querySelectorAll('[role="menuitem"]').length,
      focused: document.activeElement && document.activeElement.textContent,
      expanded: document.querySelector('.post-side-share').getAttribute('aria-expanded'),
      inViewport: r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
    };
  });
  check('引用菜单可打开', !!citeMenu && citeMenu.role === 'menu' && citeMenu.items >= 6 && citeMenu.inViewport, JSON.stringify(citeMenu));
  check('菜单打开后焦点在第一项', !!citeMenu && citeMenu.focused === '复制 Markdown 引用', citeMenu && citeMenu.focused);
  check('菜单同步 aria-expanded', !!citeMenu && citeMenu.expanded === 'true', citeMenu && citeMenu.expanded);

  await page.keyboard.press('ArrowDown');
  const secondFocus = await page.evaluate(() => document.activeElement && document.activeElement.textContent);
  check('方向键在菜单内移动', secondFocus === '复制 BibTeX', secondFocus);

  await page.keyboard.press('Escape');
  await sleep(250);
  const menuEsc = await page.evaluate(() => ({
    menu: !!document.querySelector('.cite-menu'),
    expanded: document.querySelector('.post-side-share').getAttribute('aria-expanded'),
    focusBack: document.activeElement === document.querySelector('.post-side-share'),
  }));
  check('Esc 关闭菜单并回到按钮', !menuEsc.menu && menuEsc.expanded === 'false' && menuEsc.focusBack, JSON.stringify(menuEsc));

  await page.click('.post-side-share');
  await sleep(250);
  await page.keyboard.press('Tab');
  await sleep(300);
  const menuTab = await page.evaluate(() => ({
    menu: !!document.querySelector('.cite-menu'),
    expanded: document.querySelector('.post-side-share').getAttribute('aria-expanded'),
  }));
  check('Tab 离开菜单后同步收起', !menuTab.menu && menuTab.expanded === 'false', JSON.stringify(menuTab));

  await page.click('.post-side-share');
  await sleep(250);
  const bibButtons = await page.$$('.cite-menu button');
  await bibButtons[1].click();
  await sleep(900);
  const bib = await page.evaluate(async () => ({
    clip: await navigator.clipboard.readText().catch(() => ''),
    menu: !!document.querySelector('.cite-menu'),
  }));
  check('复制 BibTeX 到剪贴板', /@misc\{sterling2026docmind/.test(bib.clip) && bib.clip.includes('DocMind'), JSON.stringify(bib.clip.slice(0, 50)));
  check('复制后菜单关闭', !bib.menu, JSON.stringify(bib.menu));

  await page.click('.post-side-share');
  await sleep(250);
  const mdButtons = await page.$$('.cite-menu button');
  await mdButtons[0].click();
  await sleep(900);
  const markdownCitation = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  check('复制 Markdown 引用', markdownCitation.includes('[我做了一个 RAG 知识库系统') && markdownCitation.includes('https://sterlingzeng.cn/2026/05/10/docmind-rag-knowledge-base/'), JSON.stringify(markdownCitation.slice(0, 60)));

  await page.click('.post-side-share');
  await sleep(250);
  const formatButtons = await page.$$('.cite-menu button');
  let gbtButton = null;
  for (const handle of formatButtons) {
    const text = await handle.evaluate(el => el.textContent);
    if (text.includes('GB/T')) gbtButton = handle;
  }
  if (gbtButton) await gbtButton.click();
  await sleep(900);
  const gbtCitation = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  check('复制 GB/T 7714 引用', gbtCitation.includes('[EB/OL]') && gbtCitation.includes('DocMind') && /\(\d{4}-\d{2}-\d{2}\)\[/.test(gbtCitation), JSON.stringify(gbtCitation.slice(0, 60)));

  await page.click('.post-side-share');
  await sleep(250);
  const risButtons = await page.$$('.cite-menu button');
  let risButton = null;
  for (const handle of risButtons) {
    const text = await handle.evaluate(el => el.textContent);
    if (text.includes('RIS')) risButton = handle;
  }
  if (risButton) await risButton.click();
  await sleep(900);
  const risCitation = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  check('复制 RIS 记录', risCitation.startsWith('TY  - JOUR') && risCitation.includes('UR  - https://') && risCitation.trim().endsWith('ER  -'), JSON.stringify(risCitation.slice(0, 40)));

  // 菜单打开时换页:菜单必须收起,且后续复制的是新文章
  await page.click('.post-side-share');
  await sleep(250);
  await page.evaluate(() => { window.swup.navigate('/2026/05/10/mindpilot-multi-agent-rag/'); });
  await sleep(1900);
  const afterSpa = await page.evaluate(() => {
    const el = document.getElementById('cj-citation');
    const triggers = [...document.querySelectorAll('.post-side-share, #mobile-cite')];
    return {
      path: location.pathname,
      menu: !!document.querySelector('.cite-menu'),
      expanded: triggers.some(btn => btn.getAttribute('aria-expanded') === 'true'),
      title: el ? JSON.parse(el.textContent).title : '',
    };
  });
  check('打开菜单时 SPA 换页会收起菜单', afterSpa.path === '/2026/05/10/mindpilot-multi-agent-rag/' && !afterSpa.menu && !afterSpa.expanded, JSON.stringify(afterSpa));
  check('SPA 换页后引用数据更新', afterSpa.title.includes('MindPilot'), JSON.stringify(afterSpa.title));

  await page.click('.post-side-share');
  await sleep(250);
  const newPageButtons = await page.$$('.cite-menu button');
  await newPageButtons[0].click();
  await sleep(900);
  const newPageCitation = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  check('换页后复制的是新文章引用', newPageCitation.includes('MindPilot') && newPageCitation.includes('mindpilot-multi-agent-rag'), JSON.stringify(newPageCitation.slice(0, 60)));

  await page.goto(BASE + '/2026/08/28/docmind-agent-causal-study/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1000);
  check('无反向链接的文章不渲染空区块', await page.evaluate(() => !document.querySelector('.cj-backlinks')));

  console.log('=== 9. 键盘快捷键 ===');
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(BASE + '/2026/05/10/docmind-rag-knowledge-base/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1300);

  await page.keyboard.down('Shift');
  await page.keyboard.press('Slash');
  await page.keyboard.up('Shift');
  await sleep(300);
  const helpDialog = await page.evaluate(() => {
    const dialog = document.getElementById('shortcut-help');
    return dialog ? {
      open: dialog.open,
      modal: dialog.matches(':modal'),
      title: dialog.querySelector('h2')?.textContent || '',
      rows: dialog.querySelectorAll('.shortcut-help-list > div').length,
      focus: document.activeElement && document.activeElement.className,
    } : null;
  });
  check('? 打开快捷键帮助', !!helpDialog && helpDialog.open && helpDialog.modal && helpDialog.rows >= 6 && helpDialog.title.includes('快捷键'), JSON.stringify(helpDialog));
  check('帮助打开后焦点在关闭按钮', !!helpDialog && helpDialog.focus === 'shortcut-help-close', helpDialog && helpDialog.focus);

  await page.keyboard.press('Escape');
  await sleep(250);
  check('Esc 关闭快捷键帮助', await page.evaluate(() => !document.getElementById('shortcut-help').open));

  const themeBefore = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await page.keyboard.press('t');
  await sleep(700);
  const themeAfter = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  check('t 切换明暗主题', themeAfter !== themeBefore, JSON.stringify({ themeBefore, themeAfter }));
  await page.keyboard.press('t');
  await sleep(600);

  await page.evaluate(() => {
    const input = document.createElement('input');
    input.id = 'cj-key-test';
    document.body.appendChild(input);
    input.focus();
  });
  await page.keyboard.down('Shift');
  await page.keyboard.press('Slash');
  await page.keyboard.up('Shift');
  await sleep(300);
  const typingGuard = await page.evaluate(() => ({
    dialog: !!document.querySelector('dialog[open]'),
    value: document.getElementById('cj-key-test')?.value || '',
  }));
  check('输入框聚焦时快捷键不触发', !typingGuard.dialog && typingGuard.value.includes('?'), JSON.stringify(typingGuard));
  await page.evaluate(() => document.getElementById('cj-key-test')?.remove());

  await page.keyboard.press('g');
  await sleep(80);
  await page.keyboard.press('h');
  await sleep(1800);
  check('g h 回到首页', await page.evaluate(() => location.pathname === '/'), await page.evaluate(() => location.pathname));

  console.log('=== 10. 图片查看器双指平移 ===');
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(BASE + ARTICLE, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1400);
  await page.evaluate(() => {
    const img = document.querySelector('.article-content img');
    if (img) img.scrollIntoView({ block: 'center' });
  });
  await sleep(400);
  const viewerSource = await page.$('.article-content img');
  check('文章有可打开查看器的图片', !!viewerSource);
  if (viewerSource) await viewerSource.click();
  await sleep(700);
  check('图片查看器已打开', await page.evaluate(() => !!document.querySelector('.image-viewer-container.active')));

  const zoomed = await page.evaluate(() => {
    const img = document.querySelector('.image-viewer-frame img');
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    img.dispatchEvent(new WheelEvent('wheel', {
      deltaY: -800,
      clientX: rect.x + rect.width / 2,
      clientY: rect.y + rect.height / 2,
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    }));
    return img.style.transform;
  });
  await sleep(400);
  const scaleValue = parseFloat((zoomed || '').match(/scale\(([\d.]+)\)/)?.[1] || '0');
  check('ctrl+滚轮放大图片', scaleValue > 1, zoomed || '');

  const beforePan = await page.evaluate(() => document.querySelector('.image-viewer-frame img')?.style.transform || '');
  const box = await page.evaluate(() => {
    const rect = document.querySelector('.image-viewer-frame img').getBoundingClientRect();
    return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
  });
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const cdp = await page.createCDPSession();
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: cx - 50, y: cy, id: 1 }, { x: cx + 50, y: cy, id: 2 }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: cx - 10, y: cy, id: 1 }, { x: cx + 90, y: cy, id: 2 }],
  });
  await sleep(400);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(300);
  const afterPan = await page.evaluate(() => document.querySelector('.image-viewer-frame img')?.style.transform || '');
  const tx = value => parseFloat((value.match(/translate\(([-\d.]+)px/) || [])[1] || '0');
  check('双指平移改变图片位置', tx(afterPan) > tx(beforePan) + 20, JSON.stringify({ beforePan, afterPan }));

  await page.keyboard.press('Escape');
  await sleep(300);
  check('Esc 关闭查看器', await page.evaluate(() => !document.querySelector('.image-viewer-container.active')));

  console.log('=== 11. 页面错误 ===');
  check('零页面错误', errors.length === 0, errors.join(' | '));

  await browser.close();
  server.close();
  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail ? 1 : 0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
