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

  const readSseStream = async (response, bubble) => {
    if (!response.body) throw new Error('Поток ответа недоступен. Обнови страницу и попробуй снова.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let answer = '';
    let finished = false;

    const processFrame = frame => {
      const dataLines = frame
        .split(/\r?\n/)
        .filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).trim());

      for (const data of dataLines) {
        if (!data || data === '[DONE]') {
          if (data === '[DONE]') finished = true;
          continue;
        }
        try {
          const payload = JSON.parse(data);
          const delta = payload.choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta.length) {
            answer += delta;
            bubble.lastChild.textContent = answer;
            messages.scrollTop = messages.scrollHeight;
          }
        } catch {
          // Ignore non-JSON SSE keepalive/event frames.
        }
      }
    };

    while (!finished) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() || '';
      for (const frame of frames) processFrame(frame);
    }

    buffer += decoder.decode();
    if (buffer.trim()) processFrame(buffer);
    return answer;
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

      assistantBubble = addMessage('assistant', '');
      const answer = await readSseStream(response, assistantBubble);
      if (!answer) {
        assistantBubble.lastChild.textContent = 'Не удалось получить текстовый ответ. Попробуй ещё раз.';
        status.textContent = 'NO RESPONSE';
      } else {
        history.push({ role: 'assistant', content: answer });
        status.textContent = 'CLOUDFLARE AI · READY';
      }
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
