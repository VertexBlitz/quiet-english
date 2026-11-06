import express from 'express';
import { rateLimit } from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 3000;

app.set('trust proxy', 1);
app.use(express.json({ limit: '24kb' }));
app.use('/api/', rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false
}));
app.use(express.static(path.join(root, 'public')));

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

function isConfigured() {
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    configured: isConfigured(),
    provider: 'cloudflare-workers-ai'
  });
});

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

  if (!isConfigured()) {
    return res.status(503).json({
      error: 'ИИ пока не подключён. Добавьте CLOUDFLARE_ACCOUNT_ID и CLOUDFLARE_API_TOKEN в Render → Environment.'
    });
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(process.env.CLOUDFLARE_ACCOUNT_ID)}/ai/v1/chat/completions`;
  let upstream;

  try {
    upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        stream: true,
        max_tokens: 420,
        temperature: 0.35
      }),
      signal: AbortSignal.timeout(90_000)
    });
  } catch (error) {
    console.error('Workers AI connection error:', error?.message || 'unknown error');
    return res.status(503).json({ error: 'Сервис ИИ временно недоступен. Попробуйте ещё раз позже.' });
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    // Do not log or return secrets. The provider response is truncated for diagnostics.
    console.error('Workers AI response:', upstream.status, detail.slice(0, 500));

    if (upstream.status === 429) {
      return res.status(429).json({
        error: 'Бесплатный лимит запросов или дневная квота исчерпаны. Попробуйте позже.'
      });
    }
    if (upstream.status === 401 || upstream.status === 403) {
      return res.status(502).json({
        error: 'Cloudflare отклонил запрос. Проверьте API-токен, его разрешения и доступность выбранной модели на Free-плане.'
      });
    }
    return res.status(502).json({
      error: 'Модель временно не ответила. Попробуйте ещё раз немного позже.'
    });
  }

  if (!upstream.body) {
    return res.status(502).json({ error: 'Провайдер вернул пустой поток данных.' });
  }

  // Forward the provider's OpenAI-compatible SSE stream to the browser.
  res.status(200);
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders?.();

  try {
    for await (const chunk of upstream.body) {
      if (res.destroyed) break;
      if (!res.write(Buffer.from(chunk))) {
        await new Promise(resolve => res.once('drain', resolve));
      }
    }
  } catch (error) {
    console.error('Workers AI stream error:', error?.message || 'unknown error');
  } finally {
    if (!res.writableEnded) res.end();
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log('Quiet English listening on ' + port);
});
