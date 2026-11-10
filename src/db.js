import pg from 'pg';
import { getDatabaseSchema, getPostgresSchemaOptions } from './db-schema.js';

const { Pool } = pg;
const dbSchema = getDatabaseSchema();

export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === 'disable' ? false : process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: true } : undefined,
      options: getPostgresSchemaOptions(dbSchema),
      max: 8,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000
    })
  : null;

export function requireDatabase(_req, res, next) {
  if (!pool) {
    return res.status(503).json({
      error: 'Учебный профиль пока не настроен: администратору нужно подключить PostgreSQL через DATABASE_URL.'
    });
  }
  next();
}

export async function requireUser(req, res, next) {
  if (!pool || !req.session?.userId) {
    return res.status(401).json({ error: 'Войди в аккаунт, чтобы открыть личный учебный план.' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT id, email, role, age_band, account_status, created_at FROM users WHERE id = $1',
      [req.session.userId]
    );
    const user = rows[0];
    if (!user || user.account_status !== 'active') {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Сессия недействительна. Войди снова.' });
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export async function recordActivity(userId, { minutes = 0, completedTasks = 0 } = {}) {
  if (!pool) return;
  await pool.query(
    `INSERT INTO daily_activity
       (user_id, language_code, activity_date, minutes, completed_tasks)
     SELECT $1, active_learning_language_code,
       (NOW() AT TIME ZONE COALESCE(timezone, 'UTC'))::date,
       $2, $3
     FROM learner_profiles WHERE user_id=$1
     ON CONFLICT (user_id, language_code, activity_date)
     DO UPDATE SET
       minutes = daily_activity.minutes + EXCLUDED.minutes,
       completed_tasks = daily_activity.completed_tasks + EXCLUDED.completed_tasks,
       updated_at = NOW()`,
    [userId, minutes, completedTasks]
  );
}
