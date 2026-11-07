(() => {
const root=document.querySelector('[data-subscription-page]');if(!root)return;
const $=s=>root.querySelector(s);
const status=$('[data-subscription-status-text]');
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
async function api(path,options){
 const opts=options||{};
 const response=await fetch('/api/billing'+path,{credentials:'same-origin',...opts,headers:{...(opts.body?{'Content-Type':'application/json'}:{}),...(opts.headers||{})}});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||'Не удалось загрузить подписку.');
 return data;
}
function renderUsage(data){
 const box=$('[data-subscription-usage]');box.replaceChildren();
 const definitions=[
  ['writing_review','Проверки письменных работ',3,30],
  ['listening_prepare','Подготовка аудирования с ИИ',3,60],
  ['coach_analyze','AI-анализ прогресса',2,30]
 ];
 definitions.forEach(([key,label,free,premium])=>{
  const limit=data.plan==='premium'?premium:free;
  const used=Number(data.usage?.[key]||0);
  const card=make('div','subscription-usage-row');
  const top=make('div','subscription-usage-top');top.append(make('strong','',label),make('span','',used+' / '+limit));
  const track=make('div','subscription-usage-track'),fill=make('span','subscription-usage-fill');fill.style.width=Math.min(100,used/limit*100)+'%';track.append(fill);
  card.append(top,track);box.append(card);
 });
}
function renderHistory(items){
 const box=$('[data-subscription-history]');box.replaceChildren();
 if(!items?.length){box.append(make('p','fine-print','Платежей пока нет.'));return;}
 items.forEach(item=>{
  const row=make('div','subscription-history-row');
  const label=make('strong','',item.plan_code==='premium_yearly'?'Premium · год':'Premium · месяц');
  const meta=make('small','',new Date(item.created_at).toLocaleDateString('ru-RU')+' · '+({succeeded:'Оплачено',pending:'Ожидает оплаты',canceled:'Отменён',failed:'Не выполнен',creating:'Создаётся'}[item.status]||item.status));
  const amount=make('b','',Number(item.amount).toLocaleString('ru-RU')+' ₽');
  row.append(label,meta,amount);box.append(row);
 });
}
function render(data){
 const sub=data.subscription;
 $('[data-subscription-current]').textContent=sub?'Quiet English Premium':'Quiet English Free';
 $('[data-subscription-status]').textContent=sub?(sub.cancel_at_period_end?'До конца периода':'Активна'):'Бесплатный тариф';
 $('[data-subscription-period]').textContent=sub
  ?'Доступ до '+new Date(sub.current_period_end).toLocaleString('ru-RU',{dateStyle:'long',timeStyle:'short'})+'.'
  :'Можно продолжать обучение бесплатно или подключить Premium.';
 $('[data-subscription-cancel]').hidden=!sub||!sub.auto_renew;
 const note=$('[data-subscription-checkout-note]');
 if(!data.checkout_ready)note.textContent='Оплата пока отключена: владелец магазина должен заключить договор с ЮKassa, включить приём платежей и добавить ключи в Render.';
 else if(data.guardian_required)note.textContent='Для покупки на этом аккаунте запрос подтверждения будет отправлен родителю или законному представителю.';
 else if(!data.auto_renew_ready)note.textContent='Можно подключить разовую оплату. Автопродление станет доступно после настройки бесплатного планировщика.';
 else note.textContent='Оплата проходит на защищённой странице ЮKassa. Автопродление можно отключить в личном кабинете.';
 root.querySelectorAll('[data-subscription-buy]').forEach(button=>{button.disabled=!data.checkout_ready;});
 if(data.guardian_required&&!data.guardian_email_on_file)root.querySelectorAll('[data-subscription-buy]').forEach(button=>{button.disabled=true;});
 renderUsage(data);renderHistory(data.payments_history||[]);
}
let snapshot=null;
async function load(){
 try{
  snapshot=await api('/me');render(snapshot);
  if(new URLSearchParams(location.search).get('payment')==='return'){
   status.textContent='Проверяем оплату. Premium активируется только после подтверждения от ЮKassa.';
   setTimeout(async()=>{try{snapshot=await api('/me');render(snapshot);status.textContent=snapshot.plan==='premium'?'Оплата подтверждена. Premium активирован.':'Платёж ещё обрабатывается. Обнови страницу чуть позже.';}catch(e){status.textContent=e.message;}},1600);
  }
 }catch(e){
  $('[data-subscription-current]').textContent='Войди в аккаунт';
  $('[data-subscription-period]').textContent=e.message;
  root.querySelectorAll('[data-subscription-buy]').forEach(button=>button.disabled=true);
  $('[data-subscription-checkout-note]').textContent='Войди в личный кабинет, чтобы управлять подпиской.';
 }
}
root.querySelectorAll('[data-subscription-buy]').forEach(button=>{
 button.addEventListener('click',async()=>{
  const plan=button.dataset.subscriptionBuy;
  const autoRenew=$('[data-subscription-auto-renew]').checked;
  if(!snapshot?.checkout_ready)return;
  button.disabled=true;status.textContent='Создаём безопасную ссылку на оплату…';
  try{
   let data;
   if(snapshot.guardian_required){
    data=await api('/guardian/request',{method:'POST',body:JSON.stringify({plan_code:plan})});
    status.textContent=data.message||'Запрос отправлен родителю.';
   }else{
    data=await api('/checkout',{method:'POST',body:JSON.stringify({plan_code:plan,auto_renew:autoRenew})});
    location.href=data.checkout_url;return;
   }
  }catch(e){status.textContent=e.message;}
  finally{button.disabled=false;}
 });
});
$('[data-subscription-cancel]').addEventListener('click',async()=>{
 if(!confirm('Отключить автоматическое продление? Premium останется доступен до конца оплаченного периода.'))return;
 const button=$('[data-subscription-cancel]');button.disabled=true;
 try{await api('/cancel',{method:'POST',body:JSON.stringify({})});status.textContent='Автопродление отключено.';await load();}
 catch(e){status.textContent=e.message;button.disabled=false;}
});
load();
})();
