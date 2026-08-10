@echo off
REM ============================================
REM  Garuda AI StudyHub - One-click verify (Windows)
REM  Double-click this file to check everything:
REM  Node, dependencies, database, API, admin login
REM ============================================
title Garuda StudyHub - Verify
cd /d "%~dp0"
echo.
echo  🦅 GARUDA AI STUDYHUB - VERIFICATION
echo  ============================================
echo.

REM 1. Node installed?
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo  [1] FAIL - Node.js NOT found. Install from https://nodejs.org
  echo       Then run this file again.
  pause
  exit /b 1
)
for /f "tokens=1 delims=." %%v in ('node -v') do set NODEVER=%%v
echo  [1] OK - Node %NODEVER%

REM 2. Dependencies installed?
if exist "backend\node_modules" (
  echo  [2] OK - backend dependencies found
) else (
  echo  [2] INSTALLING - backend dependencies...
  cd backend
  call npm install
  cd ..
)

REM 3. Database file?
if exist "backend\data\garuda.db" (
  echo  [3] OK - database file found
) else (
  echo  [3] CREATING - seeding database...
  cd backend
  call npm run seed
  cd ..
)

REM 4. API up?
set APISTATUS=DOWN
for /f %%i in ('powershell -Command "try{(Invoke-WebRequest -Uri http://localhost:5000/api/health -UseBasicParsing -TimeoutSec 3).StatusCode}catch{500}"') do set APISTATUS=%%i
if "%APISTATUS%"=="200" (
  echo  [4] OK - API is running at http://localhost:5000/api/health
) else (
  echo  [4] API NOT RUNNING - start it with:  cd backend ^&^& npm run dev
)

REM 5. Frontend up?
set WEBSTATUS=DOWN
for /f %%i in ('powershell -Command "try{(Invoke-WebRequest -Uri http://localhost:5173 -UseBasicParsing -TimeoutSec 3).StatusCode}catch{500}"') do set WEBSTATUS=%%i
if "%WEBSTATUS%"=="200" (
  echo  [5] OK - Frontend is running at http://localhost:5173
) else (
  echo  [5] Frontend NOT running - start it with:  cd frontend ^&^& npm run dev
)

echo.
echo  ============================================
echo  Admin login: admin@garuda.ai / Admin@123
echo  Demo login:  demo@garuda.ai  / Demo@123
echo  ============================================
echo.
pause
