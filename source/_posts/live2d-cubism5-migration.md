---
title: 博客左下角的大肥鱼——一次 Cubism 5 运行时迁移和四个顺带修掉的 bug
date: 2026-10-21 21:40:00
categories:
  - 项目实战
tags:
  - Live2D
  - Hexo
  - Swup
  - 前端
description: 站点只装了 Cubism 2 运行时，找到的大肥鱼模型却是 Cubism 4.2 格式。迁移到 Cubism 5 Core 用了一个晚上，顺带修掉了 Swup 重复执行、监听器叠加、中文锚点失效和一条脆弱的测试等待。
cover: /images/cover-design.jpg
series: blog-engineering
series_order: 2
---

博客左下角原来站着 bilibili 的 22 娘。

我想换成 DeepSeek 的大肥鱼。模型在 GitHub 上找到了，作者把 8 个动作、44 个表情和两张贴图一起打包，[A8Chann/dsh-pet-live2d](https://github.com/A8Chann/dsh-pet-live2d)，CC BY-NC-SA 4.0。文件下下来，第一眼就不对：`c_0120.moc3` 文件头的版本字节是 4——Cubism 4.2 格式，不是我以为的 5。

这里要先分清两件事：`.moc3` 文件头的版本字节是模型格式版本，`model3.json` 里的 `Version: 3` 是设置文件格式，两者都不是“Cubism 5”。4.2 格式的模型用 Cubism 5 Core 加载完全兼容，所以迁移本身没问题，只是标题里的“5”指的是运行时。

站点的 Live2D 组件是 [stevenjoezhang/live2d-widget](https://github.com/stevenjoezhang/live2d-widget)，只认 Cubism 2 的 `.moc`。`moc3` 没有公开的降级工具。换模型这件事，变成了换运行时。

<!-- more -->

## 站点这边有什么

`source/live2d/` 下是组件的完整副本：`autoload.js` 负责注入配置，`waifu-tips.js` 负责模型管理，`live2d.min.js` 是 Cubism 2 core，`chunk/index.js` 是 Cubism 2 的加载封装。

模型选择逻辑是固定的：读 `model_list.json`，取 `models[0]`，拼出 `model/<目录>/index.json`，再按 `Version` 字段判断运行时。当前模型是 bilibili-live/22，Cubism 2，目录 2.8MB。

仓库里其实还有 `chunk/index2.js`，208,996 字节，Cubism 5 Core 的加载封装。它一直躺着，因为 `cubism5Path` 在之前的提交里被删掉了。当时这个路径指向一个国内加载失败的外部 CDN。

## 迁移做了什么

第一步，把 Core 本地化。从 Live2D 官方下载 `live2dcubismcore.min.js`，207,155 字节，版本 5.1.0，放进 `source/live2d/`。在 `autoload.js` 里补一行：

```js
cubism5Path: live2d_path + 'live2dcubismcore.min.js',
```

第二步，处理模型入口。组件只认 `index.json`，而标准 Cubism 模型的文件名是 `c_0120.model3.json`。在同目录复制一份改名为 `index.json`，文件内容里的相对路径不用动。

第三步，把 `model_list.json` 从 `bilibili-live/22` 改成 `ds-whale-girl`。旧目录删掉，仓库里少 2.8MB，新模型 4.1MB，加上 Core，模型资源净增约 1.5MB。

验证脚本是现成的。`node test/l2d-debug.js` 输出 `chunkFiles: ["index2.js"]`、`moc: 1`、`textures: 2`，控制台一行 `Live2D Cubism SDK Core Version 5.1.0`。E2E 17 项全过。

到这一步，模型已经能动了。接下来是四个被它带出来的问题。

## 一：Swup 换页时重新执行的脚本

站点开了 `single_page`，Redefine 会把所有注入的 `<script>` 加上 `data-swup-reload-script`。换页时 Swup 重新创建脚本节点，`autoload.js` 再执行一次。

原来的 `autoload.js` 顶层是 `const live2d_path = '/live2d/'`。第二次执行时，同一个全局环境里重复声明 `const`，浏览器直接抛 `SyntaxError: Identifier 'live2d_path' has already been declared`。每次换页一条未捕获错误。

更微妙的是，之前没有重复初始化宠物，恰恰是因为这行错误在脚本执行前就中断了。如果只把它改成 `var` 或包一层 IIFE，宠物会挂两份。

处理方式：整个文件包进 IIFE，入口加一个 `window.__live2dAutoloaded` 标记。第二次执行直接返回。

## 二：全局监听器随脚本实例累积

`custom.js` 里有一个 `once()`：

```js
function once(fn) {
  let done = false;
  return function() {
    if (done) return;
    done = true;
    return fn.apply(this, arguments);
  };
}
```

它看起来能防重复，但 `done` 在闭包里。Swup 每次换页都会重新执行整个脚本，闭包跟着重建，`done` 又变成 `false`。于是 `document` 上的 keydown、click 和 `window` 上的 scroll 监听器一页加一个。

后果不是理论上的。换页一次后：

- 点赞按钮的 click 监听器有两个，一次点击先加一、再减一，数字回到原点。
- 按 Esc 退出「管中窥豹」，两个 keydown 监听器依次执行，关掉又打开。

改成 `window` 级的标记：

```js
function onceGlobal(key, fn) {
  const flag = '__cj_once_' + key;
  if (window[flag]) return;
  window[flag] = true;
  fn();
}
```

顺带删掉了底部重复注册的 `swup.hooks.on('content:replace', init)`。脚本本身已经会被 Swup 重新执行，再注册钩子会让 `init()` 的调用次数随换页次数线性增加。

E2E 里加了一条回归：换页回首页后点一次赞，数字必须变化。

## 三：中文标题的锚点

文章目录里的中文标题链接长这样：

```html
<a href="#%E6%88%91%E7%94%A8-Docker-%E5%81%9A%E4%BB%80%E4%B9%88">
```

对应的标题 id 是原文 `我用-Docker-做什么`。原来的代码：

```js
e.preventDefault();
const target = document.getElementById(targetId.slice(1));
```

`getElementById` 拿到的还是 percent-encoded 字符串，找不到目标。`preventDefault()` 又已经执行了，浏览器默认跳转也被取消。点击没有任何反应。

改成先 `decodeURIComponent`，找不到目标就不拦截默认行为；绑定方式从「给每个链接加 listener」改成捕获阶段的 document 事件委托，主题之后动态生成的目录链接也能覆盖。标题另外加了 `scroll-margin-top: 96px`，跳转后不会被悬浮导航挡住。

## 四：一条固定等待的测试

E2E 里判断明暗切换，原来是点击后 `await new Promise(r => setTimeout(r, 1500))`，再看 `html.dark`。

换成 Cubism 5 Core 之后，这项开始稳定失败。单独测发现切换本身是好的，点击后约 100ms class 就翻转了。问题在无头 Chrome 的 SwiftShader：2.1MB 的 moc3 和 1.8MB 的贴图在软件渲染下会阻塞主线程数秒，固定 1.5 秒的等待正好落在阻塞里。

把固定等待换成等待状态真正翻转：

```js
await page.waitForFunction(
  d => document.documentElement.classList.contains('dark') !== d,
  { timeout: 15000 },
  before
);
```

同一轮还发现测试用的静态服务器不处理目录索引。Swup 请求 `/about`，服务器去找 `public/about` 这个文件，返回 404，导航被撤销。生产环境的 GitHub Pages 会返回 `about/index.html`，本地测试服务器补上同样的行为。

## 动效也顺手改了

顶部导航收缩时用 0.56 秒过渡 `width`、`margin`、`padding`、`border-radius`、`transform` 五个属性；滚回顶部时，定义过渡的那条规则不在了，只剩主题自带的 `max-width 0.3s`，其余属性瞬间跳回。现在两个方向共用一组 0.38 秒的过渡，曲线带一点过冲。

底部页脚是 `transition: all 0.35s`，改成明确列出的属性，圆角从 0 改成 14px。

Live2D 的入场原来是 `bottom: -500px` 到 `0`，3 秒。改成 `transform` 加 `opacity`，0.75 秒。

页面切换的 `pageEnter` 动画里有一个 `filter: blur(4px)`，全页模糊。删掉，时长从 0.45 秒降到 0.36 秒。

第一轮调完曲线，滚动还是不够顺。又查了一遍，问题不在时长：

- 主题的 `SwupScrollPlugin` 自己用 rAF 逐帧滚动，而 `html` 上又设了 `scroll-behavior: smooth`，两个滚动动画互相打断。全局改回 `auto`，需要平滑的地方单独传 `behavior: 'smooth'`。
- 首页每张卡片入场的 `cardSettle` 关键帧里有一个 `filter: blur(8px)`，卡片本身还带 `backdrop-filter`。最多 10 张卡同时做两层模糊。关键帧只保留 `opacity` 和 `transform`，卡片上的 `backdrop-filter` 也去掉。
- `.reveal` 上常驻 `will-change: opacity, transform`，几十个元素各占一个合成层。删掉。
- 主题的 `updateScrollStyle` 已经在维护进度条，`custom.js` 里的滚动回调又写了一遍宽度，还在每帧读 `scrollHeight`。删掉重复写入，滚动回调只保留导航和页脚状态。
- Swup 的滑动主题默认 60px / 0.4s，和页面的 `pageEnter` 叠在一起。滑动收到 16px / 0.32s，`pageEnter` 只在首屏播放。
- 导航收缩阈值 60px 在慢速滚动时会反复触发，加迟滞：100px 进入、40px 退出；页脚同理，距底 8px 展开、离开 80px 才收回。

这些改完，滚动路径上不再有每帧的布局写入和整卡模糊。

Live2D 的 Cubism 循环也一并处理了：滚动时调用 `stop()`，`scrollend` 或 1.2 秒空闲后 `run()`；空闲帧率限制到 30fps，`deltaTime` 上限钳到 50ms，避免暂停恢复后动作跳变。用无头 Chrome 开真实 GPU（AMD 核显）连续滚 6 秒：有宠物时 p50 8ms、p95 17ms，关掉宠物 p95 9ms。滚动时不再和宠物抢主线程。模型本身没有 HitArea，点击画布原本没有任何反应；现在绑了随机动作和表情，8 个动作组（Idle + 7 个可点动作）、44 个表情终于能用到。

## 第三遍：字体、图片和移动端

- [FontAwesome 全量字体 805KB](https://fontawesome.com/)，全站实际只用到 64 个码点（完整过程见[字体子集与 CLS](/2026/10/22/font-subset-and-cls/)）。用 fonttools 裁成三个子集，合计 13KB；整页字体从 971KB 降到 179KB。新增图标后跑 `npm run build:fonts` 重新生成。
- 构建期给所有站内图片写入 `width`/`height`、`decoding="async"`；首屏 banner 和文章头图 `loading="eager"` + `fetchpriority="high"`，其余懒加载。
- 文章目录的展开状态在 `<body>` 解析前从 localStorage 预置到 `html` 上，CSS 提前按展开布局排版。文章首屏 CLS 从 0.486 降到 0.058。
- 主题在滚动时会改 `--navbar-height`，正文跟着位移 20px。把变量固定在 70px，视觉收缩交给自定义胶囊动画。
- 900px 以下不加载 4.6MB 的 Live2D；移动端页脚改为可换行、隐藏次要项并提高小字对比度；移动导航的搜索/菜单补上键盘焦点，关闭的抽屉设为 `inert`。

当时（2026-10-21）的首屏 CLS：首页 0.077、文章 0.058、归档 0.092、关于 0.0002；LCP 0.4–1.1 秒。

## 收尾

CSS 里删了约 200 行不再匹配任何元素的选择器：`spark-*`、`theme-ripple`、`post-nav`、`article-category` 这些。删之前用脚本统计了生成页面里的 class token，确认数量为 0。

测试从 17 项加到 33 项（含 8 个次级页面），全部通过。

模型作者是上善无形、ZipZipPipe 和氵六青，模型来自 A8Chann/dsh-pet-live2d 的 v3.3.3，[LICENSE](/live2d/model/ds-whale-girl/LICENSE) 随模型目录一起分发，关于页面也加了署名。

现在它站在左下角，比 22 娘大一圈。模型资源净增 1.5MB，换页少一条 SyntaxError。
