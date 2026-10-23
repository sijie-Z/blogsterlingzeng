/* 在 head 末尾加载 FontAwesome 子集 face,覆盖主题的全量字体。
   三个子集字体总共 ~14KB,提前 preload 可以避免图标字体晚到造成的
   宽度变化(归档页列表会因此上下抖一下)。 */
'use strict';

const FONT_V = '20261023b';

hexo.extend.filter.register('after_render:html', function (str) {
  if (!str || !str.includes('</head>')) return str;
  const preloads = ['fa-solid-900', 'fa-regular-400', 'fa-brands-400']
    .map(name => `<link rel="preload" href="/fontawesome/webfonts/${name}.subset.woff2?v=${FONT_V}" as="font" type="font/woff2" crossorigin>`)
    .join('\n');
  return str.replace(
    '</head>',
    preloads + '\n<link rel="stylesheet" href="/css/fontawesome-icons-subset.css?v=' + FONT_V + '"></head>'
  );
});
