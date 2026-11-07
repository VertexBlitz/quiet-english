const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

async function learningApi(path, options = {}) {
  const response = await fetch('/api/learning' + path, {
    credentials: 'same-origin',
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Не удалось загрузить учебные данные.');
  return data;
}

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
          text.textContent = option.text;
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
  Promise.all([
    learningApi('/plan').catch(error => ({ planError: error.message })),
    learningApi('/today').catch(error => ({ todayError: error.message }))
  ]).then(([planData, todayData]) => {
    const main = $('[data-today-main]', planPage);
    const weeks = $('[data-plan-weeks]', planPage);
    if (planData.planError) {
      learningMessage($('[data-learning-status]'), planData.planError, true);
      main.innerHTML = '<p>Заверши онбординг и тест, чтобы получить персональный план.</p><a class="button" href="/onboarding.html">Начать настройку <span>↗</span></a>';
      return;
    }
    const plan = planData.plan;
    $('[data-plan-level]', planPage).textContent = plan.level;
    $('[data-plan-goal]', planPage).textContent = plan.goal;
    if (todayData.todayError) {
      main.textContent = todayData.todayError;
    } else {
      const today = todayData.today;
      $('[data-day-label]', planPage).textContent = `Week ${today.week_number} · Day ${today.day_index}`;
      $('[data-today-theme]', planPage).textContent = today.theme;
      $('[data-review-count]', planPage).textContent = today.review_due;
      const task = today.main_task;
      if (task) {
        const card = document.createElement('article');
        card.className = 'task-card';
        const meta = document.createElement('p');
        meta.className = 'eyebrow';
        meta.textContent = `${task.level} · ${task.skill} · ${task.estimated_time} min`;
        const title = document.createElement('h3');
        title.textContent = task.objective;
        const objective = document.createElement('p');
        objective.textContent = today.objective;
        const start = document.createElement('a');
        start.className = 'button';
        start.href = '/exercise.html?id=' + encodeURIComponent(task.id);
        start.textContent = 'Начать задание ↗';
        card.append(meta, title, objective, start);
        main.replaceChildren(card);
      }
      $('[data-mini-prompt]', planPage).textContent = today.mini_prompt;
    }
    weeks.replaceChildren();
    (plan.weeks || []).forEach(week => {
      const item = document.createElement('article');
      item.className = 'week-row';
      const title = document.createElement('h3');
      title.textContent = `Week ${week.week_number} · ${week.theme}`;
      const text = document.createElement('p');
      text.textContent = week.objective;
      item.append(title, text);
      weeks.appendChild(item);
    });
    const coachTasks = $('[data-plan-coach-tasks]', planPage);
    if (coachTasks) {
      const renderCoachTasks = data => {
        coachTasks.replaceChildren();
        const tasks = data && Array.isArray(data.tasks) ? data.tasks : [];
        if (!tasks.length) {
          const note = document.createElement('p');
          note.className = 'fine-print';
          note.textContent = 'Открой Quiet English AI, чтобы получить персональные рекомендации после первых упражнений.';
          coachTasks.append(note);
          return;
        }
        tasks.forEach(task => {
          const card = document.createElement('article');
          card.className = 'coach-task';
          const info = document.createElement('div');
          const heading = document.createElement('strong');
          heading.textContent = task.title;
          const detail = document.createElement('p');
          detail.textContent = task.description || task.topic || '';
          info.append(heading, detail);
          const link = document.createElement('a');
          link.className = 'text-link';
          link.href = '/studio.html';
          link.textContent = 'Открыть AI Coach →';
          card.append(info, link);
          coachTasks.append(card);
        });
      };
      fetch('/api/studio/coach/latest', { credentials: 'same-origin' })
        .then(response => response.ok ? response.json() : Promise.reject(new Error('AI Coach пока недоступен.')))
        .then(data => {
          if (data.report) renderCoachTasks(data);
          else fetch('/api/studio/coach/analyze', {
            method: 'POST', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' }, body: '{}'
          }).then(response => response.ok ? response.json() : Promise.reject(new Error('AI Coach пока недоступен.')))
            .then(renderCoachTasks).catch(() => renderCoachTasks({ tasks: [] }));
        })
        .catch(() => renderCoachTasks({ tasks: [] }));
    }
  });
}

const practicePage = $('[data-practice-page]');
if (practicePage) {
  const list = $('[data-exercise-list]', practicePage);
  const status = $('[data-learning-status]', practicePage);
  learningApi('/exercises').then(({ exercises }) => {
    list.replaceChildren();
    exercises.forEach(exercise => {
      const card = document.createElement('article');
      card.className = 'exercise-card';
      const meta = document.createElement('p');
      meta.className = 'eyebrow';
      meta.textContent = `${exercise.level} · ${exercise.skill} · ${exercise.estimated_time} min`;
      const heading = document.createElement('h3');
      heading.textContent = exercise.objective;
      const text = document.createElement('p');
      text.textContent = exercise.success_criteria;
      const link = document.createElement('a');
      link.className = 'text-link';
      link.href = '/exercise.html?id=' + encodeURIComponent(exercise.id);
      link.textContent = 'Открыть задание →';
      card.append(meta, heading, text, link);
      list.appendChild(card);
    });
  }).catch(() => {
    list.replaceChildren();
    const note = document.createElement('p');
    note.className = 'copy';
    note.textContent = 'Готовые упражнения из личной библиотеки требуют настроенной базы аккаунтов. Генератор ИИ выше работает отдельно — выбери грамматику, лексику, чтение или аудирование.';
    list.appendChild(note);
  });
}

const exercisePage = $('[data-exercise-page]');
if (exercisePage) {
  const status = $('[data-learning-status]', exercisePage);
  const id = new URLSearchParams(location.search).get('id');
  if (!id) learningMessage(status, 'Не указан идентификатор задания.', true);
  else learningApi('/exercises/' + encodeURIComponent(id)).then(({ exercise }) => {
    $('[data-exercise-meta]', exercisePage).textContent = `${exercise.level} · ${exercise.skill} · ${exercise.estimated_time} min`;
    $('[data-exercise-title]', exercisePage).textContent = exercise.objective;
    $('[data-exercise-instructions]', exercisePage).textContent = exercise.instructions?.ru || exercise.instructions?.en || '';
    const content = exercise.content;
    if (content.passage) {
      const passage = document.createElement('blockquote');
      passage.className = 'reading-passage';
      passage.textContent = content.passage;
      $('[data-exercise-material]', exercisePage).appendChild(passage);
    }
    $('[data-exercise-prompt]', exercisePage).textContent = content.prompt || '';
    const options = $('[data-exercise-options]', exercisePage);
    content.options.forEach(option => {
      const label = document.createElement('label');
      label.className = 'option-row';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'answer';
      radio.value = option.id;
      radio.required = true;
      const text = document.createElement('span');
      text.textContent = option.text;
      label.append(radio, text);
      options.appendChild(label);
    });
    const form = $('form', exercisePage);
    form.hidden = false;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const selected = form.elements.namedItem('answer')?.value;
      const button = $('button[type="submit"]', form);
      button.disabled = true;
      try {
        const result = await learningApi('/exercises/' + encodeURIComponent(id) + '/attempts', {
          method: 'POST',
          body: JSON.stringify({ answer: { option_id: selected } })
        });
        const resultBox = $('[data-exercise-result]', exercisePage);
        resultBox.hidden = false;
        resultBox.className = result.is_correct ? 'result-box success' : 'result-box';
        resultBox.textContent = result.is_correct
          ? 'Верно! ' + (result.feedback.explanation?.ru || result.feedback.explanation?.en || '')
          : 'Правильный ответ: ' + (result.feedback.correct_answer || '') + '. ' + (result.feedback.explanation?.ru || result.feedback.explanation?.en || '');
        const chat = $('[data-explain-chat]', exercisePage);
        chat.href = '/tutor.html?exercise=' + encodeURIComponent(exercise.id);
      } catch (error) {
        learningMessage(status, error.message, true);
      } finally {
        button.disabled = false;
      }
    });
  }).catch(error => learningMessage(status, error.message, true));
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
    if (!items.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Сейчас нет карточек для повторения. Новые карточки появятся после практики.';
      deck.appendChild(empty);
      return;
    }
    const item = items[index];
    const title = document.createElement('p');
    title.className = 'eyebrow';
    title.textContent = `REVIEW ${index + 1} / ${items.length}`;
    const prompt = document.createElement('h2');
    prompt.textContent = item.prompt;
    deck.append(title, prompt);
    if (showingAnswer) {
      const answer = document.createElement('p');
      answer.className = 'review-answer';
      answer.textContent = item.answer;
      deck.appendChild(answer);
      if (item.explanation) {
        const explanation = document.createElement('p');
        explanation.textContent = item.explanation;
        deck.appendChild(explanation);
      }
      const ratings = document.createElement('div');
      ratings.className = 'rating-row';
      ['Again','Hard','Good','Easy'].forEach(rating => {
        const button = document.createElement('button');
        button.className = 'button secondary';
        button.type = 'button';
        button.textContent = rating;
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
      button.textContent = 'Показать ответ';
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
      label.textContent = skill.skill;
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
