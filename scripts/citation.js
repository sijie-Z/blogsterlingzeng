/**
 * Citation — 为文章生成 Highwire 引用元数据和运行时引用菜单所需的数据。
 *
 * - head 里的 citation_* meta 供 Google Scholar 等抓取(静态 HTML,每个 URL 独立);
 * - body 里的 JSON 随 Swup 换页一起替换,保证 SPA 跳转后引用的是当前文章。
 *
 * JSON 放在 <script type="application/json"> 里,不做 JS 求值,
 * 只需转义 "<" 防止提前闭合标签。
 */

'use strict';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

hexo.extend.filter.register('after_render:html', function (str, locals) {
  const page = locals && locals.page;
  if (!str || !page) return str;
  if (!(page.layout === 'post' || page.__post)) return str;
  if (!page.date) return str;

  const config = this.config || {};
  const theme = (locals && locals.theme) || (this.theme && this.theme.config) || {};
  const author = (page.author && page.author.name) ||
    (theme.info && theme.info.author) || config.author || 'Sterling Zeng';
  const site = (theme.info && theme.info.title) || config.title || 'Sterling Zeng';
  const iso = page.date.format('YYYY-MM-DD');
  const year = page.date.format('YYYY');
  const month = page.date.format('MM');
  const day = page.date.format('DD');
  const monthly = MONTHS[Number(month) - 1] || page.date.format('MMMM');
  const url = String(config.url || '').replace(/\/+$/, '') + '/' +
    String(page.path || '').replace(/^\/+/, '');
  const slug = String(page.slug || String(page.path || '').replace(/\/+$/, '').split('/').pop() || 'post')
    .replace(/[^a-zA-Z0-9]+/g, '');
  const key = 'sterling' + year + (slug || 'post');

  const data = {
    title: String(page.title || ''),
    author: String(author),
    site: String(site),
    date: iso,
    year,
    month: Number(month),
    day: Number(day),
    monthName: monthly,
    url,
    key,
  };
  // GB/T 7714 的引用日期取构建当天
  const now = new Date();
  data.accessed = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const json = JSON.stringify(data).replace(/</g, '\\u003c');

  let out = str;

  if (!out.includes('name="citation_title"')) {
    const meta = [
      `<meta name="citation_title" content="${escapeHtml(data.title)}">`,
      `<meta name="citation_author" content="${escapeHtml(data.author)}">`,
      `<meta name="citation_publication_date" content="${page.date.format('YYYY/MM/DD')}">`,
      `<meta name="citation_online_date" content="${page.date.format('YYYY/MM/DD')}">`,
      `<meta name="citation_language" content="zh-CN">`,
      `<meta name="citation_journal_title" content="${escapeHtml(data.site)}">`,
    ].join('\n');
    out = out.replace('</head>', () => meta + '\n</head>');
  }

  // body 里的 JSON 会随 Swup 替换;head 只服务爬虫和首屏
  if (!out.includes('id="cj-citation"')) {
    const script = `<script type="application/json" id="cj-citation">${json}</script>`;
    out = out.replace(/<div class="article-content-container">/, match => match + script);
  }

  return out;
});
