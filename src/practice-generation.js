const LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
const SKILLS = new Set(['grammar', 'vocabulary', 'reading', 'listening', 'mixed']);
const TOPICS = new Set([
  'Any topic', 'Everyday life', 'Travel', 'Science', 'History and culture',
  'Technology', 'Environment', 'Education', 'Books and media'
]);

export function validatePracticeGenerationRequest(body, languageCode = 'en') {
  const level = typeof body?.level === 'string' ? body.level.trim().toUpperCase() : '';
  const skill = typeof body?.skill === 'string' ? body.skill.trim().toLowerCase() : '';
  const topic = typeof body?.topic === 'string' ? body.topic.trim() : 'Any topic';

  if (!LEVELS.has(level)) return { ok: false, error: 'Выбери уровень от A1 до C2.' };
  if (!SKILLS.has(skill)) return { ok: false, error: 'Выбери тип задания.' };
  if (!TOPICS.has(topic)) return { ok: false, error: 'Выбери тему из списка.' };

  const avoid = Array.isArray(body?.avoid)
    ? body.avoid.filter(item => typeof item === 'string')
      .slice(0, 4).map(item => item.replace(/\s+/gu, ' ').trim().slice(0, 260)).filter(Boolean)
    : [];
  const focus = Array.isArray(body?.focus)
    ? body.focus.slice(0, 5).map(item => ({
        area: typeof item?.area === 'string' ? item.area.replace(/\s+/gu, ' ').trim().slice(0, 90) : '',
        prompt: typeof item?.prompt === 'string' ? item.prompt.replace(/\s+/gu, ' ').trim().slice(0, 180) : '',
        selectedAnswer: typeof item?.selectedAnswer === 'string' ? item.selectedAnswer.replace(/\s+/gu, ' ').trim().slice(0, 100) : '',
        correctAnswer: typeof item?.correctAnswer === 'string' ? item.correctAnswer.replace(/\s+/gu, ' ').trim().slice(0, 100) : '',
        explanation: typeof item?.explanation === 'string' ? item.explanation.replace(/\s+/gu, ' ').trim().slice(0, 200) : ''
      })).filter(item => item.area || item.prompt)
    : [];
  const interfaceLanguage = body?.interface_language === 'en' ? 'en' : 'ru';
  return { ok: true, value: { level, skill, topic, avoid, focus, languageCode, interfaceLanguage } };
}

export function buildPracticeGenerationPrompt({ level, skill, topic, avoid = [], focus = [], languageCode = 'en', interfaceLanguage = 'ru' }) {
  const levelGuide = {
    A1: 'beginner: very common words, present simple, basic questions, short sentences',
    A2: 'elementary: everyday vocabulary, past and future basics, simple comparisons and requests',
    B1: 'intermediate: connected ideas, common linking words, everyday phrasal verbs and clear explanations',
    B2: 'upper-intermediate: varied grammar, precise vocabulary, natural collocations and nuanced meaning',
    C1: 'advanced: sophisticated but natural vocabulary, complex structures, inference and register awareness',
    C2: 'mastery: precise idiom, subtle semantic distinctions, flexible syntax and full register control'
  }[level];

  const taskGuide = {
    grammar: 'Create five concise grammar multiple-choice questions. Cover level-appropriate grammar points; use short sentence prompts.',
    vocabulary: 'Create five concise vocabulary multiple-choice questions in sentence context. Test meaning, collocations and natural usage.',
    reading: 'Write one original reading passage of 90–130 words, then create four short comprehension questions about detail, inference, vocabulary and main idea.',
    listening: 'Write one natural listening script of 70–110 words for text-to-speech, then create four short comprehension questions answerable from the script.',
    mixed: 'Create five concise mixed questions across grammar, vocabulary, reading or practical communication. Give each question its skill category.'
  }[skill];

  const avoidText = avoid.length
    ? '\nAvoid repeating these recent exercise examples: ' + avoid.map(item => item.slice(0, 180)).join(' | ')
    : '';
  const focusText = focus.length
    ? '\nADAPTIVE REVIEW: Build every question around these weak learning points, but use fresh sentences and new options. Do not copy the old questions or simply reveal their answers.\n' +
      focus.map((item, index) =>
        (index + 1) + '. Topic: ' + (item.area || 'review') +
        '; previous question: ' + item.prompt +
        '; learner answer: ' + (item.selectedAnswer || 'not supplied') +
        '; correct answer: ' + (item.correctAnswer || 'not supplied') +
        '; explanation: ' + (item.explanation || 'review the underlying rule')
      ).join('\n')
    : '';

  const targetLanguage = languageCode === 'de' ? 'German' : 'English';
  const explanationLanguage = interfaceLanguage === 'en' ? 'English' : 'Russian';
  return [
    'Create an original ' + targetLanguage + '-learning exercise for CEFR ' + level + ' (' + levelGuide + ').',
    languageCode === 'de' ? 'All passage text, prompts, answer options and correct answers must be natural standard German calibrated to CEFR ' + level + '. Use the grammar, vocabulary, idioms and register expected at this level, with accurate ä, ö, ü and ß.' : 'All learner-facing exercise text must be natural standard English.',
    'Write explanations in ' + explanationLanguage + '.',
    'Type: ' + skill + '. Topic: ' + topic + '.',
    taskGuide,
    'Use age-appropriate, respectful, original school content. No personal data, dangerous instructions, sexual content, graphic violence, self-harm or copied published text.',
    'Avoid ambiguous questions. Explanations must be one short sentence (maximum 18 words). Keep prompts and options concise.',
    'Return only JSON: title, instructions, passage, questions.',
    'Each question: id, prompt, category, learning_point, options, correct_option_id, explanation.',
    'Each question has exactly four distinct options with ids a, b, c, d; exactly one correct_option_id.',
    'learning_point names the precise rule or skill (for example Past Simple, Zero Conditional, comparative adjectives, phrasal verbs or collocations).',
    'Return 5 questions for grammar/vocabulary/mixed, 4 for reading/listening. Keep reading/listening passages within requested word limits.',
    'No Markdown fences or text outside JSON.',
    focusText,
    avoidText
  ].join('\n');
}

export function parseGeneratedPracticeExercise(content, { level, skill, topic, languageCode = 'en' }) {
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

  const validCategories = new Set([
    'grammar', 'vocabulary', 'reading', 'communication', 'listening', 'mixed'
  ]);
  const categoryAliases = new Map([
    ['grammatical', 'grammar'], ['grammar question', 'grammar'],
    ['word choice', 'vocabulary'], ['vocab', 'vocabulary'],
    ['reading comprehension', 'reading'], ['comprehension', 'reading'],
    ['listening comprehension', 'listening'], ['speaking', 'communication'],
    ['communicative', 'communication']
  ]);
  const toString = value => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return '';
  };

  const questions = data.questions.map((item, index) => {
    const id = 'q' + (index + 1);
    const prompt = clean(
      item?.prompt ?? item?.question ?? item?.question_text ?? item?.text ?? item?.statement
    ).slice(0, 280);
    const rawCategory = clean(item?.category ?? item?.skill ?? item?.type).toLowerCase();
    const category = validCategories.has(rawCategory)
      ? rawCategory
      : (categoryAliases.get(rawCategory) || (validCategories.has(skill) ? skill : 'mixed'));

    if (prompt.length < 3) {
      throw new Error('В вопросе ' + (index + 1) + ' отсутствует текст вопроса.');
    }

    let rawOptions = item?.options ?? item?.choices ?? item?.answers;
    if (!Array.isArray(rawOptions) && rawOptions && typeof rawOptions === 'object') {
      rawOptions = Object.entries(rawOptions).map(([optionId, optionText]) => ({
        id: optionId,
        text: optionText
      }));
    }
    if (!Array.isArray(rawOptions) || rawOptions.length !== 4) {
      throw new Error('В вопросе ' + (index + 1) + ' должно быть ровно четыре варианта ответа.');
    }

    const ids = new Set();
    const seenTexts = new Set();
    const aliases = new Map();
    let markedCorrectId = '';

    const options = rawOptions.map((option, optionIndex) => {
      const fallbackId = ['a', 'b', 'c', 'd'][optionIndex];
      const rawOptionId = clean(toString(
        typeof option === 'string' ? '' : (option?.id ?? option?.key ?? option?.label ?? option?.letter)
      )).toLowerCase();
      const optionId = ['a', 'b', 'c', 'd'].includes(rawOptionId) ? rawOptionId : fallbackId;
      const text = clean(toString(
        typeof option === 'string'
          ? option
          : (option?.text ?? option?.value ?? option?.content ?? option?.option ?? option?.answer)
      )).slice(0, 120);
      const normalized = text.toLocaleLowerCase(languageCode === 'de' ? 'de-DE' : 'en-US');

      if (!text || ids.has(optionId) || seenTexts.has(normalized)) {
        throw new Error('Варианты ответа в вопросе ' + (index + 1) + ' пустые или повторяются.');
      }
      ids.add(optionId);
      seenTexts.add(normalized);
      aliases.set(optionId, optionId);
      aliases.set(fallbackId, optionId);
      if (rawOptionId) aliases.set(rawOptionId, optionId);
      aliases.set(normalized, optionId);

      if (typeof option === 'object' && (
        option?.is_correct === true || option?.isCorrect === true || option?.correct === true
      )) {
        markedCorrectId = optionId;
      }
      return { id: optionId, text };
    });

    const rawCorrect = item?.correct_option_id ??
      item?.correctOptionId ??
      item?.correct_answer_id ??
      item?.answer_id ??
      item?.correct_option ??
      item?.correctAnswer ??
      item?.correct_answer ??
      item?.answer ??
      item?.correct;

    let correctToken = '';
    if (typeof rawCorrect === 'string' || typeof rawCorrect === 'number') {
      correctToken = toString(rawCorrect).trim().toLowerCase();
    } else if (rawCorrect && typeof rawCorrect === 'object') {
      correctToken = toString(
        rawCorrect.id ?? rawCorrect.option_id ?? rawCorrect.key ?? rawCorrect.text ?? rawCorrect.value
      ).trim().toLowerCase();
    }

    const correctOptionId = aliases.get(correctToken) ||
      aliases.get(correctToken.replace(/^[([]|[)\].,]$/gu, '')) ||
      markedCorrectId;

    if (!correctOptionId || !ids.has(correctOptionId)) {
      throw new Error('Не удалось определить правильный ответ в вопросе ' + (index + 1) + '.');
    }

    const explanation = clean(
      item?.explanation ?? item?.feedback ?? item?.rationale ?? item?.reason
    ).slice(0, 420) ||
      'Compare the correct option with the sentence context and review the rule being practised.';

    return {
      id,
      prompt,
      category,
      options,
      correct_option_id: correctOptionId,
      explanation,
      learning_point: clean(item?.learning_point ?? item?.learningPoint ?? item?.concept ?? item?.grammar_point ?? item?.topic).slice(0, 100) || category
    };
  });

  return { title, instructions, passage, level, skill, topic, languageCode, questions };
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
      category: question.category,
      learning_point: question.learning_point || question.category
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
