(() => {
const root=document.querySelector('[data-writing-page]');if(!root)return;
const $=s=>root.querySelector(s);
const formText=$('[data-writing-text]'),status=$('[data-writing-status]'),submit=$('[data-writing-submit]'),result=$('[data-writing-result]');
const DRAFT_KEY='quiet-english:writing:draft:v1';
const LAST_KEY='quiet-english:writing:last-submission:v1';
let latest=null;
function storageGet(key){try{return localStorage.getItem(key);}catch(_){return null;}}
function storageSet(key,value){try{localStorage.setItem(key,value);}catch(_){}}
function restoreDraft(){
  try{
    const raw=storageGet(DRAFT_KEY);if(!raw)return;
    const draft=JSON.parse(raw);
    if(typeof draft.text==='string')formText.value=draft.text;
    if(draft.taskType)$('[data-writing-type]').value=draft.taskType;
    if(draft.level)$('[data-writing-level]').value=draft.level;
    if(typeof draft.topic==='string')$('[data-writing-topic]').value=draft.topic;
    $('[data-writing-count]').textContent=formText.value.length;
  }catch(_){}
}
function saveDraft(){
  storageSet(DRAFT_KEY,JSON.stringify({
    text:formText.value,
    taskType:$('[data-writing-type]').value,
    level:$('[data-writing-level]').value,
    topic:$('[data-writing-topic]').value
  }));
}
const t=(ru,en)=>document.documentElement.lang==='en'?en:ru;
function message(text,error){status.textContent=text||'';status.classList.toggle('error-text',!!error);status.classList.toggle('success-text',!error);}
async function api(path,options){
  const opts=options||{};
  const response=await fetch('/api/studio'+path,{credentials:'same-origin',...opts,headers:{...(opts.body?{'Content-Type':'application/json'}:{}),...(opts.headers||{})}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'Не удалось выполнить запрос.');
  return data;
}
restoreDraft();
formText.addEventListener('input',()=>{$('[data-writing-count]').textContent=formText.value.length;saveDraft();});
['[data-writing-type]','[data-writing-level]','[data-writing-topic]'].forEach(selector=>$(selector).addEventListener('change',saveDraft));
$('[data-writing-topic]').addEventListener('input',saveDraft);
function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
function renderList(target,items){target.replaceChildren();(items||[]).forEach(x=>target.append(node('li','',x)));if(!items||!items.length)target.append(node('li','fine-print','Пока нет рекомендаций.'));}
function render(data){
  latest=data;result.hidden=false;
  $('[data-writing-overall]').textContent=data.overall_score+'/100';
  $('[data-writing-summary]').textContent=data.summary_ru||'Разбор сохранён.';
  const labels={grammar:'Грамматика',naturalness:'Естественность речи',vocabulary:'Словарный запас',structure:'Структура'};
  const scores=$('[data-writing-scores]');scores.replaceChildren();
  Object.keys(labels).forEach(key=>{const card=node('article','writing-score');card.append(node('span','',labels[key]),node('strong','',String(data.scores[key])+'/100'));const track=node('div','writing-score-track'),fill=node('span','writing-score-fill');fill.style.width=data.scores[key]+'%';track.append(fill);card.append(track);scores.append(card);});
  const originalText=(data.submitted_text||formText.value||'').trim();
  const correctedText=(data.corrected_text||'').trim()||originalText;
  const naturalText=(data.natural_version||'').trim()||correctedText;
  const correctedNode=$('[data-writing-corrected]');
  const naturalNode=$('[data-writing-natural]');
  correctedNode.textContent=correctedText||'Текст не был сохранён в этой записи.';
  naturalNode.textContent=naturalText||'Текст не был сохранён в этой записи.';
  [correctedNode,naturalNode].forEach((target,index)=>{
    target.classList.toggle('is-fallback',index===0?!data.corrected_text?.trim():!data.natural_version?.trim());
    target.parentElement.querySelector('.writing-fallback-note')?.remove();
    if(target.classList.contains('is-fallback')){
      const note=node('span','writing-fallback-note',index===0?'Отдельная исправленная версия не пришла от ИИ — показан исходный текст.':'Отдельная естественная версия не пришла от ИИ — показан исправленный текст.');
      target.insertAdjacentElement('afterend',note);
    }
  });
  latest={...data,submitted_text:originalText,corrected_text:correctedText,natural_version:naturalText};
  const issues=$('[data-writing-issues]');issues.replaceChildren();
  if(!data.issues||!data.issues.length)issues.append(node('p','fine-print','Отдельных ошибок не найдено.'));
  (data.issues||[]).forEach(item=>{const card=node('article','writing-issue');card.append(node('span','writing-issue-type',item.type),node('p','writing-issue-original',item.original),node('p','writing-issue-correction','→ '+item.correction),node('p','writing-issue-explanation',item.explanation_ru||item.explanation_en||''));issues.append(card);});
  renderList($('[data-writing-strengths]'),data.strengths);renderList($('[data-writing-next]'),data.next_steps);
  const patterns=$('[data-writing-patterns]');patterns.replaceChildren();
  (data.repeated_patterns||[]).forEach(item=>{const card=node('article','writing-pattern');card.append(node('strong','',item.label),node('p','',item.explanation_ru),node('p','writing-pattern-example',(item.example_wrong||'')+' → '+(item.example_correct||'')));patterns.append(card);});
  if(!(data.repeated_patterns||[]).length)patterns.append(node('p','fine-print','Пока нет устойчивых повторяющихся закономерностей.'));
}
function renderHistory(items){
  const list=$('[data-writing-history]');list.replaceChildren();$('[data-writing-history-count]').textContent=items.length;
  if(!items.length){list.append(node('p','fine-print','Здесь появятся твои проверенные работы.'));return;}
  items.forEach(item=>{
    const row=node('button','writing-history-row');
    row.type='button';
    row.setAttribute('aria-label','Открыть разбор: '+(item.topic||item.task_type));
    const label=node('span','writing-history-title',item.topic||({essay:'Эссе',email:'Письмо',story:'Рассказ',article:'Статья',exam:'Экзаменационный ответ'}[item.task_type]||item.task_type));
    const meta=node('small','writing-history-meta',(item.level||'')+' · '+new Date(item.created_at).toLocaleDateString('ru-RU'));
    const score=node('strong','writing-history-score',item.overall_score+'/100');
    row.append(label,meta,score);
    row.addEventListener('click',async()=>{try{const d=await api('/writing/'+encodeURIComponent(item.id));storageSet(LAST_KEY,String(item.id));if(d.submission.submitted_text!==undefined){formText.value=d.submission.submitted_text;$('[data-writing-count]').textContent=formText.value.length;saveDraft();}$('[data-writing-type]').value=d.submission.task_type||'essay';$('[data-writing-level]').value=d.submission.level||'B1';$('[data-writing-topic]').value=d.submission.topic||'';saveDraft();render(d.submission);result.scrollIntoView({behavior:'smooth',block:'start'});}catch(e){message(e.message,true);}});
    list.append(row);
  });
}
api('/writing/history').then(async d=>{
  const items=d.submissions||[];
  renderHistory(items);
  if(!items.length)return;
  const rememberedId=storageGet(LAST_KEY);
  const remembered=items.find(item=>String(item.id)===String(rememberedId));
  const last=remembered||items[0];
  try{
    const saved=await api('/writing/'+encodeURIComponent(last.id));
    storageSet(LAST_KEY,String(last.id));
    if(!formText.value.trim()&&saved.submission.submitted_text){
      formText.value=saved.submission.submitted_text;
      $('[data-writing-count]').textContent=formText.value.length;
      if(saved.submission.task_type)$('[data-writing-type]').value=saved.submission.task_type;
      if(saved.submission.level)$('[data-writing-level]').value=saved.submission.level;
      if(saved.submission.topic)$('[data-writing-topic]').value=saved.submission.topic;
      saveDraft();
    }
    render(saved.submission);
  }catch(e){message('Не удалось восстановить последний разбор: '+e.message,true);}
}).catch(e=>renderHistory([]));
submit.addEventListener('click',async()=>{
  const text=formText.value.trim();if(text.length<30)return message('Добавь текст минимум из 30 символов.',true);
  submit.disabled=true;message('ИИ анализирует текст, ошибки и структуру…',false);
  try{
    const data=await api('/writing/review',{method:'POST',body:JSON.stringify({text:text,task_type:$('[data-writing-type]').value,level:$('[data-writing-level]').value,topic:$('[data-writing-topic]').value})});
    render(data.submission);if(data.submission.id)storageSet(LAST_KEY,String(data.submission.id));saveDraft();message('Разбор сохранён в истории работ.');const history=await api('/writing/history');renderHistory(history.submissions||[]);
  }catch(e){message(e.message,true);}finally{submit.disabled=false;}
});
$('[data-copy-corrected]').addEventListener('click',()=>navigator.clipboard?.writeText(latest?.corrected_text||''));
$('[data-copy-natural]').addEventListener('click',()=>navigator.clipboard?.writeText(latest?.natural_version||''));
$('[data-writing-save-offline]').addEventListener('click',async()=>{
  const target=$('[data-writing-save-status]');
  if(!latest)return target.textContent='Сначала проверь текст.';
  if(!window.QuietOffline)return target.textContent='Офлайн-хранилище ещё не готово.';
  try{await window.QuietOffline.save({id:'writing-'+latest.id,type:'writing',title:'Writing Lab · '+latest.level,content:latest.submitted_text+'\n\nИсправленный вариант:\n'+latest.corrected_text+'\n\nБолее естественный вариант:\n'+latest.natural_version,metadata:latest});target.textContent='Сохранено на этом устройстве.';}catch(e){target.textContent=e.message;}
});
})();