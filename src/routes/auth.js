import express from 'express';
import argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { pool, requireDatabase, requireUser } from '../db.js';

const router = express.Router();
router.use(requireDatabase);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hashToken = value => createHash('sha256').update(value).digest('hex');
const validEmail = value => typeof value === 'string' && value.length <= 254 && emailPattern.test(value);
const appUrl = () => (process.env.APP_BASE_URL || '').replace(/\/$/, '');

async function sendMail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !appUrl()) {
    throw new Error('Email verification is not configured.');
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html }),
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(`Email provider returned ${response.status}: ${message.slice(0, 180)}`);
  }
}

async function createToken(client, userId, tokenType, hours = 24) {
  const raw = randomBytes(32).toString('base64url');
  await client.query(
    'INSERT INTO email_tokens (user_id, token_hash, token_type, expires_at) VALUES ($1,$2,$3,NOW() + ($4 * INTERVAL \'1 hour\'))',
    [userId, hashToken(raw), tokenType, hours]
  );
  return raw;
}

function messagePageUrl(page, token) {
  return `${appUrl()}/${page}?token=${encodeURIComponent(token)}`;
}

router.post('/register', async (req, res, next) => {
  const {
    email, password, age_band, country_code, guardian_email,
    preferred_language = 'ru', terms_accepted, privacy_accepted
  } = req.body || {};

  if (process.env.REGISTRATION_ENABLED !== 'true') {
    return res.status(503).json({ error: 'Регистрация пока закрыта на время настройки базы данных и проверки документов конфиденциальности.' });
  }
  if (age_band !== '18_plus' && process.env.MINOR_SIGNUP_ENABLED !== 'true') {
    return res.status(403).json({ error: 'Регистрация пользователей младше 18 лет временно закрыта до завершения проверки возрастных и родительских согласий.' });
  }
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedGuardian = typeof guardian_email === 'string' ? guardian_email.trim().toLowerCase() : '';
  if (!validEmail(normalizedEmail)) return res.status(400).json({ error: 'Укажи корректный email.' });
  if (typeof password !== 'string' || password.length < 12 || password.length > 200) {
    return res.status(400).json({ error: 'Пароль должен содержать от 12 до 200 символов.' });
  }
  if (!['13_15', '16_17', '18_plus'].includes(age_band)) {
    return res.status(400).json({ error: 'Выбери возрастную категорию.' });
  }
  if (!/^[A-Z]{2}$/.test(String(country_code || '').toUpperCase())) {
    return res.status(400).json({ error: 'Выбери страну проживания.' });
  }
  if (!['ru', 'en'].includes(preferred_language)) {
    return res.status(400).json({ error: 'Выбери язык интерфейса.' });
  }
  if (terms_accepted !== true || privacy_accepted !== true) {
    return res.status(400).json({ error: 'Нужно подтвердить согласие с условиями и политикой конфиденциальности.' });
  }
  if (age_band !== '18_plus' && (!validEmail(normalizedGuardian) || normalizedGuardian === normalizedEmail)) {
    return res.status(400).json({ error: 'Для аккаунта несовершеннолетнего укажи отдельный email родителя или опекуна.' });
  }
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !appUrl()) {
    return res.status(503).json({ error: 'Регистрация временно не настроена: администратору нужно подключить сервис подтверждения email.' });
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const client = await pool.connect();
  let userId, verifyToken, guardianToken;

  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (existing.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Аккаунт с таким email уже существует. Попробуй войти или восстановить пароль.' });
    }

    const result = await client.query(
      `INSERT INTO users (email, password_hash, age_band, country_code, guardian_email)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [normalizedEmail, passwordHash, age_band, String(country_code).toUpperCase(), age_band === '18_plus' ? null : normalizedGuardian]
    );
    userId = result.rows[0].id;
    await client.query(
      'INSERT INTO learner_profiles (user_id, preferred_language) VALUES ($1,$2)',
      [userId, preferred_language]
    );
    await client.query(
      `INSERT INTO consent_records (user_id, consent_type, policy_version, metadata)
       VALUES ($1,'terms','2026-11-06',$2::jsonb),($1,'privacy','2026-11-06',$2::jsonb)`,
      [userId, JSON.stringify({ source: 'registration', language: preferred_language })]
    );
    verifyToken = await createToken(client, userId, 'email_verify', 24);
    if (age_band !== '18_plus') guardianToken = await createToken(client, userId, 'guardian_consent', 72);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }

  try {
    await sendMail({
      to: normalizedEmail,
      subject: 'Подтверди email — Quiet English',
      html: `<p>Привет!</p><p>Подтверди адрес электронной почты, чтобы активировать аккаунт Quiet English:</p><p><a href="${messagePageUrl('verify.html', verifyToken)}">Подтвердить email</a></p><p>Если ты не создавал аккаунт, просто проигнорируй письмо.</p>`
    });
    if (guardianToken) {
      await sendMail({
        to: normalizedGuardian,
        subject: 'Запрос согласия родителя или опекуна — Quiet English',
        html: `<p>Поступил запрос на создание учебного аккаунта Quiet English для несовершеннолетнего пользователя.</p><p>Ознакомьтесь с информацией о сервисе и подтвердите согласие, если вы являетесь родителем или законным опекуном:</p><p><a href="${messagePageUrl('guardian-consent.html', guardianToken)}">Перейти к подтверждению</a></p><p>Не подтверждайте запрос, если вы не являетесь родителем или опекуном.</p>`
      });
    }
    res.status(201).json({
      ok: true,
      message: guardianToken
        ? 'Проверь почту и попроси родителя или опекуна проверить своё письмо.'
        : 'Проверь почту и подтверди email.'
    });
  } catch (error) {
    console.error('Registration email delivery failed:', error.message);
    res.status(202).json({
      ok: true,
      emailPending: true,
      message: 'Аккаунт создан, но письмо не удалось отправить. Проверь настройки почтового сервиса или запроси повторную отправку.'
    });
  }
});

router.post('/verify-email', async (req, res, next) => {
  const token = req.body?.token;
  if (typeof token !== 'string' || token.length < 30 || token.length > 200) {
    return res.status(400).json({ error: 'Ссылка подтверждения некорректна.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(
      `SELECT t.id, t.user_id, u.age_band, u.guardian_consented_at
       FROM email_tokens t JOIN users u ON u.id=t.user_id
       WHERE t.token_hash=$1 AND t.token_type='email_verify'
         AND t.consumed_at IS NULL AND t.expires_at > NOW()
       FOR UPDATE OF t`,
      [hashToken(token)]
    );
    if (!found.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ссылка недействительна или срок её действия истёк.' });
    }
    const item = found.rows[0];
    await client.query('UPDATE email_tokens SET consumed_at=NOW() WHERE id=$1', [item.id]);
    const status = item.age_band === '18_plus' || item.guardian_consented_at ? 'active' : 'pending_guardian';
    await client.query('UPDATE users SET email_verified_at=NOW(), account_status=$2, updated_at=NOW() WHERE id=$1', [item.user_id, status]);
    await client.query('COMMIT');
    res.json({ ok: true, status, message: status === 'active' ? 'Email подтверждён. Теперь можно войти.' : 'Email подтверждён. Ожидается согласие родителя или опекуна.' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

router.post('/guardian-consent', async (req, res, next) => {
  const token = req.body?.token;
  const confirmed = req.body?.is_parent_or_guardian === true;
  if (!confirmed) return res.status(400).json({ error: 'Для продолжения нужно подтвердить, что вы являетесь родителем или законным опекуном.' });
  if (typeof token !== 'string' || token.length < 30 || token.length > 200) {
    return res.status(400).json({ error: 'Ссылка подтверждения некорректна.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(
      `SELECT t.id, t.user_id, u.email_verified_at
       FROM email_tokens t JOIN users u ON u.id=t.user_id
       WHERE t.token_hash=$1 AND t.token_type='guardian_consent'
         AND t.consumed_at IS NULL AND t.expires_at > NOW()
       FOR UPDATE OF t`,
      [hashToken(token)]
    );
    if (!found.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ссылка недействительна или срок её действия истёк.' });
    }
    const item = found.rows[0];
    await client.query('UPDATE email_tokens SET consumed_at=NOW() WHERE id=$1', [item.id]);
    await client.query('UPDATE users SET guardian_consented_at=NOW(), account_status=$2, updated_at=NOW() WHERE id=$1',
      [item.user_id, item.email_verified_at ? 'active' : 'pending_verification']);
    await client.query(
      `INSERT INTO consent_records (user_id, consent_type, policy_version, metadata)
       VALUES ($1,'guardian','2026-11-06',$2::jsonb)`,
      [item.user_id, JSON.stringify({ source: 'guardian_email_link', attested: true })]
    );
    await client.query('COMMIT');
    res.json({ ok: true, message: 'Подтверждение сохранено. Если пользователь подтвердил свой email, аккаунт теперь активен.' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

router.post('/login', async (req, res, next) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body?.password;
  if (!validEmail(email) || typeof password !== 'string') return res.status(400).json({ error: 'Проверь email и пароль.' });
  try {
    const { rows } = await pool.query(
      'SELECT id, email, password_hash, role, account_status FROM users WHERE LOWER(email)=$1',
      [email]
    );
    const user = rows[0];
    if (!user || !(await argon2.verify(user.password_hash, password))) {
      return res.status(401).json({ error: 'Неверный email или пароль.' });
    }
    if (user.account_status !== 'active') {
      return res.status(403).json({
        error: user.account_status === 'pending_guardian'
          ? 'Ожидается подтверждение родителя или опекуна.'
          : 'Сначала подтверди email и необходимые согласия.'
      });
    }
    await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
    req.session.userId = user.id;
    req.session.role = user.role;
    res.json({ ok: true, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  if (!req.session) return res.json({ ok: true });
  req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie('qe.sid');
    res.json({ ok: true });
  });
});

router.get('/me', async (req, res, next) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Необходимо войти в аккаунт.' });
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.role, u.age_band, p.preferred_language, p.goal,
              p.assessed_level, p.minutes_per_day, p.onboarding_completed_at
       FROM users u JOIN learner_profiles p ON p.user_id=u.id
       WHERE u.id=$1 AND u.account_status='active'`,
      [req.session.userId]
    );
    if (!rows[0]) return res.status(401).json({ error: 'Аккаунт недоступен.' });
    res.json({ user: rows[0] });
  } catch (error) {
    next(error);
  }
});


router.get('/export', requireUser, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [profile, placements, plans, attempts, reviews, errors, activity, consents, pronunciation] = await Promise.all([
      pool.query('SELECT preferred_language, goal, self_assessed_level, assessed_level, minutes_per_day, duration_weeks, interests, timezone, created_at FROM learner_profiles WHERE user_id=$1',[userId]),
      pool.query('SELECT answers, correct_count, total_questions, estimated_level, completed_at FROM placement_attempts WHERE user_id=$1 ORDER BY completed_at',[userId]),
      pool.query('SELECT id, goal, level, duration_weeks, minutes_per_day, status, starts_on, created_at, completed_at FROM learning_plans WHERE user_id=$1 ORDER BY created_at',[userId]),
      pool.query('SELECT exercise_id, exercise_version, answer, is_correct, score, feedback, created_at FROM exercise_attempts WHERE user_id=$1 ORDER BY created_at',[userId]),
      pool.query('SELECT item_type, item_ref, prompt, answer, interval_days, repetitions, due_at, last_rating FROM srs_items WHERE user_id=$1',[userId]),
      pool.query('SELECT error_type, incorrect_form, correction, explanation, occurrences, resolved_at, created_at FROM error_journal WHERE user_id=$1 ORDER BY created_at',[userId]),
      pool.query('SELECT activity_date, minutes, completed_tasks FROM daily_activity WHERE user_id=$1 ORDER BY activity_date',[userId]),
      pool.query('SELECT consent_type, policy_version, accepted_at FROM consent_records WHERE user_id=$1 ORDER BY accepted_at',[userId]),
      pool.query('SELECT reference_text, recognized_text, pron_score, accuracy_score, fluency_score, completeness_score, prosody_score, word_results, created_at FROM pronunciation_attempts WHERE user_id=$1 ORDER BY created_at',[userId])
    ]);
    res.json({
      exported_at: new Date().toISOString(),
      account: { email: req.user.email, age_band: req.user.age_band, created_at: req.user.created_at },
      profile: profile.rows[0] || null,
      placements: placements.rows,
      plans: plans.rows,
      exercise_attempts: attempts.rows,
      review_items: reviews.rows,
      errors: errors.rows,
      activity: activity.rows,
      consents: consents.rows,
      pronunciation_attempts: pronunciation.rows
    });
  } catch (error) { next(error); }
});

router.delete('/account', requireUser, async (req, res, next) => {
  if (req.body?.confirm !== 'DELETE') {
    return res.status(400).json({ error: 'Для удаления аккаунта введи DELETE в поле подтверждения.' });
  }
  const userId = req.user.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("DELETE FROM user_sessions WHERE sess->>'userId'=$1", [userId]);
    await client.query('DELETE FROM users WHERE id=$1', [userId]);
    await client.query('COMMIT');
    req.session.destroy(() => {});
    res.clearCookie('qe.sid');
    res.json({ ok: true, message: 'Аккаунт и связанные учебные данные удалены.' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

router.post('/password/forgot', async (req, res, next) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!validEmail(email)) return res.status(400).json({ error: 'Укажи корректный email.' });
  try {
    const { rows } = await pool.query('SELECT id FROM users WHERE LOWER(email)=$1 AND account_status <> \'disabled\'', [email]);
    if (rows[0]) {
      const token = await createToken(pool, rows[0].id, 'password_reset', 1);
      await sendMail({
        to: email,
        subject: 'Сброс пароля — Quiet English',
        html: `<p>Чтобы задать новый пароль, открой ссылку в течение часа:</p><p><a href="${messagePageUrl('reset-password.html', token)}">Сбросить пароль</a></p><p>Если ты не запрашивал сброс, проигнорируй письмо.</p>`
      });
    }
    res.json({ ok: true, message: 'Если аккаунт существует, инструкция будет отправлена на его email.' });
  } catch (error) {
    next(error);
  }
});

router.post('/password/reset', async (req, res, next) => {
  const { token, password } = req.body || {};
  if (typeof token !== 'string' || token.length < 30 || typeof password !== 'string' || password.length < 12 || password.length > 200) {
    return res.status(400).json({ error: 'Проверь ссылку и новый пароль (минимум 12 символов).' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(
      `SELECT id, user_id FROM email_tokens WHERE token_hash=$1 AND token_type='password_reset'
       AND consumed_at IS NULL AND expires_at > NOW() FOR UPDATE`,
      [hashToken(token)]
    );
    if (!found.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ссылка недействительна или срок её действия истёк.' });
    }
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await client.query('UPDATE users SET password_hash=$2, updated_at=NOW() WHERE id=$1', [found.rows[0].user_id, passwordHash]);
    await client.query("DELETE FROM user_sessions WHERE sess->>'userId'=$1", [found.rows[0].user_id]);
    await client.query('UPDATE email_tokens SET consumed_at=NOW() WHERE user_id=$1 AND token_type IN (\'password_reset\',\'email_verify\',\'guardian_consent\') AND consumed_at IS NULL', [found.rows[0].user_id]);
    await client.query('COMMIT');
    res.json({ ok: true, message: 'Пароль обновлён. Теперь можно войти.' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

export default router;
