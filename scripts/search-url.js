/**
 * Search URL — 搜索索引里的页面 URL 统一成目录形式。
 *
 * hexo-generator-searchdb 会输出 /resume/index.html;
 * 站内页面 canonical 是 /resume/,搜索结果也应指向同一个地址。
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
  let route;
  try { route = hexo.route.get('search.xml'); } catch (e) { return; }
  if (!route) return;
  return streamToString(route).then(xml => {
    if (!xml) return;
    let out = xml
      .replace(/<url>\/\/([^<]+)<\/url>/g, '<url>/$1</url>')
      .replace(/<url>([^<]*?)\/index\.html<\/url>/g, '<url>$1/</url>')
      // 逐条删除 404,不能用跨 entry 的贪婪区间(会把所有文章一起删掉)
      .replace(/<entry>[\s\S]*?<\/entry>\s*/g, entry => entry.includes('<url>/404.html</url>') ? '' : entry);
    hexo.route.set('search.xml', out);
  });
});
