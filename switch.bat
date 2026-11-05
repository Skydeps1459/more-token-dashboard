@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

rem ---- Token Dashboard : ON/OFF SWITCH ------------------------------------
rem One click: running -^> stop, stopped -^> start.
rem Usage: switch.bat [--open]

set "RUNNING=0"
if exist "server.pid" (
  set /p CURPID=<server.pid
  tasklist /FI "PID eq !CURPID!" 2>nul | find "!CURPID!" >nul
  if not errorlevel 1 set "RUNNING=1"
)

if "!RUNNING!"=="1" (
  echo [INFO] Site is ON - switching OFF ...
  call "%~dp0stop.bat"
) else (
  echo [INFO] Site is OFF - switching ON ...
  call "%~dp0start.bat" %*
)
exit /b 0
