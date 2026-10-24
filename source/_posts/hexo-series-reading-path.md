---
title: 23 篇文章，15 篇在系列里：给博客加一条阅读路径
date: 2026-10-23 00:00:00
updated: 2026-10-24 21:30:00
categories:
  - 前端开发
tags:
  - Hexo
  - 博客
  - SEO
  - 可访问性
description: 23 篇文章里只有 15 篇能顺着读。给 Hexo 加一套构建期生成的系列阅读：front matter 约定、系列页、文章徽章、Atom 订阅和结构化数据，运行时不发一个请求。
cover: /images/cover-tech.webp
series: blog-engineering
series_order: 6
---

博客有 23 篇文章。其中 15 篇分属四个系列，剩下 8 篇是单篇。

问题出在读完一篇之后。读者看完《我做了一个 RAG 知识库系统》，不知道还有《MindPilot》和《DocMind 消融实验》；看完《博客左下角的大肥鱼》，也不知道后面还有一次字体子集和 CLS 的体检。分类回答“这是什么”，标签回答“涉及什么”，都不回答“下一篇读什么”。

系列要回答的只有这一件事。

## 先约定 front matter

系列信息写在文章头部，只有两个字段：

{% codeblock 文章 front matter lang:yaml mark:1 %}
series: blog-engineering   # 系列 slug,同系列共用
series_order: 6            # 可选,从 1 开始
{% endcodeblock %}

系列自己的显示名和简介放在 `source/_data/series.yml`：

```yaml
blog-engineering:
  name: 博客工程化
  description: 从选型、运行时迁移、性能体检到资源交付与系列阅读，把个人博客当成一个长期维护的工程。
```

规则有三条，都写在构建脚本里：

| 情况 | 行为 |
|---|---|
| 同系列全部文章都有 `series_order` | 按 order 升序 |
| 全部都没写 | 按日期升序 |
| 只写了一部分，或 order 重复 | 构建时警告，回退按日期 |

序号只影响阅读顺序，不参与 URL。文章地址仍然是日期路径，改系列顺序不会让旧链接失效。

少于 2 篇的系列不显示徽章和文末卡片。单篇文章不需要“第 1 篇 / 共 1 篇”这种信息。

## 构建期把该算的都算完

`scripts/series.js` 在 `hexo generate` 阶段做了四件事：

1. 扫描全部文章，按 slug 分组、排序，算出每篇的序号、上一篇、下一篇和系列总阅读时长。
2. 生成 `/series/` 总览页和 `/series/<slug>/` 系列页。
3. 在文章正文前插入系列徽章，在正文后插入系列卡：进度条、系列内上下篇、原生 `<details>` 折叠目录、当前项高亮。
4. 给每个系列生成 `/series/<slug>/atom.xml`，并在页面 `<head>` 里声明 feed。

| 产物 | 生成时机 | 运行时 |
|---|---|---|
| 系列页 / 系列总览 | `hexo generate` | 静态 HTML |
| 文章徽章 / 系列卡 | `after_render:html` | 静态 HTML |
| 折叠目录 | 构建期写入 `<details>` | 0 JS |
| Atom feed | generator | 静态 XML |
| 系列 URL 进 sitemap | `after_generate` | 静态 XML |

系列页长这样：

![博客工程化系列页：标题、阅读时长、编号列表和 RSS 入口](/images/series-page.webp)

现在可以直接打开[系列总览](/series/)或[博客工程化系列](/series/blog-engineering/)看实际效果。

没有前端请求，没有 `fetch`，也没有等接口回来再插入卡片。文章首屏 CLS 实测 0.0002[^cls]，系列卡不会把正文往下推。

## 订阅和结构化数据

每个系列页生成一份 Atom：

```
/series/blog-engineering/atom.xml
```

条目按发布日期倒序，标题、链接、摘要都来自文章 front matter。页面 `<head>` 里用 `<link rel="alternate" type="application/atom+xml">` 声明，阅读器可以直接订阅一个系列，而不是整站。

系列页还输出 `CollectionPage` JSON-LD，文章页输出 `BlogPosting` 和 `BreadcrumbList`。`sitemap.xml` 由主题插件生成，它只遍历文章和页面，不会自动收录 generator 产出的系列页；构建结束前把系列 URL 追加进去，否则这三类页面只能靠内链被发现。

## 系列不是分类

一个分类可以有几十篇文章，彼此没有先后。系列的前提是存在一条真实的阅读顺序。

判断标准很具体：如果读者跳过第 1 篇直接读第 2 篇，会不会缺一块上下文。会，才值得建系列。只是为了把标签收拢在一起，分类和标签已经够了。

按这个标准，后来又把闭包、React Hooks、CSS 布局组成了「前端基础三件套」，把量化平台和《同一个信号，0.45 和 -0.27》组成了「量化研究：从因子到执行」。剩下的单篇暂时不硬凑系列——等文章真的长到需要顺序的时候再建。

## 数字

- 23 篇文章，15 篇进入系列，8 篇单篇。
- 4 个系列：博客工程化 7 篇、Agent 与 RAG 3 篇、前端基础 3 篇、量化研究 2 篇。
- 系列相关浏览器检查 53 项，覆盖系列页、徽章、系列卡、Atom、归档入口、SPA 和移动端。
- 系列页和系列卡运行时 JS：0 行。

回到开头：8 篇单篇仍然没有阅读路径。系列没有解决所有文章的发现问题，它只解决了“确实存在顺序”的那 15 篇。剩下的，应该由相关阅读和站内链接去补。

这一轮之后，系列又长了一篇：[读完一篇长文，不该被打断](/2026/10/24/reading-experience-as-features/)。它接在《33MB 到 22MB》后面，讲的是阅读体验。

[^cls]: 本地 Chrome 1440×900，用 PerformanceObserver 统计 layout-shift，取页面加载后 5 秒内的累计值。
