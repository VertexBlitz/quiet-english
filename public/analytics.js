(() => {
const root=document.querySelector('[data-analytics-page]');if(!root)return;
const $=s=>root.querySelector(s),status=$('[data-analytics-status]'),chart=$('[data-analytics-chart]'),skills=$('[data-analytics-skills]'),summary=$('[data-analytics-summary]'),errors=$('[data-analytics-errors]');
const labels={grammar:'Грамматика',vocabulary:'Лексика',reading:'Чтение',listening:'Аудирование',writing:'Письмо',speaking:'Говорение'};
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
async function load(range){
 status.textContent='Загружаем реальные результаты…';
 try{
  const response=await fetch('/api/studio/analytics?range='+encodeURIComponent(range),{credentials:'same-origin'});
  const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'Не удалось загрузить аналитику.');
  const totals=data.summary||{minutes:0,tasks:0,active_days:0};
  summary.replaceChildren();
  [[totals.minutes+' мин','Учебное время'],[totals.tasks+'','Выполнено заданий'],[totals.active_days+'','Активных дней'],[data.due_vocabulary+'','Слова к повторению']].forEach(pair=>{const box=make('article','analytics-summary-card');box.append(make('strong','',pair[0]),make('span','',pair[1]));summary.append(box);});
  chart.replaceChildren();
  const points=data.activity||[];
  if(!points.length)chart.append(make('p','fine-print','Здесь появятся занятия после первых сохранённых результатов.'));
  else{
   const max=Math.max(1,...points.map(p=>Number(p.minutes||0)));
   points.forEach(point=>{
    const col=make('div','analytics-bar-column');
    const value=make('strong','',String(point.minutes||0)+' мин');
    const track=make('div','analytics-bar-track'),bar=make('span','analytics-bar');
    bar.style.height=Math.max(3,Number(point.minutes||0)/max*100)+'%';track.append(bar);
    const label=make('small','',point.period);col.append(value,track,label);chart.append(col);
   });
  }
  skills.replaceChildren();
  let known=(data.skills||[]).filter(s=>Number(s.attempts)>0&&s.accuracy!==null);
  known.forEach(skill=>{
   const card=make('article','analytics-skill-card'),name=make('strong','',labels[skill.skill]||skill.skill);
   const accuracy=make('span','',skill.accuracy+'%'),meta=make('small','',skill.attempts+' попыток');
   const track=make('div','analytics-bar-track'),bar=make('span','analytics-skill-fill');
   bar.style.width=skill.accuracy+'%';track.append(bar);card.append(name,accuracy,meta,track);skills.append(card);
  });
  if(!known.length)skills.append(make('p','fine-print','Пока недостаточно попыток для оценки навыков.'));
  errors.replaceChildren();
  const repeated=data.repeated_errors||[];
  if(!repeated.length)errors.append(make('p','fine-print','Повторяющиеся ошибки пока не зафиксированы.'));
  else{errors.append(make('h3','','На что обратить внимание'));repeated.forEach(item=>errors.append(make('p','',item.error_type+' · '+item.occurrences+' повторений')));}
  const best=known.slice().sort((a,b)=>Number(b.accuracy)-Number(a.accuracy))[0];
  const weak=known.slice().sort((a,b)=>Number(a.accuracy)-Number(b.accuracy))[0];
  if(best&&weak){
   const note=make('p','analytics-insight','Сильная сторона: '+(labels[best.skill]||best.skill)+' ('+best.accuracy+'%). Навык для следующего фокуса: '+(labels[weak.skill]||weak.skill)+' ('+weak.accuracy+'%).');
   summary.append(note);
  }
  status.textContent='Обновлено по сохранённым учебным данным.';
 }catch(error){status.textContent=error.message;status.classList.add('error-text');}
}
root.querySelectorAll('[data-analytics-range]').forEach(button=>button.addEventListener('click',()=>{
 root.querySelectorAll('[data-analytics-range]').forEach(x=>x.classList.toggle('is-active',x===button));
 load(button.dataset.analyticsRange);
}));
load('7d');
})();