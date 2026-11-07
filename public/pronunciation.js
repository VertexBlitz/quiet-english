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

  const message = (text, error = false) => {
    statusNode.textContent = text;
    statusNode.classList.toggle('error-text', error);
    statusNode.classList.toggle('success-text', !error);
  };

  const selectedPrompt = () => promptList.querySelector('input[name="pron-prompt"]:checked');
  const selectedPassage = () => PASSAGES.find(item => item.id === selectedPrompt()?.dataset.passageId);
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
      ? 'Режим повторения: ' + activeReviewText
      : 'Выбрано: ' + (selectedPassage()?.level || 'A1') + ' · ' + (selectedPassage()?.topic || 'Everyday life');
  }

  function speakText(text) {
    if (!('speechSynthesis' in window)) {
      message('В этом браузере недоступно воспроизведение примера.', true);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    window.speechSynthesis.speak(utterance);
  }

  function renderPassages() {
    const level = levelFilter.value;
    const visiblePassages = level === 'ALL'
      ? PASSAGES
      : PASSAGES.filter(item => item.level === level);
    const currentId = selectedPrompt()?.dataset.passageId || PASSAGES[0].id;
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
      const meta = document.createElement('strong');
      meta.textContent = item.level + ' · ' + item.topic;
      const passage = document.createElement('span');
      passage.textContent = item.text;
      words.append(meta, passage);
      label.append(radio, words);

      const listen = document.createElement('button');
      listen.className = 'pron-listen';
      listen.type = 'button';
      listen.textContent = '▶';
      listen.setAttribute('aria-label', 'Listen to ' + item.level + ' passage');
      listen.addEventListener('click', () => speakText(item.text));

      card.append(label, listen);
      promptList.append(card);
    });

    const count = visiblePassages.length;
    const noun = count === 1 ? ' задание' : count >= 2 && count <= 4 ? ' задания' : ' заданий';
    pronRoot.querySelector('[data-pron-count]').textContent = count + noun;
    updateActiveTask();
  }

  consent.addEventListener('change', updateRecordAvailability);
  levelFilter.addEventListener('change', renderPassages);

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
    message('Теперь прочитай только слова, которые требуют дополнительной практики.');
    pronRoot.querySelector('.pron-record-box').scrollIntoView({ behavior: 'smooth', block: 'center' });
    recordButton.focus({ preventScroll: true });
  });

  async function toSamples(recordingBlob) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('В этом браузере не поддерживается обработка аудио.');

    const context = new AudioContextClass();
    try {
      const decoded = await context.decodeAudioData(await recordingBlob.arrayBuffer());
      if (decoded.duration > MAX_SECONDS + 1 || decoded.duration < 0.45) {
        throw new Error('Запись должна длиться от половины секунды до 28 секунд.');
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
        message('Подключаем движок Whisper. При первом запуске скачиваются файлы модели; запись остаётся в этом браузере.');
        const { pipeline, env } = await import(TRANSFORMERS_URL);
        env.allowLocalModels = false;
        env.useBrowserCache = true;
        return pipeline('automatic-speech-recognition', MODEL_ID, {
          dtype: 'q8',
          progress_callback: progress => {
            if (progress?.status === 'progress' && Number.isFinite(progress.progress)) {
              message('Загрузка модели Whisper: ' + Math.round(progress.progress) + '%. Запись не отправляется на сервер.');
            } else if (progress?.status === 'done') {
              message('Модель Whisper готова. Распознаём запись локально…');
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

  function renderResult(recognizedText, analysis, duration) {
    resultSection.hidden = false;
    pronRoot.querySelector('[data-pron-overall]').textContent = analysis.wordMatchPercent + '%';
    pronRoot.querySelector('[data-pron-transcript]').textContent = recognizedText
      ? 'Whisper распознал: ' + recognizedText
      : 'Речь не удалось распознать. Попробуй записать фразу ещё раз.';

    const pace = Math.round((analysis.recognizedWords / duration) * 60);
    const metrics = [
      ['Совпало слов', analysis.matched + ' / ' + analysis.referenceWords],
      ['Пропуски', String(analysis.missing)],
      ['Замены', String(analysis.different)],
      ['Лишние слова', String(analysis.extra)],
      ['Темп речи', pace + ' слов/мин']
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
        heard.setAttribute('aria-label', 'Совпало');
      } else if (item.status === 'different') {
        expected.textContent = item.reference;
        heard.textContent = '→ ' + item.recognized;
        heard.setAttribute('aria-label', 'Распознано вместо ожидаемого: ' + item.recognized);
      } else if (item.status === 'missing') {
        expected.textContent = item.reference;
        heard.textContent = 'пропуск';
        heard.setAttribute('aria-label', 'Не распознано');
      } else {
        expected.textContent = item.recognized;
        heard.textContent = '+ лишнее';
        heard.setAttribute('aria-label', 'Лишнее слово');
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

    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function svgElement(name, attributes = {}, text = '') {
    const element = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    if (text) element.textContent = text;
    return element;
  }

  function renderProgressChart(attempts) {
    const series = buildProgressSeries(attempts);
    progressCount.textContent = series.length + (series.length === 1 ? ' попытка' : ' попыток');
    progressChart.replaceChildren();

    if (!series.length) {
      progressChart.hidden = true;
      chartEmpty.hidden = false;
      return;
    }

    chartEmpty.hidden = true;
    progressChart.hidden = false;
    progressChart.setAttribute('aria-label',
      'Совпадение текста по последним попыткам: ' + series.map(item => item.score + '%').join(', '));

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
      circle.append(svgElement('title', {}, 'Попытка ' + point.attempt + ': ' + point.score + '%'));
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
    }, 'новые →'));
  }

  function renderHistory(attempts) {
    renderProgressChart(attempts);
    const history = pronRoot.querySelector('[data-pron-history]');
    history.replaceChildren();

    if (!attempts.length) {
      history.textContent = 'История появится после первой оценки.';
      return;
    }

    attempts.slice(0, 8).forEach(item => {
      const row = document.createElement('article');
      row.className = 'pron-history-row';
      const summary = document.createElement('span');
      summary.textContent = item.reference_text;
      const score = document.createElement('strong');
      score.textContent = Math.round(Number(item.word_match_score)) + '% совпадение';
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
    throw new Error('Результат показан, но его не удалось сохранить. Проверь свободное место и настройки хранения браузера.');
  }

  async function processRecording(recordingBlob, referenceText) {
    recordButton.disabled = true;
    try {
      message('Подготавливаем аудио для обработки в браузере…');
      const { samples, duration } = await toSamples(recordingBlob);
      const transcriber = await getTranscriber();
      message('Whisper распознаёт речь прямо на устройстве. Это может занять некоторое время.');
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
          ? 'Готово. Аудио обработано на устройстве; текст и результат сохранены в аккаунте.'
          : 'Готово. Аудио обработано на устройстве; результат сохранён в истории этого браузера.');
        await loadHistory();
      } catch (error) {
        message(error.message || 'Результат показан, но историю не удалось сохранить.', true);
      }
    } catch (error) {
      const detail = error?.message || 'Не удалось распознать запись.';
      message(detail.includes('Failed to fetch') || detail.includes('NetworkError')
        ? 'Не удалось загрузить модель Whisper. Проверь подключение к интернету и попробуй ещё раз.'
        : detail, true);
    } finally {
      updateRecordAvailability();
    }
  }

  async function startRecording() {
    if (!consent.checked) {
      message('Сначала подтверди обработку записи локально в браузере.', true);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      message('Этот браузер не поддерживает запись с микрофона. Попробуй актуальную версию Chrome, Edge или Safari.', true);
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
        recordLabel.textContent = 'Начать запись';
        recordButton.classList.remove('recording');

        if (recording.size) processRecording(recording, recordingReferenceText);
        else {
          message('Запись пустая. Попробуй ещё раз.', true);
          updateRecordAvailability();
        }
      }, { once: true });

      recorder.start(250);
      startedAt = Date.now();
      recordLabel.textContent = 'Остановить запись';
      recordButton.classList.add('recording');
      recordButton.disabled = false;
      message('Говори чётко и в обычном темпе. Нажми кнопку, когда закончишь.');

      clockId = setInterval(() => {
        const elapsed = (Date.now() - startedAt) / 1000;
        timerNode.textContent = formatTime(elapsed) + ' / 00:28';
      }, 200);
      autoStopId = setTimeout(stopRecording, MAX_SECONDS * 1000);
    } catch {
      mediaStream?.getTracks().forEach(track => track.stop());
      mediaStream = null;
      recorder = null;
      message('Не удалось получить доступ к микрофону. Проверь разрешение микрофона в браузере.', true);
      updateRecordAvailability();
    }
  }

  function stopRecording() {
    if (!recorder || recorder.state === 'inactive') return;
    recordButton.disabled = true;
    message('Завершаем запись…');
    recorder.stop();
  }

  recordButton.addEventListener('click', () => {
    if (recorder) stopRecording();
    else startRecording();
  });

  engineBadge.textContent = 'WHISPER · ON-DEVICE';
  renderPassages();
  message('Выбери уровень и текст, подтверди локальную обработку и начни запись. В библиотеке есть 15 заданий A1–C1.');
  updateRecordAvailability();
  loadHistory();
}
