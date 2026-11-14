(() => {
  const statusNode=document.querySelector('[data-account-status]');
  const t=(ru,en)=>document.documentElement.lang==='en'?en:ru;
  const showStatus=(message,error=false)=>{
    if(!statusNode)return;
    statusNode.textContent=message;
    statusNode.classList.toggle('error-text',error);
    statusNode.classList.toggle('success-text',!error);
  };
  const api=async path=>{
    const response=await fetch(path,{credentials:'same-origin',cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||t('Не удалось загрузить данные.','Could not load account data.'));
    return data;
  };
  const date=value=>{
    if(!value)return '—';
    const parsed=new Date(value);
    return Number.isNaN(parsed.getTime())?'—':parsed.toLocaleDateString(document.documentElement.lang==='en'?'en-GB':'ru-RU');
  };
  const download=(blob,name)=>{
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download=name;link.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1200);
  };
  api('/api/auth/me').then(({user})=>{
    if(!user)throw new Error(t('Войди в аккаунт.','Please sign in.'));
    document.querySelector('[data-account-email]').textContent=user.email;
    document.querySelector('[data-account-meta]').textContent=[
      user.age_band,user.preferred_language?.toUpperCase(),
      user.assessed_level||t('Тест уровня не пройден','Placement not completed')
    ].filter(Boolean).join(' · ');
  }).catch(error=>showStatus(error.message,true));

  const getExport=()=>api('/api/auth/export');
  document.querySelector('[data-export]')?.addEventListener('click',async event=>{
    const button=event.currentTarget;button.disabled=true;
    try{
      const data=await getExport();
      download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),'quiet-english-data-export.json');
      showStatus(t('Экспорт JSON сохранён на этом устройстве.','JSON export saved on this device.'));
    }catch(error){showStatus(error.message,true);}
    finally{button.disabled=false;}
  });

  function buildReport(data){
    const report=document.createElement('article');
    report.style.cssText='box-sizing:border-box;width:180mm;padding:12mm;background:#fff;color:#171717;font-family:Arial,sans-serif;font-size:11pt;line-height:1.55;';
    const heading=document.createElement('h1');
    heading.textContent='Quiet English — '+t('отчёт об обучении','learning report');
    heading.style.cssText='font-size:24pt;font-weight:500;line-height:1.15;margin:0 0 5mm;';
    report.append(heading);
    const meta=document.createElement('p');
    meta.textContent=t('Дата формирования: ','Generated: ')+date(data.exported_at);
    meta.style.cssText='color:#666;margin:0 0 8mm;';
    report.append(meta);
    const profile=data.profile||{};
    const plans=Array.isArray(data.plans)?data.plans:[];
    const activePlan=plans.find(item=>item.status==='active')||plans[plans.length-1]||null;
    const activity=Array.isArray(data.activity)?data.activity:[];
    const attempts=Array.isArray(data.exercise_attempts)?data.exercise_attempts:[];
    const errors=(Array.isArray(data.errors)?data.errors:[]).filter(item=>!item.resolved_at);
    const due=(Array.isArray(data.review_items)?data.review_items:[]).filter(item=>new Date(item.due_at).getTime()<=Date.now());
    const minutes=activity.reduce((sum,item)=>sum+Number(item.minutes||0),0);
    const tasks=activity.reduce((sum,item)=>sum+Number(item.completed_tasks||0),0);
    const days=activity.filter(item=>Number(item.completed_tasks||0)>0).length;
    const scored=attempts.filter(item=>Number.isFinite(Number(item.score)));
    const avg=scored.length?Math.round(scored.reduce((sum,item)=>sum+Number(item.score),0)/scored.length)+'%':'—';
    const goals={
      general:t('Общее изучение языка','General language'),
      work:t('Для работы','For work'),travel:t('Для путешествий','For travel'),
      exam:t('Подготовка к экзамену','Exam preparation'),
      communication:t('Повседневное общение','Everyday communication'),
      relocation:t('Переезд за границу','Relocation'),study:t('Учёба','Study')
    };
    const section=(title,rows)=>{
      const block=document.createElement('section');block.style.cssText='margin:0 0 7mm;page-break-inside:avoid;';
      const h=document.createElement('h2');h.textContent=title;
      h.style.cssText='font-size:15pt;font-weight:600;border-bottom:1px solid #ccc;padding-bottom:2mm;margin:0 0 3mm;';
      block.append(h);
      rows.forEach(([label,value])=>{
        const p=document.createElement('p');p.style.cssText='margin:1.5mm 0;';
        const strong=document.createElement('strong');strong.textContent=label+': ';
        p.append(strong,document.createTextNode(String(value??'—')));block.append(p);
      });
      report.append(block);
    };
    section(t('Профиль обучения','Learning profile'),[
      [t('Цель','Goal'),goals[profile.goal]||profile.goal||'—'],
      [t('Уровень','Level'),activePlan?.level||profile.assessed_level||profile.self_assessed_level||'—'],
      [t('Время в день','Daily study time'),profile.minutes_per_day?profile.minutes_per_day+' min':'—'],
      [t('Интересы','Interests'),Array.isArray(profile.interests)?profile.interests.join(', '):'—']
    ]);
    section(t('Результаты','Results'),[
      [t('Учебное время','Study time'),minutes+' '+t('минут','minutes')],
      [t('Выполнено заданий','Tasks completed'),tasks],
      [t('Активных дней','Active days'),days],
      [t('Попыток в упражнениях','Exercise attempts'),attempts.length],
      [t('Средний балл','Average exercise score'),avg],
      [t('Открытых типов ошибок','Open error patterns'),errors.length],
      [t('Карточек, готовых к повторению','Cards currently due'),due.length]
    ]);
    if(errors.length){
      const block=document.createElement('section');block.style.cssText='margin:0 0 7mm;page-break-inside:avoid;';
      const h=document.createElement('h2');h.textContent=t('Темы для повторения','Topics to revisit');
      h.style.cssText='font-size:15pt;font-weight:600;border-bottom:1px solid #ccc;padding-bottom:2mm;';
      block.append(h);
      errors.slice(0,8).forEach(item=>{
        const p=document.createElement('p');p.style.margin='1.5mm 0';
        p.textContent=[item.error_type,item.incorrect_form,item.correction].filter(Boolean).join(' → ');
        block.append(p);
      });
      report.append(block);
    }
    const footer=document.createElement('p');
    footer.textContent=t('Отчёт сформирован локально в браузере из данных, экспортированных из аккаунта.','This report was generated locally in your browser from your account export.');
    footer.style.cssText='border-top:1px solid #ddd;padding-top:3mm;color:#666;font-size:9pt;';
    report.append(footer);
    return report;
  }

  document.querySelector('[data-export-pdf]')?.addEventListener('click',async event=>{
    const button=event.currentTarget;button.disabled=true;
    try{
      if(typeof window.html2pdf!=='function')throw new Error(t('Модуль PDF не загрузился. Обнови страницу.','PDF module did not load. Refresh the page.'));
      const data=await getExport();
      const report=buildReport(data);
      report.style.position='fixed';report.style.left='0';report.style.top='0';report.style.zIndex='-1';
      document.body.append(report);
      try{
        await window.html2pdf().set({
          margin:8,filename:'quiet-english-learning-report.pdf',
          image:{type:'jpeg',quality:0.96},
          html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff'},
          jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
          pagebreak:{mode:['avoid-all','css','legacy']}
        }).from(report).save();
      }finally{report.remove();}
      showStatus(t('PDF-отчёт создан и сохранён на устройстве.','PDF report created and saved on this device.'));
    }catch(error){showStatus(error.message,true);}
    finally{button.disabled=false;}
  });

  document.querySelector('[data-logout]')?.addEventListener('click',async()=>{
    try{
      await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'});
    }finally{location.href='/login.html';}
  });
  document.querySelector('[data-delete]')?.addEventListener('click',async event=>{
    const confirmation=window.prompt(t('Это действие необратимо. Введи DELETE для подтверждения.','This action cannot be undone. Type DELETE to confirm.'));
    if(confirmation!=='DELETE')return;
    const button=event.currentTarget;button.disabled=true;
    try{
      const response=await fetch('/api/auth/account',{method:'DELETE',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirm:confirmation})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||t('Не удалось удалить аккаунт.','Could not delete account.'));
      window.alert(data.message||t('Аккаунт удалён.','Account deleted.'));location.href='/';
    }catch(error){showStatus(error.message,true);button.disabled=false;}
  });
})();