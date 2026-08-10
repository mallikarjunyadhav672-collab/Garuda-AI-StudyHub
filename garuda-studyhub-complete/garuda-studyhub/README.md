# 🦅 Garuda AI StudyHub

**Learn Smart. Practice Better. Get Selected.**

A complete, **deployment-ready** full-stack platform for Indian government exam aspirants
(SSC, UPSC, Banking, Railways, TSPSC, APPSC, Police, Defence, Teaching) — with AI mentoring,
mock tests, daily quizzes, current affairs, job notifications, file uploads and a full admin panel.

> ✅ Everything is implemented end-to-end (Frontend → API → Database). Payments are the only
> intentionally left-out module (planned with Razorpay).

---

## ✨ Features

### 👤 Users
- Register / Login / JWT + rotating refresh tokens / logout / change password
- **Forgot & reset password** (token flow, email-ready)
- **Email verification** flow
- Profile with **avatar upload**, preferences, achievements & badges
- Consolidated **bookmarks** (jobs + materials + videos)

### 🎯 Preparation modules
- **Mock Tests** — instructions → timed attempt → auto-scoring (+ve/–ve) → result → solutions → analytics → leaderboard
- **Daily Quiz** — 10 questions/day, streaks, history, leaderboard
- **Jobs** — notifications with search/filter/pagination, save, **apply**
- **Materials** — PDFs with **real file upload**, bookmarks, download tracking
- **Current Affairs** — daily/weekly/monthly, categories, search
- **Video Lectures** — library, categories, playlists, saved, watch-progress
- **Search** across jobs/materials/affairs/videos

### 🤖 AI (works offline — no API key needed)
- **AI Assistant** — chat mentor with conversation history (OpenAI-ready)
- **AI Study Planner** — generates a weekly schedule from exam date + hours
- **Career Guidance** — matches aspirants to best-fit exams

### 🛡 Admin panel
- KPI dashboard, user/role management, premium toggling
- Full CRUD for jobs, materials, mocks (question builder), quiz bank, affairs, videos
- **Contact inbox**, broadcast notifications

---

## 🚀 Run locally — zero setup

> **Node version:** any Node.js **>= 20**. On **Node 22.5+ / 24**, the backend uses
> Node's **built-in SQLite** (`node:sqlite`) — no compilation, works on Windows without
> Visual Studio Build Tools. Older Node falls back to `better-sqlite3` (optional dep).

### ⭐ Easiest way (Windows)
**Double-click `START-WINDOWS.bat`** — it installs dependencies (first run), starts
the API + website in two windows, and opens your browser. That's it.

### ⭐ Easiest way (macOS / Linux)
```bash
./start.sh
```

### Manual way
```bash
# Terminal 1 — backend
cd backend
npm install
npm run dev       # http://localhost:5000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev       # http://localhost:5173  (proxies /api to backend)
```

> 🛡️ **Admin login ALWAYS works.** On server boot the API automatically creates the
> admin + demo accounts (if missing) and auto-seeds starter content if the database
> is empty. No manual `npm run seed` needed.
> Run `npm run verify` (or double-click `verify.bat`) any time to check everything:
> Node ✅ · driver ✅ · DB connected ✅ · admin login ✅ · **no duplicate data** ✅

> **Windows / Node 24 troubleshooting (npm install fails at better-sqlite3):**
> This is a *native* module needing Visual Studio C++ Build Tools. Since v1.1 the
> project does **not** require it: the API runs on Node's built-in SQLite.
> If you hit the old error, just:
> 1. Close VS Code / terminals using the folder (avoids `EPERM` file-lock warnings)
> 2. Delete `backend/node_modules` and `backend/package-lock.json`
> 3. Run `npm install` again — it will succeed (better-sqlite3 becomes optional)
> 4. `npm run dev`

### Default admin account

| Role | Email | Password |
|------|-------|----------|
| Admin | `Admin@gmail.com` | `Admin@123` |

> Normal student users must register with their own email/password. The database still includes sample users for starter content, but those seeded accounts do not have a usable default password.

---

## 🐳 Deploy with Docker (one command)

```bash
docker compose up -d --build
# Frontend  → http://localhost
# API       → http://localhost:5000/api/health
```

- SQLite data + uploads persist via named volumes (`garuda-data`, `garuda-uploads`)
- Nginx serves the built frontend and proxies `/api` + `/uploads` to the API
- Set `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (and optionally `OPENAI_API_KEY`) in your shell before `up`

## ☁️ Deploy to Render (free tier)

`render.yaml` is included. Connect the repo on render.com and both services
(API + static frontend) are provisioned automatically, with the frontend proxying
`/api/*` to the API service.

## 🖥 Deploy to a VPS (manual)

```bash
# Backend
cd backend
npm install && npm run build
pm2 start ecosystem.config.cjs   # or: node dist/server.js

# Frontend
cd frontend
npm install && npm run build
# serve dist/ with nginx (see frontend/nginx.conf) and proxy /api → localhost:5000
```

**Production checklist:** change JWT secrets · enable HTTPS · set `NODE_ENV=production`
· configure SMTP for emails · put `OPENAI_API_KEY` for live AI.

---

## 🗂 Project structure

```
garuda-studyhub/
├── docker-compose.yml / render.yaml     # deployment
├── backend/
│   ├── Dockerfile · ecosystem.config.cjs · .env.example
│   ├── src/
│   │   ├── server.ts / app.ts
│   │   ├── config/env.ts
│   │   ├── db/database.ts · db/seed.ts
│   │   ├── middleware/  (auth, rbac, validation, errors)
│   │   ├── utils/
│   │   └── modules/     (auth, users, jobs, materials, mocks, quiz,
│   │                     affairs, videos, ai, notifications, admin,
│   │                     upload, contact)
│   └── data/garuda.db   (seeded)
└── frontend/
    ├── Dockerfile · nginx.conf
    └── src/
        ├── lib/         (api client, auth, formatters)
        ├── components/  (ui, layouts)
        └── pages/       (45+ pages incl. admin/)
```

## 🔌 API highlights

- `POST /api/auth/register | login | refresh | logout | forgot-password | reset-password`
- `GET /api/auth/me` · `GET /api/users/me/stats | bookmarks | achievements`
- `GET|POST /api/jobs` · `POST /api/jobs/:id/save | apply`
- `GET|POST /api/materials` · `POST /api/materials/:id/bookmark | download`
- `POST /api/mocks/:id/start | submit` · `GET /api/mocks/:id/result | solutions`
- `GET /api/quiz/today` · `POST /api/quiz/today/submit`
- `POST /api/ai/chat | planner/generate | career/assess`
- `POST /api/upload?type=material|avatar|notice|thumbnail` (multipart)
- `POST /api/contact` · `GET /api/contact/messages` (admin)
- `GET /api/admin/stats` + full admin CRUD

## 🧠 AI

Without any key, `/api/ai/*` uses a built-in offline mentor. Set `OPENAI_API_KEY` in
`backend/.env` to switch to a live LLM — no code changes needed.

## 🔒 Before production

- Change `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
- HTTPS everywhere, `NODE_ENV=production`
- Wire real SMTP (forgot-password / verification emails)
- Move uploads to S3/R2 with presigned URLs (upload flow already structured)
- Tune rate limits + add audit logging
