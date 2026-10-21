/* Web Vitals 探针:CLS / LCP / 最大位移来源 */
const puppeteer = require('puppeteer-core');
const { startServer } = require('./static-server');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PORT = Number(process.env.PORT || 4140);
const BASE = process.env.BASE || `http://127.0.0.1:${PORT}`;
const PAGES = (process.env.PAGES || '/,/2026/10/21/live2d-cubism5-migration/,/archives,/about').split(',');

(async () => {
  const server = await startServer(PORT);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--no-proxy-server', '--enable-gpu', '--use-angle=d3d11', '--disable-dev-shm-usage'],
  });
  const results = [];
  for (const p of PAGES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.evaluateOnNewDocument(() => {
      window.__v = { cls: 0, lcp: 0, shifts: [] };
      try {
        new PerformanceObserver(list => {
          for (const e of list.getEntries()) window.__v.lcp = Math.max(window.__v.lcp, e.startTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver(list => {
          for (const e of list.getEntries()) {
            if (e.hadRecentInput) continue;
            window.__v.cls += e.value;
            if (e.sources) {
              for (const s of e.sources) {
                const n = s.node;
                const cls = n ? (n.tagName + '.' + String(n.className || '').split(' ').slice(0, 2).join('.')) : '?';
                window.__v.shifts.push({ v: Number(e.value.toFixed(4)), el: cls });
              }
            }
          }
        }).observe({ type: 'layout-shift', buffered: true });
      } catch (err) {}
    });
    await page.goto(BASE + p, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);
    const initial = await page.evaluate(() => ({
      cls: Number(window.__v.cls.toFixed(4)),
      lcpMs: Math.round(window.__v.lcp),
      shifts: window.__v.shifts.slice(0, 6),
    }));
    await page.evaluate(async () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      for (let y = 0; y < h; y += 220) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 40));
      }
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 300));
    });
    await sleep(800);
    const final = await page.evaluate(() => ({
      cls: Number(window.__v.cls.toFixed(4)),
      shifts: window.__v.shifts.slice(0, 10),
    }));
    results.push({ path: p, initial, final });
    await page.close();
  }
  console.log(JSON.stringify(results, null, 1));
  await browser.close();
  server.close();
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
