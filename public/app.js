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

  // Build a small, safe Markdown subset using DOM nodes (never innerHTML).
  const renderInlineMarkdown = (text, parent) => {
    const pattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_|\x60[^\x60]+\x60)/g;
    let cursor = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      if (match.index > cursor) {
        parent.appendChild(document.createTextNode(text.slice(cursor, match.index)));
      }

      const token = match[0];
      let element;
      let value;

      if (token.startsWith('**') || token.startsWith('__')) {
        element = document.createElement('strong');
        value = token.slice(2, -2);
      } else if (token.startsWith('`')) {
        element = document.createElement('code');
        value = token.slice(1, -1);
      } else {
        element = document.createElement('em');
        value = token.slice(1, -1);
      }

      element.textContent = value;
      parent.appendChild(element);
      cursor = match.index + token.length;
    }

    if (cursor < text.length) {
      parent.appendChild(document.createTextNode(text.slice(cursor)));
    }
  };

  const renderFormattedReply = text => {
    const content = document.createElement('div');
    content.className = 'message-content';

    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    let paragraph = [];
    let list = null;
    let listType = null;

    const flushParagraph = () => {
      if (!paragraph.length) return;
      const p = document.createElement('p');
      renderInlineMarkdown(paragraph.join(' ').trim(), p);
      content.appendChild(p);
      paragraph = [];
    };

    const flushList = () => {
      if (!list) return;
      content.appendChild(list);
      list = null;
      listType = null;
    };

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();

      if (!line.trim()) {
        flushParagraph();
        flushList();
        continue;
      }

      if (/^\s*([-*_])\1\1+\s*$/.test(line)) {
        flushParagraph();
        flushList();
        content.appendChild(document.createElement('hr'));
        continue;
      }

      const heading = line.match(/^\s{0,3}(#{1,3})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        flushList();
        const h = document.createElement(heading[1].length === 1 ? 'h3' : 'h4');
        renderInlineMarkdown(heading[2], h);
        content.appendChild(h);
        continue;
      }

      const ordered = line.match(/^\s*(\d+)[.)]\s+(.+)$/);
      const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
      const item = ordered || unordered;

      if (item) {
        flushParagraph();
        const nextType = ordered ? 'ol' : 'ul';
        if (!list || listType !== nextType) {
          flushList();
          list = document.createElement(nextType);
          listType = nextType;
        }

        const li = document.createElement('li');
        const indent = rawLine.match(/^\s*/)?.[0].length || 0;
        if (indent >= 2) li.classList.add('nested-item');
        renderInlineMarkdown(item[ordered ? 2 : 1], li);
        list.appendChild(li);
        continue;
      }

      flushList();
      paragraph.push(line.trim());
    }

    flushParagraph();
    flushList();

    if (!content.childNodes.length) {
      content.textContent = text;
    }
    return content;
  };

  const addMessage = (role, text) => {
    const bubble = document.createElement('div');
    bubble.className = 'message ' + role;

    const speaker = document.createElement('span');
    speaker.className = 'speaker';
    speaker.textContent = role === 'user' ? 'YOU' : 'TUTOR';

    if (role === 'assistant') {
      bubble.append(speaker, renderFormattedReply(text));
    } else {
      bubble.append(speaker, document.createTextNode(text));
    }

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
      addMessage('assistant', data.message.trim());
      history.push({ role: 'assistant', content: data.message.trim() });
      status.textContent = 'CLOUDFLARE AI · READY';
    } catch (error) {
      addMessage('assistant', error.message || 'Попробуй отправить сообщение ещё раз.');
      status.textContent = 'TEMPORARILY UNAVAILABLE';
    } finally {
      send.disabled = false;
      input.focus();
    }
  });
}
