#!/usr/bin/env sh
set -e
cd "$(dirname "$0")"

# LP-Tagger — 安装脚本（Linux / macOS）
# 装依赖 → 校验 Electron 二进制 → 构建，可选生成启动项与打包。

MIRROR_ELECTRON="https://npmmirror.com/mirrors/electron/"
MIRROR_BUILDER="https://npmmirror.com/mirrors/electron-builder-binaries/"

DO_CLEAN=0
DO_DIST=0
DO_SHORTCUT=0

for arg in "$@"; do
  case "$arg" in
    --clean|-c) DO_CLEAN=1 ;;
    --dist) DO_DIST=1 ;;
    --shortcut) DO_SHORTCUT=1 ;;
    -h|--help)
      cat <<'EOF'

  LP-Tagger — 安装脚本

  ./install.sh              安装依赖并构建
  ./install.sh --clean      删掉 node_modules，用 npm ci 重装
  ./install.sh --shortcut   同时生成带图标的启动项
  ./install.sh --dist       同时打包到 release/
  ./install.sh --help       显示本帮助

EOF
      exit 0
      ;;
  esac
done

echo "============================================"
echo " LP-Tagger — 安装"
echo "============================================"
echo

# Electron 的二进制默认从 GitHub 下，很多网络会超时，并连带整次安装回滚。
export ELECTRON_MIRROR="$MIRROR_ELECTRON"
export ELECTRON_BUILDER_BINARIES_MIRROR="$MIRROR_BUILDER"

echo "[1/4] 检查 Node.js..."
if ! command -v node >/dev/null 2>&1; then
  echo "  [错误] 没有找到 Node.js，请先安装 Node 18 或更高版本：https://nodejs.org/"
  exit 1
fi
if ! node -e 'process.exit(process.versions.node.split(".")[0] >= 18 ? 0 : 1)'; then
  echo "  [错误] 当前 Node $(node -p 'process.versions.node') 太旧，需要 18 或更高。"
  exit 1
fi
echo "  Node $(node -p 'process.versions.node')  OK"
echo "  ELECTRON_MIRROR=$ELECTRON_MIRROR"

echo "[2/4] 安装依赖..."
if [ "$DO_CLEAN" = "1" ]; then
  echo "  清理 node_modules 后用 npm ci 重装..."
  rm -rf node_modules
  npm ci --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi

# npm 可能返回 0，但 Electron 的 postinstall 其实失败了，装出来的东西起不来。
# 所以直接查二进制在不在。
electron_ok() {
  [ -x "node_modules/electron/dist/electron" ] && return 0
  [ -x "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron" ] && return 0
  return 1
}

if ! electron_ok; then
  echo "  没找到 Electron 二进制，用镜像重试一次..."
  npm install electron --no-audit --no-fund --force || true
fi
if ! electron_ok; then
  echo "  [错误] node_modules/electron/dist 下仍然没有 Electron 二进制。"
  echo "         说明二进制没下下来。检查网络后重跑，或者先导出另一个镜像地址："
  echo "           ELECTRON_MIRROR=<你的镜像> ./install.sh"
  exit 1
fi
echo "  依赖 OK"

echo "[3/4] 构建应用..."
npm run build
if [ ! -f "out/main/index.js" ]; then
  echo "  [错误] 构建返回成功，但 out/main/index.js 不存在。"
  exit 1
fi
echo "  构建 OK"

if [ "$DO_SHORTCUT" = "1" ]; then
  echo "[4/4] 生成启动项..."
  ./start.sh --shortcut
fi

if [ "$DO_DIST" = "1" ]; then
  echo "正在打包，这一步比较慢..."
  npm run dist
  echo "  已输出到 release/"
fi

echo
echo "============================================"
echo " 完成。启动方式："
echo "   ./start.sh            正常启动"
echo "   ./start.sh --dev      开发模式"
echo "   ./start.sh --help     查看全部选项"
echo "============================================"
