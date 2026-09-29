@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set "ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/"
set "ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/"

if /i "%~1"=="--help" goto help
if /i "%~1"=="-h" goto help
if /i "%~1"=="--dev" goto dev
if /i "%~1"=="--debug" goto debug
if /i "%~1"=="--rebuild" goto rebuild
if /i "%~1"=="--exe" goto exe

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install Node 18 or newer first.
  pause
  exit /b 1
)

if not exist "node_modules\electron\dist\electron.exe" (
  echo [1/2] Installing dependencies...
  call npm.cmd install --no-audit --no-fund
  if errorlevel 1 (
    echo [ERROR] Dependency installation failed.
    pause
    exit /b 1
  )
)

if not exist "out\main\index.js" (
  echo [2/2] Building the app...
  call npm.cmd run build
  if errorlevel 1 (
    echo [ERROR] Build failed.
    pause
    exit /b 1
  )
)

echo Starting ComfyUI Workspace...
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0."
exit /b 0

:dev
call npm.cmd run dev
exit /b %errorlevel%

:debug
call npm.cmd run build
if errorlevel 1 exit /b 1
"%~dp0node_modules\electron\dist\electron.exe" "%~dp0."
exit /b %errorlevel%

:rebuild
call npm.cmd install --no-audit --no-fund
if errorlevel 1 exit /b 1
call npm.cmd run build
exit /b %errorlevel%

:exe
echo Packaging a single-file exe...
call npm.cmd run dist
exit /b %errorlevel%

:help
type "%~dp0scripts\launcher-help.txt"
exit /b 0
