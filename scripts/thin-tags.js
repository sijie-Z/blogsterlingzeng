/**
 * Thin tags — 只有 1 篇文章的标签页不参与索引,也从 sitemap 移除。
 * 页面本身仍然可访问,只是不把薄内容送进搜索引擎。
 */

'use strict';

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

function thinTags() {
  const tags = hexo.locals.get('tags');
  const out = [];
  if (tags && tags.forEach) {
    tags.forEach(tag => {
      const count = tag.posts && tag.posts.length ? tag.posts.length : 0;
      if (count < 2) out.push(tag);
    });
  }
  return out;
}

hexo.extend.filter.register('after_render:html', function (str, locals) {
  const page = locals && locals.page;
  if (!str || !page || !page.tag || !page.posts || page.posts.length >= 2) return str;
  if (str.includes('name="robots" content="noindex,follow,max-image-preview:large"')) return str;
  return str.replace(
    /<meta name="robots" content="[^"]*">/,
    '<meta name="robots" content="noindex,follow,max-image-preview:large">'
  );
});

hexo.extend.filter.register('after_generate', function () {
  const tags = thinTags();
  if (!tags.length) return;
  let route;
  try { route = hexo.route.get('sitemap.xml'); } catch (e) { return; }
  if (!route) return;
  const root = String(hexo.config.url || '').replace(/\/+$/, '');
  return streamToString(route).then(xml => {
    if (!xml) return;
    let out = xml;
    for (const tag of tags) {
      const loc = encodeURI(root + '/' + String(tag.path || '').replace(/^\/+/, ''));
      const escaped = loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      out = out.replace(new RegExp(`<url>\\s*<loc>${escaped}</loc>[\\s\\S]*?</url>\\s*`, 'g'), '');
    }
    hexo.route.set('sitemap.xml', out);
  });
});
