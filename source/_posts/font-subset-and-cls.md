---
title: 从 971KB 到 179KB：一次博客性能体检
date: 2026-10-22 15:30:00
categories:
  - 前端开发
tags:
  - 性能优化
  - 字体
  - CSS
  - Web Vitals
description: 字体请求 971KB，文章首屏 CLS 0.486。一次体检把 FontAwesome 从 805KB 裁到 13KB，把 CLS 压到 0.058，顺手修掉了导航高度、图片尺寸和移动端页脚。
cover: /images/cover-tech.jpg
series: blog-engineering
series_order: 3
---

博客的字体请求是 971KB。

其中 FontAwesome 占 805KB：solid 313KB、regular 386KB、brands 106KB。全站实际用到的图标，64 个码点。

文章页的首屏 CLS 是 0.486。TOC 在首屏之后才加类，正文宽度从 100% 跳到 `calc(100% - 210px)`。

这两个数字是这次体检的起点。

<!-- more -->

## 先量，再改

我写了两个探针：

- `test/perf-probe.js`：连续滚动 6 秒，记录帧间隔、长任务、布局和样式重算次数，支持 `PROBE_GPU=1`、`PROBE_NO_L2D=1` 对比。
- `test/vitals-check.js`：用 PerformanceObserver 收集 LCP 和 CLS，并记录每次 layout-shift 的元素。

CLS 的来源不是猜的。探针直接给出 `DIV.article-content.markdown-body` 的位移值。第一次跑，文章页 0.486。

## 字体：805KB 到 13KB

FontAwesome 的 CSS 里，每个图标都有一条 `.fa-name:before{content:"\fXXX"}`。我先扫描全站 HTML、JS 和主题模板，收集实际出现的 `fa-*` 类；再用 CSS 规则把类名映射到码点；最后用 fonttools 的 `pyftsubset` 从主题自带的 TTF 裁出三个子集：

| 字体 | 原始 | 子集 |
|------|------|------|
| solid | 313KB | 5.2KB |
| regular | 386KB | 6.8KB |
| brands | 106KB | 1.4KB |

在 `<head>` 末尾追加一组 `@font-face`，把 "Font Awesome 6 Pro" 和 "Brands" 指向子集文件。浏览器只下载子集，原来的 805KB 不再请求。

新增图标后跑 `npm run build:fonts` 重新生成。脚本会重新扫描全站、重算码点，不需要手改字体文件。

整页字体请求从 971KB 降到 179KB。

## 图片：补上尺寸和优先级

构建时加了一个 `after_render:html` 过滤器，用 `image-size` 读本地图片，给 `<img>` 补 `width`/`height`，并按位置分配加载策略：

- 首页 banner、文章头图：`loading="eager"` + `fetchpriority="high"`
- 其余图片：`loading="lazy"` + `decoding="async"`

站内图片在交付 HTML 里就带尺寸，只有空 src 的灯箱占位没有。不用等运行时再测量。

## CLS：两个具体来源

### TOC 的宽度跳变

主题在首屏之后才给 `.post-page-container` 加 `show-toc`，正文宽度从 100% 变成 `calc(100% - 210px)`，还有一个 0.2s 的 width 过渡。文章页的 0.486 主要来自这里。

处理方式是在 `<body>` 解析前插入一段很小的脚本，读 localStorage 里的 `isOpenPageAside`，给 `html` 加 `aside-open`；CSS 用 `html.aside-open` 提前按展开布局排版。主题之后再加 `show-toc`，宽度没有变化。

文章首屏 CLS：0.486 → 0.058。

### 导航栏的高度变量

主题滚动时把 `--navbar-height` 从 70px 改成 50.4px，正文跟着上移 20px。视觉收缩由自定义的胶囊动画负责，高度变量固定回 70px。

## 顺手修掉的几个布局问题

- 移动端页脚在 390px 下 `scrollWidth` 646px，链接被截断。改成可换行、隐藏次要项，小字颜色从 `--text-tertiary` 换成 `--text-secondary`。
- 桌面端移动抽屉以 `translateX(100%)` 挂在视口外，把 `/tags` 的 scrollWidth 撑到 2860px。桌面直接 `display:none`。
- 900px 以下不加载 Live2D，省掉 4.6MB 的模型和 Core。Live2D 的迁移过程写在[另一篇文章](/2026/10/21/live2d-cubism5-migration/)里。
- 移动端搜索/菜单补上键盘焦点，关闭的抽屉设 `inert`。

## 当时的数字（2026-10-22）

| 页面 | 首屏 CLS | LCP |
|------|---------|-----|
| 首页 | 0.077 | 1.1s |
| 文章 | 0.058 | 0.6s |
| 归档 | 0.092 | 0.4s |
| 关于 | 0.0002 | 0.6s |

测试由 33 项 E2E、26 项平滑度回归、当时 19 篇文章的内容检查构成。复测命令：

```bash
npm run test:vitals
npm run test:smooth
npm test
npm run test:content
```

现在字体请求是 179KB。新增图标时跑一次 `npm run build:fonts`，子集文件在 `source/fontawesome/webfonts/`。
