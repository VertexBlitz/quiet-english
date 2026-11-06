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
  let configured = false;
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
    recordButton.disabled = !configured || (!consent.checked && !recorder);
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

  function encodeWav(samples, sampleRate = 16000) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const write = (offset, value) => {
      for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
    };
    write(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); write(8, 'WAVE');
    write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true);
    view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) {
      const value = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(44 + i * 2, value < 0 ? value * 0x8000 : value * 0x7fff, true);
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  async function toPcmWav(blob) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('В этом браузере не поддерживается обработка аудио.');
    const context = new AudioContextClass();
    try {
      const decoded = await context.decodeAudioData(await blob.arrayBuffer());
      if (decoded.duration > 30 || decoded.duration < 0.45) {
        throw new Error('Запись должна длиться от половины секунды до 30 секунд.');
      }
      const outputLength = Math.ceil(decoded.duration * 16000);
      const mono = new Float32Array(decoded.length);
      for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
        const data = decoded.getChannelData(channel);
        for (let i = 0; i < decoded.length; i++) mono[i] += data[i] / decoded.numberOfChannels;
      }
      const resampled = new Float32Array(outputLength);
      const ratio = decoded.sampleRate / 16000;
      for (let i = 0; i < outputLength; i++) {
        const position = i * ratio;
        const left = Math.min(Math.floor(position), mono.length - 1);
        const right = Math.min(left + 1, mono.length - 1);
        const fraction = position - left;
        resampled[i] = mono[left] * (1 - fraction) + mono[right] * fraction;
      }
      return encodeWav(resampled);
    } finally {
      await context.close().catch(() => {});
    }
  }

  const scoreValue = value => Number.isFinite(Number(value)) ? Math.round(Number(value)) : null;
  function renderResult(data) {
    resultSection.hidden = false;
    pronRoot.querySelector('[data-pron-overall]').textContent = scoreValue(data.pronScore) ?? '—';
    pronRoot.querySelector('[data-pron-transcript]').textContent = data.recognizedText
      ? 'Распознано: ' + data.recognizedText
      : 'Речь распознана, но текст не вернулся.';
    const metricLabels = [
      ['accuracyScore', 'Точность звуков', 'Sound accuracy'],
      ['fluencyScore', 'Беглость', 'Fluency'],
      ['completenessScore', 'Полнота', 'Completeness'],
      ['prosodyScore', 'Интонация и ритм', 'Prosody']
    ];
    const metrics = pronRoot.querySelector('[data-pron-metrics]');
    metrics.replaceChildren();
    metricLabels.forEach(([key, ru, en]) => {
      const value = scoreValue(data[key]);
      const card = document.createElement('article');
      card.className = 'pron-metric';
      const label = document.createElement('span');
      label.textContent = document.documentElement.lang === 'en' ? en : ru;
      const strong = document.createElement('strong');
      strong.textContent = value == null ? '—' : value + '/100';
      const track = document.createElement('div');
      track.className = 'progress-track';
      const fill = document.createElement('div');
      fill.className = 'progress-fill';
      fill.style.width = (value ?? 0) + '%';
      track.append(fill);
      card.append(label, strong, track);
      metrics.append(card);
    });

    const list = pronRoot.querySelector('[data-pron-words]');
    list.replaceChildren();
    (data.words || []).forEach(word => {
      const row = document.createElement('article');
      row.className = 'pron-word';
      const head = document.createElement('div');
      head.className = 'pron-word-head';
      const title = document.createElement('strong');
      title.textContent = word.word || '—';
      const score = document.createElement('span');
      const value = scoreValue(word.accuracy);
      score.textContent = value == null ? '—' : value + '/100';
      head.append(title, score);
      row.append(head);
      if (word.errorType && word.errorType !== 'None') {
        const error = document.createElement('p');
        error.className = 'pron-word-error';
        error.textContent = word.errorType === 'Mispronunciation' ? 'Проверь произношение этого слова.'
          : word.errorType === 'Omission' ? 'Это слово пропущено.'
          : word.errorType === 'Insertion' ? 'В записи есть лишнее слово.'
          : word.errorType;
        row.append(error);
      }
      if (word.phonemes?.length) {
        const phones = document.createElement('div');
        phones.className = 'phoneme-list';
        word.phonemes.forEach(phoneme => {
          const item = document.createElement('span');
          item.className = 'phoneme-chip';
          const phonemeScore = scoreValue(phoneme.accuracy);
          item.textContent = phoneme.phoneme + ' · ' + (phonemeScore == null ? '—' : phonemeScore);
          phones.append(item);
        });
        row.append(phones);
      }
      list.append(row);
    });
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function loadHistory() {
    try {
      const response = await fetch('/api/pronunciation/history', { credentials: 'same-origin' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return;
      const history = pronRoot.querySelector('[data-pron-history]');
      history.replaceChildren();
      if (!data.attempts?.length) {
        history.textContent = 'История появится после первой оценки.';
        return;
      }
      data.attempts.forEach(item => {
        const row = document.createElement('article');
        row.className = 'pron-history-row';
        const summary = document.createElement('span');
        summary.textContent = item.reference_text;
        const score = document.createElement('strong');
        score.textContent = Math.round(Number(item.pron_score)) + '/100';
        row.append(summary, score);
        history.append(row);
      });
    } catch {}
  }

  async function submitRecording(recordingBlob) {
    message('Анализируем произношение…');
    recordButton.disabled = true;
    try {
      const wav = await toPcmWav(recordingBlob);
      const url = '/api/pronunciation/assess?referenceText=' + encodeURIComponent(selectedText());
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'audio/wav' },
        body: wav
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Не удалось оценить речь.');
      renderResult(data);
      message('Оценка готова. Результат сохранён в твоём аккаунте.');
      await loadHistory();
    } catch (error) {
      message(error.message || 'Не удалось обработать запись.', true);
    } finally {
      updateRecordAvailability();
    }
  }

  async function startRecording() {
    if (!consent.checked) return message('Сначала подтверди отправку записи для оценки.', true);
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      return message('Этот браузер не поддерживает запись с микрофона. Попробуй актуальную версию Chrome, Edge или Safari.', true);
    }
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
      const mimeType = ['audio/webm;codecs=opus','audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type));
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
        submitRecording(recording);
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
      autoStopId = setTimeout(() => stopRecording(), MAX_SECONDS * 1000);
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

  fetch('/api/pronunciation/status', { credentials: 'same-origin' })
    .then(response => response.json().then(data => ({ response, data })))
    .then(({ response, data }) => {
      configured = response.ok && data.configured === true;
      engineBadge.textContent = configured ? 'AZURE SPEECH · READY' : 'AZURE SPEECH · NOT CONFIGURED';
      if (!configured) {
        message('Модуль интерфейса готов, но сервер оценки ещё не подключён. Администратору нужно добавить AZURE_SPEECH_KEY и AZURE_SPEECH_REGION в Render.', true);
      } else {
        message('Выбери фразу, подтверди отправку записи и нажми «Начать запись».');
      }
      updateRecordAvailability();
    })
    .catch(() => message('Не удалось проверить статус сервиса оценки речи.', true));

  loadHistory();
}
