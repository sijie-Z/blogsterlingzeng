# 续作清单（2026-10-23）

这份文档记录这一轮已经做完的事、验证过的数字，以及之后可以继续做的方向。主线程收尾时留下，方便下次直接接上。

## 这一轮已完成

- 项目页改为 **3 个案例 + 4 个紧凑条目**：每个案例包含问题、约束、关键决策、证据、边界和本人角色；MiQroGate 明确写出“规格/审查由我负责，实现主要由 Claude Code 完成”和“真实凭证未联调”。
- 关于页改成 30 秒可扫读：求职方向、三个项目入口、按“在哪用过”分组的技术栈（移除无法验证的熟练度百分比）、精简时间线；新增 `/resume/` 一页式简历（可打印 / 存 PDF），导航加入“简历”。
- 文章新增 callout（MiQroGate 的验证边界、DocMind 的评测集口径、quant 的结论边界）；侧栏新增“复制 Markdown 原文”按钮；代码块新增语言徽标。
- 性能：FontAwesome 全量 CSS 换成 65KB 类名子集；移除 375KB 的 moment（essays 页改用 Intl）；移除 8.4MB 未引用的全量 webfonts；移除 Google Fonts 无用 preconnect；首屏标题/正文字体加 woff2 preload；暗色横幅改懒加载；pangu 不再改整页标题（文章首屏 CLS 回到 0.0001）；APlayer 改为 12 秒后才加载，无歌词时不再请求 LRC；关闭 odometer 并移除其 JS/CSS；Typed 只在首页加载。
- SEO：`max-image-preview:large`；sitemap 去掉 `index.html`；28 张 1200×630 OG 分享卡（文章 / 系列 / 首页 / 项目 / 关于 / 简历），补齐 `og:image:width/height/alt`；站点级和系列级 JSON Feed 1.1。
- 无障碍：首次 SPA 跳转也会播报并聚焦新页 h1；图片查看器 Tab 限制在弹层内、背景 inert；TOC 加 navigation landmark；代码复制/折叠改为原生按钮并播报结果；标题锚点名称带标题文本；skip 落点补 scroll-margin 与焦点样式。
- 测试：338 项浏览器检查 + 22 篇内容检查全部通过；axe-core 桌面/移动端 9 类页面（含项目、简历）0 违规。
- 后续补强：文章页可见面包屑（与 BreadcrumbList 对齐）；图片查看器显示 figcaption/alt 并接 `aria-describedby`；`timeline` Hexo 标签替换关于页时间线；站内搜索改为 `field: all`，简历/项目/关于也能被搜到；构建期脚注（`[^id]` → doc-noteref / doc-endnotes）；首页加“项目 / 简历 / 系列”三张快速入口卡；代码块支持 `{% codeblock %}` 文件名标题与 `mark:` 行高亮；修复 APlayer 无歌词时请求 LRC 的 404；修复系列页 JSON-LD 图片回退问题；补充 Nginx 缓存头文档。

## 验证数字

- 文章首屏 CLS：0.0001；首页首屏 CLS：0.002–0.004。
- 点击 → 内容替换：约 21–43ms；点击 → 导航结束：134–246ms。
- 部署产物：约 25MB（含 28 张 OG 卡）；原 33MB+。
- FontAwesome CSS：65KB；字体子集：solid 5KB / regular 7KB / brands 1KB。
- `npm run test:assets` 39、`test:a11y` 61、`test:sidebar` 36、`test:transitions` 44、`test:series` 53、`test:search` 17、`test:smooth` 26、`test` 33、`test:resume` 7、`test:archive` 12。

## 下次可以继续做（按价值排序）

1. **线上缓存头**：给 Nginx / Cloudflare 的带版本号静态资源加 `Cache-Control: public, max-age=31536000, immutable`，HTML 短缓存。这是首屏之外最大的重复访问收益，本次只写进了文档，没有服务器权限落地。
2. **边注**：脚注已支持；Maggie Appleton 式的右侧边注需要 ≥1440px 布局和额外的 hover/focus 预览，暂不做。
3. **代码块文档化**：`{% codeblock %}` 文件名标题、`mark:` 行高亮和行号永久链接（`#cb1-L3`）都已落地；剩下的是跨代码块的全局 `#L3` 语义（需要处理重复 id）。
4. **图片查看器**：双指缩放、说明文字和 aria 关联均已完成；如果以后要支持旋转/平移手势，再扩展 Pointer Events。
5. **`content-visibility: auto`**：已实测给 `#giscus-container` 加会让文章页 final CLS 升到 0.0998（评论高度估算不准），已回退；如果要做，需要给评论容器固定高度或改用 IntersectionObserver 懒加载 iframe。
6. **数学公式**：若要写算法/GIS 公式，优先构建期渲染（KaTeX/MathJax SVG），不引客户端大包；mermaid 目前刻意关闭，重新启用前先评估包体与 Swup 重初始化。
7. **主题标签**：timeline 已落地；gallery 可作为 Hexo tag plugin 补上，用在项目复盘与照片页；主题已有 callout / tabs / folding。
8. **动态 OG**：目前是本地生成后提交；标题常改的话，把 `tools/gen-og-images.js` 接进写作流程或 CI（需要中文字体与 Chrome）。
9. **备份清理（需明确授权，未执行）**：`source/pet/` 约 2.7MB 的 webm 目前没有任何代码引用，但仍在构建产物里；`.claude/launch.json` 是本机启动配置。两者都未提交、未删除，等确认用途后再处理。

## 已知边界

- Swup 的 `native: true` View Transition 在本站实测会让首页快照多花约 350ms（content:replace 37→381ms），已回退，只保留主题切换的 View Transition；换页仍用 0.28s 入场动画。
- 首页首屏冷启动的整页布局任务从约 300ms 降到约 180ms（字体 preload 生效）；仍有一次字体/布局成本，CLS 不受影响。下一步若要继续压，减少首屏 backdrop-filter 或把字体换成 `font-display: optional`。
- JSON Feed 是加分项而非 SEO 必需；参考站点大多只提供 Atom。保留它是因为成本低、对脚本消费者友好。
- OG 卡是本地 Chrome 渲染产物；换机器/改标题后重新跑 `npm run og:images`。
- 主题补丁目标是 `hexo-theme-redefine@2.9.0`，升级前先核对 `scripts/theme-patch.js` 的标记。
