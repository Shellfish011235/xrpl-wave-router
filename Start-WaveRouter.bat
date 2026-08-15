@echo off
setlocal
cd /d "%~dp0"
title XRPL Wave Router

echo.
echo ========================================
echo   XRPL WAVE ROUTER
 echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or is not on PATH.
  echo Install Node.js LTS from https://nodejs.org and run this file again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies for the first run...
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed.
    pause
    exit /b 1
  )
)

if not exist .env if exist .env.example copy /Y .env.example .env >nul

echo Starting Wave Router at http://localhost:3000
start "Wave Router Browser" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"
call npm run dev

if errorlevel 1 (
  echo.
  echo Wave Router stopped because of an error.
  pause
)

endlocal
