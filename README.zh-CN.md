# LP-Tagger

> 图像数据集桌面工作台 —— 图库元数据、数据集打标、标签管理。

[English](./README.md) · **中文**

---

## 简介

**LP-Tagger** 是一款跨平台的 Electron 桌面应用，用于整理和打磨扩散模型训练所需的图像数据集。它会扫描你的图像文件夹，读取每张图片中嵌入的生成元数据，让你用任意 OpenAI 兼容的视觉模型为图片打标签或写描述，并将结果导出为 `.txt` 旁车文件 —— 全部在一个快速、深色、磨砂玻璃质感的工作台中完成。

它是一个独立工具：不会驱动 ComfyUI 执行任务，只读取 ComfyUI（及其它工具）已经写入图片的元数据。

## 功能特性

- **数据集管理** —— 添加、重新扫描、移除图像文件夹（PNG / JPG / JPEG / WEBP）。递归扫描每个文件夹最多 20,000 个文件，并实时显示进度。
- **元数据提取** —— 从 PNG 的 `tEXt` / `iTXt` / `zTXt` 数据块以及旁车 `.txt` 文件读取生成元数据，并自动识别来源：
  - **ComfyUI** 节点图（`prompt` 工作流 JSON → 提示词、底模、LoRA、采样参数）
  - **AUTOMATIC1111** 的 `parameters` 文本块（正/负提示词、步数、CFG、种子、Clip skip、采样器、LoRA 哈希）
  - **NovelAI** 注释 JSON（`prompt`、`uc`、`steps`、`scale`、`seed`、`sampler`）
- **缩略图** —— 按需生成 420 px JPEG 缩略图，通过自定义 `thumb://` 协议提供服务。
- **AI 打标与描述** —— 将图片发送到任意 OpenAI 兼容的视觉接口（云端或本地，如 Ollama / vLLM），输出两种模式：
  - **标签模式** —— 逗号分隔的标签，或
  - **描述模式** —— 一句话自然语言描述。
- **打标工作台** —— 任务队列支持暂停 / 继续 / 取消，可配置并发数（1–8），模型选择器支持实时拉取 `/models`，队列内可复核，并支持无损重新排队。
- **标签库** —— 受控词表，每个标签可设置分类、别名与屏蔽；支持共现标签建议。
- **手动整理** —— 直接编辑逗号分隔的原始标签串或描述文本，与结构化控件双向同步。被删除的标签会记录为 *已隐藏*（可恢复），而非丢弃。
- **导出** —— 将标签/描述写为与图片同名的 `.txt` 旁车文件，支持整个图库或单个数据集。
- **精致界面** —— 深色磨砂玻璃主题、虚拟滚动网格、完整键盘导航与命令面板（Ctrl/Cmd+K）。

## 技术栈

| 层 | 技术 |
|---|---|
| 外壳 | Electron 33 |
| 构建 | electron-vite 2 / Vite 5、electron-builder 25 |
| 界面 | React 18、TypeScript 5.7 |
| 状态 | Zustand 5（immer 中间件） |
| 样式 | Tailwind CSS 4（CSS 优先主题）、Radix UI 原语 |
| 网格 | @tanstack/react-virtual |
| 图标 | lucide-react |

无需任何原生模块 —— 图像解析、缩略图与元数据提取全部由 TypeScript 手写实现。

## 环境要求

- **Node.js 18 或更高版本**（由安装 / 启动脚本强制校验）
- npm
- Windows、macOS 或 Linux

## 快速开始

**方式 A —— 一键启动脚本（推荐）**

Windows（可直接双击）：

```bat
install.bat            :: 安装依赖 + 校验 Electron + 构建
start.bat              :: 确保已安装/已构建，然后启动
start.bat --dev        :: 开发模式，热重载
```

macOS / Linux：

```bash
./install.sh           # 安装依赖 + 校验 Electron + 构建
./start.sh             # 确保已安装/已构建，然后启动
./start.sh --dev       # 开发模式，热重载
```

安装脚本默认使用 `npmmirror.com` 的 Electron 镜像（GitHub 上约 100 MB 的下载经常超时），并在宣告成功前确认 Electron 二进制确实已落盘。

**方式 B —— npm 命令**

```bash
npm install            # 安装依赖
npm run dev            # 开发模式（electron-vite dev）
npm run build          # 构建到 out/
npm start              # 预览已构建的应用
```

## npm 脚本

| 脚本 | 说明 |
|---|---|
| `npm run dev` | 开发模式，热重载 |
| `npm run build` | 构建主进程 / 预加载 / 渲染进程到 `out/` |
| `npm start` | 预览已构建的应用 |
| `npm run typecheck` | 对 node + web 两套配置进行类型检查 |
| `npm run smoke` | 端到端功能冒烟测试（使用隔离数据目录） |
| `npm run dist` | 构建并打包安装包到 `release/` |
| `npm run rebuild` | 为 Electron 重新构建原生依赖 |

## 启动脚本参数

`install` / `start` 脚本（`.bat` 与 `.sh`）参数完全一致：

**install**
- `--clean` —— 清空 `node_modules` 并用 `npm ci` 重装
- `--dist` —— 额外打包到 `release/`
- `--shortcut` —— 额外创建快捷方式
- `--help`

**start**
- `--dev` —— 开发模式，热重载
- `--debug` —— 前台启动并输出控制台日志
- `--rebuild` —— 重新安装依赖并构建
- `--exe` —— 打包到 `release/`
- `--shortcut [desktop]` —— 创建带头图标的快捷方式（可选放到桌面）
- `--icon` —— 重新生成 `build/icon.png` 与 `build/icon.ico`
- `--help`

## 打包

执行 `npm run dist`（或 `install --dist` / `start --exe`），electron-builder 会在 `release/` 中生成产物：

| 平台 | 目标 | 产物 |
|---|---|---|
| Windows | NSIS 安装包（x64）、便携版（x64） | `LP-Tagger-<version>-setup.exe`、`…-portable.exe` |
| macOS | DMG | `LP-Tagger-<version>.dmg` |
| Linux | AppImage | `LP-Tagger-<version>.AppImage` |

macOS 与 Linux 产物需在对应平台上构建。

## 数据与配置

所有持久化状态都保存在 Electron 的 `userData` 目录下：

- **Windows：** `%APPDATA%\LP-Tagger`
- **macOS：** `~/Library/Application Support/LP-Tagger`
- **Linux：** `~/.config/LP-Tagger`

可通过 `--user-data-dir=<dir>` 覆盖。首次启动时会自动迁移旧目录 `ComfyUI Workspace` / `lp-workspace-of-comfy` 中的数据。

| 文件 | 内容 |
|---|---|
| `data/workspace.json` | 数据集、图片、标签元数据与设置（原子写入） |
| `data/endpoints.json` | API 接口配置（Base URL、环境变量、模型） |
| `data/prompts.json` | 提示词模板，内置标签与描述两套模板 |
| `thumbnails/<id>.jpg` | 生成的图片缩略图 |

**API 密钥**既可以保存在应用内，也可以通过环境变量提供，且环境变量优先。支持的环境变量名包括 `FARO_API_KEY`、`OPENAI_API_KEY`、`DASHSCOPE_API_KEY` 和 `DEEPSEEK_API_KEY`。

## 键盘快捷键

| 按键 | 操作 |
|---|---|
| `Ctrl/Cmd + K` | 打开命令面板 |
| `Ctrl/Cmd + 1…6` | 切换视图（主页 / 图库 / 数据集 / 打标 / 标签 / 设置） |
| `Ctrl/Cmd + B` | 切换检视面板 |
| `Ctrl/Cmd + A` | 全选 |
| `Esc` | 取消选择 |
| 方向键 | 在图像网格中移动焦点 |
| `Space` | 切换选中 |
| `Enter` | 打开检视面板 |

## 项目结构

```
src/
├── main/                 # Electron 主进程
│   ├── index.ts          # 窗口、自定义协议、应用信息
│   ├── ipc.ts            # IPC 通道注册
│   └── services/         # db、扫描、元数据、打标、接口、提示词、缩略图、解析器
├── preload/              # contextBridge API（window.workspace）
├── renderer/             # React 界面（app、layout、components、features、hooks、lib、styles）
└── shared/               # 共享类型与默认值（types.ts、defaults.ts）
scripts/                  # 安装/启动辅助脚本、冒烟测试、图标与快捷方式生成
build/                    # 应用图标
release/                  # 打包产物（已 gitignore）
```

## 冒烟测试

```bash
npm run smoke
```

它会以隔离的临时 `--user-data-dir` 启动一个真实的 Electron 实例（绝不触碰你的真实数据），并跑通主要流程：导航、数据集扫描、缩略图、多选、打标、手动编辑、`.txt` 导出、API 配置、提示词模板与窗口控制。退出码 `0` 表示全部断言通过。

## 许可证

MIT © LP
