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
  const query = new URLSearchParams(location.search);
  const topic = query.get('topic');
  let exerciseContextRef = query.get('exercise');
  if (exerciseContextRef) input.value = 'Please explain my latest attempt and common mistakes in exercise ' + exerciseContextRef + '.';
  else if (topic) input.value = 'I would like to practise ' + topic + '.';

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

  const fetchLearning = async path => {
    if (window.QEDemo && await window.QEDemo.ensure()) return window.QEDemo.request(path);
    const response = await fetch('/api/learning' + path, { credentials: 'same-origin' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Сначала войди в аккаунт, чтобы открыть учебные данные.');
    return data;
  };

  const executeCommand = async command => {
    if (window.QEDemo && await window.QEDemo.ensure()) return window.QEDemo.command(command);
    if (command === '/today') {
      const { today } = await fetchLearning('/today');
      return `**Today · Week ${today.week_number}, Day ${today.day_index}**\n\n**Theme:** ${today.theme}\n\n**Main task:** ${today.main_task?.objective || 'No task assigned'}\n\n**Review due:** ${today.review_due}\n\n**Mini practice:** ${today.mini_prompt}`;
    }
    if (command === '/plan') {
      const { plan } = await fetchLearning('/plan');
      return `**Your ${plan.duration_weeks}-week plan · ${plan.level}**\n\n${(plan.weeks || []).map(week => `**Week ${week.week_number}: ${week.theme}**\n${week.objective}`).join('\n\n')}`;
    }
    if (command === '/practice') {
      const { exercises } = await fetchLearning('/exercises');
      return `**Practice library**\n\n${exercises.slice(0, 8).map(item => `- **${item.id} · ${item.skill} · ${item.level}** — ${item.objective} (${item.estimated_time} min)`).join('\n')}\n\nOpen Practice to choose an exercise.`;
    }
    if (command === '/review') {
      const { items } = await fetchLearning('/review/queue');
      return items.length
        ? `**Review queue · ${items.length} items due**\n\n${items.slice(0, 5).map(item => `- ${item.prompt}`).join('\n')}\n\nOpen Review to practise them.`
        : 'There are no cards due right now. New review cards appear after exercises.';
    }
    if (command === '/progress') {
      const { summary, skills } = await fetchLearning('/progress');
      return `**Your progress**\n\n- Learning time: ${summary.minutes} minutes\n- Completed tasks: ${summary.completed_tasks}\n- Active days: ${summary.active_days}\n- Open errors: ${summary.open_errors}\n\n**Skill accuracy**\n${skills.map(item => `- ${item.skill}: ${item.accuracy == null ? 'not enough data' : item.accuracy + '%'}`).join('\n') || 'Complete a few exercises to build your skill profile.'}`;
    }
    return null;
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
      const command = text.trim().split(' ', 1)[0].toLowerCase();
      if (['/plan','/today','/practice','/review','/progress'].includes(command)) {
        const answer = await executeCommand(command);
        addMessage('assistant', answer);
        history.push({ role: 'assistant', content: answer });
        status.textContent = 'CLOUDFLARE AI · READY';
        return;
      }

      const requestBody = { messages: history.slice(-12) };
      if (exerciseContextRef) {
        if (window.QEDemo && await window.QEDemo.ensure()) {
          const { exercise } = await window.QEDemo.request('/exercises/' + encodeURIComponent(exerciseContextRef));
          requestBody.messages.push({
            role: 'user',
            content: 'Please explain this practice item at my level. Objective: ' + exercise.objective +
              '. Prompt: ' + (exercise.content?.prompt || '') +
              '. Options: ' + (exercise.content?.options || []).map(option => option.text).join('; ') +
              '. Instructions: ' + (exercise.instructions?.ru || exercise.instructions?.en || '') +
              '. Explain the rule and invite me to try, without simply giving away the answer.'
          });
        } else {
          requestBody.context_ref = exerciseContextRef;
        }
        exerciseContextRef = null;
      }
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
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
