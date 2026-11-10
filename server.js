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

async function buildCommandReply(userId, command) {
  if (!userId || !pool) {
    return 'Войди в личный кабинет и создай учебный план, чтобы использовать эту команду.';
  }

  if (command === '/plan') {
    const { rows } = await pool.query(
      `SELECT p.level, p.goal, p.duration_weeks, p.minutes_per_day,
              w.week_number, w.theme, w.objective
       FROM learning_plans p
       LEFT JOIN plan_weeks w ON w.plan_id=p.id
       WHERE p.user_id=$1 AND p.status='active'
       ORDER BY w.week_number`,
      [userId]
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
       WHERE p.user_id=$1 AND p.status='active'
         AND d.day_index=LEAST(GREATEST(((NOW() AT TIME ZONE
           (SELECT timezone FROM learner_profiles WHERE user_id=$1))::date-p.starts_on+1),1),28)
       LIMIT 1`,
      [userId]
    );
    if (!rows[0]) return 'Не нашёл сегодняшнюю задачу. Проверь, что у тебя есть активный план.';
    const due = await pool.query(
      'SELECT COUNT(*)::int AS count FROM srs_items WHERE user_id=$1 AND due_at<=NOW()',
      [userId]
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
      'SELECT COALESCE(assessed_level,self_assessed_level,\'A2\') AS level FROM learner_profiles WHERE user_id=$1',
      [userId]
    );
    const level = profile.rows[0]?.level || 'A2';
    const { rows } = await pool.query(
      `SELECT id, skill, level, objective, estimated_time
       FROM exercises WHERE status='published' AND skill IN ('vocabulary','grammar','reading')
       ORDER BY (level=$1) DESC, skill, id LIMIT 5`,
      [level]
    );
    if (!rows.length) return 'В библиотеке пока нет опубликованных заданий.';
    return ['Подходящая практика для тебя:', ...rows.map(item =>
      item.id + ' · ' + item.skill + ' · ' + item.level + ' · ' + item.estimated_time + ' мин — ' + item.objective
    ), 'Открой раздел «Практика», чтобы начать.'].join('\n');
  }

  if (command === '/review') {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM srs_items
       WHERE user_id=$1 AND due_at<=NOW()`,
      [userId]
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
         FROM daily_activity WHERE user_id=$1`,
        [userId]
      ),
      pool.query(
        'SELECT COUNT(*)::int AS count FROM error_journal WHERE user_id=$1 AND resolved_at IS NULL',
        [userId]
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



async function getRequestStudyLanguage(req) {
  const userId = req.session?.userId;
  if (!userId) {
    return { language_code: 'en', course_status: 'available', speech_supported: true, preferred_language: 'ru' };
  }
  const { rows } = await pool.query(
    `SELECT l.language_code, l.course_status, l.speech_supported, p.preferred_language
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
    if (!language || language.course_status !== 'available' || !['en','de'].includes(code)) {
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
  const targetLanguage = languageCode === 'de' ? 'German' : 'English';
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
  const { rows } = await pool.query(
    `SELECT id, skill, level, objective, content, answer_key, explanation
     FROM exercises
     WHERE language_code='de' AND status='published' AND level=$1
       AND skill IN ('grammar','vocabulary','communication')
     ORDER BY RANDOM() LIMIT 14`,
    [request.level]
  );
  const wanted = request.skill === 'mixed'
    ? rows
    : rows.filter(row => row.skill === request.skill);
  const fallback = wanted.length >= 5 ? wanted : rows;
  if (fallback.length < 5) throw new Error('Для выбранного уровня пока недостаточно немецких заданий.');
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
    const exercise = language.language_code.trim() === 'de'
      ? await buildGermanInstantPracticeExercise(request)
      : buildInstantPracticeExercise(request);
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
  if (knowledgeNoteId && language.language_code.trim() === 'de') {
    return res.status(409).json({ error: 'Тесты по немецким конспектам появятся вместе с отдельной базой знаний немецкого курса.' });
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
            content: 'You are an expert but kind ' + (language.language_code.trim() === 'de' ? 'German' : 'English') + ' teacher creating original, age-appropriate school exercises. Use the target language for all learner-facing text. Strictly follow the requested JSON schema. Never include personal data, dangerous instructions, sexual content, graphic violence, self-harm, or copied published text.'
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
