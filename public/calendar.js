(() => {
const root=document.querySelector('[data-calendar-page]');if(!root)return;
const $=s=>root.querySelector(s),form=$('[data-calendar-form]'),status=$('[data-calendar-status]'),list=$('[data-calendar-events]');
let cursor=new Date();cursor.setDate(1);let events=[];
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
async function api(path,options){const opts=options||{};const response=await fetch('/api/studio'+path,{credentials:'same-origin',...opts,headers:{...(opts.body?{'Content-Type':'application/json'}:{}),...(opts.headers||{})}});const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'Ошибка календаря.');return data;}
function monthRange(){const from=new Date(cursor.getFullYear(),cursor.getMonth(),1),to=new Date(cursor.getFullYear(),cursor.getMonth()+1,1);return {from:from.toISOString(),to:to.toISOString()};}
function render(){
 list.replaceChildren();$('[data-calendar-month]').textContent=cursor.toLocaleDateString('ru-RU',{month:'long',year:'numeric'});
 if(!events.length){list.append(make('p','fine-print','На этот период занятий пока нет. Добавь занятие выше.'));return;}
 events.forEach(event=>{
  const row=make('article','calendar-event'),date=new Date(event.starts_at);
  const time=make('div','calendar-event-time',date.toLocaleString('ru-RU',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}));
  const info=make('div','calendar-event-info');info.append(make('strong','',event.title),make('p','',event.description||''));
  const meta=make('small','',event.duration_minutes+' мин · '+event.event_type);
  const controls=make('div','calendar-event-controls');
  const done=make('button','text-link',event.completed_at?'Отменить отметку':'Отметить выполненным');done.type='button';done.addEventListener('click',async()=>{try{await api('/calendar/events/'+event.id,{method:'PATCH',body:JSON.stringify({completed:!event.completed_at})});await load();}catch(e){status.textContent=e.message;}});
  const remove=make('button','text-link','Удалить');remove.type='button';remove.addEventListener('click',async()=>{try{await api('/calendar/events/'+event.id,{method:'DELETE'});await load();}catch(e){status.textContent=e.message;}});
  controls.append(done,remove);row.append(time,info,meta,controls);if(event.completed_at)row.classList.add('is-complete');list.append(row);
 });
}
async function load(){const r=monthRange();try{const data=await api('/calendar/events?from='+encodeURIComponent(r.from)+'&to='+encodeURIComponent(r.to));events=data.events||[];render();status.textContent='Расписание синхронизировано.';}catch(e){status.textContent=e.message;}}
form.addEventListener('submit',async event=>{event.preventDefault();const data=new FormData(form);const starts=new Date(data.get('starts_at'));if(Number.isNaN(starts.getTime())){status.textContent='Проверь дату и время.';return;}const button=form.querySelector('button[type=submit]');button.disabled=true;try{await api('/calendar/events',{method:'POST',body:JSON.stringify({title:data.get('title'),starts_at:starts.toISOString(),duration_minutes:Number(data.get('duration_minutes')),event_type:data.get('event_type')})});form.reset();await load();status.textContent='Занятие добавлено.';}catch(e){status.textContent=e.message;}finally{button.disabled=false;}});
$('[data-calendar-prev]').addEventListener('click',()=>{cursor.setMonth(cursor.getMonth()-1);load();});
$('[data-calendar-next]').addEventListener('click',()=>{cursor.setMonth(cursor.getMonth()+1);load();});
$('[data-calendar-today]').addEventListener('click',()=>{cursor=new Date();cursor.setDate(1);load();});
$('[data-calendar-notifications]').addEventListener('click',async()=>{if(!('Notification'in window)){status.textContent='Браузер не поддерживает уведомления.';return;}const permission=await Notification.requestPermission();status.textContent=permission==='granted'?'Напоминания включены, пока календарь открыт.':'Уведомления не разрешены.';});
async function notifySoon(){
 if(!('Notification'in window)||Notification.permission!=='granted')return;
 const now=Date.now();
 events.forEach(event=>{if(event.completed_at)return;const delta=new Date(event.starts_at).getTime()-now;if(delta>0&&delta<10*60*1000){const key='qe-notified-'+event.id;if(!sessionStorage.getItem(key)){new Notification('Quiet English · скоро занятие',{body:event.title+' — через '+Math.max(1,Math.round(delta/60000))+' мин.'});sessionStorage.setItem(key,'1');}}});
}
load();setInterval(notifySoon,30000);
})();