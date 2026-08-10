#!/usr/bin/env bash
# ============================================================
#  GARUDA AI STUDYHUB - ONE-CLICK START (macOS / Linux)
#  Run:  ./start.sh
# ============================================================
set -e
cd "$(dirname "$0")"
echo ""
echo "============================================"
echo " 🦅 GARUDA AI STUDYHUB - STARTING..."
echo "============================================"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo " [X] Node.js not found! Install from https://nodejs.org then run again."
  exit 1
fi
echo " [1] Node $(node -v) found"

if [ ! -d "backend/node_modules" ]; then
  echo " [2] Installing backend dependencies..."
  (cd backend && npm install)
else
  echo " [2] Backend dependencies: OK"
fi

if [ ! -d "frontend/node_modules" ]; then
  echo " [3] Installing frontend dependencies..."
  (cd frontend && npm install)
else
  echo " [3] Frontend dependencies: OK"
fi

echo " [4] Starting API server..."
(cd backend && npm run dev) &
BACK_PID=$!

echo " [5] Starting website..."
(cd frontend && npm run dev) &
FRONT_PID=$!

echo ""
echo "============================================"
echo " ✅ RUNNING!"
echo "    Website : http://localhost:5173"
echo "    API     : http://localhost:5000/api/health"
echo "    Admin   : admin@garuda.ai  / Admin@123"
echo "    Demo    : demo@garuda.ai   / Demo@123"
echo "    (Ctrl+C to stop both servers)"
echo "============================================"
echo ""

trap "kill $BACK_PID $FRONT_PID 2>/dev/null" EXIT
wait
