(async () => {
  const nav = document.querySelector('.topbar nav');
  if (nav && !nav.querySelector('a[href="/vocabulary.html"]')) {
    const vocabularyLink = document.createElement('a');
    vocabularyLink.href = '/vocabulary.html';
    vocabularyLink.setAttribute('data-ru', 'Словарь');
    vocabularyLink.setAttribute('data-en', 'Vocabulary');
    vocabularyLink.textContent = document.documentElement.lang === 'en' ? 'Vocabulary' : 'Словарь';
    const skillsExisting = nav.querySelector('a[href="/skills.html"]');
    if (skillsExisting) skillsExisting.insertAdjacentElement('afterend', vocabularyLink);
    else {
      const practiceExisting = nav.querySelector('a[href="/practice.html"]');
      if (practiceExisting) practiceExisting.insertAdjacentElement('afterend', vocabularyLink);
      else nav.appendChild(vocabularyLink);
    }
  }
  if (nav && !nav.querySelector('a[href="/skills.html"]')) {
    const skillsLink = document.createElement('a');
    skillsLink.href = '/skills.html';
    skillsLink.setAttribute('data-ru', 'Навыки');
    skillsLink.setAttribute('data-en', 'Skills Lab');
    skillsLink.textContent = document.documentElement.lang === 'en' ? 'Skills Lab' : 'Навыки';
    const practiceLink = nav.querySelector('a[href="/practice.html"]');
    if (practiceLink) practiceLink.insertAdjacentElement('afterend', skillsLink);
    else nav.appendChild(skillsLink);
  }
  const accountLink = document.querySelector('.account-link');
  if (!accountLink) return;

  let user = null;
  try {
    if (window.QEDemo) await window.QEDemo.ensure();
    const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (response.ok) user = (await response.json())?.user || null;
  } catch {}

  async function addCourseSwitcher(isAuthenticated) {
    const host = document.querySelector('.language-switch');
    if (!host) return;
    let courses = [];
    try {
      if (isAuthenticated) {
        const response = await fetch('/api/learning/courses', { credentials: 'same-origin' });
        if (!response.ok) return;
        courses = (await response.json()).courses || [];
      } else if (window.QEDemo?.isActive()) {
        courses = (await window.QEDemo.request('/courses')).courses || [];
      }
    } catch { return; }
    if (!courses.length) return;

    const select = document.createElement('select');
    select.className = 'course-switch';
    select.setAttribute('aria-label', 'Изучаемый язык');
    select.title = 'Изучаемый язык';
    for (const course of courses) {
      const option = document.createElement('option');
      option.value = course.course_id || ('new:' + course.language_code);
      const name = course.native_name || course.name_en || course.language_code;
      option.textContent = course.availability === 'coming_soon'
        ? name + ' · Скоро'
        : course.course_id ? name : name + ' · Добавить курс';
      option.disabled = course.availability !== 'active';
      select.appendChild(option);
    }
    const activeCourse = courses.find(course => course.is_active);
    if (activeCourse) select.value = activeCourse.course_id || activeCourse.language_code;
    host.insertBefore(select, host.querySelector('.account-link') || null);

    select.addEventListener('change', async () => {
      const selected = courses.find(course =>
        course.course_id === select.value ||
        ('new:' + course.language_code) === select.value ||
        course.language_code === select.value
      );
      if (!selected || selected.availability !== 'active') return;
      select.disabled = true;
      try {
        let course;
        const isNew = !selected.course_id;
        if (isAuthenticated) {
          const response = await fetch(
            isNew ? '/api/learning/courses' : '/api/learning/courses/' + encodeURIComponent(selected.course_id) + '/activate',
            {
              method: isNew ? 'POST' : 'PUT',
              credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(isNew ? { language_code: selected.language_code } : {})
            }
          );
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || 'Не удалось переключить курс.');
          course = data.course || selected;
        } else {
          const path = isNew ? '/courses' : '/courses/' + encodeURIComponent(selected.language_code) + '/activate';
          const data = await window.QEDemo.request(path, {
            method: isNew ? 'POST' : 'PUT',
            body: JSON.stringify(isNew ? { language_code: selected.language_code } : {})
          });
          course = data.course || selected;
        }
        const needsOnboarding = isNew || !selected.onboarding_completed_at;
        location.href = needsOnboarding ? '/onboarding.html' : location.pathname + location.search;
      } catch (error) {
        window.alert(error.message || 'Не удалось переключить курс.');
        select.disabled = false;
        const current = courses.find(item => item.is_active);
        if (current) select.value = current.course_id || current.language_code;
      }
    });
  }

  if (user) {
    window.QEActiveLanguage = user.language_code || 'en';
    const lang = document.documentElement.lang;
    accountLink.href = '/account.html';
    accountLink.textContent = lang === 'en' ? 'My account' : 'Мой аккаунт';
    const logout = document.createElement('button');
    logout.type = 'button';
    logout.className = 'nav-logout';
    logout.textContent = lang === 'en' ? 'Sign out' : 'Выйти';
    logout.addEventListener('click', async () => {
      logout.disabled = true;
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        });
      } finally {
        location.href = '/';
      }
    });
    accountLink.parentElement?.appendChild(logout);
    await addCourseSwitcher(true);
    return;
  }

  if (window.QEDemo?.isActive()) {
    window.QEActiveLanguage = window.QEDemo.getActiveLanguage?.() || 'en';
    const lang = document.documentElement.lang;
    accountLink.href = '/plan.html';
    accountLink.textContent = lang === 'en' ? 'Demo Learner' : 'Демо-профиль';
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'nav-logout';
    reset.textContent = lang === 'en' ? 'Reset demo' : 'Сбросить демо';
    reset.addEventListener('click', () => {
      const confirmText = lang === 'en'
        ? 'Clear the demo profile and all progress stored in this browser?'
        : 'Очистить демо-профиль и весь прогресс, сохранённый в этом браузере?';
      if (window.confirm(confirmText)) window.QEDemo.reset();
    });
    accountLink.parentElement?.appendChild(reset);

    const header = document.querySelector('.topbar');
    await addCourseSwitcher(false);
    if (header && !document.querySelector('.demo-notice')) {
      const notice = document.createElement('div');
      notice.className = 'demo-notice wrap';
      notice.textContent = lang === 'en'
        ? 'GUEST DEMO · Learning progress is saved only in this browser. No account or email is required.'
        : 'ГОСТЕВОЕ ДЕМО · Учебный прогресс сохраняется только в этом браузере. Аккаунт и email не нужны.';
      header.insertAdjacentElement('afterend', notice);
    }
    return;
  }

  accountLink.href = '/onboarding.html?demo=1';
  accountLink.textContent = document.documentElement.lang === 'en' ? 'Try without account' : 'Попробовать без аккаунта';
})();
