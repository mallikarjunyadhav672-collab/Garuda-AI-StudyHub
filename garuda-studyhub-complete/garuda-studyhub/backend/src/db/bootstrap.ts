import bcrypt from 'bcryptjs';
import { db, prep } from './database.pool';

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
    const passwordHash = await bcrypt.hash(password, 12);

    if (role === 'admin') {
      const existingAdmin = await prep(`SELECT * FROM users WHERE role = 'admin' OR role = 'superadmin' LIMIT 1`).get() as { id: number } | undefined;
      if (existingAdmin) {
        await prep(
          `UPDATE users SET name = ?, email = ?, phone = ?, password_hash = ?, exam_target = ?, is_verified = 1, is_premium = ? WHERE id = ?`
        ).run(name, email, null, passwordHash, examTarget, isPremium, existingAdmin.id);
        await prep('INSERT OR IGNORE INTO user_preferences (user_id) VALUES (?)').run(existingAdmin.id);
        console.log(`   └─ Updated default admin account to ${email}`);
        return;
      }
    }

    await prep(
      `INSERT INTO users (name, email, phone, password_hash, role, exam_target, is_verified, is_premium)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         phone = VALUES(phone),
         password_hash = VALUES(password_hash),
         role = VALUES(role),
         exam_target = VALUES(exam_target),
         is_verified = 1,
         is_premium = VALUES(is_premium)`
    ).run(name, email, null, passwordHash, role, examTarget, isPremium);
    const info = await prep(
      `SELECT id FROM users WHERE lower(email) = lower(?) ORDER BY id DESC LIMIT 1`
    ).get(email);
    const userId = Number(info?.id ?? 0);
    if (userId > 0) {
      await prep('INSERT OR IGNORE INTO user_preferences (user_id) VALUES (?)').run(userId);
    }
    console.log(`   └─ Ensured default ${role} account: ${email}`);
  };

  await ensure('admin@garuda.ai', 'Admin Garuda', 'Admin@123', 'admin', 'SSC CGL', 1);
}

/** If the DB has no content at all (fresh install), seed the starter set
 *  automatically so the app is never empty. */
export async function seedIfEmpty() {
  const row = await prep('SELECT COUNT(*) as c FROM jobs').get() as { c?: number } | undefined;
  const jobs = Number(row?.c ?? 0);
  if (jobs > 0) return; // already seeded
  console.log('   └─ Empty database detected — seeding starter content…');
  const { seedAll } = await import('./seed.js');
  await seedAll();
}

