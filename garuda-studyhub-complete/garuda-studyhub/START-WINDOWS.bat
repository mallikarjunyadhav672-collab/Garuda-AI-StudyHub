@echo off
REM ============================================================
REM  GARUDA AI STUDYHUB - ONE-CLICK START (Windows)
REM  Double-click this file. It will:
REM    1. Check Node.js is installed
REM    2. Install backend + frontend dependencies (first run only)
REM    3. Start the API  (http://localhost:5000)
REM    4. Start the website (http://localhost:5173)
REM    5. Open your browser
REM  Press Ctrl+C in each window to stop that server.
REM ============================================================
title Garuda StudyHub - START
cd /d "%~dp0"
echo.
echo  ============================================
echo   🦅 GARUDA AI STUDYHUB - STARTING...
echo  ============================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo  [X] Node.js not found! Install from https://nodejs.org then run again.
  pause
  exit /b 1
)
for /f "tokens=1 delims=." %%v in ('node -v') do set NODEVER=%%v
echo  [1] Node %NODEVER% found

REM ---- Backend ----
if exist "backend\node_modules" (
  echo  [2] Backend dependencies: OK
) else (
  echo  [2] Installing backend dependencies (first time, takes a minute)...
  cd backend
  call npm install
  cd ..
)

REM ---- Frontend ----
if exist "frontend\node_modules" (
  echo  [3] Frontend dependencies: OK
) else (
  echo  [3] Installing frontend dependencies...
  cd frontend
  call npm install
  cd ..
)

REM ---- Start backend in its own window ----
echo  [4] Starting API server...
start "Garuda API" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 5 /nobreak >nul

REM ---- Start frontend in its own window ----
echo  [5] Starting website...
start "Garuda Website" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 4 /nobreak >nul

echo.
echo  ============================================
echo   ✅ DONE! Browser lo open avutundi:
echo      Website : http://localhost:5173
echo      API     : http://localhost:5000/api/health
echo.
echo      Admin   : admin@garuda.ai  / Admin@123
echo      Demo    : demo@garuda.ai   / Demo@123
echo  ============================================
echo.
start http://localhost:5173
echo  (Rendu windows open avutayi — avi running servers.
echo   Close cheyalante aa windows lo Ctrl+C.)
echo.
pause
