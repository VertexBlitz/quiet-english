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

  resources.push(
    {
      title:'AVE Global · Español',titleEn:'AVE Global · Spanish',
      level:'A1',topic:'study',provider:'Instituto Cervantes',
      kind:'Demo · vídeos · ejercicios',kindEn:'Demo · videos · exercises',
      url:'https://ave.cervantes.es/pruebe-los-cursos-de-espanol-en-linea-ave-global',
      description:'Демо-практика испанского с материалами разных уровней CEFR.',
      descriptionEn:'Spanish course demo with activities across CEFR level bands.',
      language:'es'
    },
    {
      title:'Apprendre le français · TV5MONDE',titleEn:'Learn French · TV5MONDE',
      level:'A1',topic:'study',provider:'TV5MONDE',
      kind:'A1–B2 · vidéos · compréhension orale',kindEn:'A1–B2 · videos · listening comprehension',
      url:'https://apprendre.tv5monde.com/en',
      description:'Бесплатные упражнения по французскому на основе видео; внешняя библиотека охватывает A1–B2.',
      descriptionEn:'Free French video-based exercises; the external library covers A1–B2.',
      language:'fr'
    },
    {
      title:'L’italiano online',titleEn:'Italian online learning resources',
      level:'A1',topic:'study',provider:'CPIA Roma',
      kind:'A1–C2 · corsi · ascolto',kindEn:'A1–C2 · courses · listening',
      url:'https://www.cpia4lazio.edu.it/scheda-didattica/litaliano-online/',
      description:'Подборка итальянских курсов и упражнений, включая материалы Loescher для разных уровней.',
      descriptionEn:'A directory of Italian courses and exercises, including Loescher resources for different levels.',
      language:'it'
    },
    {
      title:'Plataforma de Português Online',titleEn:'Portuguese Online Platform',
      level:'A1',topic:'daily',provider:'AIMA',
      kind:'Áudio · vídeo · vocabulário',kindEn:'Audio · video · vocabulary',
      url:'https://aima.gov.pt/pt/lingua-portuguesa/plataforma-de-portugues-online',
      description:'Бесплатная платформа европейского португальского с текстом, аудио и видео; представлены уровни A и B.',
      descriptionEn:'A free European Portuguese platform with text, audio and video; it offers levels A and B.',
      language:'pt'
    },
    {
      title:'Kurse und Übungen · Polski',titleEn:'Polish courses and exercises',
      level:'A1',topic:'study',provider:'Freie Universität Berlin',
      kind:'A1–C1 · аудио · задания',kindEn:'A1–C1 · audio · exercises',
      url:'https://www.sprachenzentrum.fu-berlin.de/slz/sprachen-links/polnisch/kurse_und_uebungen/index.html',
      description:'Подборка учебных материалов по польскому: от начального уровня до продвинутых, включая аудио A1–A2.',
      descriptionEn:'A directory of Polish learning materials from beginner to advanced, including A1–A2 audio.',
      language:'pl'
    },
    {
      title:'Easy Japanese · NHK WORLD',titleEn:'Easy Japanese · NHK WORLD',
      level:'A1',topic:'daily',provider:'NHK WORLD-JAPAN',
      kind:'Аудио · текст · диалоги',kindEn:'Audio · text · dialogues',
      url:'https://www.nhk.or.jp/lesson/',
      description:'Бесплатные аудиоуроки японского для начального уровня с диалогами и текстом.',
      descriptionEn:'Free beginner Japanese audio lessons with dialogues and accompanying text.',
      language:'ja'
    }
  );


  // Additional audio and course resources from established providers.
  resources.push(
    {title:'Podcasts in Spanish · niveles 1–3',titleEn:'Podcasts in Spanish · levels 1–3',level:'A2',levels:['A2','B1','B2','C1'],topic:'podcast',provider:'Podcasts in Spanish',kind:'Podcasts · conversaciones · niveles',kindEn:'Podcasts · conversations · levels',url:'https://www.podcastsinspanish.org/',description:'Подкасты с естественными диалогами и уровнями от начального до продвинутого.',descriptionEn:'Podcasts with natural conversations and beginner-to-advanced level bands.',language:'es'},
    {title:'AVE Global · cursos de español',titleEn:'AVE Global · Spanish courses',level:'A1',levels:['A1','A2','B1','B2','C1'],topic:'study',provider:'Instituto Cervantes',kind:'Vídeos · ejercicios · A1–C1',kindEn:'Videos · exercises · A1–C1',url:'https://pro.cervantes.es/es/atenas/aprender-espanol/cursos-espanol-linea-ave',description:'Курсы Instituto Cervantes с видео и интерактивными заданиями по уровням A1–C1.',descriptionEn:'Instituto Cervantes courses with videos and interactive activities from A1 to C1.',language:'es'},
    {title:'Première classe · français',titleEn:'Première classe · French',level:'A1',levels:['A1'],topic:'daily',provider:'TV5MONDE',kind:'Vidéos · exercices débutants',kindEn:'Videos · beginner exercises',url:'https://apprendre.tv5monde.com/en/exercices/premiere-classe',description:'Бесплатная серия видеоуроков и упражнений для начинающих.',descriptionEn:'A free collection of beginner video lessons and exercises.',language:'fr'},
    {title:'Italiano per stranieri',titleEn:'Italian for learners',level:'A1',levels:['A1','A2','B1','B2'],topic:'study',provider:'RAI Scuola',kind:'Percorsi · video · ascolto',kindEn:'Courses · video · listening',url:'https://www.raiscuola.rai.it/italianoperstranieri',description:'Учебные курсы итальянского с материалами по уровням A1–B2.',descriptionEn:'Italian learning courses and materials organised across A1–B2.',language:'it'},
    {title:'Voci d’Italia · podcast',titleEn:'Voci d’Italia · podcast',level:'B1',levels:['B1','B2','C1','C2'],topic:'podcast',provider:'Loescher',kind:'Podcast · conversazioni autentiche',kindEn:'Podcast · authentic conversations',url:'https://italianoperstranieri.loescher.it/',description:'Подкасты с естественной итальянской речью для тренировки понимания на слух.',descriptionEn:'Podcasts featuring authentic Italian speech for listening practice.',language:'it'},
    {title:'Podcasts · RTP Ensina',titleEn:'Podcasts · RTP Ensina',level:'B1',levels:['B1','B2','C1','C2'],topic:'podcast',provider:'RTP Ensina',kind:'Podcasts · temas educativos',kindEn:'Podcasts · educational topics',url:'https://ensina.rtp.pt/podcasts/',description:'Подкасты общественного вещателя Португалии, посвящённые образовательным темам.',descriptionEn:'Podcasts from Portugal’s public broadcaster on educational topics.',language:'pt'},
    {title:'Na Ponta da Língua · podcast',titleEn:'Na Ponta da Língua · podcast',level:'B1',levels:['B1','B2','C1','C2'],topic:'podcast',provider:'Antena 1 · RTP',kind:'Podcast · língua portuguesa',kindEn:'Podcast · Portuguese language',url:'https://antena1.rtp.pt/podcast/na-ponta-da-lingua/',description:'Короткие выпуски о языке, словоупотреблении и тонкостях португальской речи.',descriptionEn:'Short episodes about language, usage and nuances of Portuguese.',language:'pt'},
    {title:'Materiały audio · język polski',titleEn:'Polish learning materials · audio',level:'A1',levels:['A1','A2','B1'],topic:'study',provider:'Urząd do Spraw Cudzoziemców',kind:'Audio · podręczniki · ćwiczenia',kindEn:'Audio · textbooks · exercises',url:'https://www.gov.pl/web/udsc-en/materialy-dydaktyczne-do-nauki-jezyka-polskiego---dla-doroslych',description:'Бесплатные материалы для изучающих польский, включая аудиофайлы и учебные пособия.',descriptionEn:'Free Polish-learning materials, including audio files and course books.',language:'pl'},
    {title:'Audio lessons · Easy Japanese',titleEn:'Audio lessons · Easy Japanese',level:'A1',levels:['A1','A2'],topic:'daily',provider:'Japan Foundation',kind:'Audio lessons · 48 lessons',kindEn:'Audio lessons · 48 lessons',url:'https://www.la.jpf.go.jp/jle-learners-resources',description:'Подборка аудиоуроков японского, включая серию Easy Japanese из 48 занятий.',descriptionEn:'A curated set of Japanese audio lessons, including the 48-lesson Easy Japanese series.',language:'ja'}
  );

  const grid = listeningRoot.querySelector('[data-listening-grid]');
  const levelFilter = listeningRoot.querySelector('[data-level-filter]');
  const topicFilter = listeningRoot.querySelector('[data-topic-filter]');
  const count = listeningRoot.querySelector('[data-library-count]');
  const language = () => document.documentElement.lang === 'en' ? 'en' : 'ru';
  let activeStudyLanguageCode = 'en';
  const languageSpeechLabels = { en:['английскую речь','English'],de:['немецкую речь','German'],es:['испанскую речь','Spanish'],fr:['французскую речь','French'],it:['итальянскую речь','Italian'],pt:['португальскую речь','Portuguese'],pl:['польскую речь','Polish'],ja:['японскую речь','Japanese'] };

  function render() {
    const level = levelFilter.value;
    const topic = topicFilter.value;
    const lang = language();
    const speechLabel = languageSpeechLabels[activeStudyLanguageCode] || languageSpeechLabels.en;
    const titleNode = listeningRoot.querySelector('[data-listening-title]');
    const descriptionNode = listeningRoot.querySelector('[data-listening-description]');
    if (titleNode) titleNode.textContent = lang === 'en' ? 'Listen to ' + speechLabel[1] + '.' : 'Слушай ' + speechLabel[0] + '.';
    if (descriptionNode) descriptionNode.textContent = lang === 'en'
      ? 'Build listening confidence in ' + speechLabel[1] + '. Use level-matched practice and carefully selected external audio resources.'
      : 'Тренируй понимание устной речи на изучаемом языке. Используй упражнения своего уровня и подобранные аудиоматериалы.';
    const matching = resources.filter(item =>
      item.language === activeStudyLanguageCode &&
      (level === 'all' || item.level === level || (Array.isArray(item.levels) && item.levels.includes(level))) &&
      (topic === 'all' || item.topic === topic)
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
      meta.textContent = (item.levels ? item.levels[0] + '–' + item.levels[item.levels.length - 1] : item.level) + ' · ' + item.provider;
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
      if (active && /^[a-z]{2}$/.test(String(active.language_code).trim())) {
        activeStudyLanguageCode = String(active.language_code).trim();
      }
    } catch {}
    [...levelFilter.options].forEach(option => { option.disabled = false; });
    levelFilter.value = 'all';
    render();
  }
  void loadStudyLanguage();
  window.addEventListener('quietenglish:languagechange', () => { void loadStudyLanguage(); });
}
