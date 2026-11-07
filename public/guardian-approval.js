(() => {
const $=s=>document.querySelector(s);
const token=new URLSearchParams(location.search).get('token')||'';
const status=$('[data-guardian-status]'),button=$('[data-guardian-pay]');
async function api(path,options){
 const opts=options||{};
 const response=await fetch('/api/billing'+path,{credentials:'same-origin',...opts,headers:{...(opts.body?{'Content-Type':'application/json'}:{}),...(opts.headers||{})}});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||'Не удалось проверить запрос.');
 return data;
}
function updateButton(){button.disabled=!token||!$('[data-guardian-confirm]').checked;}
$('[data-guardian-confirm]').addEventListener('change',updateButton);
api('/guardian/quote?token='+encodeURIComponent(token)).then(data=>{
 const plan=data.plan;
 $('[data-guardian-plan]').textContent=plan.name;
 $('[data-guardian-summary]').textContent='Стоимость: '+plan.amount.toLocaleString('ru-RU')+' ₽. Период: '+(plan.periodLabel||String(plan.months)+' месяцев')+'. Продление будет включено только при отдельном согласии ниже и после успешного сохранения способа оплаты платёжной системой.';
}).catch(e=>{
 $('[data-guardian-plan]').textContent='Запрос недействителен';
 status.textContent=e.message;status.classList.add('error-text');
});
button.addEventListener('click',async()=>{
 button.disabled=true;status.textContent='Готовим переход к оплате…';
 try{
  const data=await api('/guardian/checkout',{method:'POST',body:JSON.stringify({
   token:token,
   guardian_confirmed:$('[data-guardian-confirm]').checked,
   auto_renew:$('[data-guardian-renew]').checked
  })});
  location.href=data.checkout_url;
 }catch(e){status.textContent=e.message;status.classList.add('error-text');button.disabled=false;}
});
})();
