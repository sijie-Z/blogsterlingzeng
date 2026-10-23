---
title: 关于我
date: 2026-05-10 12:00:00
---

## Hi, 我是 Sterling Zeng

地信（GIS）专业大四学生，方向是**前端 / 全栈 / AI 应用工程**。

我做过三件比较完整的事：把企业 API Key 收进一个可计量、可吊销的网关（[MiQroGate](/projects/#miqrogate)）；用一套量化平台验证 A 股反转信号在真实执行下是否还能赚钱（[quant_platform](/projects/#quant-platform)）；以及从零搭一个能追溯引用的 RAG 知识库（[DocMind](/projects/#docmind)）。它们都留下了可复现的证据，也留下了没做成的部分。

这个博客记录这些过程：技术选型、踩坑、性能测量，以及一些还没想清楚的问题。

**快速入口：** [项目案例](/projects/) · [简历](/resume/) · [系列文章](/series/) · [归档](/archives/) · [GitHub](https://github.com/sijie-Z) · [Email](mailto:1683039482@qq.com)

## 为什么要写博客

**写给自己看。** 学过的东西如果不写下来，三个月后就像没学过一样。博客是我的外部硬盘，专门存那些容易忘的思考。

**强迫自己想清楚。** 你以为你懂了，但当你试图把一个东西讲明白的时候，会发现很多地方其实似懂非懂。写作逼你把模糊的直觉变成清晰的逻辑。

**互联网是我的笔记本。** Stack Overflow 和 GitHub 上的分享让我少走了很多弯路。写博客是我回馈社区的方式，哪怕只帮到一个人。

---

## 🛠 技术栈与证据

不再用百分比表示“熟练度”，因为那没法验证。下面按“在哪用过、解决过什么问题”分组：

### 前端与全栈

TypeScript / React / Vue 3 / Tailwind CSS

- **MiQroGate 管理门户**：TDesign 组件库迁移，vitest 21/21、Playwright 15/15
- **quant_platform 前端**：Vue 3 + ECharts，接 97 个 REST 端点
- **这个博客**：Hexo 主题定制、Swup SPA、构建期生成器、无障碍与性能优化

### 后端与基础设施

Java 21 / Spring WebFlux / Python / FastAPI / PostgreSQL / Redis / Elasticsearch / Kafka / Docker

- **MiQroGate**：控制面/数据面分离、路由快照、pg_notify、常量时间 HMAC
- **DocMind**：混合检索、向量降维与量化、Kafka 异步文档解析
- **MindPilot**：LangGraph 多 Agent 状态机、Milvus、Docker Compose 编排 8 个服务

### AI 应用

RAG / LangGraph / 向量数据库 / LoRA 微调 / 评测设计

- **DocMind 消融实验**：7 组对照，L1 覆盖率 69% → 93.1%；同时如实记录 L2 只有 50%
- **NLP Training Lab**：4GB 显存跑通 BERT → LoRA 微调 Qwen2.5，adapter 仅 17MB
- **MindPilot**：Self-RAG 自检、RAGAS 指标、GLM-4V 多模态理解

---

## 📅 时间线

**2026.10** — 博客上线系列阅读与系列订阅；字体子集化、CLS 与滚动性能优化；文章更新到 21 篇

**2026.09** — 升入大四；博客 HTTPS 上线（Cloudflare）；NFT Launchpad Kit v1.0.0 发布并转向 Agent-Native 方向

**2026.08** — MiQroGate 推进至 Phase 1 G7.4（响应缓存）；DocMind Agent 消融实验完成；博客补齐项目复盘

**2026.07** — NLP 训练实验框架（BERT → LoRA 微调 Qwen2.5）；GeoAI Assistant 产品化

**2026.06** — A 股反转研究封档：IC 曲线全负，80 日反转 Alpha 的“信号存在 ≠ 策略可投资”

**2026.05** — 博客上线，发布首批文章与项目展示

**2026.04** — 完成 DocMind RAG 系统、MindPilot 多 Agent 平台、GeoData 安全系统

**2025.09** — 开始系统接触 AI Agent 与 RAG

---

## 💡 我的编程观

### 关于学习

我掉进过“教程地狱”——看视频、跟教程、做笔记，但写不出自己的项目。后来想明白：**编程是手艺活，不是知识竞赛。** 看一百遍游泳教学视频，不如自己跳进水里扑腾几下。现在我的方式是：先动手，遇到问题再查，查完再动手。

### 关于技术选型

我曾经是“新技术狂热者”，什么新框架都想试。吃了几次亏才明白：**技术选型不是选“最好的”，而是选“最合适的”。** 现在我只看三件事：能不能解决问题？维护成本高不高？我能不能驾驭？

写 MiQroGate 时，这个原则具体成了“不伪造 PASS”：供应商适配器只要没经过真实凭证联调，就标成“已实现、未验证”，不管文档看起来多完整。

---

## 🙏 致谢

站内左下角的 Live2D 形象是社区二创的 DeepSeek「大肥鱼」（鲸鱼娘）。角色原作：[上善无形](https://www.pixiv.net/users/62155430)；DeepSeek 女仆风二次设计：[ZipZipPipe](https://www.pixiv.net/users/18604994)；Live2D 绑定、动作与表情：[氵六青](https://space.bilibili.com/11272072)。模型来自 [A8Chann/dsh-pet-live2d](https://github.com/A8Chann/dsh-pet-live2d)，以 [CC BY-NC-SA 4.0](/live2d/model/ds-whale-girl/LICENSE) 协议使用，本站仅作个人非商业展示。

---

## 联系方式

- **Email**: [1683039482@qq.com](mailto:1683039482@qq.com)（优先） / 19150649985@163.com（备用）
- **QQ**: 1683039482
- **GitHub**: [github.com/sijie-Z](https://github.com/sijie-Z)

如果你对我的文章有想法，或者只是想聊聊天，随时联系。我不高冷，只是社恐。
