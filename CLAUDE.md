# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Find Skills" is a Tauri-based desktop application that provides a GUI wrapper for the `npx skills` CLI tool. It allows users to search, install, and manage Claude Code skills from a desktop interface.

## Technology Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Rust (Tauri v2)
- **Styling**: Tailwind CSS v4 + PostCSS + Framer Motion
- **State Management**: Zustand with Tauri Store plugin for persistence
- **UI Components**: Radix UI primitives + custom components

## Development Commands

```bash
# Install dependencies
pnpm install

# Run in development mode (starts Vite + Tauri)
pnpm tauri dev

# Build frontend only
pnpm build

# Build Tauri application for production
pnpm tauri build

# Preview production build
pnpm preview
```

## Project Structure

```
app/
├── src/                      # React frontend
│   ├── App.tsx              # Main app with all views (search/installed/settings)
│   ├── store/appStore.ts    # Zustand store with persistence logic
│   ├── lib/skills.ts        # CLI output parsing and command building utilities
│   ├── components/ui/       # Reusable UI components
│   └── hooks/               # Custom React hooks
├── src-tauri/               # Rust backend
│   ├── src/lib.rs          # Tauri commands and system tray setup
│   └── tauri.conf.json     # Tauri configuration (window, bundle, security)
├── package.json            # Frontend dependencies
├── vite.config.ts          # Vite config (port 1420, HMR settings)
├── tailwind.config.ts      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## Architecture Patterns

### Frontend-Backend Communication
- All Rust commands are defined in `src-tauri/src/lib.rs` and exposed via `invoke()` calls from React
- Event-driven log streaming: Rust emits `skills-command-log` and `skills-command-finished` events for real-time output
- Tauri Store plugin persists settings, history, and installed skills cache to `config.json`

### State Management
- Single Zustand store in `src/store/appStore.ts` manages:
  - User settings (global install preference, shortcut, theme, language)
  - Search state (query, results, loading status)
  - Install jobs (tracking in-progress installations with logs)
  - Installed skills cache
- Store auto-persists to disk via Tauri Store plugin

### CLI Integration
- Rust backend spawns `npx skills` or `pnpm dlx skills` processes
- Commands: `find`, `add`, `list`, `check`, `update`
- Supports both global (`-g`) and project-specific installations
- Output decoding handles UTF-8 and GBK (for Windows Chinese output)
- ANSI escape codes are stripped for clean display

### Key UI Features
- Three views: Search (skill discovery), Installed (management), Settings (configuration)
- Modal for skill installation with agent selection and sub-skill picking
- System tray with show/hide/quit menu
- Global shortcut (default: Alt+Space) to toggle window visibility
- Log panel slides up from bottom during operations

## Working with Code

### Adding New Tauri Commands
1. Add command handler in `src-tauri/src/lib.rs` with `#[tauri::command]` attribute
2. Register in the `invoke_handler!` macro in the `run()` function
3. Call from frontend using `invoke("command_name", { args })`

### Styling
- Tailwind CSS v4 uses `@import "tailwindcss"` in CSS files
- Custom color "primary" is available (configure in CSS if needed)
- Dark theme only (zinc color palette)

### Type Safety
- TypeScript strict mode enabled
- Types shared between frontend and store (e.g., `InstallConfig`, `SkillResult`)
- Always run `tsc` before building to check for type errors

### Adding Translations
- All UI strings are in `messages` object in `App.tsx`
- Supported languages: `zh` (Chinese), `en` (English)
- Add new keys to both language objects
