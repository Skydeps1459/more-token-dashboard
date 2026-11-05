@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

rem ---- Daily Auto Sync : STOP --------------------------------------------

if not exist "sync.pid" (
  echo [INFO] No sync.pid found. Daily sync is not running.
  exit /b 0
)

set /p SYNCPID=<sync.pid
tasklist /FI "PID eq !SYNCPID!" 2>nul | find "!SYNCPID!" >nul
if errorlevel 1 (
  echo [INFO] Process !SYNCPID! is gone. Cleaning stale pid file.
  del /q "sync.pid" >nul 2>nul
  exit /b 0
)

echo [INFO] Stopping daily sync ^(PID !SYNCPID!^) ...
taskkill /PID !SYNCPID! /T /F >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Could not stop process !SYNCPID!.
  exit /b 1
)
del /q "sync.pid" >nul 2>nul
echo [OK] Daily sync stopped.
exit /b 0
