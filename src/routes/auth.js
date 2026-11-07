import express from 'express';
import argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { pool, requireDatabase, requireUser } from '../db.js';
import {
  isAdultRegistration,
  normalizeCountryCode,
  isValidCountryCode,
  verifyTurnstileToken,
  TERMS_POLICY_VERSION,
  PRIVACY_POLICY_VERSION
} from '../registration-security.js';

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

router.post('/resend-verification', async (req, res, next) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!validEmail(email)) return res.status(400).json({ error: 'Укажи корректный email.' });
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !appUrl()) {
    return res.status(503).json({ error: 'Повторная отправка пока не настроена.' });
  }
  try {
    const found = await pool.query(
      "SELECT id FROM users WHERE LOWER(email)=$1 AND email_verified_at IS NULL AND account_status <> 'disabled'",
      [email]
    );
    if (found.rows[0]) {
      const userId = found.rows[0].id;
      await pool.query(
        "UPDATE email_tokens SET consumed_at=NOW() WHERE user_id=$1 AND token_type='email_verify' AND consumed_at IS NULL",
        [userId]
      );
      const token = await createToken(pool, userId, 'email_verify', 24);
      await sendMail({
        to: email,
        subject: 'Подтверди email — Quiet English',
        html: '<p>Подтверди адрес электронной почты, чтобы активировать аккаунт Quiet English:</p>' +
          '<p><a href="' + messagePageUrl('verify.html', token) + '">Подтвердить email</a></p>' +
          '<p>Ссылка действует 24 часа. Если ты не создавал аккаунт, проигнорируй письмо.</p>'
      });
    }
    res.json({ ok: true, message: 'Если аккаунт существует и email ещё не подтверждён, письмо отправлено.' });
  } catch (error) {
    next(error);
  }
});

router.post('/register', async (req, res, next) => {
  const {
    email, password, age_band, country_code,
    preferred_language = 'ru', terms_accepted, privacy_accepted, adult_confirmed
  } = req.body || {};

  if (process.env.REGISTRATION_ENABLED !== 'true' || process.env.REGISTRATION_LEGAL_APPROVED !== 'true') {
    return res.status(503).json({ error: 'Регистрация временно закрыта. Попробуй позже.' });
  }
  if (process.env.REGISTRATION_DATABASE_ISOLATED !== 'true') {
    return res.status(503).json({ error: 'Регистрация временно недоступна: база Preview ещё не отделена от основной базы.' });
  }
  if (!process.env.TURNSTILE_SITE_KEY || !process.env.TURNSTILE_SECRET_KEY) {
    return res.status(503).json({ error: 'Проверка безопасности регистрации пока не настроена.' });
  }
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!validEmail(normalizedEmail)) return res.status(400).json({ error: 'Укажи корректный email.' });
  if (typeof password !== 'string' || password.length < 12 || password.length > 200) {
    return res.status(400).json({ error: 'Пароль должен содержать от 12 до 200 символов.' });
  }
  if (!isAdultRegistration(age_band, adult_confirmed)) {
    return res.status(403).json({ error: 'Подтверди, что тебе уже исполнилось 18 лет. Регистрация несовершеннолетних закрыта.' });
  }
  const normalizedCountryCode = normalizeCountryCode(country_code);
  if (!isValidCountryCode(normalizedCountryCode)) {
    return res.status(400).json({ error: 'Укажи двухбуквенный код страны, например DE или US.' });
  }
  if (!['ru', 'en'].includes(preferred_language)) {
    return res.status(400).json({ error: 'Выбери язык интерфейса.' });
  }
  if (terms_accepted !== true || privacy_accepted !== true) {
    return res.status(400).json({ error: 'Нужно подтвердить согласие с условиями и политикой конфиденциальности.' });
  }
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !appUrl()) {
    return res.status(503).json({ error: 'Регистрация временно не настроена: администратору нужно подключить сервис подтверждения email.' });
  }

  let expectedHostname;
  try {
    expectedHostname = new URL(appUrl()).hostname;
  } catch {
    return res.status(503).json({ error: 'Проверка адреса сайта для CAPTCHA не настроена.' });
  }
  const captchaResult = await verifyTurnstileToken(req.body?.turnstile_token, {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    expectedHostname
  });
  if (!captchaResult.ok) {
    if (captchaResult.reason === 'provider_unavailable' || captchaResult.reason === 'not_configured') {
      console.error('Registration CAPTCHA verification unavailable:', captchaResult.reason);
      return res.status(503).json({ error: 'Проверка безопасности временно недоступна. Попробуй позже.' });
    }
    return res.status(400).json({ error: 'Пройди проверку безопасности ещё раз.' });
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const client = await pool.connect();
  let userId, verifyToken;

  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (existing.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Аккаунт с таким email уже существует. Попробуй войти или восстановить пароль.' });
    }

    const result = await client.query(
      `INSERT INTO users (email, password_hash, age_band, country_code)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [normalizedEmail, passwordHash, age_band, normalizedCountryCode]
    );
    userId = result.rows[0].id;
    await client.query(
      'INSERT INTO learner_profiles (user_id, preferred_language) VALUES ($1,$2)',
      [userId, preferred_language]
    );
    await client.query(
      `INSERT INTO consent_records (user_id, consent_type, policy_version, metadata)
       VALUES ($1,'terms',$2,$3::jsonb),($1,'privacy',$4,$3::jsonb)`,
      [
        userId,
        TERMS_POLICY_VERSION,
        JSON.stringify({ source: 'registration', language: preferred_language, adult_confirmation: true }),
        PRIVACY_POLICY_VERSION
      ]
    );
    await client.query(
      `INSERT INTO registration_events (user_id, event_type, age_band, country_code, adult_attested)
       VALUES ($1,'account_created','18_plus',$2,TRUE)`,
      [userId, normalizedCountryCode]
    );
    verifyToken = await createToken(client, userId, 'email_verify', 24);
    await client.query('COMMIT');
    console.info(JSON.stringify({
      event: 'registration.account_created',
      user_id: userId,
      age_band: '18_plus',
      country_code: normalizedCountryCode,
      occurred_at: new Date().toISOString()
    }));
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
    res.status(201).json({
      ok: true,
      message: 'Проверь почту и подтверди email.'
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
      `SELECT t.id, t.user_id, u.age_band, u.country_code
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
    if (item.age_band === '13_15' || (item.age_band === '16_17' && item.country_code !== 'DE')) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Аккаунт не соответствует возрастным условиям регистрации.' });
    }
    await client.query('UPDATE email_tokens SET consumed_at=NOW() WHERE id=$1', [item.id]);
    const status = 'active';
    await client.query('UPDATE users SET email_verified_at=NOW(), account_status=$2, updated_at=NOW() WHERE id=$1', [item.user_id, status]);
    await client.query(
      `INSERT INTO registration_events (user_id, event_type, age_band, country_code, adult_attested)
       VALUES ($1,'email_verified',$2,$3,$4)`,
      [item.user_id, item.age_band, item.country_code, item.age_band === '18_plus']
    );
    await client.query('COMMIT');
    console.info(JSON.stringify({
      event: 'registration.email_verified',
      user_id: item.user_id,
      occurred_at: new Date().toISOString()
    }));
    res.json({ ok: true, status, message: 'Email подтверждён. Теперь можно войти.' });
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
      'SELECT id, email, password_hash, role, account_status, age_band, country_code, email_verified_at FROM users WHERE LOWER(email)=$1',
      [email]
    );
    const user = rows[0];
    if (!user || !(await argon2.verify(user.password_hash, password))) {
      return res.status(401).json({ error: 'Неверный email или пароль.' });
    }
    if (user.account_status === 'pending_guardian' && user.email_verified_at &&
        (user.age_band === '18_plus' || (user.age_band === '16_17' && user.country_code === 'DE'))) {
      await pool.query(
        "UPDATE users SET account_status='active', updated_at=NOW() WHERE id=$1 AND account_status='pending_guardian'",
        [user.id]
      );
      user.account_status = 'active';
    }
    if (user.account_status !== 'active') {
      return res.status(403).json({
        error: 'Сначала подтверди email или проверь доступность аккаунта по возрастным условиям.'
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
      pool.query('SELECT reference_text, recognized_text, word_match_score, word_results, created_at FROM pronunciation_attempts WHERE user_id=$1 ORDER BY created_at',[userId])
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
    await client.query('UPDATE email_tokens SET consumed_at=NOW() WHERE user_id=$1 AND token_type IN (\'password_reset\',\'email_verify\') AND consumed_at IS NULL', [found.rows[0].user_id]);
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
