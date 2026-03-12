#!/bin/bash

# 使用 MSYS_NO_PATHCONV=1 防止 Git Bash 转换路径
MSYS_NO_PATHCONV=1 pnpm build -- --base=/transmission/web/
