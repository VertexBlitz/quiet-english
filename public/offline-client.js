(() => {
  const DB_NAME = 'quiet-english-offline-v1';
  const STORE = 'materials';

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('Браузер не поддерживает локальное хранилище.'));
        return;
      }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('savedAt', 'savedAt');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Не удалось открыть локальное хранилище.'));
      request.onblocked = () => reject(new Error('Закрой другие вкладки Quiet English и повтори попытку.'));
    });
  }

  async function save(item) {
    if (!item || typeof item.id !== 'string' || !item.id) {
      throw new Error('У материала отсутствует идентификатор.');
    }
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ ...item, savedAt: new Date().toISOString() });
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { const error = tx.error; db.close(); reject(error); };
      tx.onabort = () => { const error = tx.error; db.close(); reject(error || new Error('Сохранение отменено.')); };
    });
  }

  async function all() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      request.onsuccess = () => { db.close(); resolve(request.result || []); };
      request.onerror = () => { const error = request.error; db.close(); reject(error); };
    });
  }

  async function remove(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { const error = tx.error; db.close(); reject(error); };
      tx.onabort = () => { const error = tx.error; db.close(); reject(error || new Error('Удаление отменено.')); };
    });
  }

  window.QuietOffline = { save, all, remove };

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(error => {
        console.warn('Quiet English offline mode could not be enabled:', error?.message || 'unknown error');
      });
    });
  }
})();
