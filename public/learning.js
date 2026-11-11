const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

async function learningApi(path, options = {}) {
  const response = await fetch('/api/learning' + path, {
    credentials: 'same-origin',
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || (document.documentElement.lang === 'en' ? 'Could not load learning data.' : 'Не удалось загрузить учебные данные.'));
  return data;
}


const learningLanguage = () => document.documentElement.lang === 'en' ? 'en' : 'ru';
const learningT = (ru, en) => learningLanguage() === 'en' ? en : ru;
const learningPick = value => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const lang = learningLanguage();
    return value[lang] ?? value.en ?? value.ru ?? '';
  }
  return value ?? '';
};
const learningSkillLabels = {
  grammar: ['Грамматика', 'Grammar'],
  vocabulary: ['Лексика', 'Vocabulary'],
  reading: ['Чтение', 'Reading'],
  listening: ['Аудирование', 'Listening'],
  writing: ['Письмо', 'Writing'],
  speaking: ['Говорение', 'Speaking'],
  mixed: ['Смешанная практика', 'Mixed practice'],
  communication: ['Общение', 'Communication']
};
const learningSkill = value => {
  const pair = learningSkillLabels[String(value || '').toLowerCase()];
  return pair ? learningT(pair[0], pair[1]) : String(value || '');
};
const learningGoalLabels = {
  general: ['Общее изучение языка', 'General language'],
  work: ['Для работы', 'Work'],
  travel: ['Для путешествий', 'Travel'],
  communication: ['Повседневное общение', 'Everyday communication'],
  relocation: ['Переезд за границу', 'Moving abroad'],
  study: ['Учёба', 'Study'],
  exam: ['Подготовка к экзамену', 'Exam preparation']
};
const learningGoal = value => {
  const raw = String(value || '').toLowerCase();
  const pair = learningGoalLabels[raw];
  return pair ? learningT(pair[0], pair[1]) : learningPick(value);
};
const learningMinutes = value => learningLanguage() === 'en' ? String(value) + ' min' : String(value) + ' мин';
const setLearningText = (node, ru, en) => {
  if (!node) return;
  node.dataset.learningRu = ru;
  node.dataset.learningEn = en;
  node.textContent = learningT(ru, en);
};
const refreshLearningText = () => {
  document.querySelectorAll('[data-learning-ru][data-learning-en]').forEach(node => {
    node.textContent = learningT(node.dataset.learningRu, node.dataset.learningEn);
  });
};
window.addEventListener('quietenglish:languagechange', refreshLearningText);


async function loadStudyLanguageOptions() {
  const controls = [...new Set([
    ...Array.from(document.querySelectorAll('[data-study-language-select]')),
    $('select[name="language_code"]')
  ].filter(Boolean))];
  if (!controls.length) return;

  try {
    const { languages } = await learningApi('/languages');
    const active = languages.find(item => item.is_active)?.language_code || 'en';
    controls.forEach(select => {
      select.replaceChildren();
      languages.forEach(item => {
        const option = document.createElement('option');
        option.value = item.language_code;
        option.textContent = item.native_name + ' · ' + item.english_name + (item.course_status === 'available' ? '' : learningT(' — скоро', ' — coming soon'));
        option.disabled = item.course_status !== 'available';
        option.selected = item.language_code === active;
        select.append(option);
      });
      if (!languages.some(item => item.language_code === select.value && !item.is_active)) {
        select.value = active;
      }
    });

    const statusText = language => language?.course_status === 'available'
      ? learningT('Курс доступен', 'Course available')
      : learningT('Курс готовится', 'Course in preparation');
    const onboardingSelect = $('select[name="language_code"]');
    const levelSelect = $('select[name="self_assessed_level"]');
    const updateLanguageHint = () => {
      const selectedCode = onboardingSelect?.value || active;
      const selected = languages.find(item => item.language_code === selectedCode);
      document.querySelectorAll('[data-study-language-status]').forEach(node => {
        if (!selected) {
          node.textContent = learningT('Выбери доступный учебный курс.', 'Choose an available course.');
        } else if (selected.language_code === 'de') {
          node.textContent = learningT(
            'Немецкий доступен на уровнях A1–C2: отдельная 4-недельная программа и 28 заданий для выбранного уровня.',
            'German is available from A1 to C2, with a dedicated 4-week plan and 28 exercises at each level.'
          );
        } else if (selected.course_status === 'available') {
          node.textContent = learningT(
            selected.native_name + ' доступен на уровнях A1–C2. ' + statusText(selected) + '.',
            selected.english_name + ' is available at CEFR levels A1–C2. ' + statusText(selected) + '.'
          );
        } else {
          node.textContent = learningT('Сейчас изучается: ', 'Currently learning: ') +
            selected.native_name + ' · ' + statusText(selected);
        }
      });
      if (levelSelect) {
        [...levelSelect.options].forEach(option => { option.disabled = false; });
      }
    };
    onboardingSelect?.addEventListener('change', updateLanguageHint);
    updateLanguageHint();

    const planSelect = $('[data-active-language-switch]');
    if (planSelect && !planSelect.dataset.bound) {
      planSelect.dataset.bound = 'true';
      planSelect.addEventListener('change', async () => {
        planSelect.disabled = true;
        try {
          await learningApi('/languages/activate', {
            method: 'POST',
            body: JSON.stringify({ language_code: planSelect.value })
          });
          location.reload();
        } catch (error) {
          learningMessage($('[data-study-language-status]'), error.message, true);
          planSelect.value = active;
          planSelect.disabled = false;
        }
      });
    }
  } catch (error) {
    document.querySelectorAll('[data-study-language-status]').forEach(node => {
      node.textContent = error.message;
      node.classList.add('error-text');
    });
  }
}

loadStudyLanguageOptions();


function learningMessage(node, message, isError = false) {
  if (!node) return;
  node.textContent = message;
  node.classList.toggle('error-text', isError);
  node.classList.toggle('success-text', !isError);
}

const onboarding = $('[data-onboarding]');
if (onboarding) {
  learningApi('/profile')
    .then(({ profile }) => {
      if (!profile) return;
      for (const [key, value] of Object.entries(profile)) {
        const field = onboarding.elements.namedItem(key);
        if (!field || value == null) continue;
        if (field instanceof RadioNodeList && Array.isArray(value)) {
          [...field].forEach(item => item.checked = value.includes(item.value));
        } else if (field instanceof RadioNodeList) {
          [...field].forEach(item => item.checked = item.value === String(value));
        } else if (field.type === 'checkbox' && Array.isArray(value)) {
          field.checked = value.includes(field.value);
        } else if (field.tagName === 'SELECT' || field.type === 'text' || field.type === 'number') {
          field.value = value;
        }
      }
    })
    .catch(() => {});

  onboarding.addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(onboarding);
    const interests = form.getAll('interests');
    const submit = $('button[type="submit"]', onboarding);
    submit.disabled = true;
    try {
      await learningApi('/onboarding', {
        method: 'PUT',
        body: JSON.stringify({
          goal: form.get('goal'),
          self_assessed_level: form.get('self_assessed_level') || null,
          minutes_per_day: Number(form.get('minutes_per_day')),
          duration_weeks: Number(form.get('duration_weeks') || 4),
          interests,
          preferred_language: form.get('preferred_language') || 'ru',
          language_code: form.get('language_code') || 'en',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        })
      });
      location.href = '/placement.html';
    } catch (error) {
      learningMessage($('[data-learning-status]'), error.message, true);
    } finally {
      submit.disabled = false;
    }
  });
}

const placementRoot = $('[data-placement]');
if (placementRoot) {
  const status = $('[data-learning-status]');
  const form = $('form', placementRoot);
  let questions = [];
  learningApi('/placement/questions')
    .then(data => {
      questions = data.questions;
      const container = $('[data-questions]', placementRoot);
      container.replaceChildren();
      questions.forEach((question, index) => {
        const fieldset = document.createElement('fieldset');
        fieldset.className = 'question-card';
        const legend = document.createElement('legend');
        legend.textContent = (index + 1) + '. ' + question.prompt;
        fieldset.appendChild(legend);
        const level = document.createElement('span');
        level.className = 'eyebrow';
        level.textContent = question.level;
        fieldset.appendChild(level);
        question.options.forEach(option => {
          const label = document.createElement('label');
          label.className = 'option-row';
          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = question.id;
          radio.value = option.id;
          radio.required = true;
          const text = document.createElement('span');
          text.textContent = learningPick(option.text);
          label.append(radio, text);
          fieldset.appendChild(label);
        });
        container.appendChild(fieldset);
      });
      $('[data-placement-loading]', placementRoot)?.remove();
      form.hidden = false;
    })
    .catch(error => learningMessage(status, error.message, true));

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const answers = questions.map(question => ({
      id: question.id,
      option_id: form.elements.namedItem(question.id)?.value
    }));
    const submit = $('button[type="submit"]', form);
    submit.disabled = true;
    try {
      const data = await learningApi('/placement/submit', {
        method: 'POST',
        body: JSON.stringify({ answers })
      });
      sessionStorage.setItem('qe-placement-result', JSON.stringify(data.result));
      location.href = '/plan.html?welcome=1';
    } catch (error) {
      learningMessage(status, error.message, true);
      submit.disabled = false;
    }
  });
}

const planPage = $('[data-plan-page]');
if (planPage) {
  const dashboardSummary = $('[data-dashboard-summary]', planPage);
  const dashboardStatus = $('[data-dashboard-status]', planPage);
  const main = $('[data-today-main]', planPage);
  const weeks = $('[data-plan-weeks]', planPage);
  const coachTasks = $('[data-plan-coach-tasks]', planPage);
  const planState = { plan: null, today: null, planError: null, todayError: null, coach: [] };

  function renderPlanSummary(summary) {
    if (!dashboardSummary || !summary) return;
    dashboardSummary.replaceChildren();
    [
      [summary.minutes, 'Минут обучения', 'Learning minutes'],
      [summary.completed_tasks, 'Выполнено заданий', 'Tasks completed'],
      [summary.active_days, 'Активных дней', 'Active days'],
      [summary.open_errors, 'Открытых ошибок', 'Open errors']
    ].forEach(([value, ru, en]) => {
      const card = document.createElement('article');
      card.className = 'dashboard-metric';
      const number = document.createElement('strong');
      number.textContent = String(value ?? 0);
      const caption = document.createElement('span');
      setLearningText(caption, ru, en);
      card.append(number, caption);
      dashboardSummary.append(card);
    });
    setLearningText(dashboardStatus, 'Данные собраны из сохранённых занятий и результатов.', 'Data is based on saved sessions and results.');
    dashboardStatus.classList.remove('error-text');
  }

  function renderToday() {
    main.replaceChildren();
    if (planState.todayError) {
      const note = document.createElement('p');
      note.textContent = learningT('Не удалось загрузить задание на сегодня. Проверь подключение и попробуй ещё раз.', 'Could not load today’s task. Check your connection and try again.');
      main.append(note);
      return;
    }
    const today = planState.today;
    if (!today) return;
    setLearningText(
      $('[data-day-label]', planPage),
      'Неделя ' + today.week_number + ' · День ' + today.day_index,
      'Week ' + today.week_number + ' · Day ' + today.day_index
    );
    $('[data-today-theme]', planPage).textContent = learningPick(today.theme);
    $('[data-review-count]', planPage).textContent = String(today.review_due ?? 0);

    const task = today.main_task;
    if (task) {
      const card = document.createElement('article');
      card.className = 'task-card';
      const meta = document.createElement('p');
      meta.className = 'eyebrow';
      const skill = learningSkillLabels[String(task.skill || '').toLowerCase()];
      setLearningText(
        meta,
        task.level + ' · ' + (skill?.[0] || task.skill) + ' · ' + task.estimated_time + ' мин',
        task.level + ' · ' + (skill?.[1] || task.skill) + ' · ' + task.estimated_time + ' min'
      );
      const title = document.createElement('h3');
      title.textContent = learningPick(task.objective);
      const objective = document.createElement('p');
      objective.textContent = learningPick(today.objective);
      const start = document.createElement('a');
      start.className = 'button';
      start.href = '/exercise.html?id=' + encodeURIComponent(task.id);
      setLearningText(start, 'Начать задание ↗', 'Start task ↗');
      card.append(meta, title, objective, start);
      main.append(card);
    } else {
      const note = document.createElement('p');
      note.textContent = learningT('На сегодня отдельное задание не назначено. Открой практику, чтобы выбрать упражнение.', 'There is no specific task for today. Open Practice to choose an exercise.');
      main.append(note);
    }
    $('[data-mini-prompt]', planPage).textContent = learningPick(today.mini_prompt);
  }

  function renderPlanWeeks() {
    weeks.replaceChildren();
    (planState.plan?.weeks || []).forEach(week => {
      const item = document.createElement('article');
      item.className = 'week-row';
      const title = document.createElement('h3');
      setLearningText(
        title,
        'Неделя ' + week.week_number + ' · ' + learningPick(week.theme),
        'Week ' + week.week_number + ' · ' + learningPick(week.theme)
      );
      const description = document.createElement('p');
      description.textContent = learningPick(week.objective);
      item.append(title, description);
      weeks.append(item);
    });
  }

  function renderPlanCoachTasks() {
    if (!coachTasks) return;
    coachTasks.replaceChildren();
    if (!planState.coach.length) {
      const note = document.createElement('p');
      note.className = 'fine-print';
      setLearningText(note, 'Открой AI Coach, чтобы получить персональные рекомендации после первых упражнений.', 'Open AI Coach to get personal recommendations after your first exercises.');
      coachTasks.append(note);
      return;
    }
    planState.coach.forEach(task => {
      const card = document.createElement('article');
      card.className = 'coach-task';
      const info = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = learningPick(task.title);
      const description = document.createElement('p');
      description.textContent = learningPick(task.description || task.topic || '');
      info.append(title, description);
      const link = document.createElement('a');
      link.className = 'text-link';
      link.href = '/studio.html';
      setLearningText(link, 'Открыть AI Coach →', 'Open AI Coach →');
      card.append(info, link);
      coachTasks.append(card);
    });
  }

  function renderPlanPage() {
    if (planState.planError) {
      const status = $('[data-learning-status]', planPage);
      learningMessage(status, learningT('План пока не создан. Заверши настройку и тест, чтобы получить персональный маршрут.', 'Your plan has not been created yet. Complete setup and the placement test to get your learning path.'), true);
      const note = document.createElement('p');
      note.textContent = learningT('Заверши настройку и тест, чтобы получить персональный план.', 'Complete setup and the placement test to create your personal plan.');
      const link = document.createElement('a');
      link.className = 'button';
      link.href = '/onboarding.html';
      setLearningText(link, 'Начать настройку ↗', 'Start setup ↗');
      main.replaceChildren(note, link);
      weeks.replaceChildren();
      if (coachTasks) coachTasks.replaceChildren();
      return;
    }
    if (!planState.plan) return;
    $('[data-plan-level]', planPage).textContent = planState.plan.level || '—';
    $('[data-plan-goal]', planPage).textContent = learningGoal(planState.plan.goal);
    renderToday();
    renderPlanWeeks();
    renderPlanCoachTasks();
  }

  learningApi('/progress')
    .then(({ summary }) => renderPlanSummary(summary))
    .catch(error => {
      if (dashboardStatus) {
        dashboardStatus.textContent = learningT('Не удалось загрузить аналитику. Попробуй ещё раз.', 'Could not load learning analytics. Please try again.');
        dashboardStatus.classList.add('error-text');
      }
    });

  Promise.all([
    learningApi('/plan').catch(error => ({ planError: error.message })),
    learningApi('/today').catch(error => ({ todayError: error.message }))
  ]).then(async ([planData, todayData]) => {
    if (planData.planError) {
      planState.planError = planData.planError;
      renderPlanPage();
      return;
    }
    planState.plan = planData.plan;
    planState.today = todayData.today || null;
    planState.todayError = todayData.todayError || null;

    try {
      const latest = await fetch('/api/studio/coach/latest', { credentials: 'same-origin' });
      const latestData = latest.ok ? await latest.json() : null;
      if (latestData?.report && Array.isArray(latestData.tasks)) {
        planState.coach = latestData.tasks;
      } else {
        const analysis = await fetch('/api/studio/coach/analyze', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        });
        if (analysis.ok) {
          const analysisData = await analysis.json();
          planState.coach = analysisData.tasks || [];
        }
      }
    } catch {
      planState.coach = [];
    }
    renderPlanPage();
  });
  window.addEventListener('quietenglish:languagechange', renderPlanPage);
}

const practicePage = $('[data-practice-page]');
if (practicePage) {
  const list = $('[data-exercise-list]', practicePage);
  const practiceState = { exercises: [], error: false };

  function renderPracticeList() {
    list.replaceChildren();
    if (practiceState.error) {
      const note = document.createElement('p');
      note.className = 'copy';
      setLearningText(
        note,
        'Готовые упражнения требуют настроенной базы аккаунтов. Генератор ИИ выше работает отдельно — выбери грамматику, лексику, чтение или аудирование.',
        'The curated exercise library requires an account database. The AI generator above works separately — choose grammar, vocabulary, reading or listening.'
      );
      list.append(note);
      return;
    }
    practiceState.exercises.forEach(exercise => {
      const card = document.createElement('article');
      card.className = 'exercise-card';
      const meta = document.createElement('p');
      meta.className = 'eyebrow';
      const skill = learningSkillLabels[String(exercise.skill || '').toLowerCase()];
      setLearningText(
        meta,
        exercise.level + ' · ' + (skill?.[0] || exercise.skill) + ' · ' + exercise.estimated_time + ' мин',
        exercise.level + ' · ' + (skill?.[1] || exercise.skill) + ' · ' + exercise.estimated_time + ' min'
      );
      const title = document.createElement('h3');
      title.textContent = learningPick(exercise.objective);
      const criteria = document.createElement('p');
      criteria.textContent = learningPick(exercise.success_criteria);
      const link = document.createElement('a');
      link.className = 'text-link';
      link.href = '/exercise.html?id=' + encodeURIComponent(exercise.id);
      setLearningText(link, 'Открыть задание →', 'Open exercise →');
      card.append(meta, title, criteria, link);
      list.append(card);
    });
    if (!practiceState.exercises.length) {
      const empty = document.createElement('p');
      empty.className = 'fine-print';
      setLearningText(empty, 'Пока нет опубликованных упражнений.', 'There are no published exercises yet.');
      list.append(empty);
    }
  }

  learningApi('/exercises')
    .then(({ exercises }) => {
      practiceState.exercises = Array.isArray(exercises) ? exercises : [];
      renderPracticeList();
    })
    .catch(() => {
      practiceState.error = true;
      renderPracticeList();
    });
  window.addEventListener('quietenglish:languagechange', renderPracticeList);
}

const exercisePage = $('[data-exercise-page]');
if (exercisePage) {
  const status = $('[data-learning-status]', exercisePage);
  const form = $('form', exercisePage);
  const options = $('[data-exercise-options]', exercisePage);
  const resultBox = $('[data-exercise-result]', exercisePage);
  const id = new URLSearchParams(location.search).get('id');
  const exerciseState = { exercise: null, result: null };

  function renderExercisePage() {
    const exercise = exerciseState.exercise;
    if (!exercise) return;
    const content = exercise.content || {};
    const selected = form.elements.namedItem('answer')?.value || '';
    const skill = learningSkillLabels[String(exercise.skill || '').toLowerCase()];
    setLearningText(
      $('[data-exercise-meta]', exercisePage),
      exercise.level + ' · ' + (skill?.[0] || exercise.skill) + ' · ' + exercise.estimated_time + ' мин',
      exercise.level + ' · ' + (skill?.[1] || exercise.skill) + ' · ' + exercise.estimated_time + ' min'
    );
    $('[data-exercise-title]', exercisePage).textContent = learningPick(exercise.objective);
    $('[data-exercise-instructions]', exercisePage).textContent =
      learningPick(exercise.instructions) || learningT('Прочитай задание и выбери ответ.', 'Read the task and choose an answer.');

    const material = $('[data-exercise-material]', exercisePage);
    material.replaceChildren();
    if (content.passage) {
      const passage = document.createElement('blockquote');
      passage.className = 'reading-passage';
      passage.textContent = learningPick(content.passage);
      material.append(passage);
    }
    $('[data-exercise-prompt]', exercisePage).textContent = learningPick(content.prompt || '');
    options.replaceChildren();
    (content.options || []).forEach(option => {
      const label = document.createElement('label');
      label.className = 'option-row';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'answer';
      radio.value = option.id;
      radio.required = true;
      radio.checked = option.id === selected;
      const text = document.createElement('span');
      text.textContent = learningPick(option.text);
      label.append(radio, text);
      options.append(label);
    });

    if (exerciseState.result && resultBox) {
      const result = exerciseState.result;
      resultBox.hidden = false;
      resultBox.className = result.is_correct ? 'result-box success' : 'result-box';
      resultBox.textContent = result.is_correct
        ? learningT('Верно! ', 'Correct! ') + learningPick(result.feedback?.explanation)
        : learningT('Правильный ответ: ', 'Correct answer: ') +
          learningPick(result.feedback?.correct_answer || '') + '. ' + learningPick(result.feedback?.explanation);
    }
  }

  if (!id) {
    learningMessage(status, learningT('Не указан идентификатор задания.', 'The exercise ID is missing.'), true);
  } else {
    learningApi('/exercises/' + encodeURIComponent(id)).then(({ exercise }) => {
      exerciseState.exercise = exercise;
      renderExercisePage();
      form.hidden = false;
    }).catch(error => learningMessage(status, error.message, true));
  }

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!exerciseState.exercise) return;
    const selected = form.elements.namedItem('answer')?.value;
    const button = $('button[type="submit"]', form);
    button.disabled = true;
    try {
      exerciseState.result = await learningApi('/exercises/' + encodeURIComponent(id) + '/attempts', {
        method: 'POST',
        body: JSON.stringify({ answer: { option_id: selected } })
      });
      renderExercisePage();
      const chat = $('[data-explain-chat]', exercisePage);
      if (chat) chat.href = '/tutor.html?exercise=' + encodeURIComponent(exerciseState.exercise.id);
    } catch (error) {
      learningMessage(status, error.message, true);
    } finally {
      button.disabled = false;
    }
  });
  window.addEventListener('quietenglish:languagechange', renderExercisePage);
}

const reviewPage = $('[data-review-page]');
if (reviewPage) {
  const deck = $('[data-review-deck]', reviewPage);
  const status = $('[data-learning-status]', reviewPage);
  let items = [];
  let index = 0;
  let showingAnswer = false;
  const renderCard = () => {
    deck.replaceChildren();
    if (!items.length || index >= items.length) {
      const empty = document.createElement('p');
      setLearningText(empty, 'Сейчас нет карточек для повторения. Новые карточки появятся после практики.', 'There are no cards due for review now. New cards will appear after you complete practice.');
      deck.appendChild(empty);
      return;
    }
    const item = items[index];
    const title = document.createElement('p');
    title.className = 'eyebrow';
    setLearningText(title, `ПОВТОРЕНИЕ ${index + 1} / ${items.length}`, `REVIEW ${index + 1} / ${items.length}`);
    const prompt = document.createElement('h2');
    prompt.textContent = learningPick(item.prompt);
    deck.append(title, prompt);
    if (showingAnswer) {
      const answer = document.createElement('p');
      answer.className = 'review-answer';
      answer.textContent = learningPick(item.answer);
      deck.appendChild(answer);
      if (item.explanation) {
        const explanation = document.createElement('p');
        explanation.textContent = learningPick(item.explanation);
        deck.appendChild(explanation);
      }
      const ratings = document.createElement('div');
      ratings.className = 'rating-row';
      [['Again','Снова','Again'],['Hard','Сложно','Hard'],['Good','Хорошо','Good'],['Easy','Легко','Easy']].forEach(([rating,ru,en]) => {
        const button = document.createElement('button');
        button.className = 'button secondary';
        button.type = 'button';
        setLearningText(button, ru, en);
        button.addEventListener('click', async () => {
          try {
            await learningApi('/review/' + item.id, { method:'POST', body:JSON.stringify({rating}) });
            index += 1;
            showingAnswer = false;
            renderCard();
          } catch (error) { learningMessage(status, error.message, true); }
        });
        ratings.appendChild(button);
      });
      deck.appendChild(ratings);
    } else {
      const button = document.createElement('button');
      button.className = 'button';
      button.type = 'button';
      setLearningText(button, 'Показать ответ', 'Show answer');
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          const revealed = await learningApi('/review/' + item.id + '/reveal', {
            method: 'POST',
            body: JSON.stringify({})
          });
          item.answer = revealed.answer;
          item.explanation = revealed.explanation;
          showingAnswer = true;
          renderCard();
        } catch (error) {
          learningMessage(status, error.message, true);
          button.disabled = false;
        }
      });
      deck.appendChild(button);
    }
  };
  learningApi('/review/queue').then(data => {
    items = data.items || [];
    renderCard();
  }).catch(error => learningMessage(status, error.message, true));
  window.addEventListener('quietenglish:languagechange', renderCard);
}

const progressPage = $('[data-progress-page]');
if (progressPage) {
  learningApi('/progress').then(({ summary, skills, last_7_days }) => {
    $('[data-progress-minutes]', progressPage).textContent = summary.minutes;
    $('[data-progress-tasks]', progressPage).textContent = summary.completed_tasks;
    $('[data-progress-days]', progressPage).textContent = summary.active_days;
    $('[data-progress-errors]', progressPage).textContent = summary.open_errors;
    const list = $('[data-skill-progress]', progressPage);
    list.replaceChildren();
    skills.forEach(skill => {
      const row = document.createElement('div');
      row.className = 'skill-progress-row';
      const label = document.createElement('span');
      setLearningText(label, learningSkillLabels[skill.skill]?.[0] || skill.skill, learningSkillLabels[skill.skill]?.[1] || skill.skill);
      const value = document.createElement('strong');
      value.textContent = skill.accuracy == null ? '—' : skill.accuracy + '%';
      const track = document.createElement('div');
      track.className = 'progress-track';
      const bar = document.createElement('div');
      bar.className = 'progress-fill';
      bar.style.width = (skill.accuracy || 0) + '%';
      track.appendChild(bar);
      row.append(label, value, track);
      list.appendChild(row);
    });
    $('[data-progress-empty]', progressPage).hidden = summary.completed_tasks > 0;
  }).catch(error => learningMessage($('[data-learning-status]', progressPage), error.message, true));
}
