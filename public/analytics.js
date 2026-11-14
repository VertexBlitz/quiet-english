(() => {
  const root=document.querySelector('[data-analytics-page]');
  if(!root)return;
  const $=selector=>root.querySelector(selector);
  const status=$('[data-analytics-status]'),chart=$('[data-analytics-chart]'),skills=$('[data-analytics-skills]'),summary=$('[data-analytics-summary]'),errors=$('[data-analytics-errors]');
  const strings={
    ru:{loading:'Загружаем реальные результаты…',minutes:'Учебное время',tasks:'Выполнено заданий',days:'Активных дней',due:'Слова к повторению',emptyChart:'Здесь появятся занятия после первых сохранённых результатов.',emptySkills:'Пока недостаточно попыток для оценки навыков.',attempts:'попыток',emptyErrors:'Повторяющиеся ошибки пока не зафиксированы.',focus:'На что обратить внимание',best:'Сильная сторона',next:'Навык для следующего фокуса',refreshed:'Обновлено по сохранённым учебным данным.',min:'мин',skills:{grammar:'Грамматика',vocabulary:'Лексика',reading:'Чтение',listening:'Аудирование',writing:'Письмо',speaking:'Говорение'}},
    en:{loading:'Loading saved learning results…',minutes:'Study time',tasks:'Tasks completed',days:'Active days',due:'Words due for review',emptyChart:'Your activity will appear here after your first saved sessions.',emptySkills:'There are not enough attempts to assess skills yet.',attempts:'attempts',emptyErrors:'No recurring errors have been recorded yet.',focus:'Focus areas',best:'Strongest skill',next:'Next skill to focus on',refreshed:'Updated from your saved learning data.',min:'min',skills:{grammar:'Grammar',vocabulary:'Vocabulary',reading:'Reading',listening:'Listening',writing:'Writing',speaking:'Speaking'}}
  };
  const lang=()=>document.documentElement.lang==='en'?'en':'ru';
  const t=key=>strings[lang()][key];
  const make=(tag,cls,value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=String(value);return el;};
  let selectedRange='7d',lastData=null;
  function period(value){
    const date=new Date(String(value||'')+'T12:00:00');
    if(Number.isNaN(date.getTime()))return String(value||'');
    const options=selectedRange==='all'?{month:'short',year:'numeric'}:{day:'numeric',month:'short'};
    return date.toLocaleDateString(lang()==='en'?'en-GB':'ru-RU',options);
  }
  function render(data){
    const totals=data.summary||{minutes:0,tasks:0,active_days:0};
    summary.replaceChildren();
    [[String(totals.minutes||0)+' '+t('min'),t('minutes')],[totals.tasks||0,t('tasks')],[totals.active_days||0,t('days')],[data.due_vocabulary||0,t('due')]].forEach(([value,label])=>{
      const card=make('article','analytics-summary-card');card.append(make('strong','',value),make('span','',label));summary.append(card);
    });
    chart.replaceChildren();
    const points=Array.isArray(data.activity)?data.activity:[];
    if(!points.length)chart.append(make('p','fine-print',t('emptyChart')));
    else{
      const max=Math.max(1,...points.map(point=>Number(point.minutes||0)));
      points.forEach(point=>{
        const column=make('div','analytics-bar-column'),value=make('strong','',Number(point.minutes||0)+' '+t('min'));
        const track=make('div','analytics-bar-track'),bar=make('span','analytics-bar');
        bar.style.height=Math.max(3,Number(point.minutes||0)/max*100)+'%';track.append(bar);
        column.append(value,track,make('small','',period(point.period)));chart.append(column);
      });
    }
    skills.replaceChildren();
    const known=(Array.isArray(data.skills)?data.skills:[]).filter(item=>Number(item.attempts)>0&&item.accuracy!==null);
    known.forEach(item=>{
      const card=make('article','analytics-skill-card'),label=t('skills')[item.skill]||item.skill;
      const value=Math.max(0,Math.min(100,Number(item.accuracy)||0));
      const track=make('div','analytics-bar-track'),bar=make('span','analytics-skill-fill');
      bar.style.width=value+'%';track.append(bar);
      card.append(make('strong','',label),make('span','',value+'%'),make('small','',item.attempts+' '+t('attempts')),track);skills.append(card);
    });
    if(!known.length)skills.append(make('p','fine-print',t('emptySkills')));
    errors.replaceChildren();
    const repeated=Array.isArray(data.repeated_errors)?data.repeated_errors:[];
    if(!repeated.length)errors.append(make('p','fine-print',t('emptyErrors')));
    else{
      errors.append(make('h3','',t('focus')));
      repeated.forEach(item=>errors.append(make('p','',String(item.error_type||'')+' · '+String(item.occurrences||item.count||0))));
    }
    const ranked=known.slice().sort((a,b)=>Number(b.accuracy)-Number(a.accuracy));
    if(ranked.length){
      const strong=ranked[0],weak=ranked[ranked.length-1],labels=t('skills');
      summary.append(make('p','analytics-insight',t('best')+': '+(labels[strong.skill]||strong.skill)+' ('+strong.accuracy+'%). '+t('next')+': '+(labels[weak.skill]||weak.skill)+' ('+weak.accuracy+'%).'));
    }
    status.textContent=t('refreshed');status.classList.remove('error-text');
  }
  async function load(range){
    selectedRange=['7d','30d','all'].includes(range)?range:'7d';
    status.textContent=t('loading');status.classList.remove('error-text');
    try{
      const response=await fetch('/api/studio/analytics?range='+encodeURIComponent(selectedRange),{credentials:'same-origin',cache:'no-store'});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||(lang()==='en'?'Could not load analytics.':'Не удалось загрузить аналитику.'));
      lastData=data;render(data);
    }catch(error){status.textContent=error.message;status.classList.add('error-text');}
  }
  root.querySelectorAll('[data-analytics-range]').forEach(button=>button.addEventListener('click',()=>{
    root.querySelectorAll('[data-analytics-range]').forEach(item=>item.classList.toggle('is-active',item===button));
    load(button.dataset.analyticsRange);
  }));
  window.addEventListener('quietenglish:languagechange',()=>lastData?render(lastData):load(selectedRange));
  load('7d');
})();