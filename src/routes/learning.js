import express from 'express';
import { pool, requireDatabase, requireUser, recordActivity } from '../db.js';
import { estimateLevel, publicQuestions, placementQuestions, estimateGermanLevel, publicGermanQuestions, germanPlacementQuestions } from '../content/placement.js';
import { COURSE_LANGUAGES, COURSE_MINI_PROMPTS, getCoursePlacementQuestions, getPublicCoursePlacementQuestions, estimateCourseLevel } from '../content/multilingual-courses.js';

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
const germanMiniPrompts = {
  A1: [
    { ru:'Представься по-немецки и назови город, в котором живёшь.', en:'Introduce yourself in German and name your city.' },
    { ru:'Составь короткую просьбу с bitte.', en:'Make a short request using bitte.' },
    { ru:'Опиши свой обычный день двумя простыми предложениями.', en:'Describe your daily routine in two simple sentences.' },
    { ru:'Расскажи, что ты делал(а) вчера, используя Perfekt.', en:'Say what you did yesterday using the Perfekt.' }
  ],
  A2: [
    { ru:'Опиши недавнюю поездку и объясни, что тебе понравилось.', en:'Describe a recent trip and explain what you liked.' },
    { ru:'Сравни два способа добраться до учёбы или работы.', en:'Compare two ways of travelling to school or work.' },
    { ru:'Дай совет другу, используя solltest.', en:'Give a friend advice using solltest.' },
    { ru:'Объясни причину своего решения с weil.', en:'Explain the reason for a decision using weil.' }
  ],
  B1: [
    { ru:'Обоснуй своё мнение и приведи два аргумента.', en:'Justify your opinion and give two arguments.' },
    { ru:'Опиши проблему на работе или учёбе и предложи решение.', en:'Describe a work or study problem and suggest a solution.' },
    { ru:'Перескажи событие, используя Plusquamperfekt там, где нужно.', en:'Retell an event using the past perfect where appropriate.' },
    { ru:'Сравни два варианта и объясни последствия каждого.', en:'Compare two options and explain their consequences.' }
  ],
  B2: [
    { ru:'Сопоставь противоположные точки зрения на общественную тему.', en:'Compare opposing viewpoints on a social issue.' },
    { ru:'Сформулируй аргументированную рекомендацию в формальном стиле.', en:'Write a reasoned recommendation in a formal register.' },
    { ru:'Объясни гипотетическую ситуацию с Konjunktiv II.', en:'Explain a hypothetical situation using Konjunktiv II.' },
    { ru:'Кратко изложи сложную проблему, сохранив важные нюансы.', en:'Summarise a complex issue while preserving key nuances.' }
  ],
  C1: [
    { ru:'Проанализируй аргумент автора и оцени качество доказательств.', en:'Analyse an author’s argument and assess the evidence.' },
    { ru:'Сформулируй нейтральное резюме формального сообщения.', en:'Produce a neutral summary of a formal statement.' },
    { ru:'Объясни сложную причинно-следственную связь точными связками.', en:'Explain a complex causal relationship with precise connectors.' },
    { ru:'Переформулируй разговорное высказывание в академическом стиле.', en:'Rephrase an informal statement in an academic register.' }
  ],
  C2: [
    { ru:'Разбери тонкие смысловые различия между двумя близкими позициями.', en:'Analyse subtle distinctions between two closely related positions.' },
    { ru:'Сформулируй сбалансированный вывод с учётом контраргументов.', en:'Formulate a balanced conclusion that accounts for counterarguments.' },
    { ru:'Перепиши мысль для официальной, академической и разговорной аудитории.', en:'Adapt an idea for formal, academic and conversational audiences.' },
    { ru:'Оцени риторический приём и его влияние на интерпретацию текста.', en:'Assess a rhetorical device and its effect on interpretation.' }
  ]
};

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

async function generatePlan(userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT lp.timezone, llp.goal,
              COALESCE(llp.assessed_level, llp.self_assessed_level, 'A2') AS level,
              llp.minutes_per_day, llp.onboarding_completed_at, llp.language_code
       FROM learner_profiles lp
       JOIN learner_language_profiles llp
         ON llp.user_id=lp.user_id AND llp.language_code=lp.active_learning_language_code
       WHERE lp.user_id=$1
       FOR UPDATE OF llp`,
      [userId]
    );
    const profile = rows[0];
    if (!profile) throw new Error('Learner profile is missing.');
    if (!profile.onboarding_completed_at) throw new Error('Сначала заверши настройку учебного профиля.');
    const templates = await client.query(
      `SELECT * FROM plan_templates
       WHERE status='published' AND language_code=$1 AND duration_weeks=4
         AND goal IN ($2,'general')
       ORDER BY (goal=$2) DESC, updated_at DESC`,
      [profile.language_code, profile.goal || 'general']
    );
    const selectedTemplate = templates.rows.find(template =>
      (levelRank[profile.level] ?? 2) >= (levelRank[template.level_min] ?? 0) &&
      (levelRank[profile.level] ?? 2) <= (levelRank[template.level_max] ?? 6)
    );
    if (!selectedTemplate && profile.language_code !== 'en') {
      throw new Error('Для выбранного языка ещё не подготовлена программа обучения.');
    }
    const weeklyPlan = selectedTemplate?.weekly_themes || weekThemes.map(([theme, objective], index) => ({
      theme, objective,
      tasks: Array.from({ length: 7 }, (_, day) => chooseExercise(profile.level, index * 7 + day + 1))
    }));
    await client.query(
      "UPDATE learning_plans SET status='archived' WHERE user_id=$1 AND language_code=$2 AND status='active'",
      [userId, profile.language_code]
    );
    const planResult = await client.query(
      `INSERT INTO learning_plans
         (user_id, language_code, goal, level, duration_weeks, minutes_per_day, starts_on, template_id)
       VALUES ($1,$2,$3,$4,4,$5,(NOW() AT TIME ZONE $6)::date,$7) RETURNING *`,
      [userId, profile.language_code, profile.goal || 'general', profile.level,
        profile.minutes_per_day || 10, profile.timezone || 'UTC', selectedTemplate?.id || null]
    );
    const plan = planResult.rows[0];
    for (let week = 1; week <= 4; week++) {
      const weekContent = weeklyPlan[week - 1];
      const theme = weekContent.theme_ru || weekContent.theme;
      const objective = weekContent.objective || weekContent.objective_ru || '';
      const weekResult = await client.query(
        `INSERT INTO plan_weeks
           (plan_id,week_number,theme,objective,theme_ru,theme_en,objective_ru,objective_en)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [plan.id, week, theme, objective, weekContent.theme_ru || theme,
          weekContent.theme_en || theme, weekContent.objective || objective,
          weekContent.objective_en || objective]
      );
      for (let dayInWeek = 1; dayInWeek <= 7; dayInWeek++) {
        const day = (week - 1) * 7 + dayInWeek;
        const coursePrompts = COURSE_MINI_PROMPTS[profile.language_code];
        const miniPrompt = profile.language_code === 'de'
          ? (germanMiniPrompts[profile.level] || germanMiniPrompts.A1)[(day - 1) % 4]
          : coursePrompts
            ? {
                ru: 'Ответь на ' + (COURSE_LANGUAGES[profile.language_code]?.englishName || 'изучаемом языке') + ': ' + coursePrompts[(day - 1) % coursePrompts.length],
                en: 'Respond in ' + (COURSE_LANGUAGES[profile.language_code]?.englishName || 'the target language') + ': ' + coursePrompts[(day - 1) % coursePrompts.length]
              }
            : { ru: miniPrompts[(day - 1) % miniPrompts.length], en: miniPrompts[(day - 1) % miniPrompts.length] };
        await client.query(
          `INSERT INTO plan_days
             (plan_id,week_id,day_index,main_task_id,review_item_limit,mini_prompt,mini_prompt_ru,mini_prompt_en)
           VALUES ($1,$2,$3,$4,5,$5,$6,$7)`,
          [plan.id, weekResult.rows[0].id, day,
            weekContent.tasks?.[dayInWeek - 1] || chooseExercise(profile.level, day),
            miniPrompt.ru, miniPrompt.ru, miniPrompt.en]
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

router.get('/languages', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT l.language_code, l.english_name, l.native_name, l.locale,
              l.text_direction, l.course_status, l.speech_supported, l.content_version,
              (l.language_code = (
                SELECT active_learning_language_code FROM learner_profiles WHERE user_id=$1
              )) AS is_active,
              COALESCE(p.learning_status, 'not_started') AS learning_status,
              p.self_assessed_level, p.assessed_level, p.onboarding_completed_at
       FROM study_languages l
       LEFT JOIN learner_language_profiles p
         ON p.user_id=$1 AND p.language_code=l.language_code
       WHERE l.course_status <> 'disabled'
       ORDER BY l.sort_order, l.english_name`,
      [req.user.id]
    );
    res.json({ languages: rows });
  } catch (error) { next(error); }
});

router.post('/languages/enroll', async (req, res, next) => {
  const code = typeof req.body?.language_code === 'string'
    ? req.body.language_code.trim().toLowerCase()
    : '';
  if (!/^[a-z]{2}$/.test(code)) return res.status(400).json({ error: 'Выбери изучаемый язык.' });
  try {
    const { rows } = await pool.query(
      "SELECT language_code, course_status FROM study_languages WHERE language_code=$1",
      [code]
    );
    if (!rows[0] || rows[0].course_status !== 'available') {
      return res.status(409).json({ error: 'Этот учебный курс пока готовится. Сейчас доступен только английский.' });
    }
    await pool.query(
      `INSERT INTO learner_language_profiles (user_id, language_code, goal, learning_status)
       VALUES ($1,$2,'general','not_started')
       ON CONFLICT (user_id,language_code) DO NOTHING`,
      [req.user.id, code]
    );
    await pool.query(
      `UPDATE learner_profiles p SET
         active_learning_language_code=$2,
         goal=llp.goal,
         self_assessed_level=llp.self_assessed_level,
         assessed_level=llp.assessed_level,
         minutes_per_day=llp.minutes_per_day,
         duration_weeks=llp.duration_weeks,
         interests=llp.interests,
         onboarding_completed_at=llp.onboarding_completed_at,
         updated_at=NOW()
       FROM learner_language_profiles llp
       WHERE p.user_id=$1 AND llp.user_id=p.user_id AND llp.language_code=$2`,
      [req.user.id, code]
    );
    res.status(201).json({ ok: true, active_language_code: code });
  } catch (error) { next(error); }
});

router.post('/languages/activate', async (req, res, next) => {
  const code = typeof req.body?.language_code === 'string'
    ? req.body.language_code.trim().toLowerCase()
    : '';
  if (!/^[a-z]{2}$/.test(code)) return res.status(400).json({ error: 'Выбери изучаемый язык.' });
  try {
    const { rows } = await pool.query(
      `SELECT course_status FROM study_languages WHERE language_code=$1`,
      [code]
    );
    if (!rows[0] || rows[0].course_status !== 'available') {
      return res.status(409).json({ error: 'Для этого языка учебный курс пока недоступен.' });
    }
    await pool.query(
      `INSERT INTO learner_language_profiles (user_id,language_code,goal,learning_status)
       VALUES ($1,$2,'general','not_started')
       ON CONFLICT (user_id,language_code) DO NOTHING`,
      [req.user.id, code]
    );
    await pool.query(
      `UPDATE learner_profiles p SET
         active_learning_language_code=$2,
         goal=llp.goal,
         self_assessed_level=llp.self_assessed_level,
         assessed_level=llp.assessed_level,
         minutes_per_day=llp.minutes_per_day,
         duration_weeks=llp.duration_weeks,
         interests=llp.interests,
         onboarding_completed_at=llp.onboarding_completed_at,
         updated_at=NOW()
       FROM learner_language_profiles llp
       WHERE p.user_id=$1 AND llp.user_id=p.user_id AND llp.language_code=$2`,
      [req.user.id, code]
    );
    res.json({ ok: true, active_language_code: code });
  } catch (error) { next(error); }
});

router.get('/profile', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM learner_profiles WHERE user_id=$1', [req.user.id]);
    res.json({ profile: rows[0] || null });
  } catch (error) { next(error); }
});

router.put('/onboarding', async (req, res, next) => {
  const {
    goal, self_assessed_level, minutes_per_day, duration_weeks, interests,
    preferred_language, language_code = 'en', timezone = 'UTC'
  } = req.body || {};
  const goals = ['general','work','travel','exam','communication','relocation','study'];
  const levels = ['Pre-A1','A1','A2','B1','B2','C1','C2'];
  if (!goals.includes(goal)) return res.status(400).json({ error: 'Выбери цель обучения.' });
  if (self_assessed_level && !levels.includes(self_assessed_level)) return res.status(400).json({ error: 'Уровень указан некорректно.' });
  if (language_code === 'de' && self_assessed_level === 'Pre-A1') {
    return res.status(400).json({ error: 'Немецкая программа начинается с A1. Выбери A1 или пройди тест уровня.' });
  }
  if (![5,10,15,30].includes(Number(minutes_per_day))) return res.status(400).json({ error: 'Выбери 5, 10, 15 или 30 минут.' });
  if (Number(duration_weeks) !== 4) return res.status(400).json({ error: 'В первой версии доступен четырёхнедельный план.' });
  if (!Array.isArray(interests) || interests.length > 8 || interests.some(x => typeof x !== 'string' || x.length > 40)) {
    return res.status(400).json({ error: 'Проверь список интересов.' });
  }
  if (!['ru','en'].includes(preferred_language)) return res.status(400).json({ error: 'Выбери язык интерфейса.' });
  if (typeof language_code !== 'string' || !/^[a-z]{2}$/.test(language_code)) {
    return res.status(400).json({ error: 'Выбери изучаемый язык.' });
  }
  if (typeof timezone !== 'string' || timezone.length > 80) return res.status(400).json({ error: 'Часовой пояс указан некорректно.' });
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format(new Date()); } catch { return res.status(400).json({ error: 'Часовой пояс указан некорректно.' }); }
  try {
    const course = await pool.query(
      "SELECT course_status FROM study_languages WHERE language_code=$1",
      [language_code]
    );
    if (!course.rows[0] || course.rows[0].course_status !== 'available') {
      return res.status(409).json({ error: 'Этот учебный курс пока готовится. Сейчас доступен только английский.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO learner_language_profiles
           (user_id,language_code,goal,self_assessed_level,minutes_per_day,duration_weeks,interests,
            learning_status,onboarding_completed_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,'in_progress',NOW(),NOW())
         ON CONFLICT (user_id,language_code) DO UPDATE SET
           goal=EXCLUDED.goal, self_assessed_level=EXCLUDED.self_assessed_level,
           minutes_per_day=EXCLUDED.minutes_per_day, duration_weeks=EXCLUDED.duration_weeks,
           interests=EXCLUDED.interests, learning_status='in_progress',
           onboarding_completed_at=NOW(), updated_at=NOW()`,
        [req.user.id, language_code, goal, self_assessed_level || null,
          Number(minutes_per_day), Number(duration_weeks), JSON.stringify(interests)]
      );
      await client.query(
        `UPDATE learner_profiles
         SET goal=$2, self_assessed_level=$3, minutes_per_day=$4, duration_weeks=$5,
             interests=$6::jsonb, preferred_language=$7, timezone=$8,
             active_learning_language_code=$9, onboarding_completed_at=NOW(), updated_at=NOW()
         WHERE user_id=$1`,
        [req.user.id, goal, self_assessed_level || null, Number(minutes_per_day),
          Number(duration_weeks), JSON.stringify(interests), preferred_language, timezone, language_code]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    res.json({ ok: true, message: 'Настройки обучения сохранены.', language_code });
  } catch (error) { next(error); }
});

router.get('/placement/questions', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT active_learning_language_code FROM learner_profiles WHERE user_id=$1',
      [req.user.id]
    );
    const languageCode = rows[0]?.active_learning_language_code || 'en';
    if (languageCode === 'de') {
      return res.json({
        language_code: 'de',
        questions: publicGermanQuestions(),
        note: 'Предварительная оценка немецкого A1–C2. Это не официальный сертификат CEFR.'
      });
    }
    if (languageCode !== 'en') {
      const questions = getPublicCoursePlacementQuestions(languageCode);
      if (!questions) return res.status(409).json({ error: 'Тест уровня для выбранного языка ещё готовится.' });
      const languageName = COURSE_LANGUAGES[languageCode]?.englishName || languageCode;
      return res.json({
        language_code: languageCode,
        questions,
        note: 'Предварительная оценка ' + languageName + ' A1–C2. Это не официальный сертификат CEFR.'
      });
    }
    res.json({ language_code: 'en', questions: publicQuestions(), note: 'Короткая предварительная оценка, не официальный сертификат CEFR.' });
  } catch (error) { next(error); }
});

router.post('/placement/submit', async (req, res, next) => {
  const answers = req.body?.answers;
  try {
    const active = await pool.query(
      'SELECT active_learning_language_code FROM learner_profiles WHERE user_id=$1',
      [req.user.id]
    );
    const languageCode = active.rows[0]?.active_learning_language_code || 'en';
    const questions = languageCode === 'de'
      ? germanPlacementQuestions
      : languageCode === 'en' ? placementQuestions : getCoursePlacementQuestions(languageCode);
    if (!questions) return res.status(409).json({ error: 'Тест уровня для выбранного языка ещё готовится.' });
    if (!Array.isArray(answers) || answers.length !== questions.length) {
      return res.status(400).json({ error: 'Ответь на все вопросы теста.' });
    }
    const answerMap = new Map(answers.map(item => [item?.id, item?.option_id]));
    if (questions.some(q => !answerMap.has(q.id))) return res.status(400).json({ error: 'В ответах отсутствуют вопросы.' });
    const correct = questions.filter(q => answerMap.get(q.id) === q.answer).length;
    const level = languageCode === 'de'
      ? estimateGermanLevel(correct, answers)
      : languageCode === 'en' ? estimateLevel(correct) : estimateCourseLevel(languageCode, answers);
    await pool.query(
      'INSERT INTO placement_attempts (user_id, language_code, answers, correct_count, total_questions, estimated_level) VALUES ($1,$2,$3::jsonb,$4,$5,$6)',
      [req.user.id, languageCode, JSON.stringify(answers), correct, questions.length, level]
    );
    await pool.query(
      'UPDATE learner_language_profiles SET assessed_level=$3, updated_at=NOW() WHERE user_id=$1 AND language_code=$2',
      [req.user.id, languageCode, level]
    );
    await pool.query('UPDATE learner_profiles SET assessed_level=$2, updated_at=NOW() WHERE user_id=$1', [req.user.id, level]);
    const plan = await generatePlan(req.user.id);
    res.json({
      ok: true,
      result: { level, correct, total: questions.length, is_preliminary: true },
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
         'week_number', w.week_number,
         'theme', json_build_object('ru',COALESCE(w.theme_ru,w.theme),'en',COALESCE(w.theme_en,w.theme)),
         'objective', json_build_object('ru',COALESCE(w.objective_ru,w.objective),'en',COALESCE(w.objective_en,w.objective))
       ) ORDER BY w.week_number) AS weeks
       FROM learning_plans p LEFT JOIN plan_weeks w ON w.plan_id=p.id
       WHERE p.user_id=$1 AND p.status='active'
         AND p.language_code=(SELECT active_learning_language_code FROM learner_profiles WHERE user_id=$1)
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
              d.id AS day_id, d.day_index, d.main_task_id, d.review_item_limit,
              json_build_object('ru',COALESCE(d.mini_prompt_ru,d.mini_prompt),'en',COALESCE(d.mini_prompt_en,d.mini_prompt)) AS mini_prompt,
              d.completed_at,
              w.week_number,
              json_build_object('ru',COALESCE(w.theme_ru,w.theme),'en',COALESCE(w.theme_en,w.theme)) AS theme,
              json_build_object('ru',COALESCE(w.objective_ru,w.objective),'en',COALESCE(w.objective_en,w.objective)) AS objective,
              e.skill, COALESCE(NULLIF(e.objective_i18n,'{}'::jsonb),to_jsonb(e.objective)) AS task_objective,
              e.level AS task_level, e.estimated_time, e.instructions, e.content, e.success_criteria
       FROM learning_plans p
       JOIN plan_days d ON d.plan_id=p.id
       JOIN plan_weeks w ON w.id=d.week_id
       LEFT JOIN exercises e ON e.id=d.main_task_id
       WHERE p.user_id=$1 AND p.status='active'
         AND p.language_code=(SELECT active_learning_language_code FROM learner_profiles WHERE user_id=$1)
         AND d.day_index = LEAST(GREATEST(((NOW() AT TIME ZONE (SELECT timezone FROM learner_profiles WHERE user_id=$1))::date - p.starts_on + 1), 1), 28)
       LIMIT 1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Сегодняшняя задача пока недоступна. Создай учебный план.' });
    const day = rows[0];
    const review = await pool.query(
      `SELECT COUNT(*)::int AS due_count FROM srs_items
       WHERE user_id=$1 AND language_code=(SELECT active_learning_language_code FROM learner_profiles WHERE user_id=$1)
         AND due_at <= NOW()`,
      [req.user.id]
    );
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
  const skills = ['vocabulary','grammar','reading','communication'];
  const skill = req.query.skill;
  try {
    const { rows } = await pool.query(
      `SELECT id, skill, level, COALESCE(NULLIF(objective_i18n,'{}'::jsonb),to_jsonb(objective)) AS objective, instructions, content, estimated_time, tags, success_criteria
       FROM exercises WHERE status='published' AND skill = ANY($1::text[])
         AND language_code=(SELECT active_learning_language_code FROM learner_profiles WHERE user_id=$3)
         AND ($2::text IS NULL OR skill=$2)
       ORDER BY skill, level, id`,
      [skills, skills.includes(skill) ? skill : null, req.user.id]
    );
    res.json({ exercises: rows });
  } catch (error) { next(error); }
});

router.get('/exercises/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, skill, level, COALESCE(NULLIF(objective_i18n,'{}'::jsonb),to_jsonb(objective)) AS objective, instructions, content, estimated_time, tags, success_criteria, version
       FROM exercises WHERE id=$1 AND status='published'
         AND language_code=(SELECT active_learning_language_code FROM learner_profiles WHERE user_id=$2)`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Задание не найдено.' });
    res.json({ exercise: rows[0] });
  } catch (error) { next(error); }
});

router.post('/exercises/:id/attempts', async (req, res, next) => {
  const answer = req.body?.answer;
  if (answer === undefined || answer === null) return res.status(400).json({ error: 'Отправь ответ на задание.' });
  try {
    const { rows } = await pool.query(
      `SELECT * FROM exercises WHERE id=$1 AND status='published'
       AND language_code=(SELECT active_learning_language_code FROM learner_profiles WHERE user_id=$2)`,
      [req.params.id, req.user.id]
    );
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
      `INSERT INTO exercise_attempts
         (user_id, language_code, exercise_id, exercise_version, answer, is_correct, score, feedback)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb) RETURNING id`,
      [req.user.id, exercise.language_code, exercise.id, exercise.version,
        JSON.stringify(answer), isCorrect, isCorrect ? 100 : 0, JSON.stringify(feedback)]
    );

    if (exercise.srs?.enabled) {
      const prompt = exercise.content.prompt || exercise.objective;
      const correctAnswer = correctOption?.text || exercise.answer_key.correct_option_id;
      await pool.query(
        `INSERT INTO srs_items (user_id, language_code, item_type, item_ref, prompt, answer, explanation, due_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW() + INTERVAL '1 day')
         ON CONFLICT (user_id,language_code,item_type,item_ref) DO UPDATE SET
           prompt=EXCLUDED.prompt, answer=EXCLUDED.answer, explanation=EXCLUDED.explanation, due_at=LEAST(srs_items.due_at, NOW())`,
        [req.user.id, exercise.language_code, exercise.srs.item_type || exercise.skill,
          exercise.id, prompt, correctAnswer, exercise.explanation?.en || exercise.explanation?.ru || null]
      );
    }

    if (!isCorrect && selectedOption) {
      const correction = correctOption?.text || 'Review the correct answer';
      const explanation = exercise.explanation?.en || exercise.explanation?.ru || null;
      const prior = await pool.query(
        `SELECT id FROM error_journal
         WHERE user_id=$1 AND language_code=$4 AND error_type=$2 AND incorrect_form=$3 AND resolved_at IS NULL
         ORDER BY updated_at DESC LIMIT 1`,
        [req.user.id, exercise.skill, selectedOption.text, exercise.language_code]
      );
      if (prior.rows[0]) {
        await pool.query(
          `UPDATE error_journal SET occurrences=occurrences+1, correction=$2, explanation=$3,
           attempt_id=$4, updated_at=NOW() WHERE id=$1`,
          [prior.rows[0].id, correction, explanation, result.rows[0].id]
        );
      } else {
        await pool.query(
          `INSERT INTO error_journal
             (user_id, language_code, attempt_id, error_type, incorrect_form, correction, explanation)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [req.user.id, exercise.language_code, result.rows[0].id, exercise.skill,
            selectedOption.text, correction, explanation]
        );
      }
    }

    await pool.query(
      `UPDATE plan_days d SET completed_at=COALESCE(d.completed_at,NOW())
       FROM learning_plans p
       WHERE d.plan_id=p.id AND p.user_id=$1 AND p.status='active'
         AND p.language_code=(SELECT active_learning_language_code FROM learner_profiles WHERE user_id=$1)
         AND d.main_task_id=$2
         AND d.day_index=LEAST(GREATEST(((NOW() AT TIME ZONE (SELECT timezone FROM learner_profiles WHERE user_id=$1))::date-p.starts_on+1),1),28)`,
      [req.user.id, exercise.id]
    );
    await recordActivity(req.user.id, { minutes: exercise.estimated_time, completedTasks: 1, languageCode: exercise.language_code });
    res.json({ attempt_id: result.rows[0].id, is_correct: isCorrect, score: isCorrect ? 100 : 0, feedback });
  } catch (error) { next(error); }
});

router.get('/review/queue', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, item_type, item_ref, prompt, explanation, interval_days, repetitions, due_at
       FROM srs_items WHERE user_id=$1
         AND language_code=(SELECT active_learning_language_code FROM learner_profiles WHERE user_id=$1)
         AND due_at <= NOW()
       ORDER BY due_at ASC LIMIT 20`,
      [req.user.id]
    );
    res.json({ items: rows });
  } catch (error) { next(error); }
});

router.post('/review/:id/reveal', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT answer, explanation FROM srs_items WHERE id=$1 AND user_id=$2
       AND language_code=(SELECT active_learning_language_code FROM learner_profiles WHERE user_id=$2)
       AND due_at <= NOW()`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Карточка не найдена или ещё не готова к повторению.' });
    res.json({ answer: rows[0].answer, explanation: rows[0].explanation });
  } catch (error) { next(error); }
});

router.post('/review/:id', async (req, res, next) => {
  const rating = req.body?.rating;
  if (!['Again','Hard','Good','Easy'].includes(rating)) return res.status(400).json({ error: 'Выбери Again, Hard, Good или Easy.' });
  try {
    const { rows } = await pool.query(
      `SELECT * FROM srs_items WHERE id=$1 AND user_id=$2
       AND language_code=(SELECT active_learning_language_code FROM learner_profiles WHERE user_id=$2)`,
      [req.params.id, req.user.id]
    );
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
       WHERE id=$1 AND user_id=$2
         AND language_code=(SELECT active_learning_language_code FROM learner_profiles WHERE user_id=$2)`,
      [item.id, req.user.id, interval, repetitions, ease, rating]
    );
    await recordActivity(req.user.id, { minutes: 1, completedTasks: 0, languageCode: req.studyLanguageCode });
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
         FROM daily_activity WHERE user_id=$1
           AND language_code=(SELECT active_learning_language_code FROM learner_profiles WHERE user_id=$1)`,
        [req.user.id]
      ),
      pool.query(
        `SELECT e.skill, COUNT(*)::int AS attempts,
                COUNT(*) FILTER (WHERE a.is_correct)::int AS correct
         FROM exercise_attempts a JOIN exercises e ON e.id=a.exercise_id
         WHERE a.user_id=$1
           AND a.language_code=(SELECT active_learning_language_code FROM learner_profiles WHERE user_id=$1)
         GROUP BY e.skill ORDER BY e.skill`,
        [req.user.id]
      ),
      pool.query(
        `SELECT activity_date, minutes, completed_tasks FROM daily_activity
         WHERE user_id=$1
           AND language_code=(SELECT active_learning_language_code FROM learner_profiles WHERE user_id=$1)
           AND activity_date >= CURRENT_DATE - INTERVAL '6 days'
         ORDER BY activity_date`,
        [req.user.id]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS open_errors FROM error_journal WHERE user_id=$1
         AND language_code=(SELECT active_learning_language_code FROM learner_profiles WHERE user_id=$1)
         AND resolved_at IS NULL`,
        [req.user.id]
      )
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
       FROM error_journal WHERE user_id=$1
         AND language_code=(SELECT active_learning_language_code FROM learner_profiles WHERE user_id=$1)
         AND resolved_at IS NULL ORDER BY updated_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ errors: rows });
  } catch (error) { next(error); }
});

router.post('/errors/:id/resolve', async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE error_journal SET resolved_at=NOW(), updated_at=NOW()
       WHERE id=$1 AND user_id=$2
         AND language_code=(SELECT active_learning_language_code FROM learner_profiles WHERE user_id=$2)
         AND resolved_at IS NULL`,
      [req.params.id, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Ошибка не найдена или уже закрыта.' });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

export default router;
