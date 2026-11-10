import express from 'express';
import { pool, requireDatabase, requireUser } from '../db.js';
import { isAvailableLanguage } from '../content/languages.js';

const router = express.Router();
router.use(requireDatabase, requireUser);

router.use((req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Нет доступа к редактору контента.' });
  next();
});

const skills = ['vocabulary','grammar','reading','listening','writing','speaking','pronunciation','review'];
const levels = ['Pre-A1','A1','A2','B1','B2','C1','C2'];

function validateExercise(body, creating = false) {
  if (creating && (typeof body.id !== 'string' || !/^[A-Z0-9_-]{2,40}$/.test(body.id))) return 'ID должен содержать 2–40 заглавных латинских букв, цифр, _ или -.';
  if (!isAvailableLanguage(body.language_code || 'en')) return 'Выбери доступный язык курса.';
  if (!skills.includes(body.skill)) return 'Выбери корректный навык.';
  if (!levels.includes(body.level)) return 'Выбери уровень CEFR.';
  if (typeof body.objective !== 'string' || !body.objective.trim() || body.objective.length > 180) return 'Заполни цель задания.';
  if (!body.instructions || typeof body.instructions.ru !== 'string' || typeof body.instructions.en !== 'string') return 'Добавь инструкции на русском и английском.';
  if (!body.content || typeof body.content !== 'object' || !Array.isArray(body.content.options) || body.content.options.length < 2 || body.content.options.length > 6) return 'В этом редакторе поддерживаются задания с 2–6 вариантами ответа.';
  if (!body.answer_key || !body.content.options.some(option => option.id === body.answer_key.correct_option_id)) return 'Выбери правильный вариант из списка.';
  if (!body.explanation || typeof body.explanation.ru !== 'string' || typeof body.explanation.en !== 'string') return 'Добавь объяснение на русском и английском.';
  if (!Number.isInteger(Number(body.estimated_time)) || Number(body.estimated_time) < 1 || Number(body.estimated_time) > 30) return 'Время задания должно быть от 1 до 30 минут.';
  return null;
}

router.get('/exercises', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, language_code, skill, level, objective, estimated_time, status, version, updated_at FROM exercises ORDER BY language_code, updated_at DESC'
    );
    res.json({ exercises: rows });
  } catch (error) { next(error); }
});

router.get('/exercises/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM exercises WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Задание не найдено.' });
    res.json({ exercise: rows[0] });
  } catch (error) { next(error); }
});

router.post('/exercises', async (req, res, next) => {
  const error = validateExercise(req.body || {}, true);
  if (error) return res.status(400).json({ error });
  const item = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO exercises
        (id,language_code,skill,level,objective,instructions,content,answer_key,explanation,estimated_time,tags,prerequisites,srs,success_criteria,status)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11,$12,$13::jsonb,$14,'draft')
       RETURNING id,language_code,skill,level,objective,estimated_time,status,version`,
      [
        item.id,item.language_code || 'en',item.skill,item.level,item.objective,JSON.stringify(item.instructions),JSON.stringify(item.content),
        JSON.stringify(item.answer_key),JSON.stringify(item.explanation),Number(item.estimated_time),
        Array.isArray(item.tags) ? item.tags : [],Array.isArray(item.prerequisites) ? item.prerequisites : [],
        JSON.stringify(item.srs || {}),item.success_criteria || 'Complete the task accurately.'
      ]
    );
    res.status(201).json({ exercise: rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Упражнение с таким ID уже существует.' });
    next(error);
  }
});

router.patch('/exercises/:id', async (req, res, next) => {
  const error = validateExercise({ ...req.body, id: req.params.id });
  if (error) return res.status(400).json({ error });
  const item = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE exercises SET language_code=$2,skill=$3,level=$4,objective=$5,instructions=$6::jsonb,content=$7::jsonb,
       answer_key=$8::jsonb,explanation=$9::jsonb,estimated_time=$10,tags=$11,prerequisites=$12,
       srs=$13::jsonb,success_criteria=$14,version=version+1,updated_at=NOW()
       WHERE id=$1 RETURNING id,language_code,skill,level,objective,estimated_time,status,version`,
      [
        req.params.id,item.language_code || 'en',item.skill,item.level,item.objective,JSON.stringify(item.instructions),JSON.stringify(item.content),
        JSON.stringify(item.answer_key),JSON.stringify(item.explanation),Number(item.estimated_time),
        Array.isArray(item.tags) ? item.tags : [],Array.isArray(item.prerequisites) ? item.prerequisites : [],
        JSON.stringify(item.srs || {}),item.success_criteria || 'Complete the task accurately.'
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Задание не найдено.' });
    res.json({ exercise: rows[0] });
  } catch (error) { next(error); }
});

router.post('/exercises/:id/status', async (req, res, next) => {
  const status = req.body?.status;
  if (!['draft','review','published','archived'].includes(status)) return res.status(400).json({ error: 'Некорректный статус.' });
  try {
    const { rows } = await pool.query(
      'UPDATE exercises SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING id,status,version',
      [req.params.id,status]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Задание не найдено.' });
    res.json({ exercise: rows[0] });
  } catch (error) { next(error); }
});


const goals = ['general','work','travel','exam','communication','relocation','study'];
async function validateTemplateExerciseIds(weeklyThemes, languageCode = 'en') {
  const ids = [...new Set(weeklyThemes.flatMap(week => week.tasks || []))];
  const { rows } = await pool.query(
    "SELECT id FROM exercises WHERE language_code=$1 AND status='published' AND id = ANY($2::text[])",
    [languageCode, ids]
  );
  const available = new Set(rows.map(row => row.id));
  const missing = ids.filter(id => !available.has(id));
  return missing.length ? 'Опубликованные задания не найдены: ' + missing.join(', ') : null;
}

function validatePlanTemplate(body, creating = false) {
  if (!isAvailableLanguage(body.language_code || 'en')) return 'Выбери доступный язык курса.';
  if (creating && (typeof body.id !== 'string' || !/^[a-z0-9-]{3,60}$/.test(body.id))) return 'ID плана должен содержать 3–60 строчных латинских букв, цифр и дефисов.';
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 120) return 'Укажи название плана.';
  if (!goals.includes(body.goal)) return 'Выбери цель плана.';
  if (!levels.includes(body.level_min) || !levels.includes(body.level_max)) return 'Проверь уровни CEFR.';
  if (levels.indexOf(body.level_min) > levels.indexOf(body.level_max)) return 'Минимальный уровень не может быть выше максимального.';
  if (Number(body.duration_weeks) !== 4) return 'Для MVP доступны планы на 4 недели.';
  if (![5,10,15,30].includes(Number(body.minutes_per_day))) return 'Выбери 5, 10, 15 или 30 минут в день.';
  if (!Array.isArray(body.weekly_themes) || body.weekly_themes.length !== 4) return 'Нужно ровно 4 недельные темы.';
  for (const week of body.weekly_themes) {
    if (typeof week.theme !== 'string' || !week.theme.trim() || typeof week.objective !== 'string' || !week.objective.trim()) return 'У каждой недели должны быть тема и цель.';
    if (!Array.isArray(week.tasks) || week.tasks.length !== 7 || week.tasks.some(id => typeof id !== 'string' || !/^[A-Z0-9_-]{2,40}$/.test(id))) return 'У каждой недели должно быть 7 ID заданий.';
  }
  return null;
}

router.get('/plans', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id,language_code,title,goal,level_min,level_max,duration_weeks,minutes_per_day,status,version,updated_at FROM plan_templates ORDER BY language_code,updated_at DESC'
    );
    res.json({ plans: rows });
  } catch (error) { next(error); }
});

router.get('/plans/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM plan_templates WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Шаблон плана не найден.' });
    res.json({ plan: rows[0] });
  } catch (error) { next(error); }
});

router.post('/plans', async (req, res, next) => {
  const error = validatePlanTemplate(req.body || {}, true);
  if (error) return res.status(400).json({ error });
  const item = req.body;
  try {
    const taskError = await validateTemplateExerciseIds(item.weekly_themes, item.language_code || 'en');
    if (taskError) return res.status(400).json({ error: taskError });
    const { rows } = await pool.query(
      `INSERT INTO plan_templates (id,language_code,title,goal,level_min,level_max,duration_weeks,minutes_per_day,weekly_themes,status)
       VALUES ($1,$2,$3,$4,$5,$6,4,$7,$8::jsonb,'draft')
       RETURNING id,language_code,title,goal,level_min,level_max,duration_weeks,minutes_per_day,status,version`,
      [item.id,item.language_code || 'en',item.title,item.goal,item.level_min,item.level_max,Number(item.minutes_per_day),JSON.stringify(item.weekly_themes)]
    );
    res.status(201).json({ plan: rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Шаблон с таким ID уже существует.' });
    next(error);
  }
});

router.patch('/plans/:id', async (req, res, next) => {
  const error = validatePlanTemplate({ ...req.body, id: req.params.id });
  if (error) return res.status(400).json({ error });
  const item = req.body;
  try {
    const taskError = await validateTemplateExerciseIds(item.weekly_themes, item.language_code || 'en');
    if (taskError) return res.status(400).json({ error: taskError });
    const { rows } = await pool.query(
      `UPDATE plan_templates SET language_code=$2,title=$3,goal=$4,level_min=$5,level_max=$6,
       duration_weeks=4,minutes_per_day=$7,weekly_themes=$8::jsonb,version=version+1,updated_at=NOW()
       WHERE id=$1 RETURNING id,language_code,title,goal,level_min,level_max,duration_weeks,minutes_per_day,status,version`,
      [req.params.id,item.language_code || 'en',item.title,item.goal,item.level_min,item.level_max,Number(item.minutes_per_day),JSON.stringify(item.weekly_themes)]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Шаблон плана не найден.' });
    res.json({ plan: rows[0] });
  } catch (error) { next(error); }
});

router.post('/plans/:id/status', async (req, res, next) => {
  const status = req.body?.status;
  if (!['draft','review','published','archived'].includes(status)) return res.status(400).json({ error: 'Некорректный статус.' });
  try {
    const { rows } = await pool.query(
      'UPDATE plan_templates SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING id,status,version',
      [req.params.id,status]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Шаблон плана не найден.' });
    res.json({ plan: rows[0] });
  } catch (error) { next(error); }
});

export default router;
