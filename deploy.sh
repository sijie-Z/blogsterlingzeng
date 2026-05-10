#!/bin/bash
# ============================================
# 博客部署脚本 — 宝塔面板
# 用法: bash deploy.sh
# ============================================

set -e

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Sterling Zeng's Blog — 部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# ============================================
# 服务器配置（修改为你的实际信息）
# ============================================
SERVER_USER="root"
SERVER_IP="120.55.163.198"
SERVER_DIR="/www/wwwroot/sterlingzeng.cn"

# ============================================
# 检查配置
# ============================================
if [ "$SERVER_IP" = "你的服务器IP" ]; then
  echo -e "${RED}错误: 请先修改 deploy.sh 中的 SERVER_IP${NC}"
  echo -e "${YELLOW}将第 26 行的 '你的服务器IP' 改为你的实际服务器 IP${NC}"
  exit 1
fi

# 1. 清理旧的构建文件
echo -e "${YELLOW}[1/4] 清理旧构建...${NC}"
npm run clean

# 2. 生成静态文件
echo -e "${YELLOW}[2/4] 生成静态文件...${NC}"
npm run build

# 3. 清空服务器目录并上传
echo -e "${YELLOW}[3/4] 部署到服务器...${NC}"
echo "  目标: ${SERVER_USER}@${SERVER_IP}:${SERVER_DIR}/"

# 清空服务器上的旧文件（保留目录）
ssh ${SERVER_USER}@${SERVER_IP} "find ${SERVER_DIR} -mindepth 1 -delete"

# 上传新文件
scp -r ./public/* ${SERVER_USER}@${SERVER_IP}:${SERVER_DIR}/

# 4. 完成
echo ""
echo -e "${GREEN}[4/4] 部署完成！${NC}"
echo -e "  访问: https://sterlingzeng.cn"
echo -e "${GREEN}========================================${NC}"
