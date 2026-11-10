import express from 'express';
import { rateLimit } from 'express-rate-limit';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { pool } from './src/db.js';
import authRoutes from './src/routes/auth.js';
import learningRoutes from './src/routes/learning.js';
import adminRoutes from './src/routes/admin.js';
import { estimateLevel, placementForLanguage, publicQuestions } from './src/content/placement.js';
import { isAvailableLanguage } from './src/content/languages.js';

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));
const demoExerciseCatalog = [
  ...JSON.parse(readFileSync(path.join(root, 'content/seed-exercises.json'), 'utf8')).map(item => ({ ...item, language_code: 'en' })),
  ...JSON.parse(readFileSync(path.join(root, 'content/seed-exercises.de.json'), 'utf8'))
];
const port = Number(process.env.PORT) || 3000;
const PgSession = connectPgSimple(session);

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '24kb' }));
app.use('/api/', rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false
}));

const sessionsConfigured = Boolean(pool && process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32);
if (sessionsConfigured) {
  app.use(session({
    store: new PgSession({
      pool,
      tableName: 'user_sessions',
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 15
    }),
    name: 'qe.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 14
    }
  }));
}

const publicDemoExercise = exercise => {
  if (!exercise) return null;
  const { answer_key, ...safe } = exercise;
  return safe;
};

// Guest demo endpoints are stateless: no user account, email, session or database writes.
app.get('/api/demo/placement/questions', (req, res) => {
  const languageCode = req.get('x-qe-language') || req.query.language_code || 'en';
  const questions = placementForLanguage(isAvailableLanguage(languageCode) ? languageCode : 'en');
  res.json({
    questions: publicQuestions(questions),
    language_code: isAvailableLanguage(languageCode) ? languageCode : 'en',
    note: 'Короткая предварительная оценка, не официальный сертификат CEFR.'
  });
});

app.post('/api/demo/placement/submit', sameOrigin, (req, res) => {
  const languageCode = req.body?.language_code;
  if (!isAvailableLanguage(languageCode)) return res.status(400).json({ error: 'Этот язык пока недоступен.' });
  const placementQuestions = placementForLanguage(languageCode);
  const answers = req.body?.answers;
  if (!Array.isArray(answers) || answers.length !== placementQuestions.length) {
    return res.status(400).json({ error: 'Ответь на все вопросы теста.' });
  }
  const answerMap = new Map(answers.map(item => [item?.id, item?.option_id]));
  if (placementQuestions.some(question => !answerMap.has(question.id))) {
    return res.status(400).json({ error: 'В ответах отсутствуют вопросы.' });
  }
  const correct = placementQuestions.filter(question => answerMap.get(question.id) === question.answer).length;
  const level = estimateLevel(correct);
  res.json({
    ok: true,
    result: { level, correct, total: placementQuestions.length, is_preliminary: true }
  });
});

app.get('/api/demo/exercises', (req, res) => {
  const allowedSkills = ['vocabulary', 'grammar', 'reading'];
  const requestedSkill = req.query.skill;
  const languageCode = req.get('x-qe-language') || req.query.language_code || 'en';
  if (!isAvailableLanguage(languageCode)) return res.status(400).json({ error: 'Этот язык пока недоступен.' });
  const exercises = demoExerciseCatalog
    .filter(exercise => exercise.language_code === languageCode)
    .filter(exercise => allowedSkills.includes(exercise.skill))
    .filter(exercise => !requestedSkill || exercise.skill === requestedSkill)
    .map(publicDemoExercise);
  res.json({ exercises });
});

app.get('/api/demo/exercises/:id', (req, res) => {
  const languageCode = req.get('x-qe-language') || req.query.language_code || 'en';
  const exercise = demoExerciseCatalog.find(item => item.id === req.params.id && item.language_code === languageCode);
  if (!exercise || !['vocabulary', 'grammar', 'reading'].includes(exercise.skill)) {
    return res.status(404).json({ error: 'Задание не найдено.' });
  }
  res.json({ exercise: publicDemoExercise(exercise) });
});

app.post('/api/demo/exercises/:id/attempts', sameOrigin, (req, res) => {
  const languageCode = req.get('x-qe-language') || req.body?.language_code || 'en';
  const exercise = demoExerciseCatalog.find(item => item.id === req.params.id && item.language_code === languageCode);
  if (!exercise || !['vocabulary', 'grammar', 'reading'].includes(exercise.skill)) {
    return res.status(404).json({ error: 'Задание не найдено.' });
  }
  const answer = req.body?.answer;
  const selected = typeof answer === 'string' ? answer : answer?.option_id;
  const selectedOption = exercise.content?.options?.find(option => option.id === selected);
  if (!selectedOption) return res.status(400).json({ error: 'Выбери один из предложенных вариантов.' });
  const isCorrect = selected === exercise.answer_key?.correct_option_id;
  const correctOption = exercise.content.options.find(option => option.id === exercise.answer_key.correct_option_id);
  res.json({
    is_correct: isCorrect,
    score: isCorrect ? 100 : 0,
    feedback: {
      correct: isCorrect,
      correct_answer: correctOption?.text || null,
      explanation: exercise.explanation,
      success_criteria: exercise.success_criteria
    },
    practice_only: true
  });
});

function sameOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  const base = process.env.APP_BASE_URL;
  if (!origin || !base) {
    return res.status(403).json({ error: 'Запрос должен быть отправлен с официального адреса сайта.' });
  }
  try {
    if (new URL(origin).origin !== new URL(base).origin) {
      return res.status(403).json({ error: 'Источник запроса не разрешён.' });
    }
  } catch {
    return res.status(403).json({ error: 'Проверь APP_BASE_URL в настройках сервера.' });
  }
  next();
}

if (sessionsConfigured) {
  app.use('/api/auth', sameOrigin, authRoutes);
  app.use('/api/learning', sameOrigin, learningRoutes);
  app.use('/api/admin', sameOrigin, adminRoutes);
} else {
  const notReady = (_req, res) => res.status(503).json({
    error: 'Личный кабинет ещё не настроен. Нужны DATABASE_URL и SESSION_SECRET.'
  });
  app.use('/api/auth', notReady);
  app.use('/api/learning', notReady);
  app.use('/api/admin', notReady);
}

const MODEL = process.env.CLOUDFLARE_MODEL || '@cf/google/gemma-4-26b-a4b-it';
const SYSTEM_PROMPTS = {
  en: [
    'You are a kind, patient English tutor for a general-audience learning website.',
    'Help with natural English conversation, grammar, vocabulary, reading and writing.',
    'Keep every response age-appropriate, respectful and safe.',
    'Use English by default. If a learner writes in Russian or seems confused, explain briefly in Russian and give one simple English example.',
    'When correcting English, first respond to the meaning, then show a natural correction and one short explanation.',
    'Keep answers focused and ask at most one follow-up question at a time.',
    'Do not claim to hear audio or see files unless they were actually supplied.'
  ].join(' '),
  de: [
    'Du bist ein freundlicher, geduldiger Deutschlehrer für eine Lernplattform für ein allgemeines Publikum.',
    'Hilf beim natürlichen deutschen Sprachgebrauch, bei Grammatik, Wortschatz, Lesen und Schreiben.',
    'Antworte standardmäßig auf Deutsch. Wenn Lernende auf Russisch schreiben oder etwas nicht verstehen, erkläre es kurz auf Russisch und gib ein einfaches deutsches Beispiel.',
    'Achte besonders auf Artikel und Genus, Kasus, Deklination, Verbposition, trennbare Verben, Zeiten und idiomatische Formulierungen.',
    'Bei Korrekturen reagiere zuerst auf die Aussage, zeige dann eine natürliche deutsche Formulierung und erkläre einen wichtigen Punkt kurz.',
    'Bleibe respektvoll, altersgerecht und konzentriert. Stelle höchstens eine Rückfrage gleichzeitig.',
    'Behaupte nicht, Audio gehört oder Dateien gesehen zu haben, wenn sie nicht tatsächlich übermittelt wurden.'
  ].join(' ')
};

async function getActiveCourse(userId) {
  if (!userId || !pool) return null;
  const { rows } = await pool.query(
    `SELECT c.id, c.language_code, c.goal,
            COALESCE(c.assessed_level,c.self_assessed_level,'A2') AS level,
            l.name_en, l.native_name, l.speech_locale
     FROM users u
     JOIN learner_courses c ON c.id=u.active_learner_course_id AND c.user_id=u.id
     JOIN language_catalog l ON l.language_code=c.language_code
     WHERE u.id=$1 AND c.status='active' AND l.status='active'`,
    [userId]
  );
  return rows[0] || null;
}

function isAiConfigured() {
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
}

async function buildCommandReply(userId, command, course) {
  if (!userId || !pool || !course?.id) {
    return 'Войди в личный кабинет и создай учебный план, чтобы использовать эту команду.';
  }

  if (command === '/plan') {
    const { rows } = await pool.query(
      `SELECT p.level, p.goal, p.duration_weeks, p.minutes_per_day,
              w.week_number, w.theme, w.objective
       FROM learning_plans p
       LEFT JOIN plan_weeks w ON w.plan_id=p.id
       WHERE p.user_id=$1 AND p.learner_course_id=$2 AND p.status='active'
       ORDER BY w.week_number`,
      [userId, course.id]
    );
    if (!rows.length) return 'У тебя пока нет активного плана. Сначала заверши онбординг и тест уровня.';
    const first = rows[0];
    return [
      'Твой план Quiet English:',
      'Уровень: ' + first.level + ' · цель: ' + first.goal + '.',
      'Срок: ' + first.duration_weeks + ' недели · ' + first.minutes_per_day + ' минут в день.',
      ...rows.map(week => 'Неделя ' + week.week_number + ': ' + week.theme + ' — ' + week.objective)
    ].join('\n');
  }

  if (command === '/today') {
    const { rows } = await pool.query(
      `SELECT d.day_index, d.main_task_id, d.mini_prompt, w.week_number, w.theme,
              e.objective AS task_objective, e.skill, e.level, e.estimated_time
       FROM learning_plans p
       JOIN plan_days d ON d.plan_id=p.id
       JOIN plan_weeks w ON w.id=d.week_id
       LEFT JOIN exercises e ON e.id=d.main_task_id
       WHERE p.user_id=$1 AND p.learner_course_id=$2 AND p.status='active'
         AND d.day_index=LEAST(GREATEST(((NOW() AT TIME ZONE
           (SELECT timezone FROM learner_profiles WHERE user_id=$1))::date-p.starts_on+1),1),28)
       LIMIT 1`,
      [userId, course.id]
    );
    if (!rows[0]) return 'Не нашёл сегодняшнюю задачу. Проверь, что у тебя есть активный план.';
    const due = await pool.query(
      'SELECT COUNT(*)::int AS count FROM srs_items WHERE user_id=$1 AND learner_course_id=$2 AND due_at<=NOW()',
      [userId, course.id]
    );
    const today = rows[0];
    return [
      'Твоя задача на сегодня · неделя ' + today.week_number + ', день ' + today.day_index + '.',
      'Тема: ' + today.theme + '.',
      'Главная задача: ' + (today.task_objective || today.main_task_id || 'практика') + '.',
      today.skill ? 'Навык: ' + today.skill + ' · уровень: ' + today.level + ' · ' + today.estimated_time + ' минут.' : '',
      'Повторение: ' + due.rows[0].count + ' карточек.',
      'Мини-практика: ' + today.mini_prompt
    ].filter(Boolean).join('\n');
  }

  if (command === '/practice') {
    const profile = await pool.query(
      'SELECT COALESCE(assessed_level,self_assessed_level,\'A2\') AS level FROM learner_courses WHERE user_id=$1 AND id=$2',
      [userId, course.id]
    );
    const level = profile.rows[0]?.level || 'A2';
    const { rows } = await pool.query(
      `SELECT id, skill, level, objective, estimated_time
       FROM exercises WHERE language_code=$1 AND status='published' AND skill IN ('vocabulary','grammar','reading')
       ORDER BY (level=$2) DESC, skill, id LIMIT 5`,
      [course.language_code, level]
    );
    if (!rows.length) return 'В библиотеке пока нет опубликованных заданий.';
    return ['Подходящая практика для тебя:', ...rows.map(item =>
      item.id + ' · ' + item.skill + ' · ' + item.level + ' · ' + item.estimated_time + ' мин — ' + item.objective
    ), 'Открой раздел «Практика», чтобы начать.'].join('\n');
  }

  if (command === '/review') {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM srs_items
       WHERE user_id=$1 AND learner_course_id=$2 AND due_at<=NOW()`,
      [userId, course.id]
    );
    return rows[0].count
      ? 'У тебя ' + rows[0].count + ' карточек для повторения. Открой раздел «Повторение» и сначала попробуй вспомнить ответ, прежде чем раскрывать его.'
      : 'На сегодня нет карточек для повторения. Новые появятся после практики.';
  }

  if (command === '/progress') {
    const [summary, errors] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(minutes),0)::int AS minutes,
                COALESCE(SUM(completed_tasks),0)::int AS tasks,
                COUNT(*) FILTER (WHERE completed_tasks>0)::int AS active_days
         FROM daily_activity WHERE user_id=$1 AND learner_course_id=$2`,
        [userId, course.id]
      ),
      pool.query(
        'SELECT COUNT(*)::int AS count FROM error_journal WHERE user_id=$1 AND learner_course_id=$2 AND resolved_at IS NULL',
        [userId, course.id]
      )
    ]);
    const item = summary.rows[0];
    return [
      'Твой прогресс Quiet English:',
      'Учебное время: ' + item.minutes + ' минут.',
      'Выполнено заданий: ' + item.tasks + '.',
      'Активных дней: ' + item.active_days + '.',
      'Открытых ошибок для разбора: ' + errors.rows[0].count + '.',
      'Подробная статистика доступна в разделе «Прогресс».'
    ].join('\n');
  }

  return null;
}

async function buildLearnerContext(userId, exerciseRef) {
  if (!pool || !userId) return '';
  try {
    const [profileResult, planResult, errorsResult] = await Promise.all([
      pool.query(
        'SELECT goal, COALESCE(assessed_level,self_assessed_level) AS level FROM learner_profiles WHERE user_id=$1',
        [userId]
      ),
      pool.query(
        `SELECT p.level, p.goal, w.week_number, w.theme, w.objective
         FROM learning_plans p LEFT JOIN plan_weeks w ON w.plan_id=p.id
         WHERE p.user_id=$1 AND p.status='active'
         ORDER BY w.week_number LIMIT 1`,
        [userId]
      ),
      pool.query(
        `SELECT error_type, incorrect_form, correction, explanation
         FROM error_journal WHERE user_id=$1 AND resolved_at IS NULL
         ORDER BY updated_at DESC LIMIT 3`,
        [userId]
      )
    ]);
    const profile = profileResult.rows[0];
    const plan = planResult.rows[0];
    const lines = ['Learner context from the Quiet English account. Use it only to personalise teaching; do not repeat private account details.'];
    if (profile?.level) lines.push('Estimated CEFR level: ' + profile.level + '.');
    if (profile?.goal) lines.push('Learning goal: ' + profile.goal + '.');
    if (plan?.theme) lines.push('Current plan topic: week ' + plan.week_number + ', ' + plan.theme + '. Objective: ' + plan.objective);
    if (errorsResult.rows.length) {
      lines.push('Recent learning patterns to support:');
      for (const error of errorsResult.rows) {
        lines.push('- ' + error.error_type + ': learner wrote "' + error.incorrect_form + '"; suggested correction: "' + error.correction + '".');
      }
    }
    if (typeof exerciseRef === 'string' && /^[A-Z0-9_-]{2,40}$/.test(exerciseRef)) {
      const exerciseResult = await pool.query(
        `SELECT e.objective, e.instructions, e.content, e.explanation,
                a.answer, a.is_correct, a.feedback
         FROM exercises e
         LEFT JOIN LATERAL (
           SELECT answer, is_correct, feedback FROM exercise_attempts
           WHERE user_id=$1 AND exercise_id=e.id
           ORDER BY created_at DESC LIMIT 1
         ) a ON TRUE
         WHERE e.id=$2 AND e.status='published'`,
        [userId, exerciseRef]
      );
      if (exerciseResult.rows[0]) {
        const exercise = exerciseResult.rows[0];
        lines.push('The learner opened exercise ' + exerciseRef + ': ' + exercise.objective + '.');
        if (exercise.content?.prompt) lines.push('Exercise prompt: ' + exercise.content.prompt);
        if (exercise.answer) lines.push('Latest attempt: ' + JSON.stringify(exercise.answer) + '; correct: ' + Boolean(exercise.is_correct) + '.');
        if (exercise.explanation) lines.push('Approved exercise explanation: ' + JSON.stringify(exercise.explanation));
        lines.push('Explain this specific exercise step by step. Do not invent an answer key if there is no recorded attempt.');
      }
    }
    return lines.join('\n');
  } catch (error) {
    console.error('Unable to load learner chat context:', error?.message || 'unknown error');
    return '';
  }
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    configured: isAiConfigured(),
    provider: 'cloudflare-workers-ai',
    learningConfigured: Boolean(pool && sessionsConfigured),
    emailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    registrationEnabled: process.env.REGISTRATION_ENABLED === 'true'
  });
});

// Keep the original chat contract compatible with the first version of Quiet English.
app.post('/api/chat', async (req, res) => {
  const incoming = req.body?.messages;
  if (!Array.isArray(incoming) || incoming.length < 1 || incoming.length > 12) {
    return res.status(400).json({ error: 'Отправь от 1 до 12 сообщений.' });
  }

  const messages = [];
  for (const item of incoming) {
    if (!item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string') {
      return res.status(400).json({ error: 'Некорректный формат сообщения.' });
    }
    const content = item.content.trim();
    if (!content || content.length > 1800) {
      return res.status(400).json({ error: 'Сообщение должно содержать от 1 до 1 800 символов.' });
    }
    messages.push({ role: item.role, content });
  }

  const command = messages.at(-1)?.content.trim().toLowerCase();
  if (['/plan','/today','/practice','/review','/progress'].includes(command)) {
    try {
      const message = await buildCommandReply(req.session?.userId, command);
      return res.json({ message, demo: false, command });
    } catch (error) {
      console.error('Tutor command failed:', error?.message || 'unknown error');
      return res.status(500).json({ error: 'Не удалось загрузить учебные данные. Попробуй ещё раз.' });
    }
  }

  if (!isAiConfigured()) {
    return res.status(503).json({ error: 'ИИ временно не настроен.' });
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(process.env.CLOUDFLARE_ACCOUNT_ID)}/ai/v1/chat/completions`;
  let upstream;

  try {
    upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...(await buildLearnerContext(req.session?.userId, req.body?.context_ref)
            .then(context => context ? [{ role: 'system', content: context }] : [])),
          ...messages
        ],
        stream: false,
        max_tokens: 640,
        temperature: 0.35,
        chat_template_kwargs: { enable_thinking: false }
      }),
      signal: AbortSignal.timeout(90_000)
    });
  } catch (error) {
    console.error('Workers AI connection error:', error?.message || 'unknown error');
    return res.status(503).json({ error: 'Сервис ИИ временно недоступен. Попробуйте позже.' });
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    console.error('Workers AI response:', upstream.status, detail.slice(0, 400));
    if (upstream.status === 429) {
      return res.status(429).json({ error: 'Бесплатная квота ИИ временно исчерпана. Попробуйте позже.' });
    }
    if (upstream.status === 401 || upstream.status === 403) {
      return res.status(502).json({ error: 'Cloudflare отклонил запрос. Проверь токен и его разрешения.' });
    }
    return res.status(502).json({ error: 'Модель временно не ответила. Попробуйте позже.' });
  }

  let result;
  try {
    result = await upstream.json();
  } catch {
    return res.status(502).json({ error: 'Cloudflare вернул некорректный ответ.' });
  }
  const message = result?.choices?.[0]?.message?.content ?? result?.result?.response ?? result?.response;
  if (typeof message !== 'string' || !message.trim()) {
    console.error('Workers AI returned no text. Response keys:', Object.keys(result || {}).join(', '));
    return res.status(502).json({ error: 'Модель не вернула текстовый ответ.' });
  }
  return res.json({ message: message.trim(), demo: false });
});

app.use(express.static(path.join(root, 'public')));

app.use((error, _req, res, _next) => {
  console.error('Request failed:', error?.message || 'unknown error');
  if (res.headersSent) return;
  res.status(500).json({ error: 'Внутренняя ошибка сервера. Попробуй ещё раз.' });
});

app.listen(port, '0.0.0.0', () => {
  console.log('Quiet English 2.0 listening on ' + port);
});
