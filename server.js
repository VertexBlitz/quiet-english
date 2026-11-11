import express from 'express';
import { rateLimit } from 'express-rate-limit';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

import { pool, recordActivity } from './src/db.js';
import { getAppRegion, isRegistrationDatabaseIsolated, isExternalPersonalDataProcessingAllowed } from './src/region-config.js';
import authRoutes from './src/routes/auth.js';
import learningRoutes from './src/routes/learning.js';
import knowledgeRoutes from './src/routes/knowledge.js';
import adminRoutes from './src/routes/admin.js';
import pronunciationRoutes from './src/routes/pronunciation.js';
import writingRoutes from './src/routes/writing.js';
import studyToolsRoutes from './src/routes/study-tools.js';
import billingRoutes from './src/routes/billing.js';
import {
  buildSpeakingGenerationPrompt,
  parseGeneratedSpeakingPassage,
  validateSpeakingGenerationRequest
} from './src/speaking.js';
import { buildInstantPracticeExercise } from './src/instant-practice.js';
import {
  buildPracticeGenerationPrompt,
  gradeGeneratedPracticeExercise,
  parseGeneratedPracticeExercise,
  validatePracticeGenerationRequest
} from './src/practice-generation.js';

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 3000;
const PgSession = connectPgSimple(session);

async function cleanupExpiredGuardianConsentRequests() {
  if (!pool) return;
  try {
    await pool.query('DELETE FROM guardian_consent_requests WHERE expires_at < NOW()');
  } catch (error) {
    console.error('Guardian consent request cleanup failed:', error?.message || 'unknown error');
  }
}
void cleanupExpiredGuardianConsentRequests();
if (pool) {
  const guardianCleanupTimer = setInterval(cleanupExpiredGuardianConsentRequests, 6 * 60 * 60_000);
  guardianCleanupTimer.unref();
}

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/readyz', async (_req, res) => {
  if (!pool || !sessionsConfigured) {
    return res.status(503).json({ status: 'not_ready' });
  }
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ready' });
  } catch {
    return res.status(503).json({ status: 'not_ready' });
  }
});

app.get('/api/region', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    region: getAppRegion(),
    contentVersion: process.env.CONTENT_VERSION || 'source'
  });
});
app.use(express.json({ limit: '24kb' }));
const generalApiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false
});
const loginAttemptLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Слишком много попыток входа. Подожди 15 минут и попробуй снова.' }
});
const registrationAttemptLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Слишком много попыток регистрации. Попробуй позже.' }
});
const guardianConsentLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Слишком много запросов на родительское подтверждение. Попробуй позже.' }
});
const passwordRecoveryLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 3,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Слишком много запросов на восстановление пароля. Попробуй позже.' }
});
const emailResendLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 3,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Слишком много запросов на повторное письмо. Попробуй позже.' }
});
const chatLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Достигнут временный лимит сообщений. Попробуй позже.' }
});
app.use('/api/', generalApiLimiter);

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
  app.use('/api/auth/login', loginAttemptLimiter);
  app.use('/api/auth/register', registrationAttemptLimiter);
  app.use('/api/auth/guardian-consent-request', guardianConsentLimiter);
  app.use('/api/auth/guardian-consent-complete', guardianConsentLimiter);
  app.use('/api/auth/guardian-consent-info', guardianConsentLimiter);
  app.use('/api/auth/guardian-withdrawal-request', guardianConsentLimiter);
  app.use('/api/auth/guardian-consent-withdraw', guardianConsentLimiter);
  app.use('/api/auth/password/forgot', passwordRecoveryLimiter);
  app.use('/api/auth/resend-verification', emailResendLimiter);
  app.use('/api/auth', sameOrigin, authRoutes);
  app.use('/api/learning', sameOrigin, learningRoutes);
  app.use('/api/knowledge', sameOrigin, knowledgeRoutes);
  app.use('/api/admin', sameOrigin, adminRoutes);
  app.use('/api/pronunciation', sameOrigin, pronunciationRoutes);
  app.use('/api/studio', sameOrigin, writingRoutes, studyToolsRoutes);
  app.use('/api/billing', billingRoutes);
} else {
  const notReady = (_req, res) => res.status(503).json({
    error: 'Личный кабинет ещё не настроен. Нужны DATABASE_URL и SESSION_SECRET.'
  });
  app.use('/api/auth', notReady);
  app.use('/api/learning', notReady);
  app.use('/api/knowledge', notReady);
  app.use('/api/admin', notReady);
  app.use('/api/pronunciation', notReady);
  app.use('/api/studio', notReady);
  app.use('/api/billing', notReady);
}

const MODEL = process.env.CLOUDFLARE_MODEL || '@cf/google/gemma-4-26b-a4b-it';
const SYSTEM_PROMPT = [
  'You are a kind, patient English tutor for a general-audience learning website.',
  'Help with natural English conversation, grammar, vocabulary, reading and writing.',
  'Keep every response age-appropriate, respectful and safe.',
  'Use English by default. If a learner writes in Russian or seems confused, explain briefly in Russian and give one simple English example.',
  'When correcting English, first respond to the meaning, then show a natural correction and one short explanation.',
  'Keep answers focused and ask at most one follow-up question at a time.',
  'Do not claim to hear audio or see files unless they were actually supplied.'
].join(' ');

function isAiConfigured() {
  return isExternalPersonalDataProcessingAllowed() && Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
}

function getRegistrationReadiness() {
  const blockers = [];
  if (!pool || !sessionsConfigured) blockers.push('Личный кабинет и база данных ещё не настроены.');
  if (process.env.REGISTRATION_ENABLED !== 'true') blockers.push('Публичная регистрация ещё не включена.');
  if (process.env.REGISTRATION_LEGAL_APPROVED !== 'true') blockers.push('Новые Условия использования, Политика конфиденциальности и отдельное согласие на обработку данных не утверждены оператором.');
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !process.env.APP_BASE_URL) blockers.push('Не настроена отправка и подтверждение email.');
  if (!process.env.TURNSTILE_SITE_KEY || !process.env.TURNSTILE_SECRET_KEY) blockers.push('Не настроена CAPTCHA (Cloudflare Turnstile).');
  if (getAppRegion() === 'unknown') blockers.push('APP_REGION должен быть preview, eu или ru.');
  if (!isRegistrationDatabaseIsolated()) blockers.push('Не подтверждена отдельная база данных и ожидаемая схема для выбранного региона.');
  if (getAppRegion() === 'ru' && process.env.REGISTRATION_REGION_SERVICES_APPROVED !== 'true') blockers.push('Не утверждены CAPTCHA, почта и другие сервисы обработки данных для российского контура.');
  if (getAppRegion() === 'ru' && process.env.REGION_EXTERNAL_PROCESSORS_APPROVED !== 'true') blockers.push('Не утверждена обработка персональных данных внешними сервисами для российского контура.');
  if (process.env.REGISTRATION_DATA_LOCALIZATION_APPROVED !== 'true') blockers.push('Не подтверждена локализация персональных данных для целевой аудитории.');
  if (process.env.REGISTRATION_OPERATOR_DETAILS_APPROVED !== 'true') blockers.push('Не заполнены и не подтверждены сведения об операторе и контакты для обращений.');
  return {
    available: blockers.length === 0,
    region: getAppRegion(),
    blockers,
    captchaSiteKey: process.env.TURNSTILE_SITE_KEY || null,
    audience: {
      minimumAge: 18,
      ageBands: ['18_plus'],
      pilotCountries: ['DE', 'IT'],
      countryBasis: 'Self-declared current country of residence; not a geolocation or citizenship check.',
      under18: 'Registration is limited to adults aged 18 or older during the initial pilot.',
      dateOfBirth: 'Exact date of birth is not requested.'
    }
  };
}

app.get('/api/registration-status', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  const readiness = getRegistrationReadiness();
  res.json({
    available: readiness.available,
    message: readiness.available
      ? 'На первом этапе регистрация доступна только совершеннолетним пользователям, проживающим в Германии или Италии.'
      : 'Регистрация пока недоступна. ' + readiness.blockers.join(' '),
    blockers: readiness.blockers,
    captchaSiteKey: readiness.captchaSiteKey,
    audience: readiness.audience
  });
});

async function buildCommandReply(userId, command, languageCode = 'en') {
  if (!userId || !pool) {
    return 'Войди в личный кабинет и создай учебный план, чтобы использовать эту команду.';
  }

  if (command === '/plan') {
    const { rows } = await pool.query(
      `SELECT p.level, p.goal, p.duration_weeks, p.minutes_per_day,
              w.week_number, w.theme, w.objective
       FROM learning_plans p
       LEFT JOIN plan_weeks w ON w.plan_id=p.id
       WHERE p.user_id=$1 AND p.status='active' AND p.language_code=$2
       ORDER BY w.week_number`,
      [userId, languageCode]
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
              COALESCE(e.objective_i18n->>'ru',e.objective) AS task_objective, e.skill, e.level, e.estimated_time
       FROM learning_plans p
       JOIN plan_days d ON d.plan_id=p.id
       JOIN plan_weeks w ON w.id=d.week_id
       LEFT JOIN exercises e ON e.id=d.main_task_id
       WHERE p.user_id=$1 AND p.status='active' AND p.language_code=$2
         AND d.day_index=LEAST(GREATEST(((NOW() AT TIME ZONE
           (SELECT timezone FROM learner_profiles WHERE user_id=$1))::date-p.starts_on+1),1),28)
       LIMIT 1`,
      [userId, languageCode]
    );
    if (!rows[0]) return 'Не нашёл сегодняшнюю задачу. Проверь, что у тебя есть активный план.';
    const due = await pool.query(
      'SELECT COUNT(*)::int AS count FROM srs_items WHERE user_id=$1 AND language_code=$2 AND due_at<=NOW()',
      [userId, languageCode]
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
      'SELECT COALESCE(assessed_level,self_assessed_level,\'A2\') AS level FROM learner_language_profiles WHERE user_id=$1 AND language_code=$2',
      [userId, languageCode]
    );
    const level = profile.rows[0]?.level || 'A2';
    const { rows } = await pool.query(
      `SELECT id, skill, level, objective, estimated_time
       FROM exercises WHERE status='published' AND language_code=$2
         AND skill IN ('vocabulary','grammar','reading','communication')
       ORDER BY (level=$1) DESC, skill, id LIMIT 5`,
      [level, languageCode]
    );
    if (!rows.length) return 'В библиотеке пока нет опубликованных заданий.';
    return ['Подходящая практика для тебя:', ...rows.map(item =>
      item.id + ' · ' + item.skill + ' · ' + item.level + ' · ' + item.estimated_time + ' мин — ' + item.objective
    ), 'Открой раздел «Практика», чтобы начать.'].join('\n');
  }

  if (command === '/review') {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM srs_items
       WHERE user_id=$1 AND language_code=$2 AND due_at<=NOW()`,
      [userId, languageCode]
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
         FROM daily_activity WHERE user_id=$1 AND language_code=$2`,
        [userId, languageCode]
      ),
      pool.query(
        'SELECT COUNT(*)::int AS count FROM error_journal WHERE user_id=$1 AND language_code=$2 AND resolved_at IS NULL',
        [userId, languageCode]
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

async function buildLearnerContext(userId, exerciseRef, languageCode = 'en') {
  if (!pool || !userId) return '';
  try {
    const [profileResult, planResult, errorsResult] = await Promise.all([
      pool.query(
        'SELECT goal, COALESCE(assessed_level,self_assessed_level) AS level FROM learner_language_profiles WHERE user_id=$1 AND language_code=$2',
        [userId, languageCode]
      ),
      pool.query(
        `SELECT p.level, p.goal, w.week_number, w.theme, w.objective
         FROM learning_plans p LEFT JOIN plan_weeks w ON w.plan_id=p.id
         WHERE p.user_id=$1 AND p.status='active' AND p.language_code=$2
         ORDER BY w.week_number LIMIT 1`,
        [userId, languageCode]
      ),
      pool.query(
        `SELECT error_type, incorrect_form, correction, explanation
         FROM error_journal WHERE user_id=$1 AND language_code=$2 AND resolved_at IS NULL
         ORDER BY updated_at DESC LIMIT 3`,
        [userId, languageCode]
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
           WHERE user_id=$1 AND language_code=$3 AND exercise_id=e.id
           ORDER BY created_at DESC LIMIT 1
         ) a ON TRUE
         WHERE e.id=$2 AND e.status='published' AND e.language_code=$3`,
        [userId, exerciseRef, languageCode]
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



async function getRequestStudyLanguage(req) {
  const userId = req.session?.userId;
  if (!userId) {
    return { language_code: 'en', course_status: 'available', speech_supported: true, preferred_language: 'ru' };
  }
  const { rows } = await pool.query(
    `SELECT l.language_code, l.english_name, l.native_name, l.locale,
             l.course_status, l.speech_supported, p.preferred_language
     FROM learner_profiles p
     JOIN study_languages l ON l.language_code=p.active_learning_language_code
     WHERE p.user_id=$1`,
    [userId]
  );
  return rows[0] || null;
}

async function requireSupportedTargetCourse(req, res) {
  try {
    const language = await getRequestStudyLanguage(req);
    const code = language?.language_code?.trim();
    if (!language || language.course_status !== 'available' || !code) {
      res.status(409).json({ error: 'Генератор для выбранного языка пока не готов.' });
      return null;
    }
    return language;
  } catch (error) {
    console.error('Active study language lookup failed:', error?.message || 'unknown error');
    res.status(503).json({ error: 'Не удалось определить изучаемый язык. Попробуй ещё раз.' });
    return null;
  }
}

const speakingGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    error: 'Достигнут временный лимит генерации. Попробуй ещё раз позже.'
  })
});

app.post('/api/speaking/generate', speakingGenerationLimiter, async (req, res) => {
  const language = await requireSupportedTargetCourse(req, res);
  if (!language) return;
  const origin = req.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== req.get('host')) {
        return res.status(403).json({ error: 'Источник запроса не разрешён.' });
      }
    } catch {
      return res.status(403).json({ error: 'Некорректный источник запроса.' });
    }
  }

  const validated = validateSpeakingGenerationRequest(req.body, language.language_code.trim());
  if (!validated.ok) {
    return res.status(400).json({ error: validated.error });
  }

  if (!isAiConfigured()) {
    return res.status(503).json({
      error: 'Генерация ИИ пока не подключена на этом тестовом сервисе. Нужны настройки Cloudflare Workers AI.'
    });
  }

  const { level, topic, avoid } = validated.value;
  const languageCode = language.language_code.trim();
  const targetLanguage = language.english_name || (languageCode === 'de' ? 'German' : 'English');
  const endpoint = 'https://api.cloudflare.com/client/v4/accounts/' +
    encodeURIComponent(process.env.CLOUDFLARE_ACCOUNT_ID) + '/ai/v1/chat/completions';
  const variation = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);

  let upstream;
  try {
    upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.CLOUDFLARE_API_TOKEN,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You create original, age-appropriate ' + targetLanguage + ' reading exercises. Follow the requested CEFR level and return only the required JSON object. Use natural standard ' + targetLanguage + '. Never include personal data, dangerous instructions, sexual content, graphic violence, self-harm, or copied published text.'
          },
          {
            role: 'user',
            content: buildSpeakingGenerationPrompt({ level, topic, avoid, languageCode }) +
              '\nVariation identifier: ' + variation + '. Create a genuinely new scenario, not a synonym replacement.'
          }
        ],
        stream: false,
        max_tokens: 260,
        temperature: 0.8,
        chat_template_kwargs: { enable_thinking: false }
      }),
      signal: AbortSignal.timeout(45_000)
    });
  } catch (error) {
    console.error('Speaking generation connection error:', error?.message || 'unknown error');
    return res.status(503).json({ error: 'ИИ временно недоступен. Попробуй ещё раз позже.' });
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    console.error('Speaking generation upstream status:', upstream.status, detail.slice(0, 300));
    if (upstream.status === 429) {
      return res.status(429).json({
        error: 'Бесплатная дневная квота Cloudflare AI или лимит запросов исчерпаны. Попробуй после обновления квоты.'
      });
    }
    if (upstream.status === 401 || upstream.status === 403) {
      return res.status(503).json({
        error: 'Cloudflare не разрешил генерацию. Проверь настройки и разрешения AI-токена в Render.'
      });
    }
    return res.status(502).json({ error: 'Модель не смогла создать задание. Попробуй ещё раз.' });
  }

  let result;
  try {
    result = await upstream.json();
  } catch {
    return res.status(502).json({ error: 'Cloudflare вернул некорректный ответ.' });
  }

  const modelContent = result?.choices?.[0]?.message?.content ??
    result?.result?.response ?? result?.response;

  try {
    const passage = parseGeneratedSpeakingPassage(modelContent, { level, topic, languageCode });
    return res.json({ passage, source: 'cloudflare-workers-ai' });
  } catch (error) {
    console.error('Speaking generation response validation failed:', error?.message || 'unknown error');
    return res.status(502).json({
      error: error?.message || 'ИИ вернул некорректное задание. Попробуй ещё раз.'
    });
  }
});


const practiceGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    error: 'Достигнут часовой лимит генерации. Попробуй ещё раз позже.'
  })
});
const practiceCheckLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false
});
const generatedPracticeSessions = new Map();
const PRACTICE_SESSION_TTL = 45 * 60 * 1000;

function sameRequestOrigin(req) {
  const origin = req.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === req.get('host');
  } catch {
    return false;
  }
}

function cleanGeneratedPracticeSessions() {
  const now = Date.now();
  for (const [id, session] of generatedPracticeSessions) {
    if (session.expiresAt <= now) generatedPracticeSessions.delete(id);
  }
  while (generatedPracticeSessions.size >= 250) {
    const oldest = generatedPracticeSessions.keys().next().value;
    if (!oldest) break;
    generatedPracticeSessions.delete(oldest);
  }
}

async function buildGermanInstantPracticeExercise(request) {
  if (['reading','listening'].includes(request.skill)) {
    const passages = {
      A1: {
        title: 'Ein Tag in München',
        passage: 'Mia wohnt in München. Sie steht um sieben Uhr auf und frühstückt mit ihrer Schwester. Um acht Uhr fährt sie mit dem Bus zur Schule. Nach dem Unterricht kauft sie Brot und Äpfel. Am Abend liest Mia ein Buch und telefoniert mit ihrer Freundin. Am Samstag besucht sie ihre Großeltern.',
        questions: [
          { prompt:'Wo wohnt Mia?', options:['In München','In Berlin','In Hamburg','In Wien'], correct_option_id:'a', explanation:'Im ersten Satz steht: Mia wohnt in München.' },
          { prompt:'Wie fährt sie zur Schule?', options:['Mit dem Bus','Mit dem Zug','Mit dem Fahrrad','Zu Fuß'], correct_option_id:'a', explanation:'Mia fährt mit dem Bus zur Schule.' },
          { prompt:'Was kauft sie nach dem Unterricht?', options:['Brot und Äpfel','Käse und Milch','Bücher und Stifte','Tee und Kaffee'], correct_option_id:'a', explanation:'Nach dem Unterricht kauft sie Brot und Äpfel.' },
          { prompt:'Wen besucht Mia am Samstag?', options:['Ihre Großeltern','Ihre Lehrerin','Ihre Freundin','Ihre Nachbarin'], correct_option_id:'a', explanation:'Am Samstag besucht sie ihre Großeltern.' }
        ]
      },
      A2: {
        title: 'Ein Ausflug an den See',
        passage: 'Am vergangenen Sonntag hat Jonas mit zwei Freunden einen Ausflug an einen See gemacht. Sie sind früh mit dem Zug gefahren, weil das Wetter am Morgen besonders schön war. Am Ufer haben sie gefrühstückt und danach eine kleine Wanderung gemacht. Gegen Mittag wurde es windig, deshalb sind sie in ein Café gegangen. Dort haben sie heiße Schokolade getrunken und ihre nächsten Ferien geplant.',
        questions: [
          { prompt:'Wann hat Jonas den Ausflug gemacht?', options:['Am vergangenen Sonntag','Am Samstagabend','Am Montagmorgen','Vor zwei Wochen'], correct_option_id:'a', explanation:'Der Text beginnt mit Am vergangenen Sonntag.' },
          { prompt:'Warum sind sie früh gefahren?', options:['Weil das Wetter schön war','Weil das Café geschlossen war','Weil der Zug später fuhr','Weil sie arbeiten mussten'], correct_option_id:'a', explanation:'Sie sind früh gefahren, weil das Wetter am Morgen schön war.' },
          { prompt:'Was haben sie am Ufer gemacht?', options:['Gefrühstückt','Fußball gespielt','Ein Museum besucht','Einkäufe gemacht'], correct_option_id:'a', explanation:'Am Ufer haben sie gefrühstückt.' },
          { prompt:'Warum sind sie in ein Café gegangen?', options:['Weil es windig wurde','Weil es zu warm war','Weil der See geschlossen war','Weil sie den Zug verpasst hatten'], correct_option_id:'a', explanation:'Gegen Mittag wurde es windig.' }
        ]
      },
      B1: {
        title: 'Ein neues Projekt im Stadtteil',
        passage: 'Seit einigen Monaten engagiert sich Lena in einer Initiative, die einen ungenutzten Platz im Stadtteil in einen Gemeinschaftsgarten verwandeln möchte. Anfangs waren viele Nachbarn skeptisch, weil sie befürchteten, dass die Pflege zu viel Zeit kosten würde. Die Gruppe organisierte deshalb ein Treffen und verteilte die Aufgaben. Inzwischen kümmern sich Familien, Studierende und ältere Menschen gemeinsam um die Beete. Neben Gemüse wachsen dort auch Kräuter und Blumen. Für Lena ist besonders wichtig, dass Menschen miteinander ins Gespräch kommen, die sich vorher kaum kannten.',
        questions: [
          { prompt:'Was möchte die Initiative verändern?', options:['Einen ungenutzten Platz in einen Garten verwandeln','Eine neue Straße bauen','Ein Einkaufszentrum eröffnen','Einen Parkplatz vergrößern'], correct_option_id:'a', explanation:'Die Initiative plant einen Gemeinschaftsgarten auf einem ungenutzten Platz.' },
          { prompt:'Warum waren einige Nachbarn zunächst skeptisch?', options:['Sie sorgten sich um den Zeitaufwand','Sie mochten keine Pflanzen','Sie wollten umziehen','Sie kannten Lena persönlich nicht'], correct_option_id:'a', explanation:'Sie befürchteten, dass die Pflege zu viel Zeit kosten würde.' },
          { prompt:'Wie löste die Gruppe das Problem?', options:['Sie organisierte ein Treffen und verteilte Aufgaben','Sie gab das Projekt auf','Sie stellte eine Firma ein','Sie schloss den Platz'], correct_option_id:'a', explanation:'Die Aufgaben wurden bei einem Treffen verteilt.' },
          { prompt:'Was ist Lena besonders wichtig?', options:['Dass Nachbarn miteinander ins Gespräch kommen','Dass der Garten möglichst groß wird','Dass nur Familien teilnehmen','Dass das Gemüse verkauft wird'], correct_option_id:'a', explanation:'Lena betont den Austausch zwischen Menschen, die sich vorher kaum kannten.' }
        ]
      },
      B2: {
        title: 'Arbeiten außerhalb des Büros',
        passage: 'Viele Unternehmen betrachten mobiles Arbeiten inzwischen nicht mehr als vorübergehende Ausnahme, sondern als festen Bestandteil ihrer Organisation. Die größere Flexibilität kann die Zufriedenheit erhöhen, setzt jedoch voraus, dass Aufgaben und Zuständigkeiten klar geregelt sind. Wo Absprachen fehlen, entstehen leicht Missverständnisse oder unnötige Verzögerungen. Einige Teams vereinbaren deshalb feste Zeiten für gemeinsame Besprechungen und halten Entscheidungen schriftlich fest. Gleichzeitig achten sie darauf, dass Beschäftigte nicht ständig erreichbar sein müssen. Entscheidend ist weniger der Ort, an dem gearbeitet wird, als die Fähigkeit, Zusammenarbeit bewusst zu gestalten.',
        questions: [
          { prompt:'Wie wird mobiles Arbeiten im Text beschrieben?', options:['Als festen Bestandteil vieler Organisationen','Als seltene Ausnahme','Als kurzfristiges Experiment','Als Ersatz für jede Besprechung'], correct_option_id:'a', explanation:'Der Text sagt, dass mobiles Arbeiten zunehmend fest integriert ist.' },
          { prompt:'Welche Voraussetzung wird für Flexibilität genannt?', options:['Klare Aufgaben und Zuständigkeiten','Längere tägliche Arbeitszeiten','Ein gemeinsamer Bürostandort','Ständige Erreichbarkeit'], correct_option_id:'a', explanation:'Ohne klare Absprachen können Missverständnisse und Verzögerungen entstehen.' },
          { prompt:'Warum halten manche Teams Entscheidungen schriftlich fest?', options:['Um Missverständnisse zu vermeiden','Um Besprechungen zu verlängern','Um Aufgaben geheim zu halten','Um die Arbeitszeit zu verkürzen'], correct_option_id:'a', explanation:'Schriftliche Entscheidungen machen Absprachen nachvollziehbar.' },
          { prompt:'Was bezeichnet der Schluss als entscheidend?', options:['Die bewusste Gestaltung der Zusammenarbeit','Der genaue Arbeitsplatz','Die Zahl der Besprechungen','Die dauernde Verfügbarkeit'], correct_option_id:'a', explanation:'Entscheidend sei, Zusammenarbeit bewusst zu gestalten.' }
        ]
      },
      C1: {
        title: 'Offene Daten und öffentliche Entscheidungen',
        passage: 'Die Veröffentlichung öffentlicher Datensätze wird häufig als unmittelbarer Gewinn an Transparenz verstanden. Dieser Schluss greift jedoch zu kurz: Daten entfalten ihren gesellschaftlichen Nutzen erst dann, wenn sie verständlich dokumentiert, regelmäßig aktualisiert und in ihrem Entstehungskontext erläutert werden. Andernfalls können Zahlen zwar zugänglich sein, ohne tatsächlich überprüfbare Erkenntnisse zu ermöglichen. Besonders wichtig ist daher, methodische Grenzen offenzulegen und Unsicherheiten nicht hinter scheinbar präzisen Kennzahlen verschwinden zu lassen. Eine verantwortungsvolle Datenpolitik verbindet technische Offenheit mit verständlicher Vermittlung und institutioneller Rechenschaft. Erst dieses Zusammenspiel schafft eine Grundlage für eine sachkundige öffentliche Debatte.',
        questions: [
          { prompt:'Welche Einschränkung macht der Text an der Idee von Transparenz?', options:['Veröffentlichte Daten allein schaffen noch keinen gesellschaftlichen Nutzen','Öffentliche Daten sollten grundsätzlich geheim bleiben','Kennzahlen sind immer unzuverlässig','Daten können nicht aktualisiert werden'], correct_option_id:'a', explanation:'Der Text betont, dass Dokumentation, Aktualisierung und Kontext entscheidend sind.' },
          { prompt:'Was kann passieren, wenn methodische Grenzen verschwiegen werden?', options:['Zahlen wirken präziser, als sie tatsächlich sind','Datensätze werden automatisch verständlicher','Öffentliche Debatten werden überflüssig','Unsicherheiten verschwinden wirklich'], correct_option_id:'a', explanation:'Der Text warnt vor scheinbar präzisen Kennzahlen.' },
          { prompt:'Welche Verbindung hält der Text für notwendig?', options:['Technische Offenheit und verständliche Vermittlung','Mehr Daten und weniger Dokumentation','Kennzahlen und Werbesprache','Geheimhaltung und institutionelle Kontrolle'], correct_option_id:'a', explanation:'Eine verantwortungsvolle Datenpolitik kombiniert technische Offenheit, Vermittlung und Rechenschaft.' },
          { prompt:'Was soll das Zusammenspiel letztlich ermöglichen?', options:['Eine sachkundige öffentliche Debatte','Eine automatische politische Entscheidung','Eine vollständige Beseitigung von Unsicherheit','Eine Reduzierung aller Datensätze'], correct_option_id:'a', explanation:'Der letzte Satz nennt die sachkundige öffentliche Debatte als Ziel.' }
        ]
      },
      C2: {
        title: 'Die Grenzen eindeutiger Begriffe',
        passage: 'In öffentlichen Auseinandersetzungen wird nicht selten so argumentiert, als ließen sich komplexe Sachverhalte durch eine einzige, vermeintlich neutrale Definition abschließend ordnen. Gerade diese Annahme verdient jedoch Prüfung. Begriffe strukturieren Wahrnehmung, indem sie bestimmte Merkmale hervorheben und andere in den Hintergrund treten lassen. Wer eine Definition als alternativlos ausgibt, verschleiert mitunter die Auswahlentscheidungen, die ihr zugrunde liegen. Daraus folgt keineswegs, dass jede Beschreibung beliebig wäre. Vielmehr kommt es darauf an, Kriterien offenzulegen, Gegenbeispiele ernst zu nehmen und die Reichweite einer Aussage kenntlich zu machen. Präzision zeigt sich somit nicht in demonstrativer Eindeutigkeit, sondern in der Fähigkeit, begründete Unterscheidungen samt ihren Grenzen zu formulieren.',
        questions: [
          { prompt:'Welche Annahme wird im Text kritisch hinterfragt?', options:['Dass eine einzige neutrale Definition komplexe Sachverhalte abschließend ordnen kann','Dass Begriffe Wahrnehmung beeinflussen','Dass Gegenbeispiele berücksichtigt werden sollten','Dass Aussagen Grenzen haben'], correct_option_id:'a', explanation:'Der Text hinterfragt den Anspruch, komplexe Sachverhalte durch eine einzige neutrale Definition abschließend zu ordnen.' },
          { prompt:'Was kann eine alternativlos dargestellte Definition verschleiern?', options:['Die Auswahlentscheidungen hinter ihr','Die grammatische Form eines Begriffs','Die Länge eines Textes','Die Existenz jeder Gegenposition'], correct_option_id:'a', explanation:'Eine Definition beruht auf Auswahlentscheidungen, die sichtbar gemacht werden sollten.' },
          { prompt:'Welche Schlussfolgerung weist der Text ausdrücklich zurück?', options:['Dass jede Beschreibung beliebig sei','Dass Kriterien offengelegt werden sollten','Dass Gegenbeispiele ernst zu nehmen sind','Dass Aussagen eine Reichweite haben'], correct_option_id:'a', explanation:'Der Text sagt ausdrücklich, dass daraus nicht folgt, jede Beschreibung sei beliebig.' },
          { prompt:'Woran zeigt sich Präzision laut Schlussfolgerung?', options:['An begründeten Unterscheidungen und dem Bewusstsein ihrer Grenzen','An demonstrativer Eindeutigkeit','An möglichst kurzen Definitionen','Am Verzicht auf Gegenbeispiele'], correct_option_id:'a', explanation:'Der letzte Satz definiert Präzision als begründete Unterscheidung unter Berücksichtigung ihrer Grenzen.' }
        ]
      }
    };
    const item = passages[request.level];
    if (!item) throw new Error('Для выбранного уровня пока не подготовлен текст для чтения и аудирования.');
    return {
      title: item.title,
      instructions: request.interfaceLanguage === 'en'
        ? 'Read the German text and answer the questions.'
        : 'Прочитай немецкий текст и ответь на вопросы.',
      passage: item.passage,
      level: request.level,
      skill: request.skill,
      topic: request.topic,
      languageCode: 'de',
      questions: item.questions.map((question,index)=>({
        id:'q'+(index+1),prompt:question.prompt,category:request.skill,
        options:question.options.map((text,optionIndex)=>({id:['a','b','c','d'][optionIndex],text})),
        correct_option_id:question.correct_option_id,
        explanation:question.explanation,
        learning_point:request.skill==='listening'?'Hörverstehen':'Leseverstehen'
      }))
    };
  }

  const { rows } = await pool.query(
    `SELECT id, skill, level, objective, content, answer_key, explanation
     FROM exercises
     WHERE language_code='de' AND status='published' AND level=$1
       AND skill IN ('grammar','vocabulary','speaking')
     ORDER BY RANDOM() LIMIT 14`,
    [request.level]
  );
  const wanted = request.skill === 'mixed'
    ? rows
    : rows.filter(row => row.skill === request.skill);
  const fallback = wanted.length ? wanted : rows;
  if (!fallback.length) throw new Error('Для выбранного уровня пока недостаточно немецких заданий.');
  const questions = fallback.slice(0,5).map((row,index) => ({
    id: 'q' + (index + 1),
    prompt: row.content?.prompt || row.objective,
    category: row.skill,
    options: row.content?.options || [],
    correct_option_id: row.answer_key?.correct_option_id,
    explanation: row.explanation?.[request.interfaceLanguage] || row.explanation?.ru || '',
    learning_point: row.objective
  }));
  return {
    title: request.level + ' · Deutsch ' + (request.skill === 'mixed' ? 'Mix' : request.skill),
    instructions: request.interfaceLanguage === 'en'
      ? 'Choose the correct answer in German.'
      : 'Выбери правильный ответ на немецком языке.',
    passage: '',
    level: request.level,
    skill: request.skill,
    topic: request.topic,
    languageCode: 'de',
    questions
  };
}

async function buildCourseInstantPracticeExercise(request, languageCode, languageName) {
  // Mixed practice is deliberately limited to text-based exercise types.
  // Listening is served only from rows with a real level-matched audio script.
  const requestedSkills = request.skill === 'mixed'
    ? ['grammar','vocabulary','reading']
    : [request.skill];
  const { rows: foundRows } = await pool.query(
    `SELECT id,skill,level,objective,content,answer_key,explanation
     FROM exercises
     WHERE language_code=$1 AND status='published' AND level=$2
       AND skill = ANY($3::text[])
     ORDER BY RANDOM() LIMIT 12`,
    [languageCode,request.level,requestedSkills]
  );
  const rows = request.skill === 'listening'
    ? foundRows.filter(row => typeof row.content?.passage === 'string' && row.content.passage.trim().length >= 40)
    : foundRows;
  if (!rows.length) throw new Error('Для выбранного уровня пока нет опубликованных заданий нужного типа на ' + languageName + '.');
  const questions = rows.slice(0,5).map((row,index) => ({
    id:'q'+(index+1),
    prompt:row.content?.prompt || row.objective,
    category:row.skill,
    options:row.content?.options || [],
    correct_option_id:row.answer_key?.correct_option_id,
    explanation:row.explanation?.[request.interfaceLanguage] || row.explanation?.ru || '',
    learning_point:row.objective
  })).filter(item => item.options.length >= 2 && item.correct_option_id);
  if (!questions.length) throw new Error('Для выбранного уровня пока недостаточно проверенных заданий.');
  return {
    title:request.level + ' · ' + languageName + ' · ' + (request.skill === 'mixed' ? 'Mix' : request.skill),
    instructions:request.skill === 'listening'
      ? (request.interfaceLanguage === 'en' ? 'Listen to the passage, then choose the correct answer.' : 'Прослушай текст, затем выбери правильный ответ.')
      : (request.interfaceLanguage === 'en'
        ? 'Choose the correct answer in ' + languageName + '.'
        : 'Выбери правильный ответ на языке ' + languageName + '.'),
    passage:request.skill === 'listening' ? rows[0].content.passage : '',
    level:request.level,
    skill:request.skill,
    topic:request.topic,
    languageCode,
    questions
  };
}

app.post('/api/practice/instant', async (req, res) => {
  const language = await requireSupportedTargetCourse(req, res);
  if (!language) return;
  if (!sameRequestOrigin(req)) {
    return res.status(403).json({ error: 'Источник запроса не разрешён.' });
  }

  const validated = validatePracticeGenerationRequest(req.body, language.language_code.trim());
  if (!validated.ok) return res.status(400).json({ error: validated.error });

  try {
    const request = {
      ...validated.value,
      interfaceLanguage: language.preferred_language === 'en' ? 'en' : 'ru'
    };
    const languageCode = language.language_code.trim();
    const exercise = languageCode === 'de'
      ? await buildGermanInstantPracticeExercise(request)
      : languageCode === 'en'
        ? buildInstantPracticeExercise(request)
        : await buildCourseInstantPracticeExercise(
            request,
            languageCode,
            language.english_name || languageCode
          );
    cleanGeneratedPracticeSessions();
    const exerciseId = randomUUID();
    generatedPracticeSessions.set(exerciseId, {
      exercise,
      languageCode: language.language_code.trim(),
      expiresAt: Date.now() + PRACTICE_SESSION_TTL
    });

    const { questions, ...metadata } = exercise;
    return res.json({
      exercise_id: exerciseId,
      source: 'instant-library',
      exercise: {
        ...metadata,
        questions: questions.map(question => ({
          id: question.id,
          prompt: question.prompt,
          category: question.category,
          options: question.options
        }))
      }
    });
  } catch (error) {
    console.error('Instant practice build error:', error?.message || 'unknown error');
    return res.status(500).json({ error: 'Не удалось мгновенно подготовить задание.' });
  }
});

app.post('/api/practice/generate', practiceGenerationLimiter, async (req, res) => {
  const language = await requireSupportedTargetCourse(req, res);
  if (!language) return;
  if (!sameRequestOrigin(req)) {
    return res.status(403).json({ error: 'Источник запроса не разрешён.' });
  }

  const validated = validatePracticeGenerationRequest(req.body, language.language_code.trim());
  if (!validated.ok) return res.status(400).json({ error: validated.error });
  if (!isAiConfigured()) {
    return res.status(503).json({ error: 'ИИ пока не настроен на этом сервисе.' });
  }

  const rawKnowledgeNoteId = typeof req.body?.knowledge_note_id === 'string'
    ? req.body.knowledge_note_id.trim()
    : '';
  const knowledgeNoteId = rawKnowledgeNoteId && /^(grammar|vocabulary|reading|listening|speaking|writing)-(a1|a2|b1|b2|c1|c2)$/.test(rawKnowledgeNoteId)
    ? rawKnowledgeNoteId
    : null;
  if (rawKnowledgeNoteId && !knowledgeNoteId) {
    return res.status(400).json({ error: 'Некорректный идентификатор конспекта.' });
  }
  if (knowledgeNoteId && !req.session?.userId) {
    return res.status(401).json({ error: 'Войди в аккаунт, чтобы сохранять результаты теста.' });
  }
  const rawNoteMeta = req.body?.knowledge_note_meta || {};
  const knowledgeNoteMeta = {
    title: typeof rawNoteMeta.title === 'string' ? rawNoteMeta.title.replace(/\s+/gu, ' ').trim().slice(0, 100) : '',
    summary: typeof rawNoteMeta.summary === 'string' ? rawNoteMeta.summary.replace(/\s+/gu, ' ').trim().slice(0, 240) : '',
    category: typeof rawNoteMeta.category === 'string' ? rawNoteMeta.category.trim().toLowerCase() : '',
    level: typeof rawNoteMeta.level === 'string' ? rawNoteMeta.level.trim().toUpperCase() : ''
  };
  if (knowledgeNoteId && (
    !['grammar','vocabulary','reading','listening','speaking','writing'].includes(knowledgeNoteMeta.category) ||
    !['A1','A2','B1','B2','C1','C2'].includes(knowledgeNoteMeta.level) ||
    knowledgeNoteId !== knowledgeNoteMeta.category + '-' + knowledgeNoteMeta.level.toLowerCase()
  )) {
    return res.status(400).json({ error: 'Некорректные данные конспекта.' });
  }
  const request = {
    ...validated.value,
    interfaceLanguage: language.preferred_language === 'en' ? 'en' : 'ru'
  };
  const variation = randomUUID();
  const endpoint = 'https://api.cloudflare.com/client/v4/accounts/' +
    encodeURIComponent(process.env.CLOUDFLARE_ACCOUNT_ID) + '/ai/v1/chat/completions';

  let upstream;
  try {
    upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.CLOUDFLARE_API_TOKEN,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert but kind ' + (language.english_name || 'target-language') + ' teacher creating original, age-appropriate school exercises. Use ' + (language.english_name || 'the selected target language') + ' for all learner-facing text. Strictly follow the requested JSON schema. Never include personal data, dangerous instructions, sexual content, graphic violence, self-harm, or copied published text.'
          },
          {
            role: 'user',
            content: buildPracticeGenerationPrompt(request) +
              '\nUnique generation id: ' + variation + '. Create genuinely new questions and examples.'
          }
        ],
        stream: false,
        max_tokens: ({
          grammar: 850,
          vocabulary: 850,
          mixed: 900,
          reading: 1300,
          listening: 1250
        })[request.skill] || 850,
        temperature: 0.65,
        top_p: 0.85,
        chat_template_kwargs: { enable_thinking: false }
      }),
      signal: AbortSignal.timeout(60_000)
    });
  } catch (error) {
    console.error('Practice generation connection error:', error?.message || 'unknown error');
    return res.status(503).json({ error: 'ИИ временно недоступен. Попробуй позже.' });
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    console.error('Practice generation upstream status:', upstream.status, detail.slice(0, 300));
    if (upstream.status === 429) {
      return res.status(429).json({ error: 'Квота Cloudflare AI или лимит запросов исчерпаны. Попробуй позже.' });
    }
    if (upstream.status === 401 || upstream.status === 403) {
      return res.status(503).json({ error: 'Cloudflare отклонил запрос. Проверь разрешения AI-токена в Render.' });
    }
    return res.status(502).json({ error: 'ИИ не смог создать упражнение. Попробуй ещё раз.' });
  }

  let payload;
  try {
    payload = await upstream.json();
  } catch {
    return res.status(502).json({ error: 'Cloudflare вернул некорректный ответ.' });
  }

  const generatedText = payload?.choices?.[0]?.message?.content ??
    payload?.result?.response ?? payload?.response;

  try {
    const exercise = parseGeneratedPracticeExercise(generatedText, request);
    cleanGeneratedPracticeSessions();
    const exerciseId = randomUUID();
    generatedPracticeSessions.set(exerciseId, {
      exercise,
      expiresAt: Date.now() + PRACTICE_SESSION_TTL,
      knowledgeNoteId,
      knowledgeNoteMeta,
      languageCode: language.language_code.trim(),
      userId: knowledgeNoteId ? req.session.userId : null
    });

    const { questions, ...metadata } = exercise;
    return res.json({
      exercise_id: exerciseId,
      exercise: {
        ...metadata,
        questions: questions.map(question => ({
          id: question.id,
          prompt: question.prompt,
          category: question.category,
          options: question.options
        }))
      }
    });
  } catch (error) {
    console.error('Practice generation validation error:', error?.message || 'unknown error');
    return res.status(502).json({
      error: error?.message || 'ИИ вернул упражнение неподходящего формата. Попробуй ещё раз.'
    });
  }
});

app.post('/api/practice/:id/check', practiceCheckLimiter, async (req, res) => {
  if (!sameRequestOrigin(req)) {
    return res.status(403).json({ error: 'Источник запроса не разрешён.' });
  }

  const session = generatedPracticeSessions.get(req.params.id);
  if (!session || session.expiresAt <= Date.now()) {
    generatedPracticeSessions.delete(req.params.id);
    return res.status(404).json({ error: 'Срок этого задания истёк. Создай новое упражнение.' });
  }

  try {
    const activeLanguage = await getRequestStudyLanguage(req);
    if (!activeLanguage || activeLanguage.language_code.trim() !== session.languageCode) {
      return res.status(409).json({ error: 'Изучаемый язык изменился. Создай новое задание для активного курса.' });
    }
    const result = gradeGeneratedPracticeExercise(session.exercise, req.body?.answers);
    if (session.knowledgeNoteId) {
      if (!req.session?.userId || req.session.userId !== session.userId || !pool) {
        return res.status(401).json({ error: 'Сессия теста больше не связана с этим аккаунтом. Создай тест заново.' });
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO knowledge_quiz_attempts
             (user_id,language_code,note_id,category,level,score,correct_count,question_count,results)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
          [
            req.session.userId,
            session.languageCode,
            session.knowledgeNoteId,
            session.knowledgeNoteMeta.category,
            session.knowledgeNoteMeta.level,
            result.score,
            result.correct,
            result.total,
            JSON.stringify(result.results)
          ]
        );
        await client.query(
          `INSERT INTO knowledge_note_progress
             (user_id,language_code,note_id,title,summary,category,level,is_read,read_at,last_opened_at,last_score)
           VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,NOW(),NOW(),$8)
           ON CONFLICT (user_id,language_code,note_id) DO UPDATE SET
             title=EXCLUDED.title,
             summary=EXCLUDED.summary,
             category=EXCLUDED.category,
             level=EXCLUDED.level,
             is_read=TRUE,
             read_at=COALESCE(knowledge_note_progress.read_at,NOW()),
             last_opened_at=NOW(),
             last_score=EXCLUDED.last_score,
             updated_at=NOW()`,
          [
            req.session.userId,
            session.languageCode,
            session.knowledgeNoteId,
            session.knowledgeNoteMeta.title,
            session.knowledgeNoteMeta.summary,
            session.knowledgeNoteMeta.category,
            session.knowledgeNoteMeta.level,
            result.score
          ]
        );
        for (const item of result.results.filter(question => !question.is_correct)) {
          await client.query(
            `INSERT INTO error_journal
               (user_id,language_code,error_type,incorrect_form,correction,explanation)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [
              req.session.userId,
              session.languageCode,
              ['grammar','vocabulary','reading','listening','speaking','writing'].includes(item.category) ? item.category : session.knowledgeNoteMeta.category,
              (item.learning_point + ': ' + item.selected_answer).slice(0, 500),
              item.correct_answer.slice(0, 500),
              item.explanation.slice(0, 700)
            ]
          );
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      try {
        await recordActivity(req.session.userId, { minutes: 4, completedTasks: 1, languageCode: session.languageCode });
      } catch (error) {
        console.error('Knowledge quiz activity update failed:', error?.message || 'unknown error');
      }
      generatedPracticeSessions.delete(req.params.id);
      return res.json({ ...result, saved: true, note_id: session.knowledgeNoteId });
    }
    return res.json(result);
  } catch (error) {
    console.error('Practice grading or persistence failed:', error?.message || 'unknown error');
    res.status(400).json({ error: error?.message || 'Не удалось проверить ответы.' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    configured: isAiConfigured(),
    provider: 'cloudflare-workers-ai',
    learningConfigured: Boolean(pool && sessionsConfigured)
  });
});

// Keep the original chat contract compatible with the first version of Quiet English.
app.post('/api/chat', chatLimiter, async (req, res) => {
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

  let studyLanguage = { language_code:'en', preferred_language:'ru' };
  try {
    studyLanguage = await getRequestStudyLanguage(req) || studyLanguage;
  } catch {}
  const languageCode = String(studyLanguage.language_code || 'en').trim();
  const interfaceLanguage = studyLanguage.preferred_language === 'en' ? 'en' : 'ru';
  let tutorSystemPrompt = SYSTEM_PROMPT;
  if (languageCode !== 'en') {
    const targetLanguage = studyLanguage.english_name || 'the selected language';
    let learnerLevel = 'A2';
    try {
      const profile = await pool.query(
        'SELECT COALESCE(assessed_level,self_assessed_level,$3) AS level FROM learner_language_profiles WHERE user_id=$1 AND language_code=$2',
        [req.session?.userId || null,languageCode,'A2']
      );
      learnerLevel = profile.rows[0]?.level || 'A2';
    } catch {}
    tutorSystemPrompt = [
      'You are a kind, patient ' + targetLanguage + ' tutor for a general-audience learning website.',
      'The learner is studying ' + targetLanguage + ' at CEFR ' + learnerLevel + '. Teach accurate, natural language appropriate to this level.',
      'Use ' + targetLanguage + ' for practice, sample sentences, dialogues and corrections. Do not replace the target language with English.',
      'Explain grammar and give brief feedback in ' + (interfaceLanguage === 'en' ? 'English' : 'Russian') + '.',
      'Keep every response age-appropriate, respectful and safe.',
      'When correcting the learner, first respond to the meaning, then show a natural ' + targetLanguage + ' correction and one short explanation.',
      'Keep answers focused and ask at most one follow-up question at a time.',
      'Do not claim to hear audio or see files unless they were actually supplied.'
    ].join(' ');
  }

  const command = messages.at(-1)?.content.trim().toLowerCase();
  if (['/plan','/today','/practice','/review','/progress'].includes(command)) {
    try {
      const message = await buildCommandReply(req.session?.userId, command, languageCode);
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
          { role: 'system', content: tutorSystemPrompt },
          ...(await buildLearnerContext(req.session?.userId, req.body?.context_ref, languageCode)
            .then(context => context ? [{ role: 'system', content: context }] : [])),
          ...messages
        ],
        stream: false,
        max_tokens: 420,
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

app.get('/.well-known/assetlinks.json', (_req, res, next) => {
  const assetLinksPath = path.join(root, 'public', '.well-known', 'assetlinks.json');
  res.type('application/json').sendFile(assetLinksPath, error => {
    if (error) next(error);
  });
});

app.use(express.static(path.join(root, 'public')));

app.use((error, _req, res, _next) => {
  console.error('Request failed:', error?.message || 'unknown error');
  if (res.headersSent) return;
  res.status(500).json({ error: 'Внутренняя ошибка сервера. Попробуй ещё раз.' });
});

if (getAppRegion() === 'preview') {
  const readiness = getRegistrationReadiness();
  console.info(JSON.stringify({
    event: 'registration.readiness',
    available: readiness.available,
    region: readiness.region,
    blockers: readiness.blockers
  }));
}

app.listen(port, '0.0.0.0', () => {
  console.log('Quiet English 2.0 listening on ' + port);
});
