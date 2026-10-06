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
if /i "%~1"=="--shortcut" goto shortcut
if /i "%~1"=="--icon" goto icon

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

echo Starting LP-Tagger...
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

:icon
echo Regenerating build/icon.png and build/icon.ico...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\make-icon.ps1"
exit /b %errorlevel%

:shortcut
set "SC_DESKTOP="
if /i "%~2"=="desktop" set "SC_DESKTOP=-Desktop"
if not exist "%~dp0build\icon.ico" (
  echo [1/2] Generating app icon...
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\make-icon.ps1"
  if errorlevel 1 (
    echo [ERROR] icon generation failed.
    pause
    exit /b 1
  )
)
echo [2/2] Creating shortcut with icon...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\make-shortcut.ps1" %SC_DESKTOP%
if errorlevel 1 (
  echo [ERROR] shortcut creation failed.
  pause
  exit /b 1
)
echo Done. Double-click the .lnk to launch with the logo icon.
exit /b 0

:help
type "%~dp0scripts\launcher-help.txt"
exit /b 0
