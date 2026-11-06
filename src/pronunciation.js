export function normalizePronunciationResult(payload) {
  const result = payload?.NBest?.[0];
  if (!result || payload?.RecognitionStatus !== 'Success') return null;

  const words = Array.isArray(result.Words) ? result.Words.map(item => ({
    word: String(item.Word || ''),
    accuracy: Number.isFinite(Number(item.AccuracyScore)) ? Number(item.AccuracyScore) : null,
    errorType: String(item.ErrorType || 'None'),
    syllables: Array.isArray(item.Syllables) ? item.Syllables.map(syllable => ({
      text: String(syllable.Syllable || ''),
      accuracy: Number.isFinite(Number(syllable.AccuracyScore)) ? Number(syllable.AccuracyScore) : null
    })) : [],
    phonemes: Array.isArray(item.Phonemes) ? item.Phonemes.map(phoneme => ({
      phoneme: String(phoneme.Phoneme || ''),
      accuracy: Number.isFinite(Number(phoneme.AccuracyScore)) ? Number(phoneme.AccuracyScore) : null
    })) : []
  })) : [];

  const score = key => Number.isFinite(Number(result[key])) ? Number(result[key]) : null;
  return {
    recognizedText: String(result.Display || result.Lexical || payload.DisplayText || ''),
    pronScore: score('PronScore'),
    accuracyScore: score('AccuracyScore'),
    fluencyScore: score('FluencyScore'),
    completenessScore: score('CompletenessScore'),
    prosodyScore: score('ProsodyScore'),
    words
  };
}
