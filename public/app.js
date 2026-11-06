const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: 0.08 });
  revealItems.forEach(item => observer.observe(item));
} else revealItems.forEach(item => item.classList.add('visible'));

const form = document.querySelector('#chat-form');
if (form) {
  const input = document.querySelector('#chat-input');
  const messages = document.querySelector('#messages');
  const send = form.querySelector('button');
  const status = document.querySelector('#chat-status');
  const history = [];
  const topic = new URLSearchParams(location.search).get('topic');
  if (topic) input.value = 'I would like to practise ' + topic + '.';

  const addMessage = (role, text) => {
    const bubble = document.createElement('div');
    bubble.className = 'message ' + role;
    const speaker = document.createElement('span');
    speaker.className = 'speaker';
    speaker.textContent = role === 'user' ? 'YOU' : 'TUTOR';
    bubble.append(speaker, document.createTextNode(text));
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
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
    try {
      const response = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-16) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The tutor is unavailable.');
      addMessage('assistant', data.message);
      history.push({ role: 'assistant', content: data.message });
      status.textContent = data.demo ? 'DEMO MODE · LIVE AI NOT CONFIGURED' : 'GPT TUTOR · READY';
    } catch (error) {
      addMessage('assistant', error.message || 'Please try again.');
      status.textContent = 'CONNECTION ISSUE';
    } finally {
      send.disabled = false;
      input.focus();
    }
  });
}
