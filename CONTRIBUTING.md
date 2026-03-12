# 贡献指南 / Contributing Guide

感谢你对 Find Skill App 的关注与贡献。
Thank you for your interest in contributing to Find Skill App.

## 开发环境 / Development Setup

```bash
pnpm install
pnpm tauri dev
```

## 提交流程 / Workflow

1. Fork 仓库并创建分支（`feature/*`、`fix/*`）
2. 保持变更聚焦，避免无关重构
3. 提交前确保构建通过：`pnpm build`
4. 提交 Pull Request，并描述变更背景与测试结果

1. Fork the repository and create a branch (`feature/*`, `fix/*`)
2. Keep changes focused and avoid unrelated refactors
3. Ensure build passes before opening PR: `pnpm build`
4. Open a Pull Request with clear context and test results

## 代码规范 / Code Style

- 前端使用 TypeScript
- 保持组件与模块职责单一
- 避免引入未使用依赖

- Use TypeScript for frontend changes
- Keep components and modules focused
- Avoid adding unused dependencies

## 问题反馈 / Issues

请在 Issue 中附上：
- 复现步骤
- 预期行为与实际行为
- 运行环境（OS、Node、Rust、pnpm 版本）

When reporting issues, include:
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node, Rust, pnpm versions)
