const LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1']);
const SKILLS = new Set(['grammar', 'vocabulary', 'reading', 'listening', 'mixed']);
const TOPICS = new Set([
  'Any topic', 'Everyday life', 'Travel', 'Science', 'History and culture',
  'Technology', 'Environment', 'Education', 'Books and media'
]);

export function validatePracticeGenerationRequest(body) {
  const level = typeof body?.level === 'string' ? body.level.trim().toUpperCase() : '';
  const skill = typeof body?.skill === 'string' ? body.skill.trim().toLowerCase() : '';
  const topic = typeof body?.topic === 'string' ? body.topic.trim() : 'Any topic';

  if (!LEVELS.has(level)) return { ok: false, error: 'Выбери уровень от A1 до C1.' };
  if (!SKILLS.has(skill)) return { ok: false, error: 'Выбери тип задания.' };
  if (!TOPICS.has(topic)) return { ok: false, error: 'Выбери тему из списка.' };

  const avoid = Array.isArray(body?.avoid)
    ? body.avoid.filter(item => typeof item === 'string')
      .slice(0, 4).map(item => item.replace(/\s+/gu, ' ').trim().slice(0, 500)).filter(Boolean)
    : [];
  return { ok: true, value: { level, skill, topic, avoid } };
}

export function buildPracticeGenerationPrompt({ level, skill, topic, avoid = [] }) {
  const levelGuide = {
    A1: 'beginner: very common words, present simple, basic questions, short sentences',
    A2: 'elementary: everyday vocabulary, past and future basics, simple comparisons and requests',
    B1: 'intermediate: connected ideas, common linking words, everyday phrasal verbs and clear explanations',
    B2: 'upper-intermediate: varied grammar, precise vocabulary, natural collocations and nuanced meaning',
    C1: 'advanced: sophisticated but natural vocabulary, complex structures, inference and register awareness'
  }[level];

  const taskGuide = {
    grammar: 'Create five grammar multiple-choice questions. Test different useful grammar points appropriate to the level. Each question must have exactly one unambiguously correct option.',
    vocabulary: 'Create five vocabulary multiple-choice questions in meaningful sentence contexts. Test meaning, collocations, word choice and natural usage appropriate to the level. Each question must have exactly one correct option.',
    reading: 'Write one original reading passage of 100–170 words, then create four multiple-choice comprehension questions about details, inference, vocabulary-in-context and the main idea. The answers must be supported by the passage.',
    listening: 'Write one natural listening script of 80–140 words that can be read aloud by text-to-speech, then create four multiple-choice listening-comprehension questions. Questions must be answerable from the script. Do not refer to sounds, music or speakers that are not in the script.',
    mixed: 'Create five mixed multiple-choice questions: include grammar, vocabulary, reading comprehension or practical communication. Vary the skills and give each question a category field of grammar, vocabulary, reading or communication.'
  }[skill];

  const avoidText = avoid.length
    ? '\nAvoid reusing these recent prompts, passages or examples:\n' + avoid.map((item, index) => (index + 1) + '. ' + item).join('\n')
    : '';

  return [
    'Create one original English-learning exercise for CEFR ' + level + ' (' + levelGuide + ').',
    'Exercise type: ' + skill + '. Topic: ' + topic + '.',
    taskGuide,
    'All content must be age-appropriate, respectful, factual where relevant, and suitable for a general school learner.',
    'Do not include personal data, dangerous instructions, sexual content, graphic violence, self-harm, politics targeted at a person, or copied passages from published works.',
    'Avoid trick questions, ambiguous answers and obscure trivia. Explanations should teach the rule or reasoning briefly.',
    'Return only valid JSON with these top-level keys: title, instructions, passage, questions.',
    'For grammar/vocabulary/mixed tasks, passage may be an empty string. For reading/listening, passage must contain the full original text.',
    'questions must be an array. Each item must have: id (q1, q2, ...), prompt, category, options, correct_option_id, explanation.',
    'Each options array must contain exactly four objects with ids a, b, c, d and a text string.',
    'Each question must have exactly one correct_option_id that matches one option id. All four options must be distinct.',
    'Return exactly five questions for grammar, vocabulary and mixed, or exactly four for reading and listening.',
    'Return no Markdown fences and no text before or after the JSON object.',
    avoidText
  ].join('\n');
}

export function parseGeneratedPracticeExercise(content, { level, skill, topic }) {
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('ИИ не вернул задание.');
  }

  let source = content.trim();
  const first = source.indexOf('{');
  const last = source.lastIndexOf('}');
  if (first >= 0 && last > first) source = source.slice(first, last + 1);

  let data;
  try {
    data = JSON.parse(source);
  } catch {
    throw new Error('ИИ вернул задание в непонятном формате. Попробуй ещё раз.');
  }

  const clean = value => typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim() : '';
  const title = clean(data?.title).slice(0, 90);
  const instructions = clean(data?.instructions).slice(0, 260);
  const passage = typeof data?.passage === 'string'
    ? data.passage.replace(/[\r\n]+/gu, ' ').replace(/\s+/gu, ' ').trim()
    : '';

  const expectedCount = ['reading', 'listening'].includes(skill) ? 4 : 5;
  if (!title || instructions.length < 8 || !Array.isArray(data?.questions) ||
      data.questions.length !== expectedCount) {
    throw new Error('ИИ создал задание неподходящего формата. Попробуй ещё раз.');
  }

  if (['reading', 'listening'].includes(skill)) {
    const count = passage.split(/\s+/u).filter(Boolean).length;
    if (count < 55 || count > 200) throw new Error('Текст для чтения или аудирования получился неподходящей длины.');
  } else if (passage.length > 1000) {
    throw new Error('Текст задания получился слишком длинным.');
  }

  const questions = data.questions.map((item, index) => {
    const id = 'q' + (index + 1);
    const prompt = clean(item?.prompt).slice(0, 280);
    const category = clean(item?.category).toLowerCase() || skill;
    const validCategories = new Set(['grammar', 'vocabulary', 'reading', 'communication', 'listening', 'mixed']);
    if (!validCategories.has(category) || prompt.length < 8 || !Array.isArray(item?.options) || item.options.length !== 4) {
      throw new Error('ИИ вернул некорректный вопрос. Попробуй создать задание ещё раз.');
    }

    const ids = new Set();
    const seenTexts = new Set();
    const options = item.options.map(option => {
      const optionId = clean(option?.id).toLowerCase();
      const text = clean(option?.text).slice(0, 120);
      const normalized = text.toLocaleLowerCase('en-US');
      if (!['a', 'b', 'c', 'd'].includes(optionId) || !text || ids.has(optionId) || seenTexts.has(normalized)) {
        throw new Error('Варианты ответа получились некорректными. Попробуй ещё раз.');
      }
      ids.add(optionId);
      seenTexts.add(normalized);
      return { id: optionId, text };
    });

    const correctOptionId = clean(item?.correct_option_id).toLowerCase();
    if (ids.size !== 4 || !ids.has(correctOptionId)) {
      throw new Error('Не удалось проверить правильный ответ. Попробуй ещё раз.');
    }

    const explanation = clean(item?.explanation).slice(0, 420);
    if (explanation.length < 8) throw new Error('Для одного из вопросов отсутствует объяснение.');
    return {
      id,
      prompt,
      category,
      options,
      correct_option_id: correctOptionId,
      explanation
    };
  });

  return { title, instructions, passage, level, skill, topic, questions };
}

export function gradeGeneratedPracticeExercise(exercise, answers) {
  if (!exercise || !Array.isArray(exercise.questions) || !Array.isArray(answers)) {
    throw new Error('Ответы отправлены в неправильном формате.');
  }
  if (answers.length !== exercise.questions.length) {
    throw new Error('Ответь на все вопросы перед проверкой.');
  }

  const submitted = new Map();
  for (const item of answers) {
    if (!item || typeof item.question_id !== 'string' || typeof item.option_id !== 'string' ||
        submitted.has(item.question_id)) {
      throw new Error('Один из ответов указан некорректно.');
    }
    submitted.set(item.question_id, item.option_id);
  }

  const results = exercise.questions.map(question => {
    const selectedId = submitted.get(question.id);
    const selected = question.options.find(option => option.id === selectedId);
    if (!selected) throw new Error('Выбери вариант ответа для каждого вопроса.');
    const correctOption = question.options.find(option => option.id === question.correct_option_id);
    const isCorrect = selectedId === question.correct_option_id;
    return {
      question_id: question.id,
      prompt: question.prompt,
      is_correct: isCorrect,
      selected_answer: selected.text,
      correct_answer: correctOption.text,
      explanation: question.explanation,
      category: question.category
    };
  });

  const correct = results.filter(result => result.is_correct).length;
  return {
    correct,
    total: results.length,
    score: Math.round(correct / results.length * 100),
    results
  };
}
