(() => {
const root=document.querySelector('[data-studio-page]');if(!root)return;
const $=s=>root.querySelector(s),status=$('[data-coach-status]'),summary=$('[data-coach-summary]'),recommendations=$('[data-coach-recommendations]'),tasksNode=$('[data-coach-tasks]');
const make=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
async function api(path,options){const opts=options||{};const response=await fetch('/api/studio'+path,{credentials:'same-origin',...opts,headers:{...(opts.body?{'Content-Type':'application/json'}:{}),...(opts.headers||{})}});const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'Не удалось загрузить рекомендации.');return data;}
function renderTasks(items){
 tasksNode.replaceChildren();
 if(!items||!items.length){tasksNode.append(make('p','fine-print','Пока нет открытых задач. Нажми «Обновить анализ», чтобы получить план.'));return;}
 items.forEach(item=>{const card=make('article','coach-task'),label=make('div','coach-task-main');label.append(make('strong','',item.title),make('p','',item.description),make('small','',new Date(item.due_date).toLocaleDateString()));const done=make('button','text-link','Выполнено');done.type='button';done.addEventListener('click',async()=>{done.disabled=true;try{await api('/coach/tasks/'+item.id,{method:'PATCH',body:JSON.stringify({completed:true})});await loadLatest();}catch(e){status.textContent=e.message;done.disabled=false;}});card.append(label,done);tasksNode.append(card);});
}
function renderReport(report){
 summary.textContent=report?report.summary:'Нажми «Обновить анализ», чтобы Quiet English AI изучил реальные учебные результаты.';
 recommendations.replaceChildren();
 const items=report&&Array.isArray(report.recommendations)?report.recommendations:[];
 if(!items.length){recommendations.append(make('p','fine-print','Пока недостаточно данных для персональных рекомендаций. Пройди несколько упражнений и попробуй ещё раз.'));return;}
 items.forEach(item=>{const card=make('article','coach-recommendation');card.append(make('span','eyebrow',(item.skill||'mixed').toUpperCase()),make('h3','',item.title),make('p','',item.focus),make('p','coach-reason',item.reason),make('p','',item.action));const link=make('a','text-link','Перейти к практике →');link.href='/practice.html?skill='+encodeURIComponent(item.skill)+'&topic='+encodeURIComponent(item.topic||item.title);card.append(link);recommendations.append(card);});
}
async function loadLatest(){try{const data=await api('/coach/latest');renderReport(data.report);renderTasks(data.tasks||[]);return data;}catch(e){status.textContent=e.message;return {report:null};}}
async function analyse(){const button=$('[data-coach-refresh]');button.disabled=true;status.textContent='Анализируем только сохранённые учебные результаты…';try{const data=await api('/coach/analyze',{method:'POST',body:JSON.stringify({})});renderReport(data.report);renderTasks(data.tasks||[]);status.textContent=data.source==='cloudflare-ai'?'AI-анализ завершён.':'Показаны рекомендации на основе правил и доступных результатов.';}catch(e){status.textContent=e.message;}finally{button.disabled=false;}}
$('[data-coach-refresh]').addEventListener('click',analyse);
loadLatest().then(data=>{if(!data.report)analyse();});
})();