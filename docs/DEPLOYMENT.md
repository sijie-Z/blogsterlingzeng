# 部署与运维手册

> 本文档记录博客的完整架构、关键账号位置和日常维护操作。
> 更新日期:2026-09-01

## 架构总览

```
用户访问 https://sterlingzeng.cn
        ↓
阿里云(域名注册 · 所有权 · 续费 · 实名)
        ↓
Cloudflare(DNS 解析 · HTTPS 证书 · CDN 加速 · DDoS 防护)
        ↓
GitHub Pages(内容托管 · 静态文件)
        ↓
GitHub Actions(push 后自动构建部署)
```

| 层 | 服务商 | 负责什么 | 操作入口 |
|----|--------|---------|---------|
| 域名 | 阿里云 | 域名所有权、续费、实名认证 | 阿里云域名控制台 |
| 解析+证书 | Cloudflare | DNS 记录、HTTPS 证书、CDN、防护 | dash.cloudflare.com |
| 内容 | GitHub Pages | 博客文件托管 | 仓库 `sijie-Z/blogsterlingzeng` |
| 构建 | GitHub Actions | push 后自动构建部署 | 仓库 Actions 页面 |

## 关键账号

- **域名**:阿里云,域名 `sterlingzeng.cn`(备案号:蜀ICP备2026016586号)
- **Cloudflare**:邮箱 `Zsj1683039482@gmail.com`,站点 `sterlingzeng.cn`(Free 套餐)
- **GitHub**:`sijie-Z`,邮箱 `zsj1683039482@gmail.com`(git 提交身份)
- **博客邮箱(展示用)**:`1683039482@qq.com`(优先)/ `19150649985@163.com`(备用)

## DNS 现状(重要)

**Nameserver(NS)**:
```
alex.ns.cloudflare.com
mckenzie.ns.cloudflare.com
```
- NS 由阿里云指向 Cloudflare,解析全部由 Cloudflare 托管
- **改解析去 Cloudflare 后台(DNS → Records),不是阿里云**

**当前 DNS 记录**(Cloudflare 后台):
- `@` A 记录 ×4 → `185.199.108.153` ~ `185.199.111.153`(GitHub Pages)
- `www` CNAME → `sijie-z.github.io`
- `blog` A 记录(旧,可留可删)

## 日常维护

### 写文章 / 改代码 → 发布

```bash
# 1. 写/改 source/_posts/ 下的文章
# 2. 提交推送(注意:GitHub 直连不稳定,用 VPN 代理)
HTTP_PROXY=http://127.0.0.1:7897 HTTPS_PROXY=http://127.0.0.1:7897 git push origin main
# 3. GitHub Actions 自动构建部署(1-3 分钟)
```

### 改 DNS 记录

1. 登录 dash.cloudflare.com → `sterlingzeng.cn` → **DNS → Records**
2. 修改后生效(几秒到几分钟)

### 换服务器/换托管

改 Cloudflare 的 `@` A 记录指向新 IP 即可,证书自动适配。

### 域名续费

去阿里云域名控制台续费(域名所有权一直在这,Cloudflare 只管解析)。

### 证书

Cloudflare **全自动**(Universal SSL),无需任何操作,自动续期。

## 已知问题与历史教训

| 问题 | 原因 | 解决 |
|------|------|------|
| HTTPS 证书 80+ 小时不签发 | GitHub Pages 自定义域名证书排队卡死(免费账户) | **切换 Cloudflare 后几分钟签发**——以后遇到证书问题直接考虑 Cloudflare |
| GitHub 直连失败 | 国内网络访问 GitHub 不稳定 | 用 VPN 代理 `127.0.0.1:7897`(端口以系统代理为准) |
| 页面卡顿 | 大量 backdrop-filter 模糊 | 已降为 blur(6-8px) |
| 主题类名失效 | redefine 2.9.0 改类名 | 已审计,选择器全量对齐 |

## 技术备忘

- **主题**:hexo-theme-redefine 2.9.0(npm 包),自定义通过 inject(custom.css/js),**不改主题源码**
- **theme-patch.js**:postinstall 自动移除页脚"Powered by Hexo / Theme Redefine"
- **季节主题**:html[data-season](auto/spring/summer/autumn/winter),导航栏 🍀 切换,localStorage 记忆
- **banner 图**:`assets/banner/*.webp`(1920×1080),经 jsDelivr CDN 加载
- **文章图**:cover-*.jpg(本地)
- **搜索**:hexo-generator-searchdb(search.xml),Ctrl+K 打开
- **评论**:giscus(GitHub Discussions)
- **统计**:vercount 已关闭(用户要求不显示)

## 一键速查

| 想做什么 | 去哪 |
|---------|------|
| 写文章 | 仓库 `source/_posts/` + push |
| 改解析 | Cloudflare → DNS |
| 续域名 | 阿里云 → 域名 |
| 看部署状态 | 仓库 → Actions |
| 换图 | 仓库 `assets/banner/`(CDN 自动同步) |
| 看流量 | Cloudflare → Analytics |
