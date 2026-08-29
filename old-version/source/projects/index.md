---
title: 项目
date: 2026-05-10 12:00:00
type: "page"
---

## 开源项目

> 以下是我从零搭建的原创项目，每个都代表了我在某个方向的探索。

---

### A 股多因子量化研究平台

**quant-platform** | Python

从数据获取到因子构建、组合优化、回测验证的完整流水线。15 个因子（10 技术 + 5 基本面）、3 种 Alpha 模型、3 种组合优化器，105 个单元测试全部通过。

**技术栈：** Python · Pandas · cvxpy · Tushare · Matplotlib

**亮点：**
- 合成数据生成器（500 只虚拟 A 股，5 年日线）
- 完整 A 股成本模型（佣金 + 印花税 + 滑点）
- VaR/CVaR 风险管理 + 压力测试
- LLM 情感因子（可选，接入 OpenAI）

[Github](https://github.com/sijie-Z/quant-platform) · [博客文章](/2026/05/10/quant-platform-a-share-research/)

---

### DocMind — RAG 智能知识库

**DocMind-RAG** | Python · Vue

基于 RAG 架构的全栈知识库系统。上传文档后自动解析、分块、向量化，通过自然语言对话获得可溯源的 AI 回答。

**技术栈：** FastAPI · Vue 3 · Elasticsearch · Redis · MinIO · Kafka

**亮点：**
- 混合检索（BM25 + 向量 + RRF 融合 + BGE Reranker）
- PDF/Word/PPT/TXT 解析，支持扫描件 OCR
- SSE 流式对话 + 引用溯源
- Docker Compose 一键部署

[Github](https://github.com/sijie-Z/DocMind-RAG) · [博客文章](/2026/05/10/docmind-rag-knowledge-base/)

---

### MindPilot — 多 Agent RAG 平台

**mindpilot** | Python · Vue

支持多模态文档理解、多 Agent 协作编排的企业级 RAG 平台。从 DocMind 演进而来，核心变化是从单 Agent 到多 Agent 协作。

**技术栈：** FastAPI · Vue 3 · LangGraph · Milvus · Docker

**亮点：**
- LangGraph 状态机：意图识别 → 检索 → 生成 → RAGAS 评估
- Self-RAG 自检机制，自动调整检索策略
- 多模态理解（GLM-4V 图片问答）
- 多端接入（网页 + QQ 机器人 + 飞书机器人）
- 对话分支、语义搜索高亮、RAG 质量仪表盘

[Github](https://github.com/sijie-Z/mindpilot) · [博客文章](/2026/05/10/mindpilot-multi-agent-rag/)

---

### GeoData Security System — 空间数据安全溯源

**GeoData-Security-System** | Python · Vue

空间数据安全分发与溯源平台。通过 QR 码水印嵌入、HMAC-SHA256 签名和民主召回机制，实现完整的数据安全分发链路。

**技术栈：** Flask · Vue 3 · PostgreSQL/PostGIS · Redis · Prometheus · Grafana

**亮点：**
- 3 种栅格水印算法（LSB、DWT、直方图偏移）
- QR 码水印 + HMAC 签名防伪造
- 双级审批 + 民主召回投票
- 双数据库架构（MySQL + PostGIS）
- 完整监控体系（Prometheus + Grafana + Loki）

[Github](https://github.com/sijie-Z/GeoData-Security-System) · [博客文章](/2026/05/10/geodata-security-traceability/)

---

### NFT Launchpad Kit — NFT 发行平台

**nft-launchpad-kit** | Solidity · TypeScript

一站式 NFT 发行平台，支持 6 种铸造模式。从智能合约到前端管理后台的全链路实现。

**技术栈：** Solidity · ERC721A · Next.js · Hardhat · viem · wagmi

**亮点：**
- 6 种铸造模式（公开、白名单、荷兰拍、签名授权、ERC20 支付、分阶段）
- ERC721A 批量铸造（节省 70-90% gas）
- ERC-1167 Clone 工厂（节省 93% 部署 gas）
- 82 个测试用例全覆盖
- EIP-712 结构化签名 + nonce 防重放

[Github](https://github.com/sijie-Z/nft-launchpad-kit) · [博客文章](/2026/05/10/nft-launchpad-kit-web3/)
