import { compareTranscript } from '/pronunciation-scoring.js';
import { readLocalPronunciationHistory, saveLocalPronunciationAttempt } from '/pronunciation-storage.js';
import { PASSAGES, buildProgressSeries, getReviewWords } from '/pronunciation-content.js';

const pronRoot = document.querySelector('[data-pronunciation-page]');

if (pronRoot) {
  const statusNode = pronRoot.querySelector('[data-pron-status]');
  const recordButton = pronRoot.querySelector('[data-record]');
  const recordLabel = pronRoot.querySelector('[data-record-label]');
  const timerNode = pronRoot.querySelector('[data-record-timer]');
  const consent = pronRoot.querySelector('[data-pron-consent]');
  const promptList = pronRoot.querySelector('[data-pron-prompts]');
  const levelFilter = pronRoot.querySelector('[data-pron-level]');
  const topicFilter = pronRoot.querySelector('[data-pron-topic]');
  const generateButton = pronRoot.querySelector('[data-generate-passage]');
  const aiGeneratorStatus = pronRoot.querySelector('[data-ai-generator-status]');
  const activeTaskNode = pronRoot.querySelector('[data-pron-active-task]');
  const retryPanel = pronRoot.querySelector('[data-pron-retry]');
  const retryTextNode = pronRoot.querySelector('[data-pron-retry-text]');
  const repeatErrorsButton = pronRoot.querySelector('[data-repeat-errors]');
  const progressChart = pronRoot.querySelector('[data-pron-chart]');
  const chartEmpty = pronRoot.querySelector('[data-pron-chart-empty]');
  const progressCount = pronRoot.querySelector('[data-pron-progress-count]');
  const engineBadge = pronRoot.querySelector('[data-engine-status]');
  const resultSection = pronRoot.querySelector('[data-pron-result]');

  const MAX_SECONDS = 28;
  const MODEL_ID = 'onnx-community/whisper-tiny.en';
  const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2';

  let transcriberPromise = null;
  let recorder = null;
  let mediaStream = null;
  let chunks = [];
  let startedAt = 0;
  let clockId = null;
  let autoStopId = null;
  let activeReviewText = '';
  let lastReviewWords = [];
  let recordingReferenceText = '';
  let generatedPassages = [];
  let recentHistoryTexts = [];
  let lastTranslationPair = null;
  let lastStatusPair = null;
  let lastGeneratorPair = null;
  let latestAttempts = [];
  let latestResult = null;

  const t = (ru, en) => {
    lastTranslationPair = [ru, en];
    return document.documentElement.lang === 'en' ? en : ru;
  };
  const message = (text, error = false) => {
    lastStatusPair = lastTranslationPair && lastTranslationPair.includes(text) ? lastTranslationPair : null;
    statusNode.textContent = text;
    statusNode.classList.toggle('error-text', error);
    statusNode.classList.toggle('success-text', !error);
  };
  const generatorStatus = (text, error = false) => {
    lastGeneratorPair = lastTranslationPair && lastTranslationPair.includes(text) ? lastTranslationPair : null;
    aiGeneratorStatus.textContent = text;
    aiGeneratorStatus.classList.toggle('error-text', error);
  };

  const selectedPrompt = () => promptList.querySelector('input[name="pron-prompt"]:checked');
  const allPassages = () => [...generatedPassages, ...PASSAGES];
  const selectedPassage = () => allPassages().find(item => item.id === selectedPrompt()?.dataset.passageId);
  const selectedText = () => activeReviewText || selectedPrompt()?.value || PASSAGES[0].text;

  const formatTime = seconds => {
    const safe = Math.max(0, Math.floor(seconds));
    return String(Math.floor(safe / 60)).padStart(2, '0') + ':' + String(safe % 60).padStart(2, '0');
  };

  const updateRecordAvailability = () => {
    recordButton.disabled = !consent.checked && !recorder;
  };

  function updateActiveTask() {
    if (!activeTaskNode) return;
    activeTaskNode.textContent = activeReviewText
      ? t('Режим повторения: ', 'Review mode: ') + activeReviewText
      : t('Выбрано: ', 'Selected: ') + (selectedPassage()?.level || 'A1') + ' · ' + (selectedPassage()?.topic || 'Everyday life');
  }

  function speakText(text) {
    if (!('speechSynthesis' in window)) {
      message(t('В этом браузере недоступно воспроизведение примера.', 'Example playback is not available in this browser.'), true);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    window.speechSynthesis.speak(utterance);
  }

  function renderPassages(preferredId = '') {
    const level = levelFilter.value;
    const library = allPassages();
    const visiblePassages = level === 'ALL'
      ? library
      : library.filter(item => item.level === level);
    const currentId = preferredId || selectedPrompt()?.dataset.passageId || PASSAGES[0].id;
    const selectedId = visiblePassages.some(item => item.id === currentId)
      ? currentId
      : visiblePassages[0]?.id;

    promptList.replaceChildren();

    visiblePassages.forEach(item => {
      const card = document.createElement('div');
      card.className = 'pron-prompt' + (item.id === selectedId ? ' selected' : '');

      const label = document.createElement('label');
      label.className = 'pron-prompt-choice';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'pron-prompt';
      radio.value = item.text;
      radio.dataset.passageId = item.id;
      radio.checked = item.id === selectedId;

      const words = document.createElement('span');
      words.className = 'pron-prompt-content';
      const meta = document.createElement('strong');
      meta.className = 'pron-prompt-meta';
      meta.textContent = item.level + ' · ' + item.topic + (item.generated ? ' · AI' : '');
      const passage = document.createElement('span');
      passage.className = 'pron-prompt-body';
      passage.textContent = item.text;
      words.append(meta);
      if (item.title) {
        const title = document.createElement('em');
        title.className = 'pron-prompt-title';
        title.textContent = item.title;
        words.append(title);
      }
      words.append(passage);
      label.append(radio, words);

      const listen = document.createElement('button');
      listen.className = 'pron-listen';
      listen.type = 'button';
      listen.textContent = '▶';
      listen.setAttribute('aria-label', t('Прослушать текст уровня ', 'Listen to the ') + item.level + t('', ' passage'));
      listen.dataset.ariaLabelRu = 'Прослушать текст уровня ' + item.level;
      listen.dataset.ariaLabelEn = 'Listen to the ' + item.level + ' passage';
      listen.addEventListener('click', () => speakText(item.text));

      card.append(label, listen);
      promptList.append(card);
    });

    const count = visiblePassages.length;
    const nounRu = count === 1 ? ' задание' : count >= 2 && count <= 4 ? ' задания' : ' заданий';
    pronRoot.querySelector('[data-pron-count]').textContent = count + (document.documentElement.lang === 'en' ? (count === 1 ? ' passage' : ' passages') : nounRu);
    updateActiveTask();
  }

  async function generateNewPassage() {
    if (generateButton.disabled) return;

    const level = levelFilter.value === 'ALL'
      ? (selectedPassage()?.level || 'A1')
      : levelFilter.value;
    const topic = topicFilter.value;
    generateButton.disabled = true;
    generateButton.textContent = t('Создаём…', 'Generating…');
    generatorStatus(t('ИИ создаёт новый текст. Это может занять несколько секунд.', 'AI is creating a new passage. This may take a few seconds.'));
    aiGeneratorStatus.classList.remove('error-text');

    const avoid = [
      ...generatedPassages.map(item => item.text),
      ...recentHistoryTexts
    ].filter(Boolean).slice(0, 4);

    try {
      const response = await fetch('/api/speaking/generate', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, topic, avoid })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || t('Не удалось создать новое задание.', 'Could not create a new passage.'));
      }

      const result = data.passage;
      if (!result || result.level !== level || typeof result.passage !== 'string' || !result.passage.trim()) {
        throw new Error(t('ИИ вернул некорректное задание. Попробуй ещё раз.', 'AI returned an invalid passage. Please try again.'));
      }

      const generated = {
        id: 'ai-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        level: result.level,
        topic: result.topic || topic,
        title: result.title || t('Новое задание на говорение', 'New speaking task'),
        text: result.passage,
        generated: true
      };

      generatedPassages = [generated, ...generatedPassages].slice(0, 6);
      activeReviewText = '';
      levelFilter.value = level;
      retryPanel.hidden = true;
      resultSection.hidden = true;
      renderPassages(generated.id);
      generatorStatus(t('Готово: создано новое задание ', 'Ready: a new ') + level + t('-уровня добавлено в начало списка.', ' passage was added to the top of the list.'));
      message(t('Новое задание готово. Прочитай текст или включи пример произношения.', 'Your new passage is ready. Read it or play the pronunciation example.'));
    } catch (error) {
      generatorStatus(error?.message || t('Генерация временно недоступна.', 'Passage generation is temporarily unavailable.'), true);
      message(t('Не удалось создать задание. Существующая библиотека по-прежнему доступна.', 'Could not create a new passage. The existing library is still available.'), true);
    } finally {
      generateButton.disabled = false;
      generateButton.textContent = t('Сгенерировать ↗', 'Generate ↗');
    }
  }

  async function checkAiGeneratorStatus() {
    try {
      const response = await fetch('/api/health', { credentials: 'same-origin' });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.configured) {
        generatorStatus(t('ИИ подключён · новые задания генерируются по запросу.', 'AI is connected · new passages are generated on request.'));
      } else {
        generatorStatus(t('Для генерации на Preview нужны настройки Cloudflare Workers AI в Render.', 'Cloudflare Workers AI must be configured in Render to generate passages on Preview.'), true);
      }
    } catch {
      generatorStatus(t('Не удалось проверить подключение ИИ. Можно пользоваться готовой библиотекой.', 'Could not check the AI connection. You can still use the existing passage library.'), true);
    }
  }

  consent.addEventListener('change', updateRecordAvailability);
  levelFilter.addEventListener('change', renderPassages);
  generateButton.addEventListener('click', generateNewPassage);

  promptList.addEventListener('click', event => {
    if (!event.target.closest('.pron-prompt-choice')) return;
    activeReviewText = '';
    updateActiveTask();
  });

  promptList.addEventListener('change', event => {
    const radio = event.target.closest('input[name="pron-prompt"]');
    if (!radio) return;
    promptList.querySelectorAll('.pron-prompt').forEach(card => {
      card.classList.toggle('selected', card.querySelector('input')?.checked === true);
    });
    updateActiveTask();
  });

  repeatErrorsButton.addEventListener('click', () => {
    if (!lastReviewWords.length) return;
    activeReviewText = lastReviewWords.join(' ');
    updateActiveTask();
    message(t('Теперь прочитай только слова, которые требуют дополнительной практики.', 'Now read only the words that need more practice.'));
    pronRoot.querySelector('.pron-record-box').scrollIntoView({ behavior: 'smooth', block: 'center' });
    recordButton.focus({ preventScroll: true });
  });

  async function toSamples(recordingBlob) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error(t('В этом браузере не поддерживается обработка аудио.', 'Audio processing is not supported in this browser.'));

    const context = new AudioContextClass();
    try {
      const decoded = await context.decodeAudioData(await recordingBlob.arrayBuffer());
      if (decoded.duration > MAX_SECONDS + 1 || decoded.duration < 0.45) {
        throw new Error(t('Запись должна длиться от половины секунды до 28 секунд.', 'The recording must be between half a second and 28 seconds long.'));
      }

      const mono = new Float32Array(decoded.length);
      for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
        const data = decoded.getChannelData(channel);
        for (let index = 0; index < decoded.length; index++) {
          mono[index] += data[index] / decoded.numberOfChannels;
        }
      }

      const outputLength = Math.ceil(decoded.duration * 16_000);
      const samples = new Float32Array(outputLength);
      const ratio = decoded.sampleRate / 16_000;
      for (let index = 0; index < outputLength; index++) {
        const position = index * ratio;
        const left = Math.min(Math.floor(position), mono.length - 1);
        const right = Math.min(left + 1, mono.length - 1);
        const fraction = position - left;
        samples[index] = mono[left] * (1 - fraction) + mono[right] * fraction;
      }
      return { samples, duration: decoded.duration };
    } finally {
      await context.close().catch(() => {});
    }
  }

  async function getTranscriber() {
    if (!transcriberPromise) {
      transcriberPromise = (async () => {
        message(t('Подключаем движок Whisper. При первом запуске скачиваются файлы модели; запись остаётся в этом браузере.', 'Loading Whisper. Model files are downloaded on first use; your recording stays in this browser.'));
        const { pipeline, env } = await import(TRANSFORMERS_URL);
        env.allowLocalModels = false;
        env.useBrowserCache = true;
        return pipeline('automatic-speech-recognition', MODEL_ID, {
          dtype: 'q8',
          progress_callback: progress => {
            if (progress?.status === 'progress' && Number.isFinite(progress.progress)) {
              message(t('Загрузка модели Whisper: ', 'Downloading Whisper model: ') + Math.round(progress.progress) + t('%. Запись не отправляется на сервер.', '%. Your recording is not uploaded to the server.'));
            } else if (progress?.status === 'done') {
              message(t('Модель Whisper готова. Распознаём запись локально…', 'Whisper is ready. Transcribing your recording on this device…'));
            }
          }
        });
      })().catch(error => {
        transcriberPromise = null;
        throw error;
      });
    }
    return transcriberPromise;
  }

  function renderResult(recognizedText, analysis, duration, shouldScroll = true) {
    latestResult = { recognizedText, analysis, duration };
    resultSection.hidden = false;
    pronRoot.querySelector('[data-pron-overall]').textContent = analysis.wordMatchPercent + '%';
    pronRoot.querySelector('[data-pron-transcript]').textContent = recognizedText
      ? t('Whisper распознал: ', 'Whisper recognised: ') + recognizedText
      : t('Речь не удалось распознать. Попробуй записать фразу ещё раз.', 'Speech could not be recognised. Please record the passage again.');

    const pace = Math.round((analysis.recognizedWords / duration) * 60);
    const metrics = [
      [t('Совпало слов', 'Words matched'), analysis.matched + ' / ' + analysis.referenceWords],
      [t('Пропуски', 'Missing'), String(analysis.missing)],
      [t('Замены', 'Substitutions'), String(analysis.different)],
      [t('Лишние слова', 'Extra words'), String(analysis.extra)],
      [t('Темп речи', 'Speaking pace'), pace + (document.documentElement.lang === 'en' ? ' words/min' : ' слов/мин')]
    ];

    const metricsNode = pronRoot.querySelector('[data-pron-metrics]');
    metricsNode.replaceChildren();
    metrics.forEach(([label, value], index) => {
      const card = document.createElement('article');
      card.className = 'pron-metric';
      const name = document.createElement('span');
      name.textContent = label;
      const strong = document.createElement('strong');
      strong.textContent = value;
      card.append(name, strong);

      if (index === 0) {
        const track = document.createElement('div');
        track.className = 'progress-track';
        const fill = document.createElement('div');
        fill.className = 'progress-fill';
        fill.style.width = analysis.wordMatchPercent + '%';
        track.append(fill);
        card.append(track);
      }
      metricsNode.append(card);
    });

    const wordList = pronRoot.querySelector('[data-pron-words]');
    wordList.replaceChildren();
    analysis.words.forEach(item => {
      const row = document.createElement('article');
      row.className = 'pron-word';
      const head = document.createElement('div');
      head.className = 'pron-word-head';
      const expected = document.createElement('strong');
      const heard = document.createElement('span');

      if (item.status === 'match') {
        expected.textContent = item.reference;
        heard.textContent = '✓';
        heard.setAttribute('aria-label', t('Совпало', 'Matched'));
      } else if (item.status === 'different') {
        expected.textContent = item.reference;
        heard.textContent = '→ ' + item.recognized;
        heard.setAttribute('aria-label', t('Распознано вместо ожидаемого: ', 'Recognised instead of expected: ') + item.recognized);
      } else if (item.status === 'missing') {
        expected.textContent = item.reference;
        heard.textContent = t('пропуск', 'missing');
        heard.setAttribute('aria-label', t('Не распознано', 'Not recognised'));
      } else {
        expected.textContent = item.recognized;
        heard.textContent = '+ ' + t('лишнее', 'extra');
        heard.setAttribute('aria-label', t('Лишнее слово', 'Extra word'));
      }

      row.classList.add('pron-word-' + item.status);
      head.append(expected, heard);
      row.append(head);
      wordList.append(row);
    });

    lastReviewWords = getReviewWords(analysis.words);
    retryPanel.hidden = lastReviewWords.length === 0;
    if (lastReviewWords.length) {
      retryTextNode.textContent = lastReviewWords.join(' · ');
    } else {
      activeReviewText = '';
      updateActiveTask();
    }

    if (shouldScroll) resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function svgElement(name, attributes = {}, text = '') {
    const element = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    if (text) element.textContent = text;
    return element;
  }

  function renderProgressChart(attempts) {
    const series = buildProgressSeries(attempts);
    progressCount.textContent = series.length + (document.documentElement.lang === 'en' ? (series.length === 1 ? ' attempt' : ' attempts') : (series.length === 1 ? ' попытка' : ' попыток'));
    progressChart.replaceChildren();

    if (!series.length) {
      progressChart.hidden = true;
      chartEmpty.hidden = false;
      return;
    }

    chartEmpty.hidden = true;
    progressChart.hidden = false;
    progressChart.setAttribute('aria-label',
      t('Совпадение текста по последним попыткам: ', 'Word-match scores over recent attempts: ') + series.map(item => item.score + '%').join(', '));

    const left = 38;
    const right = 326;
    const top = 18;
    const bottom = 142;
    const plotHeight = bottom - top;
    const xFor = index => series.length === 1
      ? (left + right) / 2
      : left + (index * (right - left)) / (series.length - 1);
    const yFor = score => bottom - (score / 100) * plotHeight;

    [0, 50, 100].forEach(score => {
      const y = yFor(score);
      progressChart.append(
        svgElement('line', {
          x1: left, y1: y, x2: right, y2: y,
          stroke: '#e5e5e5', 'stroke-width': 1
        }),
        svgElement('text', {
          x: 2, y: y + 4, fill: '#888', 'font-size': 10
        }, score + '%')
      );
    });

    if (series.length > 1) {
      const points = series.map((point, index) => xFor(index) + ',' + yFor(point.score)).join(' ');
      progressChart.append(svgElement('polyline', {
        points, fill: 'none', stroke: '#171717', 'stroke-width': 2.5,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round'
      }));
    }

    series.forEach((point, index) => {
      const x = xFor(index);
      const y = yFor(point.score);
      const circle = svgElement('circle', {
        cx: x, cy: y, r: 4.5, fill: '#fff', stroke: '#171717', 'stroke-width': 2
      });
      circle.append(svgElement('title', {}, t('Попытка ', 'Attempt ') + point.attempt + ': ' + point.score + '%'));
      progressChart.append(circle);
      progressChart.append(svgElement('text', {
        x, y: Math.max(top + 10, y - 9), fill: '#171717', 'font-size': 9, 'text-anchor': 'middle'
      }, point.score + '%'));
      progressChart.append(svgElement('text', {
        x, y: 164, fill: '#888', 'font-size': 9, 'text-anchor': 'middle'
      }, point.dateLabel));
    });

    progressChart.append(svgElement('text', {
      x: right, y: 184, fill: '#888', 'font-size': 9, 'text-anchor': 'end'
    }, t('новые →', 'newer →')));
  }

  function renderHistory(attempts) {
    latestAttempts = attempts;
    renderProgressChart(attempts);
    const history = pronRoot.querySelector('[data-pron-history]');
    history.replaceChildren();

    if (!attempts.length) {
      history.textContent = t('История появится после первой оценки.', 'Your history will appear after your first assessment.');
      return;
    }

    attempts.slice(0, 8).forEach(item => {
      const row = document.createElement('article');
      row.className = 'pron-history-row';
      const summary = document.createElement('span');
      summary.textContent = item.reference_text;
      const score = document.createElement('strong');
      score.textContent = Math.round(Number(item.word_match_score)) + t('% совпадение', '% match');
      row.append(summary, score);
      history.append(row);
    });
  }

  async function loadHistory() {
    let remoteAttempts = [];
    try {
      const response = await fetch('/api/pronunciation/history', { credentials: 'same-origin' });
      const data = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(data.attempts)) remoteAttempts = data.attempts;
    } catch {}

    let localAttempts = [];
    try {
      localAttempts = readLocalPronunciationHistory(window.localStorage);
    } catch {}

    const attempts = [...remoteAttempts, ...localAttempts]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    recentHistoryTexts = attempts
      .map(item => typeof item.reference_text === 'string' ? item.reference_text : '')
      .filter(Boolean)
      .slice(0, 4);
    renderHistory(attempts);
  }

  async function saveAttempt(referenceText, recognizedText, analysis) {
    const attempt = {
      id: (globalThis.crypto?.randomUUID?.() || String(Date.now())),
      reference_text: referenceText,
      recognized_text: recognizedText,
      word_match_score: analysis.wordMatchPercent,
      word_results: analysis.words,
      created_at: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/pronunciation/attempt', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceText,
          recognizedText,
          wordMatchScore: analysis.wordMatchPercent,
          words: analysis.words
        })
      });
      if (response.ok) return 'account';
    } catch {}

    let savedLocally = false;
    try {
      savedLocally = saveLocalPronunciationAttempt(window.localStorage, attempt);
    } catch {}

    if (savedLocally) return 'device';
    throw new Error(t('Результат показан, но его не удалось сохранить. Проверь свободное место и настройки хранения браузера.', 'The result is shown but could not be saved. Check available space and your browser storage settings.'));
  }

  async function processRecording(recordingBlob, referenceText) {
    recordButton.disabled = true;
    try {
      message(t('Подготавливаем аудио для обработки в браузере…', 'Preparing audio for browser processing…'));
      const { samples, duration } = await toSamples(recordingBlob);
      const transcriber = await getTranscriber();
      message(t('Whisper распознаёт речь прямо на устройстве. Это может занять некоторое время.', 'Whisper is transcribing speech on this device. This may take a little while.'));
      const output = await transcriber(samples);
      const recognizedText = String(output?.text || '').trim();
      if (!recognizedText) {
        throw new Error('Whisper не распознал слова. Попробуй говорить ближе к микрофону и повторить запись.');
      }

      const analysis = compareTranscript(referenceText, recognizedText);
      renderResult(recognizedText, analysis, duration);

      try {
        const savedTo = await saveAttempt(referenceText, recognizedText, analysis);
        message(savedTo === 'account'
          ? t('Готово. Аудио обработано на устройстве; текст и результат сохранены в аккаунте.', 'Done. Audio was processed on this device; the transcript and result were saved to your account.')
          : t('Готово. Аудио обработано на устройстве; результат сохранён в истории этого браузера.', 'Done. Audio was processed on this device; the result was saved in this browser history.'));
        await loadHistory();
      } catch (error) {
        message(error.message || t('Результат показан, но историю не удалось сохранить.', 'The result is shown but could not be saved to history.'), true);
      }
    } catch (error) {
      const detail = error?.message || t('Не удалось распознать запись.', 'Could not transcribe the recording.');
      message(detail.includes('Failed to fetch') || detail.includes('NetworkError')
        ? t('Не удалось загрузить модель Whisper. Проверь подключение к интернету и попробуй ещё раз.', 'Could not download the Whisper model. Check your internet connection and try again.')
        : detail, true);
    } finally {
      updateRecordAvailability();
    }
  }

  async function startRecording() {
    if (!consent.checked) {
      message(t('Сначала подтверди обработку записи локально в браузере.', 'First confirm that the recording will be processed locally in your browser.'), true);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      message(t('Этот браузер не поддерживает запись с микрофона. Попробуй актуальную версию Chrome, Edge или Safari.', 'This browser does not support microphone recording. Try an up-to-date version of Chrome, Edge or Safari.'), true);
      return;
    }

    try {
      recordingReferenceText = selectedText();
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 }
      });

      const mimeType = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find(type => MediaRecorder.isTypeSupported(type));
      recorder = mimeType
        ? new MediaRecorder(mediaStream, { mimeType })
        : new MediaRecorder(mediaStream);
      chunks = [];

      recorder.addEventListener('dataavailable', event => {
        if (event.data?.size) chunks.push(event.data);
      });

      recorder.addEventListener('stop', () => {
        const recording = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' });
        chunks = [];
        mediaStream?.getTracks().forEach(track => track.stop());
        mediaStream = null;
        recorder = null;
        clearInterval(clockId);
        clearTimeout(autoStopId);
        timerNode.textContent = '00:00 / 00:28';
        recordLabel.textContent = t('Начать запись', 'Start recording');
        recordButton.classList.remove('recording');

        if (recording.size) processRecording(recording, recordingReferenceText);
        else {
          message(t('Запись пустая. Попробуй ещё раз.', 'The recording is empty. Please try again.'), true);
          updateRecordAvailability();
        }
      }, { once: true });

      recorder.start(250);
      startedAt = Date.now();
      recordLabel.textContent = t('Остановить запись', 'Stop recording');
      recordButton.classList.add('recording');
      recordButton.disabled = false;
      message(t('Говори чётко и в обычном темпе. Нажми кнопку, когда закончишь.', 'Speak clearly at a natural pace. Press the button when you are finished.'));

      clockId = setInterval(() => {
        const elapsed = (Date.now() - startedAt) / 1000;
        timerNode.textContent = formatTime(elapsed) + ' / 00:28';
      }, 200);
      autoStopId = setTimeout(stopRecording, MAX_SECONDS * 1000);
    } catch {
      mediaStream?.getTracks().forEach(track => track.stop());
      mediaStream = null;
      recorder = null;
      message(t('Не удалось получить доступ к микрофону. Проверь разрешение микрофона в браузере.', 'Could not access the microphone. Check your browser microphone permission.'), true);
      updateRecordAvailability();
    }
  }

  function stopRecording() {
    if (!recorder || recorder.state === 'inactive') return;
    recordButton.disabled = true;
    message(t('Завершаем запись…', 'Finishing recording…'));
    recorder.stop();
  }

  recordButton.addEventListener('click', () => {
    if (recorder) stopRecording();
    else startRecording();
  });

  engineBadge.textContent = 'WHISPER · ON-DEVICE';
  renderPassages();

  window.addEventListener('quietenglish:languagechange', () => {
    renderPassages(selectedPassage()?.id || '');
    if (latestResult) {
      renderResult(latestResult.recognizedText, latestResult.analysis, latestResult.duration, false);
    }
    renderHistory(latestAttempts);
    if (lastStatusPair) statusNode.textContent = t(lastStatusPair[0], lastStatusPair[1]);
    if (lastGeneratorPair) aiGeneratorStatus.textContent = t(lastGeneratorPair[0], lastGeneratorPair[1]);
    generateButton.textContent = generateButton.disabled ? t('Создаём…', 'Generating…') : t('Сгенерировать ↗', 'Generate ↗');
    recordLabel.textContent = recorder ? t('Остановить запись', 'Stop recording') : t('Начать запись', 'Start recording');
    const count = promptList.querySelectorAll('.pron-prompt').length;
    const countNode = pronRoot.querySelector('[data-pron-count]');
    if (countNode) countNode.textContent = count + (document.documentElement.lang === 'en' ? (count === 1 ? ' passage' : ' passages') : (count === 1 ? ' задание' : count >= 2 && count <= 4 ? ' задания' : ' заданий'));
  });


  checkAiGeneratorStatus();
  message(t('Выбери уровень и текст, сгенерируй новый вариант или используй библиотеку A1–C1.', 'Choose a level and passage, generate a new one or use the A1–C1 library.'));
  updateRecordAvailability();
  loadHistory();
}
