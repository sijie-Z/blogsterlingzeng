/**
 * Gallery tag — 文章内图片网格。
 *
 * 用法:
 *   {% gallery %}
 *   /images/a.webp | 图注 A
 *   /images/b.webp | 图注 B
 *   {% endgallery %}
 *
 * 构建期输出 figure 网格;图片仍然走主题的图片查看器与懒加载。
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

hexo.extend.tag.register('gallery', function (args, content) {
  const items = String(content || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const index = line.indexOf('|');
      const src = (index === -1 ? line : line.slice(0, index)).trim();
      const caption = index === -1 ? '' : line.slice(index + 1).trim();
      return `<figure class="cj-gallery-item" role="listitem">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(caption || '文章配图')}" loading="lazy" decoding="async">
        ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''}
      </figure>`;
    })
    .join('');

  return `<div class="cj-gallery" role="list" aria-label="图片集">${items}</div>`;
}, { ends: true });
