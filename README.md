# Copilot Switch

[English](./README.en.md)

通过环境变量切换 GitHub Copilot BYOK (Bring Your Own Key) 供应商的桌面工具。

管理多个 AI 供应商配置，一键切换 GitHub Copilot 连接的目标供应商。设置系统级环境变量，让 Copilot CLI 或 IDE 扩展连接到你选择的供应商。

## 功能特性

- **多供应商管理** — 创建、编辑、删除、拖拽排序
- **三种供应商类型** — OpenAI（及兼容接口）、Azure OpenAI、Anthropic Claude
- **一键激活** — 切换操作系统级环境变量
- **密钥加密** — API Key 通过 Electron `safeStorage` 加密存储在 SQLite
- **环境持久化** — Windows: `reg add` 写入 `HKCU\Environment`；macOS: `launchctl setenv`
- **健康检查** — 深度 ping（`chat.completions`），延迟追踪，历史记录
- **启动自动恢复** — 重新应用上次激活的供应商
- **Wire API 选择** — 支持 `completions` 和 `responses` 协议
- **单实例锁** — 防止重复窗口

## 技术栈

| 层级 | 技术 |
|---|---|
| 运行时 | Electron 42 + Bun |
| UI | React 18 + TanStack Router |
| 组件库 | shadcn/ui (Radix + Tailwind CSS) |
| 状态管理 | Zustand 5 |
| 数据库 | SQLite via `node:sqlite`（Electron 内置） |
| 校验 | Zod + React Hook Form |
| 构建 | Vite 5 + vite-plugin-electron |
| 打包 | electron-builder (NSIS / DMG / AppImage) |
| 测试 | Vitest（单元）+ Playwright（E2E） |
| 代码质量 | Biome |

## 快速开始

```bash
# 安装依赖
bun install

# 启动开发模式（纯 Web，无 Electron）
bun run dev

# 启动开发模式（带 Electron）
bun run gui
```

## 常用脚本

| 命令 | 说明 |
|---|---|
| `bun run dev` | Vite 开发服务器（Web 模式） |
| `bun run gui` | Vite + Electron HMR |
| `bun run build` | Vite 生产构建 |
| `bun run test` | Vitest watch 模式 |
| `bun run test:unit` | 运行单元测试 |
| `bun run test:coverage` | 单元测试 + 覆盖率 |
| `bun run test:e2e` | Playwright E2E 测试 |
| `bun run test:e2e:smoke` | 仅冒烟测试 |
| `bun run verify` | 类型检查 + 覆盖率 |
| `bun run lint` | Biome 检查 |
| `bun run lint:fix` | Biome 自动修复 |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run electron:build` | electron-builder 打包 |

## 供应商类型

| 类型 | Key 环境变量 | Base URL 环境变量 | 附加 |
|---|---|---|---|
| `openai` | `OPENAI_API_KEY` | `OPENAI_BASE_URL` | — |
| `azure` | `AZURE_OPENAI_KEY` | `AZURE_OPENAI_BASE_URL` | `AZURE_API_VERSION` |
| `anthropic` | `ANTHROPIC_API_KEY` | `ANTHROPIC_BASE_URL` | — |

全局变量：`COPILOT_MODEL`、`COPILOT_PROVIDER_WIRE_API`、`COPILOT_PROVIDER_BEARER_TOKEN`。

## 项目架构

```
src/
  main/                  # Electron 主进程
    index.ts             # 入口：单实例、DB 初始化、IPC、自动恢复
    window.ts            # BrowserWindow 创建
    db/                  # SQLite schema、迁移、仓储
    ipc/                 # IPC 处理器（provider、health、system）
    services/            # envSwitcher、healthChecker、crypto
    logger.ts            # 结构化文件日志

  preload/
    index.ts             # contextBridge 类型化 API 代理

  renderer/              # React UI
    pages/               # HomePage、AddProviderPage、EditProviderPage
    components/          # ProviderForm、ProviderList、ProviderCard、LogViewer
    stores/              # Zustand providerStore

  shared/                # 跨进程类型和 Zod schemas
```

**IPC 流程：** Renderer → `window.api.*` → `ipcRenderer.invoke` → `ipcMain.handle` → 主进程。

## 测试

```bash
# 单元测试
bun run test:unit

# E2E 测试（需要 Electron 构建）
bun run test:e2e

# 完整验证
bun run verify
```

E2E 测试使用 StepFun API，在 `.env` 中配置：
```
STEPFUN_API_KEY=your-key-here
```

## 构建

```bash
# Windows
bun run electron:build:win

# macOS
bun run electron:build:mac

# Linux
bun run electron:build:linux
```

输出目录：`release/`

## 文档

- [English Documentation](./README.en.md)
- [原理说明](copilot%20switch原理.md) — Copilot BYOK 工作机制
- [StepFun API](docs/stepFunAPI.txt) — 测试用 API 文档
- [设计稿](Design/) — UI 原型

## License

MIT
