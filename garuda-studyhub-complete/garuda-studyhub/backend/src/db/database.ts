import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

// ---------------------------------------------------------------------------
// Synchronous MySQL compatibility layer built on mysql2 + a small helper.
//
// The app code expects a synchronous API (db.prepare(sql).get/all/run, db.exec,
// db.transaction, prep()). Rather than relying on a native addon like deasync,
// we run each query inside a lightweight helper process. This avoids the
// deployment issues caused by native compilation and keeps call sites intact.
// ---------------------------------------------------------------------------

function connectWithRetry(): void {
  const maxAttempts = Number(process.env.DB_STARTUP_RETRIES || 15);
  const retryDelayMs = Number(process.env.DB_STARTUP_RETRY_DELAY_MS || 2000);
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      runQuerySync('exec', 'SELECT 1');
      return;
    } catch (error) {
      lastError = error;
      console.error('Database connection failed:', {
        host: env.dbHost,
        port: env.dbPort,
        database: env.dbName,
        user: env.dbUser,
        ssl: env.dbSsl,
        error,
      });
      if (attempt < maxAttempts) {
        console.warn(`Database unavailable (attempt ${attempt}/${maxAttempts}); retrying in ${retryDelayMs}ms...`);
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, retryDelayMs);
      }
    }
  }

  throw lastError;
}

function getQueryRunnerPath(): string {
  const candidates = [
    path.join(__dirname, 'query-runner.js'),
    path.join(__dirname, 'query-runner.ts'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error('Unable to locate database query runner');
}

function runQuerySync(mode: string, sql: string, params: any[] = []): any {
  const runnerPath = getQueryRunnerPath();
  const command = runnerPath.endsWith('.ts') ? 'tsx' : process.execPath;
  const args = runnerPath.endsWith('.ts') ? [runnerPath, JSON.stringify({ mode, sql, params })] : [runnerPath, JSON.stringify({ mode, sql, params })];

  const result = spawnSync(command, args, {
    encoding: 'utf8',
    env: process.env,
    timeout: 60000,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `Database helper exited with status ${result.status}`);
  }

  const output = result.stdout?.trim() ?? '';
  if (!output) {
    return undefined;
  }

  return JSON.parse(output);
}

function normalizeSql(sql: string): string {
  return sql
    .replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT IGNORE INTO')
    .replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'REPLACE INTO')
    .replace(/datetime\(\s*'now'\s*\)/gi, 'NOW()')
    .replace(/date\(\s*'now'\s*\)/gi, 'CURDATE()')
    .replace(/date\(\s*'now'\s*,\s*'(-?\d+)\s*(days?|weeks?)'\s*\)/gi, (_match, amount, unit) => {
      const interval = Math.abs(Number(amount));
      const days = unit.toLowerCase().startsWith('w') ? interval * 7 : interval;
      return `DATE_SUB(CURDATE(), INTERVAL ${days} DAY)`;
    })
    .replace(/ON\s+CONFLICT\s*\(([^)]+)\)\s*DO\s+UPDATE\s+SET\s+/is, 'ON DUPLICATE KEY UPDATE ')
    .replace(/excluded\.([A-Za-z0-9_]+)/g, 'VALUES($1)')
    .replace(/\s*;\s*$/g, '');
}

class MySqlCompatStatement {
  constructor(private readonly sql: string) {}

  get(...params: any[]) {
    const rows = runQuerySync('get', this.sql, params.flat());
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : undefined;
  }

  all(...params: any[]) {
    return runQuerySync('all', this.sql, params.flat());
  }

  run(...params: any[]) {
    const result = runQuerySync('run', this.sql, params.flat());
    if (result && typeof result === 'object' && 'changes' in result) {
      return {
        changes: Number(result.changes ?? 0),
        lastInsertRowid: Number(result.lastInsertRowid ?? 0),
        insertId: Number(result.insertId ?? 0),
      };
    }
    return { changes: 0, lastInsertRowid: 0, insertId: 0 };
  }
}

function openDatabase(): any {
  connectWithRetry();

  return {
    prepare(sql: string) {
      return new MySqlCompatStatement(sql);
    },
    exec(sql: string) {
      runQuerySync('exec', sql);
    },
    pragma() {
      return this;
    },
    transaction(fn: () => void) {
      return () => {
        fn();
      };
    },
    close() {
      return undefined;
    },
  };
}

export const db: any = openDatabase();

export function prep(sql: string): any {
  return db.prepare(sql);
}

function ensureIndex(indexName: string, tableName: string, columns: string) {
  const exists = prep(
    `SELECT 1 FROM information_schema.statistics
     WHERE table_schema = ? AND table_name = ? AND index_name = ? LIMIT 1`
  ).get(env.dbName, tableName, indexName);

  if (!exists) {
    db.exec(`CREATE INDEX ${indexName} ON ${tableName} (${columns})`);
  }
}

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(50) NULL,
      password_hash VARCHAR(255) NOT NULL,
      avatar VARCHAR(500) NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      exam_target VARCHAR(255) NULL,
      is_verified TINYINT(1) NOT NULL DEFAULT 0,
      is_premium TINYINT(1) NOT NULL DEFAULT 0,
      premium_expires_at DATETIME NULL,
      auth_provider VARCHAR(50) NOT NULL DEFAULT 'email',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id INT PRIMARY KEY,
      language VARCHAR(20) NOT NULL DEFAULT 'en',
      theme VARCHAR(20) NOT NULL DEFAULT 'light',
      notify_email TINYINT(1) NOT NULL DEFAULT 1,
      notify_push TINYINT(1) NOT NULL DEFAULT 1,
      CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      description TEXT NULL,
      icon VARCHAR(255) NULL,
      parent_id INT NULL,
      sort_order INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS jobs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      org VARCHAR(255) NOT NULL,
      role VARCHAR(255) NOT NULL,
      exam VARCHAR(255) NULL,
      posts INT NOT NULL DEFAULT 0,
      last_date DATETIME NOT NULL,
      qualification TEXT NULL,
      location VARCHAR(255) NULL,
      salary VARCHAR(255) NULL,
      category_id INT NULL,
      department VARCHAR(255) NULL,
      state VARCHAR(255) NULL,
      job_type VARCHAR(100) NOT NULL DEFAULT 'Permanent',
      status VARCHAR(50) NOT NULL DEFAULT 'Active',
      featured TINYINT(1) NOT NULL DEFAULT 0,
      trend TINYINT(1) NOT NULL DEFAULT 0,
      age_limit VARCHAR(100) NULL,
      application_fee VARCHAR(100) NULL,
      selection_process TEXT NULL,
      eligibility TEXT NULL,
      description LONGTEXT NULL,
      notice_url VARCHAR(500) NULL,
      created_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_jobs_category FOREIGN KEY (category_id) REFERENCES categories(id),
      CONSTRAINT fk_jobs_creator FOREIGN KEY (created_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS job_applications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      job_id INT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'applied',
      notes TEXT NULL,
      applied_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_job_applications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_job_applications_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS saved_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      entity_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_saved_items (user_id, entity_type, entity_id),
      CONSTRAINT fk_saved_items_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS materials (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      category_id INT NULL,
      exam VARCHAR(255) NULL,
      pages INT DEFAULT 0,
      file_url VARCHAR(500) NULL,
      file_size INT DEFAULT 0,
      file_type VARCHAR(50) NOT NULL DEFAULT 'pdf',
      downloads INT NOT NULL DEFAULT 0,
      rating DECIMAL(5,2) NOT NULL DEFAULT 0,
      rating_count INT NOT NULL DEFAULT 0,
      tags TEXT NULL,
      uploaded_by INT NULL,
      is_published TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_materials_category FOREIGN KEY (category_id) REFERENCES categories(id),
      CONSTRAINT fk_materials_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS material_downloads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      material_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_material_downloads_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_material_downloads_material FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS mock_tests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      type VARCHAR(100) NOT NULL DEFAULT 'Full length',
      exam VARCHAR(255) NULL,
      category_id INT NULL,
      total_questions INT NOT NULL DEFAULT 0,
      duration INT NOT NULL DEFAULT 60,
      total_marks INT NOT NULL DEFAULT 0,
      negative_marking DECIMAL(5,2) NOT NULL DEFAULT 0.25,
      is_live TINYINT(1) NOT NULL DEFAULT 0,
      live_date DATETIME NULL,
      attempts INT NOT NULL DEFAULT 0,
      avg_score DECIMAL(5,2) NOT NULL DEFAULT 0,
      difficulty VARCHAR(50) NOT NULL DEFAULT 'Medium',
      instructions TEXT NULL,
      is_published TINYINT(1) NOT NULL DEFAULT 1,
      created_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_mock_tests_category FOREIGN KEY (category_id) REFERENCES categories(id),
      CONSTRAINT fk_mock_tests_creator FOREIGN KEY (created_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS mock_questions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      test_id INT NOT NULL,
      question_text LONGTEXT NOT NULL,
      question_type VARCHAR(50) NOT NULL DEFAULT 'MCQ',
      options TEXT NOT NULL,
      correct_index INT NOT NULL,
      explanation TEXT NULL,
      marks INT NOT NULL DEFAULT 1,
      negative_marks DECIMAL(5,2) NOT NULL DEFAULT 0.25,
      subject VARCHAR(255) NULL,
      topic VARCHAR(255) NULL,
      sort_order INT NOT NULL DEFAULT 0,
      CONSTRAINT fk_mock_questions_test FOREIGN KEY (test_id) REFERENCES mock_tests(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS mock_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      test_id INT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NULL,
      time_taken INT DEFAULT 0,
      score DECIMAL(10,2) DEFAULT 0,
      total_marks INT DEFAULT 0,
      correct INT DEFAULT 0,
      incorrect INT DEFAULT 0,
      unanswered INT DEFAULT 0,
      accuracy DECIMAL(5,2) DEFAULT 0,
      ranking INT DEFAULT 0,
      total_participants INT DEFAULT 0,
      answers TEXT NULL,
      is_completed TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_mock_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_mock_sessions_test FOREIGN KEY (test_id) REFERENCES mock_tests(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      question_text LONGTEXT NOT NULL,
      options TEXT NOT NULL,
      correct_index INT NOT NULL,
      explanation TEXT NULL,
      category VARCHAR(255) NULL,
      date DATE NOT NULL,
      difficulty VARCHAR(50) NOT NULL DEFAULT 'Medium'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      date DATE NOT NULL,
      score INT DEFAULT 0,
      total_questions INT DEFAULT 0,
      answers TEXT NULL,
      time_taken INT DEFAULT 0,
      streak INT DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_quiz_attempts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS affairs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      summary TEXT NULL,
      content LONGTEXT NULL,
      category_id INT NULL,
      date DATE NOT NULL,
      tags TEXT NULL,
      image_color VARCHAR(100) NULL,
      source VARCHAR(255) NULL,
      source_url VARCHAR(500) NULL,
      is_featured TINYINT(1) NOT NULL DEFAULT 0,
      created_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_affairs_category FOREIGN KEY (category_id) REFERENCES categories(id),
      CONSTRAINT fk_affairs_creator FOREIGN KEY (created_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS videos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      category_id INT NULL,
      playlist VARCHAR(255) NULL,
      video_url VARCHAR(500) NULL,
      thumbnail_color VARCHAR(100) NULL,
      duration INT NOT NULL DEFAULT 0,
      educator VARCHAR(255) NULL,
      exam VARCHAR(255) NULL,
      views INT NOT NULL DEFAULT 0,
      likes INT NOT NULL DEFAULT 0,
      is_published TINYINT(1) NOT NULL DEFAULT 1,
      tags TEXT NULL,
      created_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_videos_category FOREIGN KEY (category_id) REFERENCES categories(id),
      CONSTRAINT fk_videos_creator FOREIGN KEY (created_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS video_progress (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      video_id INT NOT NULL,
      progress_seconds INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_video_progress (user_id, video_id),
      CONSTRAINT fk_video_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_video_progress_video FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'system',
      title VARCHAR(255) NOT NULL,
      body TEXT NULL,
      data TEXT NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS testimonials (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      rating TINYINT NOT NULL DEFAULT 5,
      feedback TEXT NOT NULL,
      exam_details VARCHAR(255) NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'approved',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS auth_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token TEXT NOT NULL,
      kind VARCHAR(50) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_auth_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS ai_chats (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255) NULL,
      messages TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_ai_chats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS study_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255) NULL,
      exam VARCHAR(255) NULL,
      target_date DATE NULL,
      weekly_schedule TEXT NULL,
      progress DECIMAL(5,2) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_study_plans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

  `);

  ensureIndex('idx_saved_items_user', 'saved_items', 'user_id');
  ensureIndex('idx_jobs_status', 'jobs', 'status');
  ensureIndex('idx_jobs_last_date', 'jobs', 'last_date');
  ensureIndex('idx_materials_pub', 'materials', 'is_published');
  ensureIndex('idx_mock_questions_test', 'mock_questions', 'test_id');
  ensureIndex('idx_mock_sessions_user', 'mock_sessions', 'user_id');
  ensureIndex('idx_quiz_attempts_user', 'quiz_attempts', 'user_id');
  ensureIndex('idx_notifications_user', 'notifications', 'user_id');
  ensureIndex('idx_affairs_date', 'affairs', 'date');
}

export type Row = Record<string, any>;

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

initSchema();