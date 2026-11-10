import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required. No database was changed.');
  process.exit(1);
}

const root = path.dirname(fileURLToPath(import.meta.url));
const exerciseFiles = ['seed-exercises.json', 'seed-exercises.de.json'];
const exercises = (await Promise.all(exerciseFiles.map(async file =>
  JSON.parse(await fs.readFile(path.join(root, '../content', file), 'utf8'))
))).flat();
const planTemplates = JSON.parse(await fs.readFile(path.join(root, '../content/plan-templates.de.json'), 'utf8'));
const germanSkillTasks = JSON.parse(await fs.readFile(path.join(root, '../content/skill-practice-tasks.de.json'), 'utf8'));
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'disable' ? false : process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: true } : undefined
});

try {
  for (const exercise of exercises) {
    await pool.query(
      `INSERT INTO exercises
        (id, language_code, skill, level, objective, instructions, content, answer_key, explanation,
         estimated_time, tags, prerequisites, srs, success_criteria, status)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11,$12,$13::jsonb,$14,'published')
       ON CONFLICT (id) DO NOTHING`,
      [
        exercise.id, exercise.language_code || 'en', exercise.skill, exercise.level, exercise.objective,
        JSON.stringify(exercise.instructions), JSON.stringify(exercise.content),
        JSON.stringify(exercise.answer_key), JSON.stringify(exercise.explanation),
        exercise.estimated_time, exercise.tags, exercise.prerequisites,
        JSON.stringify(exercise.srs), exercise.success_criteria
      ]
    );
  }
  for (const template of planTemplates) {
    await pool.query(
      `INSERT INTO plan_templates
        (id, language_code, title, goal, level_min, level_max, duration_weeks,
         minutes_per_day, weekly_themes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)
       ON CONFLICT (id) DO NOTHING`,
      [
        template.id, template.language_code, template.title, template.goal,
        template.level_min, template.level_max, template.duration_weeks,
        template.minutes_per_day, JSON.stringify(template.weekly_themes), template.status
      ]
    );
  }
  for (const task of germanSkillTasks) {
    await pool.query(
      `INSERT INTO skill_practice_tasks
        (id, language_code, skill, level, title, description, duration_minutes, content, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
       ON CONFLICT (id) DO NOTHING`,
      [
        task.id, task.language_code, task.skill, task.level, task.title,
        task.description, task.duration_minutes, JSON.stringify(task.content), task.status
      ]
    );
  }
  console.log('Seeded ' + exercises.length + ' curated exercises, ' +
    planTemplates.length + ' German plan templates and ' +
    germanSkillTasks.length + ' German Skills Lab tasks.');
} catch (error) {
  console.error('Seeding failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
