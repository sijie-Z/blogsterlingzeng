# 浏览器写作：Pages CMS

这个仓库根目录的 `.pages.yml` 给 [Pages CMS](https://app.pagescms.org) 用。配置好之后，文章和说说都可以在浏览器或手机上写，保存会自动提交到 `main`，再由 GitHub Actions 构建部署。

## 一次性设置

1. 打开 <https://app.pagescms.org>，用 GitHub 登录。
2. 安装 Pages CMS 的 GitHub App，只授权 `sijie-Z/blogsterlingzeng` 这个仓库即可。
3. 选择仓库和 `main` 分支；Pages CMS 会读取根目录的 `.pages.yml`。
4. 侧栏会出现“文章”和“说说”两个入口。

不需要在仓库里放 token，也不需要自建服务。Pages CMS 的权限可以在 GitHub 的 **Settings → Applications → Pages CMS** 里随时撤销。

## 写文章

在“文章”里新建或打开一篇：

| 字段 | 说明 |
|---|---|
| 标题 | 中文标题，显示在卡片和文章页 |
| URL 文件名（英文） | 新建时必填，例如 `hexo-series-reading-path`；决定 `/年/月/日/slug/` |
| 发布时间 | 到分钟，格式 `YYYY-MM-DD HH:mm:ss` |
| 描述 / SEO 摘要 | 卡片摘要、meta description、搜索结果都用它 |
| 分类 | 固定选项，可多选；新增分类需要改 `.pages.yml` |
| 标签 | 自由填写，回车添加 |
| 封面图 | 从 `source/images` 选，或直接上传 |
| 所属系列 / 系列内顺序 | 可选；不属于系列就留空 |
| 置顶 | 对应 `sticky: true` |
| 发布 | 关闭后 Hexo 不生成这篇文章，可当草稿 |
| 正文 | Markdown 源码编辑器（CodeMirror），原样保留 `<!-- more -->` 和 Hexo 标签 |

保存相当于在 `main` 上提交一次，随后触发 **Deploy Blog**。通常 1–3 分钟后线上更新；可以在 GitHub Actions 里看进度。

### 为什么正文不是所见即所得

Pages CMS 的 `rich-text` 编辑器在保存时会删掉 HTML 注释（包括 Hexo 的 `<!-- more -->`），也可能改写 `{% ... %}` 标签。这个站点有 20 篇文章依赖 `<!-- more -->` 控制首页摘要，所以正文用 **Markdown 源码编辑器**（CodeMirror 高亮），保存时按字符串原样写回。

这意味着正文里要自己写 Markdown 和 Hexo 语法，但不会被编辑器悄悄改坏；标题、描述、分类、标签、封面等仍然是表单字段。

### slug 和旧文章

旧文章没有 `slug` 字段，文件名已经是英文，直接编辑时把“URL 文件名”留空即可，Pages CMS 不会改已有文件名。新建文章时填英文短横线，文件名会按 `slug.md` 生成。

## 写说说

“说说”入口直接编辑 `source/_data/essays.yml` 里的顶层数组：

- 每条只有“日期”和“内容”两个字段。
- 内容支持 Markdown；多条按日期倒序显示。
- 新增一条就追加到数组；页面 `/shuoshuo/` 会自动按日期排序。

## 视频

“视频”入口编辑 `source/_data/videos.yml`。每条需要稳定的视频 ID、标题、话题，以及一个上传视频或外部/R2 地址；封面和标签可选。上传的小视频进 `source/videos/media/`，大文件建议放 R2。

“视频话题”入口编辑 `source/_data/video-topics.yml`，最多 10 个；顺序就是页面顺序。视频里的“话题”要写同名，页面会自动生成切换标签。收藏和永久保存的边界见 [docs/VIDEOS.md](VIDEOS.md)。

## 图片

- 封面图用“封面图”字段上传；上传都进 `source/images/`，写入内容时使用 `/images/...`。
- 正文里插入图片：先在封面字段或媒体库把图片传进 `source/images/`，再在 Markdown 源码里写 `![说明](/images/文件名.webp)`。
- 上传时会把文件名 slug 化；尽量用英文文件名，避免中文和空格。
- 封面图建议先用 WebP，长边 1200–1600px；仓库和部署产物都会变轻。

## 边界与注意事项

- Pages CMS 直接提交默认分支（当前 `main`），没有 PR 预览；保存前确认字段。
- `.pages.yml` 里开启了 `settings.content.merge: true`，表单没列出的 front matter 键（比如手工加的字段）会保留。
- 它不运行 `test:content`；提交后 CI 仍会检查 front matter、站内链接和 OG 卡。CI 失败时先看 Actions 日志。
- 不能编辑 `_config.yml`、CSS/JS 和主题补丁；这些仍然走代码流程。
- 想改分类选项或增加新 collection，改 `.pages.yml` 后提交即可。
