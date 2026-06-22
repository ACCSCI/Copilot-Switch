# Copilot Switch

通过环境变量切换 GitHub Copilot BYOK (Bring Your Own Key) 供应商的桌面工具。

## 技术栈

- **运行时**: Electron 33 + Bun
- **UI**: React 18 + TanStack Router + shadcn/ui + Tailwind CSS
- **状态**: Zustand
- **数据**: Drizzle ORM + SQLite (better-sqlite3)
- **校验**: Zod
- **构建**: Vite 5
- **测试**: Vitest + Playwright (含真实 StepFun API E2E)
- **代码质量**: Biome

## 开发

```bash
# 安装依赖
bun install

# 启动开发模式（HMR）
bun run dev:loop

# 单元/组件测试（watch）
bun run test:ui

# E2E（含真实 StepFun API 验证）
STEPFUN_API_KEY=your_key bun run test:e2e

# 完整验证
bun run verify
```

## 文档

- [原理说明](copilot%20switch原理.md) - Copilot BYOK 工作机制
- [StepFun API](docs/stepFunAPI.txt) - 测试用 API 文档
- [设计稿](Design/) - UI 原型

## 目录结构

```
src/
├── main/        # Electron 主进程
├── preload/     # 安全桥接
├── renderer/    # React 渲染层
└── shared/      # 跨进程共享类型/Zod
tests/
├── e2e/         # Playwright E2E（真实 API）
├── integration/ # 跨进程集成测试
└── setup/       # 测试环境配置
```
