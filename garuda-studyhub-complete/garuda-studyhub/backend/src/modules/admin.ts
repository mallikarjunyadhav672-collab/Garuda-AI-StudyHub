import { Router } from 'express';
import { z } from 'zod';
import { db, prep } from '../db/database.pool';
import { requireAuth, requireAdmin, validate } from '../middleware';
import { ApiError, asyncHandler, ok } from '../utils/helpers';

const router = Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/stats
router.get('/stats', asyncHandler(async (_req, res) => {
  const totalUsersRow = await prep('SELECT COUNT(*) as c FROM users').get() as { c?: number } | undefined;
  const newUsers7dRow = await prep("SELECT COUNT(*) as c FROM users WHERE created_at >= date('now','-7 days')").get() as { c?: number } | undefined;
  const totalJobsRow = await prep("SELECT COUNT(*) as c FROM jobs WHERE status != 'Expired'").get() as { c?: number } | undefined;
  const activeJobsRow = await prep("SELECT COUNT(*) as c FROM jobs WHERE status = 'Active'").get() as { c?: number } | undefined;
  const totalMaterialsRow = await prep('SELECT COUNT(*) as c FROM materials WHERE is_published = 1').get() as { c?: number } | undefined;
  const totalDownloadsRow = await prep('SELECT COUNT(*) as c FROM material_downloads').get() as { c?: number } | undefined;
  const totalMocksRow = await prep('SELECT COUNT(*) as c FROM mock_tests WHERE is_published = 1').get() as { c?: number } | undefined;
  const mockAttemptsRow = await prep('SELECT COUNT(*) as c FROM mock_sessions WHERE is_completed = 1').get() as { c?: number } | undefined;
  const quizAttemptsRow = await prep('SELECT COUNT(*) as c FROM quiz_attempts').get() as { c?: number } | undefined;
  const totalAffairsRow = await prep('SELECT COUNT(*) as c FROM affairs').get() as { c?: number } | undefined;
  const totalVideosRow = await prep('SELECT COUNT(*) as c FROM videos WHERE is_published = 1').get() as { c?: number } | undefined;
  const applicationsRow = await prep('SELECT COUNT(*) as c FROM job_applications').get() as { c?: number } | undefined;
  const premiumUsersRow = await prep('SELECT COUNT(*) as c FROM users WHERE is_premium = 1').get() as { c?: number } | undefined;

  const totalUsers = Number(totalUsersRow?.c ?? 0);
  const newUsers7d = Number(newUsers7dRow?.c ?? 0);
  const totalJobs = Number(totalJobsRow?.c ?? 0);
  const activeJobs = Number(activeJobsRow?.c ?? 0);
  const totalMaterials = Number(totalMaterialsRow?.c ?? 0);
  const totalDownloads = Number(totalDownloadsRow?.c ?? 0);
  const totalMocks = Number(totalMocksRow?.c ?? 0);
  const mockAttempts = Number(mockAttemptsRow?.c ?? 0);
  const quizAttempts = Number(quizAttemptsRow?.c ?? 0);
  const totalAffairs = Number(totalAffairsRow?.c ?? 0);
  const totalVideos = Number(totalVideosRow?.c ?? 0);
  const applications = Number(applicationsRow?.c ?? 0);
  const premiumUsers = Number(premiumUsersRow?.c ?? 0);

  ok(res, {
    stats: {
      totalUsers, newUsers7d, totalJobs, activeJobs, totalMaterials, totalDownloads,
      totalMocks, mockAttempts, quizAttempts, totalAffairs, totalVideos, applications, premiumUsers,
    },
  });
}));

// GET /api/admin/analytics
router.get('/analytics', asyncHandler(async (_req, res) => {
  const userGrowth = await prep(
    `SELECT date(created_at) as date, COUNT(*) as count FROM users
     WHERE created_at >= date('now','-14 days') GROUP BY date(created_at) ORDER BY date`
  ).all();
  const popularExams = await prep(
    `SELECT exam, COUNT(*) as count FROM jobs WHERE exam IS NOT NULL GROUP BY exam ORDER BY count DESC LIMIT 8`
  ).all();
  const attemptsByDay = await prep(
    `SELECT date(created_at) as date, COUNT(*) as count FROM mock_sessions
     WHERE is_completed = 1 AND created_at >= date('now','-14 days') GROUP BY date ORDER BY date`
  ).all();
  const roleDistribution = await prep(`SELECT role, COUNT(*) as count FROM users GROUP BY role`).all();
  ok(res, { analytics: { userGrowth, popularExams, attemptsByDay, roleDistribution } });
}));

// GET /api/admin/reports
router.get('/reports', asyncHandler(async (_req, res) => {
  const topMocks = await prep(
    `SELECT mt.id, mt.title, mt.attempts, mt.avg_score FROM mock_tests mt ORDER BY mt.attempts DESC LIMIT 10`
  ).all();
  const topMaterials = await prep(
    `SELECT id, title, downloads FROM materials ORDER BY downloads DESC LIMIT 10`
  ).all();
  const recentApplications = await prep(
    `SELECT ja.id, u.name, j.org, j.role, ja.status, ja.applied_date FROM job_applications ja
     JOIN users u ON u.id = ja.user_id JOIN jobs j ON j.id = ja.job_id
     ORDER BY ja.applied_date DESC LIMIT 15`
  ).all();
  ok(res, { reports: { topMocks, topMaterials, recentApplications } });
}));

// GET /api/admin/testimonials
router.get('/testimonials', asyncHandler(async (_req, res) => {
  const rows = await prep(
    `SELECT id, name, rating, feedback, exam_details, status, created_at
     FROM testimonials
     ORDER BY created_at DESC`
  ).all();
  ok(res, { testimonials: rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    rating: Number(row.rating),
    feedback: row.feedback,
    examDetails: row.exam_details || null,
    status: row.status,
    createdAt: row.created_at,
  })) });
}));

// PATCH /api/admin/testimonials/:id
router.patch(
  '/testimonials/:id',
  validate(z.object({ status: z.enum(['approved', 'rejected']) })),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const row = await prep('SELECT id FROM testimonials WHERE id = ?').get(id);
    if (!row) throw new ApiError(404, 'Testimonial not found', 'NOT_FOUND');

    await prep(`UPDATE testimonials SET status = ? WHERE id = ?`).run(req.body.status, id);
    ok(res, { message: 'Testimonial updated' });
  })
);

// DELETE /api/admin/testimonials/:id
router.delete('/testimonials/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const row = await prep('SELECT id FROM testimonials WHERE id = ?').get(id);
  if (!row) throw new ApiError(404, 'Testimonial not found', 'NOT_FOUND');

  await prep('DELETE FROM testimonials WHERE id = ?').run(id);
  ok(res, { message: 'Testimonial deleted' });
}));

export default router;

