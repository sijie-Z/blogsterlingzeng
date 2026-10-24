/**
 * Head cleanup — 去掉用不到的外部预连接。
 *
 * 主题默认无条件预连接 Google Fonts,但本站字体全部本地托管;
 * 保留这两个 preconnect 只会多做两次 DNS/TCP 握手(国内网络还常被阻断)。
 */

'use strict';

hexo.extend.filter.register('after_render:html', function (str) {
  if (!str || !str.includes('fonts.googleapis.com')) return str;
  return str
    .replace(/[ \t]*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*\n?/g, '')
    .replace(/[ \t]*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\s*\n?/g, '');
});

// 非文章页移除 Hexo open_graph 自动补的 article:* 元数据
hexo.extend.filter.register('after_render:html', function (str, locals) {
  const page = locals && locals.page;
  if (!str || !page || page.__post) return str;
  return str.replace(/[ \t]*<meta property="article:[^"]+"[^>]*>\s*\n?/g, '');
});

// Twitter 卡片补齐标题/描述,未配置账号时不发 twitter:site
hexo.extend.filter.register('after_render:html', function (str) {
  if (!str || !str.includes('twitter:card') || str.includes('name="twitter:title"')) return str;
  const title = str.match(/<meta property="og:title" content="([^"]*)"/i);
  const desc = str.match(/<meta property="og:description" content="([^"]*)"/i);
  const extra = [
    title ? `<meta name="twitter:title" content="${title[1]}">` : '',
    desc ? `<meta name="twitter:description" content="${desc[1]}">` : '',
  ].filter(Boolean).join('\n');
  return extra ? str.replace('</head>', () => extra + '\n</head>') : str;
});
