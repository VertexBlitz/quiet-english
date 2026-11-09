(() => {
const root=document.querySelector('[data-offline-list]');if(!root)return;
const make=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
const t=(ru,en)=>document.documentElement.lang==='en'?en:ru;
const locale=()=>document.documentElement.lang==='en'?'en-GB':'ru-RU';
const audioUrls=new Set();
function clearAudioUrls(){
 audioUrls.forEach(url=>URL.revokeObjectURL(url));
 audioUrls.clear();
}
async function render(){
 clearAudioUrls();
 root.replaceChildren();
 try{
  const items=await window.QuietOffline.all();
  if(!items.length){
   root.append(make('p','fine-print',t('Пока ничего не сохранено. Открой Writing Lab, Словарь или Аудирование и нажми «Сохранить офлайн».','Nothing has been saved yet. Open Writing Lab, Dictionary or Listening and choose “Save offline”.')));
   return;
  }
  items.sort((a,b)=>String(b.savedAt).localeCompare(String(a.savedAt)));
  items.forEach(item=>{
   const card=make('article','offline-item');
   card.append(make('span','eyebrow',item.type||'MATERIAL'),make('h3','',item.title||t('Сохранённый материал','Saved material')));
   const content=make('pre','offline-material',item.content||'');
   card.append(content,make('small','fine-print',t('Сохранено ','Saved ')+new Date(item.savedAt).toLocaleString(locale())));
   if(item.audio instanceof Blob){
    const audio=make('audio','');audio.controls=true;
    audio.setAttribute('aria-label',t('Сохранённая аудиозапись','Saved audio recording'));
    const url=URL.createObjectURL(item.audio);audioUrls.add(url);audio.src=url;card.append(audio);
   }
   const remove=make('button','text-link',t('Удалить','Delete'));remove.type='button';
   remove.addEventListener('click',async()=>{
    remove.disabled=true;
    try{await window.QuietOffline.remove(item.id);await render();}
    catch(e){remove.disabled=false;root.append(make('p','error-text',e.message));}
   });
   card.append(remove);root.append(card);
  });
 }catch(e){
  root.append(make('p','error-text',t('Локальное хранилище недоступно: ','Local storage is unavailable: ')+e.message));
 }
}
window.addEventListener('quietenglish:languagechange',render);
window.addEventListener('pagehide',clearAudioUrls,{once:true});
render();
})();
