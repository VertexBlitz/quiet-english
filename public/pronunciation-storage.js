const STORAGE_KEY = 'quiet-english-speaking-history-v1';

export function readLocalPronunciationHistory(storage) {
  try {
    const value = storage.getItem(STORAGE_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function saveLocalPronunciationAttempt(storage, attempt) {
  try {
    const existing = readLocalPronunciationHistory(storage);
    const next = [attempt, ...existing].slice(0, 8);
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}
