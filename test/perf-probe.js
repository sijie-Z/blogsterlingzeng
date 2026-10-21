/* 滚动性能探针:帧间隔、长任务、布局/样式重算、资源统计 */
const puppeteer = require('puppeteer-core');
const { startServer } = require('./static-server');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL = process.env.PROBE_URL || 'http://127.0.0.1:4140/';

(async () => {
  const server = await startServer(4140);
  const gpu = process.env.PROBE_GPU === '1';
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: gpu
      ? ['--no-sandbox', '--no-proxy-server', '--enable-gpu', '--use-angle=d3d11', '--disable-dev-shm-usage']
      : ['--no-sandbox', '--no-proxy-server', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  if (process.env.PROBE_NO_L2D === '1') {
    await page.evaluateOnNewDocument(() => localStorage.setItem('waifu-disabled', 'true'));
  }
  const client = await page.target().createCDPSession();
  await client.send('Performance.enable');

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(Number(process.env.PROBE_WARMUP || 3000));

  const metricsBefore = Object.fromEntries((await client.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));

  // 页面内记录滚动期间的帧间隔与长任务
  await page.evaluate(() => {
    window.__perf = { frames: [], longtasks: [], started: performance.now() };
    let last = performance.now();
    const loop = now => {
      window.__perf.frames.push(now - last);
      last = now;
      if (performance.now() - window.__perf.started < 6000) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    try {
      new PerformanceObserver(list => {
        for (const e of list.getEntries()) window.__perf.longtasks.push({ start: Math.round(e.startTime), dur: Math.round(e.duration) });
      }).observe({ entryTypes: ['longtask'] });
    } catch (_) {}
  });

  // 页面内连续上下滚动 6 秒(更接近真实连续手势)
  const maxY = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await page.evaluate(async maxY => {
    const end = performance.now() + 6000;
    let y = 0, dir = 1;
    await new Promise(resolve => {
      const step = () => {
        y += dir * 14;
        if (y >= maxY) { y = maxY; dir = -1; }
        if (y <= 0) { y = 0; dir = 1; }
        window.scrollTo(0, y);
        if (performance.now() < end) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }, maxY);
  await sleep(800);

  const metricsAfter = Object.fromEntries((await client.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  const perf = await page.evaluate(() => window.__perf);
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return 'no-webgl';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });

  const frames = perf.frames.filter(f => f > 0);
  frames.sort((a, b) => a - b);
  const pct = p => Math.round(frames[Math.min(frames.length - 1, Math.floor(frames.length * p))]);
  const over50 = frames.filter(f => f > 50).length;
  const over100 = frames.filter(f => f > 100).length;

  const delta = k => Math.round(((metricsAfter[k] || 0) - (metricsBefore[k] || 0)) * 100) / 100;

  console.log(JSON.stringify({
    renderer,
    frames: { count: frames.length, p50: pct(0.5), p95: pct(0.95), max: Math.round(frames[frames.length - 1] || 0), over50ms: over50, over100ms: over100 },
    longtasks: { count: perf.longtasks.length, totalMs: perf.longtasks.reduce((s, t) => s + t.dur, 0), worst: perf.longtasks.sort((a, b) => b.dur - a.dur).slice(0, 5) },
    metrics: {
      LayoutMs: delta('LayoutDuration'), RecalcStyleMs: delta('RecalcStyleDuration'),
      ScriptMs: delta('ScriptDuration'), TaskMs: delta('TaskDuration'),
      layouts: delta('LayoutCount'), styleRecalcs: delta('RecalcStyleCount'),
      jsHeapMB: Math.round((metricsAfter.JSHeapUsedSize || 0) / 1048576),
    },
  }, null, 1));

  await browser.close();
  server.close();
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
