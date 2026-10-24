/**
 * Margin notes — `{% margin %}...{% endmargin %}` 生成一条边注。
 *
 * 宽屏(≥1680px)时边注浮在正文左侧页边,和引用点同一行附近;
 * 窄屏时点击引用标记,内容在底部卡片里打开(由 custom.js 负责)。
 * 全部构建期生成,运行时不发请求。
 */

'use strict';

let counter = 0;

hexo.extend.tag.register('margin', function (args, content) {
  counter += 1;
  const id = counter;
  let body;
  try {
    body = String(hexo.render.renderSync({ text: content, engine: 'markdown' }) || '').trim();
  } catch (e) {
    body = String(content || '').trim();
  }
  // 单段边注最常见;去掉外层 <p> 让它能待在引用点所在的段落里
  const single = body.match(/^<p>([\s\S]*)<\/p>$/);
  if (single && !/<p>/.test(single[1])) body = single[1];

  return `<span class="mn-ref"><button type="button" class="mn-ref-btn" aria-label="边注 ${id}" aria-controls="mn-${id}">※</button>` +
    `<span class="mn" id="mn-${id}" role="doc-footnote"><span class="mn-num" aria-hidden="true">边注 ${id}</span>${body}</span></span>`;
}, { ends: true });
