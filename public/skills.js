(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const tabs = [...document.querySelectorAll('[data-skill]')];
  const list = $('[data-skill-list]');
  const workspace = $('[data-skill-workspace]');
  const statusSummary = $('[data-skill-summary]');
  const status = $('[data-task-status]');
  const resultBox = $('[data-task-result]');
  const taskContent = $('[data-task-content]');
  let currentSkill = 'listening';
  let currentTask = null;
  let startedAt = 0;
  let recognition = null;
  let finalTranscript = '';
  let demoMode = false;
  let currentLanguage = 'en';
  let speechLocale = 'en-GB';

  const tasks = {
    listening: [
      {
        id: 'listen_cafe_01', level: 'A2', duration: 5,
        title: 'At a café',
        description: 'Пойми заказ и уточни, что покупатель попросил взять с собой.',
        transcript: 'Good morning. What can I get for you? Hello. I would like a cup of tea and a cheese sandwich, please. Certainly. Would you like to eat here or take it away? To take away, please. No problem. That will be six pounds fifty.',
        questions: [
          { prompt: 'What does the customer order?', choices: ['Coffee and cake', 'Tea and a cheese sandwich', 'Juice and a salad'], answer: 1, explanation: 'The customer asks for tea and a cheese sandwich.' },
          { prompt: 'Where will the customer eat?', choices: ['At a table', 'Outside the café', 'Take the order away'], answer: 2, explanation: 'The customer says: “To take away, please.”' }
        ]
      },
      {
        id: 'listen_station_01', level: 'B1', duration: 6,
        title: 'At the station',
        description: 'Прослушай объявление и найди время отправления и причину задержки.',
        transcript: 'Attention, please. The ten fifteen train to Cambridge is delayed by twenty minutes because of a signal problem. It will now leave from platform four at ten thirty five. Passengers should keep their tickets and listen for further announcements. We apologise for the inconvenience.',
        questions: [
          { prompt: 'What time will the train now leave?', choices: ['10:15', '10:25', '10:35'], answer: 2, explanation: 'The announcement gives the new departure time as 10:35.' },
          { prompt: 'Why is the train delayed?', choices: ['A signal problem', 'Bad weather', 'A platform change'], answer: 0, explanation: 'The announcement mentions a signal problem.' }
        ]
      },
      {
        id: 'listen_weekend_01', level: 'A2–B1', duration: 5,
        title: 'Weekend plans',
        description: 'Пойми, какие планы изменились и что друзья решили сделать.',
        transcript: 'Are you still going cycling on Saturday, Mia? I wanted to, but the weather forecast says it will rain all day. So what about the museum? That sounds good. It opens at eleven, and there is a new photography exhibition. Great. Let us meet at the entrance at half past ten and get some lunch afterwards.',
        questions: [
          { prompt: 'Why did Mia change her original plan?', choices: ['She is busy with work', 'It is expected to rain', 'Her bicycle is broken'], answer: 1, explanation: 'Mia changes the plan because rain is expected.' },
          { prompt: 'Where will they meet?', choices: ['At the museum entrance', 'At a café', 'At the railway station'], answer: 0, explanation: 'They agree to meet at the museum entrance.' }
        ]
      }
    ],
    writing: [
      {
        id: 'write_invitation_01', level: 'A2', duration: 8, title: 'An invitation email',
        description: 'Напиши короткое письмо другу с приглашением на мероприятие.',
        prompt: 'Your town is organising a weekend cultural festival. Write an email to a friend inviting them to go with you. Mention what they can see or do, when you want to meet, and why you think they will enjoy it.',
        minWords: 70, maxWords: 100,
        checklist: ['Use a friendly greeting and closing.', 'Include the time and meeting place.', 'Give at least one reason for your invitation.']
      },
      {
        id: 'write_opinion_01', level: 'B1', duration: 10, title: 'Give your opinion',
        description: 'Сформулируй мнение и подкрепи его аргументами.',
        prompt: 'Some people think that online courses are more convenient than classroom lessons. Do you agree or disagree? Write a short opinion text with two reasons and an example.',
        minWords: 100, maxWords: 130,
        checklist: ['State your opinion clearly.', 'Use linking words such as because, however and for example.', 'Finish with a short conclusion.']
      },
      {
        id: 'write_summary_01', level: 'B1', duration: 10, title: 'A short review',
        description: 'Напиши отзыв о книге, фильме или выставке, которую ты знаешь.',
        prompt: 'Write a short review of a book, film or exhibition you know. Describe its main idea without retelling every detail, say what you found interesting, and explain who might enjoy it.',
        minWords: 100, maxWords: 140,
        checklist: ['Introduce the work and its main idea.', 'Give an example to support your opinion.', 'Use descriptive vocabulary and a clear recommendation.']
      }
    ],
    speaking: [
      {
        id: 'speak_hobby_01', level: 'A2', duration: 3, title: 'Talk about a hobby',
        description: 'Расскажи о занятии, которое тебе нравится.',
        prompt: 'Talk for 45–60 seconds about an activity you enjoy. Say what it is, when you do it, how you started, and why you like it.',
        tips: ['Try to speak in complete sentences.', 'Use the present simple and one past-tense sentence.', 'Add a reason with because.']
      },
      {
        id: 'speak_place_01', level: 'A2–B1', duration: 3, title: 'Describe a place',
        description: 'Опиши место, которое тебе нравится. Не называй точный адрес.',
        prompt: 'Describe a public place you enjoy visiting, such as a park, library or museum. Explain what people can do there and why you like it.',
        tips: ['Use adjectives to describe the place.', 'Mention two things people can do there.', 'Explain your opinion.']
      },
      {
        id: 'speak_technology_01', level: 'B1', duration: 4, title: 'Technology and learning',
        description: 'Выскажи мнение и приведи пример.',
        prompt: 'Do you think technology makes learning easier? Give your opinion, one advantage, one possible disadvantage, and a short example.',
        tips: ['Start with “In my opinion…”.', 'Use however to introduce a different side.', 'Finish with a clear conclusion.']
      }
    ]
  };

  const germanTasks = {
    listening: [
      {
        id: 'de_listen_cafe_01', level: 'A1', duration: 5, title: 'Im Café',
        description: 'Verstehe eine einfache Bestellung und die Rückfrage.',
        transcript: 'Guten Morgen! Was darf es sein? Ich möchte einen Tee und ein Käsebrötchen, bitte. Möchten Sie hier essen oder zum Mitnehmen? Zum Mitnehmen, bitte. Das macht zusammen sechs Euro.',
        questions: [
          { prompt: 'Was bestellt die Person?', choices: ['Einen Kaffee und Kuchen', 'Einen Tee und ein Käsebrötchen', 'Eine Suppe und Wasser'], answer: 1, explanation: 'Die Person bestellt einen Tee und ein Käsebrötchen.' },
          { prompt: 'Möchte die Person hier essen?', choices: ['Ja, hier im Café', 'Nein, zum Mitnehmen', 'Das wird nicht gesagt'], answer: 1, explanation: 'Die Person sagt: „Zum Mitnehmen, bitte.“' }
        ]
      },
      {
        id: 'de_listen_station_01', level: 'A2', duration: 6, title: 'Am Bahnhof',
        description: 'Verstehe eine Durchsage zu einer Zugverspätung.',
        transcript: 'Achtung auf Gleis drei. Der Zug nach München hat heute zehn Minuten Verspätung. Er fährt voraussichtlich um neun Uhr vierzig ab. Bitte achten Sie auf weitere Informationen auf den Anzeigetafeln.',
        questions: [
          { prompt: 'Wie lange hat der Zug Verspätung?', choices: ['Fünf Minuten', 'Zehn Minuten', 'Zwanzig Minuten'], answer: 1, explanation: 'Die Durchsage nennt zehn Minuten Verspätung.' },
          { prompt: 'Wohin fährt der Zug?', choices: ['Nach München', 'Nach Berlin', 'Nach Hamburg'], answer: 0, explanation: 'Der Zug fährt nach München.' }
        ]
      },
      {
        id: 'de_listen_weekend_01', level: 'B1', duration: 6, title: 'Pläne fürs Wochenende',
        description: 'Erkenne, warum Freunde ihre Pläne ändern.',
        transcript: 'Wollen wir am Samstag wandern gehen? Eigentlich gern, aber der Wetterbericht sagt starken Regen voraus. Wie wäre es stattdessen mit einem Besuch im Museum? Gute Idee. Dort gibt es eine neue Ausstellung zur Stadtgeschichte. Treffen wir uns um elf Uhr vor dem Eingang?',
        questions: [
          { prompt: 'Warum ändern sie ihre Pläne?', choices: ['Das Wetter wird schlecht', 'Das Museum ist geschlossen', 'Eine Person muss arbeiten'], answer: 0, explanation: 'Wegen des angekündigten Regens möchten sie nicht wandern.' },
          { prompt: 'Wann treffen sie sich?', choices: ['Um zehn Uhr', 'Um elf Uhr', 'Um zwölf Uhr'], answer: 1, explanation: 'Sie verabreden sich für elf Uhr.' }
        ]
      }
    ],
    writing: [
      {
        id: 'de_write_invitation_01', level: 'A2', duration: 8, title: 'Eine Einladung schreiben',
        description: 'Schreibe eine kurze Nachricht und lade eine Person zu einer Veranstaltung ein.',
        prompt: 'In deiner Stadt findet am Wochenende ein Kulturfest statt. Schreibe einer Freundin oder einem Freund eine Nachricht. Erzähle, was es dort gibt, wann ihr euch treffen könnt und warum du die Veranstaltung interessant findest.',
        minWords: 50, maxWords: 80,
        checklist: ['Beginne mit einer passenden Anrede.', 'Nenne Zeit und Treffpunkt.', 'Erkläre kurz, warum du die Person einlädst.']
      },
      {
        id: 'de_write_opinion_01', level: 'B1', duration: 10, title: 'Eine Meinung begründen',
        description: 'Formuliere deine Meinung und unterstütze sie mit Argumenten.',
        prompt: 'Viele Menschen lernen heute online. Findest du Online-Unterricht besser als Unterricht im Klassenzimmer? Schreibe einen kurzen Text mit deiner Meinung, zwei Gründen und einem Beispiel.',
        minWords: 80, maxWords: 120,
        checklist: ['Formuliere deine Meinung klar.', 'Verwende Konnektoren wie weil, obwohl und außerdem.', 'Beende den Text mit einem kurzen Fazit.']
      },
      {
        id: 'de_write_summary_01', level: 'B2', duration: 10, title: 'Eine kurze Zusammenfassung',
        description: 'Fasse einen Standpunkt sachlich zusammen und bewerte ihn.',
        prompt: 'Schreibe eine kurze Stellungnahme zur Frage, ob öffentliche Verkehrsmittel in Städten stärker gefördert werden sollten. Nenne Vorteile, mögliche Schwierigkeiten und ein begründetes Fazit.',
        minWords: 110, maxWords: 150,
        checklist: ['Strukturiere den Text in Einleitung, Argumente und Fazit.', 'Nutze präzise Konnektoren.', 'Vermeide Wiederholungen und umgangssprachliche Formulierungen.']
      }
    ],
    speaking: [
      {
        id: 'de_speak_hobby_01', level: 'A1', duration: 3, title: 'Über dich und deine Hobbys sprechen',
        description: 'Stelle dich kurz vor und erzähle von einer Freizeitaktivität.',
        prompt: 'Stelle dich kurz vor. Erzähle, was du gern in deiner Freizeit machst, wann du dein Hobby ausübst und warum es dir gefällt.',
        tips: ['Beginne mit „Ich heiße …“.', 'Verwende „gern“ und „am Wochenende“.', 'Bilde kurze vollständige Sätze.']
      },
      {
        id: 'de_speak_place_01', level: 'A2', duration: 3, title: 'Einen Ort beschreiben',
        description: 'Beschreibe einen öffentlichen Ort, den du gern besuchst.',
        prompt: 'Beschreibe einen Ort in deiner Stadt, den du gern besuchst. Erkläre, was man dort machen kann und warum du diesen Ort magst.',
        tips: ['Nutze passende Adjektive.', 'Erwähne zwei Aktivitäten.', 'Begründe deine Meinung mit „weil“.']
      },
      {
        id: 'de_speak_technology_01', level: 'B1', duration: 4, title: 'Technologie und Lernen',
        description: 'Äußere deine Meinung und nenne ein Beispiel.',
        prompt: 'Macht Technologie das Lernen einfacher? Nenne deine Meinung, einen Vorteil, einen möglichen Nachteil und ein Beispiel.',
        tips: ['Beginne mit „Meiner Meinung nach …“.', 'Nutze „einerseits“ und „andererseits“.', 'Schließe mit einem kurzen Fazit.']
      }
    ],
    pronunciation: [
      {
        id: 'de_pronunciation_01', level: 'A1', duration: 4, title: 'Umlaute und lange Vokale',
        description: 'Lies einen kurzen Satz laut vor und vergleiche die Spracherkennung mit dem Ausgangstext.',
        target: 'Fünf schöne Bücher stehen über dem grünen Tisch.',
        prompt: 'Fünf schöne Bücher stehen über dem grünen Tisch.',
        tips: ['Achte auf ö in schöne und ü in Bücher.', 'Sprich jedes Wort deutlich.', 'Höre dir zuerst das Modell an.']
      }
    ]
  };

  const words = value => (value.trim().match(/\S+/g) || []).length;
  const safeText = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[char]);

  function setStatus(message, kind = '') {
    status.textContent = message;
    status.className = 'skill-status' + (kind ? ' ' + kind : '');
  }

  function renderList() {
    list.replaceChildren();
    const rows = tasks[currentSkill];
    rows.forEach(task => {
      const card = document.createElement('article');
      card.className = 'skill-task';
      const meta = document.createElement('p');
      meta.className = 'eyebrow';
      meta.textContent = task.level + ' · ' + task.duration + ' min';
      const title = document.createElement('h3');
      title.textContent = task.title;
      const description = document.createElement('p');
      description.textContent = task.description;
      const button = document.createElement('button');
      button.className = 'button';
      button.type = 'button';
      button.textContent = currentSkill === 'listening' ? 'Начать слушать ↗' : currentSkill === 'writing' ? 'Начать писать ↗' : 'Начать говорить ↗';
      button.addEventListener('click', () => openTask(task));
      card.append(meta, title, description, button);
      list.appendChild(card);
    });
    workspace.hidden = true;
    list.hidden = false;
    statusSummary.textContent = '';
    refreshSummary();
  }

  function chooseSkill(skill) {
    currentSkill = skill;
    tabs.forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.skill === skill)));
    renderList();
  }

  function baseTask(task) {
    currentTask = task;
    startedAt = Date.now();
    resultBox.hidden = true;
    resultBox.textContent = '';
    setStatus('');
    $('[data-task-meta]').textContent = currentTask.level + ' · ' + currentTask.duration + ' мин';
    $('[data-task-title]').textContent = currentTask.title;
    $('[data-task-instructions]').textContent = currentTask.description;
    workspace.hidden = false;
    list.hidden = true;
  }

  function openTask(task) {
    stopRecognition();
    baseTask(task);
    taskContent.replaceChildren();
    if (currentSkill === 'listening') renderListening(task);
    if (currentSkill === 'writing') renderWriting(task);
    if (currentSkill === 'speaking') renderSpeaking(task);
    if (currentSkill === 'pronunciation') renderPronunciation(task);
    workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderListening(task) {
    const intro = document.createElement('p');
    intro.className = 'copy';
    intro.textContent = 'Сначала прослушай текст. Можно повторить запись несколько раз. Вопросы проверят понимание деталей.';
    const toolbar = document.createElement('div');
    toolbar.className = 'skill-toolbar';
    const play = document.createElement('button');
    play.className = 'button';
    play.type = 'button';
    play.textContent = '▶ Прослушать';
    const repeat = document.createElement('button');
    repeat.className = 'button secondary';
    repeat.type = 'button';
    repeat.textContent = '↻ Повторить';
    const rate = document.createElement('select');
    rate.setAttribute('aria-label', 'Скорость озвучивания');
    [['0.85','Медленно'],['1','Обычная'],['1.1','Быстрее']].forEach(([value,label]) => {
      const option=document.createElement('option'); option.value=value; option.textContent=label; rate.appendChild(option);
    });
    const audioMessage = document.createElement('p');
    audioMessage.className = 'skill-status';
    const speak = () => {
      if (!('speechSynthesis' in window)) {
        audioMessage.textContent = 'В этом браузере нет встроенного озвучивания. Открой текст ниже и выполни задание в режиме чтения.';
        transcriptButton.hidden = false;
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(task.transcript);
      utterance.lang = speechLocale;
      utterance.rate = Number(rate.value);
      utterance.onstart = () => { audioMessage.textContent = 'Воспроизводится английский текст…'; };
      utterance.onend = () => { audioMessage.textContent = 'Прослушивание завершено. Можно ответить на вопросы.'; };
      utterance.onerror = () => { audioMessage.textContent = 'Не удалось воспроизвести текст. Попробуй ещё раз или открой расшифровку.'; };
      window.speechSynthesis.speak(utterance);
    };
    play.addEventListener('click', speak);
    repeat.addEventListener('click', speak);
    toolbar.append(play, repeat, rate);
    const transcriptButton = document.createElement('button');
    transcriptButton.type = 'button';
    transcriptButton.className = 'text-link';
    transcriptButton.textContent = 'Показать расшифровку';
    transcriptButton.hidden = 'speechSynthesis' in window;
    const passage = document.createElement('div');
    passage.className = 'skill-passage';
    passage.textContent = task.transcript;
    passage.hidden = true;
    transcriptButton.addEventListener('click', () => {
      passage.hidden = !passage.hidden;
      transcriptButton.textContent = passage.hidden ? 'Показать расшифровку' : 'Скрыть расшифровку';
    });
    const form = document.createElement('form');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const answers = task.questions.map((question, index) => Number(form.elements.namedItem('q' + index)?.value));
      if (answers.some(value => !Number.isInteger(value))) {
        setStatus('Ответь на все вопросы.', 'error-text');
        return;
      }
      const correct = task.questions.filter((question, index) => answers[index] === question.answer).length;
      const score = Math.round(correct / task.questions.length * 100);
      const lines = ['Результат: ' + correct + ' из ' + task.questions.length + ' · ' + score + '%'];
      task.questions.forEach((question, index) => {
        lines.push((index + 1) + '. ' + (answers[index] === question.answer ? 'Верно.' : 'Неверно.') + ' ' + question.explanation);
      });
      resultBox.textContent = lines.join('\n\n');
      resultBox.hidden = false;
      passage.hidden = false;
      transcriptButton.textContent = 'Скрыть расшифровку';
      await recordAttempt({ skill:'listening', task_id:task.id, score, word_count:0 });
      setStatus('Задание завершено. Статистика занятия сохранена без аудиозаписи и ответов.', 'success-text');
      form.querySelector('button[type="submit"]').disabled = true;
    });
    task.questions.forEach((question, index) => {
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'skill-question';
      const legend = document.createElement('legend');
      legend.textContent = (index + 1) + '. ' + question.prompt;
      fieldset.appendChild(legend);
      question.choices.forEach((choice, choiceIndex) => {
        const label = document.createElement('label');
        label.className = 'skill-choice';
        const radio = document.createElement('input');
        radio.type = 'radio'; radio.name = 'q' + index; radio.value = String(choiceIndex); radio.required = true;
        const text = document.createElement('span'); text.textContent = choice;
        label.append(radio, text); fieldset.appendChild(label);
      });
      form.appendChild(fieldset);
    });
    const submit = document.createElement('button');
    submit.className = 'button'; submit.type = 'submit'; submit.textContent = 'Проверить ответы';
    form.appendChild(submit);
    taskContent.append(intro, toolbar, transcriptButton, passage, audioMessage, form);
  }

  function renderWriting(task) {
    const prompt = document.createElement('div');
    prompt.className = 'skill-passage';
    prompt.textContent = task.prompt;
    const checklist = document.createElement('ul');
    task.checklist.forEach(item => { const li=document.createElement('li'); li.textContent=item; checklist.appendChild(li); });
    const label = document.createElement('label');
    label.textContent = 'Твой текст на английском';
    label.style.display = 'block';
    label.style.marginBottom = '8px';
    const textarea = document.createElement('textarea');
    textarea.maxLength = 1000;
    textarea.placeholder = 'Write your answer here…';
    const count = document.createElement('p');
    count.className = 'skill-word-count';
    const updateCount = () => { count.textContent = words(textarea.value) + ' слов · ориентир: ' + task.minWords + '–' + task.maxWords; };
    textarea.addEventListener('input', updateCount);
    updateCount();
    label.appendChild(textarea);
    const submit = document.createElement('button');
    submit.className = 'button'; submit.type = 'button'; submit.textContent = 'Получить проверку AI ↗';
    submit.addEventListener('click', async () => {
      const text = textarea.value.trim();
      if (words(text) < 10) return setStatus('Напиши хотя бы 10 слов, чтобы получить полезную обратную связь.', 'error-text');
      submit.disabled = true;
      setStatus('AI-репетитор проверяет текст…');
      try {
        const feedback = await requestFeedback(task, text, 'writing');
        resultBox.textContent = feedback.message;
        resultBox.hidden = false;
        await recordAttempt({ skill:'writing', task_id:task.id, score:feedback.score, word_count:words(text) });
        setStatus('Проверка завершена. Содержимое текста не сохраняется в учебной статистике.', 'success-text');
      } catch (error) {
        setStatus(error.message, 'error-text');
      } finally { submit.disabled = false; }
    });
    taskContent.append(prompt, checklist, label, count, submit);
  }

  function renderSpeaking(task) {
    const prompt = document.createElement('div');
    prompt.className = 'skill-passage';
    prompt.textContent = task.prompt;
    const tips = document.createElement('ul');
    task.tips.forEach(item => { const li=document.createElement('li'); li.textContent=item; tips.appendChild(li); });
    const voiceStatus = document.createElement('p');
    voiceStatus.className = 'skill-status';
    const toolbar = document.createElement('div');
    toolbar.className = 'skill-toolbar';
    const start = document.createElement('button');
    start.className = 'button'; start.type = 'button'; start.textContent = '🎙 Начать распознавание';
    const stop = document.createElement('button');
    stop.className = 'button secondary'; stop.type = 'button'; stop.textContent = 'Остановить'; stop.disabled = true;
    const text = document.createElement('textarea');
    text.maxLength = 1000;
    text.placeholder = 'Здесь появится распознанная речь. Можно также напечатать ответ вручную…';
    text.setAttribute('aria-label', 'Твой ответ');
    const hasSpeechApi = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    if (!hasSpeechApi) {
      start.disabled = true;
      voiceStatus.textContent = 'В этом браузере голосовое распознавание не поддерживается. Напечатай ответ — задание и проверка доступны в текстовом режиме.';
    } else {
      voiceStatus.textContent = 'Нажми «Начать распознавание» и разреши доступ к микрофону. Можно остановить запись в любой момент.';
    }
    start.addEventListener('click', () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return;
      stopRecognition();
      recognition = new SpeechRecognition();
      recognition.lang = speechLocale;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      finalTranscript = text.value.trim();
      recognition.onresult = event => {
        let interim = '';
        for (let i=event.resultIndex; i<event.results.length; i++) {
          const phrase = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalTranscript += (finalTranscript ? ' ' : '') + phrase;
          else interim += phrase;
        }
        text.value = (finalTranscript + (interim ? ' ' + interim : '')).trim().slice(0,1300);
      };
      recognition.onerror = event => {
        voiceStatus.textContent = event.error === 'not-allowed'
          ? 'Доступ к микрофону не разрешён. Проверь разрешения сайта или напечатай ответ.'
          : 'Распознавание остановлено (' + event.error + '). Можно продолжить текстом.';
        start.disabled = false; stop.disabled = true;
      };
      recognition.onend = () => {
        start.disabled = false; stop.disabled = true;
        voiceStatus.textContent = 'Распознавание завершено. Проверь расшифровку и при необходимости исправь её.';
      };
      try {
        recognition.start();
        start.disabled = true; stop.disabled = false;
        voiceStatus.textContent = 'Слушаю… Говори по-английски.';
      } catch {
        voiceStatus.textContent = 'Не удалось начать распознавание. Попробуй ещё раз или напечатай ответ.';
        start.disabled = false; stop.disabled = true;
      }
    });
    stop.addEventListener('click', stopRecognition);
    const submit = document.createElement('button');
    submit.className = 'button'; submit.type = 'button'; submit.textContent = 'Получить обратную связь ↗';
    submit.addEventListener('click', async () => {
      const answer = text.value.trim();
      if (words(answer) < 8) return setStatus('Нужно не менее 8 слов. Можно ответить голосом или напечатать текст.', 'error-text');
      submit.disabled = true;
      setStatus('AI-репетитор анализирует расшифровку…');
      try {
        stopRecognition();
        const feedback = await requestFeedback(task, answer, 'speaking');
        resultBox.textContent = feedback.message;
        resultBox.hidden = false;
        await recordAttempt({ skill:'speaking', task_id:task.id, score:feedback.score, word_count:words(answer) });
        setStatus('Обратная связь готова. Оценивается текст расшифровки, а не звук или произношение.', 'success-text');
      } catch (error) {
        setStatus(error.message, 'error-text');
      } finally { submit.disabled = false; }
    });
    toolbar.append(start, stop);
    taskContent.append(prompt, tips, toolbar, voiceStatus, text, submit);
  }

  function textSimilarity(expected, actual) {
    const clean = value => value.normalize('NFC').toLocaleLowerCase('de-DE')
      .replace(/[^\\p{L}\\p{N}\\s]/gu, ' ')
      .trim().replace(/\\s+/g, ' ');
    const left = clean(expected);
    const right = clean(actual);
    if (!left) return 0;
    const a = left.split(' ');
    const b = right ? right.split(' ') : [];
    const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i++) {
      let diagonal = previous[0];
      previous[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const above = previous[j];
        previous[j] = Math.min(
          previous[j] + 1,
          previous[j - 1] + 1,
          diagonal + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
        diagonal = above;
      }
    }
    return Math.max(0, Math.round((1 - previous[b.length] / Math.max(a.length, b.length, 1)) * 100));
  }

  function renderPronunciation(task) {
    const target = document.createElement('div');
    target.className = 'skill-passage';
    target.textContent = task.target;

    const note = document.createElement('p');
    note.className = 'skill-status';
    note.textContent = 'Der Vergleich basiert auf der Spracherkennung. Er bewertet nicht direkt die phonetische Qualität oder den Akzent.';

    const toolbar = document.createElement('div');
    toolbar.className = 'skill-toolbar';

    const play = document.createElement('button');
    play.className = 'button secondary';
    play.type = 'button';
    play.textContent = '▶ Modell anhören';
    play.addEventListener('click', () => {
      if (!('speechSynthesis' in window)) {
        setStatus('Die Sprachausgabe wird in diesem Browser nicht unterstützt.', 'error-text');
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(task.target);
      utterance.lang = 'de-DE';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    });

    const start = document.createElement('button');
    start.className = 'button';
    start.type = 'button';
    start.textContent = '🎙 Vorlesen';
    const stop = document.createElement('button');
    stop.className = 'button secondary';
    stop.type = 'button';
    stop.textContent = 'Stopp';
    stop.disabled = true;

    const transcript = document.createElement('textarea');
    transcript.maxLength = 500;
    transcript.placeholder = 'Hier erscheint die erkannte Sprache. Du kannst den Text auch manuell eingeben.';
    transcript.setAttribute('aria-label', 'Erkannter deutscher Text');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      start.disabled = true;
      note.textContent = 'Die Spracherkennung wird in diesem Browser nicht unterstützt. Du kannst den erkannten Text eines anderen Geräts hier eingeben.';
    }

    start.addEventListener('click', () => {
      if (!SpeechRecognition) return;
      stopRecognition();
      recognition = new SpeechRecognition();
      recognition.lang = 'de-DE';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      finalTranscript = '';
      recognition.onresult = event => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const phrase = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalTranscript += (finalTranscript ? ' ' : '') + phrase;
          else interim += phrase;
        }
        transcript.value = (finalTranscript + (interim ? ' ' + interim : '')).trim().slice(0, 500);
      };
      recognition.onerror = event => {
        setStatus(event.error === 'not-allowed'
          ? 'Der Zugriff auf das Mikrofon wurde nicht erlaubt.'
          : 'Die Spracherkennung wurde beendet: ' + event.error, 'error-text');
        start.disabled = false;
        stop.disabled = true;
      };
      recognition.onend = () => {
        start.disabled = false;
        stop.disabled = true;
        voiceStatus.textContent = 'Erkennung beendet. Prüfe den erkannten Text.';
      };
      try {
        recognition.start();
        start.disabled = true;
        stop.disabled = false;
        voiceStatus.textContent = 'Ich höre zu … Lies den Satz auf Deutsch vor.';
      } catch {
        setStatus('Die Spracherkennung konnte nicht gestartet werden.', 'error-text');
      }
    });
    stop.addEventListener('click', stopRecognition);

    const voiceStatus = document.createElement('p');
    voiceStatus.className = 'skill-status';
    voiceStatus.textContent = SpeechRecognition
      ? 'Lies den Satz langsam und deutlich vor oder gib den erkannten Text manuell ein.'
      : 'Manuelle Eingabe ist verfügbar.';

    const submit = document.createElement('button');
    submit.className = 'button';
    submit.type = 'button';
    submit.textContent = 'Text vergleichen und Feedback erhalten ↗';
    submit.addEventListener('click', async () => {
      const answer = transcript.value.trim();
      if (words(answer) < 3) return setStatus('Lies den Satz vor oder gib die erkannte Version ein.', 'error-text');
      submit.disabled = true;
      const match = textSimilarity(task.target, answer);
      setStatus('Die Textübereinstimmung wird berechnet …');
      try {
        const feedback = await requestFeedback(task, answer, 'pronunciation');
        resultBox.textContent = 'Textübereinstimmung: ' + match + '% (keine phonetische Bewertung)\\n\\n' + feedback.message;
        resultBox.hidden = false;
        await recordAttempt({ skill: 'pronunciation', task_id: task.id, score: match, word_count: words(answer) });
        setStatus('Vergleich abgeschlossen. Die Prozentzahl beschreibt nur die Ähnlichkeit des erkannten Textes.', 'success-text');
      } catch (error) {
        setStatus(error.message, 'error-text');
      } finally { submit.disabled = false; }
    });

    toolbar.append(play, start, stop);
    taskContent.append(target, note, toolbar, voiceStatus, transcript, submit);
  }

  function stopRecognition() {
    if (recognition) {
      try { recognition.stop(); } catch {}
      recognition = null;
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  async function requestFeedback(task, answer, skill) {
    const languageName = currentLanguage === 'de' ? 'German' : 'English';
    const taskText = skill === 'writing'
      ? languageName + ' writing task: ' + task.prompt
      : skill === 'pronunciation'
        ? 'German pronunciation practice. Target text: ' + task.target + '. Speech-recognition transcript: ' + answer
        : languageName + ' speaking prompt: ' + task.prompt;
    const directions = [
      'You are an encouraging ' + languageName + ' teacher. Keep feedback age-appropriate and constructive.',
      'Assess task completion, grammar, vocabulary and clarity. Correct up to three important errors with short explanations.',
      'Give one improved version that preserves the learner meaning. End with one practical next step.',
      'Start with exactly: Estimated score: NN/100. The score is approximate and must not be presented as an official CEFR result.',
      skill === 'pronunciation' ? 'For pronunciation practice, compare only the target text with the supplied speech-recognition transcript. Do not claim to assess phonetic accuracy, accent or sound quality from text.' : 'Do not claim to hear audio or assess speech sounds from a text transcript.',
      'Do not ask for or repeat personal contact details.'
    ].join(' ');
    const content = directions + '\n' + taskText + '\nLearner response:\n' + answer.slice(0,1000);
    if (content.length > 1800) throw new Error('Ответ слишком длинный. Сократи текст и отправь ещё раз.');
    const response = await fetch('/api/chat', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role:'user', content }], language_code: currentLanguage })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'AI-репетитор временно недоступен.');
    if (typeof data.message !== 'string' || !data.message.trim()) throw new Error('AI не вернул обратную связь. Попробуй ещё раз.');
    const match = data.message.match(/(?:estimated score|оценка)\s*:\s*(\d{1,3})\s*\/\s*100/i);
    const score = match ? Math.min(100, Number(match[1])) : null;
    return { message:data.message.trim(), score };
  }

  async function recordAttempt({skill, task_id, score, word_count}) {
    const durationSeconds = Math.min(1800, Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
    const record = { skill, task_id, score, word_count, duration_seconds:durationSeconds };
    try {
      if (demoMode && window.QEDemo) {
        window.QEDemo.recordSkillPractice(record);
      } else {
        const response = await fetch('/api/learning/skill-practice', {
          method:'POST',
          credentials:'same-origin',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(record)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Не удалось сохранить статистику.');
      }
      await refreshSummary();
    } catch (error) {
      statusSummary.textContent = 'Результат показан, но статистику не удалось сохранить: ' + error.message;
    }
  }

  async function refreshSummary() {
    try {
      let skills = [];
      if (demoMode && window.QEDemo) {
        skills = window.QEDemo.getSkillPracticeStats();
      } else {
        const response = await fetch('/api/learning/skill-practice', { credentials:'same-origin' });
        if (response.ok) skills = (await response.json()).skills || [];
      }
      const summary = skills.filter(item => ['listening','writing','speaking','pronunciation'].includes(item.skill))
        .map(item => item.skill + ': ' + item.attempts + ' · ' + (item.accuracy == null ? 'без оценки' : item.accuracy + '%'));
      statusSummary.textContent = summary.length ? 'Твои результаты — ' + summary.join(' · ') : 'Пока нет завершённых заданий по этим навыкам.';
    } catch {}
  }

  tabs.forEach(tab => tab.addEventListener('click', () => chooseSkill(tab.dataset.skill)));
  $('[data-back-to-skills]').addEventListener('click', () => {
    stopRecognition();
    workspace.hidden = true;
    list.hidden = false;
    currentTask = null;
    renderList();
    window.scrollTo({top:0,behavior:'smooth'});
  });

  (async () => {
    let profile = null;
    try {
      const response = await fetch('/api/auth/me', { credentials:'same-origin' });
      const data = response.ok ? await response.json() : null;
      if (data?.user) {
        demoMode = false;
        profile = data.user;
      } else if (window.QEDemo) {
        demoMode = await window.QEDemo.ensure();
        if (demoMode) profile = window.QEDemo.getProfile?.();
      }
    } catch {
      if (window.QEDemo) {
        demoMode = await window.QEDemo.ensure();
        if (demoMode) profile = window.QEDemo.getProfile?.();
      }
    }
    currentLanguage = profile?.language_code || window.QEDemo?.getActiveLanguage?.() || 'en';
    speechLocale = currentLanguage === 'de' ? 'de-DE' : 'en-GB';
    if (currentLanguage === 'de') Object.assign(tasks, germanTasks);
    const pronunciationTab = tabs.find(tab => tab.dataset.skill === 'pronunciation');
    if (pronunciationTab) pronunciationTab.hidden = currentLanguage !== 'de';
    chooseSkill('listening');
  })();

  window.addEventListener('beforeunload', stopRecognition);
})();