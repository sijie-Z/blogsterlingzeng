/**
 * Timeline tag — 关于页/项目复盘用的竖向时间线。
 *
 * 用法:
 *   {% timeline %}
 *   2026.10 :: 支持 Markdown 的一行说明
 *   2026.09 :: 另一行
 *   {% endtimeline %}
 *
 * 构建期渲染成语义化 <ol>,运行时零依赖。
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

function inlineMarkdown(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  try {
    return hexo.render.renderSync({ text: raw, engine: 'markdown' })
      .replace(/^<p>([\s\S]*)<\/p>\s*$/, '$1')
      .trim();
  } catch (e) {
    return escapeHtml(raw);
  }
}

hexo.extend.tag.register('timeline', function (args, content) {
  const items = String(content || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const index = line.indexOf('::');
      if (index === -1) return { date: '', text: line };
      return { date: line.slice(0, index).trim(), text: line.slice(index + 2).trim() };
    })
    .map(item => `<li>
      ${item.date ? `<span class="cj-timeline-date">${escapeHtml(item.date)}</span>` : ''}
      <div class="cj-timeline-body">${inlineMarkdown(item.text)}</div>
    </li>`)
    .join('');

  return `<ol class="cj-timeline">${items}</ol>`;
}, { ends: true });
