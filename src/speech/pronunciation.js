const pronunciationTasks = Object.freeze({
  speak_read_aloud_01: {
    level: 'A2',
    title: 'A visit to the museum',
    referenceText: 'The little museum opens at nine, but the guided tour starts at half past ten.'
  },
  speak_read_aloud_02: {
    level: 'A2',
    title: 'A morning journey',
    referenceText: 'I usually take the early train because it gives me more time to explore the city.'
  },
  speak_read_aloud_03: {
    level: 'B1',
    title: 'A walk by the river',
    referenceText: 'Although the weather was cold, we enjoyed walking along the river and taking photographs.'
  },
  speak_read_aloud_04: {
    level: 'B1',
    title: 'Clear communication',
    referenceText: 'Good communication means listening carefully, asking clear questions, and responding with respect.'
  },
  speak_read_aloud_05: {
    level: 'B1',
    title: 'Learning with technology',
    referenceText: 'Technology can make learning more flexible, but regular practice is still important.'
  },
  speak_read_aloud_06: {
    level: 'A2',
    title: 'At the library',
    referenceText: 'Could you tell me whether the library is open on Saturday afternoon?'
  },
  speak_read_aloud_07: {
    level: 'B2',
    title: 'Working together',
    referenceText: 'When people work together, they often find more creative ways to solve a problem.'
  },
  speak_read_aloud_08: {
    level: 'B2',
    title: 'A local art gallery',
    referenceText: 'I would rather visit a small local gallery than spend the whole afternoon in a crowded shopping centre.'
  }
});

function pronunciationConfigured(env = process.env) {
  return env.AZURE_SPEECH_ENABLED === 'true' &&
    env.AZURE_SPEECH_GUARDIAN_APPROVED === 'true' &&
    typeof env.AZURE_SPEECH_KEY === 'string' && env.AZURE_SPEECH_KEY.length >= 16 &&
    typeof env.AZURE_SPEECH_REGION === 'string' && /^[a-z0-9-]{2,30}$/i.test(env.AZURE_SPEECH_REGION);
}

function validateWavPcm16k(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 2048 || buffer.length > 960_044) {
    return { ok: false, reason: 'Audio file size must be between 2 KB and 960 KB.' };
  }
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    return { ok: false, reason: 'Audio must be a WAV file.' };
  }
  let offset = 12;
  let format = null;
  let channels = null;
  let sampleRate = null;
  let bitsPerSample = null;
  let dataLength = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > buffer.length) return { ok: false, reason: 'The WAV file is incomplete.' };
    if (id === 'fmt ' && size >= 16) {
      format = buffer.readUInt16LE(start);
      channels = buffer.readUInt16LE(start + 2);
      sampleRate = buffer.readUInt32LE(start + 4);
      bitsPerSample = buffer.readUInt16LE(start + 14);
    }
    if (id === 'data') dataLength = size;
    offset = start + size + (size % 2);
  }
  if (format !== 1 || channels !== 1 || sampleRate !== 16_000 || bitsPerSample !== 16) {
    return { ok: false, reason: 'Audio must be mono PCM WAV, 16 kHz, 16-bit.' };
  }
  if (dataLength < 32_000 || dataLength > 960_000) {
    return { ok: false, reason: 'Record between 1 and 30 seconds of speech.' };
  }
  return { ok: true, durationSeconds: dataLength / 32_000 };
}

function finiteScore(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number * 10) / 10)) : null;
}

function safeErrorType(value) {
  const allowed = new Set(['None', 'Mispronunciation', 'Omission', 'Insertion', 'UnexpectedBreak', 'MissingBreak', 'Monotone']);
  return allowed.has(value) ? value : null;
}

function toPublicPronunciationResult(response) {
  const best = response?.NBest?.[0];
  const assessment = best?.PronunciationAssessment;
  if (!['Success', 0, '0'].includes(response?.RecognitionStatus) || !assessment) {
    throw new Error('Speech assessment did not return a usable result.');
  }
  const words = Array.isArray(best.Words) ? best.Words.slice(0, 100).map(item => ({
    word: String(item.Word || '').slice(0, 64),
    accuracy: finiteScore(item.PronunciationAssessment?.AccuracyScore),
    errorType: safeErrorType(item.PronunciationAssessment?.ErrorType),
    phonemes: Array.isArray(item.Phonemes) ? item.Phonemes.slice(0, 16).map(phoneme => ({
      expected: String(phoneme.Phoneme || '').slice(0, 12),
      accuracy: finiteScore(phoneme.PronunciationAssessment?.AccuracyScore),
      alternative: String(phoneme.PronunciationAssessment?.NBestPhonemes?.[0]?.Phoneme || '').slice(0, 12) || null
    })) : []
  })).filter(item => item.word) : [];

  return {
    recognizedText: String(best.Display || response.DisplayText || '').slice(0, 1200),
    pronunciationScore: finiteScore(assessment.PronScore),
    accuracyScore: finiteScore(assessment.AccuracyScore),
    fluencyScore: finiteScore(assessment.FluencyScore),
    completenessScore: finiteScore(assessment.CompletenessScore),
    prosodyScore: finiteScore(assessment.ProsodyScore),
    words
  };
}

async function assessPronunciationAudio(taskId, audioBuffer, env = process.env) {
  if (!pronunciationConfigured(env)) {
    const error = new Error('Pronunciation assessment is not configured.');
    error.status = 503;
    error.code = 'SPEECH_NOT_CONFIGURED';
    throw error;
  }
  const task = pronunciationTasks[taskId];
  if (!task) {
    const error = new Error('Unknown pronunciation task.');
    error.status = 404;
    error.code = 'UNKNOWN_SPEECH_TASK';
    throw error;
  }
  const validation = validateWavPcm16k(audioBuffer);
  if (!validation.ok) {
    const error = new Error(validation.reason);
    error.status = 400;
    error.code = 'INVALID_AUDIO';
    throw error;
  }
  const endpoint = 'https://' + env.AZURE_SPEECH_REGION +
    '.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1' +
    '?language=en-US&format=detailed';
  const assessmentConfig = {
    ReferenceText: task.referenceText,
    GradingSystem: 'HundredMark',
    Granularity: 'Phoneme',
    Dimension: 'Comprehensive',
    EnableMiscue: 'True',
    EnableProsodyAssessment: 'True'
  };
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': env.AZURE_SPEECH_KEY,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        'Pronunciation-Assessment': Buffer.from(JSON.stringify(assessmentConfig), 'utf8').toString('base64'),
        'Accept': 'application/json'
      },
      body: audioBuffer,
      signal: AbortSignal.timeout(40_000)
    });
  } catch {
    const error = new Error('Speech assessment service is temporarily unavailable.');
    error.status = 503;
    error.code = 'SPEECH_UPSTREAM_UNAVAILABLE';
    throw error;
  }
  if (!response.ok) {
    const error = new Error(
      response.status === 401 || response.status === 403
        ? 'The speech service credentials were rejected. Check the resource key and region in Render.'
        : response.status === 429
          ? 'Speech assessment rate limit reached. Try again later.'
          : 'The speech assessment service could not process this recording.'
    );
    error.status = response.status === 429 ? 429 : 502;
    error.code = 'SPEECH_UPSTREAM_ERROR';
    throw error;
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    const error = new Error('Speech assessment returned an invalid response.');
    error.status = 502;
    error.code = 'SPEECH_BAD_RESPONSE';
    throw error;
  }
  try {
    return {
      taskId,
      referenceText: task.referenceText,
      durationSeconds: Math.round(validation.durationSeconds),
      result: toPublicPronunciationResult(payload)
    };
  } catch {
    const error = new Error('Speech could not be matched to the practice text. Try recording it again, a little more slowly.');
    error.status = 422;
    error.code = 'SPEECH_NOT_RECOGNIZED';
    throw error;
  }
}

export {
  pronunciationTasks,
  pronunciationConfigured,
  validateWavPcm16k,
  toPublicPronunciationResult,
  assessPronunciationAudio
};
