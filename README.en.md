# Copilot Switch

[中文](./README.md)

Switch GitHub Copilot BYOK (Bring Your Own Key) provider via environment variables.

A desktop GUI tool that manages and switches between multiple AI provider configurations for GitHub Copilot. It sets platform-level environment variables so Copilot CLI or IDE extension connects to your chosen provider.

## Features

- **Multi-provider management** — Create, edit, delete, and reorder providers with drag-and-drop
- **Three provider types** — OpenAI (and OpenAI-compatible), Azure OpenAI, Anthropic Claude
- **One-click activation** — Switch all environment variables at the OS level
- **Secret encryption** — API keys encrypted via Electron `safeStorage`, stored in SQLite
- **Environment persistence** — Windows: `reg add` to `HKCU\Environment`; macOS: `launchctl setenv`
- **Health checks** — Deep ping via `chat.completions`, latency tracking, history
- **Auto-restore** — Re-applies the last active provider on startup
- **Wire API selection** — Supports `completions` and `responses` wire protocols
- **Single-instance lock** — Prevents duplicate windows

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Electron 42 + Bun |
| UI | React 18 + TanStack Router |
| Components | shadcn/ui (Radix + Tailwind CSS) |
| State | Zustand 5 |
| Database | SQLite via `node:sqlite` (Electron built-in) |
| Validation | Zod + React Hook Form |
| Build | Vite 5 + vite-plugin-electron |
| Packaging | electron-builder (NSIS / DMG / AppImage) |
| Tests | Vitest (unit) + Playwright (E2E) |
| Linting | Biome |

## Quick Start

```bash
# Install dependencies
bun install

# Start dev mode (web, no Electron)
bun run dev

# Start dev mode with Electron
bun run gui
```

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Vite dev server (web mode) |
| `bun run gui` | Vite + Electron with HMR |
| `bun run build` | Vite production build |
| `bun run test` | Vitest in watch mode |
| `bun run test:unit` | Run unit tests once |
| `bun run test:coverage` | Unit tests with coverage |
| `bun run test:e2e` | Playwright E2E tests |
| `bun run test:e2e:smoke` | Smoke tests only |
| `bun run verify` | Typecheck + test:coverage |
| `bun run lint` | Biome lint check |
| `bun run lint:fix` | Biome lint auto-fix |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run electron:build` | Package with electron-builder |

## Provider Types

| Type | Key Env Var | Base URL Env Var | Extra |
|---|---|---|---|
| `openai` | `OPENAI_API_KEY` | `OPENAI_BASE_URL` | — |
| `azure` | `AZURE_OPENAI_KEY` | `AZURE_OPENAI_BASE_URL` | `AZURE_API_VERSION` |
| `anthropic` | `ANTHROPIC_API_KEY` | `ANTHROPIC_BASE_URL` | — |

Additional global variables: `COPILOT_MODEL`, `COPILOT_PROVIDER_WIRE_API`, `COPILOT_PROVIDER_BEARER_TOKEN`.

## Architecture

```
src/
  main/                  # Electron main process
    index.ts             # Entry: single-instance, DB init, IPC, auto-restore
    window.ts            # BrowserWindow creation
    db/                  # SQLite schema, migrations, repository
    ipc/                 # IPC handlers (provider, health, system)
    services/            # envSwitcher, healthChecker, crypto
    logger.ts            # Structured file logger

  preload/
    index.ts             # contextBridge typed API proxy

  renderer/              # React UI
    pages/               # HomePage, AddProviderPage, EditProviderPage
    components/          # ProviderForm, ProviderList, ProviderCard, LogViewer
    stores/              # Zustand providerStore

  shared/                # Cross-process types and Zod schemas
```

**IPC flow:** Renderer → `window.api.*` → `ipcRenderer.invoke` → `ipcMain.handle` → main process.

## Testing

```bash
# Unit tests
bun run test:unit

# E2E tests (requires Electron build)
bun run test:e2e

# Full verification
bun run verify
```

E2E tests use the StepFun API. Set your API key in `.env`:
```
STEPFUN_API_KEY=your-key-here
```

## Build

```bash
# Windows
bun run electron:build:win

# macOS
bun run electron:build:mac

# Linux
bun run electron:build:linux
```

Output: `release/`

## Documentation

- [中文文档](./README.md)
- [原理说明](copilot%20switch原理.md) — Copilot BYOK 工作机制
- [StepFun API](docs/stepFunAPI.txt) — 测试用 API 文档
- [Design](Design/) — UI 原型

## License

MIT
