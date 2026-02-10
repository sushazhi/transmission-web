#!/bin/bash

# 本地构建脚本
# 设置正确的环境变量进行构建

set -e

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
step() { echo -e "${BLUE}[STEP]${NC} $1"; }

log "开始本地构建..."

# 检查工具
command -v node >/dev/null 2>&1 || { error "需要 node"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { error "需要 pnpm"; exit 1; }

# 设置环境变量
export VITE_BASE_URL=/transmission/web

step "设置环境变量: VITE_BASE_URL=$VITE_BASE_URL"

# 安装依赖
step "安装依赖"
pnpm install

# 构建项目
step "构建项目"
pnpm run build

# 验证构建结果
step "验证构建结果"
if [ ! -d "dist" ]; then
    error "构建失败，dist 目录不存在"
    exit 1
fi

if [ ! -f "dist/index.html" ]; then
    error "构建失败，index.html 不存在"
    exit 1
fi

# 显示构建信息
log "✅ 构建成功！"
echo "📁 构建目录: dist/"
echo "📄 主文件: dist/index.html"
echo "📊 构建大小: $(du -sh dist | cut -f1)"

# 检查是否包含正确的 base URL
if grep -q "/transmission/web" dist/index.html; then
    log "✅ 基础路径配置正确"
else
    warn "⚠️  基础路径可能未正确配置"
fi

log "🎉 构建完成！"
