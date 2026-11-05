@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

rem ---- Token Dashboard : STOP --------------------------------------------

if not exist "server.pid" (
  echo [INFO] No server.pid found. Site is not running.
  exit /b 0
)

set /p SRVPID=<server.pid
tasklist /FI "PID eq !SRVPID!" 2>nul | find "!SRVPID!" >nul
if errorlevel 1 (
  echo [INFO] Process !SRVPID! is gone. Cleaning stale pid file.
  del /q "server.pid" >nul 2>nul
  exit /b 0
)

echo [INFO] Stopping site ^(PID !SRVPID!^) ...
taskkill /PID !SRVPID! /T /F >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Could not stop process !SRVPID!. Try Task Manager.
  exit /b 1
)
del /q "server.pid" >nul 2>nul
echo [OK] Site stopped.
exit /b 0
