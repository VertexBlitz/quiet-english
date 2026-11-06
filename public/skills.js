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
  let cancelCurrentRecording = null;

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
      },
      {
        id: 'listen_library_01', level: 'A2', duration: 5,
        title: 'A library card',
        description: 'Узнай, какие документы нужны и сколько книг можно взять.',
        transcript: 'Hello. I would like to join the library. Of course. Do you have an address document and some identification? Yes, I have both. Great. Your library card is free. You can borrow up to six books for three weeks. You can also renew them online if nobody else has reserved them.',
        questions: [
          { prompt: 'What does the visitor need to join?', choices: ['A photograph only', 'Identification and an address document', 'A payment receipt'], answer: 1, explanation: 'The librarian asks for identification and an address document.' },
          { prompt: 'How many books can a member borrow?', choices: ['Three', 'Six', 'Ten'], answer: 1, explanation: 'The visitor can borrow up to six books.' }
        ]
      },
      {
        id: 'listen_hotel_01', level: 'A2–B1', duration: 6,
        title: 'Checking into a hotel',
        description: 'Услышь время завтрака и расположение номера.',
        transcript: 'Good evening. I have a reservation under the name Taylor. Welcome. May I see your passport, please? Thank you. You are in room 208 on the second floor. Breakfast is served from seven until ten in the restaurant beside the reception desk. Here is your key card.',
        questions: [
          { prompt: 'Which room has been booked?', choices: ['208', '218', '280'], answer: 0, explanation: 'The receptionist says the room is 208.' },
          { prompt: 'Where is breakfast served?', choices: ['In the room', 'Beside the reception desk', 'On the roof'], answer: 1, explanation: 'The restaurant is beside the reception desk.' }
        ]
      },
      {
        id: 'listen_weather_01', level: 'B1', duration: 6,
        title: 'The morning forecast',
        description: 'Определи, когда ожидается дождь и как изменится температура.',
        transcript: 'Good morning. Today will start bright and cool, with temperatures around twelve degrees. Cloud will arrive from the west after midday, and light rain is expected during the evening. Tomorrow should be warmer, with longer sunny periods and a high of eighteen degrees.',
        questions: [
          { prompt: 'When is light rain expected?', choices: ['Early morning', 'After midday', 'During the evening'], answer: 2, explanation: 'Light rain is expected during the evening.' },
          { prompt: 'What temperature is forecast for tomorrow?', choices: ['12 degrees', '15 degrees', '18 degrees'], answer: 2, explanation: 'Tomorrow is expected to reach eighteen degrees.' }
        ]
      },
      {
        id: 'listen_project_01', level: 'B1', duration: 7,
        title: 'Planning a group project',
        description: 'Выясни, кто за что отвечает и когда команда встречается.',
        transcript: 'We need to finish the history presentation by Friday. I can prepare the introduction and find the photographs. That would be helpful. I will organise the main dates and create the timeline. What about the conclusion? Alex said they could write that part. Excellent. Let us meet in the library on Wednesday afternoon to check everything.',
        questions: [
          { prompt: 'What will the first speaker prepare?', choices: ['The introduction and photographs', 'The timeline', 'The conclusion'], answer: 0, explanation: 'The first speaker prepares the introduction and photographs.' },
          { prompt: 'When will the group meet?', choices: ['Tuesday morning', 'Wednesday afternoon', 'Friday evening'], answer: 1, explanation: 'They will meet on Wednesday afternoon.' }
        ]
      },
      {
        id: 'listen_recycling_01', level: 'B1', duration: 7,
        title: 'A community recycling event',
        description: 'Пойми, где проходит мероприятие и что посетителям стоит принести.',
        transcript: 'Our neighbourhood recycling day will take place in the school car park this Saturday. Volunteers will be there from ten until two. Please bring clean paper, cardboard and small electronic items. We cannot accept batteries or large household appliances at this event. There will also be a short workshop about reducing food waste.',
        questions: [
          { prompt: 'Where will the event take place?', choices: ['At the library', 'In the school car park', 'At the sports centre'], answer: 1, explanation: 'The event is in the school car park.' },
          { prompt: 'Which item cannot be accepted?', choices: ['Clean paper', 'Cardboard', 'Batteries'], answer: 2, explanation: 'Batteries are not accepted at this event.' }
        ]
      },
      {
        id: 'listen_gallery_01', level: 'B2', duration: 7,
        title: 'A gallery audio guide',
        description: 'Улови основную идею экскурсии и историческую деталь.',
        transcript: 'This gallery brings together paintings by artists who worked in the region during the early twentieth century. Rather than arranging the collection strictly by date, the curators have grouped the works by recurring themes, such as city life, changing landscapes and family relationships. The aim is to help visitors notice connections between artists who rarely exhibited together.',
        questions: [
          { prompt: 'How is the collection arranged?', choices: ['Only by date', 'By recurring themes', 'By the artists’ ages'], answer: 1, explanation: 'The works are grouped by themes rather than strictly by date.' },
          { prompt: 'What is the main aim of the arrangement?', choices: ['To show connections between artists', 'To identify the oldest painting', 'To list every exhibition'], answer: 0, explanation: 'The arrangement helps visitors notice connections between artists.' }
        ]
      },
      {
        id: 'listen_interview_01', level: 'B2', duration: 8,
        title: 'A student interview',
        description: 'Разбери аргументы собеседника о самостоятельном обучении.',
        transcript: 'Interviewer: What has been the most useful part of studying independently? Student: Having control over my schedule is convenient, but the biggest benefit is being able to return to difficult material. In a classroom, a discussion may move on before everyone is ready. When I study alone, I can pause, take notes and try another explanation. Interviewer: Do you miss working with other students? Student: Sometimes. Exchanging ideas helps me see a topic from a different perspective, so I try to join a study group once a week.',
        questions: [
          { prompt: 'What does the student identify as the biggest benefit?', choices: ['Finishing earlier', 'Returning to difficult material', 'Avoiding all group work'], answer: 1, explanation: 'The student values being able to revisit difficult material.' },
          { prompt: 'How often does the student join a study group?', choices: ['Every day', 'Once a week', 'Once a month'], answer: 1, explanation: 'The student joins a group once a week.' }
        ]
      },
      {
        id: 'listen_workshop_01', level: 'B2', duration: 8,
        title: 'A design workshop',
        description: 'Пойми, как команда изменила первоначальную идею.',
        transcript: 'At the beginning of the workshop, our team planned to redesign the entire website. After interviewing several visitors, however, we realised that most people were satisfied with the layout. Their main difficulty was finding the correct information quickly. We therefore narrowed the project to improving the search function and rewriting the navigation labels. The smaller change took less time and addressed a problem that users had actually reported.',
        questions: [
          { prompt: 'Why did the team change its original plan?', choices: ['The website was too expensive', 'Visitors mainly struggled to find information', 'The workshop ended early'], answer: 1, explanation: 'Interviews showed that finding information was the main issue.' },
          { prompt: 'What did the team decide to improve?', choices: ['The search function and navigation labels', 'The colour scheme and logo', 'The entire website layout'], answer: 0, explanation: 'The project was narrowed to search and navigation.' }
        ]
      },
      {
        id: 'listen_ferry_01', level: 'A2–B1', duration: 6,
        title: 'A ferry announcement',
        description: 'Найди информацию о посадке и изменении причала.',
        transcript: 'Passengers travelling on the twelve thirty ferry to Harbour Island should note a change. Boarding will now take place at pier number three, not pier number two. Please arrive at least fifteen minutes before departure and keep your ticket ready. Foot passengers should use the entrance beside the blue information building.',
        questions: [
          { prompt: 'Which pier should passengers use?', choices: ['Pier one', 'Pier two', 'Pier three'], answer: 2, explanation: 'The announcement changes boarding to pier number three.' },
          { prompt: 'How early should passengers arrive?', choices: ['Five minutes', 'Fifteen minutes', 'Thirty minutes'], answer: 1, explanation: 'Passengers should arrive at least fifteen minutes early.' }
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
    ],
    pronunciation: [
      { id:'speak_read_aloud_01', level:'A2', duration:2, title:'A visit to the museum', description:'Прочитай короткий текст вслух и получи оценку звуков и ударения.', referenceText:'The little museum opens at nine, but the guided tour starts at half past ten.' },
      { id:'speak_read_aloud_02', level:'A2', duration:2, title:'A morning journey', description:'Потренируй связную речь и чёткое произношение.', referenceText:'I usually take the early train because it gives me more time to explore the city.' },
      { id:'speak_read_aloud_03', level:'B1', duration:2, title:'A walk by the river', description:'Поработай с длинными словами и ритмом предложения.', referenceText:'Although the weather was cold, we enjoyed walking along the river and taking photographs.' },
      { id:'speak_read_aloud_04', level:'B1', duration:2, title:'Clear communication', description:'Проверь произношение согласных и естественный темп.', referenceText:'Good communication means listening carefully, asking clear questions, and responding with respect.' },
      { id:'speak_read_aloud_05', level:'B1', duration:2, title:'Learning with technology', description:'Потренируй интонацию на сложносочинённом предложении.', referenceText:'Technology can make learning more flexible, but regular practice is still important.' },
      { id:'speak_read_aloud_06', level:'A2', duration:2, title:'At the library', description:'Потренируй вежливый вопрос и связное произношение.', referenceText:'Could you tell me whether the library is open on Saturday afternoon?' },
      { id:'speak_read_aloud_07', level:'B2', duration:2, title:'Working together', description:'Проверь точность многосложных слов и плавность речи.', referenceText:'When people work together, they often find more creative ways to solve a problem.' },
      { id:'speak_read_aloud_08', level:'B2', duration:2, title:'A local art gallery', description:'Потренируй длинную фразу, ударение и интонацию.', referenceText:'I would rather visit a small local gallery than spend the whole afternoon in a crowded shopping centre.' }
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
      button.textContent = currentSkill === 'listening' ? 'Начать слушать ↗' : currentSkill === 'writing' ? 'Начать писать ↗' : currentSkill === 'pronunciation' ? 'Проверить произношение ↗' : 'Начать говорить ↗';
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
    intro.textContent = 'Сначала прослушай запись, не открывая расшифровку. Можно повторять её и менять скорость или голос.';
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
    [['0.8','Медленно'],['0.95','Чуть медленнее'],['1','Обычная'],['1.1','Быстрее']].forEach(([value,label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      rate.appendChild(option);
    });
    const accent = document.createElement('select');
    accent.setAttribute('aria-label', 'Вариант английского');
    [['en-GB','Британский английский'],['en-US','Американский английский'],['en-AU','Австралийский английский']].forEach(([value,label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      accent.appendChild(option);
    });
    const voiceSelect = document.createElement('select');
    voiceSelect.setAttribute('aria-label', 'Голос');
    const defaultVoice = document.createElement('option');
    defaultVoice.value = '';
    defaultVoice.textContent = 'Автоматический голос';
    voiceSelect.appendChild(defaultVoice);
    const loadVoices = () => {
      if (!('speechSynthesis' in window)) return;
      const selected = voiceSelect.value;
      voiceSelect.replaceChildren(defaultVoice);
      window.speechSynthesis.getVoices()
        .filter(voice => /^en(-|$)/i.test(voice.lang))
        .forEach(voice => {
          const option = document.createElement('option');
          option.value = voice.name;
          option.textContent = voice.name + ' · ' + voice.lang;
          voiceSelect.appendChild(option);
        });
      if ([...voiceSelect.options].some(option => option.value === selected)) voiceSelect.value = selected;
    };
    if ('speechSynthesis' in window) {
      loadVoices();
      window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
    } else {
      play.disabled = true;
      repeat.disabled = true;
      voiceSelect.disabled = true;
      accent.disabled = true;
    }
    const audioMessage = document.createElement('p');
    audioMessage.className = 'skill-status';
    const transcriptButton = document.createElement('button');
    transcriptButton.type = 'button';
    transcriptButton.className = 'text-link';
    transcriptButton.textContent = 'Показать расшифровку';
    transcriptButton.hidden = 'speechSynthesis' in window;
    const passage = document.createElement('div');
    passage.className = 'skill-passage';
    passage.textContent = task.transcript;
    passage.hidden = true;
    const speak = () => {
      if (!('speechSynthesis' in window)) {
        audioMessage.textContent = 'В этом браузере нет встроенного озвучивания. Открой расшифровку и выполни задание в режиме чтения.';
        transcriptButton.hidden = false;
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(task.transcript);
      const chosenVoice = window.speechSynthesis.getVoices().find(voice => voice.name === voiceSelect.value);
      utterance.lang = chosenVoice?.lang || accent.value;
      if (chosenVoice) utterance.voice = chosenVoice;
      utterance.rate = Number(rate.value);
      utterance.onstart = () => { audioMessage.textContent = 'Воспроизводится английская речь…'; };
      utterance.onend = () => { audioMessage.textContent = 'Прослушивание завершено. Теперь ответь на вопросы.'; };
      utterance.onerror = () => { audioMessage.textContent = 'Не удалось воспроизвести текст. Попробуй другой голос или открой расшифровку.'; };
      window.speechSynthesis.speak(utterance);
    };
    play.addEventListener('click', speak);
    repeat.addEventListener('click', speak);
    toolbar.append(play, repeat, rate, accent, voiceSelect);
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
      setStatus('Задание завершено. В статистику добавлена только оценка и длительность занятия.', 'success-text');
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
      recognition.lang = 'en-GB';
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

  function renderPronunciation(task) {
    const intro = document.createElement('p');
    intro.className = 'copy';
    intro.textContent = 'Прочитай образец вслух в обычном темпе. Система сравнит запись с текстом и покажет точность отдельных звуков, беглость, полноту и интонацию.';
    const reference = document.createElement('div');
    reference.className = 'skill-passage pronunciation-reference';
    reference.textContent = task.referenceText;
    const consent = document.createElement('label');
    consent.className = 'check-row pronunciation-consent';
    const consentInput = document.createElement('input');
    consentInput.type = 'checkbox';
    const consentText = document.createElement('span');
    consentText.textContent = 'Я согласен(на) отправить эту запись в Microsoft Azure Speech для проверки произношения. Запись не сохраняется Quiet English. Если мне нет 18 лет, у меня есть разрешение родителя или опекуна на использование внешней проверки голоса.';
    consent.append(consentInput, consentText);

    const controls = document.createElement('div');
    controls.className = 'skill-toolbar';
    const startButton = document.createElement('button');
    startButton.type = 'button';
    startButton.className = 'button';
    startButton.textContent = '🎙 Начать запись';
    const stopButton = document.createElement('button');
    stopButton.type = 'button';
    stopButton.className = 'button secondary';
    stopButton.textContent = 'Остановить';
    stopButton.disabled = true;
    const preview = document.createElement('audio');
    preview.controls = true;
    preview.hidden = true;
    preview.className = 'pronunciation-audio';
    const analyseButton = document.createElement('button');
    analyseButton.type = 'button';
    analyseButton.className = 'button';
    analyseButton.textContent = 'Оценить произношение ↗';
    analyseButton.disabled = true;
    const engineStatus = document.createElement('p');
    engineStatus.className = 'skill-status';
    const audioStatus = document.createElement('p');
    audioStatus.className = 'skill-status';
    let configured = false;
    let recorder = null;
    let stream = null;
    let chunks = [];
    let wavBlob = null;
    let wavUrl = null;
    let stopTimer = null;

    function releaseAudio() {
      if (wavUrl) URL.revokeObjectURL(wavUrl);
      wavUrl = null;
      wavBlob = null;
      preview.removeAttribute('src');
      preview.hidden = true;
    }

    startButton.disabled = true;
    fetch('/api/speech/pronunciation/status', { credentials:'same-origin' })
      .then(response => response.ok ? response.json() : { configured:false })
      .then(data => {
        configured = data.configured === true;
        startButton.disabled = !(configured && consentInput.checked);
        engineStatus.textContent = configured
          ? 'Модуль оценки готов. Модель английского — en-US. Для полной проверки нужны 3–25 секунд чёткой речи.'
          : 'Облачный модуль оценки ещё не подключён. Список заданий можно просматривать, но запись не отправляется, пока администратор не настроит речевой сервис.';
      })
      .catch(() => {
        engineStatus.textContent = 'Не удалось проверить доступность речевого сервиса.';
      });

    startButton.addEventListener('click', async () => {
      if (!configured) return;
      if (!consentInput.checked) {
        setStatus('Сначала подтверди согласие на отправку записи и разрешение родителя или опекуна, если оно требуется.', 'error-text');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        setStatus('Запись в этом браузере не поддерживается. Попробуй современный браузер с доступом к микрофону.', 'error-text');
        return;
      }
      releaseAudio();
      chunks = [];
      startButton.disabled = true;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount:1, echoCancellation:true, noiseSuppression:true, autoGainControl:true }
        });
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
            ? 'audio/ogg;codecs=opus'
            : '';
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        let discardAfterStop = false;
        cancelCurrentRecording = () => {
          discardAfterStop = true;
          clearTimeout(stopTimer);
          if (recorder?.state === 'recording') recorder.stop();
          stream?.getTracks().forEach(track => track.stop());
        };
        recorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
        recorder.onerror = () => {
          audioStatus.textContent = 'Ошибка записи. Проверь разрешение на микрофон и попробуй ещё раз.';
          startButton.disabled = false;
          stopButton.disabled = true;
        };
        recorder.onstop = async () => {
          clearTimeout(stopTimer);
          stopButton.disabled = true;
          stream?.getTracks().forEach(track => track.stop());
          stream = null;
          if (discardAfterStop || !consentInput.checked) {
            chunks = [];
            recorder = null;
            cancelCurrentRecording = null;
            audioStatus.textContent = 'Запись остановлена и удалена без отправки.';
            startButton.disabled = !(configured && consentInput.checked);
            return;
          }
          try {
            const sourceBlob = new Blob(chunks, { type:recorder.mimeType || 'audio/webm' });
            wavBlob = await convertToPcmWav(sourceBlob);
            wavUrl = URL.createObjectURL(wavBlob);
            preview.src = wavUrl;
            preview.hidden = false;
            analyseButton.disabled = false;
            audioStatus.textContent = 'Запись готова. Прослушай её и нажми «Оценить произношение». Максимальная длина — 25 секунд.';
          } catch (error) {
            audioStatus.textContent = error.message || 'Не удалось подготовить запись. Повтори попытку.';
          } finally {
            recorder = null;
            chunks = [];
            cancelCurrentRecording = null;
            startButton.disabled = !(configured && consentInput.checked);
          }
        };
        recorder.start(250);
        stopButton.disabled = false;
        audioStatus.textContent = 'Идёт запись. Прочитай текст естественно и не торопись. Запись остановится автоматически через 25 секунд.';
        stopTimer = setTimeout(() => {
          if (recorder?.state === 'recording') recorder.stop();
        }, 25_000);
      } catch (error) {
        stream?.getTracks().forEach(track => track.stop());
        stream = null;
        startButton.disabled = !configured;
        stopButton.disabled = true;
        audioStatus.textContent = error.name === 'NotAllowedError'
          ? 'Доступ к микрофону не разрешён. Измени разрешение сайта в настройках браузера.'
          : 'Не удалось начать запись. Проверь подключение микрофона.';
      }
    });

    stopButton.addEventListener('click', () => {
      if (recorder?.state === 'recording') recorder.stop();
    });

    analyseButton.addEventListener('click', async () => {
      if (!wavBlob || !consentInput.checked) return;
      analyseButton.disabled = true;
      startButton.disabled = true;
      setStatus('Проверяем звуки, темп и интонацию…');
      try {
        const response = await fetch('/api/speech/pronunciation/' + encodeURIComponent(task.id), {
          method:'POST',
          credentials:'same-origin',
          headers:{ 'Content-Type':'audio/wav', 'Accept':'application/json' },
          body:wavBlob
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Не удалось оценить произношение.');
        renderPronunciationResult(data.result, task);
        const score = data.result.pronunciationScore ?? data.result.accuracyScore;
        await recordAttempt({
          skill:'speaking', task_id:task.id, score,
          word_count:words(task.referenceText)
        });
        setStatus('Оценка завершена. Аудиозапись и расшифровка не добавлялись в учебный профиль.', 'success-text');
        releaseAudio();
      } catch (error) {
        setStatus(error.message || 'Оценка временно недоступна.', 'error-text');
        analyseButton.disabled = false;
      } finally {
        startButton.disabled = !configured;
      }
    });

    function renderPronunciationResult(result, current) {
      resultBox.replaceChildren();
      resultBox.hidden = false;
      const heading = document.createElement('h3');
      heading.textContent = 'Результат произношения';
      resultBox.appendChild(heading);
      const grid = document.createElement('div');
      grid.className = 'pronunciation-score-grid';
      const scoreItems = [
        ['Общая оценка', result.pronunciationScore],
        ['Точность звуков', result.accuracyScore],
        ['Беглость', result.fluencyScore],
        ['Полнота', result.completenessScore],
        ['Интонация и ритм', result.prosodyScore]
      ];
      scoreItems.forEach(([label, value]) => {
        if (value == null) return;
        const card = document.createElement('div');
        card.className = 'pronunciation-score';
        const name = document.createElement('span');
        name.textContent = label;
        const number = document.createElement('strong');
        number.textContent = Math.round(value) + '/100';
        card.append(name, number);
        grid.appendChild(card);
      });
      resultBox.appendChild(grid);
      if (result.recognizedText) {
        const transcript = document.createElement('p');
        transcript.className = 'pronunciation-transcript';
        transcript.textContent = 'Распознанная речь: “' + result.recognizedText + '”';
        resultBox.appendChild(transcript);
      }
      const weakWords = (result.words || []).filter(word =>
        word.accuracy != null && word.accuracy < 85 ||
        word.errorType && word.errorType !== 'None'
      );
      const title = document.createElement('h4');
      title.textContent = weakWords.length ? 'Слова и звуки для повторения' : 'Хорошая работа';
      resultBox.appendChild(title);
      if (!weakWords.length) {
        const note = document.createElement('p');
        note.textContent = 'В этой попытке система не нашла выраженных проблем на уровне слов. Продолжай практиковать чёткость и естественный ритм.';
        resultBox.appendChild(note);
      }
      weakWords.slice(0, 12).forEach(word => {
        const row = document.createElement('div');
        row.className = 'pronunciation-word';
        const name = document.createElement('strong');
        name.textContent = word.word + (word.accuracy == null ? '' : ' · ' + Math.round(word.accuracy) + '/100');
        row.appendChild(name);
        if (word.errorType && word.errorType !== 'None') {
          const error = document.createElement('span');
          const labels = {
            Mispronunciation:'Возможная неточность звука',
            Omission:'Пропущено слово',
            Insertion:'Добавлено лишнее слово',
            UnexpectedBreak:'Лишняя пауза',
            MissingBreak:'Нужна пауза',
            Monotone:'Монотонная интонация'
          };
          error.textContent = labels[word.errorType] || 'Проверь произношение';
          row.appendChild(error);
        }
        const weakPhonemes = (word.phonemes || []).filter(item => item.accuracy != null && item.accuracy < 85);
        weakPhonemes.forEach(item => {
          const phoneme = document.createElement('span');
          phoneme.className = 'pronunciation-phoneme';
          phoneme.textContent = 'Звук ' + item.expected + ' · ' + Math.round(item.accuracy) + '/100' +
            (item.alternative && item.alternative !== item.expected ? ' · модель также рассмотрела ' + item.alternative : '');
          row.appendChild(phoneme);
        });
        resultBox.appendChild(row);
      });
      const foot = document.createElement('p');
      foot.className = 'fine-print';
      foot.textContent = 'Это автоматическая оценка чтения конкретного текста, а не окончательный вывод о твоём акценте или уровне английского. Результат может зависеть от микрофона, шума и выбранной языковой модели (en-US).';
      resultBox.appendChild(foot);
    }
    consentInput.addEventListener('change', () => {
      if (!consentInput.checked) {
        startButton.disabled = true;
        analyseButton.disabled = true;
        if (recorder?.state === 'recording') recorder.stop();
        releaseAudio();
      } else {
        startButton.disabled = !configured || Boolean(recorder);
      }
    });
    controls.append(startButton, stopButton, analyseButton);
    taskContent.append(intro, reference, consent, controls, audioStatus, engineStatus, preview);
  }

  async function convertToPcmWav(blob) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Обработка аудио недоступна в этом браузере.');
    const context = new AudioContextClass();
    try {
      const decoded = await context.decodeAudioData(await blob.arrayBuffer());
      if (decoded.duration < 1 || decoded.duration > 30) throw new Error('Запись должна длиться от 1 до 30 секунд.');
      const source = decoded.getChannelData(0);
      const ratio = decoded.sampleRate / 16000;
      const length = Math.floor(source.length / ratio);
      const pcm = new Int16Array(length);
      for (let i = 0; i < length; i++) {
        const start = Math.floor(i * ratio);
        const end = Math.min(source.length, Math.max(start + 1, Math.floor((i + 1) * ratio)));
        let total = 0;
        for (let j = start; j < end; j++) total += source[j];
        const sample = Math.max(-1, Math.min(1, total / (end - start)));
        pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }
      const wav = new ArrayBuffer(44 + pcm.length * 2);
      const view = new DataView(wav);
      const write = (offset, value) => {
        for (let i=0;i<value.length;i++) view.setUint8(offset+i,value.charCodeAt(i));
      };
      write(0,'RIFF'); view.setUint32(4,36+pcm.length*2,true); write(8,'WAVE');
      write(12,'fmt '); view.setUint32(16,16,true); view.setUint16(20,1,true);
      view.setUint16(22,1,true); view.setUint32(24,16000,true);
      view.setUint32(28,32000,true); view.setUint16(32,2,true); view.setUint16(34,16,true);
      write(36,'data'); view.setUint32(40,pcm.length*2,true);
      for (let i=0;i<pcm.length;i++) view.setInt16(44+i*2,pcm[i],true);
      return new Blob([wav], { type:'audio/wav' });
    } finally {
      await context.close().catch(() => {});
    }
  }

  function stopRecognition() {
    if (recognition) {
      try { recognition.stop(); } catch {}
      recognition = null;
    }
    if (cancelCurrentRecording) {
      try { cancelCurrentRecording(); } catch {}
      cancelCurrentRecording = null;
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  async function requestFeedback(task, answer, skill) {
    const taskText = skill === 'writing'
      ? 'Writing task: ' + task.prompt
      : 'Speaking prompt: ' + task.prompt;
    const directions = [
      'You are an encouraging English teacher. Review the learner response for a general audience and keep the feedback age-appropriate.',
      'Assess task completion, grammar, vocabulary and clarity. Correct up to three important errors with short explanations.',
      'Give one improved version that preserves the learner meaning. End with one practical next step.',
      'Start with exactly: Estimated score: NN/100. The score is approximate and should reflect task completion, grammar, vocabulary and clarity.',
      'Do not ask for or repeat personal contact details. Keep the review constructive.'
    ].join(' ');
    const content = directions + '\n' + taskText + '\nLearner response:\n' + answer.slice(0,1000);
    if (content.length > 1800) throw new Error('Ответ слишком длинный. Сократи текст и отправь ещё раз.');
    const response = await fetch('/api/chat', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role:'user', content }] })
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
      const summary = skills.filter(item => ['listening','writing','speaking'].includes(item.skill))
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
    try {
      const response = await fetch('/api/auth/me', { credentials:'same-origin' });
      const data = response.ok ? await response.json() : null;
      if (data?.user) demoMode = false;
      else if (window.QEDemo) demoMode = await window.QEDemo.ensure();
    } catch {
      if (window.QEDemo) demoMode = await window.QEDemo.ensure();
    }
    chooseSkill('listening');
  })();

  window.addEventListener('beforeunload', stopRecognition);
})();