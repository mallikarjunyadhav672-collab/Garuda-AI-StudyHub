export * from './database.pool';

// Preserve previous behavior: run initSchema on import to ensure schema exists in dev/test.
import { initSchema } from './database.pool';

initSchema().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[db] initSchema failed', err);
});
