@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"

rem ComfyUI Workspace - installer
rem Console output is English on purpose: cmd.exe mangles UTF-8 Chinese.

title ComfyUI Workspace - Installer

set "MIRROR_ELECTRON=https://npmmirror.com/mirrors/electron/"
set "MIRROR_BUILDER=https://npmmirror.com/mirrors/electron-builder-binaries/"

set "DO_CLEAN=0"
set "DO_DIST=0"
set "DO_SHORTCUT=0"

:parse
if "%~1"=="" goto parsed
if /i "%~1"=="--clean"    set "DO_CLEAN=1"
if /i "%~1"=="-c"         set "DO_CLEAN=1"
if /i "%~1"=="--dist"     set "DO_DIST=1"
if /i "%~1"=="--shortcut" set "DO_SHORTCUT=1"
if /i "%~1"=="--help"     goto help
if /i "%~1"=="-h"         goto help
shift
goto parse
:parsed

echo ============================================
echo  ComfyUI Workspace - installer
echo ============================================
echo.

echo [1/5] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
  echo   [ERROR] Node.js not found.
  echo           Install Node 18 LTS or newer from https://nodejs.org/
  exit /b 1
)
for /f "delims=" %%v in ('node -p "process.versions.node"') do set "NODE_VER=%%v"
for /f "delims=" %%v in ('node -p "process.versions.node.split('.')[0]"') do set "NODE_MAJOR=%%v"
if !NODE_MAJOR! LSS 18 (
  echo   [ERROR] Node !NODE_VER! is too old, need 18 or newer.
  exit /b 1
)
echo   Node !NODE_VER! OK

echo [2/5] Configuring download mirrors...
rem Electron ships a ~100MB binary from GitHub, which times out on a lot of
rem networks and takes the whole install down with it. npmmirror avoids that.
set "ELECTRON_MIRROR=%MIRROR_ELECTRON%"
set "ELECTRON_BUILDER_BINARIES_MIRROR=%MIRROR_BUILDER%"
echo   ELECTRON_MIRROR=%ELECTRON_MIRROR%

echo [3/5] Installing dependencies...
if "%DO_CLEAN%"=="1" (
  echo   removing node_modules for a clean install...
  if exist "node_modules" rmdir /s /q "node_modules"
  call npm.cmd ci --no-audit --no-fund
) else (
  call npm.cmd install --no-audit --no-fund
)
if errorlevel 1 goto failed

rem npm can exit 0 while the Electron postinstall silently failed, leaving an
rem install that cannot start. Check for the binary itself.
if not exist "node_modules\electron\dist\electron.exe" (
  echo   Electron binary missing, retrying once with the mirror...
  call npm.cmd install electron --no-audit --no-fund --force
  if errorlevel 1 goto failed
)
if not exist "node_modules\electron\dist\electron.exe" (
  echo   [ERROR] node_modules\electron\dist\electron.exe is still missing.
  echo           The Electron binary download failed. Check the network and
  echo           run this script again, or point ELECTRON_MIRROR at another
  echo           mirror before running it.
  exit /b 1
)
echo   dependencies OK

echo [4/5] Building the app...
call npm.cmd run build
if errorlevel 1 goto failed
if not exist "out\main\index.js" (
  echo   [ERROR] build reported success but out\main\index.js is missing.
  exit /b 1
)
echo   build OK

if "%DO_SHORTCUT%"=="1" (
  echo [5/5] Creating desktop shortcut...
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\make-shortcut.ps1"
  if errorlevel 1 goto failed
)

if "%DO_DIST%"=="1" (
  echo Packaging a single-file exe, this takes a while...
  call npm.cmd run dist
  if errorlevel 1 goto failed
  echo   packaged into release\
)

echo.
echo ============================================
echo  Done. To launch:
echo    start.bat            normal start
echo    start.bat --dev      development mode
echo    start.bat --help     all options
echo ============================================
exit /b 0

:failed
echo.
echo [ERROR] Installation failed. See the messages above.
echo         Common fix: run install.bat --clean to start over.
exit /b 1

:help
echo ComfyUI Workspace - installer
echo.
echo   install.bat              install dependencies and build
echo   install.bat --clean      wipe node_modules, install with npm ci
echo   install.bat --shortcut   also create a desktop shortcut
echo   install.bat --dist       also package into release\
echo   install.bat --help       show this help
echo.
exit /b 0
