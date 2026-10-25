/* 搜索键盘导航:combobox / listbox / 方向键 / Enter / 空态 / SPA */
'use strict';

const puppeteer = require('puppeteer-core');
const { startServer } = require('./static-server');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.PORT || 4290);
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name, extra || ''); }
}

async function openSearch(page) {
  await page.click('.desktop .search-popup-trigger');
  await page.waitForFunction(
    () => document.querySelector('.search-pop-overlay')?.classList.contains('active'),
    { timeout: 5000 }
  ).catch(() => {});
  await sleep(500);
}

async function typeQuery(page, text) {
  await page.type('.search-input', text, { delay: 40 });
  await page.waitForFunction(
    () => document.querySelectorAll('#search-result ul.search-result-list > li').length > 0,
    { timeout: 8000 }
  ).catch(() => {});
  await sleep(350);
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

  console.log('=== 1. combobox / listbox 结构 ===');
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1500);
  await openSearch(page);
  await typeQuery(page, '博客');
  const a11y = await page.evaluate(() => {
    const input = document.querySelector('.search-input');
    const box = document.querySelector('#search-result');
    const opts = [...box.querySelectorAll('ul.search-result-list > li')];
    return {
      inputRole: input.getAttribute('role'),
      autocomplete: input.getAttribute('aria-autocomplete'),
      expanded: input.getAttribute('aria-expanded'),
      controls: input.getAttribute('aria-controls'),
      boxRole: box.getAttribute('role'),
      boxLabel: box.getAttribute('aria-label'),
      count: opts.length,
      optionRoles: opts.every(li => li.getAttribute('role') === 'option'),
      uniqueIds: new Set(opts.map(li => li.id)).size === opts.length,
      labels: opts.every(li => (li.getAttribute('aria-label') || '').length > 0),
      linksInside: opts.reduce((sum, li) => sum + li.querySelectorAll('a').length, 0),
      hrefs: opts.every(li => !!li.dataset.cjHref),
      status: document.querySelector('#cj-search-status')?.textContent || '',
    };
  });
  check('输入框是 combobox', a11y.inputRole === 'combobox' && a11y.autocomplete === 'list', JSON.stringify(a11y));
  check('结果容器是 listbox', a11y.boxRole === 'listbox' && !!a11y.boxLabel, JSON.stringify(a11y));
  check('结果项 role=option 且有名称', a11y.count > 0 && a11y.optionRoles && a11y.labels, JSON.stringify(a11y));
  check('结果项 id 唯一、无嵌套链接且可跳转', a11y.uniqueIds && a11y.linksInside === 0 && a11y.hrefs, JSON.stringify(a11y));
  check('结果数量有播报', /找到 \d+ 个结果/.test(a11y.status), a11y.status);

  await page.evaluate(() => {
    const input = document.querySelector('.search-input');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await typeQuery(page, '简历');
  await sleep(700);
  const pageHrefs = await page.evaluate(() =>
    [...document.querySelectorAll('#search-result li')].map(li => li.dataset.cjHref || li.querySelector('a[href]')?.getAttribute('href') || '')
  );
  check('页面结果使用目录 URL', pageHrefs.includes('/resume/') && !pageHrefs.some(h => h.includes('index.html')), JSON.stringify(pageHrefs.slice(0, 5)));
  check('精确标题排在搜索结果第一位', pageHrefs[0] === '/resume/', JSON.stringify(pageHrefs.slice(0, 5)));
  const searchXml = await page.evaluate(async () => (await fetch('/search.xml')).text());
  check('404 页不进搜索索引', !searchXml.includes('/404.html'), '404 found');
  check('搜索索引包含文章而非只有页面', /<url>\/2026\//.test(searchXml) && (searchXml.match(/<entry>/g) || []).length >= 30, String((searchXml.match(/<entry>/g) || []).length));

  console.log('=== 2. 方向键高亮 ===');
  await page.keyboard.press('ArrowDown');
  await sleep(150);
  const down = await page.evaluate(() => {
    const selected = document.querySelector('#search-result li[aria-selected="true"]');
    const box = document.querySelector('#search-result');
    const input = document.querySelector('.search-input');
    if (!selected) return { selected: false };
    const c = box.getBoundingClientRect();
    const r = selected.getBoundingClientRect();
    return {
      selected: true,
      count: document.querySelectorAll('#search-result li[aria-selected="true"]').length,
      activeDesc: input.getAttribute('aria-activedescendant'),
      id: selected.id,
      inView: r.top >= c.top - 2 && r.bottom <= c.bottom + 2,
      href: selected.dataset.cjHref || selected.querySelector('a[href]')?.getAttribute('href') || '',
    };
  });
  check('ArrowDown 选中唯一结果', down.selected && down.count === 1, JSON.stringify(down));
  check('aria-activedescendant 指向选中项', down.activeDesc && down.activeDesc === down.id, JSON.stringify(down));
  check('选中项滚动进视口', down.inView, JSON.stringify(down));
  await page.keyboard.press('ArrowUp');
  await sleep(120);
  const up = await page.evaluate(() => {
    const selected = document.querySelector('#search-result li[aria-selected="true"]');
    return { count: document.querySelectorAll('#search-result li[aria-selected="true"]').length, id: selected?.id || '' };
  });
  check('ArrowUp 仍保持唯一高亮', up.count === 1, JSON.stringify(up));

  console.log('=== 3. Enter 打开结果 ===');
  const target = down.href;
  await page.keyboard.press('ArrowDown');
  await sleep(100);
  // 回到第一条,保证目标确定
  const firstHref = await page.evaluate(() => {
    const first = document.querySelector('#search-result ul.search-result-list > li:first-child');
    return first ? (first.dataset.cjHref || first.querySelector('a[href]')?.getAttribute('href') || '') : '';
  });
  await page.keyboard.press('Enter');
  await page.waitForFunction(h => location.pathname === h, { timeout: 8000 }, firstHref).catch(() => {});
  await sleep(300);
  const entered = await page.evaluate(() => ({
    path: location.pathname,
    active: !!document.querySelector('.search-pop-overlay.active'),
    overflow: document.body.style.overflow,
  }));
  check('Enter 跳转到选中文章', entered.path === firstHref, JSON.stringify({ entered, firstHref, target }));
  check('跳转后弹层关闭且滚动解锁', !entered.active && entered.overflow === '', JSON.stringify(entered));

  console.log('=== 4. 空结果提示 ===');
  await openSearch(page);
  await page.type('.search-input', 'zzzzzzzz', { delay: 30 });
  await sleep(700);
  const empty = await page.evaluate(() => ({
    status: document.querySelector('#cj-search-status')?.textContent || '',
    data: document.querySelector('#no-result')?.getAttribute('data-cj-empty') || '',
    activeDesc: document.querySelector('.search-input').hasAttribute('aria-activedescendant'),
    list: !!document.querySelector('#search-result ul.search-result-list'),
  }));
  check('空结果有文字与播报', empty.status.includes('没有找到') && empty.data.includes('没有找到'), JSON.stringify(empty));
  check('空结果清除 activedescendant', !empty.activeDesc && !empty.list, JSON.stringify(empty));

  console.log('=== 5. IME 组合期间的 Enter ===');
  const beforeIme = await page.evaluate(() => location.pathname);
  await page.evaluate(() => {
    const input = document.querySelector('.search-input');
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', bubbles: true, cancelable: true, isComposing: true,
    }));
  });
  await sleep(300);
  const ime = await page.evaluate(() => ({
    path: location.pathname,
    active: !!document.querySelector('.search-pop-overlay.active'),
  }));
  check('IME 组合时 Enter 不跳转', ime.path === beforeIme && ime.active, JSON.stringify(ime));
  await page.keyboard.press('Escape');
  await sleep(300);

  console.log('=== 6. SPA 换页后与 Tab 陷阱 ===');
  // 归档已从主导航移到页脚(滚到底才显示),测试用 Swup 直接换页
  await page.evaluate(() => window.swup.navigate('/archives/'));
  await page.waitForFunction(() => location.pathname === '/archives/', { timeout: 10000 }).catch(() => {});
  await sleep(700);
  await page.keyboard.down('Control');
  await page.keyboard.press('k');
  await page.keyboard.up('Control');
  await sleep(500);
  await typeQuery(page, '博客');
  await page.keyboard.press('ArrowDown');
  await sleep(120);
  const spa = await page.evaluate(() => ({
    role: document.querySelector('.search-input')?.getAttribute('role'),
    selected: document.querySelectorAll('#search-result li[aria-selected="true"]').length,
  }));
  check('SPA 后搜索仍可键盘导航', spa.role === 'combobox' && spa.selected === 1, JSON.stringify(spa));
  for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
  const tab = await page.evaluate(() => ({
    inside: !!document.activeElement?.closest('.search-pop-overlay.active'),
    tag: document.activeElement?.tagName || '',
  }));
  check('Tab 不落到结果链接', tab.inside && tab.tag !== 'A', JSON.stringify(tab));

  console.log('=== 7. 查询切换与英文边界 ===');
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.swup.navigate('/'));
  await page.waitForFunction(() => location.pathname === '/', { timeout: 10000 }).catch(() => {});
  await sleep(700);
  await openSearch(page);
  await typeQuery(page, '项目');
  const projectFirst = await page.evaluate(() => document.querySelector('#search-result li')?.dataset.cjHref || '');
  check('项目精确标题优先于正文命中', projectFirst === '/projects/', projectFirst);
  await page.evaluate(() => {
    const result = document.querySelector('#search-result');
    result.scrollTop = result.scrollHeight;
    const input = document.querySelector('.search-input');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await typeQuery(page, 'RAG');
  const rag = await page.evaluate(() => {
    const result = document.querySelector('#search-result');
    const options = [...result.querySelectorAll('li[data-cj-href]')];
    const first = options[0]?.getBoundingClientRect();
    const box = result.getBoundingClientRect();
    return {
      count: options.length,
      scrollTop: result.scrollTop,
      firstVisible: !!first && first.bottom > box.top && first.top < box.bottom,
      reactStorageHit: options.some(li => (li.dataset.cjHref || '').includes('react-hooks-guide')),
    };
  });
  check('新查询回到结果顶部', rag.count > 0 && rag.scrollTop < 40 && rag.firstVisible, JSON.stringify(rag));
  check('RAG 不匹配 localStorage 单词内部', rag.count > 0 && !rag.reactStorageHit, JSON.stringify(rag));

  console.log('=== 8. 后退恢复搜索现场 ===');
  const savedSearchScroll = await page.evaluate(() => {
    const result = document.querySelector('#search-result');
    result.scrollTop = Math.min(420, result.scrollHeight);
    const top = result.scrollTop;
    document.querySelector('#search-result li[data-cj-href]')?.click();
    return top;
  });
  await page.waitForFunction(() => location.pathname !== '/', { timeout: 10000 }).catch(() => {});
  await sleep(500);
  await page.goBack();
  const restoredSearch = await page.waitForFunction(() => {
    const overlay = document.querySelector('.search-pop-overlay.active');
    const input = overlay?.querySelector('.search-input');
    return overlay && input?.value === 'RAG' && overlay.querySelectorAll('li[data-cj-href]').length > 0;
  }, { timeout: 10000 }).then(() => true).catch(() => false);
  await page.waitForFunction(
    top => Math.abs((document.querySelector('#search-result')?.scrollTop || 0) - top) < 60,
    { timeout: 5000 },
    savedSearchScroll
  ).catch(() => {});
  const restoredState = await page.evaluate(() => ({
    path: location.pathname,
    query: document.querySelector('.search-pop-overlay.active .search-input')?.value || '',
    scrollTop: document.querySelector('#search-result')?.scrollTop || 0,
    count: document.querySelectorAll('#search-result li[data-cj-href]').length,
  }));
  check('后退恢复关键词和结果列表', restoredSearch && restoredState.path === '/' && restoredState.query === 'RAG' && restoredState.count > 0, JSON.stringify(restoredState));
  check('后退恢复结果滚动位置', Math.abs(restoredState.scrollTop - savedSearchScroll) < 60, JSON.stringify({ savedSearchScroll, restoredState }));

  console.log('=== 9. 首次输入与索引加载竞态 ===');
  const race = await browser.newPage();
  race.on('pageerror', e => errors.push('race ' + String(e.message || e).slice(0, 120)));
  await race.setViewport({ width: 1440, height: 900 });
  await race.setRequestInterception(true);
  race.on('request', async req => {
    if (req.url().includes('/search.xml')) {
      await sleep(900);
      await req.continue();
    } else {
      await req.continue();
    }
  });
  await race.goto(BASE + '/resume/', { waitUntil: 'networkidle2', timeout: 30000 });
  await openSearch(race);
  await race.type('.search-input', '简历', { delay: 35 });
  const raceReady = await race.waitForFunction(
    () => document.querySelectorAll('#search-result li[data-cj-href]').length > 0,
    { timeout: 6000 }
  ).then(() => true).catch(() => false);
  check('索引返回后自动渲染当前输入', raceReady);
  await race.close();

  console.log('=== 10. 页面错误 ===');
  check('零页面错误', errors.length === 0, errors.slice(0, 2).join(' | '));

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  await browser.close();
  server.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('崩溃:', e); process.exit(1); });
