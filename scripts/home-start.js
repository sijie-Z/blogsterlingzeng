/**
 * Home start — 首页文章列表前的三个面试入口。
 *
 * 构建期插入,不产生 CLS;只在真正首页出现,分页 /page/2/ 不重复。
 */

'use strict';

hexo.extend.filter.register('after_render:html', function (str, locals) {
  const page = locals && locals.page;
  if (!str || !page) return str;
  const route = String(page.path || '').replace(/^\/+/, '');
  if (route !== 'index.html') return str;
  if (process.env.CJ_NO_HOME_START === '1') return str;
  if (str.includes('data-home-start')) return str;

  const marker = '<ul class="home-article-list">';
  if (!str.includes(marker)) return str;

  const block = `<section class="home-start" data-home-start aria-label="快速了解">
  <a class="home-start-card" href="/projects/">
    <span class="home-start-kicker">项目</span>
    <span class="home-start-title">3 个案例</span>
    <span class="home-start-desc">问题、取舍、证据与边界</span>
  </a>
  <a class="home-start-card" href="/resume/">
    <span class="home-start-kicker">简历</span>
    <span class="home-start-title">一页式</span>
    <span class="home-start-desc">可打印 / 存为 PDF</span>
  </a>
  <a class="home-start-card" href="/series/">
    <span class="home-start-kicker">系列</span>
    <span class="home-start-title">按顺序读</span>
    <span class="home-start-desc">8 篇文章，两条主线</span>
  </a>
</section>
`;
  return str.replace(marker, () => block + marker);
});
