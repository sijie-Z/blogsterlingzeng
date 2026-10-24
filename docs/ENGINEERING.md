# 工程说明：这个博客是怎么搭的

> 面向代码审阅者。记录架构、构建期流水线、性能与无障碍的测量方法，以及已经知道的边界。
> 更新日期：2026-10-24

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
├── math.js              $...$ / $$...$$ 构建期 KaTeX MathML + 复制按钮
├── footnotes.js         [^id] 脚注：doc-noteref / doc-endnotes
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

source/js/custom.js      运行时交互：导航、搜索、目录、边注、预览、阅读设置、代码全屏、阅读记忆、无障碍（约 3200 行）
source/css/custom.css    设计系统与页面覆盖（约 4800 行）
source/css/series.css    系列阅读样式
test/                    12 套 Puppeteer / Node 检查
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
| 首屏请求（首页） | 58 个；search.xml / APlayer 不在首屏请求 |
| 部署产物 | 约 21MB（含 32 张 OG 卡；移除全量 webfonts / source map / 重复 js/libs 后，原 33MB+） |
| Live2D | 默认 0 请求；用户点击“召唤宠物”后才加载模型，选择记入 localStorage |

### 关键取舍

- **移除 Swup 退出动画**：旧流程先播 320ms 旧页退出，再替换 DOM，首跳 click→replace 实测 426ms。现在只播新页入场，代价是页面切换少了一层“退场”叙事，收益是内容快一个数量级到达。
- **滚动期间暂停 Live2D**：用 `scrollend` + 180ms 时间窗避免程序化滚动每帧触发 resume。
- **缓存文档高度**：主题的滚动进度/侧栏工具需要 `scrollHeight`，每帧读取会强制布局；改为 load/resize/fonts/换页后更新缓存，仅在接近页脚时读一次真实值。
- **APlayer 延迟**：12 秒后才加载，并设置 `preload: none`；2.5MB 的 mp3 不在首屏请求。页脚数字关闭 odometer 滚动动画，由主题 runtime 每秒直接写文本，避免一次约 300ms 的布局任务。
- **PNG 纹理仍部署**：WebP 已切换，但旧 `index.json` 可能被缓存 10 分钟；PNG 作为回退保留。设置 `CJ_SKIP_OLD_TEXTURES=1` 可移除。

## 5. 阅读体验与内容增强

这些功能优先在构建期完成，运行时不发额外请求：

| 功能 | 实现 | 运行时成本 |
|---|---|---|
| 边注 | `{% margin %}` 由 `scripts/marginnote.js` 输出引用 + 注释；≥1680px 浮动到左页边，窄屏点开底部卡片 | 0 请求；约 150 行 JS/CSS |
| 内链预览 | generator 输出 `link-preview.json`（32 条，约 10KB / gzip 4KB），首次悬停才 fetch | 1 个 JSON + 1 张封面，仅悬停时 |
| 脚注预览 | 复用构建期 `#fn-*`，悬停/聚焦时克隆到 fixed tooltip | 0 请求 |
| 公式复制 | `scripts/math.js` 包一层 `.katex-block`，按钮读取 MathML `annotation` 里的 TeX 源码 | 0 请求 |
| 阅读设置 | 侧栏三档字号 + 专注模式；head 内联脚本在首屏前应用，字号不闪动 | 0 请求 |
| Live2D | 默认不加载；显式“召唤宠物”后才拉模型，选择写入 localStorage | 用户点击前 0 请求 |
| 引用与分享 | head 输出 `citation_*`；侧栏菜单复制 Markdown / BibTeX / APA / GB/T 7714 / RIS / 链接；body JSON 随 Swup 换页更新 | 0 请求 |
| 键盘快捷键 | `?` 打开原生 `<dialog>` 帮助；`t` 切换主题；`g h` / `g a` 站内跳转；输入框和弹层打开时不触发 | 0 请求 |
| 反向链接 | 构建期扫描所有文章正文内链，目标文章底部列出来源与上下文 | 0 请求 |

边注的宽屏阈值是 1680px：正文 957px + 左页边 235px，低于这个宽度放不下 212px 的注释列，因此降级为底部卡片。底部卡片、边注、预览卡都挂在 `body` 上，避免正文祖先的 `transform`（Swup 入场）把 `position: fixed` 变成相对定位。

内链预览只在 `(hover: hover) and (pointer: fine)` 且宽度 ≥1024px 时启用；移动端点击直接跳转。脚注和预览卡都支持 `focusin`，键盘 Tab 到引用时同样显示。

引用元数据放在静态 HTML 的 head 里，服务爬虫和首屏；引用菜单实际读的是正文里的 JSON，因为 Swup 只替换 `#swup`，head 不会随换页更新。反向链接只扫描每篇文章的渲染正文（`post.content`），不把导航、相关阅读、系列卡算进去；当前 23 篇里有 18 篇至少被引用一次，没有来源的文章不渲染空区块。

## 6. 无障碍

目标不是“加几个 aria-label”，而是让键盘和读屏用户能完成主要路径：

- **地标**：`main` 只包正文，header/footer 回到 banner/contentinfo；导航容器有 navigation 角色。
- **搜索**：combobox + listbox，↑/↓/Home/End、Enter、`aria-activedescendant`、结果数量 live region、空结果文字；IME 组合期间不响应 Enter。
- **图片查看器**：图片可聚焦，Enter 打开，焦点进入关闭按钮，Esc 关闭后回到图片。
- **代码块**：复制/折叠按钮有 role、tabindex、名称和 Enter/Space。
- **目录**：桌面 TOC 当前项有 `aria-current="location"`；移动端使用原生 `<details>` 目录。
- **边注/预览**：边注按钮带 `aria-controls`，卡片是 `role="dialog"`，打开时焦点进入关闭按钮，Esc 收起后焦点回到引用；内链/脚注预览是 `role="tooltip"` + `pointer-events: none`，不抢鼠标也不打断读屏。
- **阅读设置**：字号和专注按钮使用 `aria-pressed`；窄屏设置卡打开后焦点进入关闭按钮，Esc 关闭。
- **引用菜单**：`role="menu"` / `menuitem`，打开后焦点进入第一项，↑/↓/Home/End 移动，Esc 关闭并把焦点还给分享按钮，Tab 离开时自动收起。
- **快捷键帮助**：原生 `<dialog>` + `showModal()` 提供焦点陷阱和 Esc 关闭，背景由浏览器置为 inert；输入框聚焦时所有单键快捷键关闭。
- **对比度**：浅色/深色/四季主题的次要文字统一到 WCAG AA 以上。

验证：axe-core 4.10 在桌面和移动端扫描首页、文章页、归档、系列总览、系列页、关于、项目、简历、404，WCAG A/AA 标签下 **0 条违规**。回归测试另覆盖标题唯一性、图片 alt、链接/按钮名称、列表语义、地标和 skip link。

## 7. 测试矩阵

| 套件 | 项数 | 覆盖 |
|---|---:|---|
| `test:transitions` | 46 | SPA 跳转、连点、前进后退、搜索焦点、路由播报、800px 导航 |
| `test:sidebar` | 39 | 侧栏卡片、进度环、锚点、表格、Markdown、代码全屏、面包屑、移动目录 |
| `test:series` | 53 | 系列页、徽章/系列卡、Atom、归档入口、SPA、移动端 |
| `test:assets` | 49 | 响应式横幅、WebP 纹理、sitemap/llms、JSON-LD、JSON Feed、图标子集、OG 元数据、APlayer |
| `test:a11y` | 68 | 名称、alt、列表语义、标题、地标、图片查看器键盘/双指缩放、脚注、项目/简历页 |
| `test:search` | 20 | combobox/listbox、方向键、Enter、空态、IME、SPA |
| `test:smooth` | 26 | 滚动、Live2D 暂停、reduced-motion、移动端溢出 |
| `test` | 34 | 端到端页面、主题切换、Live2D 显式召唤、次级页面 |
| `test:features` | 84 | 边注、内链预览、公式复制、脚注预览、阅读设置、引用菜单、反向链接、键盘快捷键 |
| `test:resume` | 7 | 阅读位置记忆与继续阅读 |
| `test:archive` | 16 | 归档热力图与移动端 |
| `test:content` | 23 篇 | front matter、站内链接、图片、OG 卡、文风硬规则 |
| `test:links` | 100 HTML | 构建产物站内 href 断链检查 |

合计 442 项浏览器检查、23 篇文章的内容检查和 100 个 HTML 的内链检查。所有套件在本机通过；CI 目前只跑不依赖浏览器的 `test:content`。

## 8. 已知边界

- **Swup 解析成本**：首跳时如果用户没有 hover 预取，Swup 需要解析整篇长文 HTML，单次 long task 约 120–190ms。真实用户悬停链接会提前预取，测试里的程序化点击没有 hover 阶段。
- **全量字体仍在产物里**：FontAwesome 全量 webfonts 和主题库文件仍会部署，虽然页面只请求子集字体；彻底裁剪需要更细的资源清单。
- **mermaid/waline**：当前配置未启用，构建时移除；重新启用会自动保留对应文件。
- **边注阈值**：≥1680px 才放进左页边；更窄时只能点开底部卡片，因为正文左侧只剩约 143px。
- **内链预览**：只在桌面 hover / 键盘聚焦时出现，触屏直接跳转；每次悬停会额外请求一张封面图。
- **引用元数据**：`citation_*` 只存在静态 HTML 的 head 里，Swup 换页不会更新 head；引用菜单读正文 JSON，所以复制内容始终是当前文章。
- **窄屏浮动按钮**：左下角依次是引用（96px）和 Aa（150px）；宠物入口只在 >900px 出现，避免三者重叠。
- **反向链接**：只扫描文章正文，不把页面（关于/项目/简历）算作来源；最多展示 5 条，计数显示全部。同源绝对 URL、协议相对 URL 和相对路径都能识别，非法字符实体原样保留。
- **剪贴板**：后台标签页里 `navigator.clipboard` 可能一直 pending，菜单会保持打开并提示重试；引用菜单的状态存在 DOM 上而不是闭包里，SPA 换页会收起，复制内容始终来自当前文章的 JSON。
- **阅读设置**：只改正文字号，标题仍走主题的 rem 阶梯；专注模式只作用于文章页，离开文章自动收起。
- **构建缓存**：`scripts/` 里的 tag/renderer 改动不会让 Hexo 的文章缓存失效（缓存按源文件内容哈希）；改标签或渲染器后需要重建缓存或改动文章内容才会重新渲染。
- **Live2D**：默认不加载，用户点击“召唤宠物”后才请求；暂停/恢复仍由滚动自动管理，没有常驻可见控件。
- **按页拆 CSS/JS 暂未做**：coverage 显示 custom.css 单页只用 14–30%，但 Swup 只替换 `#swup`，按页注入到 head 的样式表在 SPA 跳转时不会加载；要做需要把 `<link>` 放进被替换内容或加运行时 loader，收益（约 8–10KB gzip/页）不足以抵消闪烁和维护成本。
- **主题升级**：补丁目标是 2.9.0 的模板文本；版本已锁定，升级时需要重新核对 `theme-patch.js` 的标记。

## 9. 如果继续做

1. **按页拆 CSS/JS**：style.css / custom.css / FontAwesome 子集仍有未使用字节，可在构建期按页面类型拆包。
2. **内容哈希替代手写版本号**：现在靠 `?v=` 手工推进，改成构建期内容哈希可以彻底消除缓存不一致。
3. **动态 OG 接入 CI**：标题常改时把 `tools/gen-og-images.js` 放进写作流程或 CI，避免图片和标题漂移。
4. **CI**：跑 `test:content` + 构建，浏览器套件留在本地或 self-hosted runner。
5. **Cloudflare 缓存规则落地**：`docs/DEPLOYMENT.md` 已给出精确的 Transform Rule / Cache Rule 配置，待在控制台执行并 `curl -I` 验证。
