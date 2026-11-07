import express from 'express';
import argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { pool, requireDatabase, requireUser } from '../db.js';
import {
  isAdultRegistration,
  isSupportedAgeBand,
  requiresGuardianConsent,
  normalizeCountryCode,
  isValidCountryCode,
  verifyTurnstileToken,
  TERMS_POLICY_VERSION,
  PRIVACY_POLICY_VERSION,
  PERSONAL_DATA_CONSENT_VERSION
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

function registrationBlocker() {
  if (process.env.REGISTRATION_ENABLED !== 'true') return 'Публичная регистрация пока закрыта.';
  if (process.env.REGISTRATION_LEGAL_APPROVED !== 'true') return 'Новые условия, политика и отдельное согласие на обработку данных ещё не утверждены.';
  if (process.env.REGISTRATION_DATABASE_ISOLATED !== 'true' || process.env.DB_SCHEMA !== 'quiet_english_preview') {
    return 'Не настроена изолированная схема PostgreSQL для Preview.';
  }
  if (process.env.REGISTRATION_DATA_LOCALIZATION_APPROVED !== 'true') {
    return 'Не подтверждено соответствие требованиям локализации данных для целевой аудитории.';
  }
  if (process.env.REGISTRATION_OPERATOR_DETAILS_APPROVED !== 'true') {
    return 'Не заполнены и не подтверждены сведения об операторе и контакты для обращений.';
  }
  if (!process.env.TURNSTILE_SITE_KEY || !process.env.TURNSTILE_SECRET_KEY) {
    return 'Проверка безопасности регистрации не настроена.';
  }
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !appUrl()) {
    return 'Не настроена отправка писем.';
  }
  return null;
}

async function verifyRegistrationCaptcha(token) {
  let expectedHostname;
  try {
    expectedHostname = new URL(appUrl()).hostname;
  } catch {
    return { ok: false, reason: 'not_configured' };
  }
  return verifyTurnstileToken(token, {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    expectedHostname
  });
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
    preferred_language = 'ru',
    terms_accepted, privacy_accepted, personal_data_accepted, adult_confirmed
  } = req.body || {};

  const blocker = registrationBlocker();
  if (blocker) return res.status(503).json({ error: blocker });

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedCountryCode = normalizeCountryCode(country_code);
  if (!validEmail(normalizedEmail)) return res.status(400).json({ error: 'Укажи корректный email.' });
  if (typeof password !== 'string' || password.length < 12 || password.length > 200) {
    return res.status(400).json({ error: 'Пароль должен содержать от 12 до 200 символов.' });
  }
  if (!isAdultRegistration(age_band, adult_confirmed)) {
    return res.status(403).json({ error: 'Для пользователей 13–17 лет сначала требуется подтверждение родителя или опекуна.' });
  }
  if (!isSupportedAgeBand(age_band) || !isValidCountryCode(normalizedCountryCode)) {
    return res.status(400).json({ error: 'Проверь возрастную группу и двухбуквенный код страны.' });
  }
  if (!['ru', 'en'].includes(preferred_language)) {
    return res.status(400).json({ error: 'Выбери язык интерфейса.' });
  }
  if (terms_accepted !== true || privacy_accepted !== true || personal_data_accepted !== true) {
    return res.status(400).json({ error: 'Нужно принять Условия использования, ознакомиться с Политикой конфиденциальности и отдельно согласиться на обработку персональных данных.' });
  }

  const captchaResult = await verifyRegistrationCaptcha(req.body?.turnstile_token);
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
    const metadata = JSON.stringify({ source: 'registration', language: preferred_language });
    await client.query(
      `INSERT INTO consent_records (user_id, consent_type, policy_version, metadata)
       VALUES
         ($1,'terms',$2,$5::jsonb),
         ($1,'privacy',$3,$5::jsonb),
         ($1,'personal_data',$4,$5::jsonb)`,
      [userId, TERMS_POLICY_VERSION, PRIVACY_POLICY_VERSION, PERSONAL_DATA_CONSENT_VERSION, metadata]
    );
    await client.query(
      `INSERT INTO registration_events
         (user_id, event_type, age_band, country_code, adult_attested, preferred_language,
          terms_version, privacy_version, personal_data_consent_version)
       VALUES ($1,'account_created',$2,$3,TRUE,$4,$5,$6,$7)`,
      [
        userId, age_band, normalizedCountryCode, preferred_language,
        TERMS_POLICY_VERSION, PRIVACY_POLICY_VERSION, PERSONAL_DATA_CONSENT_VERSION
      ]
    );
    verifyToken = await createToken(client, userId, 'email_verify', 24);
    await client.query('COMMIT');
    console.info(JSON.stringify({
      event: 'registration.account_created',
      user_id: userId,
      age_band,
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
    res.status(201).json({ ok: true, message: 'Проверь почту и подтверди email.' });
  } catch (error) {
    console.error('Registration email delivery failed:', error.message);
    res.status(202).json({
      ok: true,
      emailPending: true,
      message: 'Аккаунт создан, но письмо не удалось отправить. Проверь настройки почты или запроси повторную отправку.'
    });
  }
});

router.post('/guardian-consent-request', async (req, res, next) => {
  const blocker = registrationBlocker();
  if (blocker) return res.status(503).json({ error: blocker });

  const ageBand = req.body?.age_band;
  const countryCode = normalizeCountryCode(req.body?.country_code);
  const guardianEmail = typeof req.body?.guardian_email === 'string'
    ? req.body.guardian_email.trim().toLowerCase()
    : '';

  if (!requiresGuardianConsent(ageBand) || !isSupportedAgeBand(ageBand) || req.body?.age_confirmed !== true) {
    return res.status(400).json({ error: 'Подтверди, что тебе исполнилось 13 лет, и выбери возрастную группу 13–15 или 16–17.' });
  }
  if (!isValidCountryCode(countryCode)) {
    return res.status(400).json({ error: 'Укажи двухбуквенный код страны, например RU или DE.' });
  }
  if (!validEmail(guardianEmail)) {
    return res.status(400).json({ error: 'Укажи корректный email родителя или законного представителя.' });
  }

  const captchaResult = await verifyRegistrationCaptcha(req.body?.turnstile_token);
  if (!captchaResult.ok) {
    if (captchaResult.reason === 'provider_unavailable' || captchaResult.reason === 'not_configured') {
      return res.status(503).json({ error: 'Проверка безопасности временно недоступна. Попробуй позже.' });
    }
    return res.status(400).json({ error: 'Пройди проверку безопасности ещё раз.' });
  }

  const rawToken = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(rawToken);
  try {
    await pool.query(
      'DELETE FROM guardian_consent_requests WHERE expires_at < NOW()',
      []
    );
    await pool.query(
      `INSERT INTO guardian_consent_requests
         (request_type, token_hash, guardian_email, age_band, country_code, expires_at)
       VALUES ('signup',$1,$2,$3,$4,NOW() + INTERVAL '24 hours')`,
      [tokenHash, guardianEmail, ageBand, countryCode]
    );
    try {
      await sendMail({
        to: guardianEmail,
        subject: 'Запрос родительского подтверждения — Quiet English',
        html: `<p>На Quiet English поступил запрос на создание учебного аккаунта для пользователя младше 18 лет.</p>
          <p>Аккаунт ещё не создан. Email и пароль будущего пользователя не собирались.</p>
          <p>Проверь информацию и подтверди запрос, только если ты действительно родитель или законный представитель:</p>
          <p><a href="${messagePageUrl('guardian-consent.html', rawToken)}">Проверить запрос и дать согласие</a></p>
          <p>Ссылка действует 24 часа. Если ты не ожидаешь этот запрос, проигнорируй письмо.</p>`
      });
    } catch (error) {
      await pool.query('DELETE FROM guardian_consent_requests WHERE token_hash=$1', [tokenHash]);
      throw error;
    }
    res.status(202).json({
      ok: true,
      message: 'Отправили родителю или опекуну письмо со ссылкой. Аккаунт будет создан только после подтверждения.'
    });
  } catch (error) {
    console.error('Guardian consent request delivery failed:', error?.message || 'unknown error');
    next(error);
  }
});

router.get('/guardian-consent-info', async (req, res, next) => {
  const token = req.query?.token;
  if (typeof token !== 'string' || token.length < 30 || token.length > 200) {
    return res.status(400).json({ error: 'Ссылка подтверждения некорректна.' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT request_type, age_band, country_code
       FROM guardian_consent_requests
       WHERE token_hash=$1 AND consumed_at IS NULL AND expires_at > NOW()`,
      [hashToken(token)]
    );
    if (!rows[0]) return res.status(410).json({ error: 'Ссылка недействительна или срок её действия истёк.' });
    res.set('Cache-Control', 'no-store');
    res.json({
      available: true,
      requestType: rows[0].request_type,
      ageBand: rows[0].age_band,
      countryCode: rows[0].country_code
    });
  } catch (error) {
    next(error);
  }
});

router.post('/guardian-consent-complete', async (req, res, next) => {
  const {
    token, email, password, preferred_language = 'ru',
    guardian_confirmed, minimum_age_confirmed, terms_accepted, privacy_accepted, personal_data_accepted
  } = req.body || {};
  if (typeof token !== 'string' || token.length < 30 || token.length > 200) {
    return res.status(400).json({ error: 'Ссылка подтверждения некорректна.' });
  }
  const childEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!validEmail(childEmail)) return res.status(400).json({ error: 'Укажи корректный email пользователя.' });
  if (typeof password !== 'string' || password.length < 12 || password.length > 200) {
    return res.status(400).json({ error: 'Пароль должен содержать от 12 до 200 символов.' });
  }
  if (!['ru', 'en'].includes(preferred_language)) {
    return res.status(400).json({ error: 'Выбери язык интерфейса.' });
  }
  if (guardian_confirmed !== true || terms_accepted !== true ||
      privacy_accepted !== true || personal_data_accepted !== true) {
    return res.status(400).json({ error: 'Подтверди полномочия родителя/опекуна, принятие условий и отдельное согласие на обработку данных.' });
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const client = await pool.connect();
  let userId, verifyToken, guardianEmail;

  try {
    await client.query('BEGIN');
    const request = await client.query(
      `SELECT id, guardian_email, age_band, country_code
       FROM guardian_consent_requests
       WHERE token_hash=$1 AND request_type='signup'
         AND consumed_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [hashToken(token)]
    );
    if (!request.rowCount) {
      await client.query('ROLLBACK');
      return res.status(410).json({ error: 'Ссылка недействительна или срок её действия истёк.' });
    }
    const consentRequest = request.rows[0];
    guardianEmail = consentRequest.guardian_email;
    if (childEmail === guardianEmail.toLowerCase()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Для аккаунта пользователя укажи отдельный email, не адрес родителя.' });
    }

    const existing = await client.query('SELECT id FROM users WHERE LOWER(email)=$1', [childEmail]);
    if (existing.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Аккаунт с таким email уже существует.' });
    }

    const created = await client.query(
      `INSERT INTO users
         (email, password_hash, age_band, country_code, guardian_email, guardian_consented_at)
       VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING id`,
      [childEmail, passwordHash, consentRequest.age_band, consentRequest.country_code, guardianEmail]
    );
    userId = created.rows[0].id;
    await client.query(
      'INSERT INTO learner_profiles (user_id, preferred_language) VALUES ($1,$2)',
      [userId, preferred_language]
    );

    const consentMetadata = JSON.stringify({
      source: 'guardian-consent',
      guardian_authority_confirmed: true,
      age_band: consentRequest.age_band,
      country_code: consentRequest.country_code,
      language: preferred_language
    });
    await client.query(
      `INSERT INTO consent_records (user_id, consent_type, policy_version, metadata)
       VALUES
         ($1,'terms',$2,$5::jsonb),
         ($1,'privacy',$3,$5::jsonb),
         ($1,'personal_data',$4,$5::jsonb)`,
      [userId, TERMS_POLICY_VERSION, PRIVACY_POLICY_VERSION, PERSONAL_DATA_CONSENT_VERSION, consentMetadata]
    );
    await client.query(
      `INSERT INTO registration_events
         (user_id, event_type, age_band, country_code, adult_attested, preferred_language,
          terms_version, privacy_version, personal_data_consent_version)
       VALUES
         ($1,'guardian_consented',$2,$3,FALSE,$4,$5,$6,$7),
         ($1,'account_created',$2,$3,FALSE,$4,$5,$6,$7)`,
      [
        userId, consentRequest.age_band, consentRequest.country_code, preferred_language,
        TERMS_POLICY_VERSION, PRIVACY_POLICY_VERSION, PERSONAL_DATA_CONSENT_VERSION
      ]
    );
    verifyToken = await createToken(client, userId, 'email_verify', 24);
    await client.query(
      'UPDATE guardian_consent_requests SET consented_at=NOW(), consumed_at=NOW() WHERE id=$1',
      [consentRequest.id]
    );
    await client.query('COMMIT');
    console.info(JSON.stringify({
      event: 'registration.guardian_consented',
      user_id: userId,
      age_band: consentRequest.age_band,
      country_code: consentRequest.country_code,
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
      to: childEmail,
      subject: 'Подтверди email — Quiet English',
      html: `<p>Родитель или законный представитель подтвердил создание твоего аккаунта Quiet English.</p>
        <p>Подтверди адрес электронной почты, чтобы активировать аккаунт:</p>
        <p><a href="${messagePageUrl('verify.html', verifyToken)}">Подтвердить email</a></p>
        <p>Если ты не ожидаешь это письмо, обратись к родителю или опекуну.</p>`
    });
    res.status(201).json({ ok: true, message: 'Согласие сохранено. Отправили пользователю письмо для подтверждения email.' });
  } catch (error) {
    console.error('Minor account verification email delivery failed:', error?.message || 'unknown error');
    res.status(202).json({
      ok: true,
      emailPending: true,
      message: 'Согласие сохранено и аккаунт создан, но письмо пользователю не отправлено. Используй повторную отправку подтверждения email.'
    });
  }
});

router.post('/guardian-withdrawal-request', async (req, res, next) => {
  const guardianEmail = typeof req.body?.guardian_email === 'string'
    ? req.body.guardian_email.trim().toLowerCase()
    : '';
  const childEmail = typeof req.body?.child_email === 'string'
    ? req.body.child_email.trim().toLowerCase()
    : '';
  if (!validEmail(guardianEmail) || !validEmail(childEmail)) {
    return res.status(400).json({ error: 'Проверь email родителя и пользователя.' });
  }

  try {
    const found = await pool.query(
      `SELECT id FROM users
       WHERE LOWER(email)=$1 AND LOWER(guardian_email)=$2
         AND age_band IN ('13_15','16_17') AND account_status <> 'disabled'`,
      [childEmail, guardianEmail]
    );
    if (found.rows[0]) {
      const rawToken = randomBytes(32).toString('base64url');
      const tokenHash = hashToken(rawToken);
      await pool.query(
        `INSERT INTO guardian_consent_requests
           (request_type, target_user_id, token_hash, guardian_email, expires_at)
         VALUES ('withdrawal',$1,$2,$3,NOW() + INTERVAL '24 hours')`,
        [found.rows[0].id, tokenHash, guardianEmail]
      );
      try {
        await sendMail({
          to: guardianEmail,
          subject: 'Отзыв родительского согласия — Quiet English',
          html: `<p>Получен запрос на отзыв согласия и удаление учебного аккаунта, связанного с этим адресом родителя.</p>
            <p>Подтверди действие по ссылке в течение 24 часов:</p>
            <p><a href="${messagePageUrl('guardian-consent.html', rawToken)}">Отозвать согласие и удалить аккаунт</a></p>
            <p>Если ты не запрашивал это действие, проигнорируй письмо.</p>`
        });
      } catch (error) {
        await pool.query('DELETE FROM guardian_consent_requests WHERE token_hash=$1', [tokenHash]);
        throw error;
      }
    }
    res.json({ ok: true, message: 'Если данные совпадают с аккаунтом несовершеннолетнего пользователя, родителю будет отправлено письмо для подтверждения отзыва согласия.' });
  } catch (error) {
    next(error);
  }
});

router.post('/guardian-consent-withdraw', async (req, res, next) => {
  const token = req.body?.token;
  if (typeof token !== 'string' || token.length < 30 || token.length > 200 || req.body?.confirm_withdrawal !== true) {
    return res.status(400).json({ error: 'Подтверди отзыв согласия по действующей ссылке.' });
  }

  const client = await pool.connect();
  let guardianEmail;
  try {
    await client.query('BEGIN');
    const found = await client.query(
      `SELECT id, target_user_id, guardian_email
       FROM guardian_consent_requests
       WHERE token_hash=$1 AND request_type='withdrawal'
         AND consumed_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [hashToken(token)]
    );
    if (!found.rowCount || !found.rows[0].target_user_id) {
      await client.query('ROLLBACK');
      return res.status(410).json({ error: 'Ссылка недействительна или срок её действия истёк.' });
    }
    const request = found.rows[0];
    guardianEmail = request.guardian_email;
    const user = await client.query(
      `SELECT id FROM users
       WHERE id=$1 AND LOWER(guardian_email)=LOWER($2)
         AND age_band IN ('13_15','16_17')
       FOR UPDATE`,
      [request.target_user_id, guardianEmail]
    );
    if (!user.rowCount) {
      await client.query('ROLLBACK');
      return res.status(410).json({ error: 'Связанный аккаунт уже недоступен.' });
    }
    await client.query("DELETE FROM user_sessions WHERE sess->>'userId'=$1", [request.target_user_id]);
    await client.query('DELETE FROM users WHERE id=$1', [request.target_user_id]);
    await client.query(
      'UPDATE guardian_consent_requests SET consumed_at=NOW() WHERE id=$1',
      [request.id]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }

  try {
    await sendMail({
      to: guardianEmail,
      subject: 'Согласие отозвано — Quiet English',
      html: '<p>Родительское согласие отозвано. Связанный аккаунт несовершеннолетнего пользователя и его учебные данные удалены.</p>'
    });
  } catch (error) {
    console.error('Guardian withdrawal confirmation email failed:', error?.message || 'unknown error');
  }
  res.json({ ok: true, message: 'Согласие отозвано. Аккаунт и связанные учебные данные удалены.' });
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
      `SELECT t.id, t.user_id, u.age_band, u.country_code, u.guardian_consented_at
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
    if (requiresGuardianConsent(item.age_band) && !item.guardian_consented_at) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Сначала необходимо получить согласие родителя или законного представителя.' });
    }

    await client.query('UPDATE email_tokens SET consumed_at=NOW() WHERE id=$1', [item.id]);
    await client.query(
      "UPDATE users SET email_verified_at=NOW(), account_status='active', updated_at=NOW() WHERE id=$1",
      [item.user_id]
    );
    await client.query(
      `INSERT INTO registration_events
         (user_id, event_type, age_band, country_code, adult_attested, preferred_language,
          terms_version, privacy_version, personal_data_consent_version)
       SELECT $1,'email_verified',$2,$3,$4,p.preferred_language,$5,$6,$7
       FROM learner_profiles p WHERE p.user_id=$1`,
      [
        item.user_id, item.age_band, item.country_code, item.age_band === '18_plus',
        TERMS_POLICY_VERSION, PRIVACY_POLICY_VERSION, PERSONAL_DATA_CONSENT_VERSION
      ]
    );
    await client.query('COMMIT');
    console.info(JSON.stringify({
      event: 'registration.email_verified',
      user_id: item.user_id,
      age_band: item.age_band,
      occurred_at: new Date().toISOString()
    }));
    res.json({ ok: true, status: 'active', message: 'Email подтверждён. Теперь можно войти.' });
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
    if (user.account_status !== 'active') {
      return res.status(403).json({
        error: 'Сначала подтверди email и, если требуется, дождись согласия родителя или опекуна.'
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
