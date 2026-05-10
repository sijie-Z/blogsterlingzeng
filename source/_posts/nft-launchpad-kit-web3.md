---
title: 从零搭建 NFT 发行平台——智能合约到前端的全链路实践
date: 2026-05-10 12:00:00
categories:
  - 项目实战
tags:
  - Web3
  - Solidity
  - NFT
  - Next.js
  - 智能合约
description: NFT Launchpad Kit 是一个一站式 NFT 发行平台，支持 6 种铸造模式。这篇文章记录了智能合约设计、Gas 优化和安全防护的完整过程。
cover: /images/cover-devops.jpg
---

## 起因

NFT 市场经历了从狂热到理性的过程。但抛开炒作，NFT 作为一种数字资产确权技术，本身是有价值的。

我想做一个 NFT 发行平台，不是 OpenSea 那种交易市场，而是**发行侧**——让项目方能够以低成本、安全地发行自己的 NFT 集合。

<!-- more -->

## 6 种铸造模式

不同的 NFT 项目有不同的发行需求。我设计了 6 种铸造模式：

| 模式 | 场景 | 特点 |
|------|------|------|
| 公开铸造 | 大众发售 | 固定价格 + 每钱包限额 |
| 白名单铸造 | 早期社区 | Merkle Proof 验证 |
| 荷兰拍 | 价格发现 | 价格随时间递减 |
| 签名授权 | 合作伙伴 | EIP-712 结构化签名 |
| ERC20 支付 | 代币经济 | 用项目代币购买 |
| 分阶段铸造 | 复杂发售 | 多阶段，每阶段独立配置 |

### 白名单铸造的实现

白名单铸造的核心是 Merkle Tree。项目方生成一个地址列表，计算 Merkle Root 写入合约。铸造时用户提交 Merkle Proof，合约验证地址是否在白名单中。

```solidity
function whitelistMint(
    uint256 quantity,
    bytes32[] calldata merkleProof
) external payable {
    bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
    require(
        MerkleProof.verify(merkleProof, merkleRoot, leaf),
        "Not in whitelist"
    );
    // ... 铸造逻辑
}
```

好处是白名单不需要上链（只需要 Root），省 gas。前端用 CSV 上传地址列表，自动生成 Merkle Proof。

### 荷兰拍的实现

荷兰拍的价格随时间递减：

```solidity
function getCurrentPrice() public view returns (uint256) {
    if (block.timestamp >= auctionEndTime) {
        return endPrice;
    }
    uint256 elapsed = block.timestamp - auctionStartTime;
    uint256 duration = auctionEndTime - auctionStartTime;
    return startPrice - (startPrice - endPrice) * elapsed / duration;
}
```

用户觉得价格合适就买。这是一种自然的价格发现机制——市场会自动找到供需平衡点。

## Gas 优化

以太坊的 Gas 费是 NFT 发行的主要成本。我做了大量优化：

### ERC721A

标准 ERC721 每铸造一个 NFT 需要约 60,000 gas。用 ERC721A（Azuki 团队开源的实现），批量铸造时每个 NFT 只需约 6,000 gas，**节省 70-90%**。

原理：ERC721A 把多个连续 token ID 的元数据合并存储，只在读取时展开。

### ERC-1167 Minimal Proxy Clone

Factory 模式部署新集合时，不用每次都部署完整合约。用 Minimal Proxy Clone，每个新集合只需部署一个 45 字节的代理合约，**节省 93% 的部署 gas**。

代理合约把所有调用委托给一个已部署的实现合约，只有存储是独立的。

### 合约大小优化

Solidity 合约有 24KB 的大小限制。我的主合约约 950 行，接近上限。优化手段：

- 启用 `viaIR` 编译器优化
- 把不常用的函数放到外部库
- 合并重复逻辑

## 安全防护

NFT 合约管理着真金白银，安全是第一位的。

### 重入防护

所有涉及 `payable` 和 `withdraw` 的函数都加了 `ReentrancyGuard`：

```solidity
function withdraw() external onlyAdmin nonReentrant {
    uint256 balance = address(this).balance;
    (bool success, ) = msg.sender.call{value: balance}("");
    require(success, "Transfer failed");
}
```

### CEI 模式

Checks-Effects-Interactions：先检查条件，再修改状态，最后才进行外部调用。这是防止重入攻击的基本功。

### 签名防重放

EIP-712 签名授权铸造，每个签名绑定 nonce，用过即废。防止签名被截获后重复使用。

### 测试覆盖

82 个测试用例，覆盖所有铸造模式、边界情况和安全场景：

| 模块 | 测试数 |
|------|--------|
| 铸造模式 | 9 |
| 路由 | 20 |
| Claim Conditions | 32 |
| 压力测试 | 8 |
| Factory Clone | 13 |
| **总计** | **82** |

## 前端

Next.js 14 + viem + wagmi + TailwindCSS。管理后台支持：

- 集合创建和配置
- 白名单管理（CSV 上传 → Merkle Root 自动生成）
- 实时活动监控
- 铸造状态和 Gas 估算

## 总结

做 NFT Launchpad Kit 最大的收获是对 Solidity 的深入理解。从"能跑就行"到"安全 + 高效 + 可扩展"，中间差了无数个坑。

Web3 开发和传统后端最大的区别是：**你的代码直接管钱，没有撤回键。** 一个 bug 可能导致几百万美元的损失。这种压力让你不得不认真对待每一行代码。

项目地址：[github.com/sijie-Z/nft-launchpad-kit](https://github.com/sijie-Z/nft-launchpad-kit)
