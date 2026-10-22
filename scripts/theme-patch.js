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
    'const height = y <= 100 ? 0 : document.body.scrollHeight;',
    'sideTools source lazy height',
  ],
]);
patchText('source/js/build/utils/sideTools.js', [
  [
    'const t=window.scrollY,e=document.body.scrollHeight,o=window.innerHeight,',
    'const t=window.scrollY,o=window.innerHeight;let e=0;if(t>100)e=document.body.scrollHeight;const ',
    'sideTools build lazy height',
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

// 4. Swup:去掉 SwupSlideTheme 的退出动画。
//    旧流程是"先播旧页退出动画(约 320ms),再替换 DOM",首跳 click→replace
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
    '        containers: ["#swup"],\n    });',
    '        containers: ["#swup"],\n        animationSelector: false,\n    });',
    'swup disable animation selector',
  ],
]);

// 5. APlayer:首屏初始化实测有 ~400ms 长任务。保留播放器,
//    但把脚本推迟到空闲时加载,避免和文章首屏抢主线程。
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
  if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 8000 });
  else setTimeout(load, 2500);
})();
</script>`,
    'aplayer defer',
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
