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

- **7 篇原创技术文章** — 每篇从个人经历出发，不是教科书式教程
- **自定义 UI 设计** — 蓝色主题、磨砂导航栏、卡片浮动效果、阅读进度条
- **多个自定义页面** — 关于、友链、书签、说说、照片墙
- **完整的部署方案** — 宝塔面板 scp 上传 / GitHub Actions

---

## 功能特性

### 核心功能

| 功能 | 说明 | 对应文件 |
|------|------|----------|
| 文章系统 | Markdown 写作，分类、标签、目录、代码高亮 | `source/_posts/` |
| 响应式设计 | 桌面端和移动端自适应 | `source/css/custom.css` |
| 暗色模式 | 自动跟随系统 / 手动切换 | `_config.redefine.yml` |
| 本地搜索 | 全文搜索，支持中文 | `hexo-generator-searchdb` |
| 字数统计 | 显示字数和预估阅读时间 | `hexo-wordcount` |
| SPA 导航 | 页面无刷新切换，体验流畅 | `swup.js` |
| 阅读进度 | 顶部渐变进度条 | `source/js/custom.js` |
| RSS 订阅 | Atom 格式 | `hexo-generator-feed` |

### 自定义页面

| 页面 | 路径 | 数据文件 | 说明 |
|------|------|----------|------|
| 关于 | `/about/` | `source/about/index.md` | 个人介绍、编程观、技术栈 |
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
| 代码块 | macOS 风格、JetBrains Mono 字体 |
| 滚动条 | 自定义样式，兼容 WebKit + Firefox |
| 焦点样式 | 键盘导航可见焦点（无障碍） |

---

## 技术栈

| 组件 | 技术 | 版本 |
|------|------|------|
| 框架 | Hexo | 7.3.0 |
| 主题 | hexo-theme-redefine | 2.9.0 |
| 样式 | 自定义 CSS | 750+ 行 |
| 脚本 | 自定义 JS | 100+ 行 |
| CDN | jsDelivr | - |
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
git clone https://github.com/sterlingzeng/blogsterlingzeng.git
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

# 写作
hexo new "文章标题"          # 新建文章
hexo new draft "草稿标题"    # 新建草稿
hexo publish "草稿标题"      # 发布草稿为正式文章
hexo new page "页面名称"     # 新建页面

# 部署
npm run deploy              # 等同于 hexo clean && hexo generate
bash deploy.sh              # 构建并上传到服务器
```

---

## 项目结构

```
blogsterlingzeng/
│
├── source/                          # 源文件目录
│   ├── _posts/                      # 文章目录 (7 篇)
│   │   ├── hexo-blog-setup-guide.md
│   │   ├── javascript-closure-deep-dive.md
│   │   ├── react-hooks-guide.md
│   │   ├── git-workflow-best-practices.md
│   │   ├── docker-getting-started.md
│   │   ├── css-modern-layout.md
│   │   └── algorithm-binary-search.md
│   │
│   ├── _data/                       # 页面数据文件
│   │   ├── links.yml                # 友链数据
│   │   ├── essays.yml               # 说说数据
│   │   ├── bookmarks.yml            # 书签数据
│   │   └── masonry.yml              # 照片墙数据
│   │
│   ├── about/index.md               # 关于页面
│   ├── friends/index.md             # 友链页面
│   ├── bookmarks/index.md           # 书签页面
│   ├── shuoshuo/index.md            # 说说页面
│   ├── photos/index.md              # 照片墙页面
│   ├── categories/index.md          # 分类页面
│   ├── tags/index.md                # 标签页面
│   │
│   ├── css/custom.css               # 自定义样式 (750+ 行)
│   ├── js/custom.js                 # 自定义脚本
│   └── images/                      # 图片资源
│       ├── avatar.jpg               # 头像 (75KB)
│       ├── banner-light.jpg         # 亮色横幅 (466KB)
│       ├── banner-dark.jpg          # 暗色横幅 (475KB)
│       ├── og-banner.jpg            # 社交分享图 (118KB)
│       ├── cover-tech.jpg           # 文章封面 (53KB)
│       ├── cover-code.jpg           # 文章封面 (73KB)
│       ├── cover-design.jpg         # 文章封面 (122KB)
│       ├── cover-devops.jpg         # 文章封面 (26KB)
│       ├── cover-algorithm.jpg      # 文章封面 (33KB)
│       └── cover-git.jpg            # 文章封面 (84KB)
│
├── themes/                          # 主题目录
│   └── redefine/                    # Redefine 主题
│
├── _config.yml                      # Hexo 站点配置
├── _config.redefine.yml             # Redefine 主题配置 (360+ 行)
├── deploy.sh                        # 部署脚本 (scp)
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
language: zh-CN                         # 语言
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
  mode: auto               # 暗色模式: auto / light / dark
```

**首页横幅**
```yaml
home_banner:
  style: fixed             # 固定背景
  image:
    light: /images/banner-light.jpg
    dark: /images/banner-dark.jpg
  title: Sterling Zeng
  subtitle:
    hitokoto: true         # 启用一言 API 随机句子
  social_links:
    links:
      - icon: fa-brands fa-github
        url: https://github.com/sterlingzeng
```

**导航栏**
```yaml
navbar:
  links:
    - name: 首页
      url: /
    - name: 归档
      url: /archives/
    - name: 关于
      url: /about/
    - name: 友链
      url: /friends/
  search:
    enable: true           # 启用搜索
    preload: true          # 预加载搜索数据
```

**文章设置**
```yaml
articles:
  font_size: 16px
  line_height: 1.8
  word_count: true         # 显示字数
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
  runtime:
    enable: true           # 运行时间计数器
    start_time: "2026-04-11 16:36:59"  # 博客启动时间
```

**自定义注入**
```yaml
inject:
  head:
    - <link rel="stylesheet" href="/css/custom.css">
  bottom:
    - <script src="/js/custom.js" data-swup-reload-script></script>
```

---

## 文章列表

| 文章 | 文件 | 分类 | 核心观点 |
|------|------|------|----------|
| 我为什么选择 Hexo 搭博客 | `hexo-blog-setup-guide.md` | 开发工具 | 选型不是选最好的，是最适合的 |
| 我终于理解了闭包 | `javascript-closure-deep-dive.md` | 前端开发 | 闭包是函数式编程的自然结果 |
| React Hooks 的思维转变 | `react-hooks-guide.md` | 前端开发 | 组件是函数，不是对象 |
| Git 工作流的教训 | `git-workflow-best-practices.md` | 开发工具 | Git 的核心是协作 |
| Docker 改变了我对环境的理解 | `docker-getting-started.md` | 技术思考 | 环境是代码的一部分 |
| CSS 布局的三次革命 | `css-modern-layout.md` | 前端开发 | 从修补思维到设计思维 |
| 二分查找教会我的思维方式 | `algorithm-binary-search.md` | 算法与数据结构 | 排除一半，分治思考 |

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

## 部署指南

### 方式一：宝塔面板手动上传（最简单）

这是目前使用的方式。

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

1. 编辑 `deploy.sh`，确认服务器信息：
   ```bash
   SERVER_USER="root"
   SERVER_IP="120.55.163.198"          # 你的服务器 IP
   SERVER_DIR="/www/wwwroot/sterlingzeng.cn"
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

### 修改横幅图片

1. 把图片放到 `source/images/`
2. 修改 `_config.redefine.yml`:
   ```yaml
   home_banner:
     image:
       light: /images/你的亮色图.jpg
       dark: /images/你的暗色图.jpg
   ```
3. 推荐尺寸：1920x1080px，文件大小 500KB 以内

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
- class_name: 分类名
  class_desc: 分类描述
  link_list:
    - name: 博客名
      link: https://example.com
      avatar: /images/avatar.png
      descr: 一句话描述
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

### 启用评论系统

需要额外部署评论服务器。推荐方案：

1. **Waline** — 需要部署 Vercel/LeanCloud 服务
2. **Twikoo** — 需要部署腾讯云/Netlify 服务
3. **Giscus** — 基于 GitHub Discussions，免费

在 `_config.redefine.yml` 中配置：

```yaml
comment:
  enable: true
  system: waline   # 或 twikoo / giscus
  config:
    server_url: https://你的评论服务地址
```

### 启用分析统计

推荐自托管方案（免费、无追踪）：

- **Umami** — 轻量、界面美观
- **Plausible** — 注重隐私

在 `_config.redefine.yml` 中配置，或在 `custom.js` 中手动添加统计代码。

---

## 已知问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 推荐系统不工作 | 依赖 `nodejieba`，Windows 编译失败 | 已禁用；Linux 服务器上可启用 |
| 评论系统未配置 | 需要额外部署评论服务 | 参见"启用评论系统"章节 |
| 分析统计未配置 | Google Analytics 已禁用 | 参见"启用分析统计"章节 |

---

## 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

---

## 联系方式

- **GitHub**: [github.com/sterlingzeng](https://github.com/sterlingzeng)
- **Email**: sterlingzeng@163.com
- **Blog**: [sterlingzeng.cn](https://sterlingzeng.cn)
