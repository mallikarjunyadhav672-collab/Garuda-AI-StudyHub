/**
 * Garuda StudyHub — Environment & Database verification
 * Run with:  npm run verify
 * Checks: Node version, MySQL driver, database connection, tables, seeded data,
 *         API health (with DB status), admin login, frontend reachability.
 */
import os from 'node:os';
import { env } from '../src/config/env';

let failures = 0;
const pass = (msg: string) => console.log(`  ✅ ${msg}`);
const fail = (msg: string) => { console.log(`  ❌ ${msg}`); failures++; };
const info = (msg: string) => console.log(`  ℹ️  ${msg}`);

console.log('\n🦅 GARUDA AI STUDYHUB — VERIFICATION');
console.log('='.repeat(52));

// 1. Node version
console.log('\n[1] Node.js');
const nodeMajor = parseInt(process.version.replace('v', '').split('.')[0], 10);
info(`Node ${process.version} (${os.platform()} ${os.arch()})`);
if (nodeMajor >= 20) pass('Node >= 20 (supported)');
else fail('Node < 20 — please upgrade Node.js');

// 2. MySQL driver
console.log('\n[2] MySQL driver');
try {
  require('mysql2/promise');
  pass('mysql2 available');
} catch {
  fail('mysql2 not installed — run: npm install');
}

// 3. Database connection
console.log('\n[3] MySQL database');
try {
  const { db } = require('../src/db/database.pool');
  const tablesRow = await db.prepare('SELECT COUNT(*) as c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()').get() as { c: number } | undefined;
  const usersRow = await db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number } | undefined;
  const tables = tablesRow?.c ?? 0;
  const users = usersRow?.c ?? 0;
  pass(`MySQL CONNECTED — ${tables} tables, ${users} users (${env.dbHost}:${env.dbPort}/${env.dbName})`);
} catch (e: any) {
  fail(`MySQL NOT connected — check backend/.env DB_* values: ${e.message}`);
}

// 4. API health (starts the DB through the app stack)
console.log('\n[4] API health + live DB');
import('../src/app.js').then(async ({ default: app }) => {
  const server = app.listen(0, '127.0.0.1', async () => {
    const port = (server.address() as any).port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      const body: any = await res.json();
      if (body.status === 'ok') {
        pass(`API responds (health = ok)`);
        if (body.database?.connected) {
          pass(`Database CONNECTED — ${body.database.tables} tables, ${body.database.users} users`);
        } else {
          fail('Database NOT connected — check backend/.env DB_* values');
        }
      } else {
        fail(`API unhealthy: ${JSON.stringify(body).slice(0, 120)}`);
      }
    } catch (e: any) {
      fail(`API did not start: ${e.message}`);
    }

    // 5. Admin login (before closing the server)
    console.log('\n[5] Admin login');
    try {
      const loginRes = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@garuda.ai', password: 'Admin@123' }),
      });
      const loginBody: any = await loginRes.json();
      if (loginBody.success && loginBody.data.user.role === 'admin') {
        pass('Admin login works (admin@garuda.ai / Admin@123)');
      } else {
        fail(`Admin login failed: ${JSON.stringify(loginBody).slice(0, 150)}`);
      }
    } catch (e: any) {
      fail(`Login request failed: ${e.message}`);
    }
    server.close();

    // 6. No duplicate data (DB-level + API-level)
    console.log('\n[6] No duplicate data');
    try {
      const { db } = await import('../src/db/database.pool');
      const dupChecks: [string, string, string][] = [
        ['users', 'email', 'duplicate emails'],
        ['jobs', 'role', 'duplicate jobs'],
        ['materials', 'title', 'duplicate materials'],
        ['videos', 'title', 'duplicate videos'],
        ['affairs', 'title', 'duplicate affairs'],
        ['quiz_questions', 'question_text', 'duplicate quiz questions'],
        ['saved_items', 'user_id || entity_type || entity_id', 'duplicate bookmarks'],
      ];
      let dupTotal = 0;
      for (const [table, col, label] of dupChecks) {
        const rows: any[] = await db
          .prepare(
            `SELECT ${col} AS v, COUNT(*) AS c FROM ${table} GROUP BY ${col} HAVING COUNT(*) > 1`
          )
          .all();
        if (rows.length) {
          dupTotal += rows.length;
          fail(`${label}: ${rows.length} (e.g. "${rows[0].v}")`);
        }
      }
      if (dupTotal === 0) pass('No duplicate records in database (users, jobs, materials, videos, affairs, quiz, bookmarks)');
    } catch (e: any) {
      fail(`Duplicate check error: ${e.message}`);
    }

    // 7. Frontend
    console.log('\n[7] Frontend');
    const frontendPorts = [5173, 5174];
    let frontendOk = false;
    for (const p of frontendPorts) {
      try {
        const r = await fetch(`http://localhost:${p}`);
        if (r.ok) { frontendOk = true; pass(`Frontend reachable at http://localhost:${p}`); break; }
      } catch { /* try next */ }
    }
    if (!frontendOk) info('Frontend not detected (start it with: cd frontend && npm run dev)');

    console.log('\n' + '='.repeat(52));
    if (failures === 0) {
      console.log(`🎉 ALL CHECKS PASSED — ${failures} failures`);
    } else {
      console.log(`⚠️  ${failures} check(s) FAILED — fix the items above`);
    }
    console.log('='.repeat(52) + '\n');
    process.exit(failures === 0 ? 0 : 1);
  });
}).catch((e) => {
  console.error('Failed to load backend app:', e.message);
  process.exit(1);
});