import express from 'express';
import { pool, requireDatabase, requireUser, loadActiveStudyLanguage, requireSpeechSupport } from '../db.js';

const router = express.Router();
router.use(requireDatabase, requireUser, loadActiveStudyLanguage, requireSpeechSupport);

const allowedWordStatuses = new Set(['match', 'different', 'missing', 'extra']);

router.get('/status', (req, res) => {
  res.json({
    configured: true,
    language_code: req.studyLanguageCode,
    locale: req.studyLanguage.locale,
    engine: 'whisper-browser',
    model: 'onnx-community/whisper-tiny',
    audioSentToServer: false
  });
});

router.get('/history', async (req, res, next) => {
  try {
    const historySql = [
      'SELECT id, reference_text, recognized_text, word_match_score, word_results, created_at',
      'FROM pronunciation_attempts',
      'WHERE user_id=$1 AND language_code=$2',
      'ORDER BY created_at DESC',
      'LIMIT 8'
    ].join(' ');
    const { rows } = await pool.query(historySql, [req.user.id, req.studyLanguageCode]);
    res.json({ attempts: rows });
  } catch (error) { next(error); }
});

router.post('/attempt', async (req, res, next) => {
  const referenceText = typeof req.body?.referenceText === 'string' ? req.body.referenceText.trim() : '';
  const recognizedText = typeof req.body?.recognizedText === 'string' ? req.body.recognizedText.trim() : '';
  const wordMatchScore = Number(req.body?.wordMatchScore);
  const words = req.body?.words;

  if (referenceText.length < 8 || referenceText.length > 400 ||
      referenceText.split(/\s+/u).length > 60) {
    return res.status(400).json({ error: 'Некорректный текст задания.' });
  }
  if (!recognizedText || recognizedText.length > 1_200) {
    return res.status(400).json({ error: 'Некорректный распознанный текст.' });
  }
  if (!Number.isFinite(wordMatchScore) || wordMatchScore < 0 || wordMatchScore > 100) {
    return res.status(400).json({ error: 'Некорректный результат сверки текста.' });
  }
  if (!Array.isArray(words) || words.length > 120) {
    return res.status(400).json({ error: 'Некорректный разбор слов.' });
  }

  const safeWords = words.map(item => ({
    reference: typeof item?.reference === 'string' ? item.reference.slice(0, 40) : '',
    recognized: typeof item?.recognized === 'string' ? item.recognized.slice(0, 40) : '',
    status: allowedWordStatuses.has(item?.status) ? item.status : 'different'
  }));

  try {
    const insertSql = [
      'INSERT INTO pronunciation_attempts',
      '(user_id, language_code, reference_text, recognized_text, word_match_score, word_results)',
      'VALUES ($1,$2,$3,$4,$5,$6::jsonb)',
      'RETURNING id, created_at'
    ].join(' ');
    const { rows } = await pool.query(insertSql, [
      req.user.id, req.studyLanguageCode, referenceText, recognizedText, wordMatchScore, JSON.stringify(safeWords)
    ]);
    res.json({ attempt: rows[0] });
  } catch (error) { next(error); }
});

export default router;
