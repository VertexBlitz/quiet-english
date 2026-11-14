(() => {
const root=document.querySelector('[data-calendar-page]');if(!root)return;
const $=s=>root.querySelector(s),form=$('[data-calendar-form]'),status=$('[data-calendar-status]'),list=$('[data-calendar-events]');
let cursor=new Date();cursor.setDate(1);let events=[];
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
const t=(ru,en)=>document.documentElement.lang==='en'?en:ru;
const locale=()=>document.documentElement.lang==='en'?'en-GB':'ru-RU';
const eventLabels={
 study:['Общая практика','General practice'],
 review:['Повторение слов','Vocabulary review'],
 writing:['Writing Lab','Writing Lab'],
 listening:['Аудирование','Listening'],
 speaking:['Говорение','Speaking'],
 other:['Другое','Other']
};
async function api(path,options){
 const opts=options||{};
 const response=await fetch('/api/studio'+path,{credentials:'same-origin',...opts,headers:{...(opts.body?{'Content-Type':'application/json'}:{}),...(opts.headers||{})}});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||t('Ошибка календаря.','Calendar request failed.'));
 return data;
}
function monthRange(){
 const from=new Date(cursor.getFullYear(),cursor.getMonth(),1),to=new Date(cursor.getFullYear(),cursor.getMonth()+1,1);
 return {from:from.toISOString(),to:to.toISOString()};
}
function render(){
 list.replaceChildren();
 $('[data-calendar-month]').textContent=cursor.toLocaleDateString(locale(),{month:'long',year:'numeric'});
 if(!events.length){
  list.append(make('p','fine-print',t('На этот период занятий пока нет. Добавь занятие выше.','No sessions are scheduled for this period. Add one above.')));
  return;
 }
 events.forEach(event=>{
  const row=make('article','calendar-event'),date=new Date(event.starts_at);
  const time=make('div','calendar-event-time',date.toLocaleString(locale(),{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}));
  const info=make('div','calendar-event-info');
  info.append(make('strong','',event.title),make('p','',event.description||''));
  const type=eventLabels[event.event_type]||eventLabels.other;
  const duration=document.documentElement.lang==='en'?event.duration_minutes+' min':event.duration_minutes+' мин';
  const meta=make('small','',duration+' · '+(document.documentElement.lang==='en'?type[1]:type[0]));
  const controls=make('div','calendar-event-controls');
  const done=make('button','text-link',event.completed_at?t('Отменить отметку','Undo completion'):t('Отметить выполненным','Mark as completed'));
  done.type='button';
  done.addEventListener('click',async()=>{
   done.disabled=true;
   try{await api('/calendar/events/'+event.id,{method:'PATCH',body:JSON.stringify({completed:!event.completed_at})});await load();}
   catch(e){status.textContent=e.message;done.disabled=false;}
  });
  const remove=make('button','text-link',t('Удалить','Delete'));
  remove.type='button';
  remove.addEventListener('click',async()=>{
   remove.disabled=true;
   try{await api('/calendar/events/'+event.id,{method:'DELETE'});await load();}
   catch(e){status.textContent=e.message;remove.disabled=false;}
  });
  controls.append(done,remove);row.append(time,info,meta,controls);
  if(event.completed_at)row.classList.add('is-complete');
  list.append(row);
 });
}
async function load(){
 const r=monthRange();
 try{
  const data=await api('/calendar/events?from='+encodeURIComponent(r.from)+'&to='+encodeURIComponent(r.to));
  events=data.events||[];render();status.textContent=t('Расписание синхронизировано.','Schedule synced.');
 }catch(e){status.textContent=e.message;}
}
form.addEventListener('submit',async event=>{
 event.preventDefault();
 const data=new FormData(form),starts=new Date(data.get('starts_at'));
 if(Number.isNaN(starts.getTime())){status.textContent=t('Проверь дату и время.','Check the date and time.');return;}
 const button=form.querySelector('button[type=submit]');
 button.disabled=true;
 try{
  await api('/calendar/events',{method:'POST',body:JSON.stringify({
   title:data.get('title'),starts_at:starts.toISOString(),
   duration_minutes:Number(data.get('duration_minutes')),event_type:data.get('event_type')
  })});
  form.reset();await load();status.textContent=t('Занятие добавлено.','Session added.');
 }catch(e){status.textContent=e.message;}
 finally{button.disabled=false;}
});
$('[data-calendar-prev]').addEventListener('click',()=>{cursor.setMonth(cursor.getMonth()-1);load();});
$('[data-calendar-next]').addEventListener('click',()=>{cursor.setMonth(cursor.getMonth()+1);load();});
$('[data-calendar-today]').addEventListener('click',()=>{cursor=new Date();cursor.setDate(1);load();});
$('[data-calendar-notifications]').addEventListener('click',async()=>{
 if(!('Notification'in window)){status.textContent=t('Браузер не поддерживает уведомления.','This browser does not support notifications.');return;}
 const permission=await Notification.requestPermission();
 status.textContent=permission==='granted'
  ?t('Напоминания включены, пока календарь открыт.','Reminders are enabled while the calendar is open.')
  :t('Уведомления не разрешены.','Notifications were not allowed.');
});
async function notifySoon(){
 if(!('Notification'in window)||Notification.permission!=='granted')return;
 const now=Date.now();
 events.forEach(event=>{
  if(event.completed_at)return;
  const delta=new Date(event.starts_at).getTime()-now;
  if(delta>0&&delta<10*60*1000){
   const key='qe-notified-'+event.id;
   if(!sessionStorage.getItem(key)){
    const minutes=Math.max(1,Math.round(delta/60000));
    const body=document.documentElement.lang==='en'
      ?event.title+' — in '+minutes+' min.'
      :event.title+' — через '+minutes+' мин.';
    new Notification('Quiet English · '+t('скоро занятие','upcoming session'),{body});
    sessionStorage.setItem(key,'1');
   }
  }
 });
}
window.addEventListener('quietenglish:languagechange',render);
load();
setInterval(notifySoon,30000);
})();
