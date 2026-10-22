/* 阅读位置记忆：滚动→保存→重载→继续阅读→到底清除 */
'use strict';

const puppeteer = require('puppeteer-core');
const { startServer } = require('./static-server');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.PORT || 4205);
const BASE = `http://127.0.0.1:${PORT}`;
const ARTICLE = '/2026/04/22/docker-getting-started/';
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
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 160)));

  await page.goto(BASE + ARTICLE, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1200);
  await page.evaluate(() => localStorage.removeItem('cj-reading-positions'));
  await page.evaluate(() => window.scrollTo(0, Math.round((document.documentElement.scrollHeight - innerHeight) * 0.5)));
  await sleep(900);
  const saved = await page.evaluate(() => {
    const map = JSON.parse(localStorage.getItem('cj-reading-positions') || '{}');
    return map[location.pathname] || null;
  });
  check('滚动后保存了阅读位置', saved && saved.y > 300 && saved.percent > 0.3 && saved.percent < 0.7, JSON.stringify(saved));

  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1400);
  const pill = await page.evaluate(() => {
    const el = document.querySelector('.reading-resume');
    return el ? { show: el.classList.contains('show'), text: el.textContent } : null;
  });
  check('重载后出现继续阅读胶囊', !!pill && pill.show && /%/.test(pill.text), JSON.stringify(pill));

  if (pill && pill.show) {
    await page.click('.reading-resume');
    await sleep(1000);
    const after = await page.evaluate(() => ({
      y: Math.round(scrollY),
      max: Math.round(document.documentElement.scrollHeight - innerHeight),
      visible: !!document.querySelector('.reading-resume.show'),
    }));
    check('点击后回到上次位置', after.y > after.max * 0.3, JSON.stringify(after));
    check('点击后胶囊收起', !after.visible);
  }

  // 读到底部应清除记录
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await sleep(900);
  const cleared = await page.evaluate(() => {
    const map = JSON.parse(localStorage.getItem('cj-reading-positions') || '{}');
    return map[location.pathname] || null;
  });
  check('读到结尾清除记录', cleared === null, JSON.stringify(cleared));

  await page.evaluate(() => localStorage.removeItem('cj-reading-positions'));
  check('零页面错误', errors.length === 0, errors.slice(0, 2).join(' | '));

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  await browser.close();
  server.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('崩溃:', e); process.exit(1); });
