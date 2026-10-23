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

function seriesSlug(page) {
  const raw = page && page.series;
  if (!raw) return '';
  const value = typeof raw === 'string'
    ? raw
    : (raw.slug || raw.id || raw.name || '');
  return String(value || '').trim().toLowerCase();
}

function seriesGroup(page) {
  const slug = seriesSlug(page);
  if (!slug || !hexo.__cjBuildSeries) return null;
  try {
    return hexo.__cjBuildSeries().groups.get(slug) || null;
  } catch (e) {
    return null;
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
          image: page.og_image ? absUrl(root, page.og_image) : root + '/images/og-banner.jpg',
          inLanguage: 'zh-CN',
          isPartOf: {
            '@type': 'WebSite',
            '@id': root + '/#website',
            name: String(config.title || ''),
            url: root + '/',
          },
        }],
      };
      const match = pagePath.match(/^series\/([a-z0-9-]+)\/$/);
      const group = match && seriesGroup({ series: match[1] });
      if (group && group.entries) {
        data['@graph'][0].hasPart = group.entries.map(entry => ({
          '@type': 'BlogPosting',
          '@id': root + '/' + String(entry.post.path || '').replace(/^\/+/, '') + '#article',
          headline: String(entry.post.title || ''),
          url: root + '/' + String(entry.post.path || '').replace(/^\/+/, ''),
        }));
      }
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

  const group = seriesGroup(page);
  if (group && hexo.__cjSeriesUrl) {
    const seriesPath = hexo.__cjSeriesUrl(group.slug);
    article.isPartOf = {
      '@type': 'CreativeWorkSeries',
      '@id': root + seriesPath + '#series',
      name: group.name,
      url: root + seriesPath,
    };
    const entry = group.byId && group.byId.get(String(page._id));
    if (entry) article.position = entry.index;
  }

  const data = {
    '@context': 'https://schema.org',
    '@graph': [article, { '@type': 'BreadcrumbList', itemListElement: items }],
  };

  return str.replace('</head>', () => jsonLdScript(data));
});
