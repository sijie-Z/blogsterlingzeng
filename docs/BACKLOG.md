# 续作清单（2026-10-26）

这份文档记录这一轮已经做完的事、验证过的数字，以及之后可以继续做的方向。主线程收尾时留下，方便下次直接接上。

## 2026-10-24 ~ 10-25 这一轮新增

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
- **文章导航与 404**：文末按发布日期生成“更早/更新一篇”，head 输出 `rel=prev/next`，`[` `]` 快捷键复用链接点击；404 页补最近 5 篇文章。顺手修掉主题 Giscus 主题同步在 iframe 被换页移除后对 null `contentWindow` 调 `postMessage` 的报错。
- **信息架构**：主导航 7 → 5（项目 / 关于 / 系列 / 友链），简历从关于页、首页 hero 和项目页进入，归档 / 标签 / 书签收进页脚展开态；关于页顶部改成“查看简历”主按钮 + 三个文字入口，系列页底部补归档入口（归档页本来就有系列入口）。
- **CI 时区修复**：Content Check 从加入起就没绿过，根因是 GitHub Actions 用 UTC 构建，`hexo-series-reading-path` 的 `00:00` 日期被排到前一天，站内链接指向 `/10/23/` 而产物在 `/10/22/`，线上那篇确实 404。两个 workflow 现在固定 `TZ: Asia/Shanghai`，文章时间改到 10:00，旧 URL 加了跳转页并用 `scripts/redirects.js` 从 sitemap/搜索索引移除，`test:content` 会拦住 08:00 之前的日期。
- **视觉与可用性修复（2026-10-25）**：主导航改为实色、去掉主题的整条 `backdrop-filter`，滚动胶囊与页面卡片同一材质；桌面导航改为 logo 左 / 链接居中 / 控件右；系列总览改为 2×2 大卡并常驻 `series.css`，修复线上卡片退化成一行文字的问题；关于页加简历主按钮和 PDF 入口；打印强制浅色并隐藏所有固定浮层；APlayer 关闭（占位音轨会遮挡正文），宠物缩到 170px 并在向下阅读时淡出；简历页新增三份 PDF 下载。
- **归档页重做（2026-10-25 第二轮）**：归档合并为一页（旧 `/archives/page/2/`、`/page/3/` 保留 meta refresh 跳转）；新增页头（归档标题、时间范围、23 篇/3.8 万字/13 个写作日/4 个系列）、写作热力图与系列入口双栏、每条文章的分类与阅读时间；年份使用 h2、文章标题使用 h3；分页器移除。
- **标签 / 分类页**：引导语移到列表上方，标签按文章数降序、去掉按权重模糊，改成可扫读胶囊；分类按文章数降序、两列铺满、整卡可点。
- **次级页面修补**：说说页重复 `id="shuoshuo-content"` 改为唯一、静态 HTML 写入中文日期；站点视觉页补导语、加载提示和 `<noscript>` 静态图集，并加入页脚入口；关于页去掉连续分隔线；友链“申请友链”改为 h2；系列名称改为 h2；回到顶部补 role/tabindex/aria-label。
- **可访问性与遮挡**：白字主按钮改用 `--primary-color-strong`（暗色 #2563eb / 亮色 #1d4ed8），修复首页与关于页 CTA 对比度；移动端向下阅读时 Aa、引用和右侧工具栏淡出；边注 ※ 与标题锚点扩大点击区域；分类整卡可点。
- **页脚与标记**：长页面自动收起常驻页脚，向上滚或触底展开；短页面保持可见；`data-cj-post` 只写在文章页，避免非文章页误用专注模式。
- **滚动卡顿第二轮**：首页横幅滚过半屏后的全屏 `blur(15px)`、侧栏/回到顶部/页脚的 `backdrop-filter`、主题每个 scroll 事件的 `navbar-shrink` / 工具条 class 切换，是软件渲染下 40fps 的主因。改为清晰横幅 + 实色面板 + 状态变化才改 class，首页 p50 25ms→8ms、p95 50ms→25ms。首屏 init 的同步 `scrollHeight` 读取、SPA 换页后的焦点/侧栏/高度读取也延后到 idle。
- **移动端遮挡**：隐藏右侧工具条，阅读设置/引用改成文章统计行里的内联按钮；文章封面标题改为实色卡片，移动端面包屑不再重复标题。
- **缓存**：主题 `main.js` 与被打补丁的模块加 `?v=20261026f`，避免 4 小时 JS 缓存继续用旧滚动逻辑；`custom.js` 同步到 `ae`，`custom.css` 同步到 `x`。
- **对抗性修复（2026-10-26）**：隐藏导航在键盘聚焦时重新进入视口；移动抽屉沿祖先链把正文/导航/工具条全部 inert，只保留抽屉和遮罩；`localStorage` 被禁时字号/专注改用 `window.__cjPrefs` 内存副本仍可切换；引用菜单按 Tab 先回到触发按钮，不再跳回 skip link；图片查看器把主题的 `.is-disabled` 同步成原生 `disabled`/`aria-disabled`；giscus iframe 载入前移出 Tab 顺序，load 后恢复；首页缩略图链接退出 Tab 顺序；季节/计时按钮补 `type="button"`。
- **内容与兜底（2026-10-26）**：原生 `loading="lazy"`/`decoding="async"` 替代主题 `loading.svg` 占位（`articles.lazyload: false` + `scripts/native-images.js`）；照片墙补 `<noscript>` 静态图集和失败提示；搜索索引/画廊加载失败不再永久转圈；相关阅读补前导斜杠；归档年/月页和首页分页补唯一 title/description/og；旧文章与归档分页改纯 HTML canonical 跳转；打印隐藏 skip link、内联阅读/引用按钮和右侧工具条。
- **第二轮对抗审计（2026-10-26）**：搜索 overlay 的 inert observer 改为按当前节点绑定，关闭时先释放背景再归还焦点（首次加载和 SPA 都生效）；搜索结果去掉 `role=option` 内嵌链接，改用 `data-cj-href` 跳转；移动端设置卡调字号不再关闭卡片，点遮罩关闭会归还焦点；打印首页隐藏横幅/侧栏/缩略图并单列排布，表格/代码强制换行，表头补深色文字；短页面页脚直接静态排布，不再盖住系列归档入口；照片墙在 `main.js`/MiniMasonry 被拦截 4 秒后显示静态图集；`forced-colors` 下站名与 404 数字恢复可见；giscus 被拦截 8.5 秒后显示 GitHub 讨论入口；sitemap 补归档年/月页，分类/标签页 `og:title` 加类型前缀；移动端阅读/引用按钮实测命中区补到 44px。
- **用户旅程与内容可信度（2026-10-26 第三轮）**：移动抽屉增加非 inert 的真实关闭按钮，并在 SPA/后退时统一清理锁定；首页社交区不再遮挡简历 CTA；首屏补充真实身份与求职方向，侧栏移除无意义的 Lv3。搜索换词回顶部、英文按词边界、完整标题优先、索引返回后主动渲染；后退恢复关键词/结果/滚动位置，同时兼容 Swup 与历史文档恢复。相关阅读渲染后按 Swup 缓存校正后退位置；代码随阅读字号缩放；320px 隐藏次要计时器，页脚提供返回顶部。暗色首屏改为两张真实地址的原生懒加载，只下载可见横幅；友链两张失效头像改为自托管。内容修正二分答案上界、Docker 卷与密码、Grid 区域、闭包释放、React cleanup、NFT 拍卖下溢与 ERC721A 原理；NFT 明示 fork 与贡献边界，MiQroGate 按公开仓库更新为 8 家 23 个产品和路由快照口径，DocMind/MindPilot 的 Reranker 归属统一，裸露 Markdown 纳入 `test:content`。
- **历史复核续修（2026-10-26 第四轮）**：搜索后退恢复增加本次渲染时间戳与可滚动条件，避免高度过渡把 850px 钳成 0；手动 Esc/关闭/背景点击才清除恢复标记，普通换页不再被重复观察者误清；搜索打开时换页统一清理 body 级 inert。季节下拉与计时器支持 Esc 关闭并归还焦点，开始/暂停焦点跟随可见按钮，季节选项补 `aria-pressed`；专注阅读焦点移到退出按钮；阅读/边注卡的 skip link 等 body 外背景也完整 inert。
- **测试**：新增 `test:pages`（52 项）；`test:archive` 19、`test:transitions` 59、`test:a11y` 73、`test:assets` 51、`test:search` 29、`test:smooth` 28；浏览器检查合计 546 项，23 篇内容检查，99 个 HTML 内链检查。

## 2026-10-23 第一轮（历史记录）

- 项目页改为 **3 个案例 + 4 个紧凑条目**：每个案例包含问题、约束、关键决策、证据、边界和本人角色；MiQroGate 明确写出“规格/审查由我负责，实现主要由 Claude Code 完成”和“真实凭证未联调”。
- 关于页改成 30 秒可扫读：求职方向、三个项目入口、按“在哪用过”分组的技术栈（移除无法验证的熟练度百分比）、精简时间线；新增 `/resume/` 一页式简历（可打印 / 存 PDF），导航加入“简历”。
- 文章新增 callout（MiQroGate 的验证边界、DocMind 的评测集口径、quant 的结论边界）；侧栏新增“复制 Markdown 原文”按钮；代码块新增语言徽标。
- 性能：FontAwesome 全量 CSS 换成 65KB 类名子集；移除 375KB 的 moment（essays 页改用 Intl）；移除 8.4MB 未引用的全量 webfonts；移除 Google Fonts 无用 preconnect；首屏标题/正文字体加 woff2 preload；暗色横幅改懒加载；pangu 不再改整页标题（文章首屏 CLS 回到 0.0001）；APlayer 改为 12 秒后才加载，无歌词时不再请求 LRC；关闭 odometer 并移除其 JS/CSS；Typed 只在首页加载。
- SEO：`max-image-preview:large`；sitemap 去掉 `index.html`；31 张 1200×630 OG 分享卡（文章 / 系列 / 首页 / 项目 / 关于 / 简历），补齐 `og:image:width/height/alt`；站点级和系列级 JSON Feed 1.1。
- 无障碍：首次 SPA 跳转也会播报并聚焦新页 h1；图片查看器 Tab 限制在弹层内、背景 inert；TOC 加 navigation landmark；代码复制/折叠改为原生按钮并播报结果；标题锚点名称带标题文本；skip 落点补 scroll-margin 与焦点样式。
- 测试：357 项浏览器检查 + 22 篇内容检查全部通过；axe-core 桌面/移动端 9 类页面（含项目、简历）0 违规。
- 后续补强：文章页可见面包屑（与 BreadcrumbList 对齐）；图片查看器显示 figcaption/alt 并接 `aria-describedby`；`timeline` Hexo 标签替换关于页时间线；站内搜索改为 `field: all`，简历/项目/关于也能被搜到；构建期脚注（`[^id]` → doc-noteref / doc-endnotes）；首页加“项目 / 简历 / 系列”三张快速入口卡；代码块支持 `{% codeblock %}` 文件名标题与 `mark:` 行高亮；修复 APlayer 无歌词时请求 LRC 的 404；修复系列页 JSON-LD 图片回退问题；补充 Nginx 缓存头文档。

## 2026-10-24 审计修复（历史记录）

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
6. **清理确认（未删除）**：`source/pet/` 的 2.7MB WebM 已进入版本库但构建时跳过部署。是否移出版本库/删除需你明确确认。

## 已知边界

- Swup 的 `native: true` View Transition 实测会让首页快照多花约 350ms（content:replace 37→381ms），已回退，只保留主题切换的 View Transition。
- 首页字体 preload 后仍有约 180ms 的整页布局任务；CLS 不受影响。
- Live2D 模型约 3MB，默认不加载；用户点击“召唤宠物”后才请求，移动端（≤900px）不显示入口。
- 边注只在 ≥1680px 进左页边，更窄时用底部卡片；内链预览只在桌面 hover/键盘聚焦时出现。
- 阅读设置改正文与代码字号，标题仍走主题 rem 阶梯；专注模式只作用于文章页。
- JSON Feed 是加分项而非 SEO 必需；保留它是因为成本低、对脚本消费者友好。
- OG 卡是本地 Chrome 渲染产物；`og-manifest.json` 记录标题，`test:content` 会在标题变化但没重跑 `npm run og:images` 时失败。
- 文章导航的 head rel 链接只在首屏 HTML 生效（Swup 不替换 head）；文末卡片和 `[` `]` 每次换页都会用当前页数据。
- Giscus 主题同步在 iframe 被换页移除后会报 null `contentWindow`，`theme-patch.js` 已加守卫。
- 打印样式强制浅色；深色模式打印简历/文章不会反色，固定浮层全部隐藏。
- APlayer 已关闭：占位音轨会显示 “123 - Unknown”，固定播放器展开会遮挡正文；2.5MB mp3 不再部署。
- 宠物画布 170px，向下阅读淡出、向上滚恢复，减少对正文的遮挡。
- 主题补丁目标是 `hexo-theme-redefine@2.9.0`，升级前先核对 `scripts/theme-patch.js` 的标记。
- 构建缓存按文章源文件内容哈希失效；改 `scripts/` 里的 tag/renderer 后需要重建缓存或改动文章内容才会重新渲染。
- 站点时区是 `Asia/Shanghai`，CI 两个 workflow 都设 `TZ=Asia/Shanghai`；`test:content` 拦截 08:00 之前的日期，避免 UTC 构建把文章路径移到前一天。
- 归档从 2026-10-25 起是一页；旧 `/archives/page/2/`、`/page/3/` 是 meta refresh 跳转页，不在 sitemap/搜索索引里。
- 标签/分类按文章数降序是构建期排序；新增文章后重新 generate 即可，不需要手动维护。
- 站点视觉页的图集仍由主题 masonry 前端渲染；无 JS 使用静态图集，入口脚本/布局库失败时 4 秒后也由静态图集接管，静态图不参与灯箱。
- 长页面页脚默认收起，只在触底展开为静态文档流；短页面直接静态显示。移动端 Aa/引用内联在文章统计行，右侧工具栏隐藏。
- 三份定向 PDF 没有可编辑源文件，且部分项目事实与在线简历不同。本轮只按公开仓库更新在线页，没有为了表面一致而重写 PDF；需要保持中文/英文和岗位方向的源文件后再重新导出。
- `data-cj-post` 只写在文章页；归档、标签、关于等页面的专注模式不会生效。
