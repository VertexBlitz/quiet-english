(() => {
  const root = document.querySelector('[data-vocabulary-page]');
  if (!root) return;

  const form = root.querySelector('[data-vocabulary-form]');
  const list = root.querySelector('[data-vocabulary-list]');
  const status = root.querySelector('[data-vocabulary-status]');
  const search = root.querySelector('[data-vocabulary-search]');
  const submit = root.querySelector('[data-vocabulary-submit]');
  const cancel = root.querySelector('[data-vocabulary-cancel]');
  const genderField = root.querySelector('[data-gender-field]');
  const pluralField = root.querySelector('[data-plural-field]');
  const rowsById = new Map();
  let entries = [];
  let languageCode = 'en';

  async function api(path, options = {}) {
    if (window.QEDemo && await window.QEDemo.ensure()) {
      return window.QEDemo.request(path, options);
    }
    const response = await fetch('/api/learning' + path, {
      credentials: 'same-origin',
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Не удалось выполнить запрос к словарю.');
    return data;
  }

  function showStatus(message, isError = false) {
    status.textContent = message || '';
    status.classList.toggle('error-text', isError);
    status.classList.toggle('success-text', Boolean(message) && !isError);
  }

  function formData() {
    const data = new FormData(form);
    return {
      term: String(data.get('term') || '').trim(),
      translation: String(data.get('translation') || '').trim(),
      part_of_speech: String(data.get('part_of_speech') || '').trim(),
      grammatical_gender: data.get('grammatical_gender') || null,
      plural_form: String(data.get('plural_form') || '').trim(),
      example_sentence: String(data.get('example_sentence') || '').trim(),
      notes: String(data.get('notes') || '').trim()
    };
  }

  function resetForm() {
    form.reset();
    form.elements.namedItem('entry_id').value = '';
    root.querySelector('[data-vocabulary-form-title]').textContent = 'Новое слово';
    submit.textContent = 'Добавить в словарь ↗';
    cancel.hidden = true;
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase();
    const matching = entries.filter(entry =>
      [entry.term, entry.translation, entry.part_of_speech, entry.example_sentence, entry.notes]
        .some(value => String(value || '').toLocaleLowerCase().includes(query))
    );
    root.querySelector('[data-vocabulary-count]').textContent = String(entries.length);
    list.replaceChildren();
    if (!matching.length) {
      const empty = document.createElement('p');
      empty.className = 'vocabulary-empty';
      empty.textContent = entries.length
        ? 'По этому запросу ничего не найдено.'
        : 'Пока нет слов. Добавь первое слово в форму слева.';
      list.appendChild(empty);
      return;
    }

    matching.forEach(entry => {
      const card = document.createElement('article');
      card.className = 'vocabulary-entry';
      const meta = document.createElement('p');
      meta.className = 'vocabulary-entry-meta';
      meta.textContent = [
        entry.part_of_speech,
        entry.grammatical_gender ? ({ masculine: 'der · Maskulin', feminine: 'die · Feminin', neuter: 'das · Neutrum' })[entry.grammatical_gender] : '',
        entry.plural_form ? 'Plural: ' + entry.plural_form : ''
      ].filter(Boolean).join(' · ') || 'VOCABULARY';
      const title = document.createElement('h3');
      title.textContent = entry.term;
      const translation = document.createElement('p');
      translation.textContent = entry.translation || 'Перевод не добавлен';
      card.append(meta, title, translation);
      if (entry.example_sentence) {
        const example = document.createElement('p');
        example.textContent = 'Пример: ' + entry.example_sentence;
        card.appendChild(example);
      }
      if (entry.notes) {
        const notes = document.createElement('p');
        notes.textContent = 'Заметка: ' + entry.notes;
        card.appendChild(notes);
      }
      const actions = document.createElement('div');
      actions.className = 'vocabulary-entry-actions';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = 'Изменить';
      edit.addEventListener('click', () => editEntry(entry));
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Удалить';
      remove.addEventListener('click', async () => {
        if (!window.confirm('Удалить это слово из словаря?')) return;
        remove.disabled = true;
        try {
          await api('/vocabulary/' + encodeURIComponent(entry.id), { method: 'DELETE' });
          entries = entries.filter(item => item.id !== entry.id);
          render();
          showStatus('Слово удалено.');
        } catch (error) {
          showStatus(error.message, true);
          remove.disabled = false;
        }
      });
      actions.append(edit, remove);
      card.appendChild(actions);
      list.appendChild(card);
    });
  }

  function editEntry(entry) {
    form.elements.namedItem('entry_id').value = entry.id;
    for (const key of ['term','translation','part_of_speech','grammatical_gender','plural_form','example_sentence','notes']) {
      const field = form.elements.namedItem(key);
      if (field) field.value = entry[key] || '';
    }
    root.querySelector('[data-vocabulary-form-title]').textContent = 'Изменить слово';
    submit.textContent = 'Сохранить изменения ↗';
    cancel.hidden = false;
    form.elements.namedItem('term').focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = submit;
    button.disabled = true;
    try {
      const entryId = form.elements.namedItem('entry_id').value;
      const data = await api(entryId ? '/vocabulary/' + encodeURIComponent(entryId) : '/vocabulary', {
        method: entryId ? 'PUT' : 'POST',
        body: JSON.stringify(formData())
      });
      if (entryId) entries = entries.map(entry => entry.id === entryId ? data.entry : entry);
      else entries.unshift(data.entry);
      resetForm();
      render();
      showStatus(entryId ? 'Изменения сохранены.' : 'Слово добавлено в словарь.');
    } catch (error) {
      showStatus(error.message, true);
    } finally {
      button.disabled = false;
    }
  });

  cancel.addEventListener('click', resetForm);
  search.addEventListener('input', render);

  async function init() {
    try {
      if (window.QEDemo && await window.QEDemo.ensure()) {
        languageCode = window.QEDemo.getActiveLanguage?.() || 'en';
      } else {
        const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (response.ok) {
          const data = await response.json();
          languageCode = data.user?.language_code || 'en';
        }
      }
      root.querySelector('[data-vocabulary-language]').textContent =
        'Курс: ' + (languageCode === 'de' ? 'Deutsch' : 'English');
      genderField.hidden = languageCode !== 'de';
      pluralField.hidden = languageCode !== 'de';
      const data = await api('/vocabulary');
      entries = Array.isArray(data.entries) ? data.entries : [];
      render();
    } catch (error) {
      showStatus(error.message, true);
      list.replaceChildren();
      const empty = document.createElement('p');
      empty.className = 'vocabulary-empty';
      empty.textContent = 'Не удалось загрузить словарь.';
      list.appendChild(empty);
    }
  }

  init();
})();