#!/usr/bin/env sh
set -e
cd "$(dirname "$0")"

export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
export ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"

MODE="${1:-run}"

case "$MODE" in
  -h|--help)
    cat <<'EOF'

  ComfyUI 工作台 启动器

  ./start.sh              安装依赖/构建/启动（默认）
  ./start.sh --dev        开发模式（热更新）
  ./start.sh --debug      前台启动并输出日志
  ./start.sh --rebuild    重装依赖并重新构建
  ./start.sh --exe        打包成单文件可执行文件（输出到 release/）
  ./start.sh --shortcut   生成带图标的桌面启动项（Linux .desktop）
  ./start.sh --icon       重新生成 build/icon.png 与 build/icon.ico

EOF
    exit 0
    ;;
esac

command -v node >/dev/null 2>&1 || {
  echo "[错误] 没有找到 Node.js，请先安装 Node 18 或更高版本。"
  exit 1
}

electron_bin() {
  if [ -x "node_modules/electron/dist/electron" ]; then
    echo "node_modules/electron/dist/electron"
  elif [ -x "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron" ]; then
    echo "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"
  else
    echo ""
  fi
}

ensure_ready() {
  if [ ! -d "node_modules/electron/dist" ]; then
    echo "[1/2] 首次运行，正在安装依赖..."
    npm install --no-audit --no-fund
  fi
  if [ ! -f "out/main/index.js" ]; then
    echo "[2/2] 正在构建应用..."
    npm run build
  fi
}

make_shortcut() {
  root="$(pwd)"
  icon="$root/build/icon.png"
  launcher="$root/start.sh"

  if [ ! -f "$icon" ]; then
    echo "缺少图标，正在生成 $icon ..."
    if command -v pwsh >/dev/null 2>&1; then
      pwsh -NoProfile -File "$root/scripts/make-icon.ps1"
    elif command -v powershell >/dev/null 2>&1; then
      powershell -NoProfile -ExecutionPolicy Bypass -File "$root/scripts/make-icon.ps1"
    fi
  fi

  if [ ! -f "$icon" ]; then
    echo "[错误] 没有找到 $icon。"
    echo "       Linux 上可以先准备一张 512x512 的 PNG 放到 build/icon.png。"
    exit 1
  fi

  chmod +x "$launcher" 2>/dev/null || true

  entry="$root/ComfyUI Workspace.desktop"
  cat > "$entry" <<EOF
[Desktop Entry]
Type=Application
Version=1.0
Name=ComfyUI Workspace
Comment=ComfyUI workspace launcher
Exec=$launcher
Path=$root
Icon=$icon
Terminal=false
Categories=Graphics;Development;
EOF
  chmod +x "$entry"
  echo "已生成 $entry"

  apps="$HOME/.local/share/applications"
  if mkdir -p "$apps" 2>/dev/null; then
    cp "$entry" "$apps/comfyui-workspace.desktop"
    command -v update-desktop-database >/dev/null 2>&1 &&
      update-desktop-database "$apps" >/dev/null 2>&1
    echo "已安装到 $apps/comfyui-workspace.desktop"
    echo "在应用列表里搜索「ComfyUI」即可看到图标。"
  fi

  if [ "$(uname)" = "Darwin" ]; then
    echo "注意：macOS 不读 .desktop，启动项图标需要在「制作替身」后手动设置。"
  fi
}

case "$MODE" in
  --dev)
    exec npm run dev
    ;;
  --debug)
    npm run build
    exec "$(electron_bin)" .
    ;;
  --rebuild)
    npm install --no-audit --no-fund
    exec npm run build
    ;;
  --exe)
    exec npm run dist
    ;;
  --shortcut)
    make_shortcut
    exit 0
    ;;
  --icon)
    if command -v pwsh >/dev/null 2>&1; then
      exec pwsh -NoProfile -File "$(pwd)/scripts/make-icon.ps1"
    fi
    exec powershell -NoProfile -ExecutionPolicy Bypass -File "$(pwd)/scripts/make-icon.ps1"
    ;;
  *)
    ensure_ready
    echo "正在启动 ComfyUI 工作台..."
    exec "$(electron_bin)" .
    ;;
esac
