const listeningRoot = document.querySelector('[data-listening-page]');
if (listeningRoot) {
  const resources = [
    {title:'A1 listening collection',titleEn:'A1 listening collection',level:'A1',topic:'daily',provider:'British Council',kind:'Lessons · audio · transcript',kindEn:'Lessons · audio · transcript',url:'https://learnenglish.britishcouncil.org/free-resources/listening/a1',description:'Короткие задания на понимание простой речи.',descriptionEn:'Short activities for understanding simple speech.'},
    {title:'Booking a table',titleEn:'Booking a table',level:'A1',topic:'daily',provider:'British Council',kind:'Dialogue · everyday English',kindEn:'Dialogue · everyday English',url:'https://learnenglish.britishcouncil.org/free-resources/listening/a1/booking-table',description:'Диалог о бронировании столика.',descriptionEn:'A dialogue about booking a table.'},
    {title:'Meeting a new team member',titleEn:'Meeting a new team member',level:'A1',topic:'study',provider:'British Council',kind:'Dialogue · introductions',kindEn:'Dialogue · introductions',url:'https://learnenglish.britishcouncil.org/free-resources/listening/a1/meeting-new-team-member',description:'Знакомство с новым коллегой и простые вопросы.',descriptionEn:'Meeting a new colleague and asking simple questions.'},
    {title:'A2 listening collection',titleEn:'A2 listening collection',level:'A2',topic:'daily',provider:'British Council',kind:'Lessons · audio · tasks',kindEn:'Lessons · audio · tasks',url:'https://learnenglish.britishcouncil.org/free-resources/listening/a2',description:'Повседневные разговоры и практические ситуации.',descriptionEn:'Everyday conversations and practical situations.'},
    {title:'Changing plans',titleEn:'Changing plans',level:'A2',topic:'daily',provider:'British Council',kind:'Dialogue · plans',kindEn:'Dialogue · plans',url:'https://learnenglish.britishcouncil.org/free-resources/listening/a2/changing-plans',description:'Как объяснять изменения в планах.',descriptionEn:'How to explain changes to your plans.'},
    {title:'B1 listening collection',titleEn:'B1 listening collection',level:'B1',topic:'study',provider:'British Council',kind:'Lessons · audio · transcript',kindEn:'Lessons · audio · transcript',url:'https://learnenglish.britishcouncil.org/free-resources/listening/b1',description:'Более длинные диалоги и разговорные темы.',descriptionEn:'Longer dialogues and conversational topics.'},
    {title:'A student discussion',titleEn:'A student discussion',level:'B1',topic:'study',provider:'British Council',kind:'Discussion · study',kindEn:'Discussion · study',url:'https://learnenglish.britishcouncil.org/free-resources/listening/b1/student-discussion',description:'Разговор студентов о занятиях и проектах.',descriptionEn:'Students discussing classes and projects.'},
    {title:'B2 listening collection',titleEn:'B2 listening collection',level:'B2',topic:'culture',provider:'British Council',kind:'Lessons · natural speech',kindEn:'Lessons · natural speech',url:'https://learnenglish.britishcouncil.org/free-resources/listening/b2',description:'Более сложные разговоры и разные акценты.',descriptionEn:'More challenging conversations and different accents.'},
    {title:'A digital detox podcast',titleEn:'A digital detox podcast',level:'B2',topic:'podcast',provider:'British Council',kind:'Podcast · technology',kindEn:'Podcast · technology',url:'https://learnenglish.britishcouncil.org/free-resources/listening/b2/digital-detox-podcast',description:'Подкаст об использовании цифровых устройств.',descriptionEn:'A podcast about the use of digital devices.'},
    {title:'Audio series',titleEn:'Audio series',level:'B1',topic:'podcast',provider:'British Council',kind:'Audio fiction · episodes',kindEn:'Audio fiction · episodes',url:'https://learnenglish.britishcouncil.org/free-resources/general/audio-series',description:'Сюжетные аудиосерии для регулярной практики.',descriptionEn:'Story-based audio series for regular practice.'},
    {title:'ELLLO A1',titleEn:'ELLLO A1',level:'A1',topic:'daily',provider:'ELLLO',kind:'Audio · transcript · quiz',kindEn:'Audio · transcript · quiz',url:'https://elllo.org/levels/A1-English-Lessons/index.html',description:'Начальный уровень: короткие разговоры и задания.',descriptionEn:'Beginner level: short conversations and activities.'},
    {title:'ELLLO A2',titleEn:'ELLLO A2',level:'A2',topic:'travel',provider:'ELLLO',kind:'Audio · video · quiz',kindEn:'Audio · video · quiz',url:'https://elllo.org/levels/A2-English-Lessons/index.html',description:'Повседневные ситуации и знакомые темы.',descriptionEn:'Everyday situations and familiar topics.'},
    {title:'ELLLO B1',titleEn:'ELLLO B1',level:'B1',topic:'culture',provider:'ELLLO',kind:'Interviews · audio · quiz',kindEn:'Interviews · audio · quiz',url:'https://elllo.org/levels/B1-English-Lessons/index.html',description:'Интервью и мнения говорящих из разных стран.',descriptionEn:'Interviews and opinions from speakers around the world.'},
    {title:'ELLLO B2',titleEn:'ELLLO B2',level:'B2',topic:'culture',provider:'ELLLO',kind:'Conversations · natural speed',kindEn:'Conversations · natural speed',url:'https://elllo.org/levels/B2-English-Lessons/index.html',description:'Разговорная речь на более высоком уровне.',descriptionEn:'Natural conversations at a higher level.'},
    {title:'ELLLO C1',titleEn:'ELLLO C1',level:'C1',topic:'podcast',provider:'ELLLO',kind:'Advanced listening',kindEn:'Advanced listening',url:'https://elllo.org/levels/C1-English-Lessons/index.html',description:'Продвинутые темы и насыщенная естественная речь.',descriptionEn:'Advanced topics and richer natural speech.'}
  ];

  resources.forEach(item => { item.language = 'en'; });
  resources.push(
    {
      title:'Nicos Weg · A1–B1',titleEn:'Nicos Weg · A1–B1',
      level:'A1',topic:'daily',provider:'Deutsche Welle',
      kind:'Video course · dialogues · exercises',kindEn:'Video course · dialogues · exercises',
      url:'https://learngerman.dw.com/',
      description:'Видеокурс немецкого с диалогами и упражнениями для уровней A1–B1.',
      descriptionEn:'A German video course with dialogues and exercises for A1–B1 learners.',
      language:'de'
    },
    {
      title:'VHS-Lernportal · Deutsch',titleEn:'VHS-Lernportal · German',
      level:'A1',topic:'study',provider:'VHS-Lernportal',
      kind:'Structured course · exercises',kindEn:'Structured course · exercises',
      url:'https://deutsch.vhs-lernportal.de/',
      description:'Бесплатная учебная платформа с курсами немецкого и интерактивными упражнениями.',
      descriptionEn:'A free learning platform with structured German courses and interactive exercises.',
      language:'de'
    }
  );

  const grid = listeningRoot.querySelector('[data-listening-grid]');
  const levelFilter = listeningRoot.querySelector('[data-level-filter]');
  const topicFilter = listeningRoot.querySelector('[data-topic-filter]');
  const count = listeningRoot.querySelector('[data-library-count]');
  const language = () => document.documentElement.lang === 'en' ? 'en' : 'ru';
  let activeStudyLanguageCode = 'en';

  function render() {
    const level = levelFilter.value;
    const topic = topicFilter.value;
    const lang = language();
    const matching = resources.filter(item =>
      item.language === activeStudyLanguageCode &&
      (level === 'all' || item.level === level) && (topic === 'all' || item.topic === topic)
    );
    grid.replaceChildren();
    count.textContent = lang === 'en' ? matching.length + ' resources' : matching.length + ' материалов';
    if (!matching.length) {
      const empty = document.createElement('p');
      empty.className = 'fine-print';
      empty.textContent = lang === 'en' ? 'No resources match these filters.' : 'По выбранным фильтрам материалов нет.';
      grid.append(empty);
      return;
    }
    matching.forEach(item => {
      const card = document.createElement('article');
      card.className = 'listening-card';
      const meta = document.createElement('p');
      meta.className = 'eyebrow';
      meta.textContent = item.level + ' · ' + item.provider;
      const title = document.createElement('h3');
      title.textContent = lang === 'en' ? item.titleEn : item.title;
      const description = document.createElement('p');
      description.textContent = lang === 'en' ? item.descriptionEn : item.description;
      const kind = document.createElement('span');
      kind.className = 'listening-kind';
      kind.textContent = lang === 'en' ? item.kindEn : item.kind;
      const link = document.createElement('a');
      link.className = 'text-link';
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = lang === 'en' ? 'Open resource ↗' : 'Открыть материал ↗';
      card.append(meta, title, description, kind, link);
      grid.append(card);
    });
  }
  levelFilter.addEventListener('change', render);
  topicFilter.addEventListener('change', render);
  window.addEventListener('quietenglish:languagechange', render);
  async function loadStudyLanguage() {
    try {
      const response = await fetch('/api/learning/languages', { credentials:'same-origin' });
      const data = await response.json().catch(() => ({}));
      const active = Array.isArray(data.languages) ? data.languages.find(item => item.is_active) : null;
      if (active && ['en','de'].includes(String(active.language_code).trim())) {
        activeStudyLanguageCode = String(active.language_code).trim();
      }
    } catch {}
    if (activeStudyLanguageCode === 'de') {
      [...levelFilter.options].forEach(option => {
        option.disabled = !['all','A1','A2'].includes(option.value);
      });
      levelFilter.value = 'all';
    }
    render();
  }
  void loadStudyLanguage();
}
