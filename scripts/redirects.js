/**
 * Redirects — 文章 URL 迁移后的旧地址清理。
 *
 * `source/2026/10/22/hexo-series-reading-path/index.html` 是给旧链接用的跳转页。
 * 它会被 hexo-generator-sitemap 和 searchdb 当成普通页面收录;
 * 这里把旧地址从 sitemap 和搜索索引里移除,只保留跳转和 noindex。
 */

'use strict';

const REDIRECTS = {
  '/2026/10/22/hexo-series-reading-path/': '/2026/10/23/hexo-series-reading-path/',
};

function redirectPage(target, label) {
  const site = String(hexo.config.url || '').replace(/\/+$/, '');
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${label}</title>
  <link rel="canonical" href="${site}${target}">
  <link rel="icon" href="/images/favicon.png">
  <meta name="robots" content="noindex,follow">
  <meta http-equiv="refresh" content="0; url=${target}">
</head>
<body>
  <h1>${label}</h1>
  <p><a href="${target}">${target}</a></p>
</body>
</html>
`;
}

// 归档改成单页后，旧的 /archives/page/2/、/page/3/ 仍要能打开
hexo.extend.generator.register('archive-pagination-redirects', function () {
  const archiveCfg = hexo.config.archive_generator || {};
  if (archiveCfg.per_page !== 0) return [];
  return [2, 3].map(n => ({
    path: `archives/page/${n}/index.html`,
    data: redirectPage('/archives/', `归档第 ${n} 页已合并为一页`),
  }));
});

function streamToString(stream) {
  if (typeof stream === 'string') return Promise.resolve(stream);
  if (!stream || typeof stream.on !== 'function') return Promise.resolve('');
  return new Promise(resolve => {
    let data = '';
    stream.on('data', chunk => { data += chunk; });
    stream.on('end', () => resolve(data));
    stream.on('error', () => resolve(''));
  });
}

hexo.extend.filter.register('after_generate', function () {
  // 旧的迁移页在 source 里是一份完整 HTML,主题会再包一层页面骨架;
  // 直接用纯跳转 HTML 覆盖构建产物,避免重复的 title/robots/head。
  hexo.route.set(
    '2026/10/22/hexo-series-reading-path/index.html',
    redirectPage('/2026/10/23/hexo-series-reading-path/', '文章地址已更新')
  );

  const jobs = [];

  const sitemap = hexo.route.get('sitemap.xml');
  if (sitemap) {
    jobs.push(streamToString(sitemap).then(xml => {
      if (!xml) return;
      let out = xml;
      for (const oldUrl of Object.keys(REDIRECTS)) {
        out = out.replace(/<url>[\s\S]*?<\/url>\s*/g, block =>
          block.includes(oldUrl) ? '' : block
        );
      }
      if (out !== xml) hexo.route.set('sitemap.xml', out);
    }));
  }

  const search = hexo.route.get('search.xml');
  if (search) {
    jobs.push(streamToString(search).then(xml => {
      if (!xml) return;
      let out = xml;
      for (const oldUrl of Object.keys(REDIRECTS)) {
        out = out.replace(/<entry>[\s\S]*?<\/entry>\s*/g, block =>
          block.includes(oldUrl) ? '' : block
        );
      }
      if (out !== xml) hexo.route.set('search.xml', out);
    }));
  }

  return Promise.all(jobs);
}, 20);
