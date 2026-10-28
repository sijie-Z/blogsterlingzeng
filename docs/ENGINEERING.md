# 工程说明：这个博客是怎么搭的

> 面向代码审阅者。记录架构、构建期流水线、性能与无障碍的测量方法，以及已经知道的边界。
> 更新日期：2026-10-25

## 1. 约束与目标

- **静态优先**：站点部署在 GitHub Pages，没有常驻服务端。所有内容增强必须在 `hexo generate` 阶段完成，运行时不能依赖接口。
- **内容先到**：站内跳转使用 Swup，但旧页退出动画被移除。点击后先替换内容，再播入场；首屏不为动画让路。
- **零 CLS 优先**：能构建期写入的 DOM（文章侧栏、系列徽章/系列卡、统计行、归档热力图）不在运行时插入。
- **可回归**：每个性能或交互约束都落成 Puppeteer 断言，而不是只写在文档里。

## 2. 目录与职责

```
scripts/                 构建期脚本（Hexo 启动时加载）
├── series.js            系列分组、系列页、徽章/系列卡、Atom、sitemap 追加
├── post-sidebar.js      文章右侧作者卡/阅读设置/标签/同分类；文章页 data-cj-post 标记
├── marginnote.js        {% margin %} 边注：宽屏页边，窄屏底部卡片
├── link-preview.js      站内链接预览数据 link-preview.json
├── citation.js          citation_* 元数据 + 引用菜单 JSON
├── backlinks.js         扫描正文内链，生成“引用本文的文章”
├── post-nav.js          文末更早/更新一篇 + head rel=prev/next
├── recent-posts.js      404 页最近文章
├── redirects.js         文章迁移后的旧地址：保留跳转页，从 sitemap/搜索索引移除
├── math.js              $...$ / $$...$$ 构建期 KaTeX MathML + 复制按钮
├── footnotes.js         [^id] 脚注：doc-noteref / doc-endnotes
├── markdown-route.js    /<path>/index.md 与 llms.txt
├── archive-heatmap.js   归档页页头、内联 SVG 热力图、条目分类/阅读时间
├── taxonomy-pages.js    标签/分类页引导语与按使用次数排序
├── essays-page.js       说说页去重 id、构建期写入日期
├── photos-page.js       站点视觉页导语与 <noscript> 静态图集
├── related-posts.js     相关阅读数据
├── seo-jsonld.js        BlogPosting / BreadcrumbList / WebSite / ProfilePage / CollectionPage
├── responsive-images.js 横幅 960/1280/1920 srcset
├── prepaint-toc.js      主题态预置、skip link、路由播报
├── public-contact.js    主动公开邮箱的 Cloudflare email_off 边界
├── footer-layout.js     页脚主信息与次级入口的构建期分行
├── a11y-fixes.js        装饰性图片 alt 兜底
├── skip-assets.js       移除 source map、未启用的 mermaid/waline、可选旧纹理
├── image-metadata.js    懒加载图片尺寸补全
└── theme-patch.js       对主题做可审计、可重复执行的最小补丁

source/js/custom.js      运行时交互：导航、搜索、目录、边注、预览、阅读设置、代码全屏、阅读记忆、无障碍（约 4200 行）
source/css/custom.css    设计系统与页面覆盖（约 7300 行）
source/css/series.css    系列阅读样式
test/                    15 套 Puppeteer / Node 检查
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
| 首页首屏 CLS | 0.001–0.002（横幅固定 100vh 后） |
| 文章 LCP（本地 Chrome） | 约 0.45–0.49s |
| 移动端文章滚动 CLS | 约 0.007（相关阅读占位后） |
| 点击 → 内容替换 | 15–43ms |
| 点击 → 导航结束 | 134–246ms |
| 首屏 long task | 冷启动约 180ms（字体 preload 后）；导航单次 120–190ms 来自 Swup 解析长文 HTML |
| 手机横幅（亮色） | 35KB / 960w（原图 63KB / 1920w） |
| Live2D 主纹理 | 308KB WebP（原 1.7MB PNG） |
| FontAwesome CSS | 65KB 类名子集（原 4 个文件约 200KB） |
| 移除的脚本 | moment 375KB（essays 页改用 Intl） |
| 首屏请求（首页） | 58 个；search.xml 不在首屏请求 |
| 部署产物 | 约 21MB（含 32 张 OG 卡；移除全量 webfonts / source map / 重复 js/libs 后，原 33MB+） |
| Live2D | 默认 0 请求；用户点击“召唤宠物”后才加载模型，选择记入 localStorage |

### 关键取舍

- **移除 Swup 退出动画**：旧流程先播 320ms 旧页退出，再替换 DOM，首跳 click→replace 实测 426ms。现在只播新页入场，代价是页面切换少了一层“退场”叙事，收益是内容快一个数量级到达。
- **滚动期间暂停 Live2D**：用 `scrollend` + 180ms 时间窗避免程序化滚动每帧触发 resume。
- **缓存文档高度**：主题的滚动进度/侧栏工具需要 `scrollHeight`，每帧读取会强制布局；改为 load/resize/fonts/换页后更新缓存。视口变化的下一帧同时刷新缓存与页脚状态；接近真实页底时直接按实际 `scrollHeight` 判断，避免 resize 或导航回调把旧区间写回后误判“尚未到底”。
- **APlayer 按需恢复**：首屏只有一个轻量“音乐”按钮；点击后才加载播放器核心，默认紧凑、暂停且 `preload:"none"`，再点封面播放才请求约 2.5MB 的 MP3。主题不再随滚动给播放器加 `hide`，手机端也可用；可收起为音乐按钮并暂停，重新打开复用实例且不自动播放；封面支持 Enter/Space 与播放状态名称。音轨没有标题/艺术家元数据，因此界面如实写“背景音乐 / 本地音频 · 02:41”。
- **PNG 纹理仍部署**：WebP 已切换，但旧 `index.json` 可能被缓存 10 分钟；PNG 作为回退保留。设置 `CJ_SKIP_OLD_TEXTURES=1` 可移除。
- **移除滚动面上的模糊**：主题会在首页滚过半屏后给横幅加 `filter: blur(15px)`，侧栏、回到顶部、页脚还用 `backdrop-filter`。软件渲染实测首页滚动 p50 25ms / p95 50ms；改为清晰横幅 + 实色面板后 p50 8ms / p95 25ms。搜索弹层也去掉模糊。
- **主题滚动回调去抖动**：`navbar-shrink` 与工具条 `hide` 只在状态变化时改 class；工具条状态未变直接返回。首屏 init 不再同步读 `scrollHeight`，首页约 207ms 的整页布局从 DOMContentLoaded 任务里移走；SPA 换页后的高度读取、焦点和侧栏更新都延后到 idle。
- **编辑式视觉改造**：桌面首屏约 68dvh、移动约 42dvh；主题会内联写入 `100dvh`，旧 CSS 还有 `html body ... 38vh !important`，新规则必须覆盖这两个层级。背景用 `position:absolute` 留在首屏，移动端同时清理独立 `scale` 属性；`test:assets` 会拦截移动横幅超过 45% 视口的回归。
- **分页背景与紧凑页脚**：固定太空站/雨夜背景只在第一张首页输出，分页不再创建背景节点；页脚通过 `footer-layout.js` 构建期分为 primary/meta 与 utility 两部分，同年不重复年份，移除装饰口号与心跳。页脚内容宽度与正文一致（80%，上限 1200px）并居中；≥1280px 收成单行（版权在左，次级入口与社交图标靠右），更窄时两行，390px 下秒级运行时间放在入口行右侧。运行时间恢复为“已运行 N 天 HH:MM:SS”，数字等宽避免每秒抖动；页面隐藏时暂停计时，回到前台立即校正。实测桌面 51px、390px 71px、320px 140px，全部链接、运行时间与社交入口保留。
- **主题 JS 版本**：`main.js` 与被打补丁的 `navbarShrink.js` / `utils.js` / `sideTools.js` / `toc.js` 带 `?v=20261028b`，`custom.js` 带 `?v=20261027ae`，`custom.css` 带 `?v=20261028b`；APlayer 初始化模块带 `?v=20261026g`，Live2D `autoload.js` / `waifu-tips.js` 带 `?v=20261027aa`，页脚 runtime 模块带 `?v=20261028b`。Cloudflare 的 4 小时缓存不会继续提供旧交互逻辑。
- **明暗切换只有一条动画管线**：移除了对所有元素生效的 `theme-transitioning` 颜色动画。View Transition 采用 latest-request-wins：快速连点时跳过旧快照并同步应用最后选择，清理只归当前任务；动画期间暂停 Live2D，结束后仅在滚动、导航、隐藏标签页和 reduced-motion 等守卫允许时恢复一个渲染循环。
- **补丁幂等与 fresh-install**：Typed 的 reduced-motion 守卫和 head 的 inject 区块改为先归一、再保留一份；sideTools 的后续补丁不再重新引用已移除的 APlayer 变量。`test:polish` 会用 `test/fixtures/redefine-2.9.0/` 的原始文件在 `.scratch/theme-patch-fresh/` 执行两遍补丁，验证语法、无悬挂引用和逐字节一致，而不只检查当前 `node_modules`。

## 5. 阅读体验与内容增强

这些功能优先在构建期完成，运行时不发额外请求：

| 功能 | 实现 | 运行时成本 |
|---|---|---|
| 边注 | `{% margin %}` 由 `scripts/marginnote.js` 输出引用 + 注释；≥1680px 浮动到左页边，窄屏点开底部卡片 | 0 请求；约 150 行 JS/CSS |
| 内链预览 | generator 输出 `link-preview.json`（33 条，约 10KB / gzip 4KB），首次悬停才 fetch | 1 个 JSON + 1 张封面，仅悬停时 |
| 脚注预览 | 复用构建期 `#fn-*`，悬停/聚焦时克隆到 fixed tooltip | 0 请求 |
| 公式复制 | `scripts/math.js` 包一层 `.katex-block`，按钮读取 MathML `annotation` 里的 TeX 源码 | 0 请求 |
| 阅读设置 | 侧栏三档字号 + 专注模式；head 内联脚本在首屏前应用，字号不闪动 | 0 请求 |
| Live2D | 默认不加载；显式“召唤宠物”后才拉模型，选择写入 localStorage；滚动时仅暂停渲染，角色与入口不再淡出 | 用户点击前 0 请求 |
| 背景音乐 | 桌面点击后加载、可收起复用；手机在设置菜单内播放/暂停，正文无悬浮音乐控件；展开控件的 span 图标也可键盘操作 | 首次点击前 0 请求 / 0 播放 |
| 导航主题控制 | 明暗按钮进入导航，所有主要断点可见；文案说明下一步动作，季节与计时器面板互斥，菜单背景不模糊 | 0 请求 |
| 失败恢复 | 本会话最新设置优先于可读旧存储；删除失败有墓碑；Live2D 安全读写存储；预览请求失败后允许重试并绕过失败缓存 | 无刷新恢复 |
| 公开联系方式 | 163 邮箱优先、QQ 邮箱备用；关于页/简历直接显示地址，首屏/作者卡/页脚使用紧凑邮件图标并保留 `mailto:`、`title` 与可访问名称；body 内 `email_off` 防止 Cloudflare 改成占位 | 0 请求 / 无 JS 也可读 |
| 引用与分享 | head 输出 `citation_*`；侧栏菜单复制 Markdown / BibTeX / APA / GB/T 7714 / RIS / 链接；body JSON 随 Swup 换页更新 | 0 请求 |
| 键盘快捷键 | `?` 打开原生 `<dialog>` 帮助；`t` 切换主题；`g h` / `g a` 站内跳转；输入框和弹层打开时不触发 | 0 请求 |
| 反向链接 | 构建期扫描所有文章正文内链，目标文章底部列出来源与上下文 | 0 请求 |
| 文章导航 | 按发布日期生成“更早/更新一篇”，head 输出 `rel=prev/next`，`[` `]` 快捷键复用链接点击 | 0 请求 |
| 404 最近文章 | 构建期把最近 5 篇写进 404 页，避免用户只剩搜索一条路 | 0 请求 |

边注的宽屏阈值是 1680px：正文 957px + 左页边 235px，低于这个宽度放不下 212px 的注释列，因此降级为底部卡片。底部卡片、边注、预览卡都挂在 `body` 上，避免正文祖先的 `transform`（Swup 入场）把 `position: fixed` 变成相对定位。

内链预览只在 `(hover: hover) and (pointer: fine)` 且宽度 ≥1024px 时启用；移动端点击直接跳转。脚注和预览卡都支持 `focusin`，键盘 Tab 到引用时同样显示。

归档页也走构建期：页头统计（篇数/字数/写作日/系列数）、写作热力图、系列入口和每条文章的分类/阅读时间都由同一份 posts 数据生成；2026-10-25 起归档合并为一页，旧的 `/archives/page/2/`、`/page/3/` 保留为跳转页。标签与分类页在构建期按使用次数降序排列，引导语移到列表上方。站点视觉页（`/photos/`）的图集仍由前端 masonry 渲染，但构建期补了导语、加载提示和 `<noscript>` 静态图集。

引用元数据放在静态 HTML 的 head 里，服务爬虫和首屏；引用菜单实际读的是正文里的 JSON，因为 Swup 只替换 `#swup`，head 不会随换页更新。反向链接只扫描每篇文章的渲染正文（`post.content`），不把导航、相关阅读、系列卡算进去；当前 23 篇里有 18 篇至少被引用一次，没有来源的文章不渲染空区块。

## 6. 无障碍

目标不是“加几个 aria-label”，而是让键盘和读屏用户能完成主要路径：

- **地标**：`main` 只包正文，header/footer 回到 banner/contentinfo；导航容器有 navigation 角色。
- **搜索**：combobox + listbox，↑/↓/Home/End、Enter、`aria-activedescendant`、结果数量 live region、空结果文字；IME 组合期间不响应 Enter。
- **图片查看器**：图片可聚焦，Enter 打开，焦点进入关闭按钮，Esc 关闭后回到图片；双指缩放与平移复用主题的 wheel/拖拽状态，不另存一套 transform。
- **代码块**：复制/折叠按钮有 role、tabindex、名称和 Enter/Space。
- **目录**：桌面 TOC 当前项有 `aria-current="location"`；移动端使用原生 `<details>` 目录。
- **边注/预览**：边注按钮带 `aria-controls`，卡片是 `role="dialog"`，打开时焦点进入关闭按钮，Esc 收起后焦点回到引用；内链/脚注预览是 `role="tooltip"` + `pointer-events: none`，不抢鼠标也不打断读屏。
- **阅读设置**：字号和专注按钮使用 `aria-pressed`；窄屏设置卡打开后焦点进入关闭按钮，Esc 关闭。
- **引用菜单**：`role="menu"` / `menuitem`，打开后焦点进入第一项，↑/↓/Home/End 移动，Esc 关闭并把焦点还给分享按钮，Tab 离开时自动收起。
- **快捷键帮助**：原生 `<dialog>` + `showModal()` 提供焦点陷阱和 Esc 关闭，背景由浏览器置为 inert；输入框聚焦时所有单键快捷键关闭。
- **次级导航**：简历 / 归档 / 标签 / 书签只在页脚滚动到底展开时出现，保持原生链接；移动端触控高度 44px，不在首屏和导航里抢位置。
- **对比度**：浅色/深色/四季主题的次要文字统一到 WCAG AA 以上；白字按钮使用更深的 `--primary-color-strong`，首页和关于页主按钮在两种主题下都达到 4.5:1。
- **浮动控件**：移动端右侧工具条隐藏，Aa / 引用内联在文章统计行；边注 ※ 与标题锚点用伪元素扩大点击区域。
- **回到顶部**：主题的 `<li>` 补 `role="button"`、`tabindex="0"`、`aria-label` 和 Enter/Space 处理。
- **分类卡片**：整个卡片区域通过链接伪元素可点击，不再只有分类名是热区。

验证：axe-core 4.10 在桌面和移动端扫描首页、文章页、归档、系列总览、系列页、关于、项目、简历、404，WCAG A/AA 标签下 **0 条违规**。回归测试另覆盖标题唯一性、图片 alt、链接/按钮名称、列表语义、地标和 skip link。

## 7. 测试矩阵

| 套件 | 项数 | 覆盖 |
|---|---:|---|
| `test:transitions` | 59 | SPA 跳转、连点、前进后退、搜索焦点、路由播报、页脚、导航聚焦、相关阅读滚动恢复、移动抽屉、800px 导航 |
| `test:sidebar` | 39 | 侧栏卡片、进度环、锚点、表格、Markdown、代码全屏、面包屑、移动目录 |
| `test:series` | 55 | 系列页、徽章/系列卡、Atom、归档入口、SPA、移动端 |
| `test:assets` | 51 | 响应式横幅、WebP 纹理、sitemap/llms、JSON-LD、JSON Feed、图标子集、OG 元数据、APlayer |
| `test:a11y` | 73 | 名称、alt、列表语义、标题、地标、图片查看器键盘/双指缩放/禁用态、引用菜单焦点、存储被禁、脚注、项目/简历页 |
| `test:search` | 29 | combobox/listbox、方向键、Enter、空态、IME、英文词边界、标题排序、后退恢复、首次加载竞态、SPA |
| `test:smooth` | 28 | 滚动、Live2D 暂停、reduced-motion、移动端溢出、滚动面模糊回归 |
| `test` | 34 | 端到端页面、主题切换、Live2D 显式召唤、次级页面 |
| `test:features` | 100 | 边注、内链预览、公式复制、脚注预览、阅读设置、引用菜单、反向链接、键盘快捷键、图片双指平移、文章导航、404、简历 PDF |
| `test:resume` | 7 | 阅读位置记忆与继续阅读 |
| `test:archive` | 19 | 归档页头、单页列表、旧分页跳转、热力图与移动端 |
| `test:pages` | 61 | 标签/分类排序、说说日期、站点视觉兜底、分页背景与 SPA 恢复、紧凑页脚尺寸与正文对齐、归档元数据、内联阅读/引用按钮、静态 HTML 卫生、打印样式 |
| `test:polish` | 68 | 紧凑首屏、导航明暗、手机菜单内音乐、键盘播放、面板互斥、宠物、存储写入/删除失败、预览 500 后重试、Redefine 原始文件 fresh-install |
| `test:content` | 23 篇 | front matter、站内链接、图片、OG 卡、文风硬规则、构建后 Markdown 残留检查 |
| `test:links` | 99 HTML | 构建产物站内 href 断链检查 |

合计 623 项浏览器检查、23 篇文章的内容检查和 99 个 HTML 的内链检查。所有套件在本机通过；CI 跑 `test:content`、构建和 `test:links`，浏览器套件留在本地或 self-hosted runner。

## 8. 已知边界

- **Swup 解析成本**：首跳时如果用户没有 hover 预取，Swup 需要解析整篇长文 HTML，单次 long task 约 120–190ms。真实用户悬停链接会提前预取，测试里的程序化点击没有 hover 阶段。
- **全量字体仍在产物里**：FontAwesome 全量 webfonts 和主题库文件仍会部署，虽然页面只请求子集字体；彻底裁剪需要更细的资源清单。
- **mermaid/waline**：当前配置未启用，构建时移除；重新启用会自动保留对应文件。
- **边注阈值**：≥1680px 才放进左页边；更窄时只能点开底部卡片，因为正文左侧只剩约 143px。
- **内链预览**：只在桌面 hover / 键盘聚焦时出现，触屏直接跳转；每次悬停会额外请求一张封面图。
- **引用元数据**：`citation_*` 只存在静态 HTML 的 head 里，Swup 换页不会更新 head；引用菜单读正文 JSON，所以复制内容始终是当前文章。
- **窄屏浮动按钮**：左下角依次是引用（96px）和 Aa（150px）；音乐入口按页脚安全区定位，宠物入口只在 >900px 出现，避免多个控件挤在一起。
- **反向链接**：只扫描文章正文，不把页面（关于/项目/简历）算作来源；最多展示 5 条，计数显示全部。同源绝对 URL、协议相对 URL 和相对路径都能识别，非法字符实体原样保留。
- **剪贴板**：后台标签页里 `navigator.clipboard` 可能一直 pending，菜单会保持打开并提示重试；引用菜单的状态存在 DOM 上而不是闭包里，SPA 换页会收起，复制内容始终来自当前文章的 JSON。
- **阅读设置**：只改正文字号，标题仍走主题的 rem 阶梯；专注模式只作用于文章页，离开文章自动收起。
- **构建缓存**：`scripts/` 里的 tag/renderer 改动不会让 Hexo 的文章缓存失效（缓存按源文件内容哈希）；改标签或渲染器后需要重建缓存或改动文章内容才会重新渲染。
- **时区**：站点时区是 `Asia/Shanghai`，两个 GitHub Actions workflow 都设置 `TZ=Asia/Shanghai`。`test:content` 会拒绝 08:00 之前的 `date`，因为 UTC 构建会把这类文章排到前一天，导致链接和实际产物路径不一致。
- **Live2D**：默认不加载，用户点击“召唤宠物”后才请求；召唤入口在桌面持续可见，返回访客按之前的选择恢复。滚动、换页、隐藏标签页和主题快照只暂停渲染，不再通过淡出角色来“优化”。
- **按页拆 CSS/JS 暂未做**：coverage 显示 custom.css 单页只用 14–30%，但 Swup 只替换 `#swup`，按页注入到 head 的样式表在 SPA 跳转时不会加载；要做需要把 `<link>` 放进被替换内容或加运行时 loader，收益（约 8–10KB gzip/页）不足以抵消闪烁和维护成本。
- **文章导航的 head 链接只在首屏 HTML 生效**：Swup 不替换 `<head>`，SPA 换页后 `rel=prev/next` 仍是进入站点时的页面；文末卡片每次换页都会重建，键盘 `[` `]` 也用当前页的卡片，不受影响。
- **Giscus 主题同步**：主题在 iframe 被 Swup 移除后仍可能对 null `contentWindow` 调 `postMessage`；`theme-patch.js` 已在源码和构建产物里补 `isConnected/contentWindow` 守卫。
- **打印**：打印样式强制浅色背景和深色文字，深色模式下打印简历/文章不会反色；固定浮层（宠物、播放器、工具栏、鼠标跟随）全部隐藏。
- **归档分页**：2026-10-25 起归档合并为一页；旧 `/archives/page/2/`、`/page/3/` 由 generator 输出 meta refresh 跳转页，并带 `noindex`。
- **页脚自动收起**：长页面顶部和向下阅读时隐藏常驻页脚，向上滚或触底展开；短页面保持可见。
- **移动端浮动控件**：右侧工具条直接隐藏；Aa / 引用内联在文章统计行，不覆盖正文；桌面端保留右侧工具条和浮动 Aa。
- **数据标记**：`data-cj-post` 只写在真正的文章页（`page.__post`），归档/标签/关于等页面不会误用专注模式。
- **系列样式**：`series.css` 改为全站加载。之前按页注入 `<head>`，SPA 换页或缓存命中旧版本时卡片会失去布局，退化成一段连续文字。
- **宠物**：画布缩到 170px，向下滚动仍保持可见；滚动时只暂停 Cubism 渲染。初始化期间的空模型/空命中区域有守卫，鼠标与触摸事件不会抛出 `getHitAreasCount` 空值错误。宠物入口与播放器之间保留实测间距。
- **公开邮箱**：163 优先、QQ 备用由用户确认；`public-contact.js` 的 `email_off` 只作用于站长主动公开的联系信息。三份定向 PDF 仍是没有可编辑源文件的历史版本，在线简历明确注明项目与联系方式以在线页为准。
- **主题升级**：补丁目标是 2.9.0 的模板文本；版本已锁定，升级时需要重新核对 `theme-patch.js` 的标记。改主题 JS 后要同时推进 `theme-patch.js` 与 `asset-version.js` 里的版本号。
- **移动端不再显示右侧工具条**：阅读设置与引用按钮放进文章统计行；桌面端保留右侧工具条和浮动 Aa。
- **首帧布局**：首页仍有约 170–220ms 的首次整页布局（1195 个对象），这是 DOM/CSS 首次布局成本；已从 init 任务里移出，但没有做按区块的 `content-visibility`（实测会更抖）。

## 9. 如果继续做

1. **按页拆 CSS/JS**：style.css / custom.css / FontAwesome 子集仍有未使用字节，可在构建期按页面类型拆包。
2. **内容哈希替代手写版本号**：现在靠 `?v=` 手工推进，改成构建期内容哈希可以彻底消除缓存不一致。
3. **OG 卡自动生成**：`og-manifest.json` 已能让 CI 发现“标题改了但没重跑”的卡片；若要在 CI 直接重渲染，需要安装 Chrome 并接受约 1 分钟的构建时间。
4. **CI**：跑 `test:content` + 构建，浏览器套件留在本地或 self-hosted runner。
5. **Cloudflare 缓存规则落地**：`docs/DEPLOYMENT.md` 已给出精确的 Transform Rule / Cache Rule 配置，待在控制台执行并 `curl -I` 验证。
