(() => {
const root=document.querySelector('[data-studio-page]');if(!root)return;
const $=s=>root.querySelector(s),status=$('[data-coach-status]'),summary=$('[data-coach-summary]'),recommendations=$('[data-coach-recommendations]'),tasksNode=$('[data-coach-tasks]');
const make=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
const t=(ru,en)=>document.documentElement.lang==='en'?en:ru;
const value=(item,key)=>document.documentElement.lang==='en'?(item[key+'_en']||item[key+'_ru']||item[key]||''):(item[key+'_ru']||item[key]||item[key+'_en']||'');
let latestData=null;
async function api(path,options){
 const opts=options||{};
 const response=await fetch('/api/studio'+path,{credentials:'same-origin',...opts,headers:{...(opts.body?{'Content-Type':'application/json'}:{}),...(opts.headers||{})}});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||t('Не удалось загрузить рекомендации.','Could not load recommendations.'));
 return data;
}
function renderTasks(items){
 tasksNode.replaceChildren();
 if(!items||!items.length){tasksNode.append(make('p','fine-print',t('Пока нет открытых задач. Нажми «Обновить анализ», чтобы получить план.','There are no open tasks yet. Refresh the analysis to get a plan.')));return;}
 items.forEach(item=>{
  const card=make('article','coach-task'),label=make('div','coach-task-main');
  label.append(make('strong','',value(item,'title')),make('p','',value(item,'description')),
    make('small','',item.due_date?new Date(item.due_date).toLocaleDateString(document.documentElement.lang==='en'?'en-GB':'ru-RU'):''));
  const done=make('button','text-link',t('Выполнено','Completed'));done.type='button';
  done.addEventListener('click',async()=>{
   done.disabled=true;
   try{await api('/coach/tasks/'+item.id,{method:'PATCH',body:JSON.stringify({completed:true})});await loadLatest();}
   catch(e){status.textContent=e.message;done.disabled=false;}
  });
  card.append(label,done);tasksNode.append(card);
 });
}
function renderReport(report){
 const summaryText=report?(document.documentElement.lang==='en'?(report.summary_en||report.summary||''):(report.summary_ru||report.summary||'')):'';
 summary.textContent=summaryText||t('Нажми «Обновить анализ», чтобы Quiet English AI изучил реальные учебные результаты.','Select “Refresh analysis” to let Quiet English AI review your actual learning results.');
 recommendations.replaceChildren();
 const items=report&&Array.isArray(report.recommendations)?report.recommendations:[];
 if(!items.length){
  recommendations.append(make('p','fine-print',t('Пока недостаточно данных для персональных рекомендаций. Пройди несколько упражнений и попробуй ещё раз.','There is not enough data for personal recommendations yet. Complete a few exercises and try again.')));
  return;
 }
 items.forEach(item=>{
  const card=make('article','coach-recommendation');
  card.append(make('span','eyebrow',(item.skill||'mixed').toUpperCase()),
    make('h3','',value(item,'title')),make('p','',value(item,'focus')),
    make('p','coach-reason',value(item,'reason')),make('p','',value(item,'action')));
  const link=make('a','text-link',t('Перейти к практике →','Go to practice →'));
  link.href='/practice.html?skill='+encodeURIComponent(item.skill)+'&topic='+encodeURIComponent(item.topic||item.title||'');
  card.append(link);recommendations.append(card);
 });
}
function renderAll(data){
 if(!data)return;
 latestData=data;
 renderReport(data.report);
 renderTasks(data.tasks||[]);
}
async function loadLatest(){
 try{const data=await api('/coach/latest');renderAll(data);return data;}
 catch(e){status.textContent=e.message;return {report:null,tasks:[]};}
}
async function analyse(){
 const button=$('[data-coach-refresh]');button.disabled=true;
 status.textContent=t('Анализируем только сохранённые учебные результаты…','Reviewing saved learning results only…');
 try{
  const data=await api('/coach/analyze',{method:'POST',body:JSON.stringify({})});
  renderAll(data);
  status.textContent=data.source==='cloudflare-ai'
    ?t('AI-анализ завершён.','AI analysis complete.')
    :t('Показаны рекомендации на основе правил и доступных результатов.','Showing recommendations based on rules and available results.');
 }catch(e){status.textContent=e.message;}
 finally{button.disabled=false;}
}
$('[data-coach-refresh]').addEventListener('click',analyse);
window.addEventListener('quietenglish:languagechange',()=>renderAll(latestData));
loadLatest().then(data=>{if(!data.report)analyse();});
})();
