/* 在 head 末尾加载 FontAwesome 子集 face,覆盖主题的全量字体 */
'use strict';

hexo.extend.filter.register('after_render:html', function (str) {
  if (!str || !str.includes('</head>')) return str;
  return str.replace(
    '</head>',
    '<link rel="stylesheet" href="/css/fontawesome-subset.css?v=20261023a"></head>'
  );
});
