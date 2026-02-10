#!/bin/bash

# GitHub Actions 发布脚本
# 这个脚本只负责创建标签并推送到 GitHub，让 GitHub Actions 自动处理构建和发布

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

# 获取版本号
VERSION=${1:-$(node -p "require('../package.json').version")}

# 验证版本号格式（支持预发布版本）
if [[ ! $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$ ]]; then
    error "版本号格式错误: $VERSION"
    echo "支持的格式:"
    echo "  正式版本: 1.0.0, 2.1.3"
    echo "  预发布版本: 1.0.0-beta.1, 1.0.0-alpha.2, 1.0.0-rc.1"
    echo "  构建版本: 1.0.0+build.1, 1.0.0-beta.1+build.1"
    exit 1
fi

# 检查是否为预发布版本
if [[ $VERSION =~ - ]]; then
    warn "检测到预发布版本: $VERSION"
    echo "预发布版本通常用于测试，不会自动发布到正式版本"
fi

log "开始 GitHub Actions 发布流程: $VERSION"
log "构建时将使用 VITE_BASE_URL=/transmission/web"

# 检查工具
command -v git >/dev/null 2>&1 || { error "需要 git"; exit 1; }
command -v node >/dev/null 2>&1 || { error "需要 node"; exit 1; }

# 检查 Git 状态
step "检查 Git 状态"
if [[ -n $(git status --porcelain) ]]; then
    warn "有未提交的更改:"
    git status --short
    read -p "是否继续? (y/N): " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]] || exit 0
fi

# 检查是否在正确的分支
current_branch=$(git branch --show-current)
if [[ "$current_branch" != "main" && "$current_branch" != "master" ]]; then
    warn "当前分支是 $current_branch，建议在 main 或 master 分支上发布"
    read -p "是否继续? (y/N): " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]] || exit 0
fi

# 检查远程仓库
if ! git remote get-url origin >/dev/null 2>&1; then
    error "未配置远程仓库"
    exit 1
fi

# 更新版本号
step "更新 package.json 版本号"
npm version "$VERSION" --no-git-tag-version

# 提交更改
step "提交更改"
git add .
git commit -m "chore: prepare release v$VERSION"

# 创建标签
step "创建 Git 标签"
git tag -a "v$VERSION" -m "Release v$VERSION"

# 推送到远程
step "推送到远程仓库"
git push origin HEAD
git push origin "v$VERSION"

log "🎉 标签已推送！"
log "GitHub Actions 将自动触发构建和发布流程"
log "查看进度: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\/[^/]*\).*/\1/')/actions"
log "Release URL: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\/[^/]*\).*/\1/')/releases/tag/v$VERSION"

echo ""
warn "注意："
echo "1. GitHub Actions 会自动构建项目"
echo "2. 构建成功后会自动创建 Release"
echo "3. 可以在 GitHub 的 Actions 页面查看构建进度"
echo "4. 如果构建失败，请检查 Actions 日志"
