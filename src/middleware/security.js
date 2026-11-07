export function sameOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const origin = req.get('origin');
  const configuredOrigins = [
    process.env.APP_BASE_URL,
    ...(process.env.ALLOWED_ORIGINS || '').split(',')
  ].filter(value => typeof value === 'string' && value.trim());

  if (!origin || configuredOrigins.length === 0) {
    return res.status(403).json({
      error: 'Запрос должен быть отправлен с официального адреса сайта.'
    });
  }

  let requestOrigin;
  try {
    requestOrigin = new URL(origin).origin;
  } catch {
    return res.status(403).json({ error: 'Источник запроса не разрешён.' });
  }

  const isAllowed = configuredOrigins.some(value => {
    try {
      return new URL(value.trim()).origin === requestOrigin;
    } catch {
      return false;
    }
  });

  if (!isAllowed) {
    return res.status(403).json({ error: 'Источник запроса не разрешён.' });
  }

  next();
}
