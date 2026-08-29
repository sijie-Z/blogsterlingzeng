---
title: 项目
date: 2026-08-28 10:00:00
---

## 开源项目

> 以下是我从零搭建的原创项目，每个都代表了我在某个方向的探索。

---

### 把 API Key 关进网关

**miqro-gate** | Java 21 · Spring WebFlux

企业级 AI 凭证虚拟化与用量治理系统。把真实上游 API Key 安全映射为可独立追踪、轮换、吊销的 Virtual Key，内部用户在门户自助创建，网关负责鉴权替换、确定性转发、用量统计与审计。

**技术栈：** Java 21 · Spring WebFlux · Vue 3 · TypeScript · PostgreSQL

**亮点：**
- 控制面/数据面分离，热路径零数据库访问（路由快照 + pg_notify）
- 统一 404 防探测、常量时间 HMAC、密钥零残留
- 不保存提示词/代码/回答正文；不因预算阻断，Webhook 告警
- 7 家厂商 20 个产品适配器；449 个 Java 文件、134 个测试文件

[Github](https://github.com/sijie-Z/miqro-gate) · [博客文章](/2026/08/28/miqro-gate-virtual-key-design/)

---

### A 股多因子量化研究平台

**quant_platform** | Python

从数据获取到因子构建、组合优化、回测验证的完整流水线。六项系统性验证（Oracle IC / Known Alpha / MVO / WalkForward / 零前视契约）。

**技术栈：** Python · Pandas · cvxpy · FastAPI · Vue 3 · ECharts

**亮点：**
- 97 个 REST 端点、81 个测试文件，QMT 实盘 + Paper Trading
- 研究结论：A 股是反转市场，80 日反转 Alpha 在月频执行下失效（"信号存在 ≠ 策略可投资"）
- No-Lookahead 零前视契约，失败运行同样记录 Trust Metadata

[Github](https://github.com/sijie-Z/quant_platform) · [博客文章](/2026/08/28/quant-reversal-execution-gap/)

---

### DocMind — RAG 智能知识库

**DocMind-RAG** | Python · Vue

基于 RAG 架构的全栈知识库系统。上传文档后自动解析、分块、向量化，通过自然语言对话获得可溯源的 AI 回答。

**技术栈：** FastAPI · Vue 3 · Elasticsearch · Redis · MinIO · Kafka

**亮点：**
- 混合检索（BM25 + 向量 + RRF 融合 + BGE Reranker）
- PDF/Word/PPT/TXT 解析，支持扫描件 OCR
- SSE 流式对话 + 引用溯源
- Agent 消融研究：7 组对照实验证明规划粒度决定性能（69% → 93.1%）

[Github](https://github.com/sijie-Z/DocMind-RAG) · [博客文章](/2026/05/10/docmind-rag-knowledge-base/)

---

### MindPilot — 多 Agent RAG 平台

**MindPilot** | Python · Vue

支持多模态文档理解、多 Agent 协作编排的企业级 RAG 平台。从 DocMind 演进而来，核心变化是从单 Agent 到多 Agent 协作。

**技术栈：** FastAPI · Vue 3 · LangGraph · Milvus · Docker

**亮点：**
- LangGraph 状态机：意图识别 → 检索 → 生成 → RAGAS 评估
- Self-RAG 自检机制，自动调整检索策略
- 多模态理解（GLM-4V 图片问答）
- 多端接入（网页 + QQ 机器人 + 飞书机器人）
- 对话分支、语义搜索高亮、RAG 质量仪表盘

[Github](https://github.com/sijie-Z/MindPilot) · [博客文章](/2026/05/10/mindpilot-multi-agent-rag/)

---

### GeoData Security System — 空间数据安全溯源

**GeoData-Security-System** | Python · Vue

空间数据安全分发与溯源平台。通过 QR 码水印嵌入、HMAC-SHA256 签名和民主召回机制，实现完整的数据安全分发链路。

**技术栈：** Flask · Vue 3 · PostgreSQL/PostGIS · Redis · Prometheus · Grafana

**亮点：**
- 3 种栅格水印算法（LSB、DWT、直方图偏移）
- QR 码水印 + HMAC 签名防伪造
- 双级审批 + 民主召回投票
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
- EIP-712 结构化签名 + nonce 防重放
- v1.0.0 发布冲刺：15 个 issue 还工程债（CI 从未运行过、密钥清理、测试基线）

[Github](https://github.com/sijie-Z/nft-launchpad-kit) · [博客文章](/2026/08/28/nft-launchpad-release-sprint/)

---

### NLP 训练实验框架

**nlp-training-lab** | Python

从零开始、渐进式学习 NLP 模型训练：BERT 中文新闻分类 → 文本匹配 → LoRA 微调 Qwen2.5 → GeoAI Assistant 产品化。

**技术栈：** PyTorch · Transformers · PEFT (LoRA) · FastAPI

**亮点：**
- 4GB 显存跑通全流程（LoRA 只训练 0.42% 参数，adapter 仅 17MB）
- 验证集 100% vs 测试集 90% 的过拟合实录
- 一次诚实的失败记录（文本匹配 44%/30%，数据量不足）

[Github](https://github.com/sijie-Z/nlp-training-lab) · [博客文章](/2026/08/28/nlp-training-lab/)

---

## 更多项目

> 下面的卡片从 GitHub API 实时拉取，展示最近更新的仓库。

<div id="github-projects" class="projects-container">
  <div class="projects-loading"><i class="fa-solid fa-spinner"></i>正在从 GitHub 加载项目...</div>
</div>

完整列表见 [github.com/sijie-Z](https://github.com/sijie-Z?tab=repositories)。
