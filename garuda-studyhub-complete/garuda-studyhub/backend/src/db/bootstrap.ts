import bcrypt from 'bcryptjs';
import { db, prep } from './database';

/**
 * Ensures the default accounts exist on every server boot.
 * This GUARANTEES admin login always works — even if the database file is
 * fresh, deleted, or the seed script was never run.
 * Idempotent: checks by email first, never creates duplicates.
 */
export async function ensureDefaultUsers() {
  const ensure = async (
    email: string,
    name: string,
    password: string,
    role: string,
    examTarget: string,
    isPremium = 0
  ) => {
    const existing = prep('SELECT * FROM users WHERE lower(email) = lower(?)').get(email);
    if (existing) return;

    const passwordHash = await bcrypt.hash(password, 12);

    if (role === 'admin') {
      const existingAdmin = prep(`SELECT * FROM users WHERE role = 'admin' OR role = 'superadmin' LIMIT 1`).get();
      if (existingAdmin) {
        prep(
          `UPDATE users SET name = ?, email = ?, phone = ?, password_hash = ?, exam_target = ?, is_verified = 1, is_premium = ? WHERE id = ?`
        ).run(name, email, null, passwordHash, examTarget, isPremium, existingAdmin.id);
        prep('INSERT OR IGNORE INTO user_preferences (user_id) VALUES (?)').run(existingAdmin.id);
        console.log(`   └─ Updated default admin account to ${email}`);
        return;
      }
    }

    const info = prep(
      `INSERT INTO users (name, email, phone, password_hash, role, exam_target, is_verified, is_premium)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
    ).run(name, email, null, passwordHash, role, examTarget, isPremium);
    const userId = Number(info.lastInsertRowid);
    prep('INSERT OR IGNORE INTO user_preferences (user_id) VALUES (?)').run(userId);
    console.log(`   └─ Created default ${role} account: ${email}`);
  };

  await ensure('admin@garuda.ai', 'Admin Garuda', 'Admin@123', 'admin', 'SSC CGL', 1);
}

/** If the DB has no content at all (fresh install), seed the starter set
 *  automatically so the app is never empty. */
export async function seedIfEmpty() {
  const jobs = (prep('SELECT COUNT(*) as c FROM jobs').get() as { c: number }).c;
  if (jobs > 0) return; // already seeded
  console.log('   └─ Empty database detected — seeding starter content…');
  const { seedAll } = await import('./seed.js');
  await seedAll();
}
