---
title: Docker 改变了我对"环境"的理解
date: 2026-04-22 16:00:00
categories:
  - 技术思考
tags:
  - Docker
  - 容器化
  - 工程思维
description: Docker 不只是一个部署工具，它改变了我思考"环境"和"依赖"的方式。这篇文章记录了我从"在我机器上能跑"到"在任何机器上都能跑"的认知转变。
cover: /images/cover-devops.jpg
---

## "在我机器上能跑"

这句话是程序员的经典名言，也是无数线上事故的根源。

我第一次深刻体会到这个问题，是在帮朋友部署一个 Node.js 项目。他的机器上跑得好好的，到我这就报错。查了半天，发现是 Node.js 版本不一样。我的是 18，他的是 16。某个 API 在 18 里改了行为。

当时我的解决办法是：装一个 nvm，切换到 16，跑完再切回来。问题解决了，但我觉得这个办法很蠢。

后来接触了 Docker，才意识到：**"环境"本身应该是可以版本控制的。**

<!-- more -->

## Docker 的本质

很多人把 Docker 理解成"轻量级虚拟机"。这个类比不算错，但不够准确。

我的理解是：**Docker 是"环境即代码"的实现。**

传统方式：你在服务器上装一堆软件，配置一堆环境变量，祈祷下次部署的时候环境还是一样的。

Docker 方式：你写一个 Dockerfile，把环境的所有细节都描述清楚。任何机器上执行 `docker build`，都能得到一模一样的环境。

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

这个文件不只是"部署配置"，它是**环境的源代码**。和你的业务代码一样，可以版本控制、可以 Code Review、可以回滚。

## 我用 Docker 做什么

### 1. 开发环境标准化

团队里每个人用不同的操作系统、不同的 Node.js 版本、不同的数据库版本。Docker 让所有人用同一套环境：

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development

  db:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=dev
    volumes:
      - pgdata:/var/lib/postgresql/data
```

新人入职，`docker-compose up` 一条命令就能跑起来，不用花半天装环境。

### 2. 部署一致性

本地用 Docker 跑，CI/CD 用 Docker 构建，生产环境用 Docker 运行。整个流程中，环境完全一致。

"在我机器上能跑"这句话终于可以退休了。

### 3. 快速尝试新技术

想试试 Redis？不用装，直接 `docker run redis`。想试试 PostgreSQL？`docker run postgres`。用完就删，不留垃圾。

这改变了我尝试新技术的方式——以前"试试新东西"意味着"装一堆东西"，现在只是"多跑一个容器"。

## 踩过的坑

### 坑 1：镜像太大

第一次写 Dockerfile，构建出来的镜像有 1.2GB。原因是用了 `node:latest`（完整版），而且没有 `.dockerignore`。

```dockerfile
# 错误：用完整版基础镜像
FROM node:latest

# 正确：用 alpine 版本
FROM node:18-alpine
```

加上 `.dockerignore` 排除 `node_modules` 和 `.git`，镜像缩小到 150MB。

### 坑 2：数据丢失

容器是临时的。我在容器里装了数据库，写了数据，容器一删，数据全没了。

解决方案：用 Volume 持久化数据。

```yaml
volumes:
  pgdata:  # 声明一个命名卷

services:
  db:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data  # 挂载到容器内
```

### 坑 3：网络不通

两个容器之间互相访问，用 `localhost` 不行。每个容器有自己的网络命名空间。

解决方案：用 Docker Compose 的服务名作为主机名。

```yaml
services:
  app:
    environment:
      - DB_HOST=db  # 用服务名，不是 localhost
  db:
    image: postgres:15
```

## Docker 对我思维方式的影响

Docker 教会我的不只是技术，更是一种思维方式：

**1. 环境是代码的一部分。** 不是"部署的时候再配"，而是和业务代码一起管理。

**2. 不可变基础设施。** 容器一旦创建就不修改。要更新？创建新的，销毁旧的。这减少了"改了什么导致出问题"的排查成本。

**3. 一次构建，到处运行。** 这不只是口号，而是真实的工程实践。

## 总结

Docker 的学习曲线不陡，但它的影响很深。它不只是一个部署工具，而是改变了我思考"环境"、"依赖"、"部署"这些问题的方式。

如果你还在用"在我机器上能跑"这种方式工作，试试 Docker。不是因为它时髦，而是因为它真的能解决问题。

---

*"任何在我出生时就有的科技都是稀松平常的；任何在我 15-35 岁之间诞生的科技都是将会改变世界的；任何在我 35 岁之后诞生的科技都是违反自然规律的。" —— 道格拉斯·亚当斯*

*Docker 诞生于 2013 年。对我来说，它确实是改变世界的那种技术。*
