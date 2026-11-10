import express from 'express';
import { pool, requireDatabase, requireUser, recordActivity } from '../db.js';
import { estimateLevel, publicQuestions, placementForLanguage } from '../content/placement.js';
import { isAvailableLanguage, publicLanguageCatalog } from '../content/languages.js';

const router = express.Router();
router.use(requireDatabase, requireUser);
router.use(async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.language_code, c.goal, c.self_assessed_level, c.assessed_level,
              c.minutes_per_day, c.duration_weeks, c.interests, c.onboarding_completed_at,
              l.name_en AS language_name, l.native_name, l.speech_locale
       FROM users u
       JOIN learner_courses c ON c.id=u.active_learner_course_id AND c.user_id=u.id
       JOIN language_catalog l ON l.language_code=c.language_code
       WHERE u.id=$1 AND c.status='active' AND l.status='active'`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(409).json({ error: 'Нет активного учебного курса. Выбери язык обучения в профиле.' });
    req.course = rows[0];
    next();
  } catch (error) { next(error); }
});

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
const germanMiniPrompts = [
  'Schreibe einen Satz über deinen heutigen Tag.',
  'Formuliere eine höfliche Bitte für eine Alltagssituation.',
  'Begründe deine Meinung mit „weil“.',
  'Fasse zusammen, was du diese Woche gelernt hast.'
];

function chooseExercise(level, day) {
  const rank = levelRank[level] ?? 2;
  const cycles = rank <= 1
    ? ['V04','G01','R04','V01','G06','R01','V05']
    : rank <= 3
      ? ['V01','G02','R01','V02','G03','R02','G07']
      : ['V03','G04','R02','V07','G08','R05','G03'];
  return cycles[(day - 1) % cycles.length];
}

function publicExercise(row) {
  if (!row) return null;
  const { answer_key, ...safe } = row;
  return safe;
}

async function generatePlan(userId, course) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT id, language_code, goal, COALESCE(assessed_level, self_assessed_level, \'A2\') AS level, minutes_per_day, onboarding_completed_at FROM learner_courses WHERE user_id=$1 AND id=$2 FOR UPDATE',
      [userId, course.id]
    );
    const profile = rows[0];
    if (!profile) throw new Error('Learner profile is missing.');
    if (!profile.onboarding_completed_at) throw new Error('Сначала заверши настройку учебного профиля.');
    const templates = await client.query(
      `SELECT * FROM plan_templates
       WHERE status='published' AND language_code=$1 AND duration_weeks=4 AND goal IN ($2,'general')
       ORDER BY (goal=$2) DESC, updated_at DESC`,
      [profile.language_code, profile.goal || 'general']
    );
    const selectedTemplate = templates.rows.find(template =>
      (levelRank[profile.level] ?? 2) >= (levelRank[template.level_min] ?? 0) &&
      (levelRank[profile.level] ?? 2) <= (levelRank[template.level_max] ?? 6)
    );
    if (!selectedTemplate && profile.language_code !== 'en') {
      throw new Error('Для этого языка ещё не опубликована программа выбранного уровня.');
    }
    const weeklyPlan = selectedTemplate?.weekly_themes || weekThemes.map(([theme, objective], index) => ({
      theme, objective,
      tasks: Array.from({ length: 7 }, (_, day) => chooseExercise(profile.level, index * 7 + day + 1))
    }));
    await client.query('UPDATE learning_plans SET status=\'archived\' WHERE user_id=$1 AND learner_course_id=$2 AND status=\'active\'', [userId, course.id]);
    const planResult = await client.query(
      `INSERT INTO learning_plans (user_id, learner_course_id, goal, level, duration_weeks, minutes_per_day, starts_on, template_id)
       VALUES ($1,$2,$3,$4,4,$5,CURRENT_DATE,$6) RETURNING *`,
      [userId, course.id, profile.goal || 'general', profile.level, profile.minutes_per_day || 10, selectedTemplate?.id || null]
    );
    const plan = planResult.rows[0];
    for (let week = 1; week <= 4; week++) {
      const weekContent = weeklyPlan[week - 1];
      const theme = weekContent.theme;
      const objective = weekContent.objective;
      const weekResult = await client.query(
        'INSERT INTO plan_weeks (plan_id, week_number, theme, objective) VALUES ($1,$2,$3,$4) RETURNING id',
        [plan.id, week, theme, objective]
      );
      for (let dayInWeek = 1; dayInWeek <= 7; dayInWeek++) {
        const day = (week - 1) * 7 + dayInWeek;
        await client.query(
          `INSERT INTO plan_days (plan_id, week_id, day_index, main_task_id, review_item_limit, mini_prompt)
           VALUES ($1,$2,$3,$4,5,$5)`,
          [plan.id, weekResult.rows[0].id, day, weekContent.tasks?.[dayInWeek - 1] || chooseExercise(profile.level, day), (profile.language_code === 'de' ? germanMiniPrompts : miniPrompts)[(day - 1) % miniPrompts.length]]
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

router.get('/languages', (_req, res) => {
  res.json({ languages: publicLanguageCatalog() });
});

router.get('/courses', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT l.language_code, l.name_en, l.native_name, l.speech_locale, l.status AS availability,
              c.id AS course_id, c.status AS course_status, c.goal, c.self_assessed_level,
              c.assessed_level, c.onboarding_completed_at,
              (c.id=u.active_learner_course_id) AS is_active
       FROM language_catalog l
       CROSS JOIN users u
       LEFT JOIN learner_courses c ON c.user_id=u.id AND c.language_code=l.language_code
       WHERE u.id=$1 AND l.status <> 'disabled'
       ORDER BY l.sort_order`,
      [req.user.id]
    );
    res.json({ courses: rows });
  } catch (error) { next(error); }
});

router.post('/courses', async (req, res, next) => {
  const languageCode = req.body?.language_code;
  if (typeof languageCode !== 'string' || !isAvailableLanguage(languageCode)) {
    return res.status(400).json({ error: 'Этот язык пока недоступен для изучения.' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO learner_courses (user_id, language_code)
       VALUES ($1,$2)
       ON CONFLICT (user_id, language_code) DO UPDATE
         SET status='active', updated_at=NOW()
       RETURNING *`,
      [req.user.id, languageCode]
    );
    await pool.query(
      'UPDATE users SET active_learner_course_id=$2, updated_at=NOW() WHERE id=$1',
      [req.user.id, rows[0].id]
    );
    res.status(201).json({ course: rows[0], message: 'Учебный курс выбран. Настрой его и пройди тест уровня.' });
  } catch (error) { next(error); }
});

router.put('/courses/:id/activate', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users u SET active_learner_course_id=c.id, updated_at=NOW()
       FROM learner_courses c
       JOIN language_catalog l ON l.language_code=c.language_code
       WHERE u.id=$1 AND c.id=$2 AND c.user_id=u.id
         AND c.status='active' AND l.status='active'
       RETURNING c.id, c.language_code`,
      [req.user.id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Учебный курс не найден или недоступен.' });
    res.json({ ok: true, course: rows[0] });
  } catch (error) { next(error); }
});

router.get('/profile', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, p.preferred_language, p.timezone
       FROM learner_courses c
       JOIN learner_profiles p ON p.user_id=c.user_id
       WHERE c.user_id=$1 AND c.id=$2`,
      [req.user.id, req.course.id]
    );
    res.json({ profile: rows[0] || null });
  } catch (error) { next(error); }
});

router.put('/onboarding', async (req, res, next) => {
  const { goal, self_assessed_level, minutes_per_day, duration_weeks, interests, preferred_language, timezone = 'UTC' } = req.body || {};
  const goals = ['general','work','travel','exam','communication','relocation','study'];
  const levels = ['Pre-A1','A1','A2','B1','B2','C1','C2'];
  if (!goals.includes(goal)) return res.status(400).json({ error: 'Выбери цель обучения.' });
  if (self_assessed_level && !levels.includes(self_assessed_level)) return res.status(400).json({ error: 'Уровень указан некорректно.' });
  if (![5,10,15,30].includes(Number(minutes_per_day))) return res.status(400).json({ error: 'Выбери 5, 10, 15 или 30 минут.' });
  if (Number(duration_weeks) !== 4) return res.status(400).json({ error: 'В первой версии доступен четырёхнедельный план.' });
  if (!Array.isArray(interests) || interests.length > 8 || interests.some(x => typeof x !== 'string' || x.length > 40)) {
    return res.status(400).json({ error: 'Проверь список интересов.' });
  }
  if (!['ru','en'].includes(preferred_language)) return res.status(400).json({ error: 'Выбери язык интерфейса.' });
  if (typeof timezone !== 'string' || timezone.length > 80) return res.status(400).json({ error: 'Часовой пояс указан некорректно.' });
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format(new Date()); } catch { return res.status(400).json({ error: 'Часовой пояс указан некорректно.' }); }
  try {
    await pool.query(
      `UPDATE learner_courses
       SET goal=$3, self_assessed_level=$4, minutes_per_day=$5, duration_weeks=$6,
           interests=$7::jsonb, onboarding_completed_at=NOW(), updated_at=NOW()
       WHERE user_id=$1 AND id=$2`,
      [req.user.id, req.course.id, goal, self_assessed_level || null, Number(minutes_per_day), Number(duration_weeks), JSON.stringify(interests)]
    );
    await pool.query('UPDATE learner_profiles SET preferred_language=$2, timezone=$3, updated_at=NOW() WHERE user_id=$1', [req.user.id, preferred_language, timezone]);
    res.json({ ok: true, message: 'Настройки обучения сохранены.' });
  } catch (error) { next(error); }
});

router.get('/placement/questions', (req, res) => {
  const questions = placementForLanguage(req.course.language_code);
  res.json({ questions: publicQuestions(questions), language_code: req.course.language_code, note: 'Короткая предварительная оценка, не официальный сертификат CEFR.' });
});

router.post('/placement/submit', async (req, res, next) => {
  const placementQuestions = placementForLanguage(req.course.language_code);
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
      'INSERT INTO placement_attempts (user_id, learner_course_id, answers, correct_count, total_questions, estimated_level) VALUES ($1,$2,$3::jsonb,$4,$5,$6)',
      [req.user.id, req.course.id, JSON.stringify(answers), correct, placementQuestions.length, level]
    );
    await pool.query('UPDATE learner_courses SET assessed_level=$3, updated_at=NOW() WHERE user_id=$1 AND id=$2', [req.user.id, req.course.id, level]);
    const plan = await generatePlan(req.user.id, req.course);
    res.json({
      ok: true,
      result: { level, correct, total: placementQuestions.length, is_preliminary: true },
      plan: { id: plan.id, duration_weeks: plan.duration_weeks }
    });
  } catch (error) { next(error); }
});

router.post('/plan/generate', async (req, res, next) => {
  try {
    const plan = await generatePlan(req.user.id, req.course);
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
       WHERE p.user_id=$1 AND p.learner_course_id=$2 AND p.status='active'
       GROUP BY p.id ORDER BY p.created_at DESC LIMIT 1`,
      [req.user.id, req.course.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'План пока не создан. Заверши онбординг и тест.' });
    res.json({ plan: rows[0] });
  } catch (error) { next(error); }
});

router.get('/today', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id AS plan_id, p.level, p.goal, p.minutes_per_day,
              d.id AS day_id, d.day_index, d.main_task_id, d.review_item_limit, d.mini_prompt, d.completed_at,
              w.week_number, w.theme, w.objective, e.skill, e.objective AS task_objective,
              e.level AS task_level, e.estimated_time, e.instructions, e.content, e.success_criteria
       FROM learning_plans p
       JOIN plan_days d ON d.plan_id=p.id
       JOIN plan_weeks w ON w.id=d.week_id
       LEFT JOIN exercises e ON e.id=d.main_task_id
       WHERE p.user_id=$1 AND p.learner_course_id=$2 AND p.status='active'
         AND d.day_index = LEAST(GREATEST(((NOW() AT TIME ZONE (SELECT timezone FROM learner_profiles WHERE user_id=$1))::date - p.starts_on + 1), 1), 28)
       LIMIT 1`,
      [req.user.id, req.course.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Сегодняшняя задача пока недоступна. Создай учебный план.' });
    const day = rows[0];
    const review = await pool.query('SELECT COUNT(*)::int AS due_count FROM srs_items WHERE user_id=$1 AND learner_course_id=$2 AND due_at <= NOW()', [req.user.id, req.course.id]);
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
       FROM exercises WHERE language_code=$1 AND status='published' AND skill = ANY($2::text[])
         AND ($3::text IS NULL OR skill=$3)
       ORDER BY skill, level, id`,
      [req.course.language_code, skills, skills.includes(skill) ? skill : null]
    );
    res.json({ exercises: rows });
  } catch (error) { next(error); }
});

router.get('/exercises/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, skill, level, objective, instructions, content, estimated_time, tags, success_criteria, version
       FROM exercises WHERE id=$1 AND language_code=$2 AND status='published'`,
      [req.params.id, req.course.language_code]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Задание не найдено.' });
    res.json({ exercise: rows[0] });
  } catch (error) { next(error); }
});

router.post('/exercises/:id/attempts', async (req, res, next) => {
  const answer = req.body?.answer;
  if (answer === undefined || answer === null) return res.status(400).json({ error: 'Отправь ответ на задание.' });
  try {
    const { rows } = await pool.query('SELECT * FROM exercises WHERE id=$1 AND language_code=$2 AND status=\'published\'', [req.params.id, req.course.language_code]);
    const exercise = rows[0];
    if (!exercise) return res.status(404).json({ error: 'Задание не найдено.' });
    const selected = typeof answer === 'string' ? answer : answer.option_id;
    const selectedOption = exercise.content.options?.find(option => option.id === selected);
    if (!selectedOption) return res.status(400).json({ error: 'Выбери один из предложенных вариантов.' });
    const isCorrect = selected === exercise.answer_key.correct_option_id;
    const correctOption = exercise.content.options?.find(option => option.id === exercise.answer_key.correct_option_id);
    const feedback = {
      correct: isCorrect,
      correct_answer: correctOption?.text || null,
      explanation: exercise.explanation
    };
    const result = await pool.query(
      `INSERT INTO exercise_attempts (user_id, learner_course_id, exercise_id, exercise_version, answer, is_correct, score, feedback)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb) RETURNING id`,
      [req.user.id, req.course.id, exercise.id, exercise.version, JSON.stringify(answer), isCorrect, isCorrect ? 100 : 0, JSON.stringify(feedback)]
    );

    if (exercise.srs?.enabled) {
      const prompt = exercise.content.prompt || exercise.objective;
      const correctAnswer = correctOption?.text || exercise.answer_key.correct_option_id;
      await pool.query(
        `INSERT INTO srs_items (user_id, learner_course_id, item_type, item_ref, prompt, answer, explanation, due_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW() + INTERVAL '1 day')
         ON CONFLICT (user_id,learner_course_id,item_type,item_ref) DO UPDATE SET
           prompt=EXCLUDED.prompt, answer=EXCLUDED.answer, explanation=EXCLUDED.explanation, due_at=LEAST(srs_items.due_at, NOW())`,
        [req.user.id, req.course.id, exercise.srs.item_type || exercise.skill, exercise.id, prompt, correctAnswer, exercise.explanation?.ru || exercise.explanation?.en || null]
      );
    }

    if (!isCorrect && selectedOption) {
      const correction = correctOption?.text || 'Review the correct answer';
      const explanation = exercise.explanation?.en || exercise.explanation?.ru || null;
      const prior = await pool.query(
        `SELECT id FROM error_journal
         WHERE user_id=$1 AND learner_course_id=$2 AND error_type=$3 AND incorrect_form=$4 AND resolved_at IS NULL
         ORDER BY updated_at DESC LIMIT 1`,
        [req.user.id, req.course.id, exercise.skill, selectedOption.text]
      );
      if (prior.rows[0]) {
        await pool.query(
          `UPDATE error_journal SET occurrences=occurrences+1, correction=$2, explanation=$3,
           attempt_id=$4, updated_at=NOW() WHERE id=$1`,
          [prior.rows[0].id, correction, explanation, result.rows[0].id]
        );
      } else {
        await pool.query(
          `INSERT INTO error_journal (user_id, learner_course_id, attempt_id, error_type, incorrect_form, correction, explanation)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [req.user.id, req.course.id, result.rows[0].id, exercise.skill, selectedOption.text, correction, explanation]
        );
      }
    }

    await pool.query(
      `UPDATE plan_days d SET completed_at=COALESCE(d.completed_at,NOW())
       FROM learning_plans p
       WHERE d.plan_id=p.id AND p.user_id=$1 AND p.learner_course_id=$3 AND p.status='active'
         AND d.main_task_id=$2
         AND d.day_index=LEAST(GREATEST(((NOW() AT TIME ZONE (SELECT timezone FROM learner_profiles WHERE user_id=$1))::date-p.starts_on+1),1),28)`,
      [req.user.id, exercise.id, req.course.id]
    );
    await recordActivity(req.user.id, { courseId: req.course.id, minutes: exercise.estimated_time, completedTasks: 1 });
    res.json({ attempt_id: result.rows[0].id, is_correct: isCorrect, score: isCorrect ? 100 : 0, feedback });
  } catch (error) { next(error); }
});

const skillTaskIds = {
  en: new Set(['listen_cafe_01','listen_station_01','listen_weekend_01','write_invitation_01','write_opinion_01','write_summary_01','speak_hobby_01','speak_place_01','speak_technology_01']),
  de: new Set(['de_listen_cafe_01','de_listen_station_01','de_listen_weekend_01','de_write_invitation_01','de_write_opinion_01','de_write_summary_01','de_speak_hobby_01','de_speak_place_01','de_speak_technology_01','de_pronunciation_01'])
};

router.post('/skill-practice', async (req, res, next) => {
  const { skill, task_id, score = null, word_count = 0, duration_seconds = 0 } = req.body || {};
  if (!['listening','writing','speaking','pronunciation'].includes(skill) || !skillTaskIds[req.course.language_code]?.has(task_id) || (skill === 'pronunciation' && req.course.language_code !== 'de')) {
    return res.status(400).json({ error: 'Неизвестный тип или идентификатор задания.' });
  }
  if (score !== null && (!Number.isInteger(score) || score < 0 || score > 100)) {
    return res.status(400).json({ error: 'Оценка должна быть числом от 0 до 100.' });
  }
  if (!Number.isInteger(word_count) || word_count < 0 || word_count > 500) {
    return res.status(400).json({ error: 'Проверь количество слов.' });
  }
  if (!Number.isInteger(duration_seconds) || duration_seconds < 0 || duration_seconds > 1800) {
    return res.status(400).json({ error: 'Проверь длительность занятия.' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO skill_practice_attempts (user_id, learner_course_id, skill, task_id, score, word_count, duration_seconds) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [req.user.id, req.course.id, skill, task_id, score, word_count, duration_seconds]
    );
    await recordActivity(req.user.id, { courseId: req.course.id, minutes: Math.max(1, Math.round(duration_seconds / 60)), completedTasks: 1 });
    res.status(201).json({ ok: true, attempt_id: result.rows[0].id });
  } catch (error) { next(error); }
});

router.get('/skill-practice', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT skill, COUNT(*)::int AS attempts, COUNT(score)::int AS scored_attempts, COALESCE(AVG(score),0)::numeric AS average_score FROM skill_practice_attempts WHERE user_id=$1 AND learner_course_id=$2 GROUP BY skill ORDER BY skill',
      [req.user.id, req.course.id]
    );
    res.json({ skills: result.rows.map(row => ({ skill: row.skill, attempts: row.attempts, accuracy: row.scored_attempts ? Math.round(Number(row.average_score)) : null })) });
  } catch (error) { next(error); }
});
router.get('/review/queue', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, item_type, item_ref, prompt, explanation, interval_days, repetitions, due_at
       FROM srs_items WHERE user_id=$1 AND learner_course_id=$2 AND due_at <= NOW()
       ORDER BY due_at ASC LIMIT 20`,
      [req.user.id, req.course.id]
    );
    res.json({ items: rows });
  } catch (error) { next(error); }
});

router.post('/review/:id/reveal', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT answer, explanation FROM srs_items WHERE id=$1 AND user_id=$2 AND learner_course_id=$3 AND due_at <= NOW()',
      [req.params.id, req.user.id, req.course.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Карточка не найдена или ещё не готова к повторению.' });
    res.json({ answer: rows[0].answer, explanation: rows[0].explanation });
  } catch (error) { next(error); }
});

router.post('/review/:id', async (req, res, next) => {
  const rating = req.body?.rating;
  if (!['Again','Hard','Good','Easy'].includes(rating)) return res.status(400).json({ error: 'Выбери Again, Hard, Good или Easy.' });
  try {
    const { rows } = await pool.query('SELECT * FROM srs_items WHERE id=$1 AND user_id=$2 AND learner_course_id=$3', [req.params.id, req.user.id, req.course.id]);
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
       WHERE id=$1 AND user_id=$2 AND learner_course_id=$7`,
      [item.id, req.user.id, interval, repetitions, ease, rating, req.course.id]
    );
    await recordActivity(req.user.id, { courseId: req.course.id, minutes: 1, completedTasks: 0 });
    res.json({ ok: true, next_interval_days: interval, rating });
  } catch (error) { next(error); }
});

router.get('/progress', async (req, res, next) => {
  try {
    const [summary, skills, activity, errors, skillPractice] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(minutes),0)::int AS minutes,
                COALESCE(SUM(completed_tasks),0)::int AS completed_tasks,
                COUNT(*) FILTER (WHERE completed_tasks > 0)::int AS active_days
         FROM daily_activity WHERE user_id=$1 AND learner_course_id=$2`,
        [req.user.id, req.course.id]
      ),
      pool.query(
        `SELECT e.skill, COUNT(*)::int AS attempts,
                COUNT(*) FILTER (WHERE a.is_correct)::int AS correct
         FROM exercise_attempts a JOIN exercises e ON e.id=a.exercise_id
         WHERE a.user_id=$1 AND a.learner_course_id=$2 GROUP BY e.skill ORDER BY e.skill`,
        [req.user.id, req.course.id]
      ),
      pool.query(
        `SELECT activity_date, minutes, completed_tasks FROM daily_activity
         WHERE user_id=$1 AND learner_course_id=$2 AND activity_date >= CURRENT_DATE - INTERVAL '6 days'
         ORDER BY activity_date`,
        [req.user.id, req.course.id]
      ),
      pool.query('SELECT COUNT(*)::int AS open_errors FROM error_journal WHERE user_id=$1 AND learner_course_id=$2 AND resolved_at IS NULL', [req.user.id, req.course.id]),
      pool.query('SELECT skill, COUNT(*)::int AS attempts, COUNT(score)::int AS scored_attempts, COALESCE(AVG(score),0)::numeric AS average_score FROM skill_practice_attempts WHERE user_id=$1 AND learner_course_id=$2 GROUP BY skill', [req.user.id, req.course.id])
    ]);
    res.json({
      summary: { ...summary.rows[0], open_errors: errors.rows[0].open_errors },
      skills: (() => {
        const combined = new Map(skills.rows.map(row => [row.skill, {
          skill: row.skill, attempts: Number(row.attempts), scored: Number(row.attempts), weighted: Number(row.correct) * 100
        }]));
        for (const row of skillPractice.rows) {
          const current = combined.get(row.skill) || { skill: row.skill, attempts: 0, scored: 0, weighted: 0 };
          const scored = Number(row.scored_attempts);
          current.attempts += Number(row.attempts);
          current.scored += scored;
          current.weighted += Number(row.average_score) * scored;
          combined.set(row.skill, current);
        }
        return [...combined.values()].map(row => ({
          skill: row.skill, attempts: row.attempts, accuracy: row.scored ? Math.round(row.weighted / row.scored) : null
        }));
      })(),
      last_7_days: activity.rows
    });
  } catch (error) { next(error); }
});

router.get('/errors', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, error_type, incorrect_form, correction, explanation, occurrences, created_at, updated_at
       FROM error_journal WHERE user_id=$1 AND learner_course_id=$2 AND resolved_at IS NULL ORDER BY updated_at DESC LIMIT 50`,
      [req.user.id, req.course.id]
    );
    res.json({ errors: rows });
  } catch (error) { next(error); }
});

router.post('/errors/:id/resolve', async (req, res, next) => {
  try {
    const result = await pool.query(
      'UPDATE error_journal SET resolved_at=NOW(), updated_at=NOW() WHERE id=$1 AND user_id=$2 AND learner_course_id=$3 AND resolved_at IS NULL',
      [req.params.id, req.user.id, req.course.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Ошибка не найдена или уже закрыта.' });
    res.json({ ok: true });
  } catch (error) { next(error); }
});


router.get('/vocabulary', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, term, translation, part_of_speech, grammatical_gender,
              plural_form, example_sentence, notes, source, created_at, updated_at
       FROM learner_vocabulary
       WHERE user_id=$1 AND learner_course_id=$2
       ORDER BY updated_at DESC, term ASC`,
      [req.user.id, req.course.id]
    );
    res.json({ language_code: req.course.language_code, entries: rows });
  } catch (error) { next(error); }
});

router.post('/vocabulary', async (req, res, next) => {
  const body = req.body || {};
  const term = typeof body.term === 'string' ? body.term.trim() : '';
  const translation = typeof body.translation === 'string' ? body.translation.trim() : '';
  const partOfSpeech = typeof body.part_of_speech === 'string' ? body.part_of_speech.trim() : null;
  const gender = body.grammatical_gender || null;
  const pluralForm = typeof body.plural_form === 'string' ? body.plural_form.trim() : null;
  const example = typeof body.example_sentence === 'string' ? body.example_sentence.trim() : null;
  const notes = typeof body.notes === 'string' ? body.notes.trim() : null;
  if (!term || term.length > 120) return res.status(400).json({ error: 'Слово должно содержать от 1 до 120 символов.' });
  if (translation.length > 250 || (partOfSpeech && partOfSpeech.length > 50) ||
      (pluralForm && pluralForm.length > 120) || (example && example.length > 500) ||
      (notes && notes.length > 1000)) {
    return res.status(400).json({ error: 'Одно из полей словаря превышает допустимую длину.' });
  }
  if (gender && (req.course.language_code !== 'de' || !['masculine','feminine','neuter'].includes(gender))) {
    return res.status(400).json({ error: 'Укажи корректный род существительного.' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO learner_vocabulary
        (user_id, learner_course_id, term, normalized_term, translation, part_of_speech,
         grammatical_gender, plural_form, example_sentence, notes, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'manual')
       RETURNING id, term, translation, part_of_speech, grammatical_gender,
                 plural_form, example_sentence, notes, source, created_at, updated_at`,
      [req.user.id, req.course.id, term, term.normalize('NFKC').toLowerCase(),
       translation || null, partOfSpeech || null, gender, pluralForm || null, example || null, notes || null]
    );
    res.status(201).json({ entry: rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Это слово уже есть в словаре данного курса.' });
    next(error);
  }
});

router.put('/vocabulary/:id', async (req, res, next) => {
  const body = req.body || {};
  const term = typeof body.term === 'string' ? body.term.trim() : '';
  const translation = typeof body.translation === 'string' ? body.translation.trim() : '';
  const partOfSpeech = typeof body.part_of_speech === 'string' ? body.part_of_speech.trim() : null;
  const gender = body.grammatical_gender || null;
  const pluralForm = typeof body.plural_form === 'string' ? body.plural_form.trim() : null;
  const example = typeof body.example_sentence === 'string' ? body.example_sentence.trim() : null;
  const notes = typeof body.notes === 'string' ? body.notes.trim() : null;
  if (!term || term.length > 120 || translation.length > 250 ||
      (partOfSpeech && partOfSpeech.length > 50) || (pluralForm && pluralForm.length > 120) ||
      (example && example.length > 500) || (notes && notes.length > 1000)) {
    return res.status(400).json({ error: 'Проверь заполнение полей словаря.' });
  }
  if (gender && (req.course.language_code !== 'de' || !['masculine','feminine','neuter'].includes(gender))) {
    return res.status(400).json({ error: 'Укажи корректный род существительного.' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE learner_vocabulary
       SET term=$4, normalized_term=$5, translation=$6, part_of_speech=$7,
           grammatical_gender=$8, plural_form=$9, example_sentence=$10, notes=$11, updated_at=NOW()
       WHERE id=$1 AND user_id=$2 AND learner_course_id=$3
       RETURNING id, term, translation, part_of_speech, grammatical_gender,
                 plural_form, example_sentence, notes, source, created_at, updated_at`,
      [req.params.id, req.user.id, req.course.id, term, term.normalize('NFKC').toLowerCase(),
       translation || null, partOfSpeech || null, gender, pluralForm || null, example || null, notes || null]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Слово не найдено в этом учебном курсе.' });
    res.json({ entry: rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Это слово уже есть в словаре данного курса.' });
    next(error);
  }
});

router.delete('/vocabulary/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM learner_vocabulary WHERE id=$1 AND user_id=$2 AND learner_course_id=$3',
      [req.params.id, req.user.id, req.course.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Слово не найдено в этом учебном курсе.' });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

export default router;
