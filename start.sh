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
  *)
    ensure_ready
    echo "正在启动 ComfyUI 工作台..."
    exec "$(electron_bin)" .
    ;;
esac
