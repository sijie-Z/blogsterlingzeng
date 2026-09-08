/* Live2D 专项调试(自管理静态服务器) */
const puppeteer = require('puppeteer-core');
const { startServer } = require('./static-server');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const server = await startServer();
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--no-proxy-server', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', m => logs.push(`[${m.type()}] ${m.text().slice(0, 300)}`));
  page.on('pageerror', e => logs.push('[PAGEERROR] ' + String(e && (e.message || e)).slice(0, 300)));
  page.on('requestfailed', r => logs.push('[REQFAIL] ' + r.url().slice(0, 150)));
  page.on('response', r => { if (r.status() === 404) logs.push('[HTTP404] ' + r.url().slice(0, 200)); });

  await page.goto('http://127.0.0.1:4140/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 15000));

  const state = await page.evaluate(() => {
    const waifuEl = document.querySelector('#waifu');
    if (waifuEl) console.log('WAIFU-HTML:', waifuEl.innerHTML.slice(0, 500));
    const gl = document.createElement('canvas').getContext('webgl');
    const state2 = gl ? gl.getParameter(gl.VERSION) : 'no-webgl';
    console.log('WEBGL:', state2);
    const res = performance.getEntriesByType('resource');
    return JSON.stringify({
      waifu: !!document.querySelector('#waifu'),
      canvas: !!document.querySelector('#live2d'),
      modelList: res.filter(r => r.name.includes('model_list')).length,
      chunkFiles: res.filter(r => r.name.includes('chunk/')).map(r => r.name.split('/').pop()),
      moc: res.filter(r => r.name.includes('.moc')).length,
      textures: res.filter(r => r.name.includes('texture_')).length,
      live2dMin: res.filter(r => r.name.includes('live2d.min.js')).length,
      waifuTips: res.filter(r => r.name.includes('waifu-tips.js')).length,
      waifuJson: res.filter(r => r.name.includes('waifu-tips.json')).length,
    });
  });
  console.log('STATE:', state);
  console.log('=== 关键日志 ===');
  logs.filter(l => !l.includes('APlayer')).slice(0, 20).forEach(l => console.log(l));
  await browser.close();
  server.close();
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
