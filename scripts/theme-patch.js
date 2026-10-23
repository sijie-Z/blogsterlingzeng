/**
 * Theme Patch — footer cleanups and odometer init removal.
 *
 * 1. 删除 "Powered by Hexo" 与 "Theme Redefine" 两行。
 * 2. 删除 footer 里的 odometer 内联脚本:它带 data-swup-reload-script,
 *    Swup 每次换页都会重跑数字动画,造成 ~70-100ms 长任务。
 *    改由 custom.js 在字体就绪后只初始化一次。
 *
 * 在 npm install / npm ci 后自动执行(postinstall),从源头修改。
 * 找不到标记时静默跳过(通常说明模板已打过补丁),不中断构建。
 */

'use strict';

const fs = require('fs');
const path = require('path');

const themeRoot = path.join(__dirname, '..', 'node_modules', 'hexo-theme-redefine');

/**
 * 精确字符串替换,并统计替换次数。找不到标记时告警但不抛错,
 * 避免主题升级后 postinstall 直接失败。
 */
function patchText(relPath, replacements) {
  const file = path.join(themeRoot, relPath);
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch (e) {
    console.warn('[theme-patch] 读取失败:', relPath, e.message);
    return;
  }
  let changed = false;
  for (const [from, to, label] of replacements) {
    if (!content.includes(from)) {
      console.warn('[theme-patch] 未找到标记,跳过:', relPath, label || '');
      continue;
    }
    content = content.split(from).join(to);
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('[theme-patch] 已优化', relPath);
  }
}

// 1. 侧栏工具:滚动位置 <=100 时不再强读 document.body.scrollHeight。
//    这是首跳 100ms+ 长任务的根源:进文章页时 scrollY=0,高度根本用不到,
//    但旧代码无条件读 scrollHeight,强制同步布局整篇文章。
patchText('source/js/utils/sideTools.js', [
  [
    'const height = document.body.scrollHeight;',
    'const height = y <= 100 ? 0 : (window.__cjScrollHeight || document.body.scrollHeight);',
    'sideTools source lazy height',
  ],
  [
    'const height = y <= 100 ? 0 : document.body.scrollHeight;',
    'const height = y <= 100 ? 0 : (window.__cjScrollHeight || document.body.scrollHeight);',
    'sideTools source cached height',
  ],
]);
patchText('source/js/build/utils/sideTools.js', [
  [
    'const t=window.scrollY,e=document.body.scrollHeight,o=window.innerHeight,',
    'const t=window.scrollY,o=window.innerHeight;let e=0;if(t>100)e=window.__cjScrollHeight||document.body.scrollHeight;const ',
    'sideTools build lazy height',
  ],
  [
    'let e=0;if(t>100)e=document.body.scrollHeight;const ',
    'let e=0;if(t>100)e=window.__cjScrollHeight||document.body.scrollHeight;const ',
    'sideTools build cached height',
  ],
]);

// 2. 滚动回调合并到一次 rAF:主题原本每个 scroll 事件都同步跑
//    updateScrollStyle + updateAutoHideTools,滚动时会有重复布局读取。
patchText('source/js/utils.js', [
  [
    `const handleScroll = () => {
  if (!activeUtils) {
    return;
  }

  activeUtils.updateScrollStyle();
  activeUtils.updateAutoHideTools();
};`,
    `let __cjScrollRaf = 0;

const handleScroll = () => {
  if (__cjScrollRaf) {
    return;
  }

  __cjScrollRaf = requestAnimationFrame(() => {
    __cjScrollRaf = 0;
    if (!activeUtils) {
      return;
    }
    activeUtils.updateScrollStyle();
    activeUtils.updateAutoHideTools();
  });
};`,
    'utils source rAF scroll',
  ],
]);
patchText('source/js/build/utils.js', [
  [
    'const handleScroll=()=>{c&&(c.updateScrollStyle(),c.updateAutoHideTools())},',
    'let __cjScrollRaf=0;const handleScroll=()=>{if(__cjScrollRaf)return;__cjScrollRaf=requestAnimationFrame(()=>{__cjScrollRaf=0;c&&(c.updateScrollStyle(),c.updateAutoHideTools())})},',
    'utils build rAF scroll',
  ],
]);

// 3. 阅读进度:复用缓存的文档高度,避免每次滚动都读 scrollHeight。
//    缓存由 custom.js 在 load / resize / 换页后空闲时更新。
patchText('source/js/utils/scroll.js', [
  [
    'const scrollHeight = document.documentElement.scrollHeight;',
    'const scrollHeight = window.__cjScrollHeight || document.documentElement.scrollHeight;',
    'scroll source cached height',
  ],
]);
patchText('source/js/build/utils/scroll.js', [
  [
    't=document.documentElement.scrollHeight,',
    't=window.__cjScrollHeight||document.documentElement.scrollHeight,',
    'scroll build cached height',
  ],
]);

// 3.5 TOC scrollspy:缓存每个标题的文档偏移,滚动时不再对所有标题
//     调 getBoundingClientRect。原实现每次 scroll 读 10-30 次布局,是
//     长文章滚动里 50-100ms 长任务的主要来源之一。
patchText('source/js/layouts/toc.js', [
  [
    `        return target;
      });
    },`,
    `        return target;
      });
      utils.offsets = utils.sections.map((element) =>
        element ? element.getBoundingClientRect().top + window.scrollY : Infinity,
      );
    },`,
    'toc source cached offsets',
  ],
  [
    `    updateActiveTOCLink() {
      if (!Array.isArray(utils.sections)) return;
      let index = utils.sections.findIndex((element) => {
        return element && element.getBoundingClientRect().top - 100 > 0;
      });`,
    `    updateActiveTOCLink() {
      if (!Array.isArray(utils.sections)) return;
      const y = window.scrollY + 100;
      let index = Array.isArray(utils.offsets)
        ? utils.offsets.findIndex((offset) => offset > y)
        : utils.sections.findIndex((element) => {
            return element && element.getBoundingClientRect().top - 100 > 0;
          });`,
    'toc source use cached offsets',
  ],
  [
    `  if (navItems.length === 0) {
    tocToggle.hideToggle();
    tocContainer.remove();
    document.querySelectorAll(".toc-marker").forEach((elem) => {
      elem.remove();
    });
    tocState = null;
    return null;
  }`,
    `  if (navItems.length === 0) {
    tocToggle.hideToggle();
    const sideStack = tocContainer.querySelector('.post-side-stack');
    if (sideStack) {
      const tocWrap = tocContainer.querySelector('.post-toc-wrap');
      if (tocWrap) tocWrap.remove();
    } else {
      tocContainer.remove();
    }
    document.querySelectorAll(".toc-marker").forEach((elem) => {
      elem.remove();
    });
    tocState = null;
    return null;
  }`,
    'toc source keep sidebar cards',
  ],
]);
patchText('source/js/build/layouts/toc.js', [
  [
    'registerTOCScroll(){l.sections=[...l.navLinks].map((e=>document.getElementById(decodeURI(e.getAttribute("href")).replace("#",""))))}',
    'registerTOCScroll(){l.sections=[...l.navLinks].map((e=>document.getElementById(decodeURI(e.getAttribute("href")).replace("#",""))));l.offsets=l.sections.map((e=>e?e.getBoundingClientRect().top+window.scrollY:1/0))}',
    'toc build cached offsets',
  ],
  [
    'updateActiveTOCLink(){if(!Array.isArray(l.sections))return;let e=l.sections.findIndex((e=>e&&e.getBoundingClientRect().top-100>0));',
    'updateActiveTOCLink(){if(!Array.isArray(l.sections))return;const y=window.scrollY+100;let e=Array.isArray(l.offsets)?l.offsets.findIndex((e=>e>y)):l.sections.findIndex((e=>e&&e.getBoundingClientRect().top-100>0));',
    'toc build use cached offsets',
  ],
  [
    'if(0===c.length)return s.hideToggle(),r.remove(),document.querySelectorAll(".toc-marker").forEach((e=>{e.remove()})),n=null,null;',
    'if(0===c.length){s.hideToggle();const w=r.querySelector(".post-side-stack");if(w){const t=r.querySelector(".post-toc-wrap");t&&t.remove()}else r.remove();document.querySelectorAll(".toc-marker").forEach((e=>{e.remove()}));return n=null,null}',
    'toc build keep sidebar cards',
  ],
]);

// 3.6 归一 TOC 的 resize / 延迟刷新补丁。
//     旧写法每次 postinstall 都会在锚点后追加一段,实测累积了 12 个
//     resize 监听和 12 个 800ms setTimeout。这里先清重复,再各装一份:
//     resize 监听不带 signal,全站只注册一次(引用模块级 tocState)。
const tocSourceFile = path.join(themeRoot, 'source/js/layouts/toc.js');
try {
  let tocSrc = fs.readFileSync(tocSourceFile, 'utf8');
  const before = tocSrc;
  tocSrc = tocSrc.replace(
    /  window\.addEventListener\(\n    "resize",\n    \(\) => \{\n      tocState\?\.registerTOCScroll\(\);\n    \},\n    \{ signal \},\n  \);\n/g,
    ''
  );
  tocSrc = tocSrc.replace(
    /(?:  \/\/ 字体\/图片加载后高度可能变化,延迟再算一次偏移\n)?  setTimeout\(\(\) => utils\.registerTOCScroll\(\), 800\);\n/g,
    ''
  );
  if (!tocSrc.includes('__cjTocResizeBound')) {
    const scrollAnchor = `  window.addEventListener(
    "scroll",
    () => {
      tocState?.updateActiveTOCLink();
    },
    { signal },
  );`;
    if (tocSrc.includes(scrollAnchor)) {
      tocSrc = tocSrc.replace(scrollAnchor, scrollAnchor + `
  if (!window.__cjTocResizeBound) {
    window.__cjTocResizeBound = true;
    window.addEventListener(
      "resize",
      () => {
        tocState?.registerTOCScroll();
      },
      { passive: true },
    );
  }`);
    }
  }
  const tocTail = '  utils.showTOCAside();\n  utils.registerTOCScroll();\n  utils.updateActiveTOCLink();';
  if (tocSrc.includes(tocTail) && !tocSrc.includes('setTimeout(() => utils.registerTOCScroll(), 800);')) {
    tocSrc = tocSrc.replace(tocTail, tocTail + '\n  // 字体/图片加载后高度可能变化,延迟再算一次偏移\n  setTimeout(() => utils.registerTOCScroll(), 800);');
  }
  if (tocSrc !== before) {
    fs.writeFileSync(tocSourceFile, tocSrc, 'utf8');
    console.log('[theme-patch] 已归一 TOC 监听器');
  }
} catch (e) {
  console.warn('[theme-patch] TOC 归一失败:', e.message);
}

const tocBuildFile = path.join(themeRoot, 'source/js/build/layouts/toc.js');
try {
  let tocBuild = fs.readFileSync(tocBuildFile, 'utf8');
  const before = tocBuild;
  tocBuild = tocBuild.replace(
    /,window\.addEventListener\("resize",\(\(\)=>\{n\?\.registerTOCScroll\(\)\}\),\{signal:e\}\)/g,
    ''
  );
  tocBuild = tocBuild.replace(/setTimeout\(\(\(\)=>l\.registerTOCScroll\(\)\),800\),/g, '');
  const scrollAnchor = 'window.addEventListener("scroll",(()=>{n?.updateActiveTOCLink()}),{signal:e})';
  if (!tocBuild.includes('__cjTocResizeBound') && tocBuild.includes(scrollAnchor)) {
    tocBuild = tocBuild.replace(
      scrollAnchor,
      scrollAnchor + ',window.__cjTocResizeBound||(window.__cjTocResizeBound=!0,window.addEventListener("resize",(()=>{n?.registerTOCScroll()}),{passive:!0}))'
    );
  }
  const returnAnchor = 'return l.showTOCAside(),l.registerTOCScroll(),l.updateActiveTOCLink(),';
  if (tocBuild.includes(returnAnchor) && !tocBuild.includes('setTimeout((()=>l.registerTOCScroll()),800)')) {
    tocBuild = tocBuild.replace(returnAnchor, returnAnchor + 'setTimeout((()=>l.registerTOCScroll()),800),');
  }
  if (tocBuild !== before) {
    fs.writeFileSync(tocBuildFile, tocBuild, 'utf8');
    console.log('[theme-patch] 已归一 TOC 构建产物');
  }
} catch (e) {
  console.warn('[theme-patch] TOC 构建产物归一失败:', e.message);
}

// 4. Swup:去掉 SwupSlideTheme 的退出动画。//    旧流程是"先播旧页退出动画(约 320ms),再替换 DOM",首跳 click→replace
//    实测 426ms;改成内容立即替换、只播新页入场,click→replace 可降到 ~30ms。
patchText('layout/components/swup.ejs', [
  [
    "    'libs/SwupSlideTheme.min.js',\n",
    '',
    'swup remove slide theme script',
  ],
  [
    `            new SwupSlideTheme({
                mainElement: ".main-content-body",
            }),
`,
    '',
    'swup remove slide theme plugin',
  ],
  [
    `            new SwupScrollPlugin({
                offset: 80,
            }),`,
    `            new SwupScrollPlugin({
                offset: 80,
                // 换页后直接回到顶部;默认的 smooth 滚动会持续约 1s,
                // 用户这时往下滚会被它拽回去,也拖慢“内容先到”的观感。
                animateScroll: false,
            }),`,
    'swup instant scroll between pages',
  ],
  [
    '            new SwupPreloadPlugin(),',
    `            new SwupPreloadPlugin({
                // 首屏已经在当前页面,再预取一次首页只会重复下载 + 解析;
                // 站内跳转仍由 Swup 在 hover/进入视口时预取。
                preloadInitialPage: false,
            }),`,
    'swup preload skip initial page',
  ],
  [
    '        containers: ["#swup"],\n    });',
    '        containers: ["#swup"],\n        animationSelector: false,\n    });',
    'swup disable animation selector',
  ],
]);

// 4.5 文章页统计行(阅读数 + 点赞)构建期渲染。
//      之前是在 custom.js 里运行时插入,61px 高的一行会把文章正文
//      整体往下推,是文章页 CLS 的主要来源。这里在模板里先输出占位,
//      前端只改数字,布局从首帧起就稳定。
patchText('layout/pages/post/article-content.ejs', [
  [
    `\t\t\t\t\t<%- partial('pages/post/article-info', {articleObject: page, index: true}) %>
\t\t\t\t</div>
\t\t\t</div>`,
    `\t\t\t\t\t<%- partial('pages/post/article-info', {articleObject: page, index: true}) %>
\t\t\t\t</div>
\t\t\t\t<div class="article-stats post-page-stats" data-post-stats>
\t\t\t\t\t<span class="stat-item"><i class="fa-regular fa-eye"></i> <span class="stat-views">0</span> 次阅读</span>
\t\t\t\t\t<button class="like-btn" type="button" aria-pressed="false" aria-label="点赞这篇文章"><i class="fa-regular fa-heart"></i> <span class="stat-likes">0</span> 个赞</button>
\t\t\t\t</div>
\t\t\t</div>`,
    'post stats server rendered (author)',
  ],
  [
    `\t\t\t\t<%- partial('pages/post/article-info', {articleObject: page, index: true}) %>
\t\t\t</div>
\t\t</div>`,
    `\t\t\t\t<%- partial('pages/post/article-info', {articleObject: page, index: true}) %>
\t\t\t</div>
\t\t\t<div class="article-stats post-page-stats" data-post-stats>
\t\t\t\t<span class="stat-item"><i class="fa-regular fa-eye"></i> <span class="stat-views">0</span> 次阅读</span>
\t\t\t\t<button class="like-btn" type="button" aria-pressed="false" aria-label="点赞这篇文章"><i class="fa-regular fa-heart"></i> <span class="stat-likes">0</span> 个赞</button>
\t\t\t</div>
\t\t</div>`,
    'post stats server rendered (meta)',
  ],
]);

// 4.6 moment 只定义全局变量,换页时不需要重新下载/执行。
//      去掉 data-swup-reload-script 可以少一次 ~80KB 的脚本执行。
patchText('layout/components/scripts.ejs', [
  [
    "renderJS('libs/moment-with-locales.min.js', { swupReload: true })",
    "renderJS('libs/moment-with-locales.min.js', { swupReload: false })",
    'moment no swup reload',
  ],
]);

// 5. APlayer:首屏初始化实测有 ~400ms 长任务。保留播放器,
//    但把脚本推迟到首次交互或 6 秒后加载,避免和文章首屏抢主线程。
patchText('layout/components/plugins/aplayer.ejs', [
  [
    `<div id="aplayer"></div>
<%- renderJS('libs/APlayer.min.js') %>
<%- renderJS('plugins/aplayer.js') %>`,
    `<div id="aplayer"></div>
<script>
(function () {
  var loaded = false;
  function load() {
    if (loaded) return;
    loaded = true;
    var core = document.createElement('script');
    core.src = '/js/build/libs/APlayer.min.js';
    core.onload = function () {
      var init = document.createElement('script');
      init.src = '/js/build/plugins/aplayer.js';
      document.body.appendChild(init);
    };
    document.body.appendChild(core);
  }
  var timer = setTimeout(load, 6000);
  function load() {
    if (loaded) return;
    loaded = true;
    clearTimeout(timer);
    var core = document.createElement('script');
    core.src = '/js/build/libs/APlayer.min.js';
    core.onload = function () {
      var init = document.createElement('script');
      init.src = '/js/build/plugins/aplayer.js';
      document.body.appendChild(init);
    };
    document.body.appendChild(core);
  }
  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (ev) {
    window.addEventListener(ev, load, { once: true, passive: true });
  });
})();
</script>`,
    'aplayer defer',
  ],
]);

// 5.1 归一旧版 aplayer 补丁(requestIdleCallback 常常 ~1s 就触发,
//     仍然会和首屏抢主线程):改成首次交互 / 6s 超时。
const aplayerFile = path.join(themeRoot, 'layout/components/plugins/aplayer.ejs');
try {
  let ap = fs.readFileSync(aplayerFile, 'utf8');
  const before = ap;
  ap = ap.replace(
    "  var loaded = false;\n  function load() {\n    if (loaded) return;\n    loaded = true;\n",
    "  var loaded = false;\n  var timer = setTimeout(load, 6000);\n  function load() {\n    if (loaded) return;\n    loaded = true;\n    clearTimeout(timer);\n"
  );
  ap = ap.replace(
    "  if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 8000 });\n  else setTimeout(load, 2500);",
    "  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (ev) {\n    window.addEventListener(ev, load, { once: true, passive: true });\n  });"
  );
  if (ap !== before) {
    fs.writeFileSync(aplayerFile, ap, 'utf8');
    console.log('[theme-patch] 已更新 aplayer 延迟策略');
  }
} catch (e) {
  console.warn('[theme-patch] aplayer 归一失败:', e.message);
}

// 6. 文章页不需要 initPageHeightHandle 的三次 getBoundingClientRect:
//    它只用于"短页面把 footer 顶下去",文章页天然比视口长。
patchText('source/js/utils/layout.js', [
  [
    `  if (ctx?.homeBanner_dom) {
    return;
  }

  const temp_h1 = getElementHeight(".main-content-header");`,
    `  if (ctx?.homeBanner_dom) {
    return;
  }
  if (document.querySelector('.post-page-container')) {
    return;
  }

  const temp_h1 = getElementHeight(".main-content-header");`,
    'layout skip page height on post',
  ],
]);
patchText('source/js/build/utils/layout.js', [
  [
    'export const initPageHeightHandle=e=>{if(e?.homeBanner_dom)return;const t=',
    'export const initPageHeightHandle=e=>{if(e?.homeBanner_dom)return;if(document.querySelector(".post-page-container"))return;const t=',
    'layout build skip page height on post',
  ],
]);

// 7. SEO:canonical 保留大小写(标签页 /tags/Docker/ 不能变成 404 的
//    /tags/docker/),html lang 取数组第一项,OG 图优先用文章封面。
patchText('scripts/helpers/meta-helpers.js', [
  [
    "page.canonical_path.replace('index.html', '').toLowerCase()",
    "page.canonical_path.replace('index.html', '')",
    'canonical keep case',
  ],
]);
patchText('layout/layout.ejs', [
  [
    '<html lang="<%= config.language %>">',
    '<html lang="<%= Array.isArray(config.language) ? config.language[0] : config.language %>">',
    'html lang first',
  ],
]);
patchText('layout/components/header/head.ejs', [
  [
    'let ogImage = page.og_image || openGraphConfig?.image;',
    'let ogImage = page.og_image || page.cover || page.banner || openGraphConfig?.image;',
    'og image cover',
  ],
  [
    'let ogDescription = page.og_description || openGraphConfig?.description || page.description || config.description;',
    'let ogDescription = page.og_description || page.description || openGraphConfig?.description || config.description;',
    'og description page first',
  ],
  [
    "twitter_card: 'summary',",
    "twitter_card: 'summary_large_image',",
    'twitter large card',
  ],
]);

const target = path.join(
  __dirname, '..', 'node_modules',
  'hexo-theme-redefine', 'layout', 'components', 'footer', 'footer.ejs'
);

try {
  let content = fs.readFileSync(target, 'utf8');
  const original = content;

  // 按行删除包含 powered_by 的行("由 Hexo 驱动")
  content = content.split('\n')
    .filter(line => !line.includes('powered_by'))
    .join('\n');

  // 按行删除渲染主题信息的行("主题 Redefine vX.Y.Z")
  content = content.split('\n')
    .filter(line => !/__\(["']theme["']\)/.test(line))
    .join('\n');

  // 删除带 data-swup-reload-script 的 odometer 内联初始化脚本
  const odometerRe = /\s*<script[^>]*>[^<]*?try \{\s*function odometer_init\(\)[\s\S]*?<\/script>/;
  if (odometerRe.test(content)) {
    content = content.replace(odometerRe, '');
  } else if (!/odometer_init/.test(content)) {
    // 已打过补丁:没有 odometer 脚本,正常
  } else {
    console.warn('[theme-patch] 找到 odometer_init 但未能移除脚本,请检查 footer.ejs');
  }

  if (content !== original) {
    fs.writeFileSync(target, content, 'utf8');
    console.log('[theme-patch] 已清理 footer 模板');
  }
} catch (e) {
  console.error('[theme-patch] 失败(不影响构建):', e.message);
}
