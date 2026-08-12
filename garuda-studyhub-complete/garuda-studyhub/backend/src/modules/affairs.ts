import { Router } from 'express';
import { z } from 'zod';
import { db, prep, parseJson } from '../db/database';
import { requireAuth, requireAdmin, validate } from '../middleware';
import { ApiError, asyncHandler, ok } from '../utils/helpers';

const router = Router();

const affairSchema = z.object({
  title: z.string().min(5).max(300),
  summary: z.string().min(10),
  content: z.string().min(10),
  categoryId: z.number().optional(),
  date: z.string().optional(),
  tags: z.array(z.string()).optional(),
  imageColor: z.string().optional(),
  source: z.string().optional(),
  sourceUrl: z.string().optional(),
  isFeatured: z.boolean().optional(),
});

function mapAffair(row: any) {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    content: row.content,
    categoryId: row.category_id,
    category: row.category_name,
    date: row.date,
    tags: parseJson(row.tags, []),
    imageColor: row.image_color,
    source: row.source,
    sourceUrl: row.source_url,
    isFeatured: !!row.is_featured,
    createdAt: row.created_at,
  };
}

// GET /api/affairs
import { getCached, setCached } from '../utils/cache';

router.get('/', asyncHandler(async (req, res) => {
  const cacheKey = `affairs:${JSON.stringify(req.query)}:user:${req.user?.id ?? 'anon'}`;
  const cached = getCached(cacheKey);
  if (cached) return ok(res, cached);
  const { category, featured, q, period, page = '1', limit = '12' } = req.query as Record<string, string>;
  const where: string[] = [];
  const params: unknown[] = [];
  if (category) { where.push('c.slug = ?'); params.push(category); }
  if (featured === 'true') { where.push('a.is_featured = 1'); }
  if (q) { where.push('(a.title LIKE ? OR a.summary LIKE ? OR a.content LIKE ?)'); const like = `%${q}%`; params.push(like, like, like); }
  if (period === 'week') { where.push("a.date >= date('now','-7 days')"); }
  if (period === 'month') { where.push("a.date >= date('now','-30 days')"); }
  if (where.length === 0) where.push('1=1');
  const total = prep(`SELECT COUNT(*) as c FROM affairs a LEFT JOIN categories c ON c.id = a.category_id WHERE ${where.join(' AND ')}`).get(...params) as { c: number };
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(50, Math.max(1, parseInt(limit) || 12));
  const rows = prep(
    `SELECT a.*, c.name as category_name FROM affairs a LEFT JOIN categories c ON c.id = a.category_id
     WHERE ${where.join(' AND ')} ORDER BY a.date DESC LIMIT ? OFFSET ?`
  ).all(...params, l, (p - 1) * l);
  const payload = { affairs: rows.map(mapAffair), total: total.c, page: p, limit: l };
  setCached(cacheKey, payload);
  ok(res, payload);
}));

// GET /api/affairs/categories
router.get('/categories', asyncHandler(async (_req, res) => {
  const cats = prep(`SELECT c.*, (SELECT COUNT(*) FROM affairs a WHERE a.category_id = c.id) as count
    FROM categories c WHERE c.type = 'affair' ORDER BY c.sort_order`).all();
  ok(res, { categories: cats });
}));

// GET /api/affairs/daily
router.get('/daily', asyncHandler(async (_req, res) => {
  const rows = prep(`SELECT a.*, c.name as category_name FROM affairs a
    LEFT JOIN categories c ON c.id = a.category_id
    WHERE a.date = date('now') ORDER BY a.created_at DESC`).all();
  ok(res, { affairs: rows.map(mapAffair) });
}));

// GET /api/affairs/weekly
router.get('/weekly', asyncHandler(async (_req, res) => {
  const rows = prep(`SELECT a.*, c.name as category_name FROM affairs a
    LEFT JOIN categories c ON c.id = a.category_id
    WHERE a.date >= date('now','-7 days') ORDER BY a.date DESC`).all();
  ok(res, { affairs: rows.map(mapAffair) });
}));

// GET /api/affairs/monthly
router.get('/monthly', asyncHandler(async (_req, res) => {
  const rows = prep(`SELECT a.*, c.name as category_name FROM affairs a
    LEFT JOIN categories c ON c.id = a.category_id
    WHERE a.date >= date('now','-30 days') ORDER BY a.date DESC`).all();
  ok(res, { affairs: rows.map(mapAffair) });
}));

// GET /api/affairs/archive
router.get('/archive', asyncHandler(async (_req, res) => {
  const rows = prep(
    `SELECT substr(a.date, 1, 7) as month, COUNT(*) as count FROM affairs a
     GROUP BY month ORDER BY month DESC`
  ).all();
  ok(res, { archive: rows });
}));

// GET /api/affairs/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const row = prep(
    `SELECT a.*, c.name as category_name FROM affairs a LEFT JOIN categories c ON c.id = a.category_id WHERE a.id = ?`
  ).get(Number(req.params.id));
  if (!row) throw new ApiError(404, 'Affair not found', 'NOT_FOUND');
  ok(res, { affair: mapAffair(row) });
}));

// POST /api/affairs
router.post('/', requireAuth, requireAdmin, validate(affairSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const info = prep(
    `INSERT INTO affairs (title, summary, content, category_id, date, tags, image_color, source, source_url, is_featured, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(b.title, b.summary, b.content, b.categoryId || null, b.date || new Date().toISOString().slice(0, 10),
    JSON.stringify(b.tags || []), b.imageColor || null, b.source || null, b.sourceUrl || null,
    b.isFeatured ? 1 : 0, req.user!.id);
  const users = prep('SELECT id FROM users WHERE role = ?').all('user') as { id: number }[];
  const stmt = prep(`INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'announcement', ?, ?)`);
  const tx = db.transaction(() => users.forEach((u) => stmt.run(u.id, 'New announcement: ' + b.title, b.summary || 'Read the latest announcement in the Current Affairs section.')));
  tx();
  ok(res, { id: Number(info.lastInsertRowid) }, 201);
}));

// PUT /api/affairs/:id
router.put('/:id', requireAuth, requireAdmin, validate(affairSchema.partial()), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = prep('SELECT id FROM affairs WHERE id = ?').get(id);
  if (!existing) throw new ApiError(404, 'Affair not found', 'NOT_FOUND');
  const b = req.body;
  const updates: Record<string, unknown> = {
    title: b.title, summary: b.summary, content: b.content, category_id: b.categoryId,
    date: b.date, tags: b.tags ? JSON.stringify(b.tags) : undefined, image_color: b.imageColor,
    source: b.source, source_url: b.sourceUrl, is_featured: b.isFeatured === undefined ? undefined : (b.isFeatured ? 1 : 0),
  };
  const set: string[] = [];
  const vals: unknown[] = [];
  for (const [col, val] of Object.entries(updates)) {
    if (val !== undefined) { set.push(`${col} = ?`); vals.push(val); }
  }
  vals.push(id);
  prep(`UPDATE affairs SET ${set.join(', ')} WHERE id = ?`).run(...vals);
  ok(res, { message: 'Affair updated' });
}));

// DELETE /api/affairs/:id
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const info = prep('DELETE FROM affairs WHERE id = ?').run(Number(req.params.id));
  if (info.changes === 0) throw new ApiError(404, 'Affair not found', 'NOT_FOUND');
  ok(res, { message: 'Affair deleted' });
}));

export default router;
