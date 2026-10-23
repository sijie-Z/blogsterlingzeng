/**
 * OG images — 给文章/页面换上 1200×630 的分享卡片,并补齐尺寸与 alt。
 *
 * 图片由 `npm run og:images` 在本地生成并提交;这里只在构建期做映射,
 * 找不到对应文件时保留主题的封面回退。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sizeOf = require('image-size');

const ROOT = String(hexo.config.url || '').replace(/\/+$/, '');
const OG_DIR = path.join(hexo.source_dir, 'images', 'og');

function exists(name) {
  return fs.existsSync(path.join(OG_DIR, name));
}

function slugOf(page) {
  if (page.slug) return String(page.slug);
  const source = String(page.source || '');
  const base = path.basename(source, path.extname(source));
  return base;
}

function generatedImage(page) {
  if (!page) return '';
  const route = String(page.path || '').replace(/^\/+/, '');

  if (page.series_page) {
    if (/^series\/?(index\.html)?$/.test(route)) {
      return exists('page-series.jpg') ? '/images/og/page-series.jpg' : '';
    }
    const match = route.match(/^series\/([a-z0-9-]+)(?:\/|$)/);
    if (match && exists(`series-${match[1]}.jpg`)) return `/images/og/series-${match[1]}.jpg`;
    return '';
  }

  if (page.layout === 'post' || page.__post || /^_posts[\\/]/.test(String(page.source || '')) || /^\d{4}\//.test(route)) {
    const slug = slugOf(page);
    if (exists(`${slug}.jpg`)) return `/images/og/${slug}.jpg`;
    return '';
  }

  if (/^index\.html$/.test(route)) {
    return exists('home.jpg') ? '/images/og/home.jpg' : '';
  }
  const pageMap = {
    'projects/index.html': 'page-projects.jpg',
    'about/index.html': 'page-about.jpg',
    'resume/index.html': 'page-resume.jpg',
  };
  if (pageMap[route] && exists(pageMap[route])) return `/images/og/${pageMap[route]}`;
  return '';
}

function absolute(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return ROOT + '/' + String(url).replace(/^\/+/, '');
}

function dimensions(url) {
  const clean = String(url || '').split('?')[0].replace(/^https?:\/\/[^/]+/i, '').replace(/^\//, '');
  const file = path.join(hexo.source_dir, decodeURIComponent(clean));
  try {
    const dims = sizeOf(file);
    if (dims && dims.width && dims.height) return dims;
  } catch (e) {}
  return null;
}

hexo.extend.filter.register('before_generate', function () {
  const posts = hexo.locals.get('posts');
  if (posts && posts.forEach) {
    posts.forEach(post => {
      const image = generatedImage(post);
      if (image) post.og_image = image;
    });
  }
  const pages = hexo.locals.get('pages');
  if (pages && pages.forEach) {
    pages.forEach(page => {
      const image = generatedImage(page);
      if (image) page.og_image = image;
    });
  }
});

hexo.extend.filter.register('after_render:html', function (str, locals) {
  const page = locals && locals.page;
  if (!page || !str || !str.includes('</head>')) return str;
  if (str.includes('property="og:image:width"')) return str;

  const chosen = generatedImage(page) || page.og_image;
  if (!chosen) return str;
  const image = absolute(chosen);
  const dims = dimensions(chosen) || { width: 1200, height: 630 };
  const alt = String(page.title || hexo.config.title || '').replace(/"/g, '&quot;');

  let out = str;
  const hasOg = /<meta property="og:image" content="[^"]*">/.test(out);
  if (hasOg) {
    out = out.replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${image}">`);
  } else {
    out = out.replace('</head>', `<meta property="og:image" content="${image}">\n</head>`);
  }
  if (/<meta name="twitter:image" content="[^"]*">/.test(out)) {
    out = out.replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${image}">`);
  }
  const extra = `<meta property="og:image:width" content="${dims.width}">
<meta property="og:image:height" content="${dims.height}">
<meta property="og:image:alt" content="${alt}">
<meta name="twitter:image:alt" content="${alt}">
`;
  return out.replace('</head>', () => extra + '</head>');
});
