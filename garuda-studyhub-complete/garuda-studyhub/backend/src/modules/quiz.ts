import { Router } from 'express';
import { z } from 'zod';
import { db, prep, parseJson } from '../db/database';
import { requireAuth, requireAdmin, validate } from '../middleware';
import { ApiError, asyncHandler, ok } from '../utils/helpers';

const router = Router();

// GET /api/quiz/today — today's quiz (questions without correct index)
router.get('/today', requireAuth, asyncHandler(async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const attempted = prep('SELECT id FROM quiz_attempts WHERE user_id = ? AND date = ?').get(req.user!.id, today);
  const rows = prep(
    `SELECT * FROM quiz_questions WHERE date <= ? ORDER BY date DESC LIMIT 10`
  ).all(today);

  const questions = rows.map((q: any) => ({
    id: q.id,
    questionText: q.question_text,
    options: parseJson(q.options, []),
    category: q.category,
    difficulty: q.difficulty,
    date: q.date,
  }));

  ok(res, { date: today, questions, attempted: !!attempted });
}));

// POST /api/quiz/today/submit
const answersSchema = z
  .record(z.string(), z.coerce.number().int())
  .transform((v) => Object.fromEntries(Object.entries(v).map(([k, val]) => [Number(k), val])));

router.post('/today/submit', requireAuth, validate(z.object({
  answers: answersSchema,
  timeTaken: z.number().optional(),
})), asyncHandler(async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const existing = prep('SELECT id FROM quiz_attempts WHERE user_id = ? AND date = ?').get(req.user!.id, today);
  if (existing) throw new ApiError(409, 'You already completed today\'s quiz', 'ALREADY_ATTEMPTED');

  const rows = prep(`SELECT * FROM quiz_questions WHERE date <= ? ORDER BY date DESC LIMIT 10`).all(today) as any[];
  let score = 0;
  const answers: any[] = [];
  for (const q of rows) {
    const selected = req.body.answers[q.id];
    if (selected === undefined) continue;
    const isCorrect = Number(selected) === q.correct_index;
    if (isCorrect) score += 1;
    answers.push({ questionId: q.id, selected, correct: isCorrect });
  }

  // Streak: consecutive days with attempts ending today
  let streak = 1;
  let cursor = new Date();
  cursor.setDate(cursor.getDate() - 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  while (true) {
    const prev = prep('SELECT id FROM quiz_attempts WHERE user_id = ? AND date = ?').get(req.user!.id, fmt(cursor));
    if (!prev) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const info = prep(
    `INSERT INTO quiz_attempts (user_id, date, score, total_questions, answers, time_taken, streak)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(req.user!.id, today, score, rows.length, JSON.stringify(answers), req.body.timeTaken || 0, streak);

  prep(`INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'quiz', ?, ?)`)
    .run(req.user!.id, 'Daily Quiz completed 🎯', `You scored ${score}/${rows.length} on today's quiz. Streak: ${streak} day${streak > 1 ? 's' : ''}!`);

  ok(res, { attemptId: Number(info.lastInsertRowid), score, total: rows.length, streak }, 201);
}));

// GET /api/quiz/previous
router.get('/previous', requireAuth, asyncHandler(async (req, res) => {
  const rows = prep(
    `SELECT qa.* FROM quiz_attempts qa WHERE qa.user_id = ? ORDER BY qa.date DESC LIMIT 30`
  ).all(req.user!.id);
  ok(res, { attempts: rows.map((r: any) => ({
    id: r.id, date: r.date, score: r.score, total: r.total_questions,
    timeTaken: r.time_taken, streak: r.streak,
  })) });
}));

// GET /api/quiz/result/:id
router.get('/result/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const a = prep('SELECT * FROM quiz_attempts WHERE id = ? AND user_id = ?').get(id, req.user!.id);
  if (!a) throw new ApiError(404, 'Result not found', 'NOT_FOUND');
  ok(res, { attempt: {
    id: a.id, date: a.date, score: a.score, total: a.total_questions,
    timeTaken: a.time_taken, streak: a.streak,
  } });
}));

// GET /api/quiz/streak
router.get('/streak', requireAuth, asyncHandler(async (req, res) => {
  const row = prep('SELECT streak FROM quiz_attempts WHERE user_id = ? ORDER BY date DESC LIMIT 1').get(req.user!.id);
  ok(res, { streak: row?.streak || 0 });
}));

// GET /api/quiz/leaderboard
router.get('/leaderboard', asyncHandler(async (_req, res) => {
  const rows = prep(
    `SELECT qa.user_id, u.name, u.avatar, COUNT(*) as quizzes, SUM(qa.score) as totalScore,
            SUM(qa.score) * 1.0 / SUM(qa.total_questions) * 100 as accuracy, MAX(qa.streak) as bestStreak
     FROM quiz_attempts qa JOIN users u ON u.id = qa.user_id
     GROUP BY qa.user_id ORDER BY totalScore DESC, accuracy DESC LIMIT 50`
  ).all();
  ok(res, { leaderboard: rows });
}));

// ------------------------- Admin: question bank --------------------------
router.get('/questions', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const rows = prep('SELECT * FROM quiz_questions ORDER BY date DESC, id DESC LIMIT 200').all();
  ok(res, { questions: rows.map((r: any) => ({
    id: r.id, questionText: r.question_text, options: parseJson(r.options, []),
    correctIndex: r.correct_index, explanation: r.explanation, category: r.category,
    date: r.date, difficulty: r.difficulty,
  })) });
}));

router.post('/questions', requireAuth, requireAdmin, validate(z.object({
  questionText: z.string().min(5),
  options: z.array(z.string()).min(4).max(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().optional(),
  category: z.string().optional(),
  date: z.string().optional(),
  difficulty: z.string().optional(),
})), asyncHandler(async (req, res) => {
  const b = req.body;
  const info = prep(
    `INSERT INTO quiz_questions (question_text, options, correct_index, explanation, category, date, difficulty)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(b.questionText, JSON.stringify(b.options), b.correctIndex, b.explanation || null,
    b.category || 'General', b.date || new Date().toISOString().slice(0, 10), b.difficulty || 'Medium');
  ok(res, { id: Number(info.lastInsertRowid) }, 201);
}));

router.delete('/questions/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const info = prep('DELETE FROM quiz_questions WHERE id = ?').run(Number(req.params.id));
  if (info.changes === 0) throw new ApiError(404, 'Question not found', 'NOT_FOUND');
  ok(res, { message: 'Question deleted' });
}));

export default router;
