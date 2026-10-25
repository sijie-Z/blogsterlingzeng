/**
 * Photos page — 站点视觉页的静态兜底。
 *
 * 主题的 masonry 页只输出一个空容器，图片由前端 fetch 后插入：
 * 无 JS / 抓取失败时整页只剩标题。这里补上导语、加载提示和
 * <noscript> 静态图集，让爬虫和禁用脚本的访客也能看到内容。
 */

'use strict';

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

hexo.extend.filter.register('after_render:html', function (str, locals) {
  const page = locals && locals.page;
  if (!str || !page || !str.includes('id="masonry-container"')) return str;
  if (str.includes('photos-intro')) return str;

  let items = [];
  try {
    const fs = require('fs');
    const path = require('path');
    const yaml = require('js-yaml');
    const file = path.join(hexo.source_dir, '_data', 'masonry.yml');
    items = yaml.load(fs.readFileSync(file, 'utf8')) || [];
  } catch (e) {
    items = [];
  }
  const intro = String(page.content || '').trim();

  if (intro) {
    str = str.replace(/(<h1 class="page-title-header">[\s\S]*?<\/h1>)/,
      (match) => `${match}<div class="photos-intro">${intro}</div>`);
  }

  const figures = items.map(item => `<figure class="photos-static-item">
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title || '站点横幅')}" loading="lazy" width="960" height="540">
      <figcaption><strong>${escapeHtml(item.title || '')}</strong>${item.description ? `<span>${escapeHtml(item.description)}</span>` : ''}</figcaption>
    </figure>`).join('');

  const fallback = `<p class="photos-loading">正在加载照片…</p>` +
    (figures ? `\n<noscript><div class="photos-static">${figures}</div></noscript>` : '');

  str = str.replace(/(<div\b[^>]*\bid="masonry-container"[^>]*><\/div>)/, (match) => match + fallback);

  return str;
});
