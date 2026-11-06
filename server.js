import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';
import { rateLimit } from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '32kb' }));
app.use('/api/', rateLimit({
  windowMs: 60_000,
  limit: 12,
  standardHeaders: 'draft-8',
  legacyHeaders: false
}));
app.use(express.static(path.join(root, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, configured: Boolean(process.env.OPENAI_API_KEY) });
});

app.post('/api/chat', async (req, res) => {
  const messages = req.body?.messages;
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 16) {
    return res.status(400).json({ error: 'Send between 1 and 16 messages.' });
  }
  const safe = [];
  for (const m of messages) {
    if (!m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string') {
      return res.status(400).json({ error: 'Invalid message.' });
    }
    const content = m.content.trim();
    if (!content || content.length > 2500) {
      return res.status(400).json({ error: 'Messages must contain 1–2,500 characters.' });
    }
    safe.push({ role: m.role, content });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.json({
      demo: true,
      message: 'This is the demo tutor. Your message has reached the site, but live GPT replies are not enabled yet. Add OPENAI_API_KEY to the Render service environment to activate the personal tutor. For now, try: “Can you explain the present perfect?”'
    });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      instructions: [
        'You are a calm, patient English tutor for a general-audience learning website.',
        'Practise natural English conversation, grammar, vocabulary, reading and writing.',
        'Adapt explanations to the learner. Keep all content age-appropriate, respectful and safe.',
        'Use English by default. If the learner writes in Russian or is confused, explain briefly in Russian and add a simple English example.',
        'When correcting, first respond to the meaning, then show a natural correction and one short explanation.',
        'Ask one useful follow-up question at a time. Do not claim to hear audio.'
      ].join(' '),
      input: safe
    });
    const message = response.output_text?.trim();
    if (!message) return res.status(502).json({ error: 'The tutor returned an empty answer.' });
    res.json({ message, demo: false });
  } catch (err) {
    console.error('OpenAI error:', err?.message || err);
    res.status(502).json({ error: 'The tutor is unavailable right now. Please try again.' });
  }
});

app.listen(port, '0.0.0.0', () => console.log('Quiet English listening on ' + port));