---
title: MindPilot——多 Agent 协作的 RAG 平台是怎么设计的
date: 2026-05-10 14:00:00
categories:
  - 项目实战
tags:
  - RAG
  - Agent
  - LangGraph
  - 多模态
  - Python
description: MindPilot 是一个支持多模态文档理解、多 Agent 协作编排的企业级 RAG 平台。这篇文章记录了从单 Agent 到多 Agent 的架构演进过程。
cover: /images/cover-tech.jpg
---

## 从 DocMind 到 MindPilot

在做了 DocMind（RAG 知识库）之后，我发现单 Agent 的 RAG 有几个局限：

1. **意图识别不够准** — 用户问的不一定是知识检索，可能是闲聊、翻译、总结
2. **检索策略太单一** — 不同类型的问题应该用不同的检索策略
3. **没有自检机制** — 生成的回答好不好，没有评估环节

所以我做了 MindPilot — 一个支持多 Agent 协作的 RAG 平台。核心思想是：**把一个大任务拆成多个小任务，每个小任务由专门的 Agent 负责。**

<!-- more -->

## 多 Agent 架构

### LangGraph 状态机

MindPilot 的 Agent 编排基于 LangGraph 的状态机模型：

```
用户提问
   │
   ▼
┌──────────────┐
│  Intent Agent│  ← 意图识别：这是知识检索？闲聊？翻译？
└──────┬───────┘
       │
   ┌───┼───┐
   ▼   ▼   ▼
 检索  闲聊  翻译   ← 不同的 Agent 处理不同的意图
   │
   ▼
┌──────────────┐
│  RAG Agent   │  ← 检索 + 生成
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Judge Agent │  ← RAGAS 评估：回答质量够不够好？
└──────┬───────┘
       │
   好 ─┼─ 不好
   ▼     ▼
 返回   重新检索/换策略
```

### Self-RAG 自检

这是 MindPilot 和 DocMind 最大的区别。生成回答后，Judge Agent 会用 RAGAS 指标评估：

- **Faithfulness** — 回答是否忠实于检索到的内容
- **Answer Relevance** — 回答是否与问题相关
- **Context Relevance** — 检索到的内容是否与问题相关

如果分数不够高，系统会自动调整检索策略重新尝试。不是每次都能成功，但比"生成了就返回"好得多。

## 混合检索

和 DocMind 一样，MindPilot 也用混合检索，但做了一些改进：

```
BM25 关键词检索 ──┐
                   ├── RRF 融合 ── BGE Reranker ── 最终结果
向量语义检索 ──────┘
```

新增了 **BGE Reranker** 做精排。粗排（RRF 融合）返回 Top 20，精排（Reranker）从中选出 Top 5。Reranker 是交叉编码器，比双塔模型精度更高，但速度更慢，所以只用在精排阶段。

## 多模态理解

MindPilot 支持图片问答。比如你上传一张架构图，问"这个系统的数据流是怎样的"，它能理解图片内容并回答。

技术实现：用 GLM-4V（智谱的多模态模型）处理图片 + 文本的联合输入。

## 多端接入

不只是网页，还支持：

- **Vue 3 网页** — 主界面
- **QQ 机器人** — NoneBot2 框架
- **飞书机器人** — Webhook 接入

同一套后端，多个前端接入。对话历史跨端同步。

## 其他能力

### Skill 自动注册

和 PaiAgent 类似的设计思路。把技能定义在 YAML 文件里，系统自动扫描目录注册。支持意图路由和遥测追踪（调用次数、延迟、成功率）。

### 对话分支

从任意消息点创建分支。比如你在第 5 条消息觉得"如果换个问法会怎样"，可以从那里分出一条新对话。分支树可视化，支持切换和删除。

### 语义搜索高亮

全文搜索时，不只返回匹配的对话，还会高亮句子级的相关性。基于 Embedding 余弦相似度计算。

### RAG 质量仪表盘

RAGAS 指标趋势、分数分布、延迟百分位、Token 用量分析。用来看 RAG 系统整体的健康状况。

## 安全加固

- bcrypt 密码哈希
- JWT 认证
- DOMPurify XSS 防护
- Milvus 注入防护
- Prompt 注入扫描
- StreamScrubber 防止内部上下文泄漏到用户端

## 部署

Docker Compose 编排 8 个服务，网络隔离，健康检查，Nginx 安全头 + 限流。

## 总结

从 DocMind 到 MindPilot，最大的变化是从"单一管线"到"多 Agent 协作"。这不是简单的功能叠加，而是架构思维的转变：

**单 Agent 像一个人干所有活，多 Agent 像一个团队各司其职。** 团队的效率取决于分工是否合理、协作是否顺畅。LangGraph 的状态机模型提供了这种协作的基础设施。

项目地址：[github.com/sijie-Z/mindpilot](https://github.com/sijie-Z/mindpilot)
