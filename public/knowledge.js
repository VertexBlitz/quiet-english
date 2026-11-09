(() => {
  const root = document.querySelector('[data-knowledge-page]');
  if (!root) return;
  const cats = {grammar:['Грамматика','Grammar'],vocabulary:['Лексика','Vocabulary'],reading:['Чтение','Reading'],listening:['Аудирование','Listening'],speaking:['Говорение','Speaking'],writing:['Письмо','Writing']};
  const rows = [
  ['grammar','A1','Present Simple','Present Simple','Привычки, регулярные действия и факты.','Habits, regular actions and facts.','Используется для того, что происходит регулярно, обычно или является общеизвестным фактом.','It describes what happens regularly, usually or is generally true.','Утверждение: I / you / we / they + V1; he / she / it + V-s.','Affirmative: I / you / we / they + V1; he / she / it + V-s.',['В вопросах используется Do или Does.','В отрицании — do not или does not.','После does смысловой глагол остаётся в начальной форме.'],['Use Do or Does to form questions.','Use do not or does not in negatives.','After does, the main verb stays in its base form.'],[['I usually read before bed.','Я обычно читаю перед сном.'],['She works in a library.','Она работает в библиотеке.'],['Do they speak English?','Они говорят по-английски?']],'Не говори She does not likes. Правильно: She does not like.','Do not say She does not likes. Use She does not like.'],
  ['grammar','A2','Past Simple','Past Simple','Завершённые действия и события в прошлом.','Finished actions and events in the past.','Past Simple описывает событие, которое произошло и завершилось в прошлом.','Past Simple describes an event that started and finished in the past.','У правильных глаголов добавляется -ed; неправильные имеют вторую форму.','Regular verbs take -ed; irregular verbs have a second form.',['Утверждение: V2 или V-ed.','Отрицание: did not + V1.','Вопрос: Did + подлежащее + V1?'],['Affirmative: V2 or V-ed.','Negative: did not + V1.','Question: Did + subject + V1?'],[['We visited the museum yesterday.','Вчера мы посетили музей.'],['He bought a new notebook.','Он купил новую тетрадь.'],['Did you enjoy the film?','Тебе понравился фильм?']],'После did и did not ставь первую форму: Did she go?, а не Did she went?','Use the base form after did: Did she go?, not Did she went?'],
  ['grammar','B1','Present Perfect vs Past Simple','Present Perfect vs Past Simple','Опыт и результат сейчас или завершённое прошлое.','Experience and present results vs finished past time.','Present Perfect связывает прошлое с настоящим. Past Simple указывает на завершённое время в прошлом.','Present Perfect connects the past with the present. Past Simple refers to a finished past time.','Present Perfect: have / has + V3.','Present Perfect: have / has + V3.',['Past Simple часто сопровождается yesterday, last week, in 2020.','Present Perfect может описывать жизненный опыт.','Важен смысл контекста и завершён ли период.'],['Past Simple often appears with yesterday, last week or in 2020.','Present Perfect can describe life experience.','Meaning and the time period matter more than memorised keywords.'],[['Have you ever been to London?','Ты когда-нибудь был в Лондоне?'],['I saw this exhibition last Saturday.','Я видел эту выставку в прошлую субботу.'],['She has just finished her report.','Она только что закончила отчёт.']],'Не используй Present Perfect с завершённым временем yesterday, last year или in 2019.','Do not use Present Perfect with finished time expressions such as yesterday or last year.'],
  ['grammar','B2','Conditionals','Conditionals','Условия, реальные результаты и гипотетические ситуации.','Conditions, real results and hypothetical situations.','Условные предложения показывают, как одно событие зависит от другого.','Conditionals show how one event depends on another.','Zero — закономерности; First — реальная возможность в будущем.','Zero — general truths; First — real future possibilities.',['Second: If + Past Simple, would + V1.','Third: If + Past Perfect, would have + V3.','Выбирай модель по реальности и времени ситуации.'],['Second: If + Past Simple, would + V1.','Third: If + Past Perfect, would have + V3.','Choose the pattern according to how real the situation is and when it occurs.'],[['If water reaches 100°C, it boils.','Если вода достигает 100°C, она закипает.'],['If I have time, I will call you.','Если у меня будет время, я тебе позвоню.'],['If we had left earlier, we would have caught the train.','Если бы мы вышли раньше, мы бы успели на поезд.']],'В First Conditional после if обычно не ставится will: If it rains, we will stay home.','In a standard First Conditional, do not use will after if.'],
  ['grammar','C1','Inversion and emphasis','Inversion and emphasis','Обратный порядок слов для акцента и формального стиля.','Inverted word order for emphasis and formal style.','Инверсия меняет привычный порядок подлежащего и вспомогательного глагола.','Inversion changes the usual order of the subject and auxiliary verb.','Часто встречается после отрицательных и ограничительных выражений.','It often follows negative and restrictive expressions.',['Never / rarely / seldom + auxiliary + subject + verb.','Not only + auxiliary + subject ... but also ...','После only after / only when инверсия обычно появляется в главной части.'],['Never / rarely / seldom + auxiliary + subject + verb.','Not only + auxiliary + subject ... but also ...','After only after / only when, inversion usually appears in the main clause.'],[['Rarely have I seen such a clear explanation.','Редко я видел настолько ясное объяснение.'],['Not only did she solve the problem, but she also explained it.','Она не только решила проблему, но и объяснила её.'],['Only then did we understand the risk.','Только тогда мы поняли риск.']],'Используй инверсию для акцента, а не в каждом предложении.','Use inversion for emphasis, not in every sentence.'],
  ['grammar','C2','Modality and nuance','Modality and nuance','Вероятность, уверенность, дистанция и отношение говорящего.','Probability, certainty, distance and speaker stance.','Важно не только выбрать modal verb, но и точно передать степень уверенности и контекст.','Choose modal verbs to convey not only meaning but also degree of certainty and context.','Must может выражать сильный вывод; might — возможность; would — дистанцию или вежливость.','Must can express strong deduction; might a possibility; would distance or politeness.',['Must have + V3 — сильный вывод о прошлом.','May / might have + V3 — менее уверенное предположение.','Would you mind...? — вежливая просьба.'],['Must have + V3 — strong deduction about the past.','May / might have + V3 — a less certain possibility.','Would you mind...? — a polite request.'],[['That may well be the case.','Вполне возможно, что это так.'],['She cannot have known about the change.','Не может быть, чтобы она знала об изменении.'],['Would it be possible to clarify the final point?','Можно ли уточнить последний пункт?']],'Не воспринимай модальные глаголы как точную шкалу процентов: их сила зависит от ситуации.','Do not treat modal verbs as fixed percentages: their force depends on context.'],

  ['vocabulary','A1','Everyday vocabulary','Everyday vocabulary','Слова о доме, учёбе, времени и распорядке дня.','Words for home, study, time and daily routines.','Учи слова небольшими тематическими группами и сразу используй их в коротких фразах.','Learn words in small topic groups and use them in short phrases.','Начни с предметов и действий, которые часто встречаются в обычном дне.','Start with objects and actions you meet often.',['Home: room, kitchen, window, key.','Study: lesson, subject, homework, notebook.','Routine: wake up, have breakfast, leave, arrive.'],['Home: room, kitchen, window, key.','Study: lesson, subject, homework, notebook.','Routine: wake up, have breakfast, leave, arrive.'],[['I have breakfast at seven.','Я завтракаю в семь.'],['My notebook is on the desk.','Моя тетрадь лежит на столе.'],['We arrive at school on time.','Мы приходим в школу вовремя.']],'Запоминай существительные с артиклем и слова в сочетаниях: a key, do homework.','Learn nouns with articles and useful chunks: a key, do homework.'],
  ['vocabulary','A2','Travel and accommodation','Travel and accommodation','Транспорт, бронирование, отель и просьбы.','Transport, booking, hotels and requests.','В путешествии повторяются типичные ситуации: купить билет, уточнить время, заселиться и решить проблему.','Travel involves recurring situations: buying a ticket, checking a time, checking in and solving a problem.','Запоминай целые фразы, а не отдельные переводы.','Learn whole phrases rather than isolated translations.',['Transport: platform, return ticket, delay, connection.','Hotel: booking, reception, single room, check in / check out.','Problem: available, broken, missing, refund.'],['Transport: platform, return ticket, delay, connection.','Hotel: booking, reception, single room, check in / check out.','Problem: available, broken, missing, refund.'],[['Could I check in before noon?','Могу ли я заселиться до полудня?'],['Is there a direct connection to Oxford?','Есть ли прямое сообщение с Оксфордом?'],['I would like to report a problem with my booking.','Я хотел бы сообщить о проблеме с бронированием.']],'Book a room — забронировать номер; check in — зарегистрироваться при заселении.','Book a room and check in describe different stages of a stay.'],
  ['vocabulary','B1','Collocations','Collocations','Естественные сочетания слов.','Natural word combinations.','Знать значение слова недостаточно: важно понимать, с какими словами оно обычно сочетается.','Knowing a word is not enough: learn which words naturally go with it.','Сохраняй collocations как готовые блоки и используй их в собственных предложениях.','Save collocations as chunks and use them in your own sentences.',['make a decision / progress / an effort.','do research / homework / business.','strong evidence / heavy rain / deeply concerned.'],['make a decision / progress / an effort.','do research / homework / business.','strong evidence / heavy rain / deeply concerned.'],[['We need to make a decision today.','Нам нужно принять решение сегодня.'],['The team has made significant progress.','Команда добилась значительного прогресса.'],['The report provides strong evidence.','В отчёте представлены веские доказательства.']],'Проверяй сочетание целиком: дословный перевод с русского часто звучит неестественно.','Check the whole phrase: a literal translation from your language may sound unnatural.'],
  ['vocabulary','B2','Phrasal verbs','Phrasal verbs','Фразовые глаголы и их значение в контексте.','Multi-word verbs and their meaning in context.','Phrasal verb состоит из глагола и частицы. Значение может быть буквальным или идиоматическим.','A phrasal verb combines a verb with a particle; its meaning may be literal or idiomatic.','У одних глаголов дополнение можно поставить между частями, у других порядок фиксирован.','Some verbs allow the object between the parts; others do not.',['turn down an offer — отказаться.','put off a meeting — отложить.','look after someone — присматривать; run into someone — случайно встретить.'],['turn down an offer — reject it.','put off a meeting — postpone it.','look after someone; run into someone.'],[['She turned down the invitation.','Она отклонила приглашение.'],['Could we put the meeting off until Friday?','Можем перенести встречу на пятницу?'],['I ran into an old teacher yesterday.','Вчера я случайно встретил бывшего учителя.']],'Не разделяй любой phrasal verb автоматически: проверь, допускает ли он разделение.','Do not split every phrasal verb automatically. Check whether it is separable.'],
  ['vocabulary','C1','Academic vocabulary','Academic vocabulary','Точная лексика для анализа и аргументации.','Precise vocabulary for analysis and argument.','Академический словарь помогает обозначать причины, следствия, ограничения и доказательства.','Academic vocabulary helps express causes, consequences, limitations and evidence precisely.','Выбирай глагол по функции: describe, analyse, assess и substantiate не взаимозаменяемы.','Choose verbs by function: describe, analyse, assess and substantiate are not interchangeable.',['Аргумент: claim, contend, acknowledge, challenge.','Исследование: examine, assess, investigate, establish.','Доказательства: evidence, findings, indication, implication.'],['Argument: claim, contend, acknowledge, challenge.','Research: examine, assess, investigate, establish.','Evidence: evidence, findings, indication, implication.'],[['The findings substantiate the initial claim.','Результаты подтверждают первоначальное утверждение.'],['The study examines the long-term implications.','Исследование рассматривает долгосрочные последствия.'],['The author acknowledges a significant limitation.','Автор признаёт существенное ограничение.']],'Точность и естественная сочетаемость важнее редкого слова ради сложности.','Precision and natural collocation matter more than an obscure word.'],
  ['vocabulary','C2','Connotation and nuance','Connotation and nuance','Оттенки значения, регистр и эмоциональная окраска.','Shades of meaning, register and emotional tone.','Близкие по словарному значению слова могут отличаться отношением говорящего и типичной ситуацией употребления.','Words with similar dictionary meanings can differ in attitude and typical context.','Сравнивай денотацию, коннотацию и регистр.','Compare denotation, connotation and register.',['Slim обычно нейтральнее или положительнее, чем skinny.','Childlike может быть положительным, childish — часто критическим.','Ask нейтрально; enquire формальнее; demand настойчивее.'],['Slim is usually more neutral or positive than skinny.','Childlike can be positive; childish is often critical.','Ask is neutral; enquire is more formal; demand is forceful.'],[['Her response was firm but not hostile.','Её ответ был твёрдым, но не враждебным.'],['The proposal is ambitious rather than unrealistic.','Предложение скорее амбициозное, чем нереалистичное.'],['He expressed mild reservations.','Он выразил некоторые сдержанные сомнения.']],'Проверяй примеры и пометы словаря: регистр бывает важнее прямого перевода.','Check examples and dictionary labels: register can matter more than direct translation.'],

  ['reading','A1','Understanding short texts','Understanding short texts','Главная информация в коротких сообщениях.','Key information in short messages.','Сначала пойми ситуацию: кто пишет, кому, где и зачем. Не нужно переводить каждое слово.','Identify the situation first: who writes, to whom, where and why. You need not translate every word.','Ищи имена, время, место, числа и знакомые глаголы.','Look for names, times, places, numbers and familiar verbs.',['Прочитай заголовок и первое предложение.','Заметь знакомые слова и повторяющиеся детали.','Ответь на who, where, when и what.'],['Read the heading and first sentence.','Notice familiar words and repeated details.','Answer who, where, when and what.'],[['The shop closes at six on Sundays.','По воскресеньям магазин закрывается в шесть.'],['Anna is meeting Tom at the station.','Анна встречается с Томом на станции.'],['Please bring your student card.','Пожалуйста, принеси студенческий билет.']],'Если незнакомое слово не мешает понять основную мысль, пропусти его и читай дальше.','If an unknown word does not block the main idea, skip it and continue.'],
  ['reading','A2','Context clues','Context clues','Как предположить значение незнакомого слова.','How to infer the meaning of an unfamiliar word.','Контекст подсказывает значение через пример, противопоставление, объяснение или ситуацию.','Context reveals meaning through examples, contrast, explanation or situation.','Сначала попробуй понять роль слова, затем проверь гипотезу по словарю.','Work out the role of the word first, then check your hypothesis in a dictionary.',['Пример: such as, for example, including.','Контраст: but, however, unlike.','Пояснение: because, so, in other words.'],['Example: such as, for example, including.','Contrast: but, however, unlike.','Explanation: because, so, in other words.'],[['Unlike the noisy street, the courtyard was peaceful.','В отличие от шумной улицы, двор был спокойным.'],['Several appliances, such as a kettle and a toaster, were missing.','Не хватало нескольких приборов, например чайника и тостера.'],['The path was narrow, so only one person could walk along it.','Тропа была узкой, поэтому по ней мог идти только один человек.']],'Предположение по контексту — гипотеза. Проверь его после абзаца.','A context-based meaning is a hypothesis. Check it after the paragraph.'],
  ['reading','B1','Skimming and scanning','Skimming and scanning','Быстрое чтение для общего смысла и точного факта.','Fast reading for gist and specific information.','Skimming помогает понять основную мысль; scanning — найти точную деталь.','Skimming finds the main idea; scanning locates a specific detail.','Выбирай стратегию в зависимости от вопроса задания.','Choose the strategy according to the task.',['Skimming: заголовки и первые предложения абзацев.','Scanning: имена, даты, числа и термины.','Найденный фрагмент перечитай внимательно.'],['Skimming: headings and topic sentences.','Scanning: names, dates, numbers and terms.','Read the located passage carefully.'],[['Skim the article to identify its main argument.','Быстро просмотри статью, чтобы определить её главный тезис.'],['Scan the timetable for the departure time.','Найди в расписании время отправления.'],['The second paragraph provides the clearest example.','Во втором абзаце приведён самый ясный пример.']],'Не угадывай по одному совпавшему слову: проверь предложение целиком.','Do not guess from one matching word. Check the whole sentence.'],
  ['reading','B2','Inference','Inference','Выводы, которые автор не формулирует прямо.','Meaning that the author does not state directly.','Сопоставляй факты, выбор слов и логические связи. Хороший вывод опирается на несколько деталей текста.','Combine facts, word choice and logical links. A sound inference rests on several details.','Отделяй прямую информацию от предположения читателя.','Separate explicit information from the reader’s inference.',['Отметь, что автор сообщает прямо.','Обрати внимание на оценочную лексику и контраст.','Найди детали, которые подтверждают вывод.'],['Identify what the author states explicitly.','Notice evaluative language and contrast.','Find details that support the inference.'],[['He checked the empty platform every few minutes.','Он каждые несколько минут проверял пустую платформу.'],['The writer calls the proposal ambitious but costly.','Автор называет предложение амбициозным, но дорогим.'],['The final sentence questions the reliability of the source.','Последнее предложение ставит под сомнение надёжность источника.']],'Различай The text says и This suggests: факт и вывод — не одно и то же.','Distinguish The text says from This suggests: a fact and an inference are not the same.'],
  ['reading','C1','Argument and author stance','Argument and author stance','Тезис, доказательства, допущения и позиция автора.','Claims, evidence, assumptions and author stance.','Пойми не только тему, но и то, как автор строит аргумент и насколько убедительны основания.','Identify not only the topic but also how the argument is built and how strong its support is.','Разделяй утверждение, основание, пример, оговорку и вывод.','Separate the claim, rationale, example, qualification and conclusion.',['Тезис: что автор хочет доказать?','Доказательство: какие данные или примеры приведены?','Оговорка: какие ограничения признаются?'],['Claim: what does the author want to establish?','Evidence: what data or examples are used?','Qualification: what limits are acknowledged?'],[['The evidence supports the claim only under specific conditions.','Доказательства подтверждают тезис только при определённых условиях.'],['The author concedes that the sample is relatively small.','Автор признаёт, что выборка сравнительно мала.'],['This assumption is not fully addressed in the conclusion.','Это допущение не полностью рассмотрено в заключении.']],'Уверенный тон не является доказательством. Оцени источник, метод и альтернативы.','A confident tone is not evidence. Assess the source, method and alternatives.'],
  ['reading','C2','Rhetorical structure','Rhetorical structure','Композиция, метафоры и риторические приёмы.','Structure, metaphor and rhetorical choices.','Анализируй, как текст воздействует на аудиторию: что выделено, опущено и отложено.','Analyse how a text affects its audience: what is foregrounded, omitted or delayed.','Один факт может быть примером, уступкой, контрастом или эмоциональным акцентом.','A fact can function as an example, concession, contrast or emotional emphasis.',['Foregrounding выделяет важную деталь.','Concession признаёт сильный довод другой стороны.','Framing задаёт угол восприятия проблемы.'],['Foregrounding highlights a key detail.','Concession acknowledges a strong opposing point.','Framing shapes how an issue is perceived.'],[['Granted, the proposal is costly; nevertheless, its benefits may justify the investment.','Безусловно, предложение дорогостоящее; тем не менее его преимущества могут оправдать вложения.'],['The opening anecdote frames the debate as a personal issue.','Начальная история задаёт восприятие спора как личной проблемы.'],['The author postpones the strongest counterargument.','Автор откладывает самый сильный контраргумент.']],'Называй конкретный приём и объясняй его эффект.','Name the specific technique and explain its effect.'],

  ['listening','A1','Key words in audio','Key words in audio','Короткие записи на знакомую тему.','Short recordings on familiar topics.','Сначала улови ситуацию и ключевые слова, затем прослушай ещё раз ради деталей.','Catch the situation and key words first, then listen again for details.','Первое прослушивание — общий смысл; второе — имена, числа, время и факты.','First listen for gist; listen again for names, numbers, times and facts.',['Перед аудио прочитай вопрос.','Не останавливай запись после каждого незнакомого слова.','После прослушивания проверь ответ по контексту.'],['Read the question before listening.','Do not pause after every unfamiliar word.','Check your answer against the context.'],[['The train leaves at half past eight.','Поезд отправляется в половине девятого.'],['The meeting is in room twelve.','Встреча проходит в комнате номер двенадцать.'],['Would you like tea or coffee?','Вы хотите чай или кофе?']],'Служебные слова часто звучат слабее ударных, поэтому фразы кажутся быстрее.','Function words are often weaker than stressed words, making phrases sound faster.'],
  ['listening','A2','Gist and detail','Gist and detail','Общий смысл и точные факты в аудио.','Overall meaning and precise details in audio.','Сначала определи тему и цель разговора. Затем ищи даты, причины, цены и договорённости.','Identify the topic and purpose first. Then listen for dates, reasons, prices and arrangements.','Говорящий может перефразировать информацию: слушай смысл, а не только ожидаемое слово.','A speaker may paraphrase information: listen for meaning, not just the expected word.',['Gist: кто говорит и о чём?','Detail: какая конкретная информация названа?','Attitude: как звучит отношение говорящего?'],['Gist: who is speaking and what is the topic?','Detail: what specific information is mentioned?','Attitude: what does the speaker sound like?'],[['The hotel is close to the station, but breakfast is not included.','Отель рядом со станцией, но завтрак не включён.'],['They moved the appointment to Thursday afternoon.','Они перенесли встречу на четверг после обеда.'],['The speaker sounds uncertain about the final price.','Говорящий не уверен в итоговой цене.']],'Записывай ключевые слова, а не полные предложения.','Write key words rather than full sentences.'],
  ['listening','B1','Connected speech','Connected speech','Связная речь, слабые формы и выпадение звуков.','Linking, weak forms and sound omission.','В естественной речи слова соединяются, а некоторые звуки ослабляются.','In natural speech, words link together and some sounds become weaker.','Слушай короткий фрагмент с транскриптом и повторяй целые смысловые группы.','Use a short clip with a transcript and repeat whole thought groups.',['Weak forms: to, for, and, of часто без ударения.','Linking: согласный соединяется со следующим гласным.','Elision: звук может выпадать в быстром потоке.'],['Weak forms: to, for, and, of are often unstressed.','Linking: a consonant connects to the next vowel.','Elision: a sound may be omitted in rapid speech.'],[['I want to go.','Я хочу пойти.'],['Turn it off.','Выключи это.'],['Next day.','На следующий день.']],'Не пытайся намеренно проглатывать звуки — сначала слушай и повторяй естественную речь.','Do not force yourself to drop sounds. Listen and repeat natural speech.'],
  ['listening','B2','Discourse markers','Discourse markers','Связки и их функции в устной речи.','Linking expressions and their functions in speech.','Well, actually, anyway и on the other hand помогают понять структуру мысли.','Words such as well, actually, anyway and on the other hand signal how an idea develops.','Одна связка может иметь разные функции в зависимости от интонации и ситуации.','A marker may perform different functions depending on intonation and context.',['Добавление: moreover, besides.','Контраст: however, whereas.','Уточнение: actually, in fact, I mean.'],['Addition: moreover, besides.','Contrast: however, whereas.','Clarification: actually, in fact, I mean.'],[['Actually, I was referring to the second proposal.','Вообще-то я имел в виду второе предложение.'],['On the other hand, the costs are relatively low.','С другой стороны, затраты сравнительно невелики.'],['Anyway, let us return to the main question.','В любом случае вернёмся к главному вопросу.']],'Определи функцию связки: добавление, контраст или поправка.','Identify the function: addition, contrast or correction.'],
  ['listening','C1','Accent and speaking rate','Accent and speaking rate','Разные акценты и естественный темп.','Different accents and natural speaking rates.','Продвинутое аудирование предполагает понимание разных голосов, темпов и вариантов произношения.','Advanced listening involves understanding different voices, rates and pronunciation varieties.','Используй короткие фрагменты разных говорящих: сначала без субтитров, затем с транскриптом.','Use short clips from different speakers: listen without subtitles first, then check the transcript.',['Сравнивай ритм и звуки без оценки акцента как правильного или неправильного.','Отмечай местные выражения и сокращения.','Тренируй понимание при естественном темпе.'],['Compare rhythm and sounds without judging an accent as right or wrong.','Notice local expressions and reductions.','Practise comprehension at natural speed.'],[['The interview contains several regional expressions.','В интервью встречается несколько региональных выражений.'],['The speaker hesitated before qualifying the statement.','Говорящий сделал паузу перед уточнением.'],['Despite the pace, the central argument remains clear.','Несмотря на темп, основной аргумент остаётся понятным.']],'Расширяй диапазон акцентов постепенно и тренируй устойчивое понимание.','Broaden your range gradually and build reliable comprehension.'],
  ['listening','C2','Subtext and speaker stance','Subtext and speaker stance','Подтекст, ирония, дистанция и скрытые оценки.','Subtext, irony, distance and implied evaluation.','Слушай не только содержание, но и намерение: собеседник может смягчать несогласие или выражать скепсис косвенно.','Listen for intention as well as content: a speaker may soften disagreement or imply scepticism indirectly.','Сопоставляй формулировку, ударение, паузы и контекст.','Combine wording, stress, pauses and context.',['Hedging смягчает категоричность.','Understatement намеренно преуменьшает значение.','Ирония может расходиться с буквальным смыслом.'],['Hedging softens certainty.','Understatement deliberately minimises significance.','Irony can differ from the literal meaning.'],[['That is one way of looking at it.','Это один из возможных взглядов.'],['It was not entirely successful.','Это было не вполне успешно.'],['With the greatest respect, I disagree.','При всём уважении, я не согласен.']],'Не приписывай говорящему намерение без нескольких контекстных сигналов.','Do not assign an intention without several contextual signals.'],

  ['speaking','A1','Introducing yourself','Introducing yourself','Короткое знакомство: имя, место, занятия и интересы.','A short introduction: name, place, activities and interests.','Представление строится из простых блоков. Не нужно рассказывать всё сразу.','An introduction uses simple blocks. You do not need to say everything at once.','Выражай одну мысль в одном предложении, затем добавь деталь или вопрос.','Express one idea per sentence, then add a detail or question.',['I am ... / I live in ... / I study ...','I like ... because ...','What about you? / Where are you from?'],['I am ... / I live in ... / I study ...','I like ... because ...','What about you? / Where are you from?'],[['I am a student and I live in a small town.','Я учусь и живу в небольшом городе.'],['I enjoy reading because it helps me relax.','Мне нравится читать, потому что это помогает расслабиться.'],['What do you like doing at weekends?','Чем ты любишь заниматься по выходным?']],'Подготовь несколько гибких фраз вместо длинного заученного монолога.','Prepare a few flexible phrases rather than a long memorised speech.'],
  ['speaking','A2','Keeping a conversation going','Keeping a conversation going','Уточняющие вопросы и естественные реакции.','Follow-up questions and natural responses.','Подхватывай детали из слов собеседника: короткая реакция показывает, что ты слушаешь.','Pick up details from what the other person says: a short reaction shows you are listening.','Используй схему: реакция + уточняющий вопрос.','Use the pattern: reaction + follow-up question.',['Really? That sounds interesting.','When did that happen? / Who were you with?','Was it difficult? / What happened next?'],['Really? That sounds interesting.','When did that happen? / Who were you with?','Was it difficult? / What happened next?'],[['I went hiking. — Really? Where did you go?','Я ходил в поход. — Правда? Куда именно?'],['I started learning French. — What made you choose it?','Я начал учить французский. — Почему ты выбрал его?'],['The journey was long. — How long did it take?','Путешествие было долгим. — Сколько оно заняло?']],'Не задавай вопросы один за другим без реакции на предыдущий ответ.','Do not ask one question after another without reacting to the answer.'],
  ['speaking','B1','Giving an opinion','Giving an opinion','Позиция, причина, пример и вывод.','Position, reason, example and conclusion.','Развёрнутый ответ может следовать простой логике: мнение, причина, пример и короткий итог.','An extended answer can follow a simple logic: opinion, reason, example and brief conclusion.','Связки помогают слушателю следить за ходом мысли.','Linking phrases help the listener follow your reasoning.',['In my view / I would say that ...','One reason is that ... / This is because ...','For example ... / That is why ...'],['In my view / I would say that ...','One reason is that ... / This is because ...','For example ... / That is why ...'],[['In my view, public libraries remain important.','На мой взгляд, публичные библиотеки остаются важными.'],['One reason is that they provide free access to information.','Одна из причин — они дают бесплатный доступ к информации.'],['That is why they should continue to receive support.','Поэтому их следует продолжать поддерживать.']],'Пример должен подтверждать твою причину, а не просто увеличивать длину ответа.','Your example should support your reason, not simply make the answer longer.'],
  ['speaking','B2','Structured discussion','Structured discussion','Тезис, альтернативная позиция и вывод.','A claim, an alternative view and a conclusion.','На B2 важно не только говорить бегло, но и управлять структурой ответа.','At B2, fluency matters, but so does the structure of your response.','Назови позицию, признай разумный контраргумент и объясни итоговый вывод.','State your position, acknowledge a reasonable counterargument and explain your conclusion.',['The main point I would make is ...','Admittedly / It is true that ...','Nevertheless / Even so ...'],['The main point I would make is ...','Admittedly / It is true that ...','Nevertheless / Even so ...'],[['Admittedly, online learning is flexible.','Безусловно, онлайн-обучение гибкое.'],['Nevertheless, direct interaction remains valuable.','Тем не менее непосредственное общение остаётся ценным.'],['A balanced approach would combine both formats.','Сбалансированный подход сочетал бы оба формата.']],'Рассматривай альтернативную позицию честно и отвечай на её сильный аргумент.','Consider the alternative position fairly and address its strongest argument.'],
  ['speaking','C1','Diplomatic disagreement','Diplomatic disagreement','Как оспаривать идеи, сохраняя конструктивный тон.','How to challenge ideas while staying constructive.','Отделяй критику аргумента от оценки человека. Используй смягчающие конструкции и точные оговорки.','Separate criticism of an argument from judgement of a person. Use hedging and precise qualifications.','Признай разумную часть чужой позиции, затем обозначь ограничение и альтернативу.','Acknowledge a reasonable part of the other view, then identify a limitation and an alternative.',['I take your point, although ...','I am not entirely convinced that ...','A possible alternative interpretation is ...'],['I take your point, although ...','I am not entirely convinced that ...','A possible alternative interpretation is ...'],[['I take your point, although the evidence seems less conclusive.','Я понимаю вашу мысль, хотя доказательства кажутся не столь убедительными.'],['I am not entirely convinced that this addresses the issue.','Я не вполне убеждён, что это решает проблему.'],['A possible alternative interpretation is that the effect is temporary.','Возможная интерпретация: эффект временный.']],'После вежливого вступления ясно сформулируй, с чем именно ты не согласен.','After a polite opening, state clearly what you disagree with.'],
  ['speaking','C2','Register and rhetorical flexibility','Register and rhetorical flexibility','Адаптация тона и детализации под аудиторию.','Adapting tone and detail to an audience.','Выбирай степень формальности, детализации и прямоты с учётом аудитории и цели.','Choose the degree of formality, detail and directness according to your audience and purpose.','Одна идея может стать кратким сообщением, подробным объяснением или публичным аргументом.','The same idea can become a brief message, a detailed explanation or a public argument.',['Для краткости: The central issue is ...','Для уточнения: To be more precise ...','Для вовлечения: What this means in practice is ...'],['For concision: The central issue is ...','For clarification: To be more precise ...','To engage: What this means in practice is ...'],[['The proposal is viable, provided that the timeline is revised.','Предложение реализуемо при условии пересмотра сроков.'],['The concern relates to implementation rather than principle.','Вопрос касается реализации, а не самого принципа.'],['What this means in practice is a more gradual transition.','На практике это означает более постепенный переход.']],'Сложность речи должна помогать коммуникации, а не демонстрировать словарный запас.','Complexity should serve communication, not showcase vocabulary.'],

  ['writing','A1','Word order and simple sentences','Word order and simple sentences','Понятные предложения с базовым порядком слов.','Clear sentences with basic word order.','Обычное английское утверждение чаще всего строится как Subject + Verb + Object.','A basic English statement usually follows Subject + Verb + Object.','Добавляй время и место после основной части предложения.','Add time and place after the core sentence.',['Подлежащее: кто или что?','Глагол: что происходит?','Дополнение: что или кого?'],['Subject: who or what?','Verb: what happens?','Object: what or whom?'],[['My brother plays tennis.','Мой брат играет в теннис.'],['We study English at school.','Мы изучаем английский в школе.'],['She reads every evening.','Она читает каждый вечер.']],'Не копируй русский порядок слов дословно: подлежащее в английском обычно обязательно.','Do not copy Russian word order directly: English usually requires a subject.'],
  ['writing','A2','Coherent paragraph','Coherent paragraph','Один абзац — одна основная мысль.','One paragraph, one main idea.','Первое предложение задаёт тему, следующие объясняют её или приводят пример.','The first sentence introduces the topic; the next sentences explain it or give an example.','Используй простые связки и следи, чтобы каждое предложение поддерживало главную мысль.','Use simple linking words and make each sentence support the main idea.',['Topic sentence — главная мысль.','Supporting sentences — детали и объяснение.','Closing sentence — короткий итог или переход.'],['Topic sentence — the main idea.','Supporting sentences — details and explanation.','Closing sentence — a brief conclusion or transition.'],[['My town is a pleasant place to live.','Мой город — приятное место для жизни.'],['It has several parks and a quiet centre.','В нём есть несколько парков и тихий центр.'],['For these reasons, I enjoy living here.','Поэтому мне нравится здесь жить.']],'Не начинай каждое предложение с And или But. Связки должны показывать связь идей.','Do not begin every sentence with And or But. Linking words should show a real connection.'],
  ['writing','B1','Emails and messages','Emails and messages','Тон, цель обращения и ясная структура письма.','Tone, purpose and clear email structure.','Перед написанием определи адресата, цель и уровень формальности.','Before writing, identify the reader, purpose and level of formality.','Раздели текст на причину обращения, основные детали и ожидаемое действие.','Organise the email around the reason for writing, key details and the expected action.',['Нейтрально: Hello / Hi; формально: Dear ...','Цель: I am writing to ask about ...','Завершение: Best wishes / Kind regards.'],['Neutral: Hello / Hi; formal: Dear ...','Purpose: I am writing to ask about ...','Closing: Best wishes / Kind regards.'],[['I am writing to ask whether the course is still open.','Пишу, чтобы узнать, открыт ли ещё набор на курс.'],['Could you please confirm the date of the meeting?','Не могли бы вы подтвердить дату встречи?'],['I look forward to your reply.','Буду ждать вашего ответа.']],'Не используй разговорные фразы в официальном письме, если ситуация этого не допускает.','Avoid casual phrases in a formal email unless the context allows them.'],
  ['writing','B2','Essay structure','Essay structure','Тезис и аргументы, которые его последовательно поддерживают.','A thesis and arguments that support it logically.','Эссе должно отвечать на вопрос. Каждый абзац раскрывает отдельный аргумент, а вывод собирает общую позицию.','An essay must answer the task. Each paragraph develops one argument, and the conclusion brings the position together.','Сформулируй тезис до начала текста и выбери аргументы, которые его поддерживают.','Define your thesis before drafting and choose arguments that support it.',['Введение: тема и ясный тезис.','Основная часть: причина, объяснение, пример.','Заключение: синтез аргументов без новых идей.'],['Introduction: topic and clear thesis.','Body: reason, explanation and example.','Conclusion: synthesise the argument without adding new points.'],[['One major advantage of public transport is reduced congestion.','Одно из преимуществ общественного транспорта — уменьшение пробок.'],['This is particularly relevant in densely populated cities.','Это особенно важно для густонаселённых городов.'],['Investment should focus on reliability as well as coverage.','Инвестиции должны поддерживать и надёжность, и охват.']],'Один абзац — один ведущий аргумент. Не повторяй тезис без развития мысли.','Give each paragraph one main argument. Do not repeat the thesis without developing it.'],
  ['writing','C1','Analytical report','Analytical report','Выводы, доказательства и рекомендации в отчёте.','Findings, evidence and recommendations in a report.','Отчёт должен помогать читателю быстро найти задачу, результаты, интерпретацию и следующие действия.','A report should help readers locate the purpose, findings, interpretation and next steps.','Сначала обозначь задачу и метод, затем представь результаты и рекомендации.','State the purpose and method, then present findings and recommendations.',['Executive summary — краткий итог.','Findings — факты и результаты.','Recommendations — конкретные шаги.'],['Executive summary — concise overview.','Findings — facts and results.','Recommendations — concrete next steps.'],[['The survey indicates a preference for flexible scheduling.','Опрос показывает предпочтение гибкому расписанию.'],['The sample is limited and should be considered.','Выборка ограничена, и это нужно учитывать.'],['It is recommended that the trial be extended.','Рекомендуется продлить пробный период.']],'Рекомендации должны вытекать из данных. Указывай ограничения метода.','Recommendations should follow from evidence. State methodological limitations.'],
  ['writing','C2','Style and editing','Style and editing','Точность, ритм и информационная плотность текста.','Precision, rhythm and information density.','Редактура на C2 — не только исправление ошибок, но и настройка текста под аудиторию.','At C2, editing is not only correction; it is also adapting a text to its audience.','Сначала проверь аргумент и структуру, затем связность и выбор слов, потом пунктуацию.','Check argument and structure first, then cohesion and word choice, and finally punctuation.',['Убирай повторы без смысловой функции.','Чередуй короткие и длинные предложения осознанно.','Проверяй, не скрывает ли сложная конструкция простую мысль.'],['Remove repetition that serves no purpose.','Vary sentence length deliberately.','Check whether complexity obscures a simple idea.'],[['The evidence is suggestive, though not conclusive.','Доказательства показательны, хотя и не окончательны.'],['A more precise formulation is to distinguish access from participation.','Точнее будет различать доступ и участие.'],['The final paragraph brings the argument into focus.','Последний абзац делает аргументацию чётче.']],'Сильный текст не обязательно сложный. Убирай всё, что не улучшает точность, логику или тон.','Strong writing is not necessarily complicated. Remove anything that does not improve precision, logic or tone.']
  ];

  const lessons = rows.map((r, index) => ({
    id:r[0]+'-'+r[1].toLowerCase(), category:r[0], level:r[1], title:[r[2],r[3]],
    summary:[r[4],r[5]], intro:[r[6],r[7]], section:[r[8],r[9]],
    points:r[10].map((text,i)=>[text,r[11][i]]),
    examples:r[12].map(e=>({en:e[0],ru:e[1]})), tip:[r[13],r[14]], minutes:5+(index%5)
  }));

  const search = root.querySelector('[data-kb-search]');
  const level = root.querySelector('[data-kb-level]');
  const grid = root.querySelector('[data-kb-grid]');
  const article = root.querySelector('[data-kb-article]');
  const count = root.querySelector('[data-kb-count]');
  const reset = root.querySelector('[data-kb-reset]');
  const categoryButtons = [...root.querySelectorAll('[data-kb-category]')];
  let activeCategory = 'all';
  const initialNoteId = new URLSearchParams(window.location.search).get('note');
  let selectedId = initialNoteId && lessons.some(item => item.id === initialNoteId) ? initialNoteId : 'grammar-a1';
  const language = () => document.documentElement.lang === 'en' ? 1 : 0;
  const tr = value => Array.isArray(value) ? value[language()] : (value || '');
  const make = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  const noteProgress = new Map();
  let collectionCache = null;
  const exportStatus = root.querySelector('[data-kb-export-status]');
  async function knowledgeApi(path, options = {}) {
    const response = await fetch('/api/knowledge' + path, {
      credentials: 'same-origin', ...options,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Не удалось сохранить учебные данные.');
    return data;
  }
  function notePayload(item) {
    return { title: tr(item.title), summary: tr(item.summary), category: item.category, level: item.level };
  }
  async function loadPersonalCollections() {
    if (collectionCache) return collectionCache;
    const data = await knowledgeApi('/library');
    collectionCache = data.collections || [];
    return collectionCache;
  }
  async function recordNoteOpen(item) {
    const data = await knowledgeApi('/notes/' + encodeURIComponent(item.id) + '/open', {
      method: 'POST', body: JSON.stringify(notePayload(item))
    });
    noteProgress.set(item.id, { ...(noteProgress.get(item.id) || {}), ...data.progress });
    return data.progress;
  }
  function speakEnglish(text) {
    if (!('speechSynthesis' in window)) {
      window.alert(language() ? 'Speech is not supported in this browser.' : 'Озвучивание не поддерживается этим браузером.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; utterance.rate = 0.88;
    window.speechSynthesis.speak(utterance);
  }
  async function exportLessonsPdf(items, filename) {
    if (!items.length) throw new Error(language() ? 'There are no notes to export.' : 'Нет конспектов для экспорта.');
    if (typeof window.html2pdf !== 'function') throw new Error(language() ? 'PDF module is unavailable.' : 'Модуль создания PDF не загружен.');
    const bundle = make('div', 'knowledge-pdf-bundle');
    Object.assign(bundle.style, {
      display: 'block', width: '680px', maxWidth: '680px', minWidth: '680px',
      boxSizing: 'border-box', padding: '0', margin: '0', background: '#fff',
      color: '#17212b', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '12px',
      lineHeight: '1.65', position: 'absolute', left: '0', top: '0', zIndex: '99999',
      overflow: 'visible'
    });
    items.forEach((item, index) => {
      const page = make('section', 'knowledge-pdf-page');
      Object.assign(page.style, {
        display: 'block', width: '680px', boxSizing: 'border-box', padding: '12px 0 20px',
        background: '#fff', pageBreakBefore: index ? 'always' : 'auto', breakBefore: index ? 'page' : 'auto'
      });
      const brand = make('p', '', 'QUIET ENGLISH · KNOWLEDGE BASE');
      Object.assign(brand.style, { margin: '0 0 18px', padding: '0 0 10px', borderBottom: '1px solid #ddd', color: '#777', fontSize: '9px', letterSpacing: '2px' });
      const meta = make('p', '', item.level + ' · ' + tr(cats[item.category]));
      Object.assign(meta.style, { margin: '0 0 8px', color: '#777', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase' });
      const title = make('h1', '', tr(item.title));
      Object.assign(title.style, { margin: '0 0 10px', color: '#17212b', fontSize: '27px', lineHeight: '1.2', fontWeight: '500' });
      const summary = make('p', '', tr(item.summary));
      Object.assign(summary.style, { margin: '0 0 18px', color: '#444', fontSize: '13px' });
      const callout = make('div', '', '');
      Object.assign(callout.style, { margin: '16px 0', padding: '14px 16px', background: '#f3f4f4', borderRadius: '8px' });
      const introTitle = make('strong', '', language() ? 'Main idea' : 'Главная идея');
      const intro = make('p', '', tr(item.intro));
      Object.assign(intro.style, { margin: '5px 0 0', color: '#333' });
      callout.append(introTitle, intro);
      const ruleTitle = make('h2', '', language() ? 'Core rule' : 'Правило и структура');
      Object.assign(ruleTitle.style, { margin: '20px 0 8px', fontSize: '17px', fontWeight: '600' });
      const rule = make('p', '', tr(item.section));
      Object.assign(rule.style, { margin: '0 0 10px', color: '#333' });
      const points = make('ul', '', '');
      Object.assign(points.style, { margin: '0 0 18px', paddingLeft: '21px' });
      item.points.forEach(point => {
        const li = make('li', '', tr(point));
        Object.assign(li.style, { margin: '5px 0', color: '#333' }); points.append(li);
      });
      const examplesTitle = make('h2', '', language() ? 'Examples in context' : 'Примеры в контексте');
      Object.assign(examplesTitle.style, { margin: '20px 0 8px', fontSize: '17px', fontWeight: '600' });
      const exampleList = make('div', '', '');
      item.examples.forEach(example => {
        const card = make('div', '', '');
        Object.assign(card.style, { margin: '8px 0', padding: '11px 13px', border: '1px solid #ddd', borderRadius: '7px', breakInside: 'avoid' });
        const en = make('p', '', example.en); Object.assign(en.style, { margin: '0 0 5px', fontWeight: '600', color: '#17212b' });
        const ru = make('p', '', example.ru); Object.assign(ru.style, { margin: '0', color: '#555' });
        card.append(en, ru); exampleList.append(card);
      });
      const tip = make('div', '', '');
      Object.assign(tip.style, { margin: '18px 0 0', padding: '13px 15px', border: '1px solid #ddd', borderRadius: '7px', breakInside: 'avoid' });
      const tipTitle = make('strong', '', language() ? 'Remember' : 'Обрати внимание');
      const tipBody = make('p', '', tr(item.tip)); Object.assign(tipBody.style, { margin: '5px 0 0', color: '#444' });
      tip.append(tipTitle, tipBody);
      page.append(brand, meta, title, summary, callout, ruleTitle, rule, points, examplesTitle, exampleList, tip);
      bundle.append(page);
    });
    document.body.append(bundle);
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      await window.html2pdf().set({
        margin: [13, 14, 15, 14], filename,
        image: { type: 'jpeg', quality: 0.97 },
        html2canvas: {
          scale: 2, useCORS: true, backgroundColor: '#fff', scrollX: 0, scrollY: 0,
          windowWidth: 794, windowHeight: 1123,
          onclone: clonedDocument => {
            const clonedBundle = clonedDocument.querySelector('.knowledge-pdf-bundle');
            if (!clonedBundle) return;
            Object.assign(clonedBundle.style, {
              display: 'block', width: '680px', minWidth: '680px', maxWidth: '680px',
              position: 'static', left: 'auto', top: 'auto', margin: '0', padding: '0',
              overflow: 'visible', transform: 'none'
            });
            clonedBundle.querySelectorAll('.knowledge-pdf-page').forEach(page => {
              page.style.width = '680px'; page.style.minWidth = '680px'; page.style.maxWidth = '680px';
            });
          }
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.knowledge-pdf-page h1', '.knowledge-pdf-page li'] }
      }).from(bundle).save();
    } finally { bundle.remove(); }
  }


  function setPlaceholder() {
    search.placeholder = language() ? 'e.g. Present Perfect, articles, essay' : 'Например: Present Perfect, артикли, эссе';
  }
  function filteredLessons() {
    const q = search.value.trim().toLocaleLowerCase();
    return lessons.filter(item => {
      if (level.value !== 'all' && item.level !== level.value) return false;
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      if (!q) return true;
      const haystack = [item.level,tr(item.title),tr(item.summary),tr(item.intro),tr(item.section),...item.points.map(tr),...item.examples.flatMap(x=>[x.en,x.ru]),tr(item.tip),tr(cats[item.category])].join(' ').toLocaleLowerCase();
      return haystack.includes(q);
    });
  }
  function renderArticle(item) {
    article.replaceChildren();
    if (!item) { article.hidden = true; return; }
    article.hidden = false;
    document.title = tr(item.title) + ' — Quiet English';
    const head = make('div','knowledge-article-head');
    const meta = make('div','knowledge-article-meta');
    meta.append(make('span','knowledge-level-tag',item.level),make('span','knowledge-category-label',tr(cats[item.category])),make('span','knowledge-reading-time',language()?item.minutes+' min read':item.minutes+' мин чтения'));
    head.append(meta,make('h2','',tr(item.title)),make('p','knowledge-article-summary',tr(item.summary)));
    article.append(head);
    const callout = make('div','knowledge-callout');
    callout.append(make('strong','',language()?'Main idea':'Главная идея'),make('p','',tr(item.intro)));
    article.append(callout);
    const section = make('section','knowledge-article-section');
    section.append(make('h3','',language()?'Core rule':'Правило и структура'),make('p','',tr(item.section)));
    const list = make('ul','knowledge-point-list');
    item.points.forEach(point=>list.append(make('li','',tr(point))));
    section.append(list);
    article.append(section);
    const examples = make('section','knowledge-examples-section');
    examples.append(make('h3','',language()?'Examples in context':'Примеры в контексте'));
    const listExamples = make('div','knowledge-example-list');
    item.examples.forEach(example=>{
      const card = make('div','knowledge-example');
      const english = make('p','knowledge-example-en',example.en);
      const russian = make('p','knowledge-example-ru',example.ru); russian.hidden = true;
      const controls = make('div','knowledge-example-controls');
      const listen = make('button','knowledge-example-action',language() ? '▶ Listen' : '▶ Прослушать');
      listen.type = 'button'; listen.addEventListener('click', () => speakEnglish(example.en));
      const reveal = make('button','knowledge-example-action',language() ? 'Show translation' : 'Показать перевод');
      reveal.type = 'button';
      reveal.addEventListener('click', () => {
        russian.hidden = !russian.hidden;
        reveal.textContent = russian.hidden ? (language() ? 'Show translation' : 'Показать перевод') : (language() ? 'Hide translation' : 'Скрыть перевод');
      });
      controls.append(listen, reveal); card.append(english, russian, controls); listExamples.append(card);
    });
    examples.append(listExamples);
    article.append(examples);
    const tip = make('aside','knowledge-tip');
    tip.append(make('strong','',language()?'Remember':'Обрати внимание'),make('p','',tr(item.tip)));
    article.append(tip);
    const footer = make('div','knowledge-article-footer');
    footer.append(make('span','',language()?'QUIET ENGLISH · KNOWLEDGE BASE':'QUIET ENGLISH · БАЗА ЗНАНИЙ'));
    const actions = make('div','knowledge-article-actions');
    const noteMeta = notePayload(item);
    let state = noteProgress.get(item.id) || { is_favorite: false, is_read: false };
    const favoriteButton = make('button','knowledge-print-button');
    const readButton = make('button','knowledge-print-button');
    const quizButton = make('button','knowledge-print-button',language() ? 'Take topic quiz ↗' : 'Пройти тест по теме ↗');
    const collectionSelect = make('select','knowledge-collection-select');
    const collectionButton = make('button','knowledge-print-button',language() ? 'Add to collection' : 'В подборку');
    const actionStatus = make('span','knowledge-action-status','');
    function syncNoteActions() {
      favoriteButton.textContent = state.is_favorite ? (language() ? '★ Saved' : '★ В избранном') : (language() ? '☆ Add to favourites' : '☆ В избранное');
      readButton.textContent = state.is_read ? (language() ? '✓ Read' : '✓ Прочитано') : (language() ? 'Mark as read' : 'Отметить прочитанным');
    }
    async function updateNote(patch) {
      favoriteButton.disabled = true; readButton.disabled = true;
      try {
        const data = await knowledgeApi('/notes/' + encodeURIComponent(item.id), { method: 'PUT', body: JSON.stringify({ ...noteMeta, ...patch }) });
        state = { ...state, ...data.progress }; noteProgress.set(item.id, state); syncNoteActions();
        actionStatus.textContent = language() ? 'Saved to your profile.' : 'Сохранено в профиле.';
        actionStatus.classList.remove('error-text');
      } catch (error) { actionStatus.textContent = error.message; actionStatus.classList.add('error-text'); }
      finally { favoriteButton.disabled = false; readButton.disabled = false; }
    }
    favoriteButton.type = 'button'; favoriteButton.addEventListener('click', () => updateNote({ is_favorite: !state.is_favorite }));
    readButton.type = 'button'; readButton.addEventListener('click', () => updateNote({ is_read: !state.is_read }));
    quizButton.type = 'button';
    quizButton.addEventListener('click', () => {
      try {
        sessionStorage.setItem('qe-knowledge-quiz', JSON.stringify({ note_id: item.id, title: tr(item.title), summary: tr(item.summary), category: item.category, level: item.level }));
        window.location.href = '/practice.html';
      } catch { actionStatus.textContent = language() ? 'Could not start the quiz.' : 'Не удалось запустить тест.'; }
    });
    collectionSelect.setAttribute('aria-label', language() ? 'Choose a collection' : 'Выбрать подборку');
    const placeholder = make('option','',language() ? 'Choose a collection…' : 'Выбери подборку…'); placeholder.value = ''; collectionSelect.append(placeholder);
    collectionButton.type = 'button';
    collectionButton.addEventListener('click', async () => {
      collectionButton.disabled = true;
      try {
        if (!collectionSelect.value) throw new Error(language() ? 'Create or choose a collection first.' : 'Сначала создай или выбери подборку.');
        await knowledgeApi('/collections/' + encodeURIComponent(collectionSelect.value) + '/notes', { method: 'POST', body: JSON.stringify({ note_id: item.id }) });
        actionStatus.textContent = language() ? 'Added to collection.' : 'Добавлено в подборку.';
        actionStatus.classList.remove('error-text');
      } catch (error) { actionStatus.textContent = error.message; actionStatus.classList.add('error-text'); }
      finally { collectionButton.disabled = false; }
    });
    syncNoteActions();
    Promise.all([
      recordNoteOpen(item).then(value => { state = { ...state, ...value }; syncNoteActions(); }).catch(() => {}),
      loadPersonalCollections().then(collections => collections.forEach(collection => {
        const option = make('option','',collection.name); option.value = collection.id; collectionSelect.append(option);
      })).catch(() => {
        const option = make('option','',language() ? 'Sign in to save notes' : 'Войди, чтобы сохранять конспекты');
        option.disabled = true; collectionSelect.append(option);
      })
    ]);
    const printButton = make('button','knowledge-print-button',language()?'Download PDF ↓':'Скачать PDF ↓');
    printButton.type = 'button';
    printButton.setAttribute('aria-label',language()?'Download this note as a PDF file':'Скачать этот конспект PDF-файлом');
    printButton.addEventListener('click', async () => {
      if (typeof window.html2pdf !== 'function') {
        window.alert(language()
          ? 'The PDF download module did not load. Check your internet connection and reload the page.'
          : 'Модуль создания PDF не загрузился. Проверь подключение к интернету и обнови страницу.');
        return;
      }

      const previousLabel = printButton.textContent;
      printButton.disabled = true;
      printButton.textContent = language() ? 'Creating PDF…' : 'Создаём PDF…';

      try {
        if (document.fonts?.ready) await document.fonts.ready;
        const safeTitle = tr(item.title)
          .normalize('NFKD')
          .replace(/[^a-z0-9\u0400-\u04FF]+/gi, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 60) || 'English-note';
        const filename = item.level + '_' + safeTitle + '_Quiet-English.pdf';

        const options = {
          margin: [14, 14, 16, 14],
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0,
            // Use a fixed desktop-sized canvas so responsive grid rules cannot
            // collapse the article to the width of its on-screen sidebar column.
            windowWidth: 794,
            windowHeight: 1123,
            onclone: clonedDocument => {
              // html2pdf renders its own copy inside .html2pdf__container.
              // Do not select the live page article or move the copy outside
              // that container: html2canvas captures the container itself.
              const pdfContainer = clonedDocument.querySelector('.html2pdf__container');
              const clonedArticle = pdfContainer?.querySelector('.knowledge-article')
                || Array.from(clonedDocument.querySelectorAll('.knowledge-article')).at(-1);
              if (!clonedArticle) return;

              if (pdfContainer) {
                Object.assign(pdfContainer.style, {
                  display: 'block',
                  position: 'relative',
                  width: '680px',
                  minWidth: '680px',
                  maxWidth: '680px',
                  height: 'auto',
                  minHeight: '0',
                  maxHeight: 'none',
                  margin: '0',
                  padding: '0',
                  overflow: 'visible',
                  background: '#ffffff'
                });
              }

              Object.assign(clonedArticle.style, {
                display: 'block',
                position: 'static',
                top: 'auto',
                left: 'auto',
                right: 'auto',
                float: 'none',
                transform: 'none',
                boxSizing: 'border-box',
                width: '680px',
                maxWidth: '680px',
                minWidth: '680px',
                margin: '0',
                padding: '0',
                border: '0',
                borderRadius: '0',
                boxShadow: 'none',
                background: '#ffffff',
                overflow: 'visible'
              });
              clonedArticle.style.setProperty('width', '680px', 'important');
              clonedArticle.style.setProperty('max-width', '680px', 'important');
              clonedArticle.style.setProperty('min-width', '680px', 'important');

              const actions = clonedArticle.querySelector('.knowledge-article-actions');
              if (actions) actions.remove();

              const brand = clonedDocument.createElement('p');
              brand.textContent = 'QUIET ENGLISH · KNOWLEDGE BASE';
              Object.assign(brand.style, {
                margin: '0 0 18px',
                padding: '0 0 10px',
                borderBottom: '1px solid #e5e5e5',
                color: '#777777',
                fontSize: '9px',
                letterSpacing: '2px',
                fontFamily: 'Inter, Arial, sans-serif'
              });
              clonedArticle.insertBefore(brand, clonedArticle.firstChild);
            }
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'], avoid: ['.knowledge-callout', '.knowledge-article-section', '.knowledge-example', '.knowledge-tip'] }
        };

        await window.html2pdf().set(options).from(article).save();
      } catch (error) {
        console.error('PDF download failed:', error);
        window.alert(language()
          ? 'The PDF could not be created. Please try again.'
          : 'Не удалось создать PDF. Попробуй ещё раз.');
      } finally {
        printButton.disabled = false;
        printButton.textContent = previousLabel;
      }
    });
    const practice = make('a','button knowledge-practice-link',language()?'Practise this topic ↗':'Закрепить тему ↗');
    practice.href='/practice.html';
    actions.append(favoriteButton, readButton, quizButton, collectionSelect, collectionButton, printButton, practice);
    footer.append(actions, actionStatus);
    article.append(footer);
  }
  function render() {
    const filtered = filteredLessons();
    grid.replaceChildren();
    count.textContent = language() ? filtered.length+' notes' : filtered.length+' '+(filtered.length===1?'конспект':filtered.length>1&&filtered.length<5?'конспекта':'конспектов');
    if (!filtered.length) {
      const empty=make('div','knowledge-empty');
      empty.append(make('strong','',language()?'No notes found':'Ничего не найдено'),make('p','',language()?'Try another search or clear the filters.':'Попробуй изменить запрос или сбросить фильтры.'));
      grid.append(empty); renderArticle(null); return;
    }
    if (!filtered.some(item=>item.id===selectedId)) selectedId=filtered[0].id;
    filtered.forEach(item=>{
      const card=make('button','knowledge-card'+(item.id===selectedId?' is-active':''));
      card.type='button'; card.setAttribute('aria-pressed',String(item.id===selectedId));
      const meta=make('span','knowledge-card-meta');
      meta.append(make('span','knowledge-level-tag',item.level),make('span','knowledge-category-label',tr(cats[item.category])));
      card.append(meta,make('strong','knowledge-card-title',tr(item.title)),make('span','knowledge-card-summary',tr(item.summary)));
      const foot=make('span','knowledge-card-footer');
      foot.append(make('span','',language()?item.minutes+' min':item.minutes+' мин'),make('span','knowledge-card-arrow','↗'));
      card.append(foot);
      card.addEventListener('click',()=>{
        selectedId=item.id;
        grid.querySelectorAll('.knowledge-card').forEach(button=>{
          const active=button===card;
          button.classList.toggle('is-active',active);
          button.setAttribute('aria-pressed',String(active));
        });
        renderArticle(item);
      });
      grid.append(card);
    });
    renderArticle(filtered.find(item=>item.id===selectedId));
  }
  categoryButtons.forEach(button=>button.addEventListener('click',()=>{
    activeCategory=button.dataset.kbCategory||'all';
    categoryButtons.forEach(other=>{
      const active=other===button;
      other.classList.toggle('is-active',active);
      other.setAttribute('aria-pressed',String(active));
    });
    render();
  }));
  search.addEventListener('input',render);
  level.addEventListener('change',render);
  reset.addEventListener('click',()=>{
    search.value=''; level.value='all'; activeCategory='all';
    categoryButtons.forEach(button=>{
      const active=button.dataset.kbCategory==='all';
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    setPlaceholder(); render();
  });
  const exportVisibleButton = root.querySelector('[data-kb-export-visible]');
  const exportLevelButton = root.querySelector('[data-kb-export-level]');
  const exportLevelSelect = root.querySelector('[data-kb-export-cefr]');
  async function runPdfExport(items, label) {
    if (exportStatus) { exportStatus.textContent = language() ? 'Preparing your PDF…' : 'Подготавливаем PDF…'; exportStatus.classList.remove('error-text'); }
    if (exportVisibleButton) exportVisibleButton.disabled = true;
    if (exportLevelButton) exportLevelButton.disabled = true;
    try {
      await exportLessonsPdf(items, 'Quiet-English-' + label.replace(/[^A-Z0-9-]/gi, '-') + '-collection.pdf');
      if (exportStatus) exportStatus.textContent = language() ? 'The PDF file was downloaded.' : 'PDF-файл скачан.';
    } catch (error) {
      if (exportStatus) { exportStatus.textContent = error.message || (language() ? 'PDF export failed.' : 'Не удалось создать PDF.'); exportStatus.classList.add('error-text'); }
    } finally { if (exportVisibleButton) exportVisibleButton.disabled = false; if (exportLevelButton) exportLevelButton.disabled = false; }
  }
  exportVisibleButton?.addEventListener('click', () => runPdfExport(filteredLessons(), 'visible-notes'));
  exportLevelButton?.addEventListener('click', () => {
    const targetLevel = exportLevelSelect?.value || 'A1';
    runPdfExport(lessons.filter(item => item.level === targetLevel), targetLevel);
  });
  window.addEventListener('quietenglish:languagechange',()=>{setPlaceholder();render();});
  setPlaceholder();
  if (initialNoteId && lessons.some(item => item.id === initialNoteId)) {
    const initial = lessons.find(item => item.id === initialNoteId);
    level.value = initial.level; activeCategory = initial.category;
    categoryButtons.forEach(button => {
      const active = button.dataset.kbCategory === initial.category;
      button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active));
    });
  }
  render();
  const collectionId = new URLSearchParams(window.location.search).get('collection');
  if (collectionId) {
    knowledgeApi('/collections/' + encodeURIComponent(collectionId)).then(data => {
      const ids = new Set(data.collection.note_ids || []);
      return runPdfExport(lessons.filter(item => ids.has(item.id)), 'collection-' + data.collection.name);
    }).catch(error => {
      if (exportStatus) { exportStatus.textContent = error.message; exportStatus.classList.add('error-text'); }
    });
  }

  const offlineSaveButton = document.querySelector('[data-knowledge-save-offline]');
  offlineSaveButton?.addEventListener('click', async () => {
    const article = document.querySelector('[data-kb-article]');
    const content = article?.innerText?.trim() || '';
    const title = article?.querySelector('h2')?.textContent?.trim() || 'Quiet English knowledge note';
    const status = document.querySelector('[data-kb-export-status]');
    if (!content || content.length < 80) {
      if (status) status.textContent = 'Сначала открой конспект, который нужно сохранить.';
      return;
    }
    try {
      if (!window.QuietOffline) throw new Error('Офлайн-хранилище недоступно.');
      await window.QuietOffline.save({
        id: 'knowledge-' + title.toLowerCase().replace(/[^a-z0-9а-я]+/giu, '-').slice(0, 70),
        type: 'knowledge',
        title: title,
        content: content
      });
      if (status) status.textContent = 'Конспект сохранён на этом устройстве.';
    } catch (error) {
      if (status) status.textContent = error.message || 'Не удалось сохранить конспект.';
    }
  });

})();