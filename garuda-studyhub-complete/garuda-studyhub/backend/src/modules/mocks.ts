import { Router } from 'express';
import { z } from 'zod';
import { db, prep, parseJson } from '../db/database';
import { requireAuth, requireAdmin, validate } from '../middleware';
import { ApiError, asyncHandler, ok } from '../utils/helpers';

const router = Router();

const questionSchema = z.object({
  questionText: z.string().min(5),
  options: z.array(z.string()).min(2).max(6),
  correctIndex: z.number().int(),
  explanation: z.string().optional(),
  marks: z.number().optional(),
  negativeMarks: z.number().optional(),
  subject: z.string().optional(),
  topic: z.string().optional(),
});

const mockSchema = z.object({
  title: z.string().min(5).max(200),
  type: z.string(),
  exam: z.string().optional(),
  categoryId: z.number().optional(),
  duration: z.number().int().min(1).max(300),
  totalMarks: z.number().optional(),
  negativeMarking: z.number().optional(),
  isLive: z.boolean().optional(),
  liveDate: z.string().optional(),
  difficulty: z.string().optional(),
  instructions: z.string().optional(),
  isPublished: z.boolean().optional(),
  questions: z.array(questionSchema).optional(),
});

function mapTest(row: any, withQuestions = false) {
  const t = {
    id: row.id,
    title: row.title,
    type: row.type,
    exam: row.exam,
    categoryId: row.category_id,
    totalQuestions: row.total_questions,
    duration: row.duration,
    totalMarks: row.total_marks,
    negativeMarking: row.negative_marking,
    isLive: !!row.is_live,
    liveDate: row.live_date,
    attempts: row.attempts,
    avgScore: Math.round(row.avg_score * 100) / 100,
    difficulty: row.difficulty,
    instructions: row.instructions,
    createdAt: row.created_at,
  };
  if (!withQuestions) return t;
  const qs = prep('SELECT * FROM mock_questions WHERE test_id = ? ORDER BY sort_order').all(row.id);
  return {
    ...t,
    questions: qs.map((q) => ({
      id: q.id,
      questionText: q.question_text,
      options: parseJson(q.options, []),
      correctIndex: q.correct_index,
      explanation: q.explanation,
      marks: q.marks,
      negativeMarks: q.negative_marks,
      subject: q.subject,
      topic: q.topic,
    })),
  };
}

// GET /api/mocks
router.get('/', asyncHandler(async (req, res) => {
  const { type, exam, difficulty, search } = req.query as Record<string, string>;
  const where = ['m.is_published = 1'];
  const params: unknown[] = [];
  if (type && type !== 'All') { where.push('m.type = ?'); params.push(type); }
  if (exam) { where.push('m.exam LIKE ?'); params.push(`%${exam}%`); }
  if (difficulty && difficulty !== 'All') { where.push('m.difficulty = ?'); params.push(difficulty); }
  if (search) { where.push('m.title LIKE ?'); params.push(`%${search}%`); }
  const rows = prep(
    `SELECT m.*, c.name as category_name FROM mock_tests m LEFT JOIN categories c ON c.id = m.category_id
     WHERE ${where.join(' AND ')} ORDER BY m.created_at DESC`
  ).all(...params);
  ok(res, { mocks: rows.map((r) => mapTest(r)) });
}));

// GET /api/mocks/categories
router.get('/categories', asyncHandler(async (_req, res) => {
  const cats = prep(`SELECT c.*, (SELECT COUNT(*) FROM mock_tests m WHERE m.category_id = c.id) as count
    FROM categories c WHERE c.type = 'mock' ORDER BY c.sort_order`).all();
  ok(res, { categories: cats });
}));

// GET /api/mocks/leaderboard
router.get('/leaderboard', asyncHandler(async (req, res) => {
  const { testId } = req.query as Record<string, string>;
  const where = testId ? 'AND ms.test_id = ?' : '';
  const params: unknown[] = testId ? [Number(testId)] : [];
  const rows = prep(
    `SELECT ms.id, ms.user_id, u.name, u.avatar, ms.score, ms.accuracy, ms.ranking, ms.created_at,
            mt.title as test_title, ms.test_id
     FROM mock_sessions ms JOIN users u ON u.id = ms.user_id
     JOIN mock_tests mt ON mt.id = ms.test_id
     WHERE ms.is_completed = 1 ${where}
     ORDER BY ms.score DESC, ms.accuracy DESC LIMIT 50`
  ).all(...params);
  ok(res, { leaderboard: rows });
}));

// GET /api/mocks/analytics
router.get('/analytics', requireAuth, asyncHandler(async (req, res) => {
  const sessions = prep(
    `SELECT ms.*, mt.title, mt.exam, mt.difficulty FROM mock_sessions ms
     JOIN mock_tests mt ON mt.id = ms.test_id
     WHERE ms.user_id = ? AND ms.is_completed = 1 ORDER BY ms.created_at ASC`
  ).all(req.user!.id);
  const bySubject: Record<string, { correct: number; total: number; marks: number }> = {};
  for (const s of sessions) {
    const answers = parseJson(s.answers, []) as any[];
    for (const a of answers) {
      const q = prep('SELECT subject, marks FROM mock_questions WHERE id = ?').get(a.questionId);
      if (!q?.subject) continue;
      const key = q.subject;
      bySubject[key] = bySubject[key] || { correct: 0, total: 0, marks: 0 };
      bySubject[key].total += 1;
      bySubject[key].marks += q.marks;
      if (a.isCorrect) bySubject[key].correct += 1;
    }
  }
  const subjectWise = Object.entries(bySubject).map(([subject, v]) => ({
    subject,
    correct: v.correct,
    total: v.total,
    accuracy: Math.round((v.correct / Math.max(1, v.total)) * 100),
    marks: v.marks,
  }));
  ok(res, {
    totalTests: sessions.length,
    averageAccuracy: sessions.length
      ? Math.round((sessions.reduce((a, s) => a + s.accuracy, 0) / sessions.length) * 100) / 100
      : 0,
    bestScore: sessions.length ? Math.max(...sessions.map((s) => s.score)) : 0,
    totalTimeSeconds: sessions.reduce((a, s) => a + (s.time_taken || 0), 0),
    subjectWise,
    trend: sessions.map((s) => ({ id: s.id, title: s.title, accuracy: s.accuracy, score: s.score, date: s.created_at })),
  });
}));

// GET /api/mocks/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const row = prep('SELECT * FROM mock_tests WHERE id = ?').get(Number(req.params.id));
  if (!row) throw new ApiError(404, 'Mock test not found', 'NOT_FOUND');
  ok(res, { mock: mapTest(row, true) });
}));

// POST /api/mocks — admin create (with optional questions)
router.post('/', requireAuth, requireAdmin, validate(mockSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const qs = b.questions || [];
  const totalMarks = b.totalMarks || qs.reduce((a: number, q: any) => a + (q.marks || 1), 0);
  const info = prep(
    `INSERT INTO mock_tests (title, type, exam, category_id, total_questions, duration, total_marks,
      negative_marking, is_live, live_date, difficulty, instructions, is_published, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(b.title, b.type, b.exam || null, b.categoryId || null, qs.length, b.duration,
    totalMarks, b.negativeMarking ?? 0.25, b.isLive ? 1 : 0, b.liveDate || null,
    b.difficulty || 'Medium', b.instructions || null, b.isPublished === false ? 0 : 1, req.user!.id);
  const testId = Number(info.lastInsertRowid);
  insertQuestions(testId, qs);
  ok(res, { id: testId }, 201);
}));

function insertQuestions(testId: number, qs: any[]) {
  const stmt = prep(
    `INSERT INTO mock_questions (test_id, question_text, options, correct_index, explanation, marks, negative_marks, subject, topic, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const tx = db.transaction(() => {
    qs.forEach((q, i) => {
      stmt.run(testId, q.questionText, JSON.stringify(q.options), q.correctIndex, q.explanation || null,
        q.marks || 1, q.negativeMarks ?? 0.25, q.subject || null, q.topic || null, i);
    });
  });
  tx();
}

// PUT /api/mocks/:id
router.put('/:id', requireAuth, requireAdmin, validate(mockSchema.partial()), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = prep('SELECT * FROM mock_tests WHERE id = ?').get(id);
  if (!existing) throw new ApiError(404, 'Mock test not found', 'NOT_FOUND');
  const b = req.body;
  const updates: Record<string, unknown> = {
    title: b.title, type: b.type, exam: b.exam, category_id: b.categoryId, duration: b.duration,
    total_marks: b.totalMarks, negative_marking: b.negativeMarking,
    is_live: b.isLive === undefined ? undefined : (b.isLive ? 1 : 0), live_date: b.liveDate,
    difficulty: b.difficulty, instructions: b.instructions,
    is_published: b.isPublished === undefined ? undefined : (b.isPublished ? 1 : 0),
  };
  if (b.questions) {
    prep('DELETE FROM mock_questions WHERE test_id = ?').run(id);
    insertQuestions(id, b.questions);
    updates.total_questions = b.questions.length;
    if (!b.totalMarks) {
      updates.total_marks = b.questions.reduce((a: number, q: any) => a + (q.marks || 1), 0);
    }
  }
  const set: string[] = [];
  const vals: unknown[] = [];
  for (const [col, val] of Object.entries(updates)) {
    if (val !== undefined) { set.push(`${col} = ?`); vals.push(val); }
  }
  set.push(`updated_at = datetime('now')`);
  vals.push(id);
  prep(`UPDATE mock_tests SET ${set.join(', ')} WHERE id = ?`).run(...vals);
  ok(res, { message: 'Mock test updated' });
}));

// DELETE /api/mocks/:id
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const info = prep('DELETE FROM mock_tests WHERE id = ?').run(Number(req.params.id));
  if (info.changes === 0) throw new ApiError(404, 'Mock test not found', 'NOT_FOUND');
  ok(res, { message: 'Mock test deleted' });
}));

// POST /api/mocks/:id/start — create a session
router.post('/:id/start', requireAuth, asyncHandler(async (req, res) => {
  const testId = Number(req.params.id);
  const test = prep('SELECT * FROM mock_tests WHERE id = ? AND is_published = 1').get(testId);
  if (!test) throw new ApiError(404, 'Mock test not found', 'NOT_FOUND');
  const info = prep(`INSERT INTO mock_sessions (user_id, test_id, start_time) VALUES (?, ?, datetime('now'))`)
    .run(req.user!.id, testId);
  ok(res, { sessionId: Number(info.lastInsertRowid), startedAt: new Date().toISOString() }, 201);
}));

// POST /api/mocks/:id/submit — auto score
const answersSchema = z
  .record(z.string(), z.coerce.number().int())
  .transform((v) => Object.fromEntries(Object.entries(v).map(([k, val]) => [Number(k), val])));

router.post('/:id/submit', requireAuth, validate(z.object({
  sessionId: z.number().optional(),
  answers: answersSchema,
  timeTaken: z.number().optional(),
})), asyncHandler(async (req, res) => {
  const testId = Number(req.params.id);
  const test = prep('SELECT * FROM mock_tests WHERE id = ?').get(testId);
  if (!test) throw new ApiError(404, 'Mock test not found', 'NOT_FOUND');

  let sessionId = req.body.sessionId;
  if (sessionId) {
    const s = prep('SELECT * FROM mock_sessions WHERE id = ? AND user_id = ?').get(sessionId, req.user!.id);
    if (!s) throw new ApiError(404, 'Session not found', 'NOT_FOUND');
    if (s.is_completed) throw new ApiError(409, 'This session is already completed', 'ALREADY_SUBMITTED');
  } else {
    const info = prep(`INSERT INTO mock_sessions (user_id, test_id, start_time) VALUES (?, ?, datetime('now'))`)
      .run(req.user!.id, testId);
    sessionId = Number(info.lastInsertRowid);
  }

  const questions = prep('SELECT * FROM mock_questions WHERE test_id = ?').all(testId) as any[];
  let score = 0;
  let correct = 0;
  let incorrect = 0;
  const answerRows: any[] = [];

  for (const q of questions) {
    const selected = req.body.answers[q.id];
    if (selected === undefined || selected === null) continue;
    const isCorrect = Number(selected) === q.correct_index;
    if (isCorrect) { score += q.marks; correct += 1; }
    else { score -= q.negative_marks; incorrect += 1; }
    answerRows.push({ questionId: q.id, selected, isCorrect, timeSpent: 0 });
  }

  const unanswered = questions.length - correct - incorrect;
  const accuracy = questions.length ? Math.round((correct / questions.length) * 1000) / 10 : 0;
  const totalMarks = test.total_marks || questions.reduce((a: number, q: any) => a + q.marks, 0);
  const finalScore = Math.round(score * 100) / 100;

  const participants = (prep('SELECT COUNT(*) as c FROM mock_sessions WHERE test_id = ? AND is_completed = 1').get(testId) as { c: number }).c + 1;
  const better = (prep('SELECT COUNT(*) as c FROM mock_sessions WHERE test_id = ? AND is_completed = 1 AND score > ?').get(testId, finalScore) as { c: number }).c;
  const rank = better + 1;

  prep(
    `UPDATE mock_sessions SET is_completed = 1, end_time = datetime('now'), time_taken = ?, score = ?,
       total_marks = ?, correct = ?, incorrect = ?, unanswered = ?, accuracy = ?, ranking = ?, total_participants = ?, answers = ?
     WHERE id = ?`
  ).run(req.body.timeTaken || 0, finalScore, totalMarks, correct, incorrect, unanswered, accuracy, rank, participants,
    JSON.stringify(answerRows), sessionId);

  // Update test aggregate stats
  const agg = prep(
    `SELECT COUNT(*) as c, AVG(score) as avgScore FROM mock_sessions WHERE test_id = ? AND is_completed = 1`
  ).get(testId) as { c: number; avgScore: number };
  prep(`UPDATE mock_tests SET attempts = ?, avg_score = ? WHERE id = ?`).run(agg.c, agg.avgScore || 0, testId);

  // Update user study stats + notify
  prep(`INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'mock_result', ?, ?)`)
    .run(req.user!.id, 'Mock test completed 📊',
      `${test.title} — Score: ${finalScore}/${totalMarks}, Rank: #${rank} of ${participants}`);

  ok(res, { sessionId, score: finalScore, totalMarks, correct, incorrect, unanswered, accuracy, rank, totalParticipants: participants });
}));

// GET /api/mocks/:id/result
router.get('/:id/result', requireAuth, asyncHandler(async (req, res) => {
  const sessionId = Number(req.params.id);
  const s = prep('SELECT * FROM mock_sessions WHERE id = ? AND user_id = ?').get(sessionId, req.user!.id);
  if (!s) throw new ApiError(404, 'Result not found', 'NOT_FOUND');
  const test = prep('SELECT * FROM mock_tests WHERE id = ?').get(s.test_id);
  ok(res, {
    result: {
      id: s.id,
      testId: s.test_id,
      testTitle: test.title,
      exam: test.exam,
      score: s.score,
      totalMarks: s.total_marks,
      correct: s.correct,
      incorrect: s.incorrect,
      unanswered: s.unanswered,
      accuracy: s.accuracy,
      rank: s.ranking,
      totalParticipants: s.total_participants,
      timeTaken: s.time_taken,
      createdAt: s.created_at,
    },
  });
}));

// GET /api/mocks/:id/solutions
router.get('/:id/solutions', requireAuth, asyncHandler(async (req, res) => {
  const sessionId = Number(req.params.id);
  const s = prep('SELECT * FROM mock_sessions WHERE id = ? AND user_id = ?').get(sessionId, req.user!.id);
  if (!s) throw new ApiError(404, 'Result not found', 'NOT_FOUND');
  const questions = prep('SELECT * FROM mock_questions WHERE test_id = ? ORDER BY sort_order').all(s.test_id) as any[];
  const answers = parseJson<Record<number, number>>(s.answers as string, {});
  const solutions = questions.map((q) => ({
    id: q.id,
    questionText: q.question_text,
    options: parseJson(q.options, []),
    correctIndex: q.correct_index,
    explanation: q.explanation,
    marks: q.marks,
    subject: q.subject,
    selected: answers[q.id] ?? null,
    isCorrect: answers[q.id] !== undefined && Number(answers[q.id]) === q.correct_index,
    unanswered: answers[q.id] === undefined,
  }));
  ok(res, { solutions });
}));

export default router;
