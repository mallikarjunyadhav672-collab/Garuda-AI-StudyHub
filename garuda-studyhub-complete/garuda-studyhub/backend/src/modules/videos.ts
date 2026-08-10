import { Router } from 'express';
import { z } from 'zod';
import { db, prep, parseJson } from '../db/database';
import { requireAuth, requireAdmin, validate } from '../middleware';
import { ApiError, asyncHandler, ok } from '../utils/helpers';

const router = Router();

const videoSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().optional(),
  categoryId: z.number().optional(),
  playlist: z.string().optional(),
  videoUrl: z.string().optional(),
  thumbnailColor: z.string().optional(),
  duration: z.number().optional(),
  educator: z.string().optional(),
  exam: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
});

function mapVideo(row: any, userId?: number) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    categoryId: row.category_id,
    category: row.category_name,
    playlist: row.playlist,
    videoUrl: row.video_url,
    thumbnailColor: row.thumbnail_color,
    duration: row.duration,
    educator: row.educator,
    exam: row.exam,
    views: row.views,
    likes: row.likes,
    tags: parseJson(row.tags, []),
    saved: userId ? !!row.saved : false,
    progressSeconds: row.progress_seconds || 0,
    createdAt: row.created_at,
  };
}

// GET /api/videos
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { category, search, sort = 'newest' } = req.query as Record<string, string>;
  const where = ['v.is_published = 1'];
  const params: unknown[] = [];
  if (category) { where.push('c.slug = ?'); params.push(category); }
  if (search) { where.push('(v.title LIKE ? OR v.educator LIKE ? OR v.exam LIKE ?)'); const like = `%${search}%`; params.push(like, like, like); }
  const orderBy = sort === 'popular' ? 'v.views DESC' : 'v.created_at DESC';
  const rows = prep(
    `SELECT v.*, c.name as category_name,
      (SELECT 1 FROM saved_items si WHERE si.user_id = ? AND si.entity_type = 'video' AND si.entity_id = v.id) as saved,
      (SELECT progress_seconds FROM video_progress vp WHERE vp.user_id = ? AND vp.video_id = v.id) as progress_seconds
     FROM videos v LEFT JOIN categories c ON c.id = v.category_id
     WHERE ${where.join(' AND ')} ORDER BY ${orderBy}`
  ).all(req.user!.id, req.user!.id, ...params);
  ok(res, { videos: rows.map((r) => mapVideo(r, req.user!.id)) });
}));

// GET /api/videos/categories
router.get('/categories', asyncHandler(async (_req, res) => {
  const cats = prep(`SELECT c.*, (SELECT COUNT(*) FROM videos v WHERE v.category_id = c.id AND v.is_published = 1) as count
    FROM categories c WHERE c.type = 'video' ORDER BY c.sort_order`).all();
  ok(res, { categories: cats });
}));

// GET /api/videos/playlists
router.get('/playlists', asyncHandler(async (_req, res) => {
  const rows = prep(
    `SELECT playlist, COUNT(*) as videoCount, COALESCE(SUM(duration),0) as totalDuration, MIN(thumbnail_color) as thumbnail_color
     FROM videos WHERE is_published = 1 AND playlist IS NOT NULL GROUP BY playlist ORDER BY videoCount DESC`
  ).all();
  ok(res, { playlists: rows });
}));

// GET /api/videos/saved
router.get('/saved', requireAuth, asyncHandler(async (req, res) => {
  const rows = prep(
    `SELECT v.*, c.name as category_name, 1 as saved FROM saved_items si
     JOIN videos v ON v.id = si.entity_id LEFT JOIN categories c ON c.id = v.category_id
     WHERE si.user_id = ? AND si.entity_type = 'video' ORDER BY si.created_at DESC`
  ).all(req.user!.id);
  ok(res, { videos: rows.map((r) => mapVideo(r, req.user!.id)) });
}));

// GET /api/videos/:id
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const row = prep(
    `SELECT v.*, c.name as category_name,
      (SELECT 1 FROM saved_items si WHERE si.user_id = ? AND si.entity_type = 'video' AND si.entity_id = v.id) as saved,
      (SELECT progress_seconds FROM video_progress vp WHERE vp.user_id = ? AND vp.video_id = v.id) as progress_seconds
     FROM videos v LEFT JOIN categories c ON c.id = v.category_id WHERE v.id = ?`
  ).get(req.user!.id, req.user!.id, id);
  if (!row) throw new ApiError(404, 'Video not found', 'NOT_FOUND');
  prep('UPDATE videos SET views = views + 1 WHERE id = ?').run(id);
  ok(res, { video: mapVideo(row, req.user!.id) });
}));

// POST /api/videos
router.post('/', requireAuth, requireAdmin, validate(videoSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const info = prep(
    `INSERT INTO videos (title, description, category_id, playlist, video_url, thumbnail_color, duration, educator, exam, tags, is_published, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(b.title, b.description || null, b.categoryId || null, b.playlist || null, b.videoUrl || null,
    b.thumbnailColor || null, b.duration || 0, b.educator || null, b.exam || null,
    JSON.stringify(b.tags || []), b.isPublished === false ? 0 : 1, req.user!.id);
  if (b.isPublished !== false) {
    const users = prep('SELECT id FROM users WHERE role = ?').all('user') as { id: number }[];
    const stmt = prep(`INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'course', ?, ?)`);
    const tx = db.transaction(() => users.forEach((u) => stmt.run(u.id, 'New course added: ' + b.title, b.description || 'A new video course is available now.')));
    tx();
  }
  ok(res, { id: Number(info.lastInsertRowid) }, 201);
}));

// PUT /api/videos/:id
router.put('/:id', requireAuth, requireAdmin, validate(videoSchema.partial()), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = prep('SELECT id FROM videos WHERE id = ?').get(id);
  if (!existing) throw new ApiError(404, 'Video not found', 'NOT_FOUND');
  const b = req.body;
  const updates: Record<string, unknown> = {
    title: b.title, description: b.description, category_id: b.categoryId, playlist: b.playlist,
    video_url: b.videoUrl, thumbnail_color: b.thumbnailColor, duration: b.duration,
    educator: b.educator, exam: b.exam, tags: b.tags ? JSON.stringify(b.tags) : undefined,
    is_published: b.isPublished === undefined ? undefined : (b.isPublished ? 1 : 0),
  };
  const set: string[] = [];
  const vals: unknown[] = [];
  for (const [col, val] of Object.entries(updates)) {
    if (val !== undefined) { set.push(`${col} = ?`); vals.push(val); }
  }
  vals.push(id);
  prep(`UPDATE videos SET ${set.join(', ')} WHERE id = ?`).run(...vals);
  ok(res, { message: 'Video updated' });
}));

// DELETE /api/videos/:id
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const info = prep('DELETE FROM videos WHERE id = ?').run(Number(req.params.id));
  if (info.changes === 0) throw new ApiError(404, 'Video not found', 'NOT_FOUND');
  ok(res, { message: 'Video deleted' });
}));

// POST /api/videos/:id/progress
router.post('/:id/progress', requireAuth, validate(z.object({ seconds: z.number().min(0) })), asyncHandler(async (req, res) => {
  const vid = Number(req.params.id);
  prep(
    `INSERT INTO video_progress (user_id, video_id, progress_seconds) VALUES (?, ?, ?)
     ON CONFLICT(user_id, video_id) DO UPDATE SET progress_seconds = excluded.progress_seconds, updated_at = datetime('now')`
  ).run(req.user!.id, vid, req.body.seconds);
  ok(res, { progress: req.body.seconds });
}));

// POST /api/videos/:id/save
router.post('/:id/save', requireAuth, asyncHandler(async (req, res) => {
  prep(`INSERT OR IGNORE INTO saved_items (user_id, entity_type, entity_id) VALUES (?, 'video', ?)`)
    .run(req.user!.id, Number(req.params.id));
  ok(res, { saved: true });
}));

// DELETE /api/videos/:id/save
router.delete('/:id/save', requireAuth, asyncHandler(async (req, res) => {
  prep(`DELETE FROM saved_items WHERE user_id = ? AND entity_type = 'video' AND entity_id = ?`)
    .run(req.user!.id, Number(req.params.id));
  ok(res, { saved: false });
}));

export default router;
