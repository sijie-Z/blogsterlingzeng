/**
 * Post Sidebar — 构建期向文章页目录容器注入右侧信息卡。
 *
 * 为什么在构建期做:侧栏卡片如果等前端插入,会把目录整体往下推,
 * 造成明显的 CLS。这里直接把 HTML 写进 .toc-content-container,
 * 首屏就有正确高度;前端只负责更新阅读进度环,不改布局。
 */

'use strict';

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function readingMinutes(content) {
  const text = String(content || '')
    .replace(/<pre[\s\S]*?<\/pre>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  const cjk = (text.match(/[一-鿿]/g) || []).length;
  const latin = text.replace(/[一-鿿]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round((cjk + latin * 1.5) / 300));
}

hexo.extend.filter.register('after_render:html', function (str, locals) {
  const page = locals && locals.page;
  if (!str || !page) return str;

  // 标记文章页,head 里的内联脚本据此在首屏前应用“专注阅读”
  if (!/<html\b[^>]*\bdata-cj-post\b/i.test(str)) {
    str = str.replace(/<html\b([^>]*)>/i, '<html$1 data-cj-post="1">');
  }

  // 目录容器只会出现在开启了 TOC 的文章页(注入属性后再定位,避免索引错位)
  const marker = '<div class="toc-content-container">';
  const at = str.indexOf(marker);
  if (at === -1) return str;

  const config = locals.config || this.config || {};
  const theme = locals.theme || this.theme || {};
  const sideCfg = (theme.post_sidebar && typeof theme.post_sidebar === 'object') ? theme.post_sidebar : {};
  if (sideCfg.enable === false) return str;

  const author = (page.author && page.author.name) || (theme.info && theme.info.author) || config.author || '';
  const avatar = page.avatar || (page.author && page.author.avatar) ||
    (theme.defaults && theme.defaults.avatar) || '/images/avatar.jpg';
  const bio = sideCfg.author_bio || '大四 · 地信（GIS）· 用代码解决问题';
  const github = sideCfg.github || 'https://github.com/sijie-Z';
  const email = sideCfg.email || '1683039482@qq.com';
  const absUrl = p => '/' + String(p || '').replace(/^\/+/, '');
  const editUrl = 'https://github.com/sijie-Z/blogsterlingzeng/edit/main/source/' +
    encodeURI(String(page.source || '')).replace(/#/g, '%23');
  const markdownUrl = absUrl(String(page.path || '') + 'index.md');
  const minutes = readingMinutes(page.content);

  const tags = page.tags && page.tags.toArray ? page.tags.toArray() : [];
  const tagHtml = tags.map(tag =>
    `<a class="post-side-tag" href="${escapeHtml(absUrl(tag.path))}">#${escapeHtml(tag.name)}</a>`
  ).join('');

  const categories = page.categories && page.categories.toArray ? page.categories.toArray() : [];
  const catName = categories.length ? categories[0].name : '';
  const allPosts = hexo.locals.get('posts').toArray();
  const currentTags = new Set(tags.map(tag => tag.name));
  const scored = allPosts
    .filter(post => post._id !== page._id)
    .map(post => {
      const postTags = post.tags && post.tags.toArray ? post.tags.toArray().map(t => t.name) : [];
      const sharedTags = postTags.filter(name => currentTags.has(name)).length;
      const postCats = post.categories && post.categories.toArray ? post.categories.toArray().map(c => c.name) : [];
      const sameCategory = catName && postCats.includes(catName) ? 1 : 0;
      return { post, sharedTags, score: sharedTags * 3 + sameCategory };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || b.post.date - a.post.date);
  const relatedPosts = scored.slice(0, 3).map(item => item.post);
  // 标签/分类都不沾边时用最新文章补齐,卡片保持三行
  for (const post of allPosts.sort((a, b) => b.date - a.date)) {
    if (relatedPosts.length >= 3) break;
    if (post._id !== page._id && !relatedPosts.some(p => p._id === post._id)) relatedPosts.push(post);
  }

  const relatedHtml = relatedPosts.map(post =>
    `<li><a href="${escapeHtml(absUrl(post.path))}" title="${escapeHtml(post.title)}">${escapeHtml(post.title)}</a></li>`
  ).join('');

  const ring = 2 * Math.PI * 20;
  const block = `
<div class="post-side-stack">
  <section class="post-side-card post-side-author-card" aria-label="作者与阅读进度">
    <div class="post-side-author-top">
      <div class="post-side-avatar-wrap">
        <svg class="post-side-ring" viewBox="0 0 48 48" aria-hidden="true">
          <circle class="post-side-ring-bg" cx="24" cy="24" r="20"></circle>
          <circle class="post-side-ring-fill" cx="24" cy="24" r="20" style="stroke-dasharray:${ring.toFixed(2)};stroke-dashoffset:${ring.toFixed(2)}"></circle>
        </svg>
        <img class="post-side-avatar" src="${escapeHtml(avatar)}" alt="${escapeHtml(author)}" width="40" height="40" loading="lazy" decoding="async">
      </div>
      <div class="post-side-author-main">
        <a class="post-side-name" href="/about/">${escapeHtml(author)}</a>
        <div class="post-side-bio">${escapeHtml(bio)}</div>
        <div class="post-side-progress-line"><span class="post-side-progress-num">0</span>% · 约 ${minutes} 分钟</div>
      </div>
    </div>
    <div class="post-side-author-links">
      <a href="${escapeHtml(github)}" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><i class="fa-brands fa-github" aria-hidden="true"></i></a>
      <a href="mailto:${escapeHtml(email)}" aria-label="Email"><i class="fa-regular fa-envelope" aria-hidden="true"></i></a>
      <button type="button" class="post-side-share" aria-label="分享本文"><i class="fa-solid fa-share-nodes" aria-hidden="true"></i></button>
      <a href="${escapeHtml(editUrl)}" target="_blank" rel="noopener noreferrer" aria-label="在 GitHub 编辑本文"><i class="fa-regular fa-pen-to-square" aria-hidden="true"></i></a>
      <a href="${escapeHtml(markdownUrl)}" target="_blank" rel="noopener noreferrer" aria-label="查看 Markdown 原文"><i class="fa-solid fa-file-lines" aria-hidden="true"></i></a>
      <button type="button" class="post-side-copy-md" data-md-url="${escapeHtml(markdownUrl)}" aria-label="复制 Markdown 原文"><i class="fa-regular fa-copy" aria-hidden="true"></i></button>
    </div>
  </section>
  <section class="post-side-card post-side-read-card" aria-label="阅读设置">
    <div class="post-side-card-title">阅读设置</div>
    <div class="read-size-row" role="group" aria-label="正文字号">
      <button type="button" class="read-size-btn" data-read-size="s" aria-pressed="false" aria-label="小号字">A-</button>
      <button type="button" class="read-size-btn" data-read-size="m" aria-pressed="true" aria-label="默认字号">A</button>
      <button type="button" class="read-size-btn" data-read-size="l" aria-pressed="false" aria-label="大号字">A+</button>
    </div>
    <button type="button" class="read-focus-btn" aria-pressed="false">
      <span>专注阅读</span>
      <span class="read-switch" aria-hidden="true"><span class="read-switch-dot"></span></span>
    </button>
  </section>
  ${tagHtml ? `<section class="post-side-card post-side-tags-card" aria-label="本文标签">
    <div class="post-side-card-title">本文标签</div>
    <div class="post-side-tags">${tagHtml}</div>
  </section>` : ''}
  ${relatedHtml ? `<section class="post-side-card post-side-cat-card" aria-label="相关文章">
    <div class="post-side-card-title">相关文章</div>
    <ul class="post-side-cat-list">${relatedHtml}</ul>
  </section>` : ''}
</div>`;

  let out = str.slice(0, at + marker.length) + block + str.slice(at + marker.length);
  // 目录标题加“当前章节/总数”和一条细进度线,让目录本身也有信息层级
  out = out.replace(/(<div class="toc-title">)([\s\S]*?)(<\/div>)/, (m, a, b, c) =>
    `${a}${b}<span class="post-toc-count" aria-hidden="true"></span>${c}<div class="post-toc-progress" aria-hidden="true"><span></span></div>`);
  return out;
});
