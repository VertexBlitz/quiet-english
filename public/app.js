const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  }), { threshold: 0.08 });
  revealItems.forEach(item => observer.observe(item));
} else {
  revealItems.forEach(item => item.classList.add('visible'));
}

const form = document.querySelector('#chat-form');
if (form) {
  const input = document.querySelector('#chat-input');
  const messages = document.querySelector('#messages');
  const send = form.querySelector('button');
  const status = document.querySelector('#chat-status');
  const history = [];
  const topic = new URLSearchParams(location.search).get('topic');
  if (topic) input.value = 'I would like to practise ' + topic + '.';

  fetch('/api/health')
    .then(response => response.json())
    .then(data => {
      status.textContent = data.configured
        ? 'CLOUDFLARE AI · READY'
        : 'DEMO MODE · AI NOT CONFIGURED';
    })
    .catch(() => {
      status.textContent = 'CONNECTION ISSUE';
    });

  const addMessage = (role, text) => {
    const bubble = document.createElement('div');
    bubble.className = 'message ' + role;
    const speaker = document.createElement('span');
    speaker.className = 'speaker';
    speaker.textContent = role === 'user' ? 'YOU' : 'TUTOR';
    const content = document.createTextNode(text);
    bubble.append(speaker, content);
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || send.disabled) return;

    history.push({ role: 'user', content: text });
    addMessage('user', text);
    input.value = '';
    send.disabled = true;
    status.textContent = 'THINKING…';

    let assistantBubble = null;
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-12) })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Сервис ИИ временно недоступен.');
      }

      const data = await response.json();
      if (typeof data.message !== 'string' || !data.message.trim()) {
        throw new Error('Модель не вернула текстовый ответ. Попробуй ещё раз.');
      }
      assistantBubble = addMessage('assistant', data.message.trim());
      history.push({ role: 'assistant', content: data.message.trim() });
      status.textContent = 'CLOUDFLARE AI · READY';
    } catch (error) {
      const message = error.message || 'Попробуй отправить сообщение ещё раз.';
      if (assistantBubble) {
        assistantBubble.lastChild.textContent = message;
      } else {
        addMessage('assistant', message);
      }
      status.textContent = 'TEMPORARILY UNAVAILABLE';
    } finally {
      send.disabled = false;
      input.focus();
    }
  });
}
