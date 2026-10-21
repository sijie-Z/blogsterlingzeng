/* 首屏前根据持久化状态预置 TOC 布局,避免主题在首屏后加类导致正文宽度跳变 */
'use strict';

hexo.extend.filter.register('after_render:html', function (str) {
  if (!str || str.indexOf('<body') === -1) return str;
  const script = '<script>(function(){try{var s=JSON.parse(localStorage.getItem("REDEFINE-THEME-STATUS")||"{}");if(s.isOpenPageAside!==false)document.documentElement.classList.add("aside-open");}catch(e){}})();</script>';
  return str.replace(/<body([^>]*)>/i, m => m + script);
});
