# Sterling Zeng 的个人博客

> Keep Rolling, Keep Coding.

基于 **Hexo 7** + **Redefine** 主题的个人技术博客。

**线上地址**: [https://sterlingzeng.cn](https://sterlingzeng.cn)

---

## 目录

- [项目简介](#项目简介)
- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [配置说明](#配置说明)
- [文章列表](#文章列表)
- [写作指南](#写作指南)
- [部署指南](#部署指南)
- [自定义指南](#自定义指南)
- [已知问题](#已知问题)
- [许可证](#许可证)

---

## 项目简介

这是一个完整的技术博客项目，不是简单的 Hexo 模板。包含：

- **22 篇原创技术文章** — 每篇从个人经历出发，不是教科书式教程
- **自定义 UI 设计** — 蓝色主题、磨砂导航栏、卡片浮动效果、阅读进度条
- **多个自定义页面** — 关于、友链、书签、说说、照片墙、项目
- **完整的部署方案** — 宝塔面板 scp 上传 / GitHub Actions

---

## 功能特性

### 核心功能

| 功能 | 说明 | 对应文件 |
|------|------|----------|
| 文章系统 | Markdown 写作，分类、标签、目录、代码高亮 | `source/_posts/` |
| 响应式设计 | 桌面端和移动端自适应 | `source/css/custom.css` |
| 暗色模式 | 自动跟随系统 / 手动切换 | `_config.redefine.yml` |
| 本地搜索 | 全文搜索，支持中文；索引覆盖文章与关于/项目/简历等页面 | `hexo-generator-searchdb` |
| 字数统计 | 显示字数和预估阅读时间 | `hexo-wordcount` |
| SPA 导航 | 页面无刷新切换，体验流畅 | `swup.js` |
| 阅读进度 | 顶部渐变进度条 | `source/js/custom.js` |
| RSS 订阅 | Atom 格式 + 页脚订阅图标 | `hexo-generator-feed` |
| JSON Feed | 站点与系列级 `feed.json`，全文 HTML + 绝对 URL | `scripts/json-feed.js` |
| 分享卡片 | 每篇文章 / 系列 / 页面生成 1200×630 OG 图 | `tools/gen-og-images.js` |
| 简历页 | 一页式 HTML 简历，可打印 / 存 PDF | `source/resume/` |
| 复制 Markdown | 侧栏一键复制文章 Markdown 原文 | `scripts/post-sidebar.js` |
| 脚注 | `[^id]` 语法，构建期生成 doc-noteref / doc-endnotes | `scripts/footnotes.js` |
| 首页入口 | 项目 / 简历 / 系列三张快速卡片，构建期插入 | `scripts/home-start.js` |
| 项目架构图 | MiQroGate / DocMind 内联 SVG，跟随主题配色，移动端可横向滚动 | `source/projects/index.md` |
| 相关阅读 | 标签相似度推荐（前端渲染，无原生依赖） | `scripts/related-posts.js` |
| 文章置顶 | `sticky: 1` 字段置顶 | `hexo-generator-index` |
| Sitemap | `sitemap.xml` + `robots.txt` | `hexo-generator-sitemap` |
| 复制链接 | 文章页工具条复制当前链接 | `source/js/custom.js` |
| Live2D 宠物 | DeepSeek 大肥鱼（Cubism 4.2 模型 / Cubism 5 Core 运行时，8 动作 / 44 表情） | `source/live2d/` |
| 文章侧栏 | 作者卡 + 阅读进度环 + 标签 + 同分类 + 目录卡片（构建期渲染，无 CLS） | `scripts/post-sidebar.js` |
| 系列文章 | `series` / `series_order` 声明，构建期生成系列总览、系列页与 Atom 订阅；文章内显示进度徽章、系列内上下篇、折叠目录（0 运行时 JS） | `scripts/series.js` |
| 响应式横幅 | 960 / 1280 / 1920 三档 WebP srcset，手机按 DPR 自动选图 | `scripts/responsive-images.js` |
| 轻量模型纹理 | Live2D 主纹理重采样为 1024 WebP，1.7MB → 308KB | `source/live2d/model/ds-whale-girl/` |
| 404 页面 | 自定义 404 + 快捷搜索入口（Ctrl K / 斜杠） | `source/404.md` |
| 阅读体验 | 阅读位置记忆 + “继续阅读”胶囊、标题锚点复制、宽表格横向滚动 | `source/js/custom.js` |
| 开放内容 | 每篇文章生成 `index.md` 原文，站点级 `llms.txt` 索引 | `scripts/markdown-route.js` |
| 归档页 | 构建期写作足迹热力图（内联 SVG，零运行时） | `scripts/archive-heatmap.js` |
| SEO | 每篇文章 BlogPosting + BreadcrumbList JSON-LD、canonical 保留大小写、每篇独立描述 | `scripts/seo-jsonld.js` |
| 代码块 | 全屏专注查看（Esc / 点背景退出），保留复制与折叠；行号可复制 `#cb1-L3` 永久链接 | `source/js/custom.js` |

### 自定义页面

| 页面 | 路径 | 数据文件 | 说明 |
|------|------|----------|------|
| 关于 | `/about/` | `source/about/index.md` | 个人介绍、编程观、技术栈 |
| 项目 | `/projects/` | GitHub API 实时拉取 | 主要仓库展示，带 1 小时本地缓存 |
| 友链 | `/friends/` | `source/_data/links.yml` | 博客友链，分"技术博客"和"工具社区" |
| 书签 | `/bookmarks/` | `source/_data/bookmarks.yml` | 常用工具和资源收藏 |
| 说说 | `/shuoshuo/` | `source/_data/essays.yml` | 碎片化想法和日常感悟 |
| 照片墙 | `/photos/` | `source/_data/masonry.yml` | Masonry 瀑布流图片 |
| 分类 | `/categories/` | 自动生成 | 按文章分类浏览 |
| 标签 | `/tags/` | 自动生成 | 按标签浏览 |

### UI 定制

| 特性 | 说明 |
|------|------|
| 蓝色主题 | 主色调 `#2563eb`，全套 CSS 变量 |
| 磨砂导航栏 | `backdrop-filter: blur(16px)` |
| 文章卡片 | 圆角、悬浮上移、边框高亮 |
| 标题装饰 | 左侧渐变色条 |
| 链接动画 | 悬浮时下划线展开 |
| 字体加载 | 首屏标题/正文字体 woff2 preload，避免 swap 后的整页重排 | `scripts/font-preload.js` |
| 代码块 | macOS 风格、JetBrains Mono 字体 |
| 滚动条 | 自定义样式，兼容 WebKit + Firefox |
| 焦点样式 | 键盘导航可见焦点（无障碍） |

---

## 工程亮点

这个博客不只是“能打开”，每个改动都有可复现的测量和回归测试（本地 Chrome 实测，数字会随机器和网络波动）：

| 指标 | 结果 | 做法 |
|------|------|------|
| 文章首屏 CLS | **0.0002**（修复前 0.061） | 统计行、系列卡、侧栏全部构建期渲染，运行时只改文本 |
| 首页首屏 CLS | **~0.002**（修复前 0.074） | 导航控件先占位、横幅尺寸预置、字体子集 |
| SPA 点击 → 内容替换 | **~15ms**（首跳曾 426ms） | 去掉旧页退出动画，内容先到，再播入场 |
| SPA 整次导航 | **~134ms** | Swup 只替换 `#swup`，滚动即时归零 |
| Live2D 主纹理 | **1.7MB → 308KB** | 2048 PNG 重采样为 1024 WebP |
| 手机首屏横幅 | **63KB → 35KB**（亮色） | 960/1280/1920 srcset + DPR 选图 |
| 自动化浏览器检查 | **280+ 项** | 跳转、侧栏、系列、阅读记忆、归档、平滑度、资源、内容 |

**构建期优先**：系列页、写作热力图、文章侧栏、JSON-LD、Markdown 原文、llms.txt 全部在 `hexo generate` 阶段生成，运行时不发额外请求、不引入布局抖动。主题通过 `scripts/theme-patch.js` 做可审计的最小补丁（Swup、TOC、搜索防抖、APlayer 延迟加载等），补丁可重复执行。

更完整的架构、测量方法和已知边界见 [docs/ENGINEERING.md](docs/ENGINEERING.md)；下一轮可以继续做的方向见 [docs/BACKLOG.md](docs/BACKLOG.md)。

---

## 技术栈

| 组件 | 技术 | 版本 |
|------|------|------|
| 框架 | Hexo | 7.3.0 |
| 主题 | hexo-theme-redefine | 2.9.0 |
| 样式 | 自定义 CSS | ~3400 行 |
| 脚本 | 自定义 JS | ~1600 行 |
| 静态资源 | 本地自托管 | - |
| 搜索 | hexo-generator-searchdb | - |
| 字数 | hexo-wordcount | - |
| RSS | hexo-generator-feed | - |

---

## 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

### 安装

```bash
# 克隆仓库
git clone https://github.com/sijie-Z/blogsterlingzeng.git
cd blogsterlingzeng

# 安装依赖
npm install

# 本地预览
npm run server
```

访问 `http://localhost:4000` 查看效果。

### 常用命令

```bash
# 本地预览
npm run server              # 启动本地服务器 (localhost:4000)

# 构建
npm run build               # 生成静态文件到 public/
npm run clean               # 清理缓存和构建产物

# 本地预览(静态构建,比 hexo server 轻)
npm run serve               # http://127.0.0.1:4140

# 测试(需要 puppeteer-core 与本机 Chrome)
npm test                    # 33 项端到端检查(含 8 个次级页面)
npm run test:l2d            # Live2D 加载诊断(模型 / Core / 404)
npm run test:smooth         # 26 项滚动与动效平滑度回归
npm run test:content        # 文章 front matter / 站内链接 / 图片 / OG 卡 / 文风检查
npm run test:links          # 构建产物内链检查（127 个 HTML）
npm run test:transitions    # 44 项 SPA 跳转 / 连点 / 前后退 / 搜索焦点 / 路由播报
npm run test:sidebar        # 38 项文章侧栏 / 进度 / 锚点 / 表格 / 面包屑 / 代码全屏
npm run test:series         # 53 项系列页 / 徽章 / 系列卡 / SPA / 移动端
npm run test:assets         # 43 项响应式横幅 / WebP 纹理 / JSON Feed / 图标子集 / JSON-LD
npm run test:search         # 19 项搜索 combobox / 方向键 / Enter / 空态 / IME
npm run test:a11y           # 64 项无障碍:名称 / alt / 列表语义 / 标题 / 地标 / 脚注
npm run test:resume         # 7 项阅读位置记忆与“继续阅读”
npm run test:archive        # 12 项归档写作热力图与移动端
npm run profile:nav         # 第一次跳转的 CPU 采样诊断
npm run perf                # 滚动性能探针(帧间隔 / 长任务 / 布局)
npm run test:vitals         # CLS / LCP 与最大位移来源
npm run build:fonts         # 新增 FontAwesome 图标后重新生成字体子集

# 写作
hexo new "文章标题"          # 新建文章
hexo new draft "草稿标题"    # 新建草稿
hexo publish "草稿标题"      # 发布草稿为正式文章
hexo new page "页面名称"     # 新建页面

# 部署
npm run deploy              # 等同于 bash deploy.sh(clean + build + scp 上传)
npm run clean && npm run build  # 只本地构建
bash deploy.sh              # 构建并上传到服务器
```

---

## 项目结构

```
blogsterlingzeng/
│
├── source/                          # 源文件目录
│   ├── _posts/                      # 文章目录 (22 篇)
│   │
│   ├── _data/                       # 页面数据文件
│   │   ├── links.yml                # 友链数据
│   │   ├── essays.yml               # 说说数据
│   │   ├── bookmarks.yml            # 书签数据
│   │   ├── masonry.yml              # 照片墙数据
│   │   └── series.yml               # 系列文章元数据
│   │
│   ├── about/index.md               # 关于页面
│   ├── projects/index.md            # 项目页面（GitHub API 展示）
│   ├── friends/index.md             # 友链页面
│   ├── bookmarks/index.md           # 书签页面
│   ├── shuoshuo/index.md            # 说说页面
│   ├── photos/index.md              # 照片墙页面
│   ├── resume/index.md              # 一页式简历（可打印）
│   ├── categories/index.md          # 分类页面
│   ├── tags/index.md                # 标签页面
│   ├── robots.txt                   # 爬虫规则
│   ├── 404.md                       # 自定义 404
│   │
│   ├── css/custom.css               # 自定义样式 (~3900 行)
│   ├── css/series.css               # 系列阅读样式
│   ├── js/custom.js                 # 自定义脚本 (~2400 行)
│   ├── live2d/                      # Live2D 组件 + DeepSeek 大肥鱼模型
│   ├── fontawesome/webfonts/        # FontAwesome 子集字体
│   └── images/                      # 图片资源
│       ├── avatar.jpg               # 头像 (75KB)
│       ├── banner-light.webp        # 太空站横幅（亮色/太空站模式）
│       ├── banner-dark.webp         # 赛博雨夜横幅（暗色）
│       ├── banner-spring.webp       # 春季横幅
│       ├── banner-summer.webp       # 夏季横幅
│       ├── banner-autumn.webp       # 秋季横幅
│       ├── banner-winter.webp       # 冬季横幅
│       ├── og-banner.jpg            # 社交分享图 (118KB)
│       ├── og/                      # 每篇文章/系列/页面的 1200×630 OG 卡
│       ├── cover-tech.jpg           # 文章封面 (53KB)
│       ├── cover-code.jpg           # 文章封面 (73KB)
│       ├── cover-design.jpg         # 文章封面 (122KB)
│       ├── cover-devops.jpg         # 文章封面 (26KB)
│       ├── cover-algorithm.jpg      # 文章封面 (33KB)
│       └── cover-git.jpg            # 文章封面 (84KB)
│
├── node_modules/hexo-theme-redefine/ # Redefine 主题(npm 安装,postinstall 打补丁)
├── scripts/                          # 构建期脚本(系列/侧栏/热力图/SEO)
├── tools/                            # 非构建期工具(OG 分享卡生成)
├── docs/                             # 运维与部署文档
│
├── _config.yml                      # Hexo 站点配置
├── _config.redefine.yml             # Redefine 主题配置 (360+ 行)
├── deploy.sh                        # 部署脚本 (scp)
├── test/                            # E2E / Live2D 调试脚本
├── package.json                     # 项目依赖
├── LICENSE                          # MIT License
└── README.md                        # 本文档
```

### 关键配置文件说明

| 文件 | 作用 | 优先级 |
|------|------|--------|
| `_config.yml` | Hexo 站点配置（URL、语言、插件） | 根配置 |
| `_config.redefine.yml` | 主题配置（颜色、导航、横幅、文章设置） | 覆盖主题默认 |
| `source/css/custom.css` | 自定义样式 | 注入到 `<head>` |
| `source/js/custom.js` | 自定义脚本 | 注入到 `</body>` 前 |
| `source/_data/*.yml` | 页面数据 | 被对应页面读取 |

---

## 配置说明

### 站点配置 `_config.yml`

```yaml
title: Sterling Zeng                    # 站点标题
subtitle: Keep Rolling, Keep Coding     # 副标题
description: 个人技术博客                  # 站点描述
author: Sterling Zeng                   # 作者
language: [zh-CN, en]                   # 语言
url: https://sterlingzeng.cn            # 站点 URL
theme: redefine                         # 主题
per_page: 10                            # 每页文章数
post_asset_folder: true                 # 文章资源文件夹
```

### 主题配置 `_config.redefine.yml`

这是博客的核心配置文件，控制几乎所有视觉和功能。主要部分：

**颜色**
```yaml
colors:
  primary: "#2563eb"       # 主色调 (蓝色)
  secondary: "#3b82f6"     # 辅助色
  default_mode: auto       # 暗色模式: auto / light / dark
```

**首页横幅**
```yaml
home_banner:
  style: fixed             # 固定背景
  image:
    light: /images/banner-light.webp
    dark: /images/banner-dark.webp
  title: Sterling's Space
  subtitle:
    text: ["用代码构建世界，用文字记录成长", "在这里，技术和思考相遇"]
    hitokoto:
      enable: false        # 一言 API 开关
  social_links:
    links:
      - name: GitHub
        icon: fa-brands fa-github
        url: https://github.com/sijie-Z
```

**导航栏**
```yaml
navbar:
  links:
    Home:
      path: /
      icon: fa-regular fa-house
    项目:
      path: /projects
      icon: fa-brands fa-github
    归档:
      path: /archives
      icon: fa-regular fa-archive
    系列:
      path: /series
      icon: fa-solid fa-layer-group
  search:
    enable: true           # 启用搜索
    preload: true          # 预加载搜索数据
```

**文章设置**
```yaml
articles:
  style:
    font_size: 16px
    line_height: 1.8
  word_count:
    enable: true           # 显示字数
  code_block:
    copy: true             # 代码复制按钮
    style: mac             # macOS 风格
    font: JetBrains Mono   # 代码字体
  toc:
    enable: true           # 目录
    depth: 4               # 目录深度
  copyright:
    enable: true
    default: cc_by_nc_sa   # CC BY-NC-SA 协议
```

**页脚**
```yaml
footer:
  runtime: true            # 运行时间计数器
  start: "2026/04/11 16:36:59"  # 博客启动时间
```

**自定义注入**
```yaml
inject:
  head:
    - <link rel="stylesheet" href="/css/custom.css">
  footer:
    - <script src="/js/custom.js" data-swup-reload-script></script>
```

---

## 文章列表

| 文章 | 文件 | 分类 | 核心观点 |
|------|------|------|----------|
| 从 971KB 到 179KB | `font-subset-and-cls.md` | 前端开发 | 字体子集化、图片尺寸与首屏 CLS 的工程化处理 |
| 博客左下角的大肥鱼 | `live2d-cubism5-migration.md` | 项目实战 | 从 Cubism 2 运行时到 Cubism 5 Core：换模型顺带修掉 Swup 重复执行、监听器叠加与中文锚点 |
| 把 API Key 关进网关 | `miqro-gate-virtual-key-design.md` | 项目实战 | 凭证虚拟化：把真实 Key 变成可轮换、吊销、计量的 Virtual Key |
| 同一个信号,0.45 和 -0.27 | `quant-reversal-execution-gap.md` | 项目实战 | 信号存在不等于策略可投资：执行吃掉了 Alpha |
| 我的 CI 从来没有跑过 | `nft-launchpad-release-sprint.md` | 项目实战 | 发布前用 16 个 issue 还工程债，把"我不知道"变成"我知道" |
| 用四 GB 显存训练语言模型 | `nlp-training-lab.md` | 学习笔记 | 从 BERT 到 LoRA，4GB 显卡也能玩大模型 |
| 四个假设，否了两个 | `docmind-agent-causal-study.md` | 项目实战 | 规划粒度决定 Agent 性能（L1 评测点覆盖率 69%→93.1%），执行架构没那么重要 |
| 我为什么选择 Hexo 搭博客 | `hexo-blog-setup-guide.md` | 技术思考 | 选型不是选最好的，是最适合的 |
| 我终于理解了闭包 | `javascript-closure-deep-dive.md` | 前端开发 | 闭包是函数式编程的自然结果 |
| React Hooks 的思维转变 | `react-hooks-guide.md` | 前端开发 | 组件是函数，不是对象 |
| Git 工作流的教训 | `git-workflow-best-practices.md` | 开发工具 | Git 的核心是协作 |
| Docker 改变了我对环境的理解 | `docker-getting-started.md` | 技术思考 | 环境是代码的一部分 |
| CSS 布局的三次革命 | `css-modern-layout.md` | 前端开发 | 从修补思维到设计思维 |
| 二分查找教会我的思维方式 | `algorithm-binary-search.md` | 算法与数据结构 | 排除一半，分治思考 |
| 我做了一个 RAG 知识库系统 | `docmind-rag-knowledge-base.md` | 项目实战 | RAG 的核心不是大模型，是检索 |
| MindPilot 多 Agent 协作 | `mindpilot-multi-agent-rag.md` | 项目实战 | 把大任务拆成小任务，交给专门 Agent |
| 空间数据安全分发与溯源 | `geodata-security-traceability.md` | 项目实战 | 矢量数据分发后的溯源定责 |
| 从零搭建 NFT 发行平台 | `nft-launchpad-kit-web3.md` | 项目实战 | 6 种铸造模式的全链路实践 |
| A 股量化研究平台 | `quant-platform-a-share-research.md` | 项目实战 | 从因子到回测的完整流水线 |
| 22 篇文章，9 篇在系列里 | `hexo-series-reading-path.md` | 前端开发 | 用 front matter、generator 和 Atom 把有顺序的文章串成系列 |
| 按显示尺寸交付 | `responsive-banner-live2d-texture.md` | 前端开发 | 横幅 srcset 与 Live2D 纹理按实际显示尺寸交付 |
| 33MB 到 25MB | `static-assets-cleanup.md` | 前端开发 | 图标子集、moment 移除、长任务清理，以及一次被测量否决的 View Transition |

### 文章 Front Matter 格式

```yaml
---
title: 文章标题
date: 2026-05-08 10:00:00
categories:
  - 分类名
tags:
  - 标签1
  - 标签2
description: 一句话描述，显示在文章列表
cover: /images/cover.jpg
---
```

- `title` — 文章标题
- `date` — 发布日期，影响排序和 URL
- `categories` — 分类（只能一个）
- `tags` — 标签（可以多个）
- `description` — 摘要，显示在首页卡片
- `cover` — 封面图路径（可选）

在 `<!-- more -->` 之前的内容会作为摘要显示在文章列表。

---

## 写作风格指南

本博客文章采用"孙学"写作风格（参考 [sun-style-writing](https://github.com/KKKKhazix/sun-style-writing) 与 [jingtian-style](https://github.com/anhao/jingtian-style)）。核心原则：**白描打底，数字锚定，克制叙事。**

### 必做

- 开头三句话内建立反差/悬念，用场景或数字，不用"本文介绍"式开场
- 数字代替形容词：用"五十个账号"代替"很多人"，用"0.45 到 -0.27"代替"差距很大"
- 短句为主，段落群厚实；一个场景展开到能闻到味道再离开
- 结尾回扣开头的意象或数字，禁止总结升华
- 项目文章的叙事部分（起因、踩坑、决策）用白描，技术讲解保持清晰

### 必禁

- 感叹号（全文零感叹号）
- 情绪形容词："震撼""激动""痛苦""欣喜"
- 金句升华："这件事教会了我……""这就是编程的意义"
- 四字成语抒情、排比抒情、"仿佛""好像"用于情感比喻
- 省略号煽情（用句号代替）

### 检查清单（完稿后过一遍）

1. 正文零感叹号？
2. 数字是否来自真实材料（不编造精确感）？
3. 有没有直接描述情绪的句子？（有就改成动作/细节）
4. 结尾有没有被当成人生道理？（有就重写）
5. 开头三句话能不能勾住人？

---

## 部署指南

> **当前架构**:域名(阿里云)→ Cloudflare(DNS/HTTPS/CDN)→ GitHub Pages(内容)。
> 完整运维手册见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)——包含账号位置、DNS 现状、日常操作速查。
> 日常发布 = 写文章 + git push,自动部署。

### 方式一：宝塔面板手动上传（最简单）

这是早期使用的方式(现已被 GitHub Actions 自动部署取代)。

**步骤：**

1. 本地构建：
   ```bash
   npm run clean && npm run build
   ```

2. 打开宝塔面板网页（`http://你的服务器IP:8888`）

3. 左侧点击「文件」

4. 进入 `/www/wwwroot/sterlingzeng.cn/`

5. 把本地 `public/` 文件夹里的**所有内容**拖进去覆盖

6. 浏览器访问 `https://sterlingzeng.cn` 验证

**注意事项：**
- 上传前先清空服务器上的旧文件，避免残留
- 确保宝塔面板已创建网站，根目录指向 `/www/wwwroot/sterlingzeng.cn`
- 如果用了 HTTPS，在宝塔面板的网站设置中配置 SSL

### 方式二：自动部署脚本

`deploy.sh` 使用 scp 自动构建和上传。

**步骤：**

1. 服务器地址通过环境变量传入，不写进仓库：
   ```bash
   export DEPLOY_HOST="YOUR_SERVER_IP"
   export DEPLOY_USER="root"           # 可选，默认 root
   ```

2. 在 Git Bash 中运行：
   ```bash
   bash deploy.sh
   ```

3. 输入服务器 root 密码（输入时屏幕不显示）

4. 等待上传完成

**前提条件：**
- 服务器 SSH 开放密码登录（阿里云默认可能只允许密钥）
- 本地安装了 Git for Windows（自带 scp）
- 服务器已创建网站目录

**如果 SSH 被拒绝：** 阿里云部分镜像默认禁止 root 密码登录，需要用密钥或改用方式一。

### 方式三：GitHub Actions

在 `.github/workflows/deploy.yml` 中配置。推送到 `main` 分支自动触发构建和部署。

### 方式四：Vercel

1. 在 [vercel.com](https://vercel.com) 导入项目
2. Framework: Hexo
3. Build: `hexo generate`
4. Output: `public`

---

## 自定义指南

### 修改颜色

修改两处（保持一致）：

1. `_config.redefine.yml`:
   ```yaml
   colors:
     primary: "#你的颜色"
     secondary: "#你的辅助色"
   ```

2. `source/css/custom.css`:
   ```css
   :root {
     --primary-color: #你的颜色;
     --primary-color-light: #你的辅助色;
   }
   ```
3. 四季主题在 `custom.css` 的 `html[data-season="spring|summer|autumn|winter"]`
   与 `html.dark[data-season=...]` 块中还有各自的 `--primary-color`，需要一起改。

### 修改横幅图片

1. 把图片放到 `source/images/`，建议转成 WebP
2. 修改 `_config.redefine.yml`:
   ```yaml
   home_banner:
     image:
       light: /images/你的亮色图.webp
       dark: /images/你的暗色图.webp
   ```
3. 推荐尺寸：1920x1080px，文件大小 500KB 以内
4. 四季与太空站模式在 `source/js/custom.js` 的 `SEASON_BANNERS` 中配置，导航栏 🍀 菜单可切换

### 修改头像

1. 替换 `source/images/avatar.jpg`
2. 推荐尺寸：300x300px 正方形

### 添加文章

```bash
hexo new "新文章标题"
```

编辑 `source/_posts/新文章标题.md`。封面图放到 `source/images/`，在 front matter 中引用。

### 修改友链

编辑 `source/_data/links.yml`：

```yaml
- links_category: 分类名
  has_thumbnail: false
  list:
    - name: 博客名
      link: https://example.com
      avatar: /images/avatar.png
      description: 一句话描述
```

### 修改书签

编辑 `source/_data/bookmarks.yml`。

### 修改说说

编辑 `source/_data/essays.yml`：

```yaml
- date: "2026-05-08"
  content: "你的想法内容"
```

### 修改关于页面

编辑 `source/about/index.md`，用 Markdown 写。

### 修改导航栏

编辑 `_config.redefine.yml` 中的 `navbar.links`。

### 评论系统

当前使用 **Giscus**(基于 GitHub Discussions),无需自建服务器。
在 `_config.redefine.yml` 的 `comment.config.giscus` 中填入仓库、分类与
`repoId` / `categoryId` 即可；Waline / Twikoo 仍可在 `comment.system` 中切换,
但需要额外部署服务。

### 启用分析统计

推荐自托管方案（免费、无追踪）：

- **Umami** — 轻量、界面美观
- **Plausible** — 注重隐私

在 `_config.redefine.yml` 中配置，或在 `custom.js` 中手动添加统计代码。

---

## 已知问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| ~~推荐系统不工作~~ | ~~依赖 `nodejieba`，Windows 编译失败~~ | 已用 `scripts/related-posts.js` 生成数据 + 前端渲染替代 |
| ~~页脚统计信息~~ | ~~vercount / 主题模板强制渲染~~ | 已关闭统计；"Powered by Hexo / Theme" 已通过 postinstall patch 从模板删除 |
| ~~HTTPS 证书签发慢~~ | GitHub Pages 自定义域名证书排队 | 已切换 Cloudflare，证书正常 |

---

## 许可证

本站自有代码与内容采用 [MIT License](LICENSE)。第三方组件的许可见
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)：Live2D 组件为 GPL-3.0-or-later，
DeepSeek 大肥鱼模型为 CC BY-NC-SA 4.0，Live2D Cubism Core 为 Live2D Inc. 专有软件。

---

## 联系方式

- **GitHub**: [github.com/sijie-Z](https://github.com/sijie-Z)
- **Email**: 1683039482@qq.com（优先）/ 19150649985@163.com（备用）
- **QQ**: 1683039482
- **Blog**: [sterlingzeng.cn](https://sterlingzeng.cn)
