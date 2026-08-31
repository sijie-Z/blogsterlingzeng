---
title: 我的 CI 从来没有跑过——NFT 平台的 v1.0.0 发布冲刺记录
date: 2026-08-28 16:00:00
categories:
  - 项目实战
tags:
  - CI/CD
  - 安全
  - 工程实践
  - Solidity
  - Web3
description: 一个功能完整的 NFT 发行平台,发布 v1.0.0 前发现:CI 从未运行过、真实密钥躺在仓库里、构建被开关吞掉错误、两份文档各说各的测试数。这是用 15 个 issue 还工程债的记录。
cover: /images/cover-git.jpg
---

我的 CI 从来没有跑过。

不是跑挂了,是从来没有运行过。三份 workflow 文件躺在仓库里,位置是 `scaffold-alchemy-main/.github/workflows/`——嵌套了一层目录。GitHub 只认根目录下的 `.github/workflows/`,多一层,整个 CI 就是一张截图。

同一天我还发现了另外几件事:真实的 Alchemy API Key 提交在仓库里,构建错误被一个开关吞掉,README 说测试 82 个,PROJECT.md 说 96 个。

这个项目要发布 v1.0.0 了。

<!-- more -->

## 项目是怎么来的

NFT Launchpad Kit,一个一站式 NFT 发行平台:6 种铸造模式、Factory Clone、管理后台。主合约约 950 行,33 个自定义错误,37 个事件,Feistel 密码做链上 tokenURI 洗牌。合约设计我在另一篇文章里写过——[从零搭建 NFT 发行平台](/2026/05/10/nft-launchpad-kit-web3/)。

它 fork 自 scaffold-alchemy,功能是完整的,测试是齐全的。功能完整、测试齐全,听起来是件好事。直到你发现:那些测试从来没被验证过。

## 十五个 issue

决定发布 v1.0.0 之后,我把所有"不确定"列成了 issue,编号 #1 到 #15。每一条都写清楚背景、改动范围、验收标准。用 issue 驱动发布的理由很朴素:验收标准写成清单,做完一件事打一个勾,发布的时候就知道"做到什么程度了"。

第一轮排查出来的问题,比预期严重:

**#1 安全清理。** `packages/nextjs/config/defaultKeys.json` 里硬编码了一对疑似真实的 Alchemy API Key(API Key + Gas Policy ID),而且同样的 key 出现在 `packages/hardhat/config/` 下,一共两处。更糟的是 `next.config.js` 会在环境变量缺失时自动把这对 key 注入构建产物——等于把钥匙直接发给每个下载构建产物的人。处理方式:从仓库删除、加入 .gitignore、环境变量化、检查历史。

**#2 仓库卫生。** 根目录同时躺着 `package-lock.json`(npm,997KB,31959 行)和 `yarn.lock`(yarn 3,740KB)。项目实际用的是 yarn 3,两个锁文件内容互不一致,谁按错的锁文件装依赖,谁就拿到另一套依赖树。997KB 的锁文件删掉,统一 yarn 3。

**#3 CI 重写。** 这就是那个"从未运行过"的问题。旧 CI 还有别的毛病:没有缓存、job 串行、失败被吞。目标:3–5 分钟跑完。合约 job 拆出来:setup-node、安装、编译、跑全部 96 个测试,约 2 分钟。

**#4 前端验证缺失。** 前端从未被 CI 验证:74 个 Vitest 用例、类型检查、lint 全缺。补 Job B。

**#5 真实构建。** 旧 deploy.yaml 依赖本地 .env;`next build` 带着 `IGNORE_BUILD_ERROR` 开关,构建错误会被吞掉——"构建通过"其实是"构建错了但没人知道"。新建 build.yml:push 到 main 后跑真实构建,不设开关。

**#7 测试基线。** README 声称 82 个测试,PROJECT.md 声称 96 个。同一份代码,两份文档,两个数字。实测为准:5 个测试文件,96 个用例,跑通,然后改文档。

**#8 静态审查。** PROJECT.md 声称 Slither 通过,39 项均为可接受或误报。重新验证:本地跑 Slither,输出归档到 issue;人工复核清单:重入、CEI、超额退款、签名重放、权限、零地址、工厂。

**#10 Gas 基准。** hardhat-gas-reporter 配置了,但只在本地有意义,CI 没有记录。跑一次完整 gas 报告存成基准文档,部署/铸造/批量铸造的消耗从此有数。

**#12 类型与构建。** `tsc --noEmit` 必须零错误,`next build` 必须真实通过。在 #5 之前,这两件事的真实状态未知。

**#14 debug 路由决策。** `app/debug/` 有 16 个文件,全套保留但不在导航里。决策:保留(合约调试要用),维持不进导航。这个 issue 的价值不在决定本身,在于把决定写下来——"为什么保留"从此有记录,不会三个月后再问一遍。

**#15 部署验证。** `deployedContracts.ts` 里已经有 Sepolia 的真实地址,但从未在 CI 流水线里验证过。手动触发部署流水线,跑 Etherscan 合约验证。

最后一串收尾:#9 死代码剔除、#11 前端测试全绿、#13 依赖瘦身(knip 找出 @uniswap/sdk-core、next-auth 这些疑似未用依赖)、#16 文档与代码同步、#17 打 tag 发 Release。

## 发布冲刺的账本

十五个 issue,大部分不是"写新功能",是"确认现状"。

密钥是否泄漏——确认,已修。CI 是否在跑——确认,没跑过,重写。构建是否通过——确认,被开关掩着,重跑。测试有多少个——确认,82 和 96 都不完全对,以实测为准。Gas 是多少——确认,存成基准。Slither 结果——确认,重新验证。Sepolia 地址——确认,补上 CI 验证。

这十五个勾打完,发布才敢按下去。

## 两个月后

冲刺没有停。

204 个测试。CI 3-4 分钟。密钥清理干净,锁文件只剩一份,构建真实通过。十五个 issue 全部合拢,然后:

**v1.0.0 发布了。** tag 打上去的那天,仓库从 `scaffold-alchemy-main` 的壳里彻底孵出来。

发布之后项目换了方向:不再是"给人类铸造 NFT 的平台",而是"给 AI agent 一把密钥,让它自己发行资产"。合约定稿了一条 trusted-signer 流程:离线签名授权链上铸造,一次性、限时、限量。签名者不一定是人。

那台 CI 跑起来了。它后来每天都在跑。

项目地址:[github.com/sijie-Z/nft-launchpad-kit](https://github.com/sijie-Z/nft-launchpad-kit)
