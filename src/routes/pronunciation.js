import express from 'express';
import { pool, requireDatabase, requireUser } from '../db.js';
import { normalizePronunciationResult } from '../pronunciation.js';

const router = express.Router();
router.use(requireDatabase, requireUser);

const audioParser = express.raw({ type: 'audio/wav', limit: '1.1mb' });
const MIN_AUDIO_BYTES = 44 + Math.floor(16_000 * 2 * 0.45);
const MAX_AUDIO_SECONDS = 30;

function validPcmWav(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < MIN_AUDIO_BYTES) return false;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') return false;
  // The browser encoder in pronunciation.js writes the canonical 44-byte PCM header.
  return buffer.readUInt16LE(20) === 1 &&
    buffer.readUInt16LE(22) === 1 &&
    buffer.readUInt32LE(24) === 16_000 &&
    buffer.readUInt16LE(34) === 16;
}

router.get('/status', (_req, res) => {
  res.json({
    configured: Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION),
    locale: 'en-US',
    maxAudioSeconds: MAX_AUDIO_SECONDS
  });
});

router.get('/history', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, reference_text, recognized_text, pron_score, accuracy_score,
              fluency_score, completeness_score, prosody_score, created_at
       FROM pronunciation_attempts
       WHERE user_id=$1
       ORDER BY created_at DESC
       LIMIT 8`,
      [req.user.id]
    );
    res.json({ attempts: rows });
  } catch (error) { next(error); }
});

router.post('/assess', audioParser, async (req, res, next) => {
  const referenceText = typeof req.query.referenceText === 'string' ? req.query.referenceText.trim() : '';
  const wordCount = referenceText ? referenceText.split(/\s+/u).length : 0;

  if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
    return res.status(503).json({ error: 'Оценка речи пока не подключена. Администратору нужно настроить Azure Speech.' });
  }
  if (referenceText.length < 8 || referenceText.length > 400 || wordCount < 2 || wordCount > 60) {
    return res.status(400).json({ error: 'Выбери текст длиной от 2 до 60 слов.' });
  }
  if (!validPcmWav(req.body)) {
    return res.status(400).json({ error: 'Запись должна быть WAV PCM, mono, 16 kHz и 16-bit. Запиши фразу ещё раз.' });
  }

  const audioSeconds = (req.body.length - 44) / (16_000 * 2);
  if (audioSeconds > MAX_AUDIO_SECONDS) {
    return res.status(400).json({ error: 'Запись слишком длинная. Максимум — 30 секунд.' });
  }

  const region = String(process.env.AZURE_SPEECH_REGION).toLowerCase();
  if (!/^[a-z0-9-]{2,40}$/u.test(region)) {
    return res.status(503).json({ error: 'Регион Azure Speech указан некорректно.' });
  }
  const endpoint = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`;
  const assessment = {
    ReferenceText: referenceText,
    GradingSystem: 'HundredMark',
    Granularity: 'Phoneme',
    Dimension: 'Comprehensive',
    EnableMiscue: true,
    EnableProsodyAssessment: true
  };

  let upstream;
  try {
    upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY,
        'Pronunciation-Assessment': Buffer.from(JSON.stringify(assessment), 'utf8').toString('base64'),
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        'Accept': 'application/json'
      },
      body: req.body,
      signal: AbortSignal.timeout(45_000)
    });
  } catch {
    return res.status(503).json({ error: 'Сервис оценки речи временно недоступен. Попробуй ещё раз.' });
  }

  if (!upstream.ok) {
    // Do not log the recording, reference text, response body, or personal speech data.
    if (upstream.status === 401 || upstream.status === 403) {
      return res.status(503).json({ error: 'Azure Speech не принял ключ или регион. Проверь настройки сервера.' });
    }
    if (upstream.status === 429) {
      return res.status(503).json({ error: 'Лимит запросов Azure Speech временно достигнут. Попробуй позже.' });
    }
    return res.status(502).json({ error: 'Не удалось оценить запись. Попробуй произнести фразу ещё раз.' });
  }

  let payload;
  try { payload = await upstream.json(); }
  catch { return res.status(502).json({ error: 'Сервис оценки вернул непонятный ответ.' }); }

  const result = normalizePronunciationResult(payload);
  if (!result || result.pronScore == null) {
    return res.status(422).json({ error: 'Не удалось разобрать речь. Проверь громкость микрофона и повтори запись.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO pronunciation_attempts
       (user_id, reference_text, recognized_text, pron_score, accuracy_score,
        fluency_score, completeness_score, prosody_score, word_results)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
       RETURNING id, created_at`,
      [
        req.user.id, referenceText, result.recognizedText, result.pronScore,
        result.accuracyScore, result.fluencyScore, result.completenessScore,
        result.prosodyScore, JSON.stringify(result.words)
      ]
    );
    res.json({
      attempt: { id: rows[0].id, created_at: rows[0].created_at },
      reference_text: referenceText,
      ...result
    });
  } catch (error) { next(error); }
});

export default router;
