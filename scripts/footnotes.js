/**
 * Footnotes — 给 marked 4.3 补上 [^id] 脚注。
 *
 * 在 before_post_render 阶段处理原始 Markdown:
 *   - 代码块 / 行内代码里的 [^x] 不动
 *   - 定义行 `[^id]: 说明` 收集起来并从正文移除
 *   - 引用处输出 doc-noteref 上标,文末输出 doc-endnotes 列表
 * 不引入新渲染器,也不影响现有 Markdown 语法。
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

hexo.extend.filter.register('before_post_render', function (data) {
  const source = String(data.content || '');
  if (!source.includes('[^')) return data;

  // 先把代码块和行内代码换成占位符,避免误伤示例代码
  const stash = [];
  const protect = text => text.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`/g, match => {
    const token = `\u0000CJCODE${stash.length}\u0000`;
    stash.push(match);
    return token;
  });

  let text = protect(source);
  const definitions = new Map();
  text = text.replace(/^\[\^([^\]\s]+)\]:[ \t]*(.+)$/gm, (match, id, body) => {
    definitions.set(id, body.trim());
    return '';
  });
  if (!definitions.size) return data;

  const order = [];
  const refs = new Map();
  text = text.replace(/\[\^([^\]\s]+)\]/g, (match, id) => {
    if (!definitions.has(id)) return match;
    let index = order.indexOf(id);
    if (index === -1) {
      order.push(id);
      index = order.length - 1;
    }
    const number = index + 1;
    const enc = encodeURIComponent(id);
    const seen = refs.get(id) || [];
    seen.push(seen.length === 0 ? `fnref-${enc}` : `fnref-${enc}-${seen.length + 1}`);
    refs.set(id, seen);
    const refId = seen[seen.length - 1];
    return `<sup class="footnote-ref"><a href="#fn-${enc}" id="${refId}" aria-label="脚注 ${number}">${number}</a></sup>`;
  });

  if (order.length) {
    const renderBody = body => {
      try {
        return hexo.render.renderSync({ text: body, engine: 'markdown' })
          .replace(/^<p>([\s\S]*)<\/p>\s*$/, '$1')
          .trim();
      } catch (e) {
        return escapeHtml(body);
      }
    };
    const items = order.map(id => {
      const enc = encodeURIComponent(id);
      const backrefs = (refs.get(id) || []).map((refId, i) =>
        `<a href="#${refId}" class="footnote-backref" aria-label="返回正文${i ? ' ' + (i + 1) : ''}">↩${i ? `<sup>${i + 1}</sup>` : ''}</a>`
      ).join(' ');
      return `<li id="fn-${enc}">
      <p>${renderBody(definitions.get(id))} ${backrefs}</p>
    </li>`;
    }).join('\n');
    text += `\n\n<section class="footnotes" aria-label="脚注">\n<hr>\n<ol>\n${items}\n</ol>\n</section>\n`;
  }

  // 还原代码块
  text = text.replace(/\u0000CJCODE(\d+)\u0000/g, (match, index) => stash[Number(index)] || '');
  data.content = text;
  return data;
});
