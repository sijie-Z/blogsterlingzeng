---
title: 项目
description: MiQroGate、quant_platform、DocMind 三个项目的完整案例：问题、约束、关键决策、证据与边界。
date: 2026-08-28 10:00:00
---

## 30 秒版

我是 Sterling，地信（GIS）专业大四学生，方向是 **前端 / 全栈 / AI 应用工程**。

下面三个项目分别回答三个问题：**怎么把密钥管住**（MiQroGate）、**一个信号到底能不能投资**（quant_platform）、**RAG 的效果差在检索还是生成**（DocMind）。每个案例都写了问题、取舍、证据和边界——包括没做成的部分。

- 最值得先看：[MiQroGate](#miqrogate) · [quant_platform](#quant-platform) · [DocMind](#docmind)
- 更快的方式：看[系列文章](/series/)、[简历](/resume/)，或直接发邮件至 [19150649985@163.com](mailto:19150649985@163.com)（优先）

---

<span id="miqrogate"></span>
## MiQroGate：把 API Key 关进网关

**Java 21 · Spring WebFlux · Vue 3 · PostgreSQL** ｜ 个人项目 ｜ 持续维护

**本人角色：** 项目所有者，负责规格、架构、审查与发布；实现主要由 Claude Code 按规格完成。

### 问题

团队共用一个真实上游 API Key 时，三件事同时失控：**不知道谁在用、没法按人计量、出事不能只吊销一个人。** 企业采购往往横跨多家模型厂商，每家的鉴权方式和用量口径都不一样。

### 约束

- 不能改上游协议，业务代码接入成本要接近零
- 不保存提示词、代码、回答正文
- 预算不足时告警，但**不阻断**请求
- 默认鉴权与路由判定走内存快照，不查数据库

<figure class="project-arch" tabindex="0" role="region" aria-label="MiQroGate 架构图，可横向滚动">
<svg viewBox="0 0 900 270" role="img" aria-labelledby="arch-miqro-title">
  <title id="arch-miqro-title">MiQroGate 控制面与数据面分离架构</title>
  <defs>
    <marker id="arrow-miqro" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" class="arch-arrow"/>
    </marker>
  </defs>
  <rect class="arch-node" x="20" y="62" width="150" height="74" rx="10"/>
  <text class="arch-text" x="95" y="94" text-anchor="middle">业务客户端</text>
  <text class="arch-sub" x="95" y="114" text-anchor="middle">Base URL + Virtual Key</text>

  <rect class="arch-node arch-node-accent" x="270" y="45" width="250" height="108" rx="12"/>
  <text class="arch-text" x="395" y="76" text-anchor="middle">MiQroGate 数据面</text>
  <text class="arch-sub" x="395" y="98" text-anchor="middle">鉴权 · 路由快照 · 计量审计 · 响应缓存</text>
  <text class="arch-sub" x="395" y="118" text-anchor="middle">默认路由零数据库访问</text>

  <rect class="arch-node" x="640" y="62" width="240" height="74" rx="10"/>
  <text class="arch-text" x="760" y="94" text-anchor="middle">上游模型厂商</text>
  <text class="arch-sub" x="760" y="114" text-anchor="middle">8 家厂商 · 23 个产品</text>

  <rect class="arch-node" x="270" y="200" width="160" height="52" rx="9"/>
  <text class="arch-text" x="350" y="231" text-anchor="middle">管理门户</text>
  <rect class="arch-node" x="470" y="200" width="160" height="52" rx="9"/>
  <text class="arch-text" x="550" y="231" text-anchor="middle">PostgreSQL</text>
  <text class="arch-sub" x="590" y="267" text-anchor="middle">pg_notify 刷新快照</text>

  <path class="arch-line" d="M170 99 H262" marker-end="url(#arrow-miqro)"/>
  <path class="arch-line" d="M520 99 H632" marker-end="url(#arrow-miqro)"/>
  <path class="arch-line arch-dash" d="M430 200 V160" marker-end="url(#arrow-miqro)"/>
  <path class="arch-line arch-dash" d="M630 226 H700 V160" marker-end="url(#arrow-miqro)"/>
  <path class="arch-line" d="M470 226 H438" marker-end="url(#arrow-miqro)"/>
</svg>
<figcaption>控制面负责 Virtual Key 的签发、轮换与吊销；数据面默认只读路由快照，鉴权与路由判定不查数据库。</figcaption>
</figure>

### 关键决策

1. **控制面 / 数据面分离。** 控制面负责 Virtual Key 的创建、轮换、吊销；网关默认只认内存路由快照。快照通过 `pg_notify` 失效，鉴权与路由判定不查数据库。
2. **安全默认值写进架构。** 统一 404 防探测、常量时间 HMAC 比较、密钥零残留；网关端口只暴露 `health` 和 `info`，`metrics` 不对外开放，并用冒烟测试守住这条边界。
3. **响应缓存对齐供应商语义。** 只缓存可安全复用的响应，避免“缓存把计量算错”。

### 证据

- 449 个 Java 文件、134 个测试文件（测试文件数，不是覆盖率）；ArchUnit 管模块边界，契约测试 + 协议夹具 + 端到端分层
- 8 家厂商、23 个产品适配器
- 前端 vitest 21/21、Playwright 15/15，lint / typecheck / 构建全绿

### 边界

- 23 个适配器**都还没有经过真实凭证联调**。文档把“官方资料确认 / 已实现 / 真实凭证已验证”分成三级，不伪造 PASS。

[GitHub](https://github.com/sijie-Z/miqro-gate) · [设计文章](/2026/08/28/miqro-gate-virtual-key-design/)

---

<span id="quant-platform"></span>
## quant_platform：信号存在 ≠ 策略可投资

**Python · Pandas · cvxpy · FastAPI · Vue 3** ｜ 个人项目 ｜ 研究已封档

**本人角色：** 独立负责研究设计、因子与回测实现、前端和复盘；未用真实资金运行，实盘接口仅到 QMT / Paper 层。

### 问题

量化研究最容易犯的错，是把“回测收益高”当成“策略能赚钱”。我想验证一个具体问题：**A 股的反转效应，在真实执行条件下还剩多少？**

### 约束

- 零前视偏差：价格因子只能用到 `signal_date`，Alpha 权重只能用历史 IC
- 真实成本：佣金双边 0.03%、印花税卖出 0.05%、滑点、手数约束
- 失败运行也要记录 Trust Metadata，保证结论可复现

<figure class="project-arch" tabindex="0" role="region" aria-label="quant_platform 架构图，可横向滚动">
<svg viewBox="0 0 900 260" role="img" aria-labelledby="arch-quant-title">
  <title id="arch-quant-title">quant_platform 从数据到执行接口的流水线</title>
  <defs>
    <marker id="arrow-quant" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" class="arch-arrow"/>
    </marker>
  </defs>
  <rect class="arch-node" x="15" y="55" width="130" height="66" rx="9"/>
  <text class="arch-text" x="80" y="83" text-anchor="middle">数据</text>
  <text class="arch-sub" x="80" y="103" text-anchor="middle">行情 / 财务</text>

  <rect class="arch-node" x="165" y="55" width="130" height="66" rx="9"/>
  <text class="arch-text" x="230" y="83" text-anchor="middle">因子引擎</text>
  <text class="arch-sub" x="230" y="103" text-anchor="middle">15 个基础因子</text>

  <rect class="arch-node arch-node-accent" x="315" y="55" width="130" height="66" rx="9"/>
  <text class="arch-text" x="380" y="83" text-anchor="middle">IC / ICIR</text>
  <text class="arch-sub" x="380" y="103" text-anchor="middle">10 个时间尺度</text>

  <rect class="arch-node" x="465" y="55" width="130" height="66" rx="9"/>
  <text class="arch-text" x="530" y="83" text-anchor="middle">组合优化</text>
  <text class="arch-sub" x="530" y="103" text-anchor="middle">MVO / 约束</text>

  <rect class="arch-node" x="615" y="55" width="130" height="66" rx="9"/>
  <text class="arch-text" x="680" y="83" text-anchor="middle">回测</text>
  <text class="arch-sub" x="680" y="103" text-anchor="middle">真实成本模型</text>

  <rect class="arch-node" x="765" y="55" width="120" height="66" rx="9"/>
  <text class="arch-text" x="825" y="83" text-anchor="middle">执行</text>
  <text class="arch-sub" x="825" y="103" text-anchor="middle">QMT / Paper</text>

  <path class="arch-line" d="M145 88 H157" marker-end="url(#arrow-quant)"/>
  <path class="arch-line" d="M295 88 H307" marker-end="url(#arrow-quant)"/>
  <path class="arch-line" d="M445 88 H457" marker-end="url(#arrow-quant)"/>
  <path class="arch-line" d="M595 88 H607" marker-end="url(#arrow-quant)"/>
  <path class="arch-line" d="M745 88 H757" marker-end="url(#arrow-quant)"/>

  <path class="arch-line arch-dash" d="M80 145 H825" marker-start="url(#arrow-quant)" marker-end="url(#arrow-quant)"/>
  <text class="arch-sub" x="452" y="170" text-anchor="middle">No-Lookahead 契约：所有环节只能使用 signal_date 及之前的数据</text>
  <text class="arch-sub" x="452" y="220" text-anchor="middle">六项系统性自检：Oracle IC · Known Alpha · MVO Audit · Walk-Forward · Rank IC · No-Lookahead</text>
</svg>
<figcaption>研究链路和执行接口共用同一套因子与回测代码；零前视契约贯穿数据、因子、权重、回测和执行。</figcaption>
</figure>

### 关键决策

1. **先建自检，再谈收益。** 六项系统性验证：Oracle Factor IC=1.000000、Known Alpha Recovery、MVO Audit 60/60、Walk-Forward、Rank IC 手动对比差异 < 0.001%、No-Lookahead 零前视契约。
2. **把执行成本当成一等公民。** 同一个 80 日反转信号，分别跑理想执行和月频真实调仓。
3. **结论必须带边界。** “在已测试的固定频率和简单相位代理下无法恢复”，不写成“反转 Alpha 不可交易”。

### 证据

- 80 日反转：IC = **-0.081**，t 统计量 **-4.58**（2018–2025，10 个时间尺度）
- 理想执行夏普 **0.45**，加波动率过滤 **0.60**
- 月频真实调仓夏普 **-0.27**——同一个信号，0.72 的差距
- 四次修复尝试均未恢复；平台侧 15 个基础因子、97 个 REST 端点、81 个测试文件

### 边界

- 只测试了固定频率和简单相位代理；状态空间模型、小波域相位估计、非线性控制**都没有测试**，不能排除。
- 研究结论已封档，不再继续调参；这是一次“负结果”的完整记录。

[GitHub](https://github.com/sijie-Z/quant_platform) · [执行之痛](/2026/08/28/quant-reversal-execution-gap/) · [平台架构](/2026/05/10/quant-platform-a-share-research/)

---

<span id="docmind"></span>
## DocMind：RAG 的核心是检索，不是生成

**Python · FastAPI · Vue 3 · Elasticsearch · Redis · MinIO · Kafka** ｜ 个人项目 ｜ 生产实现持续演进

**本人角色：** 独立负责系统与实验设计、检索管线、评测和复盘。

### 问题

大模型不知道你的文档里写了什么。RAG 看起来只是“检索 + 生成”，但效果不好时，很难判断问题出在检索、重排还是提示词。

### 约束

- 文档格式杂：PDF / Word / PPT / TXT，含扫描件
- 回答必须能追溯到原文
- 10 万条文档规模下，向量索引不能把内存吃穿

<figure class="project-arch" tabindex="0" role="region" aria-label="DocMind 架构图，可横向滚动">
<svg viewBox="0 0 900 300" role="img" aria-labelledby="arch-docmind-title">
  <title id="arch-docmind-title">DocMind 文档索引与查询检索两条链路</title>
  <defs>
    <marker id="arrow-docmind" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" class="arch-arrow"/>
    </marker>
  </defs>
  <text class="arch-sub" x="20" y="30">索引链路</text>
  <rect class="arch-node" x="20" y="45" width="140" height="62" rx="9"/>
  <text class="arch-text" x="90" y="72" text-anchor="middle">文档</text>
  <text class="arch-sub" x="90" y="92" text-anchor="middle">PDF / Word / 扫描件</text>
  <rect class="arch-node" x="210" y="45" width="160" height="62" rx="9"/>
  <text class="arch-text" x="290" y="72" text-anchor="middle">解析 + 语义分块</text>
  <text class="arch-sub" x="290" y="92" text-anchor="middle">保留上下文重叠</text>
  <rect class="arch-node" x="420" y="45" width="140" height="62" rx="9"/>
  <text class="arch-text" x="490" y="72" text-anchor="middle">Embedding</text>
  <text class="arch-sub" x="490" y="92" text-anchor="middle">1536 → 768 维 + int8</text>
  <rect class="arch-node arch-node-accent" x="610" y="45" width="230" height="62" rx="9"/>
  <text class="arch-text" x="725" y="72" text-anchor="middle">混合索引</text>
  <text class="arch-sub" x="725" y="92" text-anchor="middle">Elasticsearch BM25 + 向量</text>
  <text class="arch-sub" x="20" y="170">查询链路</text>
  <rect class="arch-node" x="20" y="185" width="140" height="62" rx="9"/>
  <text class="arch-text" x="90" y="212" text-anchor="middle">用户问题</text>
  <text class="arch-sub" x="90" y="232" text-anchor="middle">意图判断</text>
  <rect class="arch-node" x="210" y="185" width="160" height="62" rx="9"/>
  <text class="arch-text" x="290" y="212" text-anchor="middle">混合检索</text>
  <text class="arch-sub" x="290" y="232" text-anchor="middle">BM25 + 向量各取 Top N</text>
  <rect class="arch-node" x="420" y="185" width="140" height="62" rx="9"/>
  <text class="arch-text" x="490" y="212" text-anchor="middle">RRF 融合</text>
  <text class="arch-sub" x="490" y="232" text-anchor="middle">去重 + 排序</text>
  <rect class="arch-node" x="610" y="185" width="150" height="62" rx="9"/>
  <text class="arch-text" x="685" y="212" text-anchor="middle">BGE Reranker</text>
  <text class="arch-sub" x="685" y="232" text-anchor="middle">交叉编码器精排</text>
  <rect class="arch-node arch-node-accent" x="800" y="185" width="80" height="62" rx="9"/>
  <text class="arch-text" x="840" y="212" text-anchor="middle">LLM</text>
  <text class="arch-sub" x="840" y="232" text-anchor="middle">引用</text>

  <path class="arch-line" d="M160 76 H202" marker-end="url(#arrow-docmind)"/>
  <path class="arch-line" d="M370 76 H412" marker-end="url(#arrow-docmind)"/>
  <path class="arch-line" d="M560 76 H605" marker-end="url(#arrow-docmind)"/>
  <path class="arch-line arch-dash" d="M725 107 V177" marker-end="url(#arrow-docmind)"/>
  <path class="arch-line" d="M160 216 H202" marker-end="url(#arrow-docmind)"/>
  <path class="arch-line" d="M370 216 H412" marker-end="url(#arrow-docmind)"/>
  <path class="arch-line" d="M560 216 H605" marker-end="url(#arrow-docmind)"/>
  <path class="arch-line" d="M760 216 H792" marker-end="url(#arrow-docmind)"/>
</svg>
<figcaption>索引链路负责离线构建 BM25 + 向量混合索引；查询链路做混合召回、RRF 融合、Reranker 精排，最后交给大模型生成带引用的回答。</figcaption>
</figure>

### 关键决策

1. **混合检索。** BM25 负责精确匹配（如错误码 `ERR-4032`），向量负责语义；RRF 融合，再加 BGE Reranker 精排。
2. **语义分块，而不是固定字数。** 按段落和标题切分并保留重叠，避免答案被切到两个块里。
3. **向量降维 + 量化。** 1536 维降到 768 维，float32 转 int8，10 万条文档的索引内存从 8GB 降到约 2GB；召回率损失未单独评测。
4. **用消融实验回答“规划还是执行”。** 5 组对照实验，固定模型和评测集，只改一个变量。

### 证据

- Agent 消融：L1 评测点覆盖率 <strong>69% → 93.1%</strong>（20 题评测集），L1 题目失败数 5–6 → 0
- 同一实验的 L2 系统层另测 10 题，通过率 <strong>50%</strong>；低分结果同样保留
- 生产实现迁移到 DocMind-RAG 仓库后，测试规模到 422 个

### 边界

- 30 题评测集偏小，结论是“在这个评测集上”的结论，不外推到所有 RAG 场景。
- 扫描件 OCR、复杂表格解析仍有失败样例；引用溯源降低幻觉，但不能消灭幻觉。
- 评测集只有 30 题，L2 仍有 5 个失败。

[GitHub](https://github.com/sijie-Z/DocMind-RAG) · [项目记录](/2026/05/10/docmind-rag-knowledge-base/) · [消融实验](/2026/08/28/docmind-agent-causal-study/)

---

## 其他项目

| 项目 | 做什么 | 关键实现 | 链接 |
|---|---|---|---|
| **MindPilot** | 多 Agent RAG 平台，从 DocMind 演进 | LangGraph 状态机 + Judge Agent；多端接入（Web / QQ / 飞书） | [GitHub](https://github.com/sijie-Z/mindpilot) · [文章](/2026/05/10/mindpilot-multi-agent-rag/) |
| **GeoData Security** | 空间数据安全分发与溯源 | 3 种栅格水印 + QR 码水印 + HMAC 签名；双级审批与民主召回 | [GitHub](https://github.com/sijie-Z/GeoData-Security-System) · [文章](/2026/05/10/geodata-security-traceability/) |
| **NFT Launchpad Kit** | Agent-Native 链上发行基础设施 | trusted-signer 离线签名铸造；204 个测试，v1.0.0 已发布 | [GitHub](https://github.com/sijie-Z/nft-launchpad-kit) · [架构文章](/2026/05/10/nft-launchpad-kit-web3/) · [发布复盘](/2026/08/28/nft-launchpad-release-sprint/) |
| **NLP Training Lab** | 从 BERT 到 LoRA 微调的渐进式实验 | 4GB 显存跑通全流程，LoRA 只训练 0.42% 参数；保留 Accuracy 44% / F1 30% 的失败记录 | [GitHub](https://github.com/sijie-Z/nlp-training-lab) · [实验记录](/2026/08/28/nlp-training-lab/) |
| **这个博客** | Hexo + Swup + 构建期生成器 | 23 篇文章、构建期系列/OG/Feed、605 项回归、axe 0 违规 | [GitHub](https://github.com/sijie-Z/blogsterlingzeng) · [工程说明](https://github.com/sijie-Z/blogsterlingzeng/blob/main/docs/ENGINEERING.md) |

> 以上均为个人项目；角色与边界以各项目文章为准。测试数字来自仓库，未做第三方审计。

---

## 更多

> 下面的卡片从 GitHub API 实时拉取，展示最近更新的仓库。

<div id="github-projects" class="projects-container">
  <div class="projects-loading"><i class="fa-solid fa-spinner"></i>正在从 GitHub 加载项目...</div>
</div>

完整列表见 [github.com/sijie-Z](https://github.com/sijie-Z?tab=repositories)。
