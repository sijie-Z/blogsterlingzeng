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
  if (!tocSrc.includes('__cjTocResizeBound')) {
    console.warn('[theme-patch] TOC resize 监听未能重新注入,请检查主题模板');
  }
  if (!tocSrc.includes('setTimeout(() => utils.registerTOCScroll(), 800);')) {
    console.warn('[theme-patch] TOC 延迟刷新未能重新注入,请检查主题模板');
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
  if (!tocBuild.includes('__cjTocResizeBound')) {
    console.warn('[theme-patch] TOC 构建产物的 resize 监听未能重新注入');
  }
  if (!tocBuild.includes('setTimeout((()=>l.registerTOCScroll()),800)')) {
    console.warn('[theme-patch] TOC 构建产物的延迟刷新未能重新注入');
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
  var timer = setTimeout(load, 12000);
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
  // 只在 12 秒后加载,避免用户点击导航/按钮时被播放器初始化打断
})();
</script>`,
    'aplayer defer',
  ],
]);

// 5.1 归一旧版 aplayer 补丁(requestIdleCallback 常常 ~1s 就触发,
//     仍然会和首屏抢主线程):改成 12s 后加载,不再绑定用户交互。
const aplayerFile = path.join(themeRoot, 'layout/components/plugins/aplayer.ejs');
try {
  let ap = fs.readFileSync(aplayerFile, 'utf8');
  const before = ap;
  ap = ap.replace(
    "  var loaded = false;\n  function load() {\n    if (loaded) return;\n    loaded = true;\n",
    "  var loaded = false;\n  var timer = setTimeout(load, 12000);\n  function load() {\n    if (loaded) return;\n    loaded = true;\n    clearTimeout(timer);\n"
  );
  ap = ap.replace(
    "  if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 8000 });\n  else setTimeout(load, 2500);",
    "  // 只在 12 秒后加载,避免用户点击导航/按钮时被播放器初始化打断\n"
  );
  if (ap !== before) {
    fs.writeFileSync(aplayerFile, ap, 'utf8');
    console.log('[theme-patch] 已更新 aplayer 延迟策略');
  }
} catch (e) {
  console.warn('[theme-patch] aplayer 归一失败:', e.message);
}

// 5.2 搜索输入防抖:主题对每个 input 事件都全量扫描 searchdb,
//     中文输入法逐字触发时会有明显卡顿。70ms 足够覆盖连续输入。
patchText('source/js/tools/localSearch.js', [
  [
    `const handleInput = (event) => {
  if (!event.target.matches(".search-input")) {
    return;
  }

  renderSearchResult(event.target);
};`,
    `const handleInput = (event) => {
  if (!event.target.matches(".search-input")) {
    return;
  }

  clearTimeout(window.__cjSearchTimer);
  window.__cjSearchTimer = setTimeout(() => renderSearchResult(event.target), 70);
};`,
    'search input debounce',
  ],
]);
patchText('source/js/build/tools/localSearch.js', [
  [
    'handleInput=t=>{t.target.matches(".search-input")&&renderSearchResult(t.target)}',
    'handleInput=t=>{if(!t.target.matches(".search-input"))return;clearTimeout(window.__cjSearchTimer);window.__cjSearchTimer=setTimeout((()=>renderSearchResult(t.target)),70)}',
    'search input debounce build',
  ],
]);

// 5.3 APlayer 初始化时会自己点击歌词图标;音频没有 lrc 时会弹出
//     "LRC file request fails" 错误框,还会产生一次合成 click。
//     先移除自动点击;没有 lrc 时把 lrcType 设为 0,彻底不请求歌词。
patchText('source/js/plugins/aplayer.js', [
  [
    '    document.querySelector(".aplayer-icon-lrc").click();\n',
    '',
    'aplayer remove auto lrc click',
  ],
  [
    '      lrcType: 3,',
    '      lrcType: audioList.some((item) => item.lrc) ? 3 : 0,',
    'aplayer lrc only when present',
  ],
]);
patchText('source/js/build/plugins/aplayer.js', [
  [
    ';document.querySelector(".aplayer-icon-lrc").click()',
    '',
    'aplayer remove auto lrc click build',
  ],
  [
    'lrcType:3,audio:e',
    'lrcType:e.some((t=>t.lrc))?3:0,audio:e',
    'aplayer lrc only when present build',
  ],
]);

// 5.4 音乐只在用户点播放时再请求(2.5MB 的 mp3 不应随页面加载)
patchText('source/js/plugins/aplayer.js', [
  [
    `      container: document.getElementById("aplayer"),
      mini: true,`,
    `      container: document.getElementById("aplayer"),
      preload: "none",
      mini: true,`,
    'aplayer preload none mini',
  ],
  [
    `      container: document.getElementById("aplayer"),
      fixed: true,`,
    `      container: document.getElementById("aplayer"),
      preload: "none",
      fixed: true,`,
    'aplayer preload none fixed',
  ],
]);
patchText('source/js/build/plugins/aplayer.js', [
  [
    'container:document.getElementById("aplayer"),mini:!0,audio:e',
    'container:document.getElementById("aplayer"),preload:"none",mini:!0,audio:e',
    'aplayer preload none mini build',
  ],
  [
    'container:document.getElementById("aplayer"),fixed:!0,lrcType:3,audio:e',
    'container:document.getElementById("aplayer"),preload:"none",fixed:!0,lrcType:3,audio:e',
    'aplayer preload none fixed build',
  ],
]);

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
// 6.45 pangu 只处理正文。autoSpacingPage 会在页面加载后改标题文字,
//      标题换行变化会让绝对定位的封面标题产生 CLS。
patchText('source/js/plugins/pangu.js', [
  [
    '  pangu.spacingElementByClassName("markdown-body");\n  pangu.autoSpacingPage();',
    '  // 只处理正文;整页 autoSpacingPage 会改标题并触发 CLS\n  pangu.spacingElementByClassName("markdown-body");',
    'pangu no auto spacing',
  ],
]);
patchText('source/js/build/plugins/pangu.js', [
  [
    ',pangu.autoSpacingPage()',
    '',
    'pangu no auto spacing build',
  ],
]);

// 6.5 用 Intl 替换 essays 页的 moment 依赖。
//     moment-with-locales 375KB,却只在这一个页面格式化“今天/昨天”;
//     替换后可以从所有页面移除该脚本。整文件重写并带标记,重复执行不会叠加。
function writeEssays(relPath, content) {
  const file = path.join(themeRoot, relPath);
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (e) { return; }
  if (text.includes('formatEssayDate')) return;
  fs.writeFileSync(file, content, 'utf8');
  console.log('[theme-patch] 已优化', relPath);
}
writeEssays('source/js/layouts/essays.js', `function formatEssayDate(raw, locale) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  const lang = Array.isArray(locale) ? locale[0] : locale;
  const now = new Date();
  const day = value => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diff = Math.round((day(now) - day(date)) / 86400000);
  const time = date.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  if (diff === 0) return '今天 ' + time;
  if (diff === 1) return '昨天 ' + time;
  if (diff > 1 && diff < 7) return diff + ' 天前';
  return date.toLocaleDateString(lang, { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function initEssays() {
  const dateElements = document.querySelectorAll(".essay-date");
  if (!dateElements.length) return;
  dateElements.forEach((element) => {
    const rawDate = element.getAttribute("data-date");
    const locale = config.language || "en";
    element.textContent = formatEssayDate(rawDate, locale);
  });
}
`);
writeEssays('source/js/build/layouts/essays.js', `function formatEssayDate(raw,locale){const date=new Date(raw);if(Number.isNaN(date.getTime()))return raw;const lang=Array.isArray(locale)?locale[0]:locale,now=new Date(),day=value=>new Date(value.getFullYear(),value.getMonth(),value.getDate()).getTime(),diff=Math.round((day(now)-day(date))/864e5),time=date.toLocaleTimeString(lang,{hour:'2-digit',minute:'2-digit'});if(diff===0)return'今天 '+time;if(diff===1)return'昨天 '+time;if(diff>1&&diff<7)return diff+' 天前';return date.toLocaleDateString(lang,{year:'numeric',month:'2-digit',day:'2-digit'})}
export default function initEssays(){const t=document.querySelectorAll(".essay-date");t.length&&t.forEach((t=>{const e=t.getAttribute("data-date"),n=config.language||"en",a=formatEssayDate(e,n);t.textContent=a}))}
//# sourceMappingURL=essays.js.map
`);
patchText('layout/components/scripts.ejs', [
  [
    "<%- renderJS('libs/moment-with-locales.min.js', { swupReload: false }) %>\n",
    '',
    'drop moment script',
  ],
  [
    `<% if (theme.footer.runtime) { %>
    <%- renderJS('libs/odometer.min.js') %>
    <%- renderCSS('assets/odometer-theme-minimal.css') %>
<% } %>

`,
    '',
    'drop odometer (footer runtime writes text directly)',
  ],
  [
    '<% if (subtitleEntries.length !== 0 || (subtitleConfig.hitokoto && subtitleConfig.hitokoto.enable)) { %>',
    '<% if (is_home() && (subtitleEntries.length !== 0 || (subtitleConfig.hitokoto && subtitleConfig.hitokoto.enable))) { %>',
    'typed only on home',
  ],
]);

patchText('layout/components/header/head.ejs', [
  [
    `    <!--- Fontawesome Part-->
    <%- renderCSS('fontawesome/fontawesome.min.css') %>
    <%- renderCSS('fontawesome/brands.min.css') %>
    <%- renderCSS('fontawesome/solid.min.css') %>
    <%- renderCSS('fontawesome/regular.min.css') %>
`,
    `    <!--- Fontawesome Part: 类名子集由 scripts/fa-subset.js 尾部注入 -->
`,
    'fontawesome css class subset',
  ],  [
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
  [
    '    <meta name="robots" content="index,follow">',
    `    <meta name="robots" content="<%= String(page.path || '').replace(/index\\.html$/, '') === '404.html' ? 'noindex,follow' : 'index,follow,max-image-preview:large' %>">`,
    'robots noindex 404',
  ],
  [
    '    <meta name="googlebot" content="index,follow">',
    `    <meta name="googlebot" content="<%= String(page.path || '').replace(/index\\.html$/, '') === '404.html' ? 'noindex,follow' : 'index,follow,max-image-preview:large' %>">`,
    'googlebot noindex 404',
  ],
  [
    `    <!--- Inject Part-->
    <% if (theme.inject.enable == true) { %>
        <% for (let i in theme.inject.head) { %>
            <% if (theme.inject.head[i] !== null){ %>
                <% if (theme.global.single_page == true) { %>
                    <%- theme.inject.head[i].replace("<script", "<script data-swup-reload-script") %>
                <% } else { %>
                    <%- theme.inject.head[i] %>
            <% } }%>
    <% } }%>
`,
    '',
    'move inject head after theme css',
  ],
  [
    `    <% if (theme.developer && theme.developer.enable) {%>
        <%- css('css/build/tailwind.css') %>
    <% } else {%>
        <%- renderCSS('css/build/tailwind.css') %>
    <% } %>
`,
    `    <% if (theme.developer && theme.developer.enable) {%>
        <%- css('css/build/tailwind.css') %>
    <% } else {%>
        <%- renderCSS('css/build/tailwind.css') %>
    <% } %>

    <!--- Inject Part-->
    <% if (theme.inject.enable == true) { %>
        <% for (let i in theme.inject.head) { %>
            <% if (theme.inject.head[i] !== null){ %>
                <% if (theme.global.single_page == true) { %>
                    <%- theme.inject.head[i].replace("<script", "<script data-swup-reload-script") %>
                <% } else { %>
                    <%- theme.inject.head[i] %>
            <% } }%>
    <% } }%>
`,
    'inject head after tailwind',
  ],
  [
    "String(page.path || '').replace(/index\\.html$/, '')",
    "String(page.path || '').replace(/^\\/+/, '').replace(/index\\.html$/, '')",
    'path normalize for robots/og',
  ],
]);

// 4.7 og:url 归一:旧补丁把 url 行追加在 image 之后,重复执行会叠加。
//     这里先清掉所有旧行,再只在 image: ogImage 后插入一份。
const headFile = path.join(themeRoot, 'layout/components/header/head.ejs');
try {
  let head = fs.readFileSync(headFile, 'utf8');
  const before = head;
  head = head.replace(
    /(?:\n[ \t]*\/\/ og:url[^\n]*)?\n[ \t]*url: \(config\.url \|\| ''\)[^\n]*,/g,
    ''
  );
  const imageMarker = '            image: ogImage,';
  const ogUrl = `\n            // og:url 用和 canonical 一致的目录 URL,不要带 index.html\n            url: (config.url || '').replace(/\\/+$/, '') + '/' + String(page.path || '').replace(/^\\/+/, '').replace(/index\\.html$/, ''),`;
  if (head.includes(imageMarker) && !head.includes("url: (config.url || '')")) {
    head = head.replace(imageMarker, imageMarker + ogUrl);
  }
  if (head !== before) {
    fs.writeFileSync(headFile, head, 'utf8');
    console.log('[theme-patch] 已归一 og:url');
  }
} catch (e) {
  console.warn('[theme-patch] og:url 归一失败:', e.message);
}

// 6.5 无障碍:把导航搜索项的 role=button 从 <li> 上移到真正的 <button>,
//     既保留 <ul><li> 列表语义,又让 Enter/Space 原生可用。
patchText('layout/components/header/navbar.ejs', [
  [
    `    <div class="navbar-content transition-navbar <%- (theme.home_banner.enable === true && is_home() && !page.prev) ? 'has-home-banner' : '' %>">`,
    `    <div role="navigation" aria-label="主导航" class="navbar-content transition-navbar <%- (theme.home_banner.enable === true && is_home() && !page.prev) ? 'has-home-banner' : '' %>">`,
    'navbar navigation landmark',
  ],
  [
    `                        <li class="navbar-item search search-popup-trigger">
                            <i class="fa-solid fa-magnifying-glass"></i>
                        </li>`,
    `                        <li class="navbar-item search">
                            <button type="button" class="search-popup-trigger" aria-label="搜索文章">
                                <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                            </button>
                        </li>`,
    'navbar search native button',
  ],
]);

// 6.6 文章工具条:li 保留布局,内部换成原生 button,避免 role=button
//     直接挂在 <li> 上破坏列表语义。
patchText('layout/pages/post/post-tools.ejs', [
  [
    `\t\t<li class="right-bottom-tools page-aside-toggle">
\t\t\t<i class="fa-regular fa-outdent"></i>
\t\t</li>`,
    `\t\t<li class="right-bottom-tools page-aside-toggle">
\t\t\t<button type="button" class="cj-tool-btn" aria-label="显示或隐藏目录" aria-expanded="false">
\t\t\t\t<i class="fa-regular fa-outdent" aria-hidden="true"></i>
\t\t\t</button>
\t\t</li>`,
    'post tools native button (toc)',
  ],
  [
    `\t\t<li class="go-comment">
\t\t\t<i class="fa-regular fa-comments"></i>
\t\t</li>`,
    `\t\t<li class="go-comment">
\t\t\t<button type="button" class="cj-tool-btn" aria-label="跳转到评论">
\t\t\t\t<i class="fa-regular fa-comments" aria-hidden="true"></i>
\t\t\t</button>
\t\t</li>`,
    'post tools native button (comment)',
  ],
]);

// 6.7 首页社交图标链接补 aria-label,避免只有图标的空链接
patchText('layout/pages/home/home-banner.ejs', [
  [
    '<a href="<%- resolvedUrl %>">',
    '<a href="<%- resolvedUrl %>" aria-label="邮件">',
    'social email label',
  ],
  [
    '<a target="_blank" href="<%- resolvedUrl %>">',
    '<a target="_blank" href="<%- resolvedUrl %>" aria-label="<%= name || \'社交链接\' %>">',
    'social icon label',
  ],
]);

// 6.8 主题默认配置里的占位邮箱会合并进站点,生成一条 you@example.com 空链接
patchText('_config.yml', [
  [
    `      - icon: email
        url: you@example.com`,
    `      - icon: email
        url:`,
    'remove placeholder social email',
  ],
]);

// 6.9 分页的上一页/下一页只有图标,补屏幕阅读器文本
patchText('layout/utils/paginator.ejs', [
  [
    `prev_text: '<i class="fa-regular fa-angle-left"></i>'`,
    `prev_text: '<span class="sr-only">上一页</span><i class="fa-regular fa-angle-left" aria-hidden="true"></i>'`,
    'paginator prev label',
  ],
  [
    `next_text: '<i class="fa-regular fa-angle-right"></i>'`,
    `next_text: '<span class="sr-only">下一页</span><i class="fa-regular fa-angle-right" aria-hidden="true"></i>'`,
    'paginator next label',
  ],
]);

// 6.10 语义结构:main 只包正文,header/footer 回到地标层级;
//      首页/归档补标题层级,侧栏工具改原生按钮。
patchText('layout/page.ejs', [
  [
    '<main class="page-container" id="swup">',
    '<div class="page-container" id="swup">',
    'page container to div',
  ],
  [
    `			<div class="main-content">
				<%- partial(getPagePartialPath(page)) %>
			</div>`,
    `			<main class="main-content" id="main-content" tabindex="-1">
				<%- partial(getPagePartialPath(page)) %>
			</main>`,
    'main-content to main landmark',
  ],
  [
    '</main>\n\n<% if (theme.global.single_page !== false) { %>',
    '</div>\n\n<% if (theme.global.single_page !== false) { %>',
    'close swup div',
  ],
]);

patchText('layout/pages/archive/archive.ejs', []);

patchText('layout/pages/home/home-content.ejs', [
  [
    '<div id="home-article-thumbnail" class="home-article-thumbnail',
    '<div class="home-article-thumbnail',
    'home thumbnail duplicate id',
  ],
  [
    `                    <h3 class="home-article-title">
                        <a href="<%- url_for(post.path) %>">
                            <%= post.title %>
                        </a>
                    </h3>`,
    `                    <h2 class="home-article-title">
                        <a href="<%- url_for(post.path) %>">
                            <%= post.title %>
                        </a>
                    </h2>`,
    'home card h2',
  ],
]);

// 6.10.1 archive/home 的标题补丁是“插在锚点前”,from 仍包含锚点,
//        重复执行会叠加;这里先清空重复项,再各插回一份。
for (const [relPath, marker, block, anchor] of [
  ['layout/pages/archive/archive.ejs', '<h1 class="sr-only">归档</h1>', '<h1 class="sr-only">归档</h1>\n', '<div class="archive-container'],
  ['layout/pages/home/home-content.ejs', '<h2 class="sr-only">最新文章</h2>', '    <h2 class="sr-only">最新文章</h2>\n', '    <ul class="home-article-list">'],
]) {
  const file = path.join(themeRoot, relPath);
  try {
    let content = fs.readFileSync(file, 'utf8');
    const before = content;
    const duplicate = new RegExp(`(?:${block.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})+`, 'g');
    content = content.replace(duplicate, '');
    if (!content.includes(marker)) {
      content = content.replace(anchor, block + anchor);
    }
    if (content !== before) {
      fs.writeFileSync(file, content, 'utf8');
      console.log('[theme-patch] 已归一标题补丁', relPath);
    }
  } catch (e) {
    console.warn('[theme-patch] 标题补丁归一失败:', relPath, e.message);
  }
}

patchText('layout/utils/side-tools.ejs', [
  [
    `		<li class="right-bottom-tools tool-font-adjust-plus flex justify-center items-center">
			<i class="fa-regular fa-magnifying-glass-plus"></i>
		</li>`,
    `		<li class="right-bottom-tools tool-font-adjust-plus flex justify-center items-center">
			<button type="button" class="cj-tool-btn" aria-label="放大字号"><i class="fa-regular fa-magnifying-glass-plus" aria-hidden="true"></i></button>
		</li>`,
    'side tool font plus',
  ],
  [
    `		<li class="right-bottom-tools tool-font-adjust-minus flex justify-center items-center">
			<i class="fa-regular fa-magnifying-glass-minus"></i>
		</li>`,
    `		<li class="right-bottom-tools tool-font-adjust-minus flex justify-center items-center">
			<button type="button" class="cj-tool-btn" aria-label="缩小字号"><i class="fa-regular fa-magnifying-glass-minus" aria-hidden="true"></i></button>
		</li>`,
    'side tool font minus',
  ],
  [
    `		<li class="right-bottom-tools tool-dark-light-toggle flex justify-center items-center">
			<i class="fa-regular fa-moon"></i>
		</li>`,
    `		<li class="right-bottom-tools tool-dark-light-toggle flex justify-center items-center">
			<button type="button" class="cj-tool-btn" aria-label="切换明暗模式"><i class="fa-regular fa-moon" aria-hidden="true"></i></button>
		</li>`,
    'side tool theme',
  ],
  [
    `<a class="flex justify-center items-center" href="<%= '/' + config.feed.path %>" target="_blank">
				<i class="fa-regular fa-rss"></i>
			</a>`,
    `<a class="flex justify-center items-center" href="<%= '/' + config.feed.path %>" target="_blank" aria-label="RSS 订阅">
				<i class="fa-regular fa-rss" aria-hidden="true"></i>
			</a>`,
    'side tool rss label',
  ],
  [
    `		<li class="right-bottom-tools tool-scroll-to-top flex justify-center items-center">
			<i class="fa-regular fa-arrow-up"></i>
		</li>`,
    `		<li class="right-bottom-tools tool-scroll-to-top flex justify-center items-center">
			<button type="button" class="cj-tool-btn" aria-label="回到顶部"><i class="fa-regular fa-arrow-up" aria-hidden="true"></i></button>
		</li>`,
    'side tool scroll top',
  ],
  [
    `		<li class="right-bottom-tools tool-scroll-to-bottom flex justify-center items-center">
			<i class="fa-regular fa-arrow-down"></i>
		</li>`,
    `		<li class="right-bottom-tools tool-scroll-to-bottom flex justify-center items-center">
			<button type="button" class="cj-tool-btn" aria-label="回到底部"><i class="fa-regular fa-arrow-down" aria-hidden="true"></i></button>
		</li>`,
    'side tool scroll bottom',
  ],
  [
    `		<li class="right-bottom-tools toggle-tools-list flex justify-center items-center">
			<i class="fa-regular fa-cog <% if (theme.global.side_tools && theme.global.side_tools.gear_rotation !== false) { %>fa-spin<% } %>"></i>
		</li>`,
    `		<li class="right-bottom-tools toggle-tools-list flex justify-center items-center">
			<button type="button" class="cj-tool-btn" aria-label="展开或收起工具栏" aria-expanded="false"><i class="fa-regular fa-cog <% if (theme.global.side_tools && theme.global.side_tools.gear_rotation !== false) { %>fa-spin<% } %>" aria-hidden="true"></i></button>
		</li>`,
    'side tool toggle',
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
