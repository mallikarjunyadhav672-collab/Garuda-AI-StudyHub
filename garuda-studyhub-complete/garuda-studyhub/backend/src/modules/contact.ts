import { Router } from 'express';
import { z } from 'zod';
import { db, prep } from '../db/database.pool';
import { requireAuth, requireAdmin, validate } from '../middleware';
import { ApiError, asyncHandler, ok } from '../utils/helpers';

const router = Router();

// POST /api/contact — public contact form (stored; admin can review)
router.post(
  '/',
  validate(z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    subject: z.string().min(2).max(200),
    message: z.string().min(10).max(5000),
  })),
  asyncHandler(async (req, res) => {
    const { name, email, subject, message } = req.body;
    const info = await prep(
      `INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)`
    ).run(name, email, subject, message);
    ok(res, { id: Number(info.lastInsertRowid || (info.insertId ?? 0)), message: 'Message received. We will reply within 24 hours.' }, 201);
  })
);

// Admin: list messages
router.get(
  '/messages',
  requireAuth, requireAdmin,
  asyncHandler(async (_req, res) => {
    const rows = await prep(
      `SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 100`
    ).all();
    ok(res, { messages: rows });
  })
);

// Admin: delete message
router.delete('/messages/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const info = await prep('DELETE FROM contact_messages WHERE id = ?').run(Number(req.params.id));
  if (info.changes === 0) throw new ApiError(404, 'Message not found', 'NOT_FOUND');
  ok(res, { message: 'Message deleted' });
}));

export default router;

