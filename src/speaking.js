const ALLOWED_LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
const LANGUAGE_NAMES = { en:'English', de:'German', es:'Spanish', fr:'French', it:'Italian', pt:'Portuguese', pl:'Polish', ja:'Japanese' };
const ALLOWED_TOPICS = new Set([
  'Everyday life', 'Travel', 'History and culture', 'Science',
  'Technology', 'Environment', 'Education', 'Books and media'
]);

export function validateSpeakingGenerationRequest(body, languageCode = 'en') {
  const level = typeof body?.level === 'string' ? body.level.trim().toUpperCase() : '';
  const topic = typeof body?.topic === 'string' ? body.topic.trim() : '';

  if (!ALLOWED_LEVELS.has(level)) {
    return { ok: false, error: 'Выбери уровень от A1 до C2.' };
  }
  if (!ALLOWED_TOPICS.has(topic)) {
    return { ok: false, error: 'Выбери тему из списка.' };
  }

  const avoid = Array.isArray(body?.avoid)
    ? body.avoid
        .filter(item => typeof item === 'string')
        .slice(0, 4)
        .map(item => item.replace(/\s+/gu, ' ').trim().slice(0, 360))
        .filter(Boolean)
    : [];

  return { ok: true, value: { level, topic, avoid, languageCode } };
}

export function buildSpeakingGenerationPrompt({ level, topic, avoid = [], languageCode = 'en' }) {
  const wordGuide = {
    A1: '20–30 very common words, short simple sentences, present simple, familiar vocabulary',
    A2: '25–35 words, everyday vocabulary, simple past or future where useful',
    B1: '30–40 words, connected ideas, common linking words and clear opinions',
    B2: '35–45 words, varied sentence structures and more precise vocabulary',
    C1: '40–50 words, nuanced meaning, natural collocations and sophisticated but readable syntax',
    C2: '45–55 words, idiomatic precision, subtle register shifts and complex but natural syntax'
  }[level];

  const avoidBlock = avoid.length
    ? '\nDo not repeat or closely paraphrase these recent passages:\n' + avoid.map((item, index) => (index + 1) + '. ' + item).join('\n')
    : '';

  const targetLanguage = LANGUAGE_NAMES[languageCode] || 'English';
  return [
    'Create one original ' + targetLanguage + ' reading passage for a learner at CEFR ' + level + '.',
    'This is a ' + targetLanguage + ' CEFR ' + level + ' learning task. Use natural standard ' + targetLanguage + ' with grammar, vocabulary, idioms and register appropriate to this level.',
    'Topic: ' + topic + '.',
    'Length and language: ' + wordGuide + '.',
    'The passage must be suitable for reading aloud in no more than 28 seconds.',
    'Use natural, age-appropriate, encouraging educational content.',
    'Do not include dialogue labels, bullet points, numbered lists, quotations from published works, personal data, dangerous instructions, or sensitive adult themes.',
    'Avoid repeating a familiar generic opening. Make the scene, example or angle specific and fresh.',
    'Return only a valid JSON object with exactly two string properties: "title" and "passage".',
    'Do not add Markdown fences or any text outside the JSON object.',
    avoidBlock
  ].join('\n');
}

export function parseGeneratedSpeakingPassage(content, { level, topic, languageCode = 'en' }) {
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Модель не вернула текст задания.');
  }

  let source = content.trim();
  const firstBrace = source.indexOf('{');
  const lastBrace = source.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    source = source.slice(firstBrace, lastBrace + 1);
  }

  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error('ИИ вернул задание в непонятном формате. Попробуй ещё раз.');
  }

  const title = typeof parsed?.title === 'string'
    ? parsed.title.replace(/\s+/gu, ' ').trim().slice(0, 70)
    : '';
  const passage = typeof parsed?.passage === 'string'
    ? parsed.passage.replace(/[\r\n]+/gu, ' ').replace(/\s+/gu, ' ').trim()
    : '';

  const words = passage.match(/[\p{L}]+(?:['’][\p{L}]+)*/gu) || [];
  const letterCount = (passage.match(/[\p{L}]/gu) || []).length;
  if (!title || passage.length < 70 || passage.length > 900 || words.length < 15 || words.length > 65) {
    throw new Error('ИИ создал текст неподходящей длины. Попробуй сгенерировать ещё раз.');
  }
  if (!letterCount || letterCount / Math.max(1, passage.replace(/\s/gu, '').length) < 0.65) {
    throw new Error('ИИ вернул текст не на изучаемом языке. Попробуй ещё раз.');
  }
  if (languageCode === 'de' && /\b(the|and|is|are|you|your)\b/iu.test(passage)) {
    throw new Error('ИИ вернул смешанный или английский текст вместо немецкого.');
  }

  return {
    title,
    passage,
    level,
    topic,
    languageCode,
    wordCount: words.length
  };
}
