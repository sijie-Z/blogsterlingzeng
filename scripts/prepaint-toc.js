/* 首屏前根据持久化状态预置 TOC 布局,避免主题在首屏后加类导致正文宽度跳变 */
'use strict';

hexo.extend.filter.register('after_render:html', function (str) {
  if (!str || str.indexOf('<body') === -1) return str;
  const script = '<script>(function(){try{var s=JSON.parse(localStorage.getItem("REDEFINE-THEME-STATUS")||"{}");if(s.isOpenPageAside!==false)document.documentElement.classList.add("aside-open");}catch(e){}})();</script>';
  const a11y = '<a class="skip-link" href="#main-content">跳到正文</a><div id="route-announcer" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>';
  let out = str.replace(/<body([^>]*)>/i, m => m + script + a11y);
  // skip link 需要落点;.main-content 在主题模板里只有一个
  out = out.replace('<div class="main-content">', '<div class="main-content" id="main-content" tabindex="-1">');
  return out;
});
