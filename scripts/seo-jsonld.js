/**
 * SEO JSON-LD — 构建期为文章注入 BlogPosting + BreadcrumbList。
 *
 * 主题 2.9.0 没有结构化数据；这里不引插件，直接在 after_render:html
 * 里输出 @graph，运行时零成本。日期使用 Hexo 的 date/updated，
 * 不再受 CI checkout mtime 影响。
 */

'use strict';

function absUrl(root, value) {
  const url = String(value || '');
  if (/^https?:\/\//i.test(url)) return url;
  return root + (url.startsWith('/') ? url : '/' + url);
}

function iso(date) {
  try {
    return date.toISOString();
  } catch (e) {
    return '';
  }
}

function jsonLdScript(data) {
  const json = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
  return `<script type="application/ld+json">${json}</script>\n</head>`;
}

hexo.extend.filter.register('after_render:html', function (str, locals) {
  const page = locals && locals.page;
  if (!str || !page) return str;

  const config = hexo.config;
  const root = String(config.url || '').replace(/\/+$/, '');
  const authorName = (page.author && page.author.name) || config.author || '';

  // 首页 / 关于页:WebSite 与 ProfilePage。
  // SearchAction(sitelinks search box)已被 Google 于 2024-11 下线,不再添加。
  if (!page.__post) {
    const pagePath = String(page.path || '').replace(/index\.html$/, '');
    // hexo-generator-index 会给 /page/2/ 也带 __index,只在真正首页输出 WebSite
    const isHome = pagePath === '';
    if (isHome && !str.includes('"WebSite"')) {
      const data = {
        '@context': 'https://schema.org',
        '@graph': [{
          '@type': 'WebSite',
          '@id': root + '/#website',
          name: String(config.title || ''),
          alternateName: config.subtitle ? String(config.subtitle) : undefined,
          url: root + '/',
          description: String(config.description || ''),
          inLanguage: 'zh-CN',
          publisher: {
            '@type': 'Person',
            name: String(authorName),
            url: root + '/about/',
          },
        }],
      };
      return str.replace('</head>', () => jsonLdScript(data));
    }
    if (pagePath === 'about/' && !str.includes('"ProfilePage"')) {
      const data = {
        '@context': 'https://schema.org',
        '@graph': [{
          '@type': 'ProfilePage',
          '@id': root + '/about/#profile',
          url: root + '/about/',
          name: '关于 ' + String(authorName),
          mainEntity: {
            '@type': 'Person',
            name: String(authorName),
            url: root + '/about/',
            image: root + '/images/avatar.jpg',
            description: String(config.description || ''),
            sameAs: ['https://github.com/sijie-Z'],
          },
        }],
      };
      return str.replace('</head>', () => jsonLdScript(data));
    }
    if (page.series_page && !str.includes('"CollectionPage"')) {
      const url = root + '/' + pagePath;
      const data = {
        '@context': 'https://schema.org',
        '@graph': [{
          '@type': 'CollectionPage',
          '@id': url + '#collection',
          url,
          name: String(page.title || ''),
          description: String(page.description || ''),
          inLanguage: 'zh-CN',
          isPartOf: {
            '@type': 'WebSite',
            '@id': root + '/#website',
            name: String(config.title || ''),
            url: root + '/',
          },
        }],
      };
      return str.replace('</head>', () => jsonLdScript(data));
    }
    return str;
  }

  if (!page.title) return str;
  if (str.includes('"BlogPosting"')) return str;

  const canonical = root + '/' + String(page.path || '').replace(/^\/+/, '');
  const image = absUrl(root, page.cover || page.banner || '/images/og-banner.jpg');
  const authorUrl = root + '/about/';
  const tags = page.tags && page.tags.toArray ? page.tags.toArray().map(t => t.name) : [];
  const categories = page.categories && page.categories.toArray ? page.categories.toArray() : [];

  const article = {
    '@type': 'BlogPosting',
    '@id': canonical + '#article',
    headline: String(page.title),
    description: String(page.description || ''),
    datePublished: iso(page.date),
    dateModified: iso(page.updated || page.date),
    author: {
      '@type': 'Person',
      name: authorName,
      url: authorUrl,
      sameAs: ['https://github.com/sijie-Z'],
    },
    publisher: {
      '@type': 'Organization',
      name: String(config.title || authorName),
      logo: {
        '@type': 'ImageObject',
        url: root + '/images/favicon.png',
      },
    },
    image: [image],
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    url: canonical,
    inLanguage: 'zh-CN',
    keywords: tags,
    articleSection: categories.map(c => c.name),
  };

  const items = [
    { '@type': 'ListItem', position: 1, name: '首页', item: root + '/' },
  ];
  if (categories.length) {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: categories[0].name,
      item: root + '/' + String(categories[0].path || '').replace(/^\/+/, ''),
    });
  }
  items.push({
    '@type': 'ListItem',
    position: items.length + 1,
    name: String(page.title),
  });

  const data = {
    '@context': 'https://schema.org',
    '@graph': [article, { '@type': 'BreadcrumbList', itemListElement: items }],
  };

  return str.replace('</head>', () => jsonLdScript(data));
});
