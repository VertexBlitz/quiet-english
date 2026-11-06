import express from 'express';
import { pool, requireDatabase, requireUser } from '../db.js';

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
      'SELECT id, skill, level, objective, estimated_time, status, version, updated_at FROM exercises ORDER BY updated_at DESC'
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
        (id,skill,level,objective,instructions,content,answer_key,explanation,estimated_time,tags,prerequisites,srs,success_criteria,status)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11,$12::jsonb,$13,'draft')
       RETURNING id,skill,level,objective,estimated_time,status,version`,
      [
        item.id,item.skill,item.level,item.objective,JSON.stringify(item.instructions),JSON.stringify(item.content),
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
      `UPDATE exercises SET skill=$2,level=$3,objective=$4,instructions=$5::jsonb,content=$6::jsonb,
       answer_key=$7::jsonb,explanation=$8::jsonb,estimated_time=$9,tags=$10,prerequisites=$11,
       srs=$12::jsonb,success_criteria=$13,version=version+1,updated_at=NOW()
       WHERE id=$1 RETURNING id,skill,level,objective,estimated_time,status,version`,
      [
        req.params.id,item.skill,item.level,item.objective,JSON.stringify(item.instructions),JSON.stringify(item.content),
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

export default router;
