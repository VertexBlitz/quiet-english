const statusNode=document.querySelector('[data-account-status]');
const showAccountStatus=(message,error=false)=>{statusNode.textContent=message;statusNode.classList.toggle('error-text',error);statusNode.classList.toggle('success-text',!error);};
fetch('/api/auth/me',{credentials:'same-origin'}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Войди в аккаунт.');return d.user;})
.then(user=>{document.querySelector('[data-account-email]').textContent=user.email;document.querySelector('[data-account-meta]').textContent=[user.age_band,user.preferred_language?.toUpperCase(),user.assessed_level||'Placement not completed'].filter(Boolean).join(' · ');})
.catch(e=>showAccountStatus(e.message,true));

document.querySelector('[data-export]')?.addEventListener('click',async()=>{
  const button=document.querySelector('[data-export]');button.disabled=true;
  try{
    const response=await fetch('/api/auth/export',{credentials:'same-origin'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'Не удалось экспортировать данные.');
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;link.download='quiet-english-data-export.json';link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);showAccountStatus('Экспорт подготовлен и сохранён на этом устройстве.');
  }catch(e){showAccountStatus(e.message,true);}finally{button.disabled=false;}
});

document.querySelector('[data-logout]')?.addEventListener('click',async()=>{
  await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'});
  location.href='/login.html';
});

document.querySelector('[data-delete]')?.addEventListener('click',async()=>{
  const confirmation=prompt('Это действие необратимо. Введи DELETE для подтверждения.');
  if(confirmation!=='DELETE')return;
  const button=document.querySelector('[data-delete]');button.disabled=true;
  try{
    const response=await fetch('/api/auth/account',{method:'DELETE',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirm:confirmation})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'Не удалось удалить аккаунт.');
    alert(data.message);location.href='/';
  }catch(e){showAccountStatus(e.message,true);button.disabled=false;}
});
