@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

rem ---- Token Dashboard : START -------------------------------------------
rem Usage: start.bat                    start the site
rem        start.bat --open             start and open the browser
rem        start.bat --no-anim          start with animations disabled
rem        start.bat --open --no-anim   both
rem Env  : PORT (default 8765), REFRESH_MS (default 300000 = 5 min), ANIMATE=0

set "DOOPEN="
if /i "%~1"=="--open" set "DOOPEN=1"
if /i "%~2"=="--open" set "DOOPEN=1"
if /i "%~1"=="--no-anim" set "ANIMATE=0"
if /i "%~2"=="--no-anim" set "ANIMATE=0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 18+ not found in PATH.
  echo         Install it from https://nodejs.org/ and retry.
  exit /b 1
)

if defined PORT (set "SITE_PORT=%PORT%") else (set "SITE_PORT=8765")
set "PORT=!SITE_PORT!"

if exist "server.pid" (
  set /p OLDPID=<server.pid
  tasklist /FI "PID eq !OLDPID!" 2>nul | find "!OLDPID!" >nul
  if not errorlevel 1 (
    echo [INFO] Site is already running ^(PID !OLDPID!^).
    echo        Open http://127.0.0.1:!SITE_PORT!/
    echo        Run stop.bat first to restart it.
    if defined DOOPEN start "" "http://127.0.0.1:!SITE_PORT!/"
    exit /b 0
  )
  del /q "server.pid" >nul 2>nul
)

echo [INFO] Starting Token Dashboard site ...
start "TokenDashboard" /MIN node "%~dp0server.js"

set /a TRIES=0
:WAIT
if exist "server.pid" goto READY
set /a TRIES+=1
if !TRIES! GEQ 12 goto FAILED
ping -n 2 127.0.0.1 >nul
goto WAIT

:READY
set /p NEWPID=<server.pid
echo [OK] Site is running ^(PID !NEWPID!^).
echo      URL     : http://127.0.0.1:!SITE_PORT!/
echo      Refresh : every 5 minutes ^(rebuild data + auto reload page^)
if "!ANIMATE!"=="0" (echo      Animation: off) else (echo      Animation: on)
echo      Log     : "%~dp0server.log"
echo      Stop    : stop.bat   ^|   Toggle: switch.bat
if defined DOOPEN start "" "http://127.0.0.1:!SITE_PORT!/"
exit /b 0

:FAILED
echo [ERROR] Server did not start. Check "%~dp0server.log" for details.
exit /b 1
