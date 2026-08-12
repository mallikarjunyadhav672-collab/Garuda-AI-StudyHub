import { Router } from 'express';
import { z } from 'zod';
import { db, prep, parseJson } from '../db/database';
import { optionalAuth, requireAuth, requireAdmin, validate } from '../middleware';
import { ApiError, asyncHandler, ok } from '../utils/helpers';

const router = Router();

const jobSchema = z.object({
  org: z.string().min(2).max(100),
  role: z.string().min(2).max(200),
  exam: z.string().optional(),
  posts: z.number().int().positive().optional(),
  lastDate: z.string().min(1),
  qualification: z.string().optional(),
  location: z.string().optional(),
  salary: z.string().optional(),
  categoryId: z.number().optional(),
  department: z.string().optional(),
  state: z.string().optional(),
  jobType: z.string().optional(),
  status: z.string().optional(),
  featured: z.boolean().optional(),
  trend: z.boolean().optional(),
  ageLimit: z.string().optional(),
  applicationFee: z.string().optional(),
  selectionProcess: z.array(z.string()).optional(),
  eligibility: z.array(z.string()).optional(),
  description: z.string().optional(),
  noticeUrl: z.string().optional(),
});

function mapJob(row: any, userId?: number) {
  return {
    id: row.id,
    org: row.org,
    role: row.role,
    exam: row.exam,
    posts: row.posts,
    lastDate: row.last_date,
    qualification: row.qualification,
    location: row.location,
    salary: row.salary,
    categoryId: row.category_id,
    category: row.category_name,
    department: row.department,
    state: row.state,
    jobType: row.job_type,
    status: row.status,
    featured: !!row.featured,
    trend: !!row.trend,
    ageLimit: row.age_limit,
    applicationFee: row.application_fee,
    selectionProcess: parseJson(row.selection_process, []),
    eligibility: parseJson(row.eligibility, []),
    description: row.description,
    noticeUrl: row.notice_url,
    saved: userId ? !!row.saved : false,
    created_at: row.created_at,
  };
}

// GET /api/jobs — list with search/filter/pagination
import { getCached, setCached } from '../utils/cache';

router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const cacheKey = `jobs:${JSON.stringify(req.query)}:user:${req.user?.id ?? 'anon'}`;
    const cached = getCached(cacheKey);
    if (cached) return ok(res, cached);
    const { search, category, status, state, sort, page = '1', limit = '12' } = req.query as Record<string, string>;
    const where: string[] = [];
    const params: unknown[] = [];

    if (search) {
      where.push('(j.role LIKE ? OR j.org LIKE ? OR j.exam LIKE ? OR j.location LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }
    if (category) { where.push('c.slug = ?'); params.push(category); }
    if (status && status !== 'All') { where.push('j.status = ?'); params.push(status); }
    if (state) { where.push('j.state = ?'); params.push(state); }
    where.push("j.status != 'Expired'");

    const orderBy =
      sort === 'deadline' ? 'j.last_date ASC' : sort === 'newest' ? 'j.created_at DESC' : 'j.created_at DESC';

    const countParams = [...params];
    const savedSub = req.user
      ? `(SELECT 1 FROM saved_items si WHERE si.user_id = ? AND si.entity_type = 'job' AND si.entity_id = j.id)`
      : '0';
    if (req.user) params.unshift(req.user.id);

    const totalRow = prep(`SELECT COUNT(*) as c FROM jobs j LEFT JOIN categories c ON c.id = j.category_id WHERE ${where.join(' AND ')}`)
      .get(...countParams) as { c?: number } | undefined;
    const total = Number(totalRow?.c ?? 0);
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.min(50, Math.max(1, parseInt(limit) || 12));
    const offset = (p - 1) * l;

    const rows = prep(
      `SELECT j.*, c.name as category_name, ${savedSub} as saved
       FROM jobs j LEFT JOIN categories c ON c.id = j.category_id
       WHERE ${where.join(' AND ')}
       ORDER BY j.featured DESC, ${orderBy} LIMIT ? OFFSET ?`
    ).all(...params, l, offset) as any[];

    const payload = { jobs: (rows ?? []).map((r) => mapJob(r, req.user?.id)), total, page: p, limit: l };
    setCached(cacheKey, payload);
    ok(res, payload);
  })
);

// GET /api/jobs/categories
router.get('/categories', asyncHandler(async (_req, res) => {
  const cats = prep(`SELECT c.*, (SELECT COUNT(*) FROM jobs j WHERE j.category_id = c.id) as count
    FROM categories c WHERE c.type = 'job' ORDER BY c.sort_order`).all();
  ok(res, { categories: cats });
}));

// GET /api/jobs/organizations
router.get('/organizations', asyncHandler(async (_req, res) => {
  const orgs = prep(`SELECT org, COUNT(*) as jobCount, MAX(last_date) as latestDeadline FROM jobs
    WHERE status != 'Expired' GROUP BY org ORDER BY jobCount DESC`).all();
  ok(res, { organizations: orgs });
}));

// GET /api/jobs/saved (must be declared before /:id)
router.get('/saved', requireAuth, asyncHandler(async (req, res) => {
  const rows = prep(
    `SELECT j.*, c.name as category_name, 1 as saved FROM saved_items si
     JOIN jobs j ON j.id = si.entity_id LEFT JOIN categories c ON c.id = j.category_id
     WHERE si.user_id = ? AND si.entity_type = 'job' ORDER BY si.created_at DESC`
  ).all(req.user!.id);
  ok(res, { jobs: rows.map((r) => mapJob(r, req.user!.id)) });
}));

// GET /api/jobs/featured
router.get('/featured', optionalAuth, asyncHandler(async (req, res) => {
  const savedSub = req.user
    ? `(SELECT 1 FROM saved_items si WHERE si.user_id = ? AND si.entity_type = 'job' AND si.entity_id = j.id)`
    : '0';
  const params: unknown[] = req.user ? [req.user.id] : [];
  const rows = prep(
    `SELECT j.*, c.name as category_name, ${savedSub} as saved FROM jobs j
     LEFT JOIN categories c ON c.id = j.category_id
     WHERE j.featured = 1 AND j.status != 'Expired' ORDER BY j.last_date ASC LIMIT 6`
  ).all(...params);
  ok(res, { jobs: rows.map((r) => mapJob(r, req.user?.id)) });
}));

// GET /api/jobs/:id
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const savedSub = req.user
    ? `(SELECT 1 FROM saved_items si WHERE si.user_id = ? AND si.entity_type = 'job' AND si.entity_id = j.id)`
    : '0';
  const params: unknown[] = req.user ? [req.user.id, id] : [id];
  const row = prep(
    `SELECT j.*, c.name as category_name, ${savedSub} as saved FROM jobs j
     LEFT JOIN categories c ON c.id = j.category_id WHERE j.id = ?`
  ).get(...params);
  if (!row) throw new ApiError(404, 'Job not found', 'NOT_FOUND');
  ok(res, { job: mapJob(row, req.user?.id) });
}));

// POST /api/jobs — admin create
router.post('/', requireAuth, requireAdmin, validate(jobSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const info = prep(
    `INSERT INTO jobs (org, role, exam, posts, last_date, qualification, location, salary, category_id,
      department, state, job_type, status, featured, trend, age_limit, application_fee, selection_process,
      eligibility, description, notice_url, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    b.org, b.role, b.exam || null, b.posts || 0, b.lastDate, b.qualification || null,
    b.location || null, b.salary || null, b.categoryId || null, b.department || null,
    b.state || null, b.jobType || 'Permanent', b.status || 'Active', b.featured ? 1 : 0,
    b.trend ? 1 : 0, b.ageLimit || null, b.applicationFee || null,
    JSON.stringify(b.selectionProcess || []), JSON.stringify(b.eligibility || []),
    b.description || null, b.noticeUrl || null, req.user!.id
  );
  ok(res, { id: Number(info.lastInsertRowid) }, 201);
}));

// PUT /api/jobs/:id — admin update
router.put('/:id', requireAuth, requireAdmin, validate(jobSchema.partial()), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = prep('SELECT * FROM jobs WHERE id = ?').get(id);
  if (!existing) throw new ApiError(404, 'Job not found', 'NOT_FOUND');
  const b = req.body;
  const updates = {
    org: b.org, role: b.role, exam: b.exam, posts: b.posts, last_date: b.lastDate,
    qualification: b.qualification, location: b.location, salary: b.salary, category_id: b.categoryId,
    department: b.department, state: b.state, job_type: b.jobType, status: b.status,
    featured: b.featured === undefined ? undefined : (b.featured ? 1 : 0),
    trend: b.trend === undefined ? undefined : (b.trend ? 1 : 0),
    age_limit: b.ageLimit, application_fee: b.applicationFee,
    selection_process: b.selectionProcess ? JSON.stringify(b.selectionProcess) : undefined,
    eligibility: b.eligibility ? JSON.stringify(b.eligibility) : undefined,
    description: b.description, notice_url: b.noticeUrl,
  };
  const set: string[] = [];
  const vals: unknown[] = [];
  for (const [col, val] of Object.entries(updates)) {
    if (val !== undefined) { set.push(`${col} = ?`); vals.push(val); }
  }
  set.push(`updated_at = datetime('now')`);
  vals.push(id);
  prep(`UPDATE jobs SET ${set.join(', ')} WHERE id = ?`).run(...vals);
  ok(res, { message: 'Job updated' });
}));

// DELETE /api/jobs/:id — admin delete
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const info = prep('DELETE FROM jobs WHERE id = ?').run(Number(req.params.id));
  if (info.changes === 0) throw new ApiError(404, 'Job not found', 'NOT_FOUND');
  ok(res, { message: 'Job deleted' });
}));

// POST /api/jobs/:id/save — save job
router.post('/:id/save', requireAuth, asyncHandler(async (req, res) => {
  const jobId = Number(req.params.id);
  const job = prep('SELECT id FROM jobs WHERE id = ?').get(jobId);
  if (!job) throw new ApiError(404, 'Job not found', 'NOT_FOUND');
  prep(`INSERT OR IGNORE INTO saved_items (user_id, entity_type, entity_id) VALUES (?, 'job', ?)`)
    .run(req.user!.id, jobId);
  ok(res, { saved: true });
}));

// DELETE /api/jobs/:id/save — unsave job
router.delete('/:id/save', requireAuth, asyncHandler(async (req, res) => {
  prep(`DELETE FROM saved_items WHERE user_id = ? AND entity_type = 'job' AND entity_id = ?`)
    .run(req.user!.id, Number(req.params.id));
  ok(res, { saved: false });
}));

// POST /api/jobs/:id/apply
router.post('/:id/apply', requireAuth, validate(z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
})), asyncHandler(async (req, res) => {
  const jobId = Number(req.params.id);
  const job = prep('SELECT id FROM jobs WHERE id = ?').get(jobId);
  if (!job) throw new ApiError(404, 'Job not found', 'NOT_FOUND');
  const existing = prep(`SELECT id FROM job_applications WHERE user_id = ? AND job_id = ?`).get(req.user!.id, jobId);
  if (existing) throw new ApiError(409, 'You have already applied for this job', 'ALREADY_APPLIED');
  prep(`INSERT INTO job_applications (user_id, job_id, notes) VALUES (?, ?, ?)`)
    .run(req.user!.id, jobId, req.body.notes || null);
  prep(`INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'job_alert', ?, ?)`)
    .run(req.user!.id, 'Application submitted ✅', `Your application for ${job.role} has been submitted.`);
  ok(res, { message: 'Application submitted successfully' }, 201);
}));

export default router;
