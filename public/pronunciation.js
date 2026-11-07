import { compareTranscript } from '/pronunciation-scoring.js';
import { readLocalPronunciationHistory, saveLocalPronunciationAttempt } from '/pronunciation-storage.js';

const pronRoot = document.querySelector('[data-pronunciation-page]');
if (pronRoot) {
  const statusNode = pronRoot.querySelector('[data-pron-status]');
  const recordButton = pronRoot.querySelector('[data-record]');
  const recordLabel = pronRoot.querySelector('[data-record-label]');
  const timerNode = pronRoot.querySelector('[data-record-timer]');
  const consent = pronRoot.querySelector('[data-pron-consent]');
  const prompts = [...pronRoot.querySelectorAll('input[name="pron-prompt"]')];
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

  const message = (text, error = false) => {
    statusNode.textContent = text;
    statusNode.classList.toggle('error-text', error);
    statusNode.classList.toggle('success-text', !error);
  };
  const selectedText = () => prompts.find(item => item.checked)?.value || prompts[0]?.value || '';
  const formatTime = seconds => {
    const safe = Math.max(0, Math.floor(seconds));
    return String(Math.floor(safe / 60)).padStart(2, '0') + ':' + String(safe % 60).padStart(2, '0');
  };
  const updateRecordAvailability = () => {
    recordButton.disabled = !consent.checked && !recorder;
  };

  consent.addEventListener('change', updateRecordAvailability);
  prompts.forEach(input => input.addEventListener('change', () => {
    pronRoot.querySelectorAll('.pron-prompt').forEach(label => {
      label.classList.toggle('selected', label.querySelector('input')?.checked === true);
    });
  }));

  pronRoot.querySelectorAll('[data-speak]').forEach(button => {
    button.addEventListener('click', () => {
      if (!('speechSynthesis' in window)) return message('В этом браузере недоступно воспроизведение примера.', true);
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(button.dataset.speak);
      utterance.lang = 'en-US';
      utterance.rate = 0.88;
      window.speechSynthesis.speak(utterance);
    });
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
        heard.textContent = 'Совпало';
      } else if (item.status === 'different') {
        expected.textContent = 'Ожидалось: ' + item.reference;
        heard.textContent = 'Распознано: ' + item.recognized;
      } else if (item.status === 'missing') {
        expected.textContent = item.reference;
        heard.textContent = 'Не распознано';
      } else {
        expected.textContent = item.recognized;
        heard.textContent = 'Лишнее слово';
      }
      row.classList.add('pron-word-' + item.status);
      head.append(expected, heard);
      row.append(head);
      wordList.append(row);
    });
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderHistory(attempts) {
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
      const data = await response.json().catch(() => ({}));
      if (response.ok) return 'account';
    } catch {}

    let savedLocally = false;
    try {
      savedLocally = saveLocalPronunciationAttempt(window.localStorage, attempt);
    } catch {}
    if (savedLocally) return 'device';
    throw new Error('Результат показан, но его не удалось сохранить. Проверь свободное место и настройки хранения браузера.');
  }

  async function processRecording(recordingBlob) {
    recordButton.disabled = true;
    try {
      message('Подготавливаем аудио для обработки в браузере…');
      const { samples, duration } = await toSamples(recordingBlob);
      const transcriber = await getTranscriber();
      message('Whisper распознаёт речь прямо на устройстве. Это может занять некоторое время.');
      const output = await transcriber(samples);
      const recognizedText = String(output?.text || '').trim();
      if (!recognizedText) throw new Error('Whisper не распознал слова. Попробуй говорить ближе к микрофону и повторить запись.');

      const referenceText = selectedText();
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
    if (!consent.checked) return message('Сначала подтверди обработку записи локально в браузере.', true);
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      return message('Этот браузер не поддерживает запись с микрофона. Попробуй актуальную версию Chrome, Edge или Safari.', true);
    }
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 }
      });
      const mimeType = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find(type => MediaRecorder.isTypeSupported(type));
      recorder = mimeType ? new MediaRecorder(mediaStream, { mimeType }) : new MediaRecorder(mediaStream);
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
        if (recording.size) processRecording(recording);
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
  message('Выбери фразу, подтверди локальную обработку и начни запись. При первом запуске модель будет загружена в браузер.');
  updateRecordAvailability();
  loadHistory();
}
