# 续作清单（2026-10-23）

这份文档记录这一轮已经做完的事、验证过的数字，以及之后可以继续做的方向。主线程收尾时留下，方便下次直接接上。

## 这一轮已完成

- 项目页改为 **3 个案例 + 4 个紧凑条目**：每个案例包含问题、约束、关键决策、证据、边界和本人角色；MiQroGate 明确写出“规格/审查由我负责，实现主要由 Claude Code 完成”和“真实凭证未联调”。
- 关于页改成 30 秒可扫读：求职方向、三个项目入口、按“在哪用过”分组的技术栈（移除无法验证的熟练度百分比）、精简时间线；新增 `/resume/` 一页式简历（可打印 / 存 PDF），导航加入“简历”。
- 文章新增 callout（MiQroGate 的验证边界、DocMind 的评测集口径、quant 的结论边界）；侧栏新增“复制 Markdown 原文”按钮；代码块新增语言徽标。
- 性能：FontAwesome 全量 CSS 换成 65KB 类名子集；移除 375KB 的 moment（essays 页改用 Intl）；移除 8.4MB 未引用的全量 webfonts；移除 Google Fonts 无用 preconnect；暗色横幅改懒加载；pangu 不再改整页标题（文章首屏 CLS 回到 0.0001）；Swup 启用 native View Transitions（180ms，固定导航不参与快照）。
- SEO：`max-image-preview:large`；sitemap 去掉 `index.html`；28 张 1200×630 OG 分享卡（文章 / 系列 / 首页 / 项目 / 关于 / 简历），补齐 `og:image:width/height/alt`；站点级和系列级 JSON Feed 1.1。
- 无障碍：首次 SPA 跳转也会播报并聚焦新页 h1；图片查看器 Tab 限制在弹层内、背景 inert；TOC 加 navigation landmark；代码复制/折叠改为原生按钮并播报结果；标题锚点名称带标题文本；skip 落点补 scroll-margin 与焦点样式。
- 测试：328 项浏览器检查 + 21 篇内容检查全部通过；axe-core 桌面/移动端 9 类页面（含项目、简历）0 违规。

## 验证数字

- 文章首屏 CLS：0.0001；首页首屏 CLS：0.002–0.004。
- 点击 → 内容替换：约 21–43ms；点击 → 导航结束：134–246ms。
- 部署产物：约 25MB（含 28 张 OG 卡）；原 33MB+。
- FontAwesome CSS：65KB；字体子集：solid 5KB / regular 7KB / brands 1KB。
- `npm run test:assets` 39、`test:a11y` 61、`test:sidebar` 36、`test:transitions` 44、`test:series` 53、`test:search` 17、`test:smooth` 26、`test` 33、`test:resume` 7、`test:archive` 12。

## 下次可以继续做（按价值排序）

1. **线上缓存头**：给 Nginx / Cloudflare 的带版本号静态资源加 `Cache-Control: public, max-age=31536000, immutable`，HTML 短缓存。这是首屏之外最大的重复访问收益，本次只写进了文档，没有服务器权限落地。
2. **脚注 / 边注**：marked 4.3 不支持 `[^1]`。可选方案：加 marked extension（中等成本），或在文章里继续用 callout；Maggie Appleton 式的边注需要 ≥1440px 布局。
3. **代码块文档化**：行号锚点（`#L3`）、`{% codeblock %}` 文件名 caption、`mark:` 行高亮。主题已支持部分能力，目前内容还没用起来。
4. **图片查看器**：双指缩放；把 figcaption/alt 显示在弹层里并接到 `aria-describedby`。
5. **`content-visibility: auto`**：先给 `#giscus-container`、相关阅读等首屏外大块加，配 `contain-intrinsic-size`；需要复测滚动高度与锚点定位。
6. **数学公式**：若要写算法/GIS 公式，优先构建期渲染（KaTeX/MathJax SVG），不引客户端大包；mermaid 目前刻意关闭，重新启用前先评估包体与 Swup 重初始化。
7. **主题标签**：timeline / gallery 可作为 Hexo tag plugin 补上，用在项目复盘与照片页；主题已有 callout / tabs / folding，可直接在文章里用。
8. **动态 OG**：目前是本地生成后提交；标题常改的话，把 `tools/gen-og-images.js` 接进写作流程或 CI（需要中文字体与 Chrome）。
9. **备份清理（需明确授权，未执行）**：`source/pet/` 约 2.7MB 的 webm 目前没有任何代码引用，但仍在构建产物里；`.claude/launch.json` 是本机启动配置。两者都未提交、未删除，等确认用途后再处理。

## 已知边界

- 系列页 `CollectionPage` 的 JSON-LD `image` 仍可能回退到 `og-banner.jpg`，但页面 `og:image` 已是生成的系列卡；原因待查（`page.og_image` 在系列生成页上的传递）。
- JSON Feed 是加分项而非 SEO 必需；参考站点大多只提供 Atom。保留它是因为成本低、对脚本消费者友好。
- OG 卡是本地 Chrome 渲染产物；换机器/改标题后重新跑 `npm run og:images`。
- 主题补丁目标是 `hexo-theme-redefine@2.9.0`，升级前先核对 `scripts/theme-patch.js` 的标记。
