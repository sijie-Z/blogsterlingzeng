---
title: 简历
date: 2026-10-23 18:00:00
comment: false
comments: false
---

<div class="resume-page">

## Sterling Zeng

**前端 / 全栈 / AI 应用工程** ｜ 本科 · 地理信息科学（GIS）· 大四在读（2023–2027，预计）

[GitHub](https://github.com/sijie-Z) · [博客](https://sterlingzeng.cn) · [项目案例](/projects/) · [1683039482@qq.com](mailto:1683039482@qq.com)

<button type="button" class="resume-print" onclick="window.print()">打印 / 存为 PDF</button>

## 求职方向

前端开发、全栈开发、AI 应用工程；实习或校招均可。

## 项目经历

### MiQroGate — 企业级 AI 凭证虚拟化与用量治理网关

*Java 21 · Spring WebFlux · Vue 3 · PostgreSQL ｜ 个人项目 · 项目所有者*

- 把真实上游 API Key 映射为可独立追踪、轮换、吊销的 Virtual Key；控制面/数据面分离，热路径零数据库访问（路由快照 + `pg_notify`）。
- 安全默认值：统一 404 防探测、常量时间 HMAC、密钥零残留；7 家厂商 20 个产品适配器。
- 449 个 Java 文件、134 个测试文件；前端 vitest 21/21、Playwright 15/15。
- 角色：写规格、架构与审查、合并发布；实现主要由 Claude Code 按规格完成。真实凭证联调尚未验证，适配器按“已实现 / 已验证”分级，不伪造 PASS。

### quant_platform — A 股多因子量化研究平台

*Python · Pandas · cvxpy · FastAPI · Vue 3 ｜ 个人项目*

- 20+ 因子引擎、组合优化、回测与实盘接入；97 个 REST 端点、81 个测试文件。
- 六项系统性自检：Oracle Factor IC=1.000000、Known Alpha Recovery、MVO Audit 60/60、Walk-Forward、Rank IC 差异 < 0.001%、No-Lookahead 零前视契约。
- 研究结论：80 日反转 IC = -0.081（t = -4.58）；理想执行夏普 0.45，月频真实调仓 -0.27；明确标注结论边界。

### DocMind — RAG 智能知识库

*Python · FastAPI · Vue 3 · Elasticsearch · Redis · MinIO · Kafka ｜ 个人项目*

- 混合检索（BM25 + 向量 + RRF + BGE Reranker）、语义分块、SSE 流式对话与引用溯源。
- 向量降维 + 量化：1536 → 768 维、float32 → int8，10 万条文档索引内存 8GB → 约 2GB。
- Agent 消融：7 组对照实验，L1 覆盖率 69% → 93.1%（20 题评测集）；同时记录 L2 仅 50% 的边界结果。

## 其他项目

- **MindPilot** — LangGraph 多 Agent RAG 平台；Self-RAG 自检、RAGAS 评估、Web/QQ/飞书多端接入。
- **GeoData Security System** — 空间数据安全分发与溯源；3 种栅格水印 + QR 码水印 + HMAC 签名。
- **NFT Launchpad Kit** — Agent-Native 链上发行基础设施；trusted-signer 离线签名铸造，204 个测试，v1.0.0 已发布。
- **NLP Training Lab** — BERT → LoRA 微调 Qwen2.5；4GB 显存跑通全流程，adapter 仅 17MB。

## 技术栈

- **前端**：TypeScript / React / Vue 3 / Tailwind CSS / ECharts
- **后端**：Java 21 / Spring WebFlux / Python / FastAPI / PostgreSQL / Redis / Elasticsearch / Kafka
- **AI 应用**：RAG / LangGraph / Milvus / LoRA / 评测设计
- **工程**：Docker / Docker Compose / GitHub Actions / Linux / Prometheus + Grafana

## 写作与开源

- 个人博客 [sterlingzeng.cn](https://sterlingzeng.cn)：22 篇技术文章，含[系列阅读](/series/)与构建期生成的 Atom / JSON Feed。
- 站点工程化：Swup SPA、构建期系列系统、无障碍（axe WCAG A/AA 0 违规）、CLS 0.0001、338 项浏览器回归测试。
- GitHub：[github.com/sijie-Z](https://github.com/sijie-Z)

## 联系

- Email：[1683039482@qq.com](mailto:1683039482@qq.com)（优先）
- 备用邮箱：[19150649985@163.com](mailto:19150649985@163.com)
- GitHub：[github.com/sijie-Z](https://github.com/sijie-Z)

</div>
