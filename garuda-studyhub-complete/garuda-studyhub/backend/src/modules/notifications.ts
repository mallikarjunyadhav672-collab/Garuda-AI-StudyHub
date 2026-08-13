import { Router } from 'express';
import { z } from 'zod';
import { db, prep, parseJson } from '../db/database.pool';
import { requireAuth, requireAdmin, validate } from '../middleware';
import { asyncHandler, ok } from '../utils/helpers';

const router = Router();
router.use(requireAuth);

// GET /api/notifications
router.get('/', asyncHandler(async (req, res) => {
  const rows = await prep(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
  ).all(req.user!.id);
  const unread = await prep(
    `SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0`
  ).get(req.user!.id) as { c: number };
  ok(res, {
    notifications: rows.map((r: any) => ({
      id: r.id, type: r.type, title: r.title, body: r.body,
      data: parseJson(r.data, null), isRead: !!r.is_read, createdAt: r.created_at,
    })),
    unread: unread.c,
  });
}));

// PUT /api/notifications/:id/read
router.put('/:id/read', asyncHandler(async (req, res) => {
  await prep(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`).run(Number(req.params.id), req.user!.id);
  ok(res, { message: 'Marked as read' });
}));

// PUT /api/notifications/read-all
router.put('/read-all', asyncHandler(async (req, res) => {
  await prep(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).run(req.user!.id);
  ok(res, { message: 'All notifications marked as read' });
}));

// POST /api/notifications — admin broadcast
router.post('/', requireAdmin, validate(z.object({
  title: z.string().min(3),
  body: z.string().min(3),
  type: z.string().optional(),
  userId: z.number().optional(),
})), asyncHandler(async (req, res) => {
  const b = req.body;
  if (b.userId) {
  await prep(`INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)`)
      .run(b.userId, b.type || 'system', b.title, b.body);
  } else {
    const users = await prep('SELECT id FROM users').all() as { id: number }[];
    const stmt = prep(`INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)`);
  const tx = db.transaction(async () => {
    for (const u of users) {
      await stmt.run(u.id, b.type || 'system', b.title, b.body);
    }
  });
  await tx();
  }
  ok(res, { message: 'Notifications sent' }, 201);
}));

export default router;

