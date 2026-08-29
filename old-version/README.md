# old-version — 本地未提交的旧版设计草稿(归档)

> 归档时间:2026-08-29
> 来源:本机 working tree 上未提交的改动(基于 commit `fff3e63`)
> 用途:与 GitHub 最新版(main)对照,把有用的功能/样式移植过去后,整个文件夹可删除。

## 内容说明

| 路径 | 说明 |
|---|---|
| `_config.redefine.yml` / `_config.yml` | 旧版配置(注入了 `themes.css` / `theme-switcher.js`) |
| `source/css/themes.css` | 旧版 6 套主题变量(明亮/暗黑/春夏秋冬) |
| `source/js/theme-switcher.js` | 旧版导航栏主题下拉切换 + 手电筒 + 秒表 |
| `source/css/custom.css` / `source/js/custom.js` | 旧版全套样式与交互 |
| `source/images/` | 旧版的四季横幅(jpg/svg)与 live-wallpaper 图片 |
| `source/_data/`、`source/about/`、`source/projects/` | 旧版数据与页面 |
| `参考/` | 设计参考截图(2026-05-10) |

## 与新版(main)的主要区别

- **旧版**:手动切换 6 套主题(导航栏下拉),每季一张 banner 图,附带手电筒 / 秒表 / 猫吉祥物 / 点赞阅读统计
- **新版**:按月份自动换季(`html[data-season]`),明暗交给 Redefine 自带开关,附带相关阅读 / GitHub 项目卡片 / 复制链接

## 注意

- 壁纸源视频(约 483MB)仍在本机 `source/videos/`,未入库(GitHub 单文件上限 100MB,且已加入 .gitignore)
