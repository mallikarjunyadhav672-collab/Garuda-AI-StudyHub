import { Router } from 'express';
import { z } from 'zod';
import { db, prep, parseJson } from '../db/database.pool';
import { optionalAuth, requireAuth, requireAdmin, validate } from '../middleware';
import { ApiError, asyncHandler, ok } from '../utils/helpers';

const router = Router();

const materialSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  categoryId: z.number(),
  exam: z.string().min(1),
  pages: z.number().optional(),
  fileUrl: z.string().optional(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
});

function mapMaterial(row: any, userId?: number) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    categoryId: row.category_id,
    category: row.category_name,
    exam: row.exam,
    pages: row.pages,
    fileUrl: row.file_url,
    fileSize: row.file_size,
    fileType: row.file_type,
    downloads: row.downloads,
    rating: row.rating,
    ratingCount: row.rating_count,
    tags: parseJson(row.tags, []),
    bookmarked: userId ? !!row.bookmarked : false,
    createdAt: row.created_at,
  };
}

// GET /api/materials
import { getCached, setCached } from '../utils/cache';

router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const cacheKey = `materials:${JSON.stringify(req.query)}:user:${req.user?.id ?? 'anon'}`;
  const cached = getCached(cacheKey);
  if (cached) return ok(res, cached);

  const { search, category, exam, sort = 'popular', page = '1', limit = '12' } = req.query as Record<string, string>;
  const where = ['m.is_published = 1'];
  const params: unknown[] = [];
  if (search) {
    where.push('(m.title LIKE ? OR m.description LIKE ? OR m.exam LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (category) { where.push('c.slug = ?'); params.push(category); }
  if (exam) { where.push('m.exam LIKE ?'); params.push(`%${exam}%`); }
  const orderBy =
    sort === 'latest' ? 'm.created_at DESC' : sort === 'downloads' ? 'm.downloads DESC' : 'm.downloads DESC';

  const countParams = [...params];
  const bmSub = req.user
    ? `(SELECT 1 FROM saved_items si WHERE si.user_id = ? AND si.entity_type = 'material' AND si.entity_id = m.id)`
    : '0';
  if (req.user) params.unshift(req.user.id);

  const totalRow = await prep(`SELECT COUNT(*) as c FROM materials m LEFT JOIN categories c ON c.id = m.category_id WHERE ${where.join(' AND ')}`).get(...countParams) as { c?: number } | undefined;
  const total = Number(totalRow?.c ?? 0);
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(50, Math.max(1, parseInt(limit) || 12));

  const rows = await prep(
    `SELECT m.*, c.name as category_name, ${bmSub} as bookmarked FROM materials m
     LEFT JOIN categories c ON c.id = m.category_id
     WHERE ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
  ).all(...params, l, (p - 1) * l) as any[];

  const payload = { materials: (rows ?? []).map((r) => mapMaterial(r, req.user?.id)), total, page: p, limit: l };
  setCached(cacheKey, payload);
  ok(res, payload);
}));

// GET /api/materials/categories
router.get('/categories', asyncHandler(async (_req, res) => {
  const cats = await prep(`SELECT c.*, (SELECT COUNT(*) FROM materials m WHERE m.category_id = c.id AND m.is_published = 1) as count
    FROM categories c WHERE c.type = 'material' ORDER BY c.sort_order`).all();
  ok(res, { categories: cats });
}));

// GET /api/materials/popular
router.get('/popular', optionalAuth, asyncHandler(async (req, res) => {
  const bmSub = req.user ? `(SELECT 1 FROM saved_items si WHERE si.user_id = ? AND si.entity_type = 'material' AND si.entity_id = m.id)` : '0';
  const params: unknown[] = req.user ? [req.user.id] : [];
  const rows = await prep(
    `SELECT m.*, c.name as category_name, ${bmSub} as bookmarked FROM materials m
     LEFT JOIN categories c ON c.id = m.category_id WHERE m.is_published = 1
     ORDER BY m.downloads DESC LIMIT 8`
  ).all(...params);
  ok(res, { materials: rows.map((r) => mapMaterial(r, req.user?.id)) });
}));

// GET /api/materials/bookmarks
router.get('/bookmarks', requireAuth, asyncHandler(async (req, res) => {
  const rows = await prep(
    `SELECT m.*, c.name as category_name, 1 as bookmarked FROM saved_items si
     JOIN materials m ON m.id = si.entity_id LEFT JOIN categories c ON c.id = m.category_id
     WHERE si.user_id = ? AND si.entity_type = 'material' ORDER BY si.created_at DESC`
  ).all(req.user!.id);
  ok(res, { materials: rows.map((r) => mapMaterial(r, req.user!.id)) });
}));

// GET /api/materials/downloads — download history
router.get('/downloads', requireAuth, asyncHandler(async (req, res) => {
  const rows = await prep(
    `SELECT md.id, md.created_at, m.id as materialId, m.title, m.file_type, m.file_size
     FROM material_downloads md JOIN materials m ON m.id = md.material_id
     WHERE md.user_id = ? ORDER BY md.created_at DESC`
  ).all(req.user!.id);
  ok(res, { downloads: rows });
}));

// GET /api/materials/:id
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const bmSub = req.user ? `(SELECT 1 FROM saved_items si WHERE si.user_id = ? AND si.entity_type = 'material' AND si.entity_id = m.id)` : '0';
  const params: unknown[] = req.user ? [req.user.id, id] : [id];
  const row = await prep(
    `SELECT m.*, c.name as category_name, ${bmSub} as bookmarked FROM materials m
     LEFT JOIN categories c ON c.id = m.category_id WHERE m.id = ?`
  ).get(...params);
  if (!row) throw new ApiError(404, 'Material not found', 'NOT_FOUND');
  ok(res, { material: mapMaterial(row, req.user?.id) });
}));

// POST /api/materials
router.post('/', requireAuth, requireAdmin, validate(materialSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const info = await prep(
    `INSERT INTO materials (title, description, category_id, exam, pages, file_url, file_size, file_type, tags, uploaded_by, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(b.title, b.description, b.categoryId, b.exam, b.pages || 0, b.fileUrl || null,
    b.fileSize || 0, b.fileType || 'pdf', JSON.stringify(b.tags || []), req.user!.id, b.isPublished === false ? 0 : 1);
  if (b.isPublished !== false) {
    const users = await prep('SELECT id FROM users WHERE role = ?').all('user') as { id: number }[];
    const stmt = prep(`INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'material', ?, ?)`);
    const tx = db.transaction(async () => {
      for (const u of users) {
        await stmt.run(u.id, 'New study material added: ' + b.title, b.description || 'Check it out in the Materials section.');
      }
    });
    await tx();
  }
  ok(res, { id: Number(info.lastInsertRowid) }, 201);
}));

// PUT /api/materials/:id
router.put('/:id', requireAuth, requireAdmin, validate(materialSchema.partial()), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prep('SELECT id FROM materials WHERE id = ?').get(id);
  if (!existing) throw new ApiError(404, 'Material not found', 'NOT_FOUND');
  const b = req.body;
  const updates: Record<string, unknown> = {
    title: b.title, description: b.description, category_id: b.categoryId, exam: b.exam,
    pages: b.pages, file_url: b.fileUrl, file_size: b.fileSize, file_type: b.fileType,
    tags: b.tags ? JSON.stringify(b.tags) : undefined,
    is_published: b.isPublished === undefined ? undefined : (b.isPublished ? 1 : 0),
  };
  const set: string[] = [];
  const vals: unknown[] = [];
  for (const [col, val] of Object.entries(updates)) {
    if (val !== undefined) { set.push(`${col} = ?`); vals.push(val); }
  }
  set.push(`updated_at = datetime('now')`);
  vals.push(id);
  await prep(`UPDATE materials SET ${set.join(', ')} WHERE id = ?`).run(...vals);
  ok(res, { message: 'Material updated' });
}));

// DELETE /api/materials/:id
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const info = await prep('DELETE FROM materials WHERE id = ?').run(Number(req.params.id));
  if (info.changes === 0) throw new ApiError(404, 'Material not found', 'NOT_FOUND');
  ok(res, { message: 'Material deleted' });
}));

// POST /api/materials/:id/bookmark
router.post('/:id/bookmark', requireAuth, asyncHandler(async (req, res) => {
  const mid = Number(req.params.id);
  const m = await prep('SELECT id FROM materials WHERE id = ?').get(mid);
  if (!m) throw new ApiError(404, 'Material not found', 'NOT_FOUND');
  prep(`INSERT OR IGNORE INTO saved_items (user_id, entity_type, entity_id) VALUES (?, 'material', ?)`)
    .run(req.user!.id, mid);
  ok(res, { bookmarked: true });
}));

// DELETE /api/materials/:id/bookmark
router.delete('/:id/bookmark', requireAuth, asyncHandler(async (req, res) => {
  prep(`DELETE FROM saved_items WHERE user_id = ? AND entity_type = 'material' AND entity_id = ?`)
    .run(req.user!.id, Number(req.params.id));
  ok(res, { bookmarked: false });
}));

// GET /api/materials/:id/download — track download
router.get('/:id/download', requireAuth, asyncHandler(async (req, res) => {
  const mid = Number(req.params.id);
  const m = await prep('SELECT * FROM materials WHERE id = ?').get(mid);
  if (!m) throw new ApiError(404, 'Material not found', 'NOT_FOUND');
  prep(`INSERT INTO material_downloads (user_id, material_id) VALUES (?, ?)`).run(req.user!.id, mid);
  await prep(`UPDATE materials SET downloads = downloads + 1 WHERE id = ?`).run(mid);
  ok(res, { fileUrl: m.file_url || '#', downloads: m.downloads + 1 });
}));

export default router;

