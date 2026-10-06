# LP-Tagger

> A desktop workbench for image datasets — gallery metadata, dataset tagging, and tag management.

**English** · [中文](./README.zh-CN.md)

---

## Overview

**LP-Tagger** is a cross-platform Electron desktop app for preparing and curating image datasets for diffusion-model training. It scans your image folders, reads the generation metadata embedded in each file, lets you tag or caption images with any OpenAI-compatible vision model, and exports the results as `.txt` sidecar files — all in a fast, dark, frosted-glass workspace.

It is a standalone tool: it never drives ComfyUI execution, it only reads the metadata ComfyUI (and other tools) already write into your images.

## Features

- **Dataset management** — add, rescan, and remove image folders (PNG / JPG / JPEG / WEBP). Recursive scanning is capped at 20,000 files per folder, with live progress.
- **Metadata extraction** — reads generation metadata from PNG `tEXt` / `iTXt` / `zTXt` chunks and sidecar `.txt` files, and auto-detects the producer:
  - **ComfyUI** node graphs (`prompt` workflow JSON → prompts, checkpoint, LoRAs, sampler params)
  - **AUTOMATIC1111** `parameters` blocks (positive/negative prompts, steps, CFG, seed, clip skip, sampler, LoRA hashes)
  - **NovelAI** comment JSON (`prompt`, `uc`, `steps`, `scale`, `seed`, `sampler`)
- **Thumbnails** — 420 px JPEG thumbnails generated on demand and served over a custom `thumb://` protocol.
- **AI tagging & captioning** — send images to any OpenAI-compatible vision endpoint (cloud or local, e.g. Ollama / vLLM) and get either:
  - **tag mode** — comma-separated tags, or
  - **caption mode** — a natural-language one-sentence description.
- **Tagging workbench** — job queue with pause / resume / cancel, configurable concurrency (1–8), model picker with live `/models` discovery, in-queue review, and non-destructive requeue.
- **Tag library** — a controlled vocabulary with per-tag category, aliases, and blacklist; co-occurrence suggestions.
- **Manual curation** — edit the raw comma-separated tag string or the caption directly, with two-way sync to the structured widgets. Removed tags are recorded as *hidden* (restorable), never discarded.
- **Export** — write per-image `.txt` sidecar files next to the images for the whole library or a single dataset.
- **Polished UI** — dark, translucent frosted-glass theme, virtualized grids, full keyboard navigation, and a command palette (Ctrl/Cmd+K).

## Tech Stack

| Layer | Technology |
|---|---|
| Shell | Electron 33 |
| Build | electron-vite 2 / Vite 5, electron-builder 25 |
| UI | React 18, TypeScript 5.7 |
| State | Zustand 5 (immer middleware) |
| Styling | Tailwind CSS 4 (CSS-first theming), Radix UI primitives |
| Grid | @tanstack/react-virtual |
| Icons | lucide-react |

No native modules are required — image parsing, thumbnails, and metadata extraction are all hand-rolled in TypeScript.

## Requirements

- **Node.js 18 or newer** (enforced by the install / start scripts)
- npm
- Windows, macOS, or Linux

## Quick Start

**Option A — one-click launchers (recommended)**

Windows (double-clickable):

```bat
install.bat            :: install deps + verify Electron + build
start.bat              :: ensure installed/built, then launch
start.bat --dev        :: dev mode with hot reload
```

macOS / Linux:

```bash
./install.sh           # install deps + verify Electron + build
./start.sh             # ensure installed/built, then launch
./start.sh --dev       # dev mode with hot reload
```

The install scripts use the `npmmirror.com` Electron mirror by default (the ~100 MB GitHub download often times out), and verify that the Electron binary actually landed on disk before declaring success.

**Option B — npm commands**

```bash
npm install            # install dependencies
npm run dev            # dev mode (electron-vite dev)
npm run build          # build to out/
npm start              # preview the built app
```

## npm Scripts

| Script | Description |
|---|---|
| `npm run dev` | Dev mode with hot reload |
| `npm run build` | Build main / preload / renderer to `out/` |
| `npm start` | Preview the built app |
| `npm run typecheck` | Type-check node + web configs |
| `npm run smoke` | End-to-end functional smoke test (isolated data dir) |
| `npm run dist` | Build and package installers into `release/` |
| `npm run rebuild` | Rebuild native dependencies for Electron |

## Launcher Flags

`install` / `start` scripts (both `.bat` and `.sh`) accept the same arguments:

**install**
- `--clean` — wipe `node_modules` and reinstall with `npm ci`
- `--dist` — also package into `release/`
- `--shortcut` — also create a shortcut/desktop entry
- `--help`

**start**
- `--dev` — dev mode with hot reload
- `--debug` — foreground launch with console logs
- `--rebuild` — reinstall dependencies and rebuild
- `--exe` — package into `release/`
- `--shortcut [desktop]` — create an icon shortcut (optionally on the Desktop)
- `--icon` — regenerate `build/icon.png` + `build/icon.ico`
- `--help`

## Packaging

`npm run dist` (or `install --dist` / `start --exe`) produces artifacts in `release/` via electron-builder:

| Platform | Targets | Artifact |
|---|---|---|
| Windows | NSIS installer (x64), portable (x64) | `LP-Tagger-<version>-setup.exe`, `…-portable.exe` |
| macOS | DMG | `LP-Tagger-<version>.dmg` |
| Linux | AppImage | `LP-Tagger-<version>.AppImage` |

macOS and Linux artifacts must be built on their respective platforms.

## Data & Configuration

All persistent state lives under Electron's `userData` directory:

- **Windows:** `%APPDATA%\LP-Tagger`
- **macOS:** `~/Library/Application Support/LP-Tagger`
- **Linux:** `~/.config/LP-Tagger`

Override with `--user-data-dir=<dir>`. On first launch, data from the legacy `ComfyUI Workspace` / `lp-workspace-of-comfy` directories is migrated automatically.

| File | Contents |
|---|---|
| `data/workspace.json` | Datasets, images, tag metadata, and settings (written atomically) |
| `data/endpoints.json` | API endpoint profiles (Base URL, env var, model) |
| `data/prompts.json` | Prompt templates, seeded with built-in tag & caption templates |
| `thumbnails/<id>.jpg` | Generated image thumbnails |

**API keys** can be supplied either as an in-app stored secret or via an environment variable, and the environment variable takes precedence. Recognized names include `FARO_API_KEY`, `OPENAI_API_KEY`, `DASHSCOPE_API_KEY`, and `DEEPSEEK_API_KEY`.

## Keyboard Shortcuts

| Keys | Action |
|---|---|
| `Ctrl/Cmd + K` | Open command palette |
| `Ctrl/Cmd + 1…6` | Switch view (Home / Gallery / Datasets / Tagging / Tags / Settings) |
| `Ctrl/Cmd + B` | Toggle inspector panel |
| `Ctrl/Cmd + A` | Select all |
| `Esc` | Clear selection |
| Arrow keys | Move focus in the image grid |
| `Space` | Toggle selection |
| `Enter` | Open inspector |

## Project Structure

```
src/
├── main/                 # Electron main process
│   ├── index.ts          # Window, custom protocol, app info
│   ├── ipc.ts            # IPC channel registration
│   └── services/         # db, scanner, metadata, tagging, endpoints, prompts, thumbnails, parsers
├── preload/              # Context-bridge API (window.workspace)
├── renderer/             # React UI (app, layout, components, features, hooks, lib, styles)
└── shared/               # Shared types + defaults (types.ts, defaults.ts)
scripts/                  # install/start helpers, smoke test, icon & shortcut generators
build/                    # App icons
release/                  # Packaged output (gitignored)
```

## Smoke Test

```bash
npm run smoke
```

Boots a real Electron instance against an isolated temporary `--user-data-dir` (never touching your real data) and exercises the main flows: navigation, dataset scan, thumbnails, multi-select, tagging, manual edits, `.txt` export, API config, prompt templates, and window controls. Exit code `0` means all assertions passed.

## License

MIT © LP
