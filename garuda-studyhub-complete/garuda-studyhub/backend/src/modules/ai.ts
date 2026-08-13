import { Router } from 'express';
import { z } from 'zod';
import { db, prep, parseJson } from '../db/database.pool';
import { requireAuth, validate } from '../middleware';
import { asyncHandler, ok } from '../utils/helpers';
import { env } from '../config/env';

const router = Router();
router.use(requireAuth);

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Offline assistant engine — curated knowledge for Indian govt exam aspirants.
// Used when OPENAI_API_KEY is not configured, so the demo works with zero setup.
// ---------------------------------------------------------------------------
const KNOWLEDGE: { keys: string[]; reply: string }[] = [
  {
    keys: ['ssc cgl', 'ssc', 'tier 1', 'tier-1', 'tier1'],
    reply:
      '**SSC CGL Preparation Guide** 📘\n\n**Tier 1 (objective, 100 Qs, 60 min):**\n• General Intelligence & Reasoning — 25 Qs\n• General Awareness — 25 Qs\n• Quantitative Aptitude — 25 Qs\n• English Comprehension — 25 Qs\n\n**Strategy:**\n1. First 2 months: complete syllabus + notes for all 4 sections\n2. Next 6-8 weeks: sectional mocks + PYQ practice (last 5 years)\n3. Final 4 weeks: full-length mocks daily, analyse every error\n\n**Key focus:** Maths speed (Vedic maths tricks), current affairs for GA, and daily English reading. Target accuracy 85%+ in mocks before the real exam.',
  },
  {
    keys: ['upsc', 'ias', 'civil service', 'prelims', 'mains'],
    reply:
      '**UPSC CSE Preparation Guide** 🏛️\n\n**Prelims:**\n• Paper 1 — GS (History, Geography, Polity, Economy, Science-Tech, Environment, Current Affairs)\n• Paper 2 — CSAT (qualifying, 33% needed)\n\n**Mains:** 9 papers (Essay, GS I-IV, Optional, 2 language papers).\n\n**Strategy:**\n1. Read NCERTs (Class 6-12) once completely — this is non-negotiable\n2. Build notes subject-wise; revise them every weekend\n3. Daily: 1 newspaper + monthly current affairs magazine\n4. Solve previous 10 years of Prelims MCQs (PYQs are gold)\n5. Start Mains answer-writing practice 4 months before Mains\n\nConsistency > intensity. Even 4-5 focused hours daily beats 10 sporadic hours.',
  },
  {
    keys: ['tspsc', 'telangana', 'group 1', 'group-1', 'group i', 'appsc', 'andhra', 'group 2', 'group-2'],
    reply:
      '**State PSC (TSPSC/APPSC) Guide** 🏢\n\n**TSPSC Group 1 / APPSC Group 2 pattern:**\n• Prelims — General Studies + Mental Ability (screening)\n• Mains — GS Paper I & II (Telangana/AP specific + Indian Constitution)\n\n**Must-cover:**\n1. State history, geography, economy & current affairs (biggest differentiator!)\n2. Indian Constitution + Polity\n3. Mental Ability / Reasoning (high-scoring)\n4. Telangana/AP specific schemes & budgets\n\n**Tip:** State PSC exams are won on state-specific current affairs. Follow the official state portal daily and practice state PYQs — they repeat topics frequently.',
  },
  {
    keys: ['ibps', 'sbi', 'banking', 'bank exam', 'po', 'clerk'],
    reply:
      '**Banking Exams (IBPS/SBI) Guide** 🏦\n\n**Common pattern (Prelims → Mains → Interview):**\n• English Language\n• Quantitative Aptitude\n• Reasoning Ability\n• (Mains adds General/Economy/Banking Awareness)\n\n**Strategy:**\n1. Data Interpretation + Arithmetic = 50% of Maths marks — master these\n2. Puzzles & Seating Arrangement decide your Reasoning score; practice daily\n3. Speed is everything: aim 25-30 Qs in 20 min in each section\n4. Learn smart calculation tricks (squares, percentages, approximations)\n5. Weekly: 2 sectional mocks + 1 full mock\n\nBanking exams reward speed + accuracy. Use mock analysis to find your slow question types.',
  },
  {
    keys: ['rrb', 'railway', 'ntpc', 'group d', 'rail'],
    reply:
      '**RRB (Railway) Exams Guide** 🚆\n\n**RRB NTPC / Group D:**\n• Mathematics (Number system, decimals, percentages, ratio, time & work, etc.)\n• General Intelligence & Reasoning\n• General Awareness (current affairs, railways, sports, static GK)\n• Group D also has Science basics\n\n**Tip:** RRB Maths is concept-based — no shortcuts, focus on basics. Negative marking is 1/3, so attempt only confident questions. Railways current affairs + sports questions appear regularly.',
  },
  {
    keys: ['police', 'defence', 'army', 'constable', 'si', 'nda'],
    reply:
      '**Police / Defence Exams Guide** 🎖️\n\n**SSC GD Constable / State Police SI / Defence:**\n• Phase 1: Computer-Based Test (Reasoning, GK, Maths, Hindi/English)\n• Phase 2: Physical Efficiency Test (PET) + Physical Standard Test (PST)\n• Phase 3: Medical\n\n**Strategy:**\n1. Clear sectional cutoffs first — GK is the highest-scoring section, prepare daily current affairs\n2. Don\'t ignore the physical test — start running/training 3 months before\n3. Maths: focus on speed (multiplication tables, percentages, averages)\n\nTip: In GD/constable exams, accuracy matters more than attempting everything.',
  },
  {
    keys: ['teaching', 'ctet', 'tet', 'teacher'],
    reply:
      '**Teaching Exams (CTET/TET) Guide** 🍎\n\n**CTET Paper structure:**\n• Paper 1: Child Development & Pedagogy, Language I & II, Maths, EVS\n• Paper 2: Child Development & Pedagogy, Language I & II, Maths & Science OR Social Studies\n\n**Scoring: 150 marks per paper, no negative marking — attempt everything!**\n\n**Strategy:**\n1. Child Development & Pedagogy is the highest-scoring subject — master the theorists (Piaget, Vygotsky, Kohlberg)\n2. Practice CTET PYQs thoroughly — questions repeat concepts\n3. Language papers need grammar + comprehension practice',
  },
  {
    keys: ['syllabus', 'subject', 'topics'],
    reply:
      '**Syllabus strategy:**\n\nPick your target exam and cover this foundation set first — it works for 90% of Indian govt exams:\n\n1. **Quant:** Number system, percentages, ratio-proportion, averages, time & work, time-speed-distance, profit & loss, SI/CI, mensuration, DI\n2. **Reasoning:** Analogy, series, coding-decoding, blood relations, direction, puzzles, seating, syllogism, inequalities\n3. **English:** Reading comprehension, cloze test, error spotting, synonyms/antonyms, para jumbles\n4. **GK/GA:** History, Geography, Polity, Economy, Science basics, Sports, Current Affairs (daily)\n\nTell me your exam and I can break the syllabus down by priority!',
  },
  {
    keys: ['routine', 'schedule', 'time table', 'timetable', 'plan', 'daily'],
    reply:
      '**A proven daily routine for working aspirants** ⏰\n\n**6:00–7:00** — Revision of yesterday\'s notes (high-yield!)\n**7:00–8:00** — Reasoning practice (fresh mind)\n**8:00–9:00** — Current affairs + newspaper\n**Evening 19:00–20:00** — Maths practice / new topic\n**20:00–21:00** — English (RC + vocabulary)\n**21:00–21:30** — GK revision\n\n**Rules:**\n• One full-length mock every Sunday, review it the same evening\n• Revise notes every day — 20 min revision beats 2 hours re-reading later\n• 6 focused hours > 12 distracted hours. Track with the AI Planner!',
  },
  {
    keys: ['motivat', 'demotivat', 'failed', 'failure', 'tired', 'stress', 'depress'],
    reply:
      '**A note for you** 💪\n\nEvery topper was once a beginner who kept showing up. Preparation is a marathon — your current rank is temporary, your practice is permanent.\n\n• Missed a day? Don\'t "reset the streak", just start today.\n• Score dropped in a mock? That mock taught you exactly what to fix — that\'s progress.\n• Compare yourself only with yesterday\'s version of you.\n\nTake a 10-minute walk, drink water, and open one topic. Showing up is 80% of the battle. You\'ve got this! 🚀',
  },
  {
    keys: ['current affair', 'current affairs', 'gk', 'general awareness', 'static'],
    reply:
      '**Current Affairs strategy** 📰\n\n• **Daily (30 min):** Read the Current Affairs hub on Garuda — 10-15 pointers daily with quiz\n• **Weekly:** Revise the weekly digest; make 1-line notes for national + state news\n• **Monthly:** Monthly compilation revision + practice monthly quiz\n\n**High-yield areas (most asked):**\n• National & state schemes (new ones)\n• Appointments, awards, sports, defence deals\n• Summits, agreements, economy & banking news\n• Science & tech launches, space missions\n\nStatic GK (History/Geography/Polity) is 60% — keep a static GK capsule and revise weekly.',
  },
  {
    keys: ['mock', 'test', 'score', 'low score', 'improve'],
    reply:
      '**How to improve mock test scores** 📊\n\nThe 3-R method:\n\n1. **Re-attempt** — solve the paper again without answer key after 2 days\n2. **Review** — categorise every wrong answer: silly error / concept gap / time pressure\n3. **Revise** — fix concept gaps within 48 hours, else they return\n\n**Quick wins:**\n• Attempt questions in 3 rounds: easy → moderate → difficult\n• Skip early if stuck > 90 seconds — marks lost on time > marks lost on difficulty\n• Track per-subject accuracy in Mock Analytics and give 2x time to weak subjects\n• Target: 5 mocks/week in the final month, 2 mocks/week otherwise',
  },
  {
    keys: ['english', 'vocab', 'grammar', 'comprehension'],
    reply:
      '**English preparation tips** 🇬🇧\n\n• **Vocabulary:** 20 new words/day from editorials; revise with spaced repetition\n• **Reading:** 1 editorial + 1 comprehension daily — improves RC speed naturally\n• **Grammar:** Master 10 core rules: tenses, subject-verb agreement, prepositions, articles, modals, conjunctions, clauses, voice, narration, parallelism\n• **For banking:** focus on cloze test + error spotting patterns\n\nTry Garuda\'s English sectional mocks for exam-style practice!',
  },
  {
    keys: ['math', 'aptitude', 'quant', 'calculation', 'speed maths'],
    reply:
      '**Quant / Aptitude speed techniques** ➗\n\n1. **Memorise:** squares (1-40), cubes (1-20), percentages ↔ fractions table\n2. **Vedic maths:** digit-sums for verification, base-100 multiplication, complements for subtraction\n3. **Approximation:** in DI, round smartly — you rarely need exact values\n4. **Practice pattern:** 20 questions of one type per day (e.g., only time & work) until 90% accuracy, then move on\n\nSmart calculation cuts 30-40% of your time. Practice with a stopwatch — speed is a skill, not a gift.',
  },
  {
    keys: ['reasoning', 'puzzle', 'logical'],
    reply:
      '**Reasoning mastery plan** 🧩\n\n• **Start with** analogy, series, coding-decoding, blood relations (quick wins)\n• **Then** syllogism + inequalities + direction sense\n• **Puzzles** (floor, seating, box): practice 3-4 daily — these decide banking/RRB scores\n• **Speed tip:** draw the puzzle frame first, then fill; write all possibilities lightly with pencil logic\n\nPuzzles improve with pattern recognition — 15 days of daily practice and they become your strongest section.',
  },
  {
    keys: ['garuda', 'platform', 'feature', 'app', 'website', 'premium'],
    reply:
      '**About Garuda AI StudyHub** 🦅\n\nGaruda is your all-in-one exam prep companion:\n\n• **Mock Tests** — full-length, sectional & topic tests with auto-scoring, analytics & leaderboard\n• **Daily Quiz** — 10 questions daily with streak tracking\n• **Materials** — notes & PDFs by exam\n• **Current Affairs** — daily, weekly & monthly digests\n• **Jobs** — latest government job notifications with deadlines & apply tracking\n• **Videos** — concept lectures by educators\n• **AI Assistant & Planner** — you\'re talking to the assistant right now!\n\nTry: Dashboard → take a mock → analyse in Mock Analytics. All modules are live with your data.',
  },
  {
    keys: ['hello', 'hi', 'hey', 'namaste', 'good morning', 'good evening'],
    reply:
      'Hello! 👋 I\'m Garuda, your AI study mentor.\n\nI can help you with:\n• Exam strategies (SSC, UPSC, TSPSC, APPSC, Banking, Railways, Police, Teaching)\n• Study routines & planning\n• Current affairs & GK tips\n• Mock test analysis & score improvement\n• Motivation when you need it\n\nWhat are you preparing for?',
  },
];

function offlineReply(message: string, userName: string): string {
  const lower = message.toLowerCase();
  for (const item of KNOWLEDGE) {
    if (item.keys.some((k) => lower.includes(k))) {
      return item.reply;
    }
  }
  // Generic fallback
  return `Great question, ${userName}! 🤔 I'm best at helping with:\n\n• **Exam strategy** — try asking "How to prepare for SSC CGL?" or "UPSC prelims strategy"\n• **Daily routine** — "Give me a study routine"\n• **Current affairs** — "How to prepare current affairs?"\n• **Mock test improvement** — "My mock scores are low"\n• **Specific subjects** — "Maths speed tricks" or "English preparation"\n\nTell me your target exam and I\'ll give you a focused plan! 🎯`;
}

async function openAiReply(messages: ChatMessage[]): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: env.openaiModel,
      messages: [
        {
          role: 'system',
          content:
            'You are Garuda AI, a friendly expert mentor for Indian government exam aspirants (SSC, UPSC, Banking, Railways, TSPSC, APPSC, Police, Defence, Teaching). Give concise, structured, practical advice. Use markdown with bold headings and bullet lists.',
        },
        ...messages.slice(-12),
      ],
      max_tokens: 700,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
  const data: any = await res.json();
  return data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
}

// POST /api/ai/chat
router.post('/chat', validate(z.object({
  message: z.string().min(1).max(4000),
  chatId: z.number().optional(),
})), asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { message, chatId } = req.body;
  const userName = req.user!.name.split(' ')[0];

  let chatRow: any;
  let messages: ChatMessage[] = [];
  if (chatId) {
    chatRow = await prep('SELECT * FROM ai_chats WHERE id = ? AND user_id = ?').get(chatId, userId);
    if (!chatRow) throw new (await import('../utils/helpers.js')).ApiError(404, 'Chat not found', 'NOT_FOUND');
    messages = parseJson<ChatMessage[]>(chatRow.messages, []);
  }

  messages.push({ role: 'user', content: message, createdAt: new Date().toISOString() });

  let reply: string;
  try {
    reply = env.openaiApiKey ? await openAiReply(messages) : offlineReply(message, userName);
  } catch (err) {
    console.error('[AI] OpenAI failed, falling back to offline engine:', err);
    reply = offlineReply(message, userName);
  }
  messages.push({ role: 'assistant', content: reply, createdAt: new Date().toISOString() });

  let id: number;
  if (chatRow) {
    await prep(`UPDATE ai_chats SET messages = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(JSON.stringify(messages), chatRow.id);
    id = chatRow.id;
  } else {
    const title = message.slice(0, 60);
    const info = await prep(`INSERT INTO ai_chats (user_id, title, messages) VALUES (?, ?, ?)`)
      .run(userId, title, JSON.stringify(messages));
    id = Number(info.lastInsertRowid || (info.insertId ?? 0));
  }

  ok(res, { chatId: id, reply });
}));

// GET /api/ai/chats
router.get('/chats', asyncHandler(async (req, res) => {
  const rows = await prep(
    `SELECT id, title, created_at, updated_at FROM ai_chats WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20`
  ).all(req.user!.id);
  ok(res, { chats: rows });
}));

// GET /api/ai/chats/:id
router.get('/chats/:id', asyncHandler(async (req, res) => {
  const row = await prep('SELECT * FROM ai_chats WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.user!.id);
  if (!row) throw new (await import('../utils/helpers.js')).ApiError(404, 'Chat not found', 'NOT_FOUND');
  ok(res, { chat: { id: row.id, title: row.title, messages: parseJson<ChatMessage[]>(row.messages, []) } });
}));

// DELETE /api/ai/chats/:id
router.delete('/chats/:id', asyncHandler(async (req, res) => {
  await prep('DELETE FROM ai_chats WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user!.id);
  ok(res, { message: 'Chat deleted' });
}));

// POST /api/ai/planner/generate
router.post('/planner/generate', validate(z.object({
  exam: z.string().min(2),
  targetDate: z.string().min(1),
  dailyHours: z.number().min(1).max(14),
  focusAreas: z.array(z.string()).optional(),
})), asyncHandler(async (req, res) => {
  const { exam, targetDate, dailyHours, focusAreas = [] } = req.body;

  // Template-based plan (offline); swap for LLM generation when a key is present.
  const daysPerWeek = 6;
  const subjects = focusAreas.length
    ? focusAreas
    : ['Quantitative Aptitude', 'Reasoning', 'English', 'General Awareness'];

  const slots = ['Morning', 'Mid-day', 'Evening'];
  const weeklySchedule = Array.from({ length: daysPerWeek }, (_, d) => {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return {
      day: dayNames[d],
      subjects: slots.map((slot, i) => ({
        name: subjects[(d + i) % subjects.length],
        hours: Math.round((dailyHours / slots.length) * 10) / 10,
        completed: false,
      })),
    };
  });

  const info = await prep(
    `INSERT INTO study_plans (user_id, title, exam, target_date, weekly_schedule) VALUES (?, ?, ?, ?, ?)`
  ).run(req.user!.id, `${exam} Preparation Plan`, exam, targetDate, JSON.stringify(weeklySchedule));

  ok(res, { planId: Number(info.lastInsertRowid || (info.insertId ?? 0)), weeklySchedule, exam, targetDate, dailyHours }, 201);
}));

// GET /api/ai/plans
router.get('/plans', asyncHandler(async (req, res) => {
  const rows = await prep(
    `SELECT * FROM study_plans WHERE user_id = ? ORDER BY is_active DESC, created_at DESC`
  ).all(req.user!.id);
  ok(res, {
    plans: rows.map((r: any) => ({
      id: r.id, title: r.title, exam: r.exam, targetDate: r.target_date,
      weeklySchedule: parseJson(r.weekly_schedule, []), progress: r.progress, isActive: !!r.is_active,
      createdAt: r.created_at,
    })),
  });
}));

// POST /api/ai/career/assess — career / exam matching engine
router.post('/career/assess', validate(z.object({
  qualification: z.string().min(2),
  interest: z.array(z.string()).min(1),
  weeklyHours: z.number().min(1).max(80),
  location: z.string().optional(),
  attemptsRemaining: z.number().optional(),
})), asyncHandler(async (req, res) => {
  const { qualification, interest, weeklyHours, location = 'All India', attemptsRemaining = 5 } = req.body;
  const q = qualification.toLowerCase();

  const scores: { exam: string; score: number; tags: string[]; reason: string; route: string }[] = [];
  const add = (exam: string, base: number, tags: string[], reason: string, route: string) =>
    scores.push({ exam, score: base, tags, reason, route });

  if (/bachelor|degree|graduate|engineering|b\.tech|bsc|ba|bcom/i.test(q) || interest.includes('government')) {
    add('SSC CGL', 92, ['Central Govt', 'Group B/C', 'Graduate'], 'Graduate-level central government posts with a predictable yearly cycle.', '/mock');
  }
  if (/12th|10\+2|intermediate|diploma|higher secondary/i.test(q)) {
    add('SSC CHSL', 88, ['12th pass', 'LDC/PA/DEO'], 'Best fit for 12th-pass aspirants targeting central government clerical posts.', '/mock');
  }
  if (interest.includes('banking') || interest.includes('finance')) {
    add('IBPS PO / SBI', 90, ['Banking', 'Public sector'], 'Structured banking career with strong growth. IBPS PO & SBI Clerk patterns align with your interest.', '/mock');
  }
  if (interest.includes('civil services') || interest.includes('administration') || interest.includes('ias')) {
    add('UPSC CSE', 89, ['IAS/IPS/IFS', 'Prestige'], 'Civil services demand deep current affairs and answer-writing — a strong long-term goal.', '/mock');
  }
  if (interest.includes('railways') || interest.includes('engineering') || interest.includes('technical')) {
    add('RRB NTPC / JE', 84, ['Railways', 'Technical'], 'Railway recruitment offers many technical and non-technical posts with frequent cycles.', '/mock');
  }
  if (location && /telangana/i.test(location)) {
    add('TSPSC Group 1', 93, ['Telangana', 'State services'], 'Telangana state services are a great fit — your location preference matches the domicile advantage.', '/mock');
  }
  if (location && /andhra|ap/i.test(location)) {
    add('APPSC Group 2', 91, ['Andhra Pradesh', 'State services'], 'Andhra Pradesh state services with strong domicile preference.', '/mock');
  }
  if (interest.includes('teaching') || /b\.ed|education/i.test(q)) {
    add('CTET / TET', 86, ['Teaching', 'Schools'], 'Teaching eligibility opens KVS/NVS and state teacher posts.', '/mock');
  }
  if (interest.includes('police') || interest.includes('defence')) {
    add('Police / Defence', 82, ['Constable', 'SI', 'Armed forces'], 'Physical fitness plus written test — matches your interest in uniformed services.', '/mock');
  }

  scores.sort((a, b) => b.score - a.score);
  const top = scores.slice(0, 3);

  // Build a study plan recommendation summary
  const plan = {
    topMatches: top,
    suggestedWeeklyHours: Math.min(weeklyHours, 14),
    nextSteps: [
      `Start with a diagnostic mock for ${top[0]?.exam || 'your target exam'} to baseline your score.`,
      'Complete one sectional test daily for your two weakest subjects.',
      'Read current affairs daily and revise notes every weekend.',
      `With ${attemptsRemaining} attempts remaining, target a mock score above the previous year cut-off before the real exam.`,
    ],
  };
  ok(res, { assessment: plan });
}));

// PUT /api/ai/planner/:id — update progress / toggle active
router.put('/planner/:id', validate(z.object({
  progress: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  completedDay: z.number().optional(),
})), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const plan = await prep('SELECT * FROM study_plans WHERE id = ? AND user_id = ?').get(id, req.user!.id);
  if (!plan) throw new (await import('../utils/helpers.js')).ApiError(404, 'Plan not found', 'NOT_FOUND');
  const schedule = parseJson<any[]>(plan.weekly_schedule, []);
  if (req.body.completedDay !== undefined && schedule[req.body.completedDay]) {
    schedule[req.body.completedDay].subjects.forEach((s: any) => (s.completed = true));
  }
  const totalSubjects = schedule.reduce((a: number, d: any) => a + d.subjects.length, 0);
  const doneSubjects = schedule.reduce((a: number, d: any) => a + d.subjects.filter((s: any) => s.completed).length, 0);
  const progress = totalSubjects ? Math.round((doneSubjects / totalSubjects) * 100) : 0;
  prep(`UPDATE study_plans SET weekly_schedule = ?, progress = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(JSON.stringify(schedule), progress, req.body.isActive === undefined ? plan.is_active : (req.body.isActive ? 1 : 0), id);
  ok(res, { planId: id, progress, weeklySchedule: schedule });
}));

export default router;

