/* 资源与 SEO 回归:响应式横幅 / WebP 纹理 / 系列收录 / JSON-LD */
'use strict';

const puppeteer = require('puppeteer-core');
const { startServer } = require('./static-server');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.PORT || 4250);
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
    protocolTimeout: 60000,
  });

  console.log('=== 1. 桌面横幅 ===');
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('waifu-disabled', 'true');
    localStorage.setItem('REDEFINE-THEME-STATUS', JSON.stringify({ isDark: false }));
  });
  const musicRequests = [];
  page.on('request', r => { if (r.url().endsWith('/music/123.mp3')) musicRequests.push(r.url()); });
  const live2dRequests = [];
  page.on('request', r => { if (r.url().includes('/live2d/model')) live2dRequests.push(r.url()); });
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(800);
  const desktop = await page.evaluate(() => {
    const img = document.querySelector('.home-banner-background img');
    return {
      srcset: img?.getAttribute('srcset') || '',
      sizes: img?.getAttribute('sizes') || '',
      current: img?.currentSrc || '',
      natural: img ? [img.naturalWidth, img.naturalHeight] : null,
    };
  });
  check('横幅有 srcset', /banner-light-960\.webp 960w/.test(desktop.srcset) && /1920w/.test(desktop.srcset), desktop.srcset);
  check('横幅 sizes=100vw', desktop.sizes === '100vw', desktop.sizes);
  check('桌面加载原图或 1280+', /banner-light(-1280)?\.webp/.test(desktop.current), desktop.current);
  check('横幅有原始尺寸', desktop.natural?.[0] > 0, JSON.stringify(desktop.natural));

  const fontPreloads = await page.evaluate(() =>
    [...document.querySelectorAll('link[rel="preload"][as="font"]')].map(link => link.getAttribute('href') || '')
  );
  check('首屏标题/正文字体已 preload', fontPreloads.some(h => h.includes('Chillax-Variable.woff2')) && fontPreloads.some(h => h.includes('GeistVF.woff2')), JSON.stringify(fontPreloads));

  console.log('=== 2. 移动端按 DPR 选图 ===');
  const mobile = await browser.newPage();
  await mobile.evaluateOnNewDocument(() => localStorage.setItem('waifu-disabled', 'true'));
  await mobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });
  const bannerRequests = [];
  mobile.on('request', r => {
    if (r.url().includes('/images/banner-')) bannerRequests.push(r.url().replace(BASE, ''));
  });
  await mobile.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await mobile.waitForFunction(() => {
    const img = document.querySelector('.home-banner-background img');
    return !!img && img.complete && img.naturalWidth > 0;
  }, { timeout: 10000 }).catch(() => {});
  const mobileImg = await mobile.evaluate(() => {
    const img = document.querySelector('.home-banner-background img');
    return { current: img?.currentSrc || '', width: img?.naturalWidth || 0, complete: !!img?.complete };
  });
  check('移动端 DPR3 选 1280 变体', /banner-light-1280\.webp/.test(mobileImg.current), mobileImg.current);
  check('移动端不下载 1920 原图', !bannerRequests.includes('/images/banner-light.webp'), JSON.stringify(bannerRequests));
  check('移动端变体已解码', mobileImg.complete && mobileImg.width > 0, JSON.stringify(mobileImg));
  const mobileBanner = await mobile.evaluate(() => {
    const b = document.querySelector('.home-banner-container');
    return b ? { h: b.getBoundingClientRect().height, vh: innerHeight } : { h: 0, vh: innerHeight };
  });
  check('移动端横幅不超过半屏', mobileBanner.h > 0 && mobileBanner.h <= mobileBanner.vh * 0.45, JSON.stringify(mobileBanner));
  await mobile.close();

  console.log('=== 3. 季节切换同步 srcset ===');
  await page.click('.nb-theme-btn');
  await page.waitForFunction(() => document.querySelector('.nb-dropdown')?.classList.contains('show'), { timeout: 5000 }).catch(() => {});
  const autumn = await page.$('.nb-opt[data-season="autumn"]');
  if (autumn) {
    await page.evaluate(() => document.querySelector('.nb-opt[data-season="autumn"]')?.click());
    await page.waitForFunction(() => document.documentElement.dataset.season === 'autumn', { timeout: 3000 }).catch(() => {});
    await sleep(1500);
    const season = await page.evaluate(() => {
      const img = document.querySelector('.home-banner-background img');
      return {
        season: document.documentElement.dataset.season,
        src: img?.getAttribute('src') || '',
        srcset: img?.getAttribute('srcset') || '',
        current: img?.currentSrc || '',
        natural: img?.naturalWidth || 0,
      };
    });
    check('季节已切换', season.season === 'autumn', season.season);
    check('季节图 srcset 已更新', /banner-autumn-960\.webp/.test(season.srcset) && /banner-autumn\.webp 1920w/.test(season.srcset), season.srcset);
    check('季节图加载成功', season.natural > 0 && /banner-autumn/.test(season.current), JSON.stringify(season));
  } else {
    check('季节选项存在', false);
  }

  check('音乐不随页面预加载', musicRequests.length === 0, JSON.stringify(musicRequests));
  check('Live2D 不抢首屏带宽', live2dRequests.length === 0, JSON.stringify(live2dRequests.slice(0, 3)));

  console.log('=== 4. Live2D 纹理 ===');
  const tex = await page.evaluate(async () => {
    const webp = await fetch('/live2d/model/ds-whale-girl/textures/texture_00.webp');
    const png = await fetch('/live2d/model/ds-whale-girl/textures/texture_00.png');
    return { webp: webp.status, png: png.status };
  });
  check('WebP 纹理可访问', tex.webp === 200, JSON.stringify(tex));
  check('原 PNG 保留为缓存回退', tex.png === 200, JSON.stringify(tex));

  console.log('=== 5. 系列收录 ===');
  const llms = await page.evaluate(async () => (await fetch('/llms.txt')).text());
  const sitemap = await page.evaluate(async () => (await fetch('/sitemap.xml')).text());
  check('llms.txt 有系列章节', llms.includes('## 系列') && llms.includes('/series/blog-engineering/'), llms.slice(-200));
  check('sitemap 收录系列页', sitemap.includes('/series/') && sitemap.includes('/series/agent-rag/'), 'missing series in sitemap');
  check('sitemap 不包含 404', !sitemap.includes('/404.html'), '404 found in sitemap');

  console.log('=== 5.5 404 页面 ===');
  const notFound = await page.goto(BASE + '/404.html', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(300);
  const nf = await page.evaluate(() => ({
    code: document.querySelector('.not-found-code')?.textContent.trim() || '',
    triggers: document.querySelectorAll('.not-found .search-popup-trigger').length,
    links: [...document.querySelectorAll('.not-found-actions a')].map(a => a.getAttribute('href')),
  }));
  check('404 页面可访问', notFound && notFound.status() === 200, String(notFound && notFound.status()));
  check('404 页面有搜索与返回入口', nf.code === '404' && nf.triggers === 1 && nf.links.includes('/series/'), JSON.stringify(nf));
  await page.click('.not-found .search-popup-trigger');
  const nfSearch = await page.waitForFunction(
    () => document.querySelector('.search-pop-overlay')?.classList.contains('active'),
    { timeout: 3000 }
  ).then(() => true).catch(() => false);
  check('404 页搜索按钮可用', nfSearch);
  const robots = await page.evaluate(() => document.querySelector('meta[name="robots"]')?.content || '');
  check('404 页面 noindex', robots.includes('noindex'), robots);
  await page.keyboard.press('Escape');
  await sleep(200);

  console.log('=== 6. JSON-LD ===');
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(400);
  const ld = await page.evaluate(() => document.querySelector('script[type="application/ld+json"]')?.textContent || '');
  check('首页有 WebSite JSON-LD', ld.includes('"WebSite"') && ld.includes('sterlingzeng.cn'), ld.slice(0, 120));
  const homeLd = await page.evaluate(() => {
    const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
    let ok = true;
    for (const s of scripts) { try { JSON.parse(s.textContent); } catch (e) { ok = false; } }
    return { count: scripts.length, ok };
  });
  check('首页 JSON-LD 可解析且唯一', homeLd.ok && homeLd.count === 1, JSON.stringify(homeLd));

  await page.goto(BASE + '/2026/10/22/font-subset-and-cls/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(400);
  const articleScripts = await page.evaluate(() =>
    [...document.querySelectorAll('script[src]')].map(s => s.getAttribute('src') || '')
  );
  check('文章页不加载首页专用 Typed', !articleScripts.some(src => src.includes('Typed')), JSON.stringify(articleScripts.slice(0, 5)));
  check('odometer 脚本已从全站移除', !articleScripts.some(src => src.includes('odometer')), 'odometer found');
  const articleLd = await page.evaluate(() => {
    try {
      const data = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
      const first = data['@graph'][0];
      return { ok: true, types: data['@graph'].map(x => x['@type']), series: first.isPartOf?.name || '', position: first.position || 0, parts: (first.hasPart || []).length };
    } catch (e) { return { ok: false, types: [] }; }
  });
  check('文章 JSON-LD 有 BlogPosting + BreadcrumbList', articleLd.ok && articleLd.types.includes('BlogPosting') && articleLd.types.includes('BreadcrumbList'), JSON.stringify(articleLd));
  check('文章 JSON-LD 关联系列与序号', articleLd.series === '博客工程化' && articleLd.position === 3, JSON.stringify(articleLd));

  await page.goto(BASE + '/series/blog-engineering/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(400);
  const seriesLd = await page.evaluate(() => {
    try {
      const data = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
      const first = data['@graph'][0];
      return { ok: true, types: data['@graph'].map(x => x['@type']), series: first.isPartOf?.name || '', position: first.position || 0, parts: (first.hasPart || []).length };
    } catch (e) { return { ok: false, types: [] }; }
  });
  check('系列页有 CollectionPage JSON-LD', seriesLd.ok && seriesLd.types.includes('CollectionPage'), JSON.stringify(seriesLd));
  check('系列页 JSON-LD 列出 6 篇文章', seriesLd.parts === 6, JSON.stringify(seriesLd));
  const ogUrl = await page.evaluate(() => ({
    og: document.querySelector('meta[property="og:url"]')?.content || '',
    canonical: document.querySelector('link[rel="canonical"]')?.href || '',
  }));
  check('系列页 og:url 与 canonical 一致', ogUrl.og && !ogUrl.og.endsWith('index.html') && ogUrl.og === ogUrl.canonical, JSON.stringify(ogUrl));

  const searchJs = await page.evaluate(async () => (await fetch('/js/build/tools/localSearch.js')).text());
  check('搜索防抖补丁生效', searchJs.includes('__cjSearchTimer'), 'patch missing');

  const aplayerJs = await page.evaluate(async () => (await fetch('/js/build/plugins/aplayer.js')).text());
  check('APlayer 无歌词时不请求 LRC', aplayerJs.includes('lrcType:e.some'), aplayerJs.slice(0, 120));
  check('APlayer 固定/迷你模式都 preload none', aplayerJs.includes('preload:"none",fixed:!0') && aplayerJs.includes('preload:"none",mini:!0'), aplayerJs.slice(0, 160));

  await page.goto(BASE + '/series/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(400);
  const seriesIndexLd = await page.evaluate(() => {
    try {
      const data = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
      return { ok: true, parts: (data['@graph'][0].hasPart || []).length };
    } catch (e) { return { ok: false, parts: 0 }; }
  });
  check('系列总览 JSON-LD 列出 2 个系列', seriesIndexLd.ok && seriesIndexLd.parts === 2, JSON.stringify(seriesIndexLd));

  await page.goto(BASE + '/about/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(400);
  const aboutLd = await page.evaluate(() => document.querySelector('script[type="application/ld+json"]')?.textContent || '');
  check('关于页有 ProfilePage JSON-LD', aboutLd.includes('"ProfilePage"') && aboutLd.includes('"Person"'), aboutLd.slice(0, 120));

  console.log('=== 8. Feed / robots / sitemap / 图标子集 ===');
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(400);
  const feeds = await page.evaluate(async () => {
    const read = async url => {
      const res = await fetch(url);
      return { status: res.status, data: await res.json() };
    };
    const site = await read('/feed.json');
    const series = await read('/series/agent-rag/feed.json');
    return {
      siteStatus: site.status,
      siteVersion: site.data.version,
      siteItems: site.data.items.length,
      allAbsolute: site.data.items.every(item => item.url.startsWith('https://') && !item.content_html.includes('src="/')),
      seriesStatus: series.status,
      seriesItems: series.data.items.length,
      seriesUrl: series.data.feed_url,
    };
  });
  check('站点 JSON Feed 可解析且为 1.1', feeds.siteStatus === 200 && feeds.siteVersion === 'https://jsonfeed.org/version/1.1', JSON.stringify(feeds));
  check('站点 JSON Feed 收录 22 篇文章', feeds.siteItems === 22, String(feeds.siteItems));
  check('JSON Feed 内 URL 全部绝对化', feeds.allAbsolute, 'relative url found');
  check('系列 JSON Feed 收录 3 篇文章', feeds.seriesStatus === 200 && feeds.seriesItems === 3, JSON.stringify(feeds));

  const seoMeta = await page.evaluate(() => ({
    robots: document.querySelector('meta[name="robots"]')?.content || '',
    iconCss: [...document.querySelectorAll('link[rel="stylesheet"]')].some(link => link.href.includes('fontawesome-icons-subset.css')),
    fullFaCss: [...document.querySelectorAll('link[rel="stylesheet"]')].some(link => /fontawesome\/(fontawesome|brands|solid|regular)\.min\.css/.test(link.href)),
    darkBanner: (() => {
      const img = document.querySelector('img[data-src*="banner-dark"]');
      return img ? { src: img.getAttribute('src') || '', data: img.dataset.src || '', loading: img.getAttribute('loading') || '' } : null;
    })(),
  }));
  check('robots 声明 max-image-preview:large', seoMeta.robots.includes('max-image-preview:large'), seoMeta.robots);
  check('只加载图标类名子集 CSS', seoMeta.iconCss && !seoMeta.fullFaCss, JSON.stringify(seoMeta));
  check('暗色横幅按需加载', !!seoMeta.darkBanner && seoMeta.darkBanner.loading !== 'eager' && /banner-dark\.webp/.test(seoMeta.darkBanner.data), JSON.stringify(seoMeta.darkBanner));

  const sitemapXml = await page.evaluate(async () => (await (await fetch('/sitemap.xml')).text()));
  check('sitemap 不再包含 index.html', !sitemapXml.includes('/index.html</loc>'), 'index.html found');
  check('sitemap 收录归档入口', sitemapXml.includes('/archives/</loc>'), 'archives missing');

  await browser.close();
  server.close();

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('崩溃:', e); process.exit(1); });
