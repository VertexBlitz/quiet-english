import express from 'express';
import { pool, requireDatabase, requireUser, recordActivity } from '../db.js';
import { estimateLevel, publicQuestions, placementQuestions } from '../content/placement.js';

const router = express.Router();
router.use(requireDatabase, requireUser);

const levelRank = { 'Pre-A1':0, 'A1':1, 'A2':2, 'B1':3, 'B2':4, 'C1':5, 'C2':6 };
const weekThemes = [
  ['Everyday communication', 'Describe routines, experiences and plans with clear everyday language.'],
  ['Travel and problem solving', 'Ask for help, make polite requests and understand practical information.'],
  ['Work, study and opinions', 'Explain reasons, express opinions and write clear short messages.'],
  ['Practical communication', 'Combine vocabulary, grammar and comprehension in realistic situations.']
];
const miniPrompts = [
  'Write one sentence about something you did today.',
  'Make one polite request you could use while travelling.',
  'Give one reason for an opinion using “because”.',
  'Summarise one useful thing you learned this week.'
];

function chooseExercise(level, day) {
  const rank = levelRank[level] ?? 2;
  const cycles = rank <= 1
    ? ['V04','G01','R01','V01','G05','R02','G01']
    : rank <= 3
      ? ['V01','G02','R01','V02','G03','R02','G05']
      : ['V03','G04','R02','V02','G04','R03','G03'];
  return cycles[(day - 1) % cycles.length];
}

function publicExercise(row) {
  if (!row) return null;
  const { answer_key, ...safe } = row;
  return safe;
}

async function generatePlan(userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT goal, COALESCE(assessed_level, self_assessed_level, \'A2\') AS level, minutes_per_day FROM learner_profiles WHERE user_id=$1 FOR UPDATE',
      [userId]
    );
    const profile = rows[0];
    if (!profile) throw new Error('Learner profile is missing.');
    await client.query('UPDATE learning_plans SET status=\'archived\' WHERE user_id=$1 AND status=\'active\'', [userId]);
    const planResult = await client.query(
      `INSERT INTO learning_plans (user_id, goal, level, duration_weeks, minutes_per_day)
       VALUES ($1,$2,$3,4,$4) RETURNING *`,
      [userId, profile.goal || 'general', profile.level, profile.minutes_per_day || 10]
    );
    const plan = planResult.rows[0];
    for (let week = 1; week <= 4; week++) {
      const [theme, objective] = weekThemes[week - 1];
      const weekResult = await client.query(
        'INSERT INTO plan_weeks (plan_id, week_number, theme, objective) VALUES ($1,$2,$3,$4) RETURNING id',
        [plan.id, week, theme, objective]
      );
      for (let dayInWeek = 1; dayInWeek <= 7; dayInWeek++) {
        const day = (week - 1) * 7 + dayInWeek;
        await client.query(
          `INSERT INTO plan_days (plan_id, week_id, day_index, main_task_id, review_item_limit, mini_prompt)
           VALUES ($1,$2,$3,$4,5,$5)`,
          [plan.id, weekResult.rows[0].id, day, chooseExercise(profile.level, day), miniPrompts[(day - 1) % miniPrompts.length]]
        );
      }
    }
    await client.query('COMMIT');
    return plan;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

router.get('/profile', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM learner_profiles WHERE user_id=$1', [req.user.id]);
    res.json({ profile: rows[0] || null });
  } catch (error) { next(error); }
});

router.put('/onboarding', async (req, res, next) => {
  const { goal, self_assessed_level, minutes_per_day, duration_weeks, interests, preferred_language } = req.body || {};
  const goals = ['general','work','travel','exam','communication','relocation','study'];
  const levels = ['Pre-A1','A1','A2','B1','B2','C1','C2'];
  if (!goals.includes(goal)) return res.status(400).json({ error: 'Выбери цель обучения.' });
  if (self_assessed_level && !levels.includes(self_assessed_level)) return res.status(400).json({ error: 'Уровень указан некорректно.' });
  if (![5,10,15,30].includes(Number(minutes_per_day))) return res.status(400).json({ error: 'Выбери 5, 10, 15 или 30 минут.' });
  if (![4,8,12].includes(Number(duration_weeks))) return res.status(400).json({ error: 'Выбери длительность плана.' });
  if (!Array.isArray(interests) || interests.length > 8 || interests.some(x => typeof x !== 'string' || x.length > 40)) {
    return res.status(400).json({ error: 'Проверь список интересов.' });
  }
  if (!['ru','en'].includes(preferred_language)) return res.status(400).json({ error: 'Выбери язык интерфейса.' });
  try {
    await pool.query(
      `UPDATE learner_profiles
       SET goal=$2, self_assessed_level=$3, minutes_per_day=$4, duration_weeks=$5,
           interests=$6::jsonb, preferred_language=$7, updated_at=NOW()
       WHERE user_id=$1`,
      [req.user.id, goal, self_assessed_level || null, Number(minutes_per_day), Number(duration_weeks), JSON.stringify(interests), preferred_language]
    );
    res.json({ ok: true, message: 'Настройки обучения сохранены.' });
  } catch (error) { next(error); }
});

router.get('/placement/questions', (_req, res) => {
  res.json({ questions: publicQuestions(), note: 'Короткая предварительная оценка, не официальный сертификат CEFR.' });
});

router.post('/placement/submit', async (req, res, next) => {
  const answers = req.body?.answers;
  if (!Array.isArray(answers) || answers.length !== placementQuestions.length) {
    return res.status(400).json({ error: 'Ответь на все вопросы теста.' });
  }
  const answerMap = new Map(answers.map(item => [item?.id, item?.option_id]));
  if (placementQuestions.some(q => !answerMap.has(q.id))) return res.status(400).json({ error: 'В ответах отсутствуют вопросы.' });
  const correct = placementQuestions.filter(q => answerMap.get(q.id) === q.answer).length;
  const level = estimateLevel(correct);
  try {
    await pool.query(
      'INSERT INTO placement_attempts (user_id, answers, correct_count, total_questions, estimated_level) VALUES ($1,$2::jsonb,$3,$4,$5)',
      [req.user.id, JSON.stringify(answers), correct, placementQuestions.length, level]
    );
    await pool.query('UPDATE learner_profiles SET assessed_level=$2, updated_at=NOW() WHERE user_id=$1', [req.user.id, level]);
    const plan = await generatePlan(req.user.id);
    res.json({
      ok: true,
      result: { level, correct, total: placementQuestions.length, is_preliminary: true },
      plan: { id: plan.id, duration_weeks: plan.duration_weeks }
    });
  } catch (error) { next(error); }
});

router.post('/plan/generate', async (req, res, next) => {
  try {
    const plan = await generatePlan(req.user.id);
    res.status(201).json({ plan });
  } catch (error) { next(error); }
});

router.get('/plan', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, json_agg(json_build_object(
         'week_number', w.week_number, 'theme', w.theme, 'objective', w.objective
       ) ORDER BY w.week_number) AS weeks
       FROM learning_plans p LEFT JOIN plan_weeks w ON w.plan_id=p.id
       WHERE p.user_id=$1 AND p.status='active'
       GROUP BY p.id ORDER BY p.created_at DESC LIMIT 1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'План пока не создан. Заверши онбординг и тест.' });
    res.json({ plan: rows[0] });
  } catch (error) { next(error); }
});

router.get('/today', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id AS plan_id, p.level, p.goal, p.minutes_per_day,
              d.id AS day_id, d.day_index, d.main_task_id, d.review_item_limit, d.mini_prompt,
              w.week_number, w.theme, w.objective, e.skill, e.objective AS task_objective,
              e.level AS task_level, e.estimated_time, e.instructions, e.content, e.success_criteria
       FROM learning_plans p
       JOIN plan_days d ON d.plan_id=p.id
       JOIN plan_weeks w ON w.id=d.week_id
       LEFT JOIN exercises e ON e.id=d.main_task_id
       WHERE p.user_id=$1 AND p.status='active'
         AND d.day_index = LEAST(GREATEST((CURRENT_DATE - p.starts_on + 1), 1), 28)
       LIMIT 1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Сегодняшняя задача пока недоступна. Создай учебный план.' });
    const day = rows[0];
    const review = await pool.query('SELECT COUNT(*)::int AS due_count FROM srs_items WHERE user_id=$1 AND due_at <= NOW()', [req.user.id]);
    res.json({
      today: {
        plan_id: day.plan_id, level: day.level, goal: day.goal, minutes_per_day: day.minutes_per_day,
        day_index: day.day_index, week_number: day.week_number, theme: day.theme, objective: day.objective,
        main_task: day.main_task_id ? {
          id: day.main_task_id, skill: day.skill, level: day.task_level, objective: day.task_objective,
          estimated_time: day.estimated_time, instructions: day.instructions, content: day.content,
          success_criteria: day.success_criteria
        } : null,
        review_due: review.rows[0].due_count,
        review_item_limit: day.review_item_limit,
        mini_prompt: day.mini_prompt,
        completed: Boolean(day.completed_at)
      }
    });
  } catch (error) { next(error); }
});

router.get('/exercises', async (req, res, next) => {
  const skills = ['vocabulary','grammar','reading'];
  const skill = req.query.skill;
  try {
    const { rows } = await pool.query(
      `SELECT id, skill, level, objective, instructions, content, estimated_time, tags, success_criteria
       FROM exercises WHERE status='published' AND skill = ANY($1::text[])
         AND ($2::text IS NULL OR skill=$2)
       ORDER BY skill, level, id`,
      [skills, skills.includes(skill) ? skill : null]
    );
    res.json({ exercises: rows });
  } catch (error) { next(error); }
});

router.get('/exercises/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, skill, level, objective, instructions, content, estimated_time, tags, success_criteria, version
       FROM exercises WHERE id=$1 AND status='published'`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Задание не найдено.' });
    res.json({ exercise: rows[0] });
  } catch (error) { next(error); }
});

router.post('/exercises/:id/attempts', async (req, res, next) => {
  const answer = req.body?.answer;
  if (answer === undefined || answer === null) return res.status(400).json({ error: 'Отправь ответ на задание.' });
  try {
    const { rows } = await pool.query('SELECT * FROM exercises WHERE id=$1 AND status=\'published\'', [req.params.id]);
    const exercise = rows[0];
    if (!exercise) return res.status(404).json({ error: 'Задание не найдено.' });
    const selected = typeof answer === 'string' ? answer : answer.option_id;
    const isCorrect = selected === exercise.answer_key.correct_option_id;
    const correctOption = exercise.content.options?.find(option => option.id === exercise.answer_key.correct_option_id);
    const selectedOption = exercise.content.options?.find(option => option.id === selected);
    const feedback = {
      correct: isCorrect,
      correct_answer: correctOption?.text || null,
      explanation: exercise.explanation
    };
    const result = await pool.query(
      `INSERT INTO exercise_attempts (user_id, exercise_id, exercise_version, answer, is_correct, score, feedback)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7::jsonb) RETURNING id`,
      [req.user.id, exercise.id, exercise.version, JSON.stringify(answer), isCorrect, isCorrect ? 100 : 0, JSON.stringify(feedback)]
    );

    if (exercise.srs?.enabled) {
      const prompt = exercise.content.prompt || exercise.objective;
      const correctAnswer = correctOption?.text || exercise.answer_key.correct_option_id;
      await pool.query(
        `INSERT INTO srs_items (user_id, item_type, item_ref, prompt, answer, explanation, due_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW() + INTERVAL '1 day')
         ON CONFLICT (user_id,item_type,item_ref) DO UPDATE SET
           prompt=EXCLUDED.prompt, answer=EXCLUDED.answer, explanation=EXCLUDED.explanation, due_at=LEAST(srs_items.due_at, NOW())`,
        [req.user.id, exercise.srs.item_type || exercise.skill, exercise.id, prompt, correctAnswer, exercise.explanation?.en || exercise.explanation?.ru || null]
      );
    }

    if (!isCorrect && selectedOption) {
      await pool.query(
        `INSERT INTO error_journal (user_id, attempt_id, error_type, incorrect_form, correction, explanation)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [req.user.id, result.rows[0].id, exercise.skill, selectedOption.text, correctOption?.text || 'Review the correct answer', exercise.explanation?.en || exercise.explanation?.ru || null]
      );
    }

    await recordActivity(req.user.id, { minutes: exercise.estimated_time, completedTasks: 1 });
    res.json({ attempt_id: result.rows[0].id, is_correct: isCorrect, score: isCorrect ? 100 : 0, feedback });
  } catch (error) { next(error); }
});

router.get('/review/queue', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, item_type, item_ref, prompt, answer, explanation, interval_days, repetitions, due_at
       FROM srs_items WHERE user_id=$1 AND due_at <= NOW()
       ORDER BY due_at ASC LIMIT 20`,
      [req.user.id]
    );
    res.json({ items: rows });
  } catch (error) { next(error); }
});

router.post('/review/:id', async (req, res, next) => {
  const rating = req.body?.rating;
  if (!['Again','Hard','Good','Easy'].includes(rating)) return res.status(400).json({ error: 'Выбери Again, Hard, Good или Easy.' });
  try {
    const { rows } = await pool.query('SELECT * FROM srs_items WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    const item = rows[0];
    if (!item) return res.status(404).json({ error: 'Карточка не найдена.' });
    let interval = item.interval_days;
    let repetitions = item.repetitions;
    let ease = Number(item.ease_factor);
    if (rating === 'Again') { repetitions = 0; interval = 0; ease = Math.max(1.3, ease - 0.2); }
    else if (rating === 'Hard') { interval = Math.max(1, Math.round(interval * 1.2)); repetitions += 1; ease = Math.max(1.3, ease - 0.15); }
    else if (rating === 'Good') { interval = repetitions === 0 ? 1 : repetitions === 1 ? 3 : Math.round(interval * ease); repetitions += 1; }
    else { interval = Math.max(2, Math.round(interval * ease * 1.3)); repetitions += 1; ease += 0.15; }
    await pool.query(
      `UPDATE srs_items SET interval_days=$3,repetitions=$4,ease_factor=$5,last_rating=$6,
       due_at=CASE WHEN $3=0 THEN NOW()+INTERVAL '10 minutes' ELSE NOW()+($3 * INTERVAL '1 day') END, updated_at=NOW()
       WHERE id=$1 AND user_id=$2`,
      [item.id, req.user.id, interval, repetitions, ease, rating]
    );
    await recordActivity(req.user.id, { minutes: 1, completedTasks: 0 });
    res.json({ ok: true, next_interval_days: interval, rating });
  } catch (error) { next(error); }
});

router.get('/progress', async (req, res, next) => {
  try {
    const [summary, skills, activity, errors] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(minutes),0)::int AS minutes,
                COALESCE(SUM(completed_tasks),0)::int AS completed_tasks,
                COUNT(*) FILTER (WHERE completed_tasks > 0)::int AS active_days
         FROM daily_activity WHERE user_id=$1`,
        [req.user.id]
      ),
      pool.query(
        `SELECT e.skill, COUNT(*)::int AS attempts,
                COUNT(*) FILTER (WHERE a.is_correct)::int AS correct
         FROM exercise_attempts a JOIN exercises e ON e.id=a.exercise_id
         WHERE a.user_id=$1 GROUP BY e.skill ORDER BY e.skill`,
        [req.user.id]
      ),
      pool.query(
        `SELECT activity_date, minutes, completed_tasks FROM daily_activity
         WHERE user_id=$1 AND activity_date >= CURRENT_DATE - INTERVAL '6 days'
         ORDER BY activity_date`,
        [req.user.id]
      ),
      pool.query('SELECT COUNT(*)::int AS open_errors FROM error_journal WHERE user_id=$1 AND resolved_at IS NULL', [req.user.id])
    ]);
    res.json({
      summary: { ...summary.rows[0], open_errors: errors.rows[0].open_errors },
      skills: skills.rows.map(row => ({ skill: row.skill, attempts: row.attempts, accuracy: row.attempts ? Math.round(row.correct / row.attempts * 100) : null })),
      last_7_days: activity.rows
    });
  } catch (error) { next(error); }
});

router.get('/errors', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, error_type, incorrect_form, correction, explanation, occurrences, created_at, updated_at
       FROM error_journal WHERE user_id=$1 AND resolved_at IS NULL ORDER BY updated_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ errors: rows });
  } catch (error) { next(error); }
});

router.post('/errors/:id/resolve', async (req, res, next) => {
  try {
    const result = await pool.query(
      'UPDATE error_journal SET resolved_at=NOW(), updated_at=NOW() WHERE id=$1 AND user_id=$2 AND resolved_at IS NULL',
      [req.params.id, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Ошибка не найдена или уже закрыта.' });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

export default router;
