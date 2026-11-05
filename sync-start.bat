@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

rem ---- Daily Auto Sync : START -------------------------------------------
rem Runs one detection immediately, then once every 24 hours.
rem Env: SYNC_MS (default 86400000), TITLE

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 18+ not found in PATH.
  exit /b 1
)

if exist "sync.pid" (
  set /p OLDPID=<sync.pid
  tasklist /FI "PID eq !OLDPID!" 2>nul | find "!OLDPID!" >nul
  if not errorlevel 1 (
    echo [INFO] Daily sync is already running ^(PID !OLDPID!^).
    echo        Stop it with sync-stop.bat first.
    exit /b 0
  )
  del /q "sync.pid" >nul 2>nul
)

echo [INFO] Starting daily auto-sync ^(change detection, once per 24h^) ...
start "TokenDashboardSync" /MIN node "%~dp0sync.js"

set /a TRIES=0
:WAIT
if exist "sync.pid" goto READY
set /a TRIES+=1
if !TRIES! GEQ 12 goto FAILED
ping -n 2 127.0.0.1 >nul
goto WAIT

:READY
set /p NEWPID=<sync.pid
echo [OK] Daily sync running ^(PID !NEWPID!^).
echo      Log      : "%~dp0sync.log"
echo      Stop     : sync-stop.bat
echo      Run once : sync-now.bat
exit /b 0

:FAILED
echo [ERROR] Failed to start. Check "%~dp0sync.log".
exit /b 1
