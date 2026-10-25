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
    (figures
      ? `\n<div class="photos-static photos-static-fallback is-hidden">${figures}</div>` +
        `\n<noscript><style>#masonry-container,.photos-loading{display:none!important}.photos-static-fallback.is-hidden{display:grid!important}</style></noscript>` +
        // main.js / MiniMasonry 被拦截时主题不会报错,只会一直转圈。
        // 超时后用静态图集接管;Masonry 后来加载成功时再自动让位。
        `\n<script data-swup-reload-script>
(function () {
  var container = document.getElementById('masonry-container');
  var fallback = document.querySelector('.photos-static-fallback');
  var loading = document.querySelector('.photos-loading');
  if (!container || !fallback) return;
  function showFallback() {
    if (container.querySelector('.masonry-item') || container.querySelector('.photos-error')) return;
    fallback.classList.remove('is-hidden');
    if (loading) loading.style.display = 'none';
    container.classList.add('masonry-failed');
  }
  function sync() {
    if (!container.querySelector('.masonry-item')) return;
    fallback.classList.add('is-hidden');
    container.classList.remove('masonry-failed');
  }
  new MutationObserver(sync).observe(container, { childList: true });
  setTimeout(showFallback, 4000);
})();
</script>`
      : '');

  str = str.replace(/(<div\b[^>]*\bid="masonry-container"[^>]*><\/div>)/, (match) => match + fallback);

  return str;
});
