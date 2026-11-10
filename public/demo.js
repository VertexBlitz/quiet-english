(() => {
  const ACTIVE_KEY = 'qe.demo.active';
  const STATE_KEY = 'qe.demo.state.v1';
  const DAY_MS = 24 * 60 * 60 * 1000;
  const weekThemes = [
    ['Everyday communication', 'Describe routines, experiences and plans with clear everyday language.'],
    ['Travel and problem solving', 'Ask for help, make polite requests and understand practical information.'],
    ['Work, study and opinions', 'Explain reasons, express opinions and write clear short messages.'],
    ['Practical communication', 'Combine vocabulary, grammar and comprehension in realistic situations.']
  ];
  const miniPrompts = [
    'Write one sentence about something you did today.',
    'Make one polite request you could use while travelling.',
    'Give one reason for an opinion using “because”.',
    'Summarise one useful thing you learned this week.'
  ];
  const levelRank = { 'Pre-A1': 0, A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
  let active = false;
  let memoryState = null;

  const emptyCourseState = () => ({
    profile: null,
    placementResult: null,
    plan: null,
    attempts: [],
    srsItems: [],
    errors: [],
    activity: [],
    skillPractice: []
  });

  const freshState = () => ({
    ...emptyCourseState(),
    activeLanguage: 'en',
    courses: { en: emptyCourseState() }
  });

  function readState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && saved.courses && typeof saved.courses === 'object') {
          const activeLanguage = saved.activeLanguage || 'en';
          const course = { ...emptyCourseState(), ...(saved.courses[activeLanguage] || {}) };
          return { ...course, activeLanguage, courses: saved.courses };
        }
        // Migrate the previous single-course demo state to an English course.
        const english = { ...emptyCourseState(), ...(saved || {}) };
        return { ...english, activeLanguage: 'en', courses: { en: english } };
      }
    } catch {}
    return memoryState || freshState();
  }

  function writeState(state) {
    const activeLanguage = state.activeLanguage || 'en';
    const courseState = {
      profile: state.profile ?? null,
      placementResult: state.placementResult ?? null,
      plan: state.plan ?? null,
      attempts: Array.isArray(state.attempts) ? state.attempts : [],
      srsItems: Array.isArray(state.srsItems) ? state.srsItems : [],
      errors: Array.isArray(state.errors) ? state.errors : [],
      activity: Array.isArray(state.activity) ? state.activity : [],
      skillPractice: Array.isArray(state.skillPractice) ? state.skillPractice : []
    };
    const courses = { ...(state.courses || {}), [activeLanguage]: courseState };
    memoryState = { ...courseState, activeLanguage, courses };
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify({ version: 2, activeLanguage, courses }));
    } catch {}
  }

  function start() {
    active = true;
    try {
      localStorage.setItem(ACTIVE_KEY, '1');
      if (!localStorage.getItem(STATE_KEY)) localStorage.setItem(STATE_KEY, JSON.stringify(freshState()));
    } catch {}
    memoryState = readState();
    return true;
  }

  async function ensure() {
    const params = new URLSearchParams(location.search);
    if (params.get('demo') === '1') {
      start();
      params.delete('demo');
      const query = params.toString();
      history.replaceState(null, '', location.pathname + (query ? '?' + query : '') + location.hash);
      return true;
    }
    if (active) return true;
    try { active = localStorage.getItem(ACTIVE_KEY) === '1'; } catch {}
    if (active) return true;

    try {
      const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (response.ok) return false;
    } catch {}
    return start();
  }

  const isActive = () => active;
  const getState = () => readState();
  const getProfile = () => readState().profile;

  async function apiFetch(path, options = {}) {
    const response = await fetch('/api/demo' + path, {
      credentials: 'same-origin',
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Не удалось выполнить демо-задание.');
    return data;
  }

  function requirePlan(state) {
    if (!state.plan) throw new Error('Сначала настрой демо-профиль и пройди короткий тест уровня.');
    return state.plan;
  }

  function chooseExercise(level, day) {
    const rank = levelRank[level] ?? 2;
    const cycle = rank <= 1
      ? ['V04', 'G01', 'R04', 'V01', 'G06', 'R01', 'V05']
      : rank <= 3
        ? ['V01', 'G02', 'R01', 'V02', 'G03', 'R02', 'G07']
        : ['V03', 'G04', 'R02', 'V07', 'G08', 'R05', 'G03'];
    return cycle[(day - 1) % cycle.length];
  }

  function buildPlan(state, level) {
    const profile = state.profile;
    const startedAt = new Date().toISOString();
    const days = [];
    for (let week = 1; week <= 4; week++) {
      for (let dayInWeek = 1; dayInWeek <= 7; dayInWeek++) {
        const day = (week - 1) * 7 + dayInWeek;
        days.push({
          day_index: day,
          week_number: week,
          theme: weekThemes[week - 1][0],
          objective: weekThemes[week - 1][1],
          main_task_id: chooseExercise(level, day),
          mini_prompt: miniPrompts[(day - 1) % miniPrompts.length],
          completed: false
        });
      }
    }
    state.plan = {
      id: 'demo-plan',
      goal: profile.goal,
      level,
      duration_weeks: 4,
      minutes_per_day: Number(profile.minutes_per_day || 10),
      starts_on: startedAt.slice(0, 10),
      started_at: startedAt,
      weeks: weekThemes.map(([theme, objective], index) => ({
        week_number: index + 1, theme, objective
      })),
      days
    };
    state.profile.assessed_level = level;
    state.profile.onboarding_completed_at = startedAt;
    writeState(state);
  }

  function currentDay(plan) {
    const start = new Date(plan.started_at || Date.now());
    const elapsed = Math.max(0, Date.now() - start.getTime());
    return Math.min(28, Math.floor(elapsed / DAY_MS) + 1);
  }

  function todayKey() {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  }

  function recordActivity(state, minutes, completedTasks = 1) {
    const key = todayKey();
    let item = state.activity.find(entry => entry.activity_date === key);
    if (!item) {
      item = { activity_date: key, minutes: 0, completed_tasks: 0 };
      state.activity.push(item);
    }
    item.minutes += Math.max(1, Number(minutes) || 1);
    item.completed_tasks += completedTasks;
  }

  async function request(path, options = {}) {
    await ensure();
    if (!active) {
      const response = await fetch('/api/learning' + path, {
        credentials: 'same-origin',
        ...options,
        headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Не удалось загрузить учебные данные.');
      return data;
    }

    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};
    const state = readState();

    if (path === '/profile' && method === 'GET') {
      return { profile: state.profile };
    }

    if (path === '/onboarding' && method === 'PUT') {
      const goals = ['general', 'work', 'travel', 'exam', 'communication', 'relocation', 'study'];
      const levels = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      if (!goals.includes(body.goal)) throw new Error('Выбери цель обучения.');
      if (body.self_assessed_level && !levels.includes(body.self_assessed_level)) throw new Error('Уровень указан некорректно.');
      if (![5, 10, 15, 30].includes(Number(body.minutes_per_day))) throw new Error('Выбери 5, 10, 15 или 30 минут.');
      if (Number(body.duration_weeks) !== 4) throw new Error('В демо доступен четырёхнедельный план.');
      if (!Array.isArray(body.interests) || body.interests.length > 8) throw new Error('Проверь список интересов.');
      if (!['ru', 'en'].includes(body.preferred_language)) throw new Error('Выбери язык интерфейса.');
      state.profile = {
        name: 'Demo Learner',
        goal: body.goal,
        self_assessed_level: body.self_assessed_level || null,
        assessed_level: state.placementResult?.level || null,
        minutes_per_day: Number(body.minutes_per_day),
        duration_weeks: 4,
        interests: body.interests,
        preferred_language: body.preferred_language,
        timezone: body.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        onboarding_completed_at: new Date().toISOString()
      };
      writeState(state);
      return { ok: true, message: 'Демо-профиль сохранён в этом браузере.' };
    }

    if (path === '/placement/questions' && method === 'GET') {
      return apiFetch('/placement/questions');
    }

    if (path === '/placement/submit' && method === 'POST') {
      const data = await apiFetch('/placement/submit', {
        method: 'POST',
        body: JSON.stringify({ answers: body.answers })
      });
      state.placementResult = data.result;
      buildPlan(state, data.result.level);
      return { ...data, plan: { id: 'demo-plan', duration_weeks: 4 } };
    }

    if (path === '/plan' && method === 'GET') {
      const plan = requirePlan(state);
      return { plan };
    }

    if (path === '/today' && method === 'GET') {
      const plan = requirePlan(state);
      const dayIndex = currentDay(plan);
      const day = plan.days[dayIndex - 1];
      const { exercise } = await apiFetch('/exercises/' + encodeURIComponent(day.main_task_id));
      const due = state.srsItems.filter(item => new Date(item.due_at).getTime() <= Date.now()).length;
      const completed = state.attempts.some(item => item.exercise_id === day.main_task_id && item.activity_date === todayKey());
      return {
        today: {
          plan_id: plan.id,
          level: plan.level,
          goal: plan.goal,
          minutes_per_day: plan.minutes_per_day,
          day_index: day.day_index,
          week_number: day.week_number,
          theme: day.theme,
          objective: day.objective,
          main_task: {
            id: exercise.id,
            skill: exercise.skill,
            level: exercise.level,
            objective: exercise.objective,
            estimated_time: exercise.estimated_time,
            instructions: exercise.instructions,
            content: exercise.content,
            success_criteria: exercise.success_criteria
          },
          review_due: due,
          review_item_limit: 5,
          mini_prompt: day.mini_prompt,
          completed
        }
      };
    }

    if (path === '/exercises' && method === 'GET') return apiFetch('/exercises');
    const exerciseMatch = path.match(/^\/exercises\/([^/]+)$/);
    if (exerciseMatch && method === 'GET') return apiFetch('/exercises/' + encodeURIComponent(decodeURIComponent(exerciseMatch[1])));
    const attemptMatch = path.match(/^\/exercises\/([^/]+)\/attempts$/);
    if (attemptMatch && method === 'POST') {
      const exerciseId = decodeURIComponent(attemptMatch[1]);
      const data = await apiFetch('/exercises/' + encodeURIComponent(exerciseId) + '/attempts', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      const exerciseResponse = await apiFetch('/exercises/' + encodeURIComponent(exerciseId));
      const exercise = exerciseResponse.exercise;
      const selectedId = body.answer?.option_id;
      const selectedOption = exercise.content.options?.find(option => option.id === selectedId);
      const now = new Date().toISOString();
      const attempt = {
        exercise_id: exerciseId,
        skill: exercise.skill,
        level: exercise.level,
        is_correct: data.is_correct,
        created_at: now,
        activity_date: todayKey()
      };
      state.attempts.push(attempt);
      recordActivity(state, exercise.estimated_time, 1);

      if (exercise.srs?.enabled && exercise.content.options?.length) {
        const correctOption = exercise.content.options.find(option => option.text === data.feedback.correct_answer);
        const existing = state.srsItems.find(item => item.item_ref === exerciseId);
        const item = {
          id: existing?.id || 'demo-srs-' + exerciseId,
          item_type: exercise.srs.item_type || exercise.skill,
          item_ref: exerciseId,
          prompt: exercise.content.prompt || exercise.objective,
          answer: correctOption?.text || data.feedback.correct_answer || '',
          explanation: exercise.explanation?.ru || exercise.explanation?.en || '',
          interval_days: 0,
          repetitions: 0,
          ease_factor: 2.5,
          due_at: now,
          last_rating: null,
          updated_at: now
        };
        if (existing) Object.assign(existing, item);
        else state.srsItems.push(item);
      }

      if (!data.is_correct) {
        const correction = data.feedback.correct_answer || '';
        const errorId = 'demo-error-' + exerciseId;
        const existingError = state.errors.find(item => item.id === errorId && !item.resolved_at);
        if (existingError) {
          existingError.occurrences += 1;
          existingError.updated_at = now;
        } else {
          state.errors.push({
            id: errorId,
            error_type: exercise.skill + (exercise.tags?.[0] ? ' · ' + exercise.tags[0] : ''),
            incorrect_form: selectedOption?.text || String(selectedId || ''),
            correction,
            explanation: exercise.explanation?.ru || exercise.explanation?.en || '',
            occurrences: 1,
            created_at: now,
            updated_at: now,
            resolved_at: null
          });
        }
      }
      writeState(state);
      return data;
    }

    if (path === '/review/queue' && method === 'GET') {
      const items = state.srsItems
        .filter(item => new Date(item.due_at).getTime() <= Date.now())
        .sort((a, b) => new Date(a.due_at) - new Date(b.due_at))
        .slice(0, 20)
        .map(({ answer, ...safe }) => safe);
      return { items };
    }

    const revealMatch = path.match(/^\/review\/([^/]+)\/reveal$/);
    if (revealMatch && method === 'POST') {
      const id = decodeURIComponent(revealMatch[1]);
      const item = state.srsItems.find(entry => entry.id === id);
      if (!item || new Date(item.due_at).getTime() > Date.now()) throw new Error('Карточка не найдена или ещё не готова к повторению.');
      return { answer: item.answer, explanation: item.explanation };
    }

    const ratingMatch = path.match(/^\/review\/([^/]+)$/);
    if (ratingMatch && method === 'POST') {
      const id = decodeURIComponent(ratingMatch[1]);
      const item = state.srsItems.find(entry => entry.id === id);
      const rating = body.rating;
      if (!item) throw new Error('Карточка не найдена.');
      if (!['Again', 'Hard', 'Good', 'Easy'].includes(rating)) throw new Error('Выбери Again, Hard, Good или Easy.');
      let interval = item.interval_days;
      let repetitions = item.repetitions;
      let ease = Number(item.ease_factor);
      if (rating === 'Again') { repetitions = 0; interval = 0; ease = Math.max(1.3, ease - 0.2); }
      else if (rating === 'Hard') { interval = Math.max(1, Math.round(interval * 1.2)); repetitions += 1; ease = Math.max(1.3, ease - 0.15); }
      else if (rating === 'Good') { interval = repetitions === 0 ? 1 : repetitions === 1 ? 3 : Math.round(interval * ease); repetitions += 1; }
      else { interval = Math.max(2, Math.round(interval * ease * 1.3)); repetitions += 1; ease += 0.15; }
      item.interval_days = interval;
      item.repetitions = repetitions;
      item.ease_factor = ease;
      item.last_rating = rating;
      item.due_at = new Date(Date.now() + (interval === 0 ? 10 * 60 * 1000 : interval * DAY_MS)).toISOString();
      item.updated_at = new Date().toISOString();
      recordActivity(state, 1, 0);
      writeState(state);
      return { ok: true, next_interval_days: interval, rating };
    }

    if (path === '/progress' && method === 'GET') {
      const completedTasks = state.activity.reduce((sum, item) => sum + item.completed_tasks, 0);
      const minutes = state.activity.reduce((sum, item) => sum + item.minutes, 0);
      const activeDays = state.activity.filter(item => item.completed_tasks > 0).length;
      const skillNames = [...new Set([
        ...state.attempts.map(item => item.skill),
        ...(state.skillPractice || []).map(item => item.skill)
      ])];
      const skills = skillNames.map(skill => {
        const matching = state.attempts.filter(item => item.skill === skill);
        const practice = (state.skillPractice || []).filter(item => item.skill === skill);
        const scoredPractice = practice.filter(item => Number.isInteger(item.score));
        const scored = matching.length + scoredPractice.length;
        const weighted = matching.filter(item => item.is_correct).length * 100 + scoredPractice.reduce((sum, item) => sum + item.score, 0);
        return { skill, attempts: matching.length + practice.length, accuracy: scored ? Math.round(weighted / scored) : null };
      });
      return {
        summary: {
          minutes,
          completed_tasks: completedTasks,
          active_days: activeDays,
          open_errors: state.errors.filter(item => !item.resolved_at).length
        },
        skills,
        last_7_days: state.activity.slice(-7)
      };
    }

    if (path === '/errors' && method === 'GET') {
      return { errors: state.errors.filter(item => !item.resolved_at).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)) };
    }

    const resolveMatch = path.match(/^\/errors\/([^/]+)\/resolve$/);
    if (resolveMatch && method === 'POST') {
      const id = decodeURIComponent(resolveMatch[1]);
      const item = state.errors.find(entry => entry.id === id && !entry.resolved_at);
      if (!item) throw new Error('Ошибка не найдена или уже закрыта.');
      item.resolved_at = new Date().toISOString();
      item.updated_at = item.resolved_at;
      writeState(state);
      return { ok: true };
    }

    throw new Error('Эта функция пока недоступна в демо-режиме.');
  }

  async function command(command) {
    const state = readState();
    if (command === '/plan') {
      if (!state.plan) return 'Сначала пройди настройку и тест уровня. Открой раздел «План».';
      return '**Твой план на 4 недели · ' + state.plan.level + '**\n\n' +
        state.plan.weeks.map(week => '**Неделя ' + week.week_number + ': ' + week.theme + '**\n' + week.objective).join('\n\n');
    }
    if (command === '/today') {
      const { today } = await request('/today');
      return '**Сегодня · неделя ' + today.week_number + ', день ' + today.day_index + '**\n\n' +
        '**Тема:** ' + today.theme + '\n\n**Главная задача:** ' + today.main_task.objective +
        '\n\n**Повторение:** ' + today.review_due + '\n\n**Мини-практика:** ' + today.mini_prompt;
    }
    if (command === '/practice') {
      const { exercises } = await request('/exercises');
      return '**Практика**\n\n' + exercises.slice(0, 8).map(item =>
        '- **' + item.id + ' · ' + item.skill + ' · ' + item.level + '** — ' + item.objective + ' (' + item.estimated_time + ' min)'
      ).join('\n');
    }
    if (command === '/review') {
      const { items } = await request('/review/queue');
      return items.length ? '**Повторение · ' + items.length + ' карточек**\n\n' + items.slice(0, 5).map(item => '- ' + item.prompt).join('\n')
        : 'Пока нет карточек для повторения. Выполни упражнение с лексикой или грамматикой, чтобы добавить карточку.';
    }
    if (command === '/progress') {
      const { summary, skills } = await request('/progress');
      return '**Твой прогресс**\n\n- Время обучения: ' + summary.minutes + ' мин\n- Заданий: ' + summary.completed_tasks +
        '\n- Активных дней: ' + summary.active_days + '\n- Открытых ошибок: ' + summary.open_errors +
        '\n\n**Навыки**\n' + (skills.map(item => '- ' + item.skill + ': ' + (item.accuracy == null ? '—' : item.accuracy + '%')).join('\n') || 'Выполни несколько заданий, чтобы увидеть результаты.');
    }
    return null;
  }

  function recordSkillPractice(record) {
    if (!active) throw new Error('Сначала активируй демо-профиль.');
    const allowed = new Set([
      'listen_cafe_01','listen_station_01','listen_weekend_01',
      'write_invitation_01','write_opinion_01','write_summary_01',
      'speak_hobby_01','speak_place_01','speak_technology_01'
    ]);
    if (!allowed.has(record?.task_id) || !['listening','writing','speaking'].includes(record?.skill)) {
      throw new Error('Неизвестный тип задания.');
    }
    const state = readState();
    state.skillPractice = Array.isArray(state.skillPractice) ? state.skillPractice : [];
    state.skillPractice.push({
      skill: record.skill, task_id: record.task_id,
      score: Number.isInteger(record.score) ? Math.max(0, Math.min(100, record.score)) : null,
      word_count: Math.max(0, Math.min(500, Number(record.word_count) || 0)),
      duration_seconds: Math.max(1, Math.min(1800, Number(record.duration_seconds) || 1)),
      created_at: new Date().toISOString()
    });
    if (state.skillPractice.length > 500) state.skillPractice.splice(0, state.skillPractice.length - 500);
    recordActivity(state, Math.max(1, Math.round((Number(record.duration_seconds) || 1) / 60)), 1);
    writeState(state);
    return true;
  }

  function getSkillPracticeStats() {
    const rows = readState().skillPractice || [];
    return ['listening','writing','speaking'].map(skill => {
      const matching = rows.filter(item => item.skill === skill);
      const scored = matching.filter(item => Number.isInteger(item.score));
      return {
        skill, attempts: matching.length,
        accuracy: scored.length ? Math.round(scored.reduce((sum,item) => sum + item.score,0) / scored.length) : null
      };
    }).filter(item => item.attempts > 0);
  }
  function reset() {
    try {
      localStorage.removeItem(ACTIVE_KEY);
      localStorage.removeItem(STATE_KEY);
    } catch {}
    active = false;
    memoryState = null;
    location.href = '/';
  }

  window.QEDemo = { ensure, isActive, start, reset, request, command, getState, getProfile, recordSkillPractice, getSkillPracticeStats };
})();
