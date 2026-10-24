---
title: 33MB 到 22MB：一次静态资源和长任务清理
date: 2026-10-23 23:30:00
categories:
  - 前端开发
tags:
  - 性能优化
  - Hexo
  - 博客
description: 博客看起来已经很快了，但首屏仍加载了 200KB 用不到的图标 CSS、375KB 的 moment 和 8.4MB 没人引用的字体。这篇文章记录一次“删依赖”而不是“加缓存”的性能清理，以及一次被测量否决的 View Transition 改造。
cover: /images/cover-tech.webp
series: blog-engineering
series_order: 5
---

## 结论先行

{% callout type="success" title="这次清理做了什么" %}
- FontAwesome 全量 CSS **200KB → 65KB**（只保留 77 个实际用到的图标类）
- 移除 **375KB** 的 moment（essays 页改用 `Intl`）
- 移除 **8.4MB** 未被引用的全量 webfonts
- 关闭 odometer 数字滚动，消掉一次约 **300ms** 的首屏长任务
- 实测后**放弃** Swup 原生 View Transition：内容替换从 37ms 变成 381ms
{% endcallout %}

<!-- more -->

## 起点：页面上到底加载了什么

在改任何东西之前，先把首页的请求摊开看。HTML 里除了三四个自定义脚本，还挂着：

- 13 个样式表，其中 4 个是 FontAwesome 的全量 CSS；
- `moment-with-locales.min.js`，375KB；
- 一个 6 秒后才初始化的 APlayer；
- 一套 odometer 数字滚动动画；
- 部署目录里 8.4MB 的 FontAwesome 全量字体，以及 11.6MB 的 source map。

这些资源大多不是“首屏必须”，只是主题默认带上的。优化的第一步不是加缓存，而是确认哪些代码根本没有被用到。

## FontAwesome：200KB 的类名，只用了 77 个

主题加载了四个文件：

```text
fontawesome.min.css   162KB
brands.min.css         18KB
solid.min.css           0.5KB
regular.min.css         0.5KB
```

字体已经做过子集（14KB 的 woff2，过程见[《从 971KB 到 179KB》](/2026/10/22/font-subset-and-cls/)），但 **CSS 类名没有**。`fontawesome.min.css` 里每个图标都有一条 `.fa-xxx:before { content: "\fxxx" }`，全站实际只用到 77 个。

于是写了一个构建期脚本，思路分三步：

1. 扫描构建产物 HTML、主题模板和主题 JS，收集所有 `fa-*` 类名；
2. 从 FontAwesome 源 CSS 里解析出“类名 → 码点”的映射；
3. 过滤 CSS：不带图标类名的规则原样保留；带图标类名的规则，只有命中实际用到的图标才保留。

关键是**不能只看首屏**。主题的 JS 会动态插入 `fa-copy`、`fa-check`、`fa-expand`、`fa-spinner` 这类图标，所以扫描范围必须包括主题的 JS 源码，而不是只扫当前 HTML。生成后再用一个覆盖率脚本反向检查：构建产物里出现的每个图标类名，在子集 CSS 里都能找到对应规则。

结果：

```text
fontawesome-icons-subset.css  65KB（gzip 后约 8KB）
保留 77 个图标 / 70 个码点
sound-solid / regular / brands 子集字体 5KB + 7KB + 1KB
```

同时把 `public/webfonts/` 整个目录从部署产物里移除。页面只引用 `/fontawesome/webfonts/*.subset.woff2`，全量字体没有任何引用。

## moment：为了一个页面，拖累所有页面

`moment-with-locales.min.js` 375KB，全站每个页面都加载。搜索代码后发现，客户端只用在一个地方：说说页把日期格式化成“今天 / 昨天 / 3 天前”。

这完全可以由 `Intl` 完成：

```js
const diff = Math.round((day(now) - day(date)) / 86400000);
const time = date.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
if (diff === 0) return '今天 ' + time;
if (diff === 1) return '昨天 ' + time;
if (diff > 1 && diff < 7) return diff + ' 天前';
return date.toLocaleDateString(lang, { year: 'numeric', month: '2-digit', day: '2-digit' });
```

改完后从所有页面移除 moment 脚本。注意主题模板里的 EJS 仍然用 moment 做**构建期**日期格式化，这部分不需要动——服务端有 moment，客户端没有。

这次改动也暴露了一个补丁工程的问题：第一次替换时只改了 `source/js/layouts/essays.js`，漏了 `source/js/build/layouts/essays.js`，结果页面报 `Identifier 'formatEssayDate' has already been declared`。教训是：主题的“源码”和“构建产物”是两份文件，补丁必须同时覆盖，并且要幂等。

## APlayer：一个 404 和一个 300ms 长任务

APlayer 是主题自带的固定播放器。排查时发现两个问题：

**1. 没有歌词也请求 LRC。** 主题把 `lrcType` 写死成 `3`，即使音频没有 `lrc` 字段，浏览器也会去请求 `123.lrc`，控制台报 404，左下角还弹出一个错误框。

```js
lrcType: audioList.some(item => item.lrc) ? 3 : 0
```

**2. 首次交互就初始化。** 原逻辑是“用户第一次 pointerdown / keydown / scroll 时加载”，听起来合理，实际上用户点导航、按快捷键、滚动页面都会触发一次约 300–400ms 的播放器初始化。现在改成 **12 秒后**才加载；播放器是装饰性的，不应该和导航抢主线程。

## odometer：一次 300ms 的布局任务

页脚的“博客已运行 X 天 X 小时”用了 odometer 数字滚动。它在字体就绪后一次性初始化四个数字，每个数字内部会生成多层 span 做翻转动画。

但主题的 `runtime.js` 本来就会**每秒直接写 `innerHTML`**，odometer 的动画马上会被覆盖。也就是说，这 300ms 的布局任务没有任何视觉收益。

处理方式很简单：不再初始化 odometer，让 runtime 直接写文本。首屏长任务从约 300ms 降下来，页脚数字仍然每秒更新。

## 被测量否决的 View Transition

Swup 4 支持 `native: true`，用浏览器原生 View Transition 做页面交叉淡入。理论上很诱人，实际测出来：

| 方案 | 点击 → 内容替换 | 长任务 |
|---|---:|---:|
| 原生 View Transition | 381ms | 485ms |
| 保留现有入场动画 | 37ms | 30ms |

原因不复杂：首页有大量固定定位、backdrop-filter 和图片，浏览器在切换前要对整页做快照，这个成本远大于 Swup 直接替换 DOM。**“更原生”不等于“更快”**，所以这个改动被回退了。

现在页面切换仍然是：旧页不动，新页内容 0.28s 入场；主题切换保留 View Transition 的圆形扩散，因为那是低频操作。

## 结果

| 指标 | 改前 | 改后 |
|---|---:|---:|
| 首页 FontAwesome CSS | ~200KB | 65KB |
| 客户端 moment | 375KB | 0 |
| 部署体积 | 33MB+ | 22MB（含 31 张 OG 卡；横幅和 Live2D 纹理的瘦身见[另一篇](/2026/10/23/responsive-banner-live2d-texture/)） |
| 文章首屏 CLS | ~0.0002 | 0.0001 |
| 点击 → 内容替换 | 15–40ms | 21–43ms |
| 首屏长任务 | ~300ms（odometer） | 约 180ms（字体 preload 后） |

{% gallery %}
/images/og/miqro-gate-virtual-key-design.jpg | MiQroGate 的 OG 卡
/images/og/quant-reversal-execution-gap.jpg | 量化执行复盘的 OG 卡
/images/og/docmind-agent-causal-study.jpg | DocMind 消融实验的 OG 卡
{% endgallery %}

最后一行是诚实的：首屏在字体就绪后仍有一次整页 layout，来源是浏览器内部的样式/布局重算，不是某个 JS 函数。下一步要减少首屏的 backdrop-filter 和固定层，或者把字体切换策略从 `swap` 改成 `optional`。这次先记录，不硬凑一个“0 长任务”的结论。

## 三条可复用的经验

1. **先证明它没被用到，再删。** 全量 CSS、全量字体、moment，都是“主题默认带”而不是“页面需要”。
2. **动态内容要进扫描范围。** 图标类名子集如果不扫主题 JS，运行时会缺图标；只看 HTML 会漏。
3. **性能改动必须能被测量否决。** View Transition 的 37ms → 381ms 如果只凭感觉，很容易当成“更高级的体验”上线。

[^og]: OG 卡由本地 Chrome 渲染，31 张图合计约 1.8MB；生成脚本在 `tools/gen-og-images.js`，改标题后重新跑一次即可。
