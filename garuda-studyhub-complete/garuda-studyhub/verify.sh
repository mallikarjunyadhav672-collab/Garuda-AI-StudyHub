#!/usr/bin/env bash
# Garuda AI StudyHub - one-click verify (macOS / Linux)
# Run:  ./verify.sh   (from the project root)
set -e
cd "$(dirname "$0")"
echo ""
echo "🦅 GARUDA AI STUDYHUB - VERIFICATION"
echo "===================================="

# 1. Node
echo "[1] Node: $(node -v 2>/dev/null || echo 'NOT FOUND — install from https://nodejs.org')"

# 2. Backend deps
if [ -d "backend/node_modules" ]; then echo "[2] backend dependencies: OK"; else echo "[2] backend dependencies: installing…"; (cd backend && npm install); fi

# 3. DB file
if [ -f "backend/data/garuda.db" ]; then echo "[3] database file: OK"; else echo "[3] database file: MISSING — seeding…"; (cd backend && npm run seed); fi

# 4. API
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null | grep -q 200; then
  echo "[4] API: RUNNING at http://localhost:5000/api/health"
else
  echo "[4] API: not running — start with: cd backend && npm run dev"
fi

# 5. Frontend
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 2>/dev/null | grep -q 200; then
  echo "[5] Frontend: RUNNING at http://localhost:5173"
else
  echo "[5] Frontend: not running — start with: cd frontend && npm run dev"
fi

echo ""
echo "===================================="
echo "Admin login: admin@garuda.ai / Admin@123"
echo "Demo login:  demo@garuda.ai  / Demo@123"
echo "===================================="
