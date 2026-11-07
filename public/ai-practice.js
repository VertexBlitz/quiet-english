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
    checked = false;
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

  async function generateExercise() {
    if (generateButton.disabled) return;
    generateButton.disabled = true;
    generateButton.textContent = t('Создаём…', 'Generating…');
    workspace.hidden = true;
    setStatus(t('ИИ готовит новое упражнение. Это может занять несколько секунд.', 'AI is creating a new exercise. This may take a few seconds.'));

    const recent = readHistory().slice(0, 4).map(item => item.avoidText || item.title).filter(Boolean);
    try {
      const response = await fetch('/api/practice/generate', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: level.value,
          skill: skill.value,
          topic: topic.value,
          avoid: recent
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t('Не удалось создать упражнение.', 'Could not generate an exercise.'));
      if (!data.exercise_id || !data.exercise || !Array.isArray(data.exercise.questions)) {
        throw new Error(t('ИИ вернул неполное задание. Попробуй ещё раз.', 'AI returned an incomplete exercise. Please try again.'));
      }
      currentExercise = Object.assign({}, data.exercise, { id: data.exercise_id });
      renderExercise(currentExercise);
      setStatus(t('Новое упражнение готово. Ответь на вопросы и проверь результат.', 'Your new exercise is ready. Answer the questions and check your result.'));
    } catch (error) {
      setStatus(error.message || t('Генерация временно недоступна.', 'Generation is temporarily unavailable.'), true);
    } finally {
      generateButton.disabled = false;
      generateButton.textContent = t('Создать задание ↗', 'Generate exercise ↗');
    }
  }

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
      answer.textContent = (item.is_correct ? t('Твой ответ: ', 'Your answer: ') : t('Твой ответ: ', 'Your answer: ')) +
        item.selected_answer + (item.is_correct ? '' : '. ' + t('Правильно: ', 'Correct: ') + item.correct_answer);
      const explain = document.createElement('p');
      explain.className = 'ai-explanation';
      explain.textContent = item.explanation;
      card.append(top, answer, explain);
      resultNode.append(card);
    });

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