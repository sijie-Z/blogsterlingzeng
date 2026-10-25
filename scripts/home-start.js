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

  // 首屏先回答“作者是谁、适合什么方向”，再让访客选择项目或简历。
  if (!str.includes('home-hero-identity')) {
    str = str.replace('<div class="home-hero-cta">',
      '<p class="home-hero-identity">Sterling Zeng · GIS 大四 · 前端 / 全栈 / AI 应用工程</p>' +
      '<div class="home-hero-cta">');
  }
  str = str.replace('<div class="label">Lv3</div>', '<div class="label">GIS · 大四</div>');

  const seriesTotal = typeof hexo.__cjBuildSeries === 'function'
    ? hexo.__cjBuildSeries().list.reduce((n, group) => n + group.posts.length, 0)
    : 9;
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
    <span class="home-start-desc">${seriesTotal} 篇文章，四条主线</span>
  </a>
</section>
`;
  return str.replace(marker, () => block + marker);
});
