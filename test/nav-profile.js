/* 诊断:CPU 采样分析第一次 SPA 跳转的耗时来源 */
const puppeteer = require('puppeteer-core');
const { startServer } = require('./static-server');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.PORT || 4140);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const server = await startServer(PORT);
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--no-sandbox', '--no-proxy-server', '--enable-gpu', '--use-angle=d3d11', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  if (process.env.NO_L2D === '1') await page.evaluateOnNewDocument(() => localStorage.setItem('waifu-disabled', 'true'));
  const client = await page.target().createCDPSession();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3000);
  await client.send('Profiler.enable');
  await client.send('Profiler.setSamplingInterval', { interval: 1000 });
  await client.send('Profiler.start');
  const link = await page.$('.home-article-title a');
  const href = await link.evaluate(a => a.getAttribute('href'));
  await page.evaluate(h => {
    const a = [...document.querySelectorAll('a')].find(x => x.getAttribute('href') === h);
    if (a) a.click();
  }, href);
  await page.waitForFunction(h => location.pathname === h, { timeout: 10000 }, href).catch(() => {});
  await page.waitForFunction(() => !document.documentElement.classList.contains('is-animating'), { timeout: 10000 }).catch(() => {});
  await sleep(600);
  const { profile } = await client.send('Profiler.stop');
  const byId = new Map(profile.nodes.map(n => [n.id, n]));
  const counts = new Map();
  for (const id of profile.samples || []) counts.set(id, (counts.get(id) || 0) + 1);
  const top = [...counts.entries()].map(([id, c]) => {
    const n = byId.get(id);
    return { samples: c, fn: n?.callFrame?.functionName || '(anonymous)', url: (n?.callFrame?.url || '').split('/').slice(-2).join('/'), line: n?.callFrame?.lineNumber };
  }).sort((a, b) => b.samples - a.samples).slice(0, 20);
  console.log(JSON.stringify(top, null, 1));
  await browser.close(); server.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
