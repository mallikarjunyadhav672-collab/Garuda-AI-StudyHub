import app from './app';
import { env } from './config/env';
import { db } from './db/database';
import { ensureDefaultUsers, seedIfEmpty } from './db/bootstrap';

async function start() {
  // 1. If the DB is completely empty (fresh install), seed starter content
  //    automatically so the app is never empty on first boot.
  await seedIfEmpty();

  // 2. Guarantee the default admin account exists (admin login ALWAYS works)
  await ensureDefaultUsers();

  // 3. Boot the API
  const server = app.listen(env.port, '0.0.0.0', () => {
    const users = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
    const jobs = (db.prepare('SELECT COUNT(*) as c FROM jobs').get() as { c: number }).c;
    console.log(`\n🦅 Garuda AI StudyHub API`);
    console.log(`   └─ http://localhost:${env.port}/api/health`);
    console.log(`   └─ Database: MySQL (${users} users · ${jobs} jobs)`);
    console.log(`   └─ Admin login: admin@garuda.ai / Admin@123`);
    console.log(`   └─ AI mode: ${env.openaiApiKey ? 'OpenAI (' + env.openaiModel + ')' : 'offline engine (no API key needed)'}\n`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\nERROR: Port ${env.port} is already in use. Please stop the process using that port or set a different PORT in your .env file.`);
    } else {
      console.error('\nServer failed to start:', err);
    }
    process.exit(1);
  });

  const shutdown = () => {
    console.log('\nShutting down gracefully...');
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});

export {};
