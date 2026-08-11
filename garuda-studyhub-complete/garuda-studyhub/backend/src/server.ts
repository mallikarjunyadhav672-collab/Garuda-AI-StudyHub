import app from './app';
import { env } from './config/env';
import { db } from './db/database';
import { ensureDefaultUsers, seedIfEmpty } from './db/bootstrap';

async function start() {
  const port = env.port;
  const host = process.env.NODE_ENV === 'production' || process.env.RENDER ? '0.0.0.0' : (process.env.HOST || '0.0.0.0');

  const server = app.listen(port, host, () => {
    const getCount = (table: string) => {
      try {
        const row = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c?: number } | undefined;
        return Number(row?.c ?? 0);
      } catch {
        return 0;
      }
    };

    const users = getCount('users');
    const jobs = getCount('jobs');
    console.log(`\n🦅 Garuda AI StudyHub API`);
    console.log(`   └─ http://localhost:${port}/api/health`);
    console.log(`   └─ Database: MySQL (${users} users · ${jobs} jobs)`);
    console.log(`   └─ Admin login: admin@garuda.ai / Admin@123`);
    console.log(`   └─ AI mode: ${env.openaiApiKey ? 'OpenAI (' + env.openaiModel + ')' : 'offline engine (no API key needed)'}\n`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\nERROR: Port ${port} is already in use. Please stop the process using that port or set a different PORT in your .env file.`);
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

  // Run bootstrap in the background so Render can see the port open immediately.
  // Ensure the default admin account is created even when seed data fails.
  void (async () => {
    try {
      await seedIfEmpty();
    } catch (error) {
      console.error('Seed bootstrap failed:', error);
    }

    try {
      await ensureDefaultUsers();
    } catch (error) {
      console.error('Default user bootstrap failed:', error);
    }
  })();
}

start().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});

export {};
