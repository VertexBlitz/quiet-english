const STORAGE_KEY = 'quiet-english-speaking-history-v1';

export function readLocalPronunciationHistory(storage, languageCode = 'en') {
  try {
    const value = storage.getItem(STORAGE_KEY);
    const parsed = value ? JSON.parse(value) : [];
    // Previous releases stored one English-only array. Preserve it as English history.
    if (Array.isArray(parsed)) return languageCode === 'en' ? parsed.slice(0, 8) : [];
    const items = parsed && typeof parsed === 'object' ? parsed[languageCode] : null;
    return Array.isArray(items) ? items.slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function saveLocalPronunciationAttempt(storage, attempt, languageCode = 'en') {
  try {
    const stored = storage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    const byLanguage = Array.isArray(parsed)
      ? { en: parsed }
      : (parsed && typeof parsed === 'object' ? parsed : {});
    const existing = Array.isArray(byLanguage[languageCode]) ? byLanguage[languageCode] : [];
    byLanguage[languageCode] = [attempt, ...existing].slice(0, 8);
    storage.setItem(STORAGE_KEY, JSON.stringify(byLanguage));
    return true;
  } catch {
    return false;
  }
}
