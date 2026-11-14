(() => {
  const root = document.querySelector('[data-home-dashboard]');
  if (!root) return;
  const $ = selector => root.querySelector(selector);
  const state = { plan:null, today:null, summary:null, due:0, ready:false, needsSetup:false, error:'' };
  const lang = () => document.documentElement.lang === 'en' ? 'en' : 'ru';
  const t = (ru,en) => lang() === 'en' ? en : ru;
  const pick = value => value && typeof value === 'object' ? (value[lang()] ?? value.en ?? value.ru ?? '') : (value ?? '');
  const make = (tag,cls,value) => { const el=document.createElement(tag); if(cls)el.className=cls; if(value!==undefined)el.textContent=String(value); return el; };
  const anchor = (href,ru,en,cls='text-link') => { const el=make('a',cls,t(ru,en)); el.href=href; return el; };
  async function get(url) {
    const response=await fetch(url,{credentials:'same-origin',cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'Request failed');
    return data;
  }
  function renderMetrics() {
    const host=$('[data-home-dashboard-metrics]'); host.replaceChildren();
    const s=state.summary||{};
    [[s.minutes||0,t('минут обучения','learning minutes')],[s.completed_tasks||0,t('заданий выполнено','tasks completed')],[s.active_days||0,t('активных дней','active days')],[state.due,t('карточек к повторению','cards due')]].forEach(([value,label])=>{
      const card=make('article','home-dashboard-metric'); card.append(make('strong','',value),make('span','',label)); host.append(card);
    });
  }
  function renderShortcuts() {
    const host=$('[data-home-dashboard-shortcuts]'); host.replaceChildren(make('p','eyebrow',t('БЫСТРЫЕ ПЕРЕХОДЫ','QUICK LINKS')));
    host.append(
      anchor('/review.html','Повторить слова и карточки →','Review words and cards →'),
      anchor('/progress.html','Посмотреть прогресс →','View progress →'),
      anchor('/calendar.html','Запланировать занятие →','Schedule a session →'),
      anchor('/tutor.html','Начать разговор с AI →','Start an AI conversation →')
    );
  }
  function render() {
    if(!state.ready)return;
    root.hidden=false;
    renderMetrics();
    const host=$('[data-home-dashboard-today]'); host.replaceChildren();
    if(state.needsSetup||!state.plan) {
      const card=make('article','home-dashboard-task');
      card.append(make('p','eyebrow',t('НАСТРОЙКА ОБУЧЕНИЯ','LEARNING SETUP')),
        make('h3','',t('Создай свой первый учебный план.','Create your first learning plan.')),
        make('p','',t('Выбери изучаемый язык, цель и удобную ежедневную нагрузку, затем пройди проверку уровня.','Choose a study language, goal and daily study time, then complete a placement check.')),
        anchor('/onboarding.html','Настроить обучение ↗','Set up learning ↗','button'));
      host.append(card);
      $('[data-home-dashboard-intro]').textContent=t('Твой личный учебный маршрут начинается с короткой настройки.','Your personal learning path starts with a quick setup.');
    } else {
      const plan=state.plan, today=state.today||{}, task=today.main_task;
      const card=make('article','home-dashboard-task');
      card.append(make('p','eyebrow',[plan.level||'—',plan.goal,plan.minutes_per_day ? plan.minutes_per_day+' '+t('минут в день','min per day') : ''].filter(Boolean).join(' · ')));
      if(today.week_number&&today.day_index)card.append(make('p','home-dashboard-kicker',t('Неделя','Week')+' '+today.week_number+' · '+t('День','Day')+' '+today.day_index));
      card.append(make('h3','',pick(today.theme)||t('Продолжай свой учебный маршрут.','Continue your learning path.')));
      if(task) {
        card.append(make('p','home-dashboard-task-meta',[task.level,task.skill,task.estimated_time?task.estimated_time+' '+t('мин','min'):''].filter(Boolean).join(' · ')),
          make('h4','',pick(task.objective)||t('Задание на сегодня','Today’s task')),
          make('p','',pick(today.objective)||t('Выполни основное задание, затем повтори карточки.','Complete the main task, then review your cards.')),
          anchor('/exercise.html?id='+encodeURIComponent(task.id),'Начать задание ↗','Start today’s task ↗','button'));
      } else {
        card.append(make('p','',t('Отдельное задание не назначено. Выбери упражнение из библиотеки практики.','No task has been assigned. Choose an exercise from the practice library.')),
          anchor('/practice.html','Открыть практику ↗','Open practice ↗','button'));
      }
      if(today.mini_prompt) { const mini=make('p','home-dashboard-mini-prompt'); mini.append(make('strong','',t('Мини-практика: ','Mini practice: ')),document.createTextNode(pick(today.mini_prompt))); card.append(mini); }
      host.append(card);
      $('[data-home-dashboard-intro]').textContent=t('План, повторение и прогресс собраны на одном экране.','Your plan, review and progress are together in one place.');
    }
    $('[data-home-dashboard-status]').textContent=state.error;
    renderShortcuts();
  }
  async function init() {
    try {
      const me=await get('/api/auth/me');
      if(!me.user)return;
      state.ready=true; root.hidden=false;
      const results=await Promise.allSettled([
        get('/api/learning/plan'),get('/api/learning/today'),get('/api/learning/progress'),get('/api/learning/review/queue')
      ]);
      if(results[0].status==='fulfilled')state.plan=results[0].value.plan||null; else state.needsSetup=true;
      if(results[1].status==='fulfilled')state.today=results[1].value.today||null;
      if(results[2].status==='fulfilled')state.summary=results[2].value.summary||null;
      if(results[3].status==='fulfilled')state.due=(results[3].value.items||[]).length;
      if(results.some(result=>result.status==='rejected')&&!state.needsSetup)state.error=t('Часть данных не загрузилась. Открой учебный план, чтобы проверить соединение.','Some data could not be loaded. Open your learning plan to check the connection.');
      render();
    } catch { /* Public visitors keep the standard landing page. */ }
  }
  window.addEventListener('quietenglish:languagechange',render);
  init();
})();