const root=document.querySelector('[data-admin-page]');
if(root){
 const status=root.querySelector('[data-admin-status]'),list=root.querySelector('[data-admin-list]'),form=root.querySelector('[data-admin-form]'),editorStatus=root.querySelector('[data-editor-status]'),publishButton=root.querySelector('[data-publish]');
 let currentId=null;
 const api=async(path,options={})=>{const r=await fetch('/api/admin'+path,{credentials:'same-origin',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'CMS request failed.');return d;};
 const message=(node,text,error=false)=>{node.textContent=text;node.classList.toggle('error-text',error);node.classList.toggle('success-text',!error);};
 const split=(value)=>value.split(',').map(x=>x.trim()).filter(Boolean);
 const clear=()=>{form.reset();form.elements.id.disabled=false;currentId=null;publishButton.disabled=true;root.querySelector('[data-editor-title]').textContent='Новое задание';};
 const values=()=>({
   id:form.elements.id.value.trim(),skill:form.elements.skill.value,level:form.elements.level.value,
   objective:form.elements.objective.value.trim(),estimated_time:Number(form.elements.estimated_time.value),
   success_criteria:form.elements.success_criteria.value.trim(),
   instructions:{ru:form.elements.instruction_ru.value.trim(),en:form.elements.instruction_en.value.trim()},
   explanation:{ru:form.elements.explanation_ru.value.trim(),en:form.elements.explanation_en.value.trim()},
   tags:split(form.elements.tags.value),prerequisites:split(form.elements.prerequisites.value),
   content:JSON.parse(form.elements.content_json.value),answer_key:JSON.parse(form.elements.answer_json.value),srs:JSON.parse(form.elements.srs_json.value)
 });
 const load=async()=>{try{const d=await api('/exercises');list.replaceChildren();d.exercises.forEach(item=>{const card=document.createElement('article');card.className='exercise-card';const meta=document.createElement('p');meta.className='eyebrow';meta.textContent=item.id+' · '+item.level+' · '+item.skill+' · '+item.status;const title=document.createElement('h3');title.textContent=item.objective;const edit=document.createElement('button');edit.className='button secondary';edit.type='button';edit.textContent='Редактировать';edit.addEventListener('click',()=>editItem(item.id));card.append(meta,title,edit);list.appendChild(card);});}catch(e){message(status,e.message,true);}};
 const editItem=async id=>{try{const d=await api('/exercises/'+encodeURIComponent(id));const item=d.exercise;currentId=id;for(const [name,value] of Object.entries({id:item.id,skill:item.skill,level:item.level,objective:item.objective,estimated_time:item.estimated_time,success_criteria:item.success_criteria,instruction_ru:item.instructions.ru,instruction_en:item.instructions.en,explanation_ru:item.explanation.ru,explanation_en:item.explanation.en,tags:(item.tags||[]).join(', '),prerequisites:(item.prerequisites||[]).join(', '),content_json:JSON.stringify(item.content,null,2),answer_json:JSON.stringify(item.answer_key,null,2),srs_json:JSON.stringify(item.srs||{},null,2)})){form.elements[name].value=value;}form.elements.id.disabled=true;publishButton.disabled=false;root.querySelector('[data-editor-title]').textContent='Редактирование · '+id;}catch(e){message(status,e.message,true);}};
 root.querySelector('[data-new]').addEventListener('click',clear);
 form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('[type="submit"]');button.disabled=true;try{const body=values();if(currentId){await api('/exercises/'+encodeURIComponent(currentId),{method:'PATCH',body:JSON.stringify(body)});message(editorStatus,'Новая версия черновика сохранена.');}else{const created=await api('/exercises',{method:'POST',body:JSON.stringify(body)});currentId=created.exercise.id;form.elements.id.disabled=true;publishButton.disabled=false;message(editorStatus,'Черновик создан. Проверь его и опубликуй после редакторской проверки.');}await load();}catch(e){message(editorStatus,e.message,true);}finally{button.disabled=false;}});
 publishButton.addEventListener('click',async()=>{if(!currentId)return;publishButton.disabled=true;try{await api('/exercises/'+encodeURIComponent(currentId)+'/status',{method:'POST',body:JSON.stringify({status:'published'})});message(editorStatus,'Задание опубликовано.');await load();}catch(e){message(editorStatus,e.message,true);}finally{publishButton.disabled=false;}});

 const planList=root.querySelector('[data-plan-list]');
 const planForm=root.querySelector('[data-plan-form]');
 const planStatus=root.querySelector('[data-plan-editor-status]');
 const planPublish=root.querySelector('[data-plan-publish]');
 let currentPlanId=null;
 const loadPlans=async()=>{
   try{
     const data=await api('/plans');planList.replaceChildren();
     data.plans.forEach(item=>{
       const card=document.createElement('article');card.className='exercise-card';
       const meta=document.createElement('p');meta.className='eyebrow';meta.textContent=item.id+' · '+item.goal+' · '+item.status;
       const title=document.createElement('h3');title.textContent=item.title;
       const edit=document.createElement('button');edit.className='button secondary';edit.type='button';edit.textContent='Редактировать';
       edit.addEventListener('click',()=>editPlan(item.id));
       card.append(meta,title,edit);planList.appendChild(card);
     });
   }catch(e){message(status,e.message,true);}
 };
 const editPlan=async id=>{
   try{
     const data=await api('/plans/'+encodeURIComponent(id));const item=data.plan;currentPlanId=id;
     for(const [name,value] of Object.entries({id:item.id,title:item.title,goal:item.goal,level_min:item.level_min,level_max:item.level_max,minutes_per_day:item.minutes_per_day,weekly_themes:JSON.stringify(item.weekly_themes,null,2)})){
       planForm.elements[name].value=value;
     }
     planForm.elements.id.disabled=true;planPublish.disabled=false;
     root.querySelector('[data-plan-editor-status]').textContent='Редактирование шаблона. Сохранение создаст новую версию.';
   }catch(e){message(planStatus,e.message,true);}
 };
 planForm?.addEventListener('submit',async event=>{
   event.preventDefault();const button=planForm.querySelector('[type="submit"]');button.disabled=true;
   try{
     const body={
       id:planForm.elements.id.value.trim(),title:planForm.elements.title.value.trim(),
       goal:planForm.elements.goal.value,level_min:planForm.elements.level_min.value,level_max:planForm.elements.level_max.value,
       duration_weeks:4,minutes_per_day:Number(planForm.elements.minutes_per_day.value),
       weekly_themes:JSON.parse(planForm.elements.weekly_themes.value)
     };
     if(currentPlanId) await api('/plans/'+encodeURIComponent(currentPlanId),{method:'PATCH',body:JSON.stringify(body)});
     else {const result=await api('/plans',{method:'POST',body:JSON.stringify(body)});currentPlanId=result.plan.id;planForm.elements.id.disabled=true;planPublish.disabled=false;}
     message(planStatus,'Черновик шаблона сохранён.');
     await loadPlans();
   }catch(e){message(planStatus,e.message,true);}finally{button.disabled=false;}
 });
 planPublish?.addEventListener('click',async()=>{
   if(!currentPlanId)return;planPublish.disabled=true;
   try{await api('/plans/'+encodeURIComponent(currentPlanId)+'/status',{method:'POST',body:JSON.stringify({status:'published'})});message(planStatus,'Шаблон опубликован.');await loadPlans();}
   catch(e){message(planStatus,e.message,true);}finally{planPublish.disabled=false;}
 });

 load();
 loadPlans();
}
