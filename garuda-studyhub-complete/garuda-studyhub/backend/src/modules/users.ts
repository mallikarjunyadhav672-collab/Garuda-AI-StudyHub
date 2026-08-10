import { Router } from 'express';
import { z } from 'zod';
import { db, prep, parseJson } from '../db/database';
import { requireAuth, requireAdmin, validate } from '../middleware';
import { ApiError, asyncHandler, ok } from '../utils/helpers';

const router = Router();
router.use(requireAuth);

function getStats(userId: number) {
  const streak = db
    .prepare(
      `SELECT COUNT(DISTINCT date) as days FROM quiz_attempts
       WHERE user_id = ? AND date >= date('now','-6 days')`
    )
    .get(userId) as { days: number };
  const mocks = db
    .prepare(
      `SELECT COUNT(*) as total, AVG(accuracy) as avgAcc FROM mock_sessions WHERE user_id = ? AND is_completed = 1`
    )
    .get(userId) as { total: number; avgAcc: number };
  const quizzes = db
    .prepare(`SELECT COUNT(*) as total, COALESCE(SUM(score),0) as score, SUM(total_questions) as q FROM quiz_attempts WHERE user_id = ?`)
    .get(userId) as { total: number; score: number; q: number };
  const studyTime = db
    .prepare(
      `SELECT COALESCE(SUM(time_taken),0) as t FROM (
         SELECT time_taken FROM mock_sessions WHERE user_id = ? AND is_completed = 1
         UNION ALL
         SELECT time_taken FROM quiz_attempts WHERE user_id = ?
       )`
    )
    .get(userId, userId) as { t: number };
  const rank = db
    .prepare(
      `SELECT COUNT(DISTINCT user_id) + 1 as rank FROM mock_sessions
       WHERE is_completed = 1 AND user_id != ? AND score >= COALESCE(
         (SELECT MAX(score) FROM mock_sessions WHERE user_id = ? AND is_completed = 1), 0)`
    )
    .get(userId, userId) as { rank: number };

  return {
    studyStreak: streak.days,
    totalMocksTaken: mocks.total,
    avgAccuracy: Math.round((mocks.avgAcc || 0) * 100) / 100,
    totalQuizzesCompleted: quizzes.total,
    quizScore: quizzes.score,
    totalStudyTimeSeconds: studyTime.t,
    rank: rank.rank,
  };
}

// GET /api/users/me
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const row = prep('SELECT * FROM users WHERE id = ?').get(req.user!.id);
    const prefs = prep('SELECT * FROM user_preferences WHERE user_id = ?').get(req.user!.id) || {};
    ok(res, {
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        avatar: row.avatar,
        role: row.role,
        examTarget: row.exam_target,
        isVerified: !!row.is_verified,
        isPremium: !!row.is_premium,
        premiumExpiresAt: row.premium_expires_at,
        createdAt: row.created_at,
      },
      preferences: {
        language: prefs.language || 'en',
        theme: prefs.theme || 'light',
        notifyEmail: !!prefs.notify_email,
        notifyPush: !!prefs.notify_push,
      },
    });
  })
);

// PUT /api/users/me
router.put(
  '/me',
  validate(
    z.object({
      name: z.string().min(2).max(50).optional(),
      phone: z.string().optional(),
      avatar: z.string().url().optional().or(z.literal('')),
      examTarget: z.string().optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const key of ['name', 'phone', 'avatar', 'exam_target'] as const) {
      if (req.body[key.replace('_', '')] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(req.body[key.replace('_', '')] || null);
      }
    }
    if (fields.length === 0) throw new ApiError(400, 'Nothing to update', 'BAD_REQUEST');
    fields.push(`updated_at = datetime('now')`);
    values.push(req.user!.id);
    prep(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    const row = prep('SELECT * FROM users WHERE id = ?').get(req.user!.id);
    ok(res, { user: row });
  })
);

// PUT /api/users/me/preferences
router.put(
  '/me/preferences',
  validate(
    z.object({
      language: z.enum(['en', 'hi', 'te']).optional(),
      theme: z.enum(['light', 'dark']).optional(),
      notifyEmail: z.boolean().optional(),
      notifyPush: z.boolean().optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const current = prep('SELECT * FROM user_preferences WHERE user_id = ?').get(req.user!.id);
    const merged = {
      language: req.body.language ?? current?.language ?? 'en',
      theme: req.body.theme ?? current?.theme ?? 'light',
      notifyEmail: req.body.notifyEmail ?? !!current?.notify_email,
      notifyPush: req.body.notifyPush ?? !!current?.notify_push,
    };
    prep(
      `INSERT INTO user_preferences (user_id, language, theme, notify_email, notify_push)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         language = excluded.language, theme = excluded.theme,
         notify_email = excluded.notify_email, notify_push = excluded.notify_push`
    ).run(req.user!.id, merged.language, merged.theme, merged.notifyEmail ? 1 : 0, merged.notifyPush ? 1 : 0);
    ok(res, { preferences: merged });
  })
);

// GET /api/users/me/stats
router.get(
  '/me/stats',
  asyncHandler(async (req, res) => {
    const stats = getStats(req.user!.id);
    const recentMocks = db
      .prepare(
        `SELECT ms.id, ms.score, ms.total_marks, ms.accuracy, ms.created_at, ms.ranking, mt.title, mt.exam
         FROM mock_sessions ms JOIN mock_tests mt ON mt.id = ms.test_id
         WHERE ms.user_id = ? AND ms.is_completed = 1
         ORDER BY ms.created_at DESC LIMIT 5`
      )
      .all(req.user!.id);
    const weekly = db
      .prepare(
        `SELECT date, SUM(score) as score, SUM(total_questions) as total
         FROM quiz_attempts WHERE user_id = ? AND date >= date('now','-6 days')
         GROUP BY date ORDER BY date`
      )
      .all(req.user!.id);
    const savedJobs = db
      .prepare(
        `SELECT j.id, j.org, j.role, j.last_date, j.status FROM saved_items si
         JOIN jobs j ON j.id = si.entity_id
         WHERE si.user_id = ? AND si.entity_type = 'job' ORDER BY si.created_at DESC LIMIT 5`
      )
      .all(req.user!.id);
    const upcomingExams = db
      .prepare(
        `SELECT id, org, role, last_date FROM jobs
         WHERE last_date >= date('now') AND status != 'Expired'
         ORDER BY last_date ASC LIMIT 5`
      )
      .all();
    ok(res, { stats, recentMocks, weekly, savedJobs, upcomingExams });
  })
);

// GET /api/users/me/bookmarks — all saved items grouped by type
router.get(
  '/me/bookmarks',
  asyncHandler(async (req, res) => {
    const saved = prep(
      `SELECT entity_type, entity_id, created_at FROM saved_items WHERE user_id = ? ORDER BY created_at DESC`
    ).all(req.user!.id) as { entity_type: string; entity_id: number; created_at: string }[];

    const jobs = saved.filter((s) => s.entity_type === 'job');
    const materials = saved.filter((s) => s.entity_type === 'material');
    const videos = saved.filter((s) => s.entity_type === 'video');

    const jobRows = jobs.length
      ? prep(`SELECT id, org, role, last_date, status FROM jobs WHERE id IN (${jobs.map(() => '?').join(',')})`).all(...jobs.map((j) => j.entity_id))
      : [];
    const materialRows = materials.length
      ? prep(`SELECT id, title, exam, category_id FROM materials WHERE id IN (${materials.map(() => '?').join(',')})`).all(...materials.map((m) => m.entity_id))
      : [];
    const videoRows = videos.length
      ? prep(`SELECT id, title, educator, duration, thumbnail_color FROM videos WHERE id IN (${videos.map(() => '?').join(',')})`).all(...videos.map((v) => v.entity_id))
      : [];

    ok(res, {
      jobs: jobRows,
      materials: materialRows,
      videos: videoRows,
      counts: { jobs: jobRows.length, materials: materialRows.length, videos: videoRows.length, total: saved.length },
    });
  })
);

// GET /api/users/me/achievements
router.get(
  '/me/achievements',
  asyncHandler(async (req, res) => {
    const s = getStats(req.user!.id);
    const achievements = [
      { id: 'first_mock', title: 'First Mock Test', description: 'Completed your first mock test', earned: s.totalMocksTaken >= 1, icon: 'target' },
      { id: 'mock_5', title: 'Practice Regular', description: 'Completed 5 mock tests', earned: s.totalMocksTaken >= 5, icon: 'zap' },
      { id: 'quiz_streak', title: 'Daily Learner', description: 'Answered quizzes on 7+ days this week', earned: s.studyStreak >= 7, icon: 'flame' },
      { id: 'accuracy_75', title: 'Sharp Shooter', description: 'Reached 75%+ average accuracy', earned: s.avgAccuracy >= 75, icon: 'crosshair' },
      { id: 'top_100', title: 'Top 100', description: 'Ranked in the top 100 on a leaderboard', earned: s.rank <= 100, icon: 'trophy' },
      { id: 'profile_pro', title: 'Profile Pro', description: 'Set your exam target', earned: true, icon: 'user' },
    ];
    ok(res, { achievements, stats: s });
  })
);

// ------------------------- Admin: user management --------------------------
router.get('/', requireAdmin, asyncHandler(async (_req, res) => {
  const users = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.is_verified, u.is_premium, u.exam_target, u.created_at,
        (SELECT COUNT(*) FROM mock_sessions ms WHERE ms.user_id = u.id AND ms.is_completed = 1) as mocks_taken
       FROM users u ORDER BY u.created_at DESC`
    )
    .all();
  ok(res, { users });
}));

router.put(
  '/:id',
  requireAdmin,
  validate(z.object({ role: z.enum(['user', 'admin', 'superadmin']).optional(), isPremium: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = prep('SELECT id FROM users WHERE id = ?').get(id);
    if (!existing) throw new ApiError(404, 'User not found', 'NOT_FOUND');
    if (req.body.role) prep(`UPDATE users SET role = ? WHERE id = ?`).run(req.body.role, id);
    if (req.body.isPremium !== undefined) prep(`UPDATE users SET is_premium = ? WHERE id = ?`).run(req.body.isPremium ? 1 : 0, id);
    ok(res, { message: 'User updated' });
  })
);

router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user!.id) throw new ApiError(400, 'You cannot delete your own account', 'BAD_REQUEST');
  const info = prep('DELETE FROM users WHERE id = ?').run(id);
  if (info.changes === 0) throw new ApiError(404, 'User not found', 'NOT_FOUND');
  ok(res, { message: 'User deleted' });
}));

export default router;
