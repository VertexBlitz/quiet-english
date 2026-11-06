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
const exercises = JSON.parse(await fs.readFile(path.join(root, '../content/seed-exercises.json'), 'utf8'));
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'disable' ? false : process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: true } : undefined
});

try {
  for (const exercise of exercises) {
    await pool.query(
      `INSERT INTO exercises
        (id, skill, level, objective, instructions, content, answer_key, explanation,
         estimated_time, tags, prerequisites, srs, success_criteria, status)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11,$12::jsonb,$13,'published')
       ON CONFLICT (id) DO UPDATE SET
         skill=EXCLUDED.skill, level=EXCLUDED.level, objective=EXCLUDED.objective,
         instructions=EXCLUDED.instructions, content=EXCLUDED.content,
         answer_key=EXCLUDED.answer_key, explanation=EXCLUDED.explanation,
         estimated_time=EXCLUDED.estimated_time, tags=EXCLUDED.tags,
         prerequisites=EXCLUDED.prerequisites, srs=EXCLUDED.srs,
         success_criteria=EXCLUDED.success_criteria, updated_at=NOW()`,
      [
        exercise.id, exercise.skill, exercise.level, exercise.objective,
        JSON.stringify(exercise.instructions), JSON.stringify(exercise.content),
        JSON.stringify(exercise.answer_key), JSON.stringify(exercise.explanation),
        exercise.estimated_time, exercise.tags, exercise.prerequisites,
        JSON.stringify(exercise.srs), exercise.success_criteria
      ]
    );
  }
  console.log(`Seeded ${exercises.length} curated exercises.`);
} catch (error) {
  console.error('Seeding failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
