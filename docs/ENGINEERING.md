# 工程说明：这个博客是怎么搭的

> 面向代码审阅者。记录架构、构建期流水线、性能与无障碍的测量方法，以及已经知道的边界。
> 更新日期：2026-10-23

## 1. 约束与目标

- **静态优先**：站点部署在 GitHub Pages，没有常驻服务端。所有内容增强必须在 `hexo generate` 阶段完成，运行时不能依赖接口。
- **内容先到**：站内跳转使用 Swup，但旧页退出动画被移除。点击后先替换内容，再播入场；首屏不为动画让路。
- **零 CLS 优先**：能构建期写入的 DOM（文章侧栏、系列徽章/系列卡、统计行、归档热力图）不在运行时插入。
- **可回归**：每个性能或交互约束都落成 Puppeteer 断言，而不是只写在文档里。

## 2. 目录与职责

```
scripts/                 构建期脚本（Hexo 启动时加载）
├── series.js            系列分组、系列页、徽章/系列卡、Atom、sitemap 追加
├── post-sidebar.js      文章右侧作者卡/标签/同分类/目录卡
├── markdown-route.js    /<path>/index.md 与 llms.txt
├── archive-heatmap.js   归档页内联 SVG 写作热力图
├── related-posts.js     相关阅读数据
├── seo-jsonld.js        BlogPosting / BreadcrumbList / WebSite / ProfilePage / CollectionPage
├── responsive-images.js 横幅 960/1280/1920 srcset
├── prepaint-toc.js      主题态预置、skip link、路由播报
├── a11y-fixes.js        装饰性图片 alt 兜底
├── skip-assets.js       移除 source map、未启用的 mermaid/waline、可选旧纹理
├── image-metadata.js    懒加载图片尺寸补全
└── theme-patch.js       对主题做可审计、可重复执行的最小补丁

source/js/custom.js      运行时交互：导航、搜索、目录、代码全屏、阅读记忆、无障碍
source/css/custom.css    设计系统与页面覆盖（约 3400 行）
source/css/series.css    系列阅读样式
test/                    11 套 Puppeteer / Node 检查
```

主题来自 npm 包 `hexo-theme-redefine@2.9.0`，没有复制进 `themes/`。`theme-patch.js` 在 postinstall 和 Hexo 启动时对 `node_modules` 打补丁；所有补丁都有标记检查，重复执行不会叠加。

## 3. 构建期流水线

一个文章页从 Markdown 到 HTML 会经过：

| 阶段 | 处理 | 产物 |
|---|---|---|
| `before_post_render` | 文风/链接检查在测试侧完成，不在构建期改正文 | — |
| `after_render:html` | 侧栏卡片、系列徽章/系列卡、JSON-LD、图片 alt/尺寸、srcset | 首屏完整 HTML |
| generator | 系列总览/系列页、每篇 `index.md`、`llms.txt` | 静态路由 |
| `after_generate` | 系列 URL 追加进 sitemap、移除 source map/未启用资源 | 部署产物 |

系列页是 generator 直接输出的 HTML；文章里的系列卡由字符串注入，注入锚点都有失败警告，主题升级导致类名变化时构建日志会明确指出，而不是静默丢功能。

### 为什么不使用前端方案

系列数据如果由前端 `fetch` 后再插入，会多一次请求，并且在数据回来之前文章卡不在 DOM 里，产生 CLS。构建期写入的代价是每次改系列都要重新 generate，这个博客的发布流程本来就是 generate + 部署，所以没有额外成本。

## 4. 性能

### 测量方法

- Puppeteer 打开页面，记录 `layout-shift`（排除 `hadRecentInput`）、LCP、long task、LoAF 和每帧间隔。
- SPA 跳转在 `visit:start` / `content:replace` / `visit:end` 打点，分别对应“点击到开始”“点击到内容替换”“点击到导航结束”。
- 滚动测试使用 GPU（ANGLE D3D11）和软件渲染（SwiftShader）各跑一遍，避免把测试机的 GPU 差异当成回归。

### 当前数字（本地 Chrome，1440×900，2026-10-23）

| 指标 | 数值 |
|---|---|
| 文章首屏 CLS | 0.0001 |
| 首页首屏 CLS | 0.002–0.004 |
| 点击 → 内容替换 | 15–43ms |
| 点击 → 导航结束 | 134–246ms |
| 首屏 long task | 冷启动约 180ms（字体 preload 后）；导航单次 120–190ms 来自 Swup 解析长文 HTML |
| 手机横幅（亮色） | 35KB / 960w（原图 63KB / 1920w） |
| Live2D 主纹理 | 308KB WebP（原 1.7MB PNG） |
| FontAwesome CSS | 65KB 类名子集（原 4 个文件约 200KB） |
| 移除的脚本 | moment 375KB（essays 页改用 Intl） |
| 部署产物 | 25MB（含 28 张 OG 卡；移除全量 webfonts / source map 后，原 33MB+） |

### 关键取舍

- **移除 Swup 退出动画**：旧流程先播 320ms 旧页退出，再替换 DOM，首跳 click→replace 实测 426ms。现在只播新页入场，代价是页面切换少了一层“退场”叙事，收益是内容快一个数量级到达。
- **滚动期间暂停 Live2D**：用 `scrollend` + 180ms 时间窗避免程序化滚动每帧触发 resume。
- **缓存文档高度**：主题的滚动进度/侧栏工具需要 `scrollHeight`，每帧读取会强制布局；改为 load/resize/fonts/换页后更新缓存，仅在接近页脚时读一次真实值。
- **APlayer 延迟**：12 秒后才加载，并设置 `preload: none`；2.5MB 的 mp3 不在首屏请求。页脚数字关闭 odometer 滚动动画，由主题 runtime 每秒直接写文本，避免一次约 300ms 的布局任务。
- **PNG 纹理仍部署**：WebP 已切换，但旧 `index.json` 可能被缓存 10 分钟；PNG 作为回退保留。设置 `CJ_SKIP_OLD_TEXTURES=1` 可移除。

## 5. 无障碍

目标不是“加几个 aria-label”，而是让键盘和读屏用户能完成主要路径：

- **地标**：`main` 只包正文，header/footer 回到 banner/contentinfo；导航容器有 navigation 角色。
- **搜索**：combobox + listbox，↑/↓/Home/End、Enter、`aria-activedescendant`、结果数量 live region、空结果文字；IME 组合期间不响应 Enter。
- **图片查看器**：图片可聚焦，Enter 打开，焦点进入关闭按钮，Esc 关闭后回到图片。
- **代码块**：复制/折叠按钮有 role、tabindex、名称和 Enter/Space。
- **目录**：桌面 TOC 当前项有 `aria-current="location"`；移动端使用原生 `<details>` 目录。
- **对比度**：浅色/深色/四季主题的次要文字统一到 WCAG AA 以上。

验证：axe-core 4.10 在桌面和移动端扫描首页、文章页、归档、系列总览、系列页、关于、项目、简历、404，WCAG A/AA 标签下 **0 条违规**。回归测试另覆盖标题唯一性、图片 alt、链接/按钮名称、列表语义、地标和 skip link。

## 6. 测试矩阵

| 套件 | 项数 | 覆盖 |
|---|---:|---|
| `test:transitions` | 44 | SPA 跳转、连点、前进后退、搜索焦点、路由播报、800px 导航 |
| `test:sidebar` | 38 | 侧栏卡片、进度环、锚点、表格、Markdown、代码全屏、面包屑、移动目录 |
| `test:series` | 53 | 系列页、徽章/系列卡、Atom、归档入口、SPA、移动端 |
| `test:assets` | 43 | 响应式横幅、WebP 纹理、sitemap/llms、JSON-LD、JSON Feed、图标子集、OG 元数据、APlayer |
| `test:a11y` | 64 | 名称、alt、列表语义、标题、地标、图片查看器键盘/双指缩放、脚注、项目/简历页 |
| `test:search` | 19 | combobox/listbox、方向键、Enter、空态、IME、SPA |
| `test:smooth` | 26 | 滚动、Live2D 暂停、reduced-motion、移动端溢出 |
| `test` | 33 | 端到端页面、主题切换、Live2D、次级页面 |
| `test:resume` | 7 | 阅读位置记忆与继续阅读 |
| `test:archive` | 12 | 归档热力图与移动端 |
| `test:content` | 22 篇 | front matter、站内链接、图片、文风硬规则 |

合计 338 项浏览器检查和 22 篇文章的内容检查。所有套件在本机通过；CI 目前只跑不依赖浏览器的 `test:content`。

## 7. 已知边界

- **Swup 解析成本**：首跳时如果用户没有 hover 预取，Swup 需要解析整篇长文 HTML，单次 long task 约 120–190ms。真实用户悬停链接会提前预取，测试里的程序化点击没有 hover 阶段。
- **全量字体仍在产物里**：FontAwesome 全量 webfonts 和主题库文件仍会部署，虽然页面只请求子集字体；彻底裁剪需要更细的资源清单。
- **mermaid/waline**：当前配置未启用，构建时移除；重新启用会自动保留对应文件。
- **图片查看器手势**：键盘、按钮、左右滑动和双指缩放已可用。
- **Live2D 工具菜单**：画布可点击/拖拽，工具栏已改为原生按钮并支持键盘；暂停/恢复状态还没有常驻的可见控件。
- **主题升级**：补丁目标是 2.9.0 的模板文本；版本已锁定，升级时需要重新核对 `theme-patch.js` 的标记。

## 8. 如果继续做

1. 用内容哈希替代手写字体/静态资源版本号，彻底消除缓存不一致。
2. 图片查看器补 Pointer Events 双指缩放。
3. 把 Live2D 的暂停/恢复做成常驻的可见控件。
4. 在 CI 里跑 `test:content` + 构建，浏览器套件留在本地或 self-hosted runner。
5. 在 Nginx / Cloudflare 给带哈希或版本号的静态资源加 `Cache-Control: immutable`，HTML 保持短缓存。
