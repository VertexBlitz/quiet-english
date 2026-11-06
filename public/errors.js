async function loadErrors() {
  const status = document.querySelector('[data-errors-status]');
  const list = document.querySelector('[data-errors-list]');
  try {
    const response = await fetch('/api/learning/errors', { credentials: 'same-origin' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Не удалось загрузить ошибки.');
    list.replaceChildren();
    if (!data.errors.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Пока нет открытых ошибок. После первых упражнений здесь появятся темы для повторения.';
      list.appendChild(empty);
      return;
    }
    data.errors.forEach(error => {
      const card = document.createElement('article');
      card.className = 'error-card';
      const meta = document.createElement('p');
      meta.className = 'eyebrow';
      meta.textContent = error.error_type + ' · ' + error.occurrences + ' occurrence(s)';
      const wrong = document.createElement('p');
      wrong.textContent = 'Your answer: ' + error.incorrect_form;
      const correct = document.createElement('p');
      correct.className = 'corrected-form';
      correct.textContent = 'Correction: ' + error.correction;
      const explanation = document.createElement('p');
      explanation.textContent = error.explanation || '';
      const button = document.createElement('button');
      button.className = 'button secondary';
      button.type = 'button';
      button.textContent = 'Mark as reviewed';
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          const result = await fetch('/api/learning/errors/' + encodeURIComponent(error.id) + '/resolve', {
            method: 'POST', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' }, body: '{}'
          });
          const body = await result.json().catch(() => ({}));
          if (!result.ok) throw new Error(body.error || 'Не удалось обновить ошибку.');
          card.remove();
          if (!list.children.length) {
            const empty = document.createElement('p');
            empty.textContent = 'Отлично! Сейчас нет открытых ошибок.';
            list.appendChild(empty);
          }
        } catch (e) {
          status.textContent = e.message;
          status.classList.add('error-text');
          button.disabled = false;
        }
      });
      card.append(meta, wrong, correct, explanation, button);
      list.appendChild(card);
    });
  } catch (error) {
    status.textContent = error.message;
    status.classList.add('error-text');
  }
}
loadErrors();
