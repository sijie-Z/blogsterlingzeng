/**
 * Math — 构建期把 $...$ / $$...$$ 渲染成 KaTeX MathML。
 *
 * 不加载客户端 KaTeX JS/CSS,也不需要字体文件;MathML 由现代浏览器原生渲染。
 * 代码块和行内代码中的美元符号会被保护起来。
 */

'use strict';

let katex;
try {
  katex = require('katex');
} catch (e) {
  katex = null;
}

function render(tex, displayMode) {
  if (!katex) return tex;
  try {
    return katex.renderToString(tex, {
      displayMode,
      output: 'mathml',
      throwOnError: false,
      strict: 'ignore',
      trust: false,
    });
  } catch (e) {
    return displayMode ? `$$${tex}$$` : `$${tex}$`;
  }
}

hexo.extend.filter.register('before_post_render', function (data) {
  if (!katex || !String(data.content || '').includes('$')) return data;

  const stash = [];
  const protect = text => text.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`/g, match => {
    const token = `\u0000CJMATH${stash.length}\u0000`;
    stash.push(match);
    return token;
  });

  let text = protect(data.content);
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, tex) => {
    // 块级公式包一层,右上角放“TeX”复制按钮(运行时只做复制,不重新渲染)
    return `<div class="katex-block"><button type="button" class="math-copy-btn" aria-label="复制此公式的 LaTeX 源码" title="复制 LaTeX">TeX</button>${render(tex.trim(), true)}</div>`;
  });
  text = text.replace(/(^|[^\\$])\$(?!\$)([^\n$]+?)\$(?!\$)/g, (match, prefix, tex) =>
    prefix + render(tex.trim(), false));
  text = text.replace(/\u0000CJMATH(\d+)\u0000/g, (match, index) => stash[Number(index)] || '');

  data.content = text;
  return data;
});
