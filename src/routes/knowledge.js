import express from 'express';
import { pool, requireDatabase, requireUser } from '../db.js';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();
const CATEGORIES = new Set(['grammar', 'vocabulary', 'reading', 'listening', 'speaking', 'writing']);
const LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
const NOTE_ID = /^(grammar|vocabulary|reading|listening|speaking|writing)-(a1|a2|b1|b2|c1|c2)$/;

function cleanText(value, max = 240) {
  return typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim().slice(0, max) : '';
}
function validNoteId(value) {
  return typeof value === 'string' && NOTE_ID.test(value);
}
function noteMeta(body = {}) {
  const category = cleanText(body.category, 20).toLowerCase();
  const level = cleanText(body.level, 3).toUpperCase();
  return {
    title: cleanText(body.title, 100),
    summary: cleanText(body.summary, 240),
    category: CATEGORIES.has(category) ? category : '',
    level: LEVELS.has(level) ? level : ''
  };
}
function invalidNote(res) {
  return res.status(400).json({ error: 'Не удалось определить конспект. Обнови страницу и попробуй снова.' });
}

router.get('/library', requireDatabase, requireUser, async (req, res, next) => {
  try {
    const [notes, collections] = await Promise.all([
      pool.query(
        `SELECT note_id, title, summary, category, level, is_favorite, is_read,
                last_score, first_opened_at, last_opened_at, read_at
         FROM knowledge_note_progress
         WHERE user_id=$1 AND (is_favorite=TRUE OR is_read=TRUE OR last_opened_at IS NOT NULL)
         ORDER BY is_favorite DESC, last_opened_at DESC NULLS LAST, updated_at DESC`,
        [req.user.id]
      ),
      pool.query(
        `SELECT c.id, c.name, c.description, c.created_at, c.updated_at,
                COUNT(n.note_id)::int AS note_count,
                COALESCE(
                  json_agg(n.note_id ORDER BY n.position, n.added_at)
                    FILTER (WHERE n.note_id IS NOT NULL),
                  '[]'::json
                ) AS note_ids
         FROM knowledge_collections c
         LEFT JOIN knowledge_collection_notes n ON n.collection_id=c.id
         WHERE c.user_id=$1
         GROUP BY c.id
         ORDER BY c.updated_at DESC`,
        [req.user.id]
      )
    ]);
    res.json({ notes: notes.rows, collections: collections.rows });
  } catch (error) { next(error); }
});

router.get('/notes/:noteId', requireDatabase, requireUser, async (req, res, next) => {
  if (!validNoteId(req.params.noteId)) return invalidNote(res);
  try {
    const { rows } = await pool.query(
      `SELECT note_id, title, summary, category, level, is_favorite, is_read,
              last_score, first_opened_at, last_opened_at, read_at
       FROM knowledge_note_progress WHERE user_id=$1 AND note_id=$2`,
      [req.user.id, req.params.noteId]
    );
    res.json({ progress: rows[0] || null });
  } catch (error) { next(error); }
});

router.post('/notes/:noteId/open', requireDatabase, requireUser, async (req, res, next) => {
  if (!validNoteId(req.params.noteId)) return invalidNote(res);
  const meta = noteMeta(req.body);
  if (!meta.category || !meta.level) return res.status(400).json({ error: 'Некорректные данные конспекта.' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO knowledge_note_progress
         (user_id, note_id, title, summary, category, level, first_opened_at, last_opened_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
       ON CONFLICT (user_id,note_id) DO UPDATE SET
         title=EXCLUDED.title, summary=EXCLUDED.summary,
         category=EXCLUDED.category, level=EXCLUDED.level,
         first_opened_at=COALESCE(knowledge_note_progress.first_opened_at,NOW()),
         last_opened_at=NOW(), updated_at=NOW()
       RETURNING note_id, is_favorite, is_read, last_score, last_opened_at`,
      [req.user.id, req.params.noteId, meta.title, meta.summary, meta.category, meta.level]
    );
    res.json({ progress: rows[0] });
  } catch (error) { next(error); }
});

router.put('/notes/:noteId', requireDatabase, requireUser, async (req, res, next) => {
  if (!validNoteId(req.params.noteId)) return invalidNote(res);
  const meta = noteMeta(req.body);
  const favorite = typeof req.body?.is_favorite === 'boolean' ? req.body.is_favorite : null;
  const read = typeof req.body?.is_read === 'boolean' ? req.body.is_read : null;
  if (favorite === null && read === null) return res.status(400).json({ error: 'Нет изменений для сохранения.' });
  if (!meta.category || !meta.level) return res.status(400).json({ error: 'Некорректные данные конспекта.' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO knowledge_note_progress
         (user_id, note_id, title, summary, category, level, is_favorite, is_read, read_at)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,FALSE),COALESCE($8,FALSE),
               CASE WHEN $8 IS TRUE THEN NOW() ELSE NULL END)
       ON CONFLICT (user_id,note_id) DO UPDATE SET
         title=EXCLUDED.title, summary=EXCLUDED.summary,
         category=EXCLUDED.category, level=EXCLUDED.level,
         is_favorite=COALESCE($7,knowledge_note_progress.is_favorite),
         is_read=COALESCE($8,knowledge_note_progress.is_read),
         read_at=CASE
           WHEN $8 IS TRUE THEN COALESCE(knowledge_note_progress.read_at,NOW())
           WHEN $8 IS FALSE THEN NULL
           ELSE knowledge_note_progress.read_at
         END,
         updated_at=NOW()
       RETURNING note_id, is_favorite, is_read, last_score, read_at`,
      [req.user.id, req.params.noteId, meta.title, meta.summary, meta.category, meta.level, favorite, read]
    );
    res.json({ progress: rows[0] });
  } catch (error) { next(error); }
});

router.get('/collections', requireDatabase, requireUser, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.description, c.created_at, c.updated_at,
              COUNT(n.note_id)::int AS note_count,
              COALESCE(json_agg(n.note_id ORDER BY n.position, n.added_at)
                FILTER (WHERE n.note_id IS NOT NULL), '[]'::json) AS note_ids
       FROM knowledge_collections c
       LEFT JOIN knowledge_collection_notes n ON n.collection_id=c.id
       WHERE c.user_id=$1 GROUP BY c.id ORDER BY c.updated_at DESC`,
      [req.user.id]
    );
    res.json({ collections: rows });
  } catch (error) { next(error); }
});

router.post('/collections', requireDatabase, requireUser, async (req, res, next) => {
  const name = cleanText(req.body?.name, 48);
  const description = cleanText(req.body?.description, 180);
  if (name.length < 2) return res.status(400).json({ error: 'Название подборки должно содержать минимум 2 символа.' });
  try {
    const count = await pool.query('SELECT COUNT(*)::int AS count FROM knowledge_collections WHERE user_id=$1', [req.user.id]);
    if (count.rows[0].count >= 30) return res.status(409).json({ error: 'Можно создать не более 30 подборок.' });
    const { rows } = await pool.query(
      'INSERT INTO knowledge_collections (user_id,name,description) VALUES ($1,$2,$3) RETURNING id,name,description,created_at',
      [req.user.id, name, description]
    );
    res.status(201).json({ collection: { ...rows[0], note_count: 0, note_ids: [] } });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Подборка с таким названием уже существует.' });
    next(error);
  }
});

router.get('/collections/:id', requireDatabase, requireUser, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.description,
              COALESCE(json_agg(n.note_id ORDER BY n.position, n.added_at)
                FILTER (WHERE n.note_id IS NOT NULL), '[]'::json) AS note_ids
       FROM knowledge_collections c
       LEFT JOIN knowledge_collection_notes n ON n.collection_id=c.id
       WHERE c.id=$1 AND c.user_id=$2 GROUP BY c.id`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Подборка не найдена.' });
    res.json({ collection: rows[0] });
  } catch (error) { next(error); }
});

router.post('/collections/:id/notes', requireDatabase, requireUser, async (req, res, next) => {
  const noteId = req.body?.note_id;
  if (!validNoteId(noteId)) return invalidNote(res);
  try {
    const owned = await pool.query('SELECT id FROM knowledge_collections WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!owned.rows[0]) return res.status(404).json({ error: 'Подборка не найдена.' });
    await pool.query(
      `INSERT INTO knowledge_collection_notes (collection_id,note_id,position)
       VALUES ($1,$2,COALESCE((SELECT MAX(position)+1 FROM knowledge_collection_notes WHERE collection_id=$1),0))
       ON CONFLICT (collection_id,note_id) DO NOTHING`,
      [req.params.id, noteId]
    );
    await pool.query('UPDATE knowledge_collections SET updated_at=NOW() WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

router.delete('/collections/:id/notes/:noteId', requireDatabase, requireUser, async (req, res, next) => {
  if (!validNoteId(req.params.noteId)) return invalidNote(res);
  try {
    const result = await pool.query(
      `DELETE FROM knowledge_collection_notes n
       USING knowledge_collections c
       WHERE n.collection_id=c.id AND c.id=$1 AND c.user_id=$2 AND n.note_id=$3`,
      [req.params.id, req.user.id, req.params.noteId]
    );
    await pool.query('UPDATE knowledge_collections SET updated_at=NOW() WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Конспект не найден в этой подборке.' });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

router.delete('/collections/:id', requireDatabase, requireUser, async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM knowledge_collections WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Подборка не найдена.' });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

router.get('/map', requireDatabase, requireUser, async (req, res, next) => {
  try {
    const [notes, quizzes, exercises, speaking, errors, recent, recentErrors] = await Promise.all([
      pool.query(
        `SELECT category, COUNT(*)::int AS notes,
                COUNT(*) FILTER (WHERE is_read)::int AS read_notes,
                COUNT(*) FILTER (WHERE is_favorite)::int AS favorites
         FROM knowledge_note_progress WHERE user_id=$1 GROUP BY category`,
        [req.user.id]
      ),
      pool.query(
        `SELECT category, COUNT(*)::int AS attempts,
                SUM(correct_count)::int AS correct,
                SUM(question_count)::int AS questions,
                ROUND(AVG(score))::int AS accuracy
         FROM knowledge_quiz_attempts WHERE user_id=$1 GROUP BY category`,
        [req.user.id]
      ),
      pool.query(
        `SELECT CASE WHEN e.skill='pronunciation' THEN 'speaking' ELSE e.skill END AS skill,
                COUNT(*)::int AS attempts,
                COUNT(*) FILTER (WHERE a.is_correct)::int AS correct,
                ROUND(AVG(a.score))::int AS accuracy
         FROM exercise_attempts a JOIN exercises e ON e.id=a.exercise_id
         WHERE a.user_id=$1
         GROUP BY CASE WHEN e.skill='pronunciation' THEN 'speaking' ELSE e.skill END`,
        [req.user.id]
      ),
      pool.query(
        'SELECT COUNT(*)::int AS attempts, ROUND(AVG(word_match_score))::int AS accuracy FROM pronunciation_attempts WHERE user_id=$1',
        [req.user.id]
      ),
      pool.query(
        'SELECT error_type, COUNT(*)::int AS count FROM error_journal WHERE user_id=$1 AND resolved_at IS NULL GROUP BY error_type',
        [req.user.id]
      ),
      pool.query(
        `SELECT note_id,title,category,level,last_score,is_read,is_favorite,last_opened_at
         FROM knowledge_note_progress WHERE user_id=$1
         ORDER BY last_opened_at DESC NULLS LAST LIMIT 8`,
        [req.user.id]
      ),
      pool.query(
        `SELECT error_type,incorrect_form,correction,explanation,occurrences,updated_at
         FROM error_journal WHERE user_id=$1 AND resolved_at IS NULL
         ORDER BY updated_at DESC LIMIT 8`,
        [req.user.id]
      )
    ]);

    const skillNames = ['grammar', 'vocabulary', 'reading', 'listening', 'speaking', 'writing'];
    const skillLabels = {
      grammar: 'Грамматика', vocabulary: 'Лексика', reading: 'Чтение',
      listening: 'Аудирование', speaking: 'Говорение', writing: 'Письмо'
    };
    const skills = skillNames.map(skill => {
      const note = notes.rows.find(row => row.category === skill) || {};
      const quiz = quizzes.rows.find(row => row.category === skill) || {};
      const exercise = exercises.rows.find(row => row.skill === skill) || {};
      const pronunciation = skill === 'speaking' ? speaking.rows[0] || {} : {};
      const quizAttempts = Number(quiz.attempts || 0);
      const exerciseAttempts = Number(exercise.attempts || 0);
      const pronunciationAttempts = Number(pronunciation.attempts || 0);
      const attempts = quizAttempts + exerciseAttempts + pronunciationAttempts;
      const accuracyParts = [];
      if (quizAttempts) accuracyParts.push({ weight: quizAttempts, value: Number(quiz.accuracy || 0) });
      if (exerciseAttempts) accuracyParts.push({ weight: exerciseAttempts, value: Number(exercise.accuracy || 0) });
      if (pronunciationAttempts) accuracyParts.push({ weight: pronunciationAttempts, value: Number(pronunciation.accuracy || 0) });
      const accuracy = accuracyParts.length
        ? Math.round(accuracyParts.reduce((sum, part) => sum + part.weight * part.value, 0) /
            accuracyParts.reduce((sum, part) => sum + part.weight, 0))
        : null;
      const openErrors = errors.rows
        .filter(row => row.error_type === skill || row.error_type.startsWith(skill + ':'))
        .reduce((sum, row) => sum + Number(row.count), 0);
      const readNotes = Number(note.read_notes || 0);
      const status = openErrors > 0 || (attempts >= 2 && accuracy !== null && accuracy < 65)
        ? 'review'
        : (attempts >= 3 && accuracy !== null && accuracy >= 80 ? 'mastered' : (readNotes ? 'learning' : 'new'));
      return {
        skill, label: skillLabels[skill],
        notes: Number(note.notes || 0), read_notes: readNotes,
        favorites: Number(note.favorites || 0), attempts, accuracy,
        open_errors: openErrors, status
      };
    });
    res.json({ skills, recent_notes: recent.rows, review_queue: recentErrors.rows });
  } catch (error) { next(error); }
});

router.get('/vocabulary', requireDatabase, requireUser, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id,word,ipa,translation,definition,metadata,created_at
       FROM learner_vocabulary WHERE user_id=$1 ORDER BY created_at DESC LIMIT 200`,
      [req.user.id]
    );
    res.json({ words: rows });
  } catch (error) { next(error); }
});

router.post('/vocabulary', requireDatabase, requireUser, async (req, res, next) => {
  const word = cleanText(req.body?.word, 80);
  if (!word || !/^[a-z][a-z' -]{0,78}$/iu.test(word)) {
    return res.status(400).json({ error: 'Введи английское слово или фразовый глагол.' });
  }
  const ipa = cleanText(req.body?.ipa, 100);
  const translation = cleanText(req.body?.translation, 240);
  const definition = cleanText(req.body?.definition, 500);
  const metadata = req.body?.metadata && typeof req.body.metadata === 'object'
    ? JSON.stringify(req.body.metadata).slice(0, 12000)
    : '{}';
  try {
    const { rows } = await pool.query(
      `INSERT INTO learner_vocabulary (user_id,word,ipa,translation,definition,metadata)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb)
       ON CONFLICT (user_id,LOWER(word)) DO UPDATE SET
         ipa=EXCLUDED.ipa, translation=EXCLUDED.translation,
         definition=EXCLUDED.definition, metadata=EXCLUDED.metadata, updated_at=NOW()
       RETURNING id,word,ipa,translation,definition,metadata,created_at`,
      [req.user.id, word, ipa, translation, definition, metadata]
    );
    res.status(201).json({ word: rows[0] });
  } catch (error) { next(error); }
});

router.delete('/vocabulary/:id', requireDatabase, requireUser, async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM learner_vocabulary WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Слово не найдено.' });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

const dictionaryEnrichLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
router.post('/dictionary-enrich/:word', dictionaryEnrichLimiter, async (req, res) => {
  const word = cleanText(req.params.word, 60);
  if (!/^[a-z][a-z' -]{0,58}$/iu.test(word)) return res.status(400).json({ error: 'Введи одно английское слово или короткую фразу.' });
  const definitions = Array.isArray(req.body?.definitions)
    ? req.body.definitions.slice(0, 3).map(value => cleanText(value, 220)).filter(Boolean)
    : [];
  if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    return res.status(503).json({ error: 'AI enrichment is not configured on this preview service.' });
  }
  const endpoint = 'https://api.cloudflare.com/client/v4/accounts/' +
    encodeURIComponent(process.env.CLOUDFLARE_ACCOUNT_ID) + '/ai/v1/chat/completions';
  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.CLOUDFLARE_API_TOKEN,
        'Content-Type': 'application/json', Accept: 'application/json'
      },
      body: JSON.stringify({
        model: process.env.CLOUDFLARE_MODEL || '@cf/google/gemma-4-26b-a4b-it',
        messages: [
          { role: 'system', content: 'You are an accurate, age-appropriate English dictionary tutor. Return one JSON object only. Do not invent IPA or audio URLs. Keep translations concise and examples original.' },
          { role: 'user', content:
            'Explain the English item "' + word + '" for a Russian-speaking learner. Dictionary definitions for context: ' +
            JSON.stringify(definitions) +
            '. Return JSON keys translation_ru, collocations (3 objects with phrase, meaning_ru, example), phrasal_verbs (up to 3 objects with phrase, meaning_ru, example), and examples (3 objects with en, ru). If the item is not a word that naturally forms phrasal verbs, return an empty phrasal_verbs array. Keep examples original, natural and concise. No Markdown.'
          }
        ],
        stream: false, max_tokens: 650, temperature: 0.25,
        chat_template_kwargs: { enable_thinking: false }
      }),
      signal: AbortSignal.timeout(25_000)
    });
    if (!upstream.ok) return res.status(502).json({ error: 'AI dictionary enrichment is temporarily unavailable.' });
    const payload = await upstream.json();
    const raw = payload?.choices?.[0]?.message?.content ?? payload?.result?.response ?? payload?.response;
    const first = typeof raw === 'string' ? raw.indexOf('{') : -1;
    const last = typeof raw === 'string' ? raw.lastIndexOf('}') : -1;
    if (first < 0 || last <= first) return res.status(502).json({ error: 'Dictionary enrichment returned an invalid response.' });
    const data = JSON.parse(raw.slice(first, last + 1));
    const list = (value, max) => Array.isArray(value) ? value.slice(0, max).map(item => ({
      phrase: cleanText(item?.phrase, 90),
      meaning_ru: cleanText(item?.meaning_ru, 160),
      example: cleanText(item?.example, 200),
      en: cleanText(item?.en, 200),
      ru: cleanText(item?.ru, 200)
    })).filter(item => Object.values(item).some(Boolean)) : [];
    res.json({
      translation_ru: cleanText(data.translation_ru, 220),
      collocations: list(data.collocations, 5),
      phrasal_verbs: list(data.phrasal_verbs, 5),
      examples: list(data.examples, 4)
    });
  } catch (error) {
    console.error('Dictionary enrichment failed:', error?.message || 'unknown error');
    res.status(503).json({ error: 'Не удалось дополнить словарную статью. Попробуй позже.' });
  }
});

export default router;
