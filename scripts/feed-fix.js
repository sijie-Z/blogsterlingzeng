/**
 * Feed Fix — Atom 1.0 的 feed-level updated 必须不早于任何 entry。
 * hexo-generator-feed 用最新文章 date 作为 feed updated;文章有 updated 字段时
 * 会出现 feed updated < entry updated。这里在写盘前取所有 entry 的最大值。
 * 同时补齐 xml:lang。
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

hexo.extend.filter.register('after_generate', function () {
  const routes = hexo.route.list().filter(path => /(^|\/)atom\.xml$/.test(path));
  return Promise.all(routes.map(async path => {
    const route = hexo.route.get(path);
    if (!route) return;
    let xml = await streamToString(route);
    if (!xml || !xml.includes('<feed')) return;
    const updated = [...xml.matchAll(/<updated>([^<]+)<\/updated>/g)].map(m => m[1]);
    if (updated.length > 1) {
      const max = updated.sort().pop();
      xml = xml.replace(/<updated>[^<]+<\/updated>/, `<updated>${max}</updated>`);
    }
    if (!/<feed[^>]*xml:lang=/.test(xml)) {
      xml = xml.replace('<feed ', '<feed xml:lang="zh-CN" ');
    }
    hexo.route.set(path, xml);
  }));
});
