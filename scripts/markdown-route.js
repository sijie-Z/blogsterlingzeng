/**
 * Markdown routes — 为每篇文章生成 /<path>/index.md 原始 Markdown，
 * 同时生成站点级 /llms.txt 索引。
 *
 * 为什么放在构建期:读者/AI 可以直接取到未渲染的原文，
 * 不需要额外服务；HTML 里再加 <link rel="alternate" type="text/markdown">。
 */

'use strict';

function postBody(post) {
  const raw = String(post.raw || '');
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

hexo.extend.generator.register('post-markdown', function (locals) {
  const posts = locals.posts.filter(post => post.published !== false && !post.draft).toArray();
  return posts.map(post => ({
    path: post.path + 'index.md',
    data: postBody(post),
  }));
});

hexo.extend.generator.register('llms-txt', function (locals) {
  const root = String(hexo.config.url || '').replace(/\/+$/, '');
  const posts = locals.posts.sort('-date').filter(post => post.published !== false && !post.draft).toArray();
  const lines = [
    '# ' + (hexo.config.title || 'Blog'),
    '',
    '> ' + (hexo.config.description || ''),
    '',
    '## 文章',
    '',
  ];
  for (const post of posts) {
    const desc = String(post.description || '').replace(/\s+/g, ' ').trim();
    lines.push(`- [${post.title}](${root}/${post.path})${desc ? '：' + desc : ''}`);
  }
  return { path: 'llms.txt', data: lines.join('\n') + '\n' };
});

hexo.extend.filter.register('after_render:html', function (str, locals) {
  const page = locals && locals.page;
  if (!str || !page || !page.__post) return str;
  const href = '/' + String(page.path || '').replace(/^\/+/, '') + 'index.md';
  return str.replace('</head>', `<link rel="alternate" type="text/markdown" href="${href}">\n</head>`);
});
