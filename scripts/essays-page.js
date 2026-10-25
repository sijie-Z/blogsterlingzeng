/**
 * Essays page — 说说页的构建期修补。
 *
 * 主题按条目重复输出 id="shuoshuo-content"（HTML 不允许重复 id），
 * 日期则要等运行时 JS 才写入，静态 HTML 里是 "Loading Date..."。
 * 这里在构建期去掉重复 id 并写好中文日期，JS 仍然可以覆盖。
 */

'use strict';

hexo.extend.filter.register('after_render:html', function (str, locals) {
  if (!str || !str.includes('essay-date') || !str.includes('id="shuoshuo-content"')) return str;

  // 只保留第一个 id，其余改成普通 data 属性；图片查看器的
  // #shuoshuo-content img 选择器行为与之前一致（本来就只命中第一个）。
  let first = true;
  str = str.replace(/id="shuoshuo-content"/g, () => {
    if (first) {
      first = false;
      return 'id="shuoshuo-content"';
    }
    return 'data-essay-content';
  });

  // 把静态 HTML 里的 Loading Date... 换成真实日期，避免 JS 未执行时露出占位符
  str = str.replace(/data-date="([^"]+)">Loading Date\.\.\./g, (match, raw) => {
    const iso = String(raw).slice(0, 10);
    const parts = iso.split('-').map(Number);
    const label = parts.length === 3 && parts.every(Number.isFinite)
      ? `${parts[0]}年${parts[1]}月${parts[2]}日`
      : '日期';
    return `data-date="${raw}">${label}`;
  });

  return str;
});
