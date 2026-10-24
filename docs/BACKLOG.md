# 续作清单（2026-10-24）

这份文档记录这一轮已经做完的事、验证过的数字，以及之后可以继续做的方向。主线程收尾时留下，方便下次直接接上。

## 2026-10-24 这一轮新增

- **导航胶囊材质统一**：滚动收缩后的胶囊改用和文章卡片相同的 `--background-color-transparent-80` + `--border-color`，去掉单独的 `backdrop-filter`，两种“玻璃”不再混用。
- **Live2D 显式召唤**：默认不请求任何 Live2D 资源；桌面左下角显示“召唤宠物”，点击后才加载约 4MB 模型。宠物自带的退出会记住关闭状态，返回访客按 localStorage 恢复。
- **边注**：新增 `{% margin %}...{% endmargin %}`。≥1680px 浮在正文左页边，与引用行对齐；窄屏点击 ※ 打开底部卡片（Esc/点外部收起，焦点回到引用）。
- **内链悬停预览**：构建期输出 `link-preview.json`（32 条，约 10KB / gzip 4KB）；桌面悬停或 Tab 聚焦文章内链时显示标题、摘要、封面、分类日期；移动端直接跳转。
- **脚注悬停预览**：复用构建期 `#fn-*`，悬停或聚焦脚注引用时显示正文，不打断阅读。
- **公式复制**：块级公式右上角出现 TeX 按钮，读取 MathML `annotation` 的源码写入剪贴板。
- **阅读设置**：侧栏三档字号 + 专注模式（隐藏目录/相关阅读、正文居中、Esc 或底部按钮退出）；≤880px 用左下角 Aa 打开底部设置卡。head 内联脚本在首屏前应用，刷新不闪字号。
- **引用与分享**：head 输出 `citation_title` / `citation_author` / `citation_publication_date` 等 Highwire 元数据；侧栏分享按钮改为菜单，可复制 Markdown 引用、BibTeX、APA 和链接；引用 JSON 放在正文里，Swup 换页后自动更新。
- **反向链接**：构建期扫描 23 篇文章的正文内链，在目标文章底部列出“引用本文的文章”和引用处上下文；18 篇有至少一条来源，没有来源的文章不渲染空区块。
- **键盘快捷键**：`?` 打开原生 `<dialog>` 快捷键面板；`t` 切换明暗主题；`g h` / `g a` 快速回首页/归档；输入框聚焦或弹层打开时不触发。
- **新文章**：《读完一篇长文，不该被打断》进入博客工程化系列第 7 篇，记录边注、预览、引用、反向链接、阅读设置和快捷键，以及按页拆包被测量否决的原因。
- **OG 卡防过期**：生成器同时写 `og-manifest.json`，`test:content` 比对文章标题；改了标题但忘记重跑 `npm run og:images` 时 CI 直接失败，不需要在 CI 里装 Chrome。
- **图片查看器双指平移**：缩放后两指同向移动复用主题的拖拽逻辑，把中点位移翻译成 mousedown/mousemove/mouseup，不另写 transform 状态；测试用 CDP 真实多点触摸验证。
- **测试**：新增 `test:features`，目前 89 项；浏览器检查合计 447 项，23 篇内容检查，100 个 HTML 内链检查。

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

1. **按页拆 CSS/JS**：Chrome coverage 实测 custom.css 只用到 14–30%、custom.js 29–40%，但 Swup 只替换 `#swup`，head 里按页注入的 `<link>` 在 SPA 跳转时不会生效。正确做法是把条件样式 `<link>` 放进被替换的正文或用运行时 loader；收益约 8–10KB gzip/页，风险高于收益，暂时搁置。
2. **Cloudflare 缓存头落地**：`docs/DEPLOYMENT.md` 已给出精确的 Transform Rule（`immutable`）和 Cache Rule（HTML 回源），待在控制台执行并用 `curl -I` 验证。
3. **代码行全局锚点**：`#cb1-L3` 已可用；跨代码块 `#L3` 需要处理重复 id，价值一般。
4. **图片查看器**：双指缩放、平移、说明、键盘已完成；旋转会牵动主题的 fit 计算，暂未做。
5. **OG 卡自动生成**：`og-manifest.json` 已能在 CI 发现标题漂移；要在 CI 直接重渲染，需要安装 Chrome 并接受约 1 分钟构建时间。
6. **清理确认（未删除）**：`source/pet/` 的 2.7MB WebM 已进入版本库但构建时跳过部署；`.claude/launch.json` 仍未跟踪。是否移出版本库/删除需你明确确认。

## 已知边界

- Swup 的 `native: true` View Transition 实测会让首页快照多花约 350ms（content:replace 37→381ms），已回退，只保留主题切换的 View Transition。
- 首页字体 preload 后仍有约 180ms 的整页布局任务；CLS 不受影响。
- Live2D 模型约 3MB，默认不加载；用户点击“召唤宠物”后才请求，移动端（≤900px）不显示入口。
- 边注只在 ≥1680px 进左页边，更窄时用底部卡片；内链预览只在桌面 hover/键盘聚焦时出现。
- 阅读设置只改正文字号，标题仍走主题 rem 阶梯；专注模式只作用于文章页。
- JSON Feed 是加分项而非 SEO 必需；保留它是因为成本低、对脚本消费者友好。
- OG 卡是本地 Chrome 渲染产物；`og-manifest.json` 记录标题，`test:content` 会在标题变化但没重跑 `npm run og:images` 时失败。
- 主题补丁目标是 `hexo-theme-redefine@2.9.0`，升级前先核对 `scripts/theme-patch.js` 的标记。
- 构建缓存按文章源文件内容哈希失效；改 `scripts/` 里的 tag/renderer 后需要重建缓存或改动文章内容才会重新渲染。
