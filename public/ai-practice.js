(() => {
  const root = document.querySelector('[data-ai-practice]');
  if (!root) return;

  const STORE_KEY = 'quiet-english-ai-practice-history-v1';
  const $ = selector => root.querySelector(selector);
  const level = $('[data-ai-level]');
  const skill = $('[data-ai-skill]');
  const topic = $('[data-ai-topic]');
  const generateButton = $('[data-ai-generate]');
  const status = $('[data-ai-status]');
  const workspace = $('[data-ai-workspace]');
  const title = $('[data-ai-title]');
  const meta = $('[data-ai-meta]');
  const instructions = $('[data-ai-instructions]');
  const aiVariantWrap = $('[data-ai-variant-wrap]');
  const aiVariantHeading = $('[data-ai-variant-heading]');
  const aiVariantNote = $('[data-ai-variant-note]');
  const aiVariantOpen = $('[data-ai-variant-open]');
  const passageWrap = $('[data-ai-passage-wrap]');
  const passage = $('[data-ai-passage]');
  const listenButton = $('[data-ai-listen]');
  const form = $('[data-ai-form]');
  const questionsNode = $('[data-ai-questions]');
  const checkButton = $('[data-ai-check]');
  const resultNode = $('[data-ai-result]');
  const historySection = $('[data-ai-history-section]');
  const historyNode = $('[data-ai-history]');

  let currentExercise = null;
  let checked = false;
  let lastMistakes = [];
  let pendingAiExercise = null;
  let generationSequence = 0;

  const t = (ru, en) => document.documentElement.lang === 'en' ? en : ru;
  const setStatus = (text, error = false) => {
    status.textContent = text;
    status.classList.toggle('error-text', error);
    status.classList.toggle('success-text', !error);
  };

  function readHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      return Array.isArray(value) ? value.slice(0, 8) : [];
    } catch {
      return [];
    }
  }

  function renderHistory() {
    const items = readHistory();
    historySection.hidden = items.length === 0;
    historyNode.replaceChildren();
    items.forEach(item => {
      const row = document.createElement('article');
      row.className = 'ai-history-row';
      const label = document.createElement('span');
      label.textContent = item.level + ' · ' + item.skill + ' · ' + item.title;
      const score = document.createElement('strong');
      score.textContent = item.score + '/' + item.total;
      row.append(label, score);
      historyNode.append(row);
    });
  }

  function saveHistory(item) {
    const next = [item, ...readHistory()].slice(0, 8);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {}
    renderHistory();
  }

  function speakPassage() {
    if (!currentExercise?.passage || !('speechSynthesis' in window)) {
      setStatus(t('В этом браузере недоступно воспроизведение текста.', 'Text-to-speech is not available in this browser.'), true);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentExercise.passage);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  function categoryLabel(value) {
    const labels = {
      grammar: ['Грамматика', 'Grammar'],
      vocabulary: ['Лексика', 'Vocabulary'],
      reading: ['Чтение', 'Reading'],
      listening: ['Аудирование', 'Listening'],
      communication: ['Общение', 'Communication'],
      mixed: ['Смешанная практика', 'Mixed practice']
    };
    const pair = labels[value] || labels[skill.value] || labels.mixed;
    return t(pair[0], pair[1]);
  }

  function renderExercise(exercise) {
    currentExercise = exercise;
    pendingAiExercise = null;
    aiVariantWrap.hidden = true;
    aiVariantOpen.hidden = true;
    checked = false;
    lastMistakes = [];
    resultNode.hidden = true;
    resultNode.replaceChildren();
    workspace.hidden = false;
    title.textContent = exercise.title;
    meta.textContent = exercise.level + ' · ' + exercise.skill.toUpperCase() + ' · ' + exercise.topic;
    instructions.textContent = exercise.instructions;

    passageWrap.hidden = !exercise.passage;
    passage.textContent = exercise.passage || '';
    listenButton.hidden = exercise.skill !== 'listening' || !exercise.passage;

    questionsNode.replaceChildren();
    exercise.questions.forEach((question, index) => {
      const card = document.createElement('fieldset');
      card.className = 'ai-question-card';
      const legend = document.createElement('legend');
      legend.textContent = (index + 1) + '. ' + question.prompt;
      card.append(legend);

      const category = document.createElement('span');
      category.className = 'ai-question-category';
      category.textContent = categoryLabel(question.category);
      card.append(category);

      question.options.forEach(option => {
        const label = document.createElement('label');
        label.className = 'ai-option-row';
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = question.id;
        radio.value = option.id;
        radio.required = true;
        const text = document.createElement('span');
        text.textContent = option.text;
        label.append(radio, text);
        card.append(label);
      });
      questionsNode.append(card);
    });

    checkButton.disabled = false;
    checkButton.textContent = t('Проверить ответы', 'Check answers');
    checkButton.hidden = false;
    workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function prepareAiVariant(request, sequence) {
    const recent = readHistory().slice(0, 4).map(item => item.avoidText || item.title).filter(Boolean);
    aiVariantWrap.hidden = false;
    aiVariantOpen.hidden = true;
    aiVariantHeading.textContent = t('ИИ готовит уникальный вариант…', 'AI is preparing a unique version…');
    aiVariantNote.textContent = t(
      'Можешь уже выполнять мгновенное задание. Уникальный вариант появится здесь, когда будет готов.',
      'Start the instant exercise now. The unique AI version will appear here when ready.'
    );

    try {
      const response = await fetch('/api/practice/generate', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({}, request, { avoid: recent }))
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'AI version is temporarily unavailable.');
      if (!data.exercise_id || !data.exercise || !Array.isArray(data.exercise.questions)) {
        throw new Error('AI returned an incomplete exercise.');
      }
      if (sequence !== generationSequence) return;

      pendingAiExercise = Object.assign({}, data.exercise, { id: data.exercise_id });
      aiVariantHeading.textContent = t('Уникальный вариант ИИ готов.', 'Your unique AI version is ready.');
      aiVariantNote.textContent = t(
        'Мгновенное задание уже доступно. Можешь открыть и уникальную версию ИИ.',
        'The instant exercise is ready. You can also open the unique AI version.'
      );
      aiVariantOpen.hidden = false;
    } catch (error) {
      if (sequence !== generationSequence) return;
      aiVariantHeading.textContent = t('Мгновенное задание готово.', 'Your instant exercise is ready.');
      aiVariantNote.textContent = t(
        'Дополнительный вариант ИИ пока недоступен. Ты можешь продолжить текущее упражнение.',
        'The additional AI version is unavailable for now. You can continue with the current exercise.'
      );
      console.warn('Background AI exercise generation failed:', error?.message || 'unknown error');
    }
  }

  async function generateExercise({ focus = [] } = {}) {
    if (generateButton.disabled) return;
    const remedial = Array.isArray(focus) && focus.length > 0;
    const request = {
      level: remedial ? currentExercise.level : level.value,
      skill: remedial ? currentExercise.skill : skill.value,
      topic: remedial ? currentExercise.topic : topic.value,
      focus: remedial ? focus : []
    };
    const sequence = ++generationSequence;

    pendingAiExercise = null;
    aiVariantWrap.hidden = true;
    generateButton.disabled = true;
    generateButton.textContent = t('Готовим…', 'Preparing…');
    setStatus(
      remedial
        ? t('Подбираем задания по твоим ошибкам…', 'Selecting exercises based on your mistakes…')
        : t('Готовим упражнение без ожидания ИИ…', 'Preparing an exercise without waiting for AI…')
    );

    try {
      const response = await fetch('/api/practice/instant', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t('Не удалось мгновенно создать упражнение.', 'Could not prepare the instant exercise.'));
      if (!data.exercise_id || !data.exercise || !Array.isArray(data.exercise.questions)) {
        throw new Error(t('Не удалось подготовить упражнение.', 'The exercise could not be prepared.'));
      }

      currentExercise = Object.assign({}, data.exercise, { id: data.exercise_id });
      renderExercise(currentExercise);
      setStatus(remedial
        ? t('Упражнение по твоим ошибкам готово сразу. Ответь на вопросы.', 'Your mistake-review exercise is ready. Answer the questions.')
        : t('Упражнение готово сразу. Уникальный вариант ИИ создаётся в фоне.', 'Your exercise is ready instantly. A unique AI version is being prepared in the background.'));
      prepareAiVariant(request, sequence);
    } catch (error) {
      setStatus(error.message || t('Не удалось создать упражнение.', 'Could not create the exercise.'), true);
    } finally {
      generateButton.disabled = false;
      generateButton.textContent = t('Создать задание ↗', 'Generate exercise ↗');
    }
  }

  aiVariantOpen.addEventListener('click', () => {
    if (!pendingAiExercise) return;
    const hasAnswers = Boolean(form.querySelector('input[type="radio"]:checked'));
    if (hasAnswers && !window.confirm(t(
      'Открыть вариант ИИ? Выбранные ответы в текущем задании будут потеряны.',
      'Open the AI version? Your selected answers in the current exercise will be lost.'
    ))) return;

    const exercise = pendingAiExercise;
    renderExercise(exercise);
    setStatus(t('Открыт уникальный вариант, созданный ИИ.', 'The unique AI-generated version is open.'));
  });

  function renderCheckedResults(result) {
    resultNode.replaceChildren();
    resultNode.hidden = false;

    const heading = document.createElement('div');
    heading.className = 'ai-score-heading';
    const score = document.createElement('strong');
    score.textContent = result.score + '%';
    const summary = document.createElement('span');
    summary.textContent = t(
      'Правильно: ' + result.correct + ' из ' + result.total,
      'Correct: ' + result.correct + ' out of ' + result.total
    );
    heading.append(score, summary);
    resultNode.append(heading);

    result.results.forEach((item, index) => {
      const card = document.createElement('article');
      card.className = 'ai-feedback-card ' + (item.is_correct ? 'is-correct' : 'is-wrong');
      const top = document.createElement('div');
      top.className = 'ai-feedback-top';
      const question = document.createElement('strong');
      question.textContent = (index + 1) + '. ' + item.prompt;
      const marker = document.createElement('span');
      marker.textContent = item.is_correct ? '✓' : '✕';
      top.append(question, marker);

      const answer = document.createElement('p');
      answer.textContent = t('Твой ответ: ', 'Your answer: ') +
        item.selected_answer + (item.is_correct ? '' : '. ' + t('Правильно: ', 'Correct: ') + item.correct_answer);
      const explain = document.createElement('p');
      explain.className = 'ai-explanation';
      explain.textContent = item.explanation;
      card.append(top, answer, explain);
      resultNode.append(card);
    });

    lastMistakes = result.results
      .filter(item => !item.is_correct)
      .map(item => ({
        area: item.learning_point || item.category || currentExercise.skill,
        prompt: item.prompt,
        selectedAnswer: item.selected_answer,
        correctAnswer: item.correct_answer,
        explanation: item.explanation
      }));

    if (lastMistakes.length) {
      const retryWrap = document.createElement('div');
      retryWrap.className = 'ai-retry-errors-wrap';
      const note = document.createElement('p');
      note.className = 'ai-retry-errors-note';
      note.textContent = t(
        'Новое упражнение будет сосредоточено на правилах, в которых были ошибки.',
        'The next exercise will focus on the rules you missed.'
      );
      const retryButton = document.createElement('button');
      retryButton.type = 'button';
      retryButton.className = 'button ai-retry-errors-button';
      retryButton.textContent = t('Повторить ошибки ↗', 'Retry mistakes ↗');
      retryButton.addEventListener('click', () => generateExercise({ focus: lastMistakes }));
      retryWrap.append(note, retryButton);
      resultNode.append(retryWrap);
    }

    saveHistory({
      title: currentExercise.title,
      level: currentExercise.level,
      skill: currentExercise.skill,
      score: result.correct,
      total: result.total,
      createdAt: new Date().toISOString(),
      avoidText: [currentExercise.title, currentExercise.passage || '', ...currentExercise.questions.map(q => q.prompt)].join(' ').slice(0, 480)
    });
    setStatus(t('Ответы проверены. Результат сохранён в истории этого браузера.', 'Answers checked. Result saved in this browser history.'));
    checkButton.hidden = true;
    checked = true;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!currentExercise || checked) return;

    const answers = currentExercise.questions.map(question => ({
      question_id: question.id,
      option_id: form.elements.namedItem(question.id)?.value || ''
    }));
    if (answers.some(answer => !answer.option_id)) {
      setStatus(t('Ответь на все вопросы перед проверкой.', 'Answer every question before checking.'), true);
      return;
    }

    checkButton.disabled = true;
    setStatus(t('Проверяем ответы…', 'Checking answers…'));
    try {
      const response = await fetch('/api/practice/' + encodeURIComponent(currentExercise.id) + '/check', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t('Не удалось проверить ответы.', 'Could not check answers.'));
      renderCheckedResults(data);
    } catch (error) {
      setStatus(error.message || t('Не удалось проверить ответы.', 'Could not check answers.'), true);
      checkButton.disabled = false;
    }
  });

  generateButton.addEventListener('click', generateExercise);
  listenButton.addEventListener('click', speakPassage);
  renderHistory();
})();