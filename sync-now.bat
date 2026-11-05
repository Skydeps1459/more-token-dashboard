@echo off
setlocal
cd /d "%~dp0"

rem ---- Daily Auto Sync : RUN ONCE ----------------------------------------
rem Detects local changes, rebuilds public/index.html, commits and pushes.
rem Safe to run any time; does nothing when there are no changes.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 18+ not found in PATH.
  exit /b 1
)

echo [INFO] Running one auto-detection sync ...
node "%~dp0sync.js" --once
echo [INFO] Done. See "%~dp0sync.log" for details.
exit /b 0
