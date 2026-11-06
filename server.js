import express from 'express';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pool } from './src/db.js';
import authRoutes from './src/routes/auth.js';
import learningRoutes from './src/routes/learning.js';

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));
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

function sameOrigin(req, res, next) {
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
} else {
  const notReady = (_req, res) => res.status(503).json({
    error: 'Личный кабинет ещё не настроен. Нужны DATABASE_URL и SESSION_SECRET.'
  });
  app.use('/api/auth', notReady);
  app.use('/api/learning', notReady);
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
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    configured: isAiConfigured(),
    provider: 'cloudflare-workers-ai',
    learningConfigured: Boolean(pool && sessionsConfigured)
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
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
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

app.use(express.static(path.join(root, 'public')));

app.use((error, _req, res, _next) => {
  console.error('Request failed:', error?.message || 'unknown error');
  if (res.headersSent) return;
  res.status(500).json({ error: 'Внутренняя ошибка сервера. Попробуй ещё раз.' });
});

app.listen(port, '0.0.0.0', () => {
  console.log('Quiet English 2.0 listening on ' + port);
});
