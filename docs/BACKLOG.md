# 续作清单（2026-10-23）

这份文档记录这一轮已经做完的事、验证过的数字，以及之后可以继续做的方向。主线程收尾时留下，方便下次直接接上。

## 这一轮已完成

- 项目页改为 **3 个案例 + 4 个紧凑条目**：每个案例包含问题、约束、关键决策、证据、边界和本人角色；MiQroGate 明确写出“规格/审查由我负责，实现主要由 Claude Code 完成”和“真实凭证未联调”。
- 关于页改成 30 秒可扫读：求职方向、三个项目入口、按“在哪用过”分组的技术栈（移除无法验证的熟练度百分比）、精简时间线；新增 `/resume/` 一页式简历（可打印 / 存 PDF），导航加入“简历”。
- 文章新增 callout（MiQroGate 的验证边界、DocMind 的评测集口径、quant 的结论边界）；侧栏新增“复制 Markdown 原文”按钮；代码块新增语言徽标。
- 性能：FontAwesome 全量 CSS 换成 65KB 类名子集；移除 375KB 的 moment（essays 页改用 Intl）；移除 8.4MB 未引用的全量 webfonts；移除 Google Fonts 无用 preconnect；首屏标题/正文字体加 woff2 preload；暗色横幅改懒加载；pangu 不再改整页标题（文章首屏 CLS 回到 0.0001）；APlayer 改为 12 秒后才加载，无歌词时不再请求 LRC；关闭 odometer 并移除其 JS/CSS；Typed 只在首页加载。
- SEO：`max-image-preview:large`；sitemap 去掉 `index.html`；31 张 1200×630 OG 分享卡（文章 / 系列 / 首页 / 项目 / 关于 / 简历），补齐 `og:image:width/height/alt`；站点级和系列级 JSON Feed 1.1。
- 无障碍：首次 SPA 跳转也会播报并聚焦新页 h1；图片查看器 Tab 限制在弹层内、背景 inert；TOC 加 navigation landmark；代码复制/折叠改为原生按钮并播报结果；标题锚点名称带标题文本；skip 落点补 scroll-margin 与焦点样式。
- 测试：357 项浏览器检查 + 22 篇内容检查全部通过；axe-core 桌面/移动端 9 类页面（含项目、简历）0 违规。
- 后续补强：文章页可见面包屑（与 BreadcrumbList 对齐）；图片查看器显示 figcaption/alt 并接 `aria-describedby`；`timeline` Hexo 标签替换关于页时间线；站内搜索改为 `field: all`，简历/项目/关于也能被搜到；构建期脚注（`[^id]` → doc-noteref / doc-endnotes）；首页加“项目 / 简历 / 系列”三张快速入口卡；代码块支持 `{% codeblock %}` 文件名标题与 `mark:` 行高亮；修复 APlayer 无歌词时请求 LRC 的 404；修复系列页 JSON-LD 图片回退问题；补充 Nginx 缓存头文档。

## 审计修复（2026-10-24）

- `/shuoshuo/` 的日期不再停在 “Loading Date”：主题 `main.js` 里 `typeof moment` 的守卫已移除，Intl 格式化始终执行。
- APlayer 固定模式的 `preload:"none"` 补丁不再依赖 `lrcType` 的改写顺序，全新安装也能命中；测试里加了断言。
- skip link 现在会把焦点移到 `#main-content`；图片查看器打开时按 SPA 换页会清理 inert 状态。
- 面包屑/OG 的 HTML 插入改用函数 replacer，标题含 `$&`、`$'` 时不会被当成替换模式；脚注重复引用生成唯一 id，定义内容按 Markdown 渲染，未引用的定义不再静默丢弃。
- JSON-LD 用显式 `data-cj-jsonld` 标记判断是否已注入；OG 回退页也补齐 width/height/alt。
- 首页系列数从 `__cjBuildSeries()` 推导，不再写死。
- 浏览器审计：修复搜索索引把所有文章误删的 404 正则；归档页改用 `page.posts` 并补分页；点赞按钮不再插进归档标题链接；去掉 `pageEnter` 的 opacity 以免压掉 LCP；相关阅读先占位，移动端滚动 CLS 从 0.14 降到约 0.007；只加载当前主题横幅；项目表格移动端可横向滚动；sitemap 补 `/archives/`；Live2D 延迟加载方案因与 SPA 导航竞争回退，恢复 load 后空闲初始化；补齐移动端抽屉 Esc/焦点、代码行键盘选择与对比度。

## 验证数字

- 文章首屏 CLS：0.0001；首页首屏 CLS：约 0.001–0.002；移动端文章滚动 CLS：约 0.007。
- 文章 LCP：约 0.45–0.49s；首页首屏 58 个请求，search.xml / APlayer 不在首屏请求。
- 点击 → 内容替换：约 21–43ms；点击 → 导航结束：134–246ms。
- 部署产物：约 22MB（含 31 张 OG 卡）；原 33MB+。
- FontAwesome CSS：65KB；字体子集：solid 5KB / regular 7KB / brands 1KB；封面已换 WebP。
- 检查：transitions 46、sidebar 39、series 53、assets 49、a11y 68、search 20、smooth 26、e2e 33、resume 7、archive 16，合计 357 项浏览器检查；22 篇文章内容检查；99 个 HTML 内链检查。

## 下次可以继续做（按价值排序）

1. **线上缓存头**：Nginx / Cloudflare 给带版本号的静态资源加 `Cache-Control: public, max-age=31536000, immutable`，HTML 短缓存；文档已有配置片段，尚未在服务器落地。
2. **按页拆 CSS/JS**：style.css / custom.css / FontAwesome 子集仍有大量未使用字节；可在构建期按页面类型拆包，或对非文章页移除 imageViewer。
3. **Live2D 体积**：3MB 模型仍在 load 后空闲加载；延迟/交互方案与 SPA 导航竞争会触发模型未就绪错误，已回退。下一步应改为显式“加载宠物”按钮，而不是自动加载。
4. **标签页策略**：标签已从 73 合并到 41，但仍有单篇标签页；可以给少于 2 篇的标签加 noindex，或继续合并。
5. **侧注/边注**：脚注已支持；右侧边注需要 ≥1440px 布局与 hover/focus 预览。
6. **代码行全局锚点**：`#cb1-L3` 已可用；若要做跨代码块 `#L3`，需要处理重复 id。
7. **图片查看器**：双指缩放/说明/键盘已完成；如要支持旋转与双指平移，再扩展 Pointer Events。
8. **动态 OG**：目前本地生成后提交；标题常改时可把 `tools/gen-og-images.js` 接进写作流程或 CI。
9. **清理确认（未删除）**：`source/pet/` 的 2.7MB WebM 已进入版本库但构建时跳过部署；`.claude/launch.json` 仍未跟踪。是否移出版本库/删除需你明确确认。

## 已知边界

- Swup 的 `native: true` View Transition 实测会让首页快照多花约 350ms（content:replace 37→381ms），已回退，只保留主题切换的 View Transition。
- 首页字体 preload 后仍有约 180ms 的整页布局任务；CLS 不受影响。
- Live2D 模型约 3MB，移动端跳过，桌面端在 load 后空闲加载；这是当前最大的单页网络成本。
- JSON Feed 是加分项而非 SEO 必需；保留它是因为成本低、对脚本消费者友好。
- OG 卡是本地 Chrome 渲染产物；换机器/改标题后重新跑 `npm run og:images`。
- 主题补丁目标是 `hexo-theme-redefine@2.9.0`，升级前先核对 `scripts/theme-patch.js` 的标记。
