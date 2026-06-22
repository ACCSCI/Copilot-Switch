#!/usr/bin/env bash
# 闭环开发脚本：并行启动 Vite HMR + Vitest watch
set -e

cleanup() {
  trap - SIGINT SIGTERM EXIT
  kill $(jobs -p) 2>/dev/null
  exit
}
trap cleanup SIGINT SIGTERM EXIT

echo "🚀 启动 Copilot Switch 闭环开发..."

# 1) Vite + Electron HMR
bun run dev:electron &

# 2) Vitest watch 模式（可选：手动 bun run test:ui）
# bunx vitest --watch &

wait
