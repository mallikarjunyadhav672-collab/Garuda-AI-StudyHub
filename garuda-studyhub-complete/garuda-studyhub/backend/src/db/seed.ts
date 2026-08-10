import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { db, initSchema } from './database';

initSchema();

function getCategoryId(slug: string): number | undefined {
  const row = db.prepare('SELECT id FROM categories WHERE slug = ? ORDER BY id LIMIT 1').get(slug) as { id?: number } | undefined;
  return row?.id != null ? Number(row.id) : undefined;
}

function ensureCategoryId(slug: string): number {
  const categoryId = getCategoryId(slug);
  if (categoryId != null) {
    return categoryId;
  }

  throw new Error(`Category slug not found: ${slug}`);
}

function hasRows(tableName: string): boolean {
  const row = db.prepare(`SELECT COUNT(*) as c FROM ${tableName}`).get() as { c?: number } | undefined;
  return Number(row?.c ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Seed all demo content. Safe to call repeatedly — skips if already seeded.
// ---------------------------------------------------------------------------
export async function seedAll() {
  const isSeeded = ['categories', 'jobs', 'materials', 'mock_tests', 'quiz_questions', 'affairs', 'videos'].every((tableName) => hasRows(tableName));
  if (isSeeded) {
    console.log('Database already seeded — skipping duplicate seed run.');
    return;
  }

  console.log('🌱 Seeding Garuda AI StudyHub...');

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
async function seedUsers() {
  const adminHash = await bcrypt.hash('Admin@123', 12);
  const userHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 12);

  const existingAdmin = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get('admin@garuda.ai') as { id: number } | undefined;
  const adminId = existingAdmin
    ? existingAdmin.id
    : Number(db.prepare(
      `INSERT INTO users (name, email, phone, password_hash, role, exam_target, is_verified, is_premium)
       VALUES (?, ?, ?, ?, 'admin', ?, 1, 1)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         phone = VALUES(phone),
         password_hash = VALUES(password_hash),
         role = VALUES(role),
         exam_target = VALUES(exam_target),
         is_verified = 1,
         is_premium = 1`
    ).run('Admin Garuda', 'admin@garuda.ai', '9000011111', adminHash, 'SSC CGL').lastInsertRowid);

  const others = [
    ['Rahul Sharma', 'rahul@test.in', '9000033333', 'UPSC CSE'],
    ['Priya Patel', 'priya@test.in', '9000044444', 'IBPS PO'],
    ['Suresh Kumar', 'suresh@test.in', '9000055555', 'RRB NTPC'],
    ['Anjali Reddy', 'anjali@test.in', '9000066666', 'TSPSC Group 1'],
    ['Vikram Singh', 'vikram@test.in', '9000077777', 'SSC CGL'],
    ['Kavitha Rao', 'kavitha@test.in', '9000088888', 'APPSC Group 2'],
    ['Manoj Gupta', 'manoj@test.in', '9000099999', 'Banking'],
  ];
  const stmt = db.prepare(`
    INSERT INTO users (name, email, phone, password_hash, exam_target, is_verified)
    VALUES (?, ?, ?, ?, ?, 1)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      phone = VALUES(phone),
      password_hash = VALUES(password_hash),
      exam_target = VALUES(exam_target),
      is_verified = 1
  `);
  for (const [name, email, phone, exam] of others) {
    const existing = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(email) as { id: number } | undefined;
    if (existing) continue;
    stmt.run(name, email, phone, userHash, exam);
  }

  db.prepare(`INSERT IGNORE INTO user_preferences (user_id) VALUES (?)`).run(adminId);
  return { adminId };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
function seedCategories() {
  const cats: [string, string, string, string, string][] = [
    // [name, slug, type, description, icon]
    ['SSC', 'ssc', 'job', 'Staff Selection Commission exams', 'briefcase'],
    ['Banking', 'banking', 'job', 'IBPS, SBI & RBI exams', 'landmark'],
    ['Railways', 'railways', 'job', 'RRB recruitment exams', 'train'],
    ['State PSC', 'state-psc', 'job', 'TSPSC, APPSC & state services', 'building'],
    ['Police & Defence', 'police-defence', 'job', 'Police, Army & paramilitary', 'shield'],
    ['Teaching', 'teaching', 'job', 'CTET, TET & teacher recruitment', 'graduation-cap'],
    ['UPSC', 'upsc', 'job', 'Civil services & central services', 'scroll'],
    
    ['Quantitative Aptitude', 'quant', 'material', 'Maths & numerical ability', 'calculator'],
    ['Reasoning', 'reasoning', 'material', 'Logical & analytical reasoning', 'brain'],
    ['English', 'english', 'material', 'English language & comprehension', 'book-open'],
    ['General Awareness', 'general-awareness', 'material', 'GK, current affairs & static knowledge', 'newspaper'],
    
    ['Full Length', 'full-length', 'mock', 'Complete exam pattern mocks', 'timer'],
    ['Sectional', 'sectional', 'mock', 'Section-wise practice tests', 'layers'],
    ['Topic', 'topic', 'mock', 'Topic-specific mini tests', 'target'],
    
    ['National', 'national', 'affair', 'National current affairs', 'flag'],
    ['International', 'international', 'affair', 'World current affairs', 'globe'],
    ['Economy', 'economy', 'affair', 'Economy & banking news', 'trending-up'],
    ['Sports', 'sports', 'affair', 'Sports news & awards', 'trophy'],
    ['Science & Tech', 'science-tech', 'affair', 'Science, tech & space', 'rocket'],
    
    ['Concept Lectures', 'concept-lectures', 'video', 'Subject concept videos', 'play'],
    ['Current Affairs', 'affairs-videos', 'video', 'Daily news analysis videos', 'radio'],
    ['Mock Analysis', 'mock-analysis', 'video', 'Mock test discussion videos', 'bar-chart'],
  ];
  const selectStmt = db.prepare('SELECT id FROM categories WHERE slug = ? ORDER BY id');
  const insertStmt = db.prepare(`INSERT INTO categories (name, slug, type, description, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)`);
  const updateStmt = db.prepare(`UPDATE categories SET name = ?, type = ?, description = ?, icon = ?, sort_order = ? WHERE id = ?`);

  cats.forEach((c, i) => {
    const [name, slug, type, description, icon] = c;
    const existingRows = selectStmt.all(slug) as Array<{ id: number }>;
    const targetId = existingRows[0]?.id;

    if (existingRows.length > 1 && targetId != null) {
      db.prepare('DELETE FROM categories WHERE slug = ? AND id <> ?').run(slug, targetId);
    }

    if (targetId != null) {
      updateStmt.run(name, type, description, icon, i, targetId);
    } else {
      insertStmt.run(name, slug, type, description, icon, i);
    }
  });
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------
function seedJobs(adminId: number) {
  const jobs = [
    {
      org: 'SSC', role: 'Combined Graduate Level (CGL) 2025', exam: 'SSC CGL', posts: 17727,
      lastDate: '2026-08-15', qualification: 'Bachelor\'s Degree in any discipline', location: 'All India',
      salary: '₹25,500 – ₹1,51,100 (Pay Level 4-8)', category: 'ssc', department: 'Staff Selection Commission',
      state: 'All India', jobType: 'Permanent', status: 'Active', featured: 1, trend: 1,
      ageLimit: '18-32 years (relaxation as per rules)', applicationFee: '₹100 (Women/SC/ST/PwD: Exempt)',
      selectionProcess: ['Tier-1: Computer Based Test', 'Tier-2: Computer Based Test (Paper 1 & 2)', 'Document Verification', 'Medical Examination (as applicable)'],
      eligibility: ['Bachelor\'s Degree in any discipline', 'Age 18-32 years', 'Final year students can apply'],
      description: 'SSC CGL is one of the most popular exams for Group B & C posts in Government of India ministries, departments and organisations. Posts include Assistant Section Officer, Inspector (Income Tax/Central Excise/CBDT), Assistant Auditor, Accountant, Statistical Investigator and more.',
      noticeUrl: 'https://ssc.gov.in',
    },
    {
      org: 'SSC', role: 'Combined Higher Secondary Level (CHSL)', exam: 'SSC CHSL', posts: 3712,
      lastDate: '2026-08-20', qualification: '12th Pass (Matriculation + 10+2)', location: 'All India',
      salary: '₹25,500 – ₹81,100 (Pay Level 2-4)', category: 'ssc', department: 'Staff Selection Commission',
      state: 'All India', jobType: 'Permanent', status: 'Active', featured: 1, trend: 0,
      ageLimit: '18-27 years', applicationFee: '₹100 (Exemptions as per rules)',
      selectionProcess: ['Tier-1: Computer Based Test', 'Tier-2: Descriptive Test (Essay/Letter)', 'Document Verification'],
      eligibility: ['10+2 pass from recognised board', 'Age 18-27 years'],
      description: 'SSC CHSL recruits Lower Division Clerk (LDC), Junior Secretariat Assistant (JSA), Postal Assistant (PA), Sorting Assistant (SA) and Data Entry Operator (DEO) in various central government departments.',
      noticeUrl: 'https://ssc.gov.in',
    },
    {
      org: 'IBPS', role: 'Probationary Officer (PO/MT) 2026', exam: 'IBPS PO', posts: 4455,
      lastDate: '2026-08-28', qualification: 'Graduate in any discipline', location: 'All India',
      salary: '₹52,000 – ₹65,000 per month (approx.)', category: 'banking', department: 'Institute of Banking Personnel Selection',
      state: 'All India', jobType: 'Permanent', status: 'Active', featured: 1, trend: 1,
      ageLimit: '20-30 years', applicationFee: '₹850 (SC/ST/PwD: ₹175)',
      selectionProcess: ['Prelims: Online Objective Test', 'Mains: Online Objective + Descriptive', 'Interview', 'Provisional Allotment'],
      eligibility: ['Graduate in any discipline', 'Age 20-30 years', 'Computer literacy required'],
      description: 'IBPS PO recruits Probationary Officers in 11 participating public sector banks including Bank of Baroda, Canara Bank, PNB, Union Bank and Indian Bank. It is one of the most sought-after banking exams with excellent career growth.',
      noticeUrl: 'https://ibps.in',
    },
    {
      org: 'SBI', role: 'Clerk (Junior Associate) 2026', exam: 'SBI Clerk', posts: 13240,
      lastDate: '2026-09-05', qualification: 'Graduate in any discipline', location: 'All India',
      salary: '₹26,000 – ₹32,000 per month (approx.)', category: 'banking', department: 'State Bank of India',
      state: 'All India', jobType: 'Permanent', status: 'Active', featured: 0, trend: 1,
      ageLimit: '20-28 years', applicationFee: '₹750 (SC/ST/PwD: Nil)',
      selectionProcess: ['Prelims: Online Objective Test', 'Mains: Online Objective Test', 'No Interview'],
      eligibility: ['Graduate in any discipline', 'Age 20-28 years', 'Knowledge of local language preferred'],
      description: 'SBI Clerk (Junior Associate) is the entry-level clerical post in State Bank of India with vacancies across all circles. The exam is conducted in two phases — Prelims and Mains.',
      noticeUrl: 'https://sbi.co.in',
    },
    {
      org: 'RRB', role: 'NTPC Graduate & Undergraduate Posts', exam: 'RRB NTPC', posts: 11558,
      lastDate: '2026-08-18', qualification: 'Graduate / 12th pass as per post', location: 'All India',
      salary: '₹19,900 – ₹47,600 (Level 2-7)', category: 'railways', department: 'Railway Recruitment Board',
      state: 'All India', jobType: 'Permanent', status: 'Active', featured: 1, trend: 1,
      ageLimit: '18-33 years', applicationFee: '₹500 (SC/ST/PwD/Female/Transgender: ₹250)',
      selectionProcess: ['CBT Stage 1', 'CBT Stage 2', 'Typing Skill Test (for certain posts)', 'Document Verification', 'Medical Examination'],
      eligibility: ['Graduate for NTPC Graduate posts', '12th pass for Undergraduate posts', 'Age 18-33 years'],
      description: 'RRB NTPC recruits for Non-Technical Popular Categories including Station Master, Goods Guard, Senior Clerk cum Typist, Junior Account Assistant, Trains Clerk and Commercial cum Ticket Clerk across Indian Railways zones.',
      noticeUrl: 'https://rrbcdg.gov.in',
    },
    {
      org: 'TSPSC', role: 'Group-1 Services 2026', exam: 'TSPSC Group 1', posts: 563,
      lastDate: '2026-08-30', qualification: 'Bachelor\'s Degree', location: 'Telangana',
      salary: '₹41,540 – ₹1,40,870 (per month)', category: 'state-psc', department: 'Telangana State Public Service Commission',
      state: 'Telangana', jobType: 'Permanent', status: 'Active', featured: 1, trend: 0,
      ageLimit: '18-44 years', applicationFee: '₹320 (exemptions apply)',
      selectionProcess: ['Prelims: GS + Mental Ability', 'Mains: GS Paper I & II + English', 'Interview'],
      eligibility: ['Bachelor\'s Degree from recognised university', 'Age 18-44 years', 'Must know Telugu'],
      description: 'TSPSC Group-1 recruits for gazetted officer posts including Deputy Collector, DSP, Commercial Tax Officer, District Registrar, Municipal Commissioner and other top state services in Telangana.',
      noticeUrl: 'https://tspsc.gov.in',
    },
    {
      org: 'APPSC', role: 'Group-2 Services', exam: 'APPSC Group 2', posts: 897,
      lastDate: '2026-08-25', qualification: 'Bachelor\'s Degree', location: 'Andhra Pradesh',
      salary: '₹35,120 – ₹87,130 (per month)', category: 'state-psc', department: 'Andhra Pradesh Public Service Commission',
      state: 'Andhra Pradesh', jobType: 'Permanent', status: 'Active', featured: 0, trend: 0,
      ageLimit: '18-42 years', applicationFee: '₹500 (exemptions apply)',
      selectionProcess: ['Prelims: Screening Test', 'Mains: GS Paper I & II', 'Interview'],
      eligibility: ['Bachelor\'s Degree', 'Age 18-42 years'],
      description: 'APPSC Group-2 recruitment for Executive and Non-Executive posts in Andhra Pradesh state government departments including Deputy Tahsildar, Senior Accountant, Extension Officer and more.',
      noticeUrl: 'https://psc.ap.gov.in',
    },
    {
      org: 'UPSC', role: 'Civil Services Examination (CSE) 2026', exam: 'UPSC CSE', posts: 1056,
      lastDate: '2026-09-12', qualification: 'Bachelor\'s Degree', location: 'All India',
      salary: '₹56,100 – ₹2,50,000 (Cabinet Secretary level)', category: 'upsc', department: 'Union Public Service Commission',
      state: 'All India', jobType: 'Permanent', status: 'Active', featured: 1, trend: 1,
      ageLimit: '21-32 years (relaxations apply)', applicationFee: '₹100 (Women/SC/ST/PwD: Exempt)',
      selectionProcess: ['Prelims: GS + CSAT', 'Mains: 9 Descriptive Papers', 'Personality Test (Interview)'],
      eligibility: ['Bachelor\'s Degree', 'Age 21-32 years', 'Age relaxation for reserved categories'],
      description: 'UPSC CSE is the gateway to IAS, IPS, IFS and Central Services. It is conducted in three stages — Preliminary, Mains and Interview — over roughly a year.',
      noticeUrl: 'https://upsc.gov.in',
    },
    {
      org: 'Delhi Police', role: 'Constable (Executive) 2026', exam: 'Police', posts: 7547,
      lastDate: '2026-08-22', qualification: '10+2 (Matriculation + 12th)', location: 'Delhi NCR',
      salary: '₹21,700 – ₹69,100 (per month)', category: 'police-defence', department: 'Delhi Police',
      state: 'Delhi', jobType: 'Permanent', status: 'Active', featured: 0, trend: 1,
      ageLimit: '18-25 years', applicationFee: '₹100 (SC/ST/Female: Exempt)',
      selectionProcess: ['Computer Based Test (CBT)', 'Physical Endurance Test (PET)', 'Physical Standard Test (PST)', 'Medical Examination'],
      eligibility: ['10+2 pass', 'Age 18-25 years', 'Physical standards: Male 170cm, Female 157cm'],
      description: 'Delhi Police Constable (Executive) recruitment is conducted for the Delhi Police force. The selection includes a computer-based test followed by physical tests.',
      noticeUrl: 'https://delhipolice.nic.in',
    },
    {
      org: 'CBSE', role: 'CTET February 2026', exam: 'CTET', posts: 0,
      lastDate: '2026-08-27', qualification: 'Graduation + B.Ed / D.El.Ed', location: 'All India',
      salary: '₹35,000 – ₹45,000 (as per school/state)', category: 'teaching', department: 'Central Board of Secondary Education',
      state: 'All India', jobType: 'Permanent', status: 'Active', featured: 0, trend: 0,
      ageLimit: 'No upper age limit', applicationFee: '₹1,000 (Paper I or II), ₹1,400 (Both)',
      selectionProcess: ['Computer Based Test', 'Score valid for 7 years', 'Qualifies for teacher eligibility'],
      eligibility: ['Graduate + B.Ed for Paper II', 'Senior Secondary + D.El.Ed for Paper I', 'No age limit'],
      description: 'CTET is a qualifying exam for teaching posts in central government schools (KVS, NVS, Army schools) and is accepted by most state governments for teacher recruitment.',
      noticeUrl: 'https://ctet.nic.in',
    },
    {
      org: 'SSC', role: 'Junior Engineer (Civil/Electrical/Mechanical)', exam: 'SSC JE', posts: 968,
      lastDate: '2026-09-08', qualification: 'Diploma/Degree in Engineering', location: 'All India',
      salary: '₹35,400 – ₹1,12,400', category: 'ssc', department: 'Staff Selection Commission',
      state: 'All India', jobType: 'Permanent', status: 'Active', featured: 0, trend: 0,
      ageLimit: '18-32 years', applicationFee: '₹100 (exemptions apply)',
      selectionProcess: ['Paper 1: CBT (Objective)', 'Paper 2: CBT (Conventional)', 'Document Verification'],
      eligibility: ['Diploma/Degree in relevant Engineering branch', 'Age 18-32 years'],
      description: 'SSC JE recruits Junior Engineers for CPWD, MES, CWC, and other central government organisations.',
      noticeUrl: 'https://ssc.gov.in',
    },
    {
      org: 'RBI', role: 'Grade B Officer (General) 2026', exam: 'RBI Grade B', posts: 94,
      lastDate: '2026-09-01', qualification: 'Graduate with 60% (55% for SC/ST)', location: 'All India',
      salary: '₹55,200 – ₹1,10,000 (per month)', category: 'banking', department: 'Reserve Bank of India',
      state: 'All India', jobType: 'Permanent', status: 'Active', featured: 0, trend: 0,
      ageLimit: '21-30 years', applicationFee: '₹850 (SC/ST/PwD: ₹100)',
      selectionProcess: ['Phase 1: Objective (GA, Reasoning, Quant, English)', 'Phase 2: ESI + Finance (Descriptive + MCQ)', 'Interview'],
      eligibility: ['Graduate with 60% marks', 'Age 21-30 years', 'General & Finance knowledge preferred'],
      description: 'RBI Grade B is the most prestigious central banking exam. Officers manage monetary policy, financial regulation and currency management for India\'s central bank.',
      noticeUrl: 'https://rbi.org.in',
    },
  ];

  const stmt = db.prepare(
    `INSERT INTO jobs (org, role, exam, posts, last_date, qualification, location, salary, category_id,
      department, state, job_type, status, featured, trend, age_limit, application_fee, selection_process,
      eligibility, description, notice_url, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const j of jobs) {
    const categoryId = ensureCategoryId(j.category);
    stmt.run(j.org, j.role, j.exam, j.posts, j.lastDate, j.qualification, j.location, j.salary,
      categoryId, j.department, j.state, j.jobType, j.status, j.featured, j.trend, j.ageLimit,
      j.applicationFee, JSON.stringify(j.selectionProcess), JSON.stringify(j.eligibility),
      j.description, j.noticeUrl, adminId);
  }
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------
function seedMaterials(adminId: number) {
  const mats = [
    ['SSC CGL Tier-1 Complete Syllabus & Strategy Notes', 'Comprehensive syllabus breakdown with topic-wise weightage and a 90-day strategy for SSC CGL Tier-1. Includes study plan and book recommendations.', 'quant', 'SSC CGL', 142, 8.4, 'pdf', ['syllabus', 'strategy', 'ssc']],
    ['Quantitative Aptitude Formula Handbook', 'All formulas for percentage, profit & loss, time & work, SI/CI, mensuration, algebra and more — with 500+ solved examples and practice sets.', 'quant', 'All Exams', 268, 18.2, 'pdf', ['maths', 'formulas', 'aptitude']],
    ['Reasoning Mastery: Puzzles & Seating Arrangement', 'Step-by-step approach to floor puzzles, seating arrangement, box puzzles and blood relations with 300 practice questions of varied difficulty.', 'reasoning', 'Banking / SSC', 196, 12.7, 'pdf', ['reasoning', 'puzzles', 'banking']],
    ['English Grammar & Vocabulary Capsule', 'Core grammar rules, error-spotting patterns, 500 high-frequency words with mnemonics, and reading comprehension practice passages.', 'english', 'All Exams', 158, 10.1, 'pdf', ['english', 'grammar', 'vocabulary']],
    ['General Awareness: Static GK Complete Notes', 'Indian history, geography, polity, economy and science basics in crisp one-liners — perfect for last-minute revision.', 'general-awareness', 'SSC / Railways', 310, 21.5, 'pdf', ['gk', 'static', 'general-awareness']],
    ['TSPSC Group-1 Telangana History & Culture Guide', 'Complete Telangana history from Satavahanas to state formation, culture, movements and current affairs specific to TSPSC exams.', 'general-awareness', 'TSPSC Group 1', 224, 15.9, 'pdf', ['tspsc', 'telangana', 'history']],
    ['Banking Awareness: Economy & Financial Terms', 'RBI, banking regulation, monetary policy, financial inclusion schemes and 400+ banking terms explained simply for IBPS/SBI aspirants.', 'general-awareness', 'Banking', 178, 11.3, 'pdf', ['banking', 'economy', 'rbi']],
    ['UPSC Prelims CSAT: Mental Ability Workbook', 'Quantitative reasoning, logical reasoning and comprehension practice sets with detailed solutions for the UPSC CSAT paper.', 'reasoning', 'UPSC CSE', 240, 16.8, 'pdf', ['upsc', 'csat', 'mental-ability']],
  ];
  const stmt = db.prepare(
    `INSERT INTO materials (title, description, category_id, exam, pages, file_size, file_type, tags, uploaded_by, downloads, rating, rating_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  mats.forEach((m, i) => {
    const categoryId = ensureCategoryId(String(m[2]));
    stmt.run(m[0], m[1], categoryId, m[3], m[4], (Number(m[5])) * 1024 * 1024, m[6], JSON.stringify(m[7]), adminId, 1200 - i * 130, 4.5 + (i % 4) * 0.1, 200 + i * 30);
  });
}

// ---------------------------------------------------------------------------
// Mock tests + questions
// ---------------------------------------------------------------------------
function seedMocks(adminId: number) {
  const q = (text: string, options: string[], correct: number, expl: string, subject: string, marks = 1, neg = 0.25) =>
    ({ questionText: text, options, correctIndex: correct, explanation: expl, subject, marks, negativeMarks: neg });

  const tests: any[] = [
    {
      title: 'SSC CGL Tier-1 Full Length Mock #1', type: 'Full length', exam: 'SSC CGL', category: 'full-length',
      duration: 60, negativeMarking: 0.5, difficulty: 'Medium', isLive: 0,
      instructions: 'This mock follows the actual SSC CGL Tier-1 pattern: 100 questions in 60 minutes (25 each of Reasoning, GA, Quant, English). Attempt all questions; negative marking of 0.50 per wrong answer.',
      questions: [
        q('If A is 25% more than B, then B is what percent less than A?', ['15%', '20%', '25%', '16.66%'], 1, 'B = 100, A = 125 → difference 25/125 × 100 = 20%', 'Quant'),
        q('A train 180 m long crosses a platform of length 220 m in 20 seconds. Find the speed of the train (km/h).', ['36 km/h', '54 km/h', '72 km/h', '90 km/h'], 2, 'Total distance = 180+220 = 400 m in 20s → 20 m/s → 72 km/h', 'Quant'),
        q('The average of 11 numbers is 40. If one number is removed, the average becomes 38. Which number was removed?', ['40', '60', '56', '58'], 1, 'Sum of 11 numbers = 440, sum of 10 = 380 → removed number = 440 − 380 = 60.', 'Quant'),
        q('What is the compound interest on ₹10,000 at 10% p.a. for 2 years, compounded annually?', ['₹2,000', '₹2,100', '₹2,200', '₹1,900'], 1, 'A = 10000(1.1)² = 12100 → CI = 2100', 'Quant'),
        q('In a certain code, RAIN is written as SBJO. How is CLOUD written in that code?', ['DMPVE', 'DMPWE', 'DMPUF', 'DMQVE'], 0, 'Each letter +1: C→D, L→M, O→P, U→V, D→E', 'Reasoning'),
        q('Statements: All pens are pencils. Some pencils are erasers. Conclusions: I. Some pens are erasers. II. Some erasers are pencils.', ['Only I follows', 'Only II follows', 'Both follow', 'Neither follows'], 1, 'All pens are pencils; some pencils are erasers — no direct link between pens and erasers. II directly follows.', 'Reasoning'),
        q('Pointing to a photograph, Ram said "She is the daughter of my grandfather\'s only son". How is the girl related to Ram?', ['Sister', 'Cousin', 'Niece', 'Mother'], 0, 'Grandfather\'s only son = Ram\'s father. His daughter = Ram\'s sister.', 'Reasoning'),
        q('Find the missing number: 2, 6, 12, 20, 30, ?', ['36', '40', '42', '44'], 2, 'Pattern: n(n+1): 1×2, 2×3, 3×4, 4×5, 5×6 → 6×7 = 42', 'Reasoning'),
        q('Select the synonym of "ABUNDANT".', ['Scarce', 'Plentiful', 'Rare', 'Sparse'], 1, 'Abundant means existing in large quantities — plentiful.', 'English'),
        q('Choose the correctly spelt word:', ['Accomodation', 'Acommodation', 'Accommodation', 'Accomadation'], 2, 'Accommodation has double c and double m.', 'English'),
        q('Fill in the blank: Neither the manager nor his assistants ___ present at the meeting.', ['was', 'were', 'is', 'has'], 1, 'With "neither...nor", verb agrees with the nearer subject (assistants) → were.', 'English'),
        q('Who is known as the "Father of the Indian Constitution"?', ['Jawaharlal Nehru', 'B.R. Ambedkar', 'Sardar Patel', 'Rajendra Prasad'], 1, 'Dr. B.R. Ambedkar chaired the Drafting Committee of the Constituent Assembly.', 'GA'),
        q('The Gateway of India is located in which city?', ['Delhi', 'Kolkata', 'Mumbai', 'Chennai'], 2, 'The Gateway of India is a famous arch-monument in Mumbai, built in 1924.', 'GA'),
        q('Which planet is known as the "Red Planet"?', ['Venus', 'Jupiter', 'Mars', 'Saturn'], 2, 'Mars appears red due to iron oxide (rust) on its surface.', 'GA'),
        q('The Indian Rupee symbol ₹ was designed by:', ['D. Udaya Kumar', 'R. K. Joshi', 'N. R. Narayana Murthy', 'A. P. J. Abdul Kalam'], 0, 'Udaya Kumar designed the ₹ symbol, adopted in 2010.', 'GA'),
      ],
    },
    {
      title: 'Quantitative Aptitude Sectional Test', type: 'Sectional', exam: 'All Exams', category: 'sectional',
      duration: 20, negativeMarking: 0.25, difficulty: 'Easy', isLive: 0,
      instructions: 'A 20-minute sectional test covering arithmetic and advanced maths. Negative marking 0.25.',
      questions: [
        q('What is 15% of 240?', ['34', '36', '38', '42'], 1, '240 × 0.15 = 36', 'Quant'),
        q('If the ratio of boys to girls is 3:2 and there are 60 students, how many girls are there?', ['20', '24', '30', '36'], 1, 'Girls = 2/5 × 60 = 24', 'Quant'),
        q('A shopkeeper buys an item for ₹500 and sells it for ₹650. What is the profit percentage?', ['25%', '28%', '30%', '32%'], 2, 'Profit = 150/500 × 100 = 30%', 'Quant'),
        q('The LCM of 12, 15 and 20 is:', ['60', '90', '120', '180'], 0, '12=2²×3, 15=3×5, 20=2²×5 → LCM = 2²×3×5 = 60', 'Quant'),
        q('A man can do a piece of work in 10 days. How much work does he do in 3 days?', ['1/10', '3/10', '7/10', '1/3'], 1, 'Daily work = 1/10 → 3 days = 3/10', 'Quant'),
        q('Find the simple interest on ₹8,000 at 8% p.a. for 3 years.', ['₹1,920', '₹1,800', '₹2,000', '₹1,950'], 0, 'SI = 8000 × 8 × 3 / 100 = ₹1,920', 'Quant'),
        q('What is the square root of 2025?', ['35', '45', '55', '65'], 1, '45 × 45 = 2025', 'Quant'),
        q('If x + y = 12 and xy = 32, find x² + y².', ['80', '72', '96', '64'], 0, 'x²+y² = (x+y)² - 2xy = 144 - 64 = 80', 'Quant'),
      ],
    },
    {
      title: 'Reasoning Sectional Test', type: 'Sectional', exam: 'All Exams', category: 'sectional',
      duration: 20, negativeMarking: 0.25, difficulty: 'Medium', isLive: 0,
      instructions: '20-minute reasoning sectional: series, coding, syllogisms, puzzles and blood relations.',
      questions: [
        q('Complete the series: 3, 8, 15, 24, ?', ['35', '33', '36', '37'], 0, 'Differences: 5, 7, 9 → next +11 = 35', 'Reasoning'),
        q('If CAT = 3120 and DOG = 4157, then BIRD = ?', ['29184', '21894', '28194', '21984'], 0, 'Letters mapped: C=3,A=1,T=20; D=4,O=15,G=7 → B=2,I=9,R=18,D=4 → 29184', 'Reasoning'),
        q('All roses are flowers. Some flowers are red. Which conclusion is definitely true?', ['All red things are roses', 'Some roses are red', 'Some flowers are roses', 'All flowers are roses'], 2, 'All roses are flowers → some flowers are roses.', 'Reasoning'),
        q('If North becomes West, what does South become?', ['North', 'East', 'West', 'South'], 1, 'Rotating directions 90° clockwise: South → West... wait, North→West is 90° anticlockwise: South → East.', 'Reasoning'),
        q('A man walks 5 km north, turns right and walks 3 km, then turns right again and walks 5 km. How far is he from the start?', ['2 km', '3 km', '5 km', '8 km'], 1, 'Ends 3 km east of start → 3 km.', 'Reasoning'),
        q('Which number will come next: 2, 3, 5, 9, 17, ?', ['31', '33', '35', '29'], 1, 'Pattern: ×2-1: 2→3→5→9→17→33', 'Reasoning'),
        q('In a row of students, Ravi is 12th from the left and 9th from the right. How many students are in the row?', ['19', '20', '21', '22'], 1, 'Total = 12 + 9 - 1 = 20', 'Reasoning'),
        q('Milk is to Cow as Wool is to ___?', ['Cotton', 'Sheep', 'Goat', 'Silk'], 1, 'Milk comes from a cow; wool comes from a sheep.', 'Reasoning'),
      ],
    },
    {
      title: 'English Comprehension Sectional', type: 'Sectional', exam: 'All Exams', category: 'sectional',
      duration: 15, negativeMarking: 0.25, difficulty: 'Medium', isLive: 0,
      instructions: '15-minute English sectional covering grammar, vocabulary, spelling and comprehension.',
      questions: [
        q('Choose the antonym of "TRANQUIL".', ['Calm', 'Agitated', 'Peaceful', 'Quiet'], 1, 'Tranquil means calm/peaceful; agitated is the opposite.', 'English'),
        q('One-word substitution: "A person who speaks many languages"', ['Polyglot', 'Linguist', 'Orator', 'Grammarian'], 0, 'Polyglot = one who knows/speaks many languages.', 'English'),
        q('Choose the correct sentence:', ['He do not like tea.', 'He does not likes tea.', 'He does not like tea.', 'He did not likes tea.'], 2, 'Simple present negative with "he" uses "does not + base verb".', 'English'),
        q('Fill: The committee ___ divided on the issue.', ['is', 'are', 'has', 'were'], 0, 'Committee acts as a single unit here → singular verb "is".', 'English'),
        q('Spot the error: "One of my friend (A) / has gone (B) / to the United States (C)."', ['A', 'B', 'C', 'No error'], 0, '"One of" takes a plural noun: "one of my friends".', 'English'),
        q('Idiom: "To burn the midnight oil" means:', ['To waste time', 'To work late into the night', 'To cook at night', 'To start a fire'], 1, 'The idiom means working/studying late at night.', 'English'),
      ],
    },
    {
      title: 'General Awareness Sectional', type: 'Sectional', exam: 'SSC / Railways', category: 'sectional',
      duration: 15, negativeMarking: 0.25, difficulty: 'Medium', isLive: 0,
      instructions: '15-minute General Awareness sectional — history, geography, polity, economy, science & sports.',
      questions: [
        q('Who was the first President of India?', ['Mahatma Gandhi', 'Rajendra Prasad', 'Jawaharlal Nehru', 'S. Radhakrishnan'], 1, 'Dr. Rajendra Prasad was the first President (1950-1962).', 'GA'),
        q('The Chandrayaan-3 mission landed near which lunar region?', ['Tycho crater', 'South Pole', 'Mare Imbrium', 'North Pole'], 1, 'Chandrayaan-3 landed near the lunar South Pole on 23 Aug 2023.', 'GA'),
        q('Which river is known as the "Ganga of the South"?', ['Godavari', 'Krishna', 'Kaveri', 'Narmada'], 2, 'Kaveri is called the Ganga of the South.', 'GA'),
        q('The 2023 ICC Cricket World Cup was hosted by:', ['Australia', 'England', 'India', 'South Africa'], 2, 'The 2023 World Cup was hosted by India.', 'GA'),
        q('Article 21 of the Indian Constitution deals with:', ['Right to Equality', 'Right to Freedom', 'Right to Life & Personal Liberty', 'Right against Exploitation'], 2, 'Article 21 guarantees protection of life and personal liberty.', 'GA'),
        q('Which institution is known as the "lender of last resort"?', ['SBI', 'NABARD', 'RBI', 'SEBI'], 2, 'RBI acts as lender of last resort for banks.', 'GA'),
        q('The National Anthem "Jana Gana Mana" was written by:', ['Subhash Chandra Bose', 'Rabindranath Tagore', 'Bankim Chandra Chatterjee', 'Sarojini Naidu'], 1, 'Tagore wrote Jana Gana Mana (1911); adopted as National Anthem in 1950.', 'GA'),
        q('Which state has the longest coastline in India?', ['Maharashtra', 'Tamil Nadu', 'Andhra Pradesh', 'Gujarat'], 3, 'Gujarat has the longest coastline (~1,600 km).', 'GA'),
      ],
    },
    {
      title: 'TSPSC Group-1 Prelims Simulator', type: 'Full length', exam: 'TSPSC Group 1', category: 'full-length',
      duration: 45, negativeMarking: 0.33, difficulty: 'Hard', isLive: 1,
      instructions: 'Simulates the TSPSC Group-1 Prelims pattern. Focus areas: Telangana history, Indian polity and mental ability.',
      questions: [
        q('The Kakatiya dynasty ruled from which capital city?', ['Warangal', 'Hyderabad', 'Nizamabad', 'Karimnagar'], 0, 'Kakatiyas ruled from Orugallu (Warangal), 12th-14th century.', 'Telangana History'),
        q('Telangana was formed as the 29th state of India on:', ['1 November 2013', '2 June 2014', '15 August 2014', '26 January 2015'], 1, 'Telangana was formed on 2 June 2014.', 'Telangana History'),
        q('The "Kaleshwaram Lift Irrigation Project" is built on which river?', ['Krishna', 'Godavari', 'Tungabhadra', 'Musi'], 1, 'Kaleshwaram is the world\'s largest lift irrigation project on the Godavari.', 'Telangana History'),
        q('Who was the first Chief Minister of Telangana?', ['K. Chandrashekar Rao', 'N. Kiran Kumar Reddy', 'K. Rosaiah', 'Revanth Reddy'], 0, 'KCR (K. Chandrashekar Rao) was the first CM of Telangana.', 'Telangana History'),
        q('The Panchayati Raj system was constitutionalised by which Amendment?', ['42nd', '44th', '73rd', '74th'], 2, 'The 73rd Amendment (1992) constitutionalised Panchayati Raj.', 'Polity'),
        q('How many members can the President of India nominate to the Rajya Sabha?', ['10', '12', '14', '16'], 1, '12 members are nominated for distinguished service in arts, science, literature and social service.', 'Polity'),
        q('Which of the following is a direct tax?', ['GST', 'Excise Duty', 'Income Tax', 'Customs Duty'], 2, 'Income tax is a direct tax; the others are indirect.', 'Economy'),
        q('Bathukamma is a floral festival celebrated in which state?', ['Andhra Pradesh', 'Telangana', 'Karnataka', 'Tamil Nadu'], 1, 'Bathukamma is Telangana\'s iconic floral festival.', 'Telangana History'),
      ],
    },
  ];

  for (const t of tests) {
    const categoryId = ensureCategoryId(t.category);
    const info = db.prepare(
      `INSERT INTO mock_tests (title, type, exam, category_id, total_questions, duration, total_marks,
        negative_marking, is_live, difficulty, instructions, is_published, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
    ).run(t.title, t.type, t.exam, categoryId, t.questions.length, t.duration,
      t.questions.reduce((a: number, x: any) => a + x.marks, 0), t.negativeMarking,
      t.isLive, t.difficulty, t.instructions, adminId);
    const testId = Number(info.lastInsertRowid);
    const stmt = db.prepare(
      `INSERT INTO mock_questions (test_id, question_text, options, correct_index, explanation, marks, negative_marks, subject, topic, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    t.questions.forEach((qq: any, i: number) => {
      stmt.run(testId, qq.questionText, JSON.stringify(qq.options), qq.correctIndex, qq.explanation,
        qq.marks, qq.negativeMarks, qq.subject, qq.topic || qq.subject, i);
    });
  }
}

// ---------------------------------------------------------------------------
// Quiz questions (dated today so /api/quiz/today works immediately)
// ---------------------------------------------------------------------------
function seedQuiz() {
  const today = new Date().toISOString().slice(0, 10);
  const quizQs = [
    ['Who won the Men\'s Singles title at Wimbledon 2024?', ['Novak Djokovic', 'Carlos Alcaraz', 'Jannik Sinner', 'Daniil Medvedev'], 1, 'Alcaraz defeated Djokovic in the final.', 'Sports', 'Medium'],
    ['The headquarters of ISRO is located at:', ['Mumbai', 'Bengaluru', 'Sriharikota', 'Thiruvananthapuram'], 1, 'ISRO HQ is in Bengaluru; SDSC SHAR is in Sriharikota.', 'Science & Tech', 'Easy'],
    ['India\'s first indigenously built aircraft carrier is:', ['INS Vikramaditya', 'INS Vikrant', 'INS Viraat', 'INS Arihant'], 1, 'INS Vikrant (IAC-1) was commissioned in September 2022.', 'Defence', 'Medium'],
    ['The Reserve Bank of India was established in which year?', ['1935', '1947', '1950', '1925'], 0, 'RBI was established on 1 April 1935 under the RBI Act 1934.', 'Economy', 'Easy'],
    ['Which of the following is the largest state in India by area?', ['Madhya Pradesh', 'Maharashtra', 'Rajasthan', 'Uttar Pradesh'], 2, 'Rajasthan covers ~342,239 sq km.', 'Geography', 'Easy'],
    ['The concept of "Basic Structure" of the Constitution was propounded in which case?', ['Golaknath case', 'Kesavananda Bharati case', 'Minerva Mills case', 'AK Gopalan case'], 1, 'Kesavananda Bharati (1973) established the Basic Structure doctrine.', 'Polity', 'Medium'],
    ['"Mission LiFE" launched by India focuses on:', ['Lifestyle for Environment', 'Literacy for Education', 'Liberty for Everyone', 'Land for Farmers'], 0, 'LiFE = Lifestyle for Environment, launched by PM Modi.', 'National', 'Medium'],
    ['The "Prithvi-II" missile is a:', ['Surface-to-air missile', 'Surface-to-surface ballistic missile', 'Air-to-air missile', 'Cruise missile'], 1, 'Prithvi-II is an indigenously developed surface-to-surface ballistic missile.', 'Defence', 'Hard'],
    ['Who is the author of the book "The Discovery of India"?', ['Mahatma Gandhi', 'Jawaharlal Nehru', 'Sardar Patel', 'B.R. Ambedkar'], 1, 'Nehru wrote it during his imprisonment at Ahmednagar Fort (1942-46).', 'National', 'Easy'],
    ['The "Gangetic Dolphins" are found in which river?', ['Godavari', 'Ganga', 'Narmada', 'Cauvery'], 1, 'The Ganges river dolphin is the National Aquatic Animal.', 'Environment', 'Medium'],
  ];
  const stmt = db.prepare(
    `INSERT INTO quiz_questions (question_text, options, correct_index, explanation, category, date, difficulty)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  quizQs.forEach((qq: any) => stmt.run(qq[0], JSON.stringify(qq[1]), qq[2], qq[3], qq[4], today, qq[5]));

  // A couple of "yesterday" questions so previous quizzes have data too
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  stmt.run('The "Bharat Ratna" is India\'s highest:', JSON.stringify(['Military award', 'Civilian award', 'Sports award', 'Literary award']), 1, 'Bharat Ratna is the highest civilian award of India.', 'National', yesterday, 'Easy');
  stmt.run('The "Ramsar Convention" is related to:', JSON.stringify(['Ozone depletion', 'Wetlands conservation', 'Climate change', 'Biodiversity parks']), 1, 'Ramsar Convention (1971) deals with wetland conservation.', 'Environment', yesterday, 'Medium');
  stmt.run('"Operation Smile" was related to:', JSON.stringify(['Disaster relief', 'Missing children rescue', 'Border security', 'Cyclone relief']), 1, 'Operation Smile rescues missing/trafficked children.', 'National', yesterday, 'Hard');
}

// ---------------------------------------------------------------------------
// Current affairs
// ---------------------------------------------------------------------------
function seedAffairs(adminId: number) {
  const today = new Date().toISOString().slice(0, 10);
  const mk = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
  const affairs = [
    ['India launches third indigenous aircraft carrier programme', 'The government approved the construction of a third indigenous aircraft carrier (IAC-3), significantly boosting India\'s naval capability and the Make in India initiative in defence.', 'Defence minister announced plans for a 45,000-tonne carrier with higher indigenous content. The ship will be built at Cochin Shipyard Limited and is expected to be inducted by the early 2030s.', 'national', mk(0), ['defence', 'navy', 'make-in-india'], '#4f46e5', 'PIB', 'https://pib.gov.in', 1],
    ['RBI keeps repo rate unchanged; GDP growth projected at 6.8%', 'The Monetary Policy Committee (MPC) of the RBI maintained the repo rate, citing a balanced approach to inflation control and growth support.', 'The committee retained the policy stance while projecting GDP growth of 6.8% for the current fiscal year. Inflation is expected to remain within the target band. Deposit and lending rates are expected to remain stable.', 'economy', mk(0), ['rbi', 'economy', 'mpc'], '#059669', 'RBI', 'https://rbi.org.in', 1],
    ['India wins 5 medals at the World Athletics Championships', 'Indian athletes returned with a historic medal haul, including a gold in men\'s javelin throw, marking the best-ever performance at the global meet.', 'The javelin gold was backed by strong showings in race walking and long jump. The performance signals a new era for Indian athletics ahead of the next Olympic cycle.', 'sports', mk(1), ['sports', 'athletics', 'javelin'], '#dc2626', 'Sports Desk', 'https://sportsdesk.in', 1],
    ['New biodiversity hotspots identified in the Eastern Ghats', 'Scientists recorded 40+ new species of plants and insects in the Eastern Ghats, reinforcing the region\'s global biodiversity significance.', 'The survey covered the forests of Andhra Pradesh and Odisha. Researchers recommend declaring the identified areas as protected reserves to prevent habitat loss from mining and deforestation.', 'science-tech', mk(2), ['environment', 'biodiversity', 'eastern-ghats'], '#16a34a', 'Nature Journal', 'https://nature.com', 0],
    ['Cabinet approves National Green Hydrogen Mission Phase 2', 'The expanded mission aims to make India a global hub for green hydrogen production, targeting 8 MMT annual capacity with an outlay of ₹20,000 crore.', 'The second phase focuses on electrolyser manufacturing incentives, export hubs and demand creation in refining, fertiliser and steel sectors. India targets 50% renewable energy share by 2030.', 'economy', mk(3), ['green-hydrogen', 'energy', 'climate'], '#0d9488', 'PIB', 'https://pib.gov.in', 1],
    ['Telangana launches AI-powered crop advisory for farmers', 'The state government rolled out an AI-based advisory platform providing personalised crop, soil and weather guidance to farmers in all 33 districts.', 'The platform integrates satellite data, soil health cards and weather APIs to deliver vernacular-language advisories. Early pilots showed a 12% average yield improvement.', 'science-tech', mk(4), ['telangana', 'agriculture', 'ai'], '#7c3aed', 'Telangana Govt', 'https://telangana.gov.in', 0],
    ['ISRO\'s next lunar mission to carry international payloads', 'India\'s upcoming lunar mission will carry scientific payloads from five partner nations, deepening international collaboration in space exploration.', 'The mission follows the success of Chandrayaan-3 and will focus on high-resolution lunar surface mapping and water-ice detection near the south pole.', 'science-tech', mk(5), ['isro', 'space', 'chandrayaan'], '#2563eb', 'ISRO', 'https://isro.gov.in', 1],
    ['GST collections cross ₹2 lakh crore for third straight month', 'Goods and Services Tax collections remained above the ₹2 lakh crore mark, reflecting robust domestic consumption and improved compliance.', 'Analysts attribute the sustained collections to festive demand, e-invoicing and better anti-evasion measures. Services sector growth continues to lead the uptick.', 'economy', mk(6), ['gst', 'economy', 'taxation'], '#d97706', 'Finance Ministry', 'https://finmin.nic.in', 0],
  ];
  const stmt = db.prepare(
    `INSERT INTO affairs (title, summary, content, category_id, date, tags, image_color, source, source_url, is_featured, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  affairs.forEach((a) => {
    const categoryId = ensureCategoryId(String(a[3]));
    stmt.run(a[0], a[1], a[2], categoryId, a[4], JSON.stringify(a[5]), a[6], a[7], a[8], a[9], adminId);
  });
}

// ---------------------------------------------------------------------------
// Videos
// ---------------------------------------------------------------------------
function seedVideos(adminId: number) {
  const videos = [
    { title: 'Percentage & Profit-Loss Masterclass', desc: 'A complete crash course on percentages, profit-loss and discount with shortcut methods for SSC & Banking exams.', slug: 'concept-lectures', playlist: 'SSC Quant Master', exam: 'SSC CGL', duration: 5400, views: 48230, likes: 2100, color: '#4f46e5', tags: ['quant', 'percentage', 'ssc'] },
    { title: 'Reasoning: Puzzles in 3 Easy Steps', desc: 'Learn a foolproof 3-step framework to crack floor, box and seating arrangement puzzles in under 2 minutes each.', slug: 'concept-lectures', playlist: 'Reasoning Guruji', exam: 'Banking', duration: 3900, views: 61200, likes: 3400, color: '#7c3aed', tags: ['reasoning', 'puzzles', 'banking'] },
    { title: 'Current Affairs: Weekly Wrap (All Exams)', desc: 'This week\'s top 50 current affairs for SSC, Railways, Banking and State PSC exams — explained with memory tricks.', slug: 'affairs-videos', playlist: 'Daily News Analysis', exam: 'All Exams', duration: 4200, views: 88310, likes: 5200, color: '#dc2626', tags: ['current-affairs', 'weekly', 'gk'] },
    { title: 'English: Error Spotting Made Easy', desc: 'The 10 golden rules of error spotting with 50 exam-level practice sentences explained in detail.', slug: 'concept-lectures', playlist: 'English Edge', exam: 'All Exams', duration: 3600, views: 39450, likes: 1800, color: '#0891b2', tags: ['english', 'grammar', 'error-spotting'] },
    { title: 'SSC CGL Tier-1 Mock #1: Full Solutions Discussion', desc: 'Complete analysis and step-by-step solutions of the latest SSC CGL full-length mock, with topic-wise cut-off trends.', slug: 'mock-analysis', playlist: 'Mock Analysis', exam: 'SSC CGL', duration: 7200, views: 54120, likes: 2900, color: '#ea580c', tags: ['mock-analysis', 'ssc', 'solutions'] },
    { title: 'TSPSC Group-1: Telangana History in 10 Days', desc: 'Day-wise crash plan covering Telangana history from Satavahanas to the present for TSPSC Group-1 aspirants.', slug: 'concept-lectures', playlist: 'Telangana Study Circle', exam: 'TSPSC Group 1', duration: 4800, views: 28740, likes: 1500, color: '#16a34a', tags: ['tspsc', 'telangana', 'history'] },
  ];
  const stmt = db.prepare(
    `INSERT INTO videos (title, description, category_id, playlist, video_url, thumbnail_color, duration, educator, exam, views, likes, tags, created_by)
     VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const v of videos) {
    const categoryId = ensureCategoryId(v.slug);
    stmt.run(v.title, v.desc, categoryId, v.playlist, v.color, v.duration, 'Garuda Faculty', v.exam, v.views, v.likes, JSON.stringify(v.tags), adminId);
  }
}

const { adminId } = await seedUsers();
  seedCategories();

  if (!hasRows('jobs')) {
    seedJobs(adminId);
  }
  if (!hasRows('materials')) {
    seedMaterials(adminId);
  }
  if (!hasRows('mock_tests')) {
    seedMocks(adminId);
  }
  if (!hasRows('quiz_questions')) {
    seedQuiz();
  }
  if (!hasRows('affairs')) {
    seedAffairs(adminId);
  }
  if (!hasRows('videos')) {
    seedVideos(adminId);
  }

  console.log('✅ Seed complete!');
  console.log('   └─ Admin: admin@garuda.ai / Admin@123');
}

// Auto-run only when executed directly: `npm run seed` / `tsx src/db/seed.ts`
// tsx (dev) polyfills require.main for ESM; compiled CJS uses it natively.
const isDirectRun = (() => {
  try {
    return require.main === module;
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  seedAll().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
