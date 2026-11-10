(() => {
const root=document.querySelector('[data-listening-trainer]');if(!root)return;
const $=s=>root.querySelector(s);
const file=$('[data-listening-file]');
const urlInput=$('[data-listening-url]');
const player=$('[data-listening-player]');
const transcript=$('[data-listening-transcript]');
const status=$('[data-listening-trainer-status]');
const sentencesNode=$('[data-listening-sentences]');
const quiz=$('[data-listening-quiz]');
const questionsNode=$('[data-listening-questions]');
const resultNode=$('[data-listening-result]');
const transcribeButton=$('[data-listening-transcribe]');
let objectUrl='',sessionId='',startedAt=0,preparedSentences=[],preparedQuestions=[],localAudio=null;
let transcriberPromise=null,repeatEnd=null,activeLanguageCode='en';
const MODEL_ID='onnx-community/whisper-tiny';
const TRANSFORMERS_URL='https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2';
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
async function loadActiveStudyLanguage(){
 try{
  const response=await fetch('/api/learning/languages',{credentials:'same-origin'});
  const data=await response.json().catch(()=>({}));
  const active=Array.isArray(data.languages)?data.languages.find(item=>item.is_active):null;
  if(active&&['en','de'].includes(String(active.language_code).trim()))activeLanguageCode=String(active.language_code).trim();
 }catch{}
 if(activeLanguageCode==='de'){
  const accent=$('[data-listening-accent]');
  if(accent){accent.value='de-DE';accent.disabled=true;}
  const level=$('[data-listening-level]');
  if(level){[...level.options].forEach(option=>option.disabled=!['A1','A2'].includes(option.value));level.value='A1';}
 }
}
void loadActiveStudyLanguage();
function message(text,error){status.textContent=text||'';status.classList.toggle('error-text',!!error);status.classList.toggle('success-text',!error);}
function setAudio(source){
 if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl='';}
 player.pause();player.removeAttribute('src');
 if(!source){player.hidden=true;return;}
 player.src=source;player.hidden=false;player.load();
}
file.addEventListener('change',()=>{
 const selected=file.files&&file.files[0];if(!selected)return;
 if(!selected.type.startsWith('audio/')){message('Выбери аудиофайл.',true);return;}
 if(selected.size>25*1024*1024){message('Выбери аудиофайл до 25 МБ.',true);return;}
 localAudio=selected;urlInput.value='';objectUrl=URL.createObjectURL(selected);setAudio(objectUrl);
 transcribeButton.disabled=false;
 $('[data-listening-player-status]').textContent='Аудио выбрано с устройства. Файл не отправляется на сервер.';
});
urlInput.addEventListener('change',()=>{
 const raw=urlInput.value.trim();if(!raw)return;
 try{const url=new URL(raw);if(url.protocol!=='https:')throw Error();localAudio=null;transcribeButton.disabled=true;setAudio(url.href);$('[data-listening-player-status]').textContent='Используется прямая ссылка. Для автоматической расшифровки выбери файл на устройстве.';}
 catch{$('[data-listening-player-status]').textContent='Укажи корректную HTTPS-ссылку на аудиофайл.';message('Некорректная ссылка.',true);}
});
$('[data-listening-speed]').addEventListener('change',event=>{player.playbackRate=Number(event.target.value)||1;});
function speak(text){
 if(!('speechSynthesis'in window))return;
 const utterance=new SpeechSynthesisUtterance(text);
 utterance.lang=activeLanguageCode==='de'?'de-DE':($('[data-listening-accent]').value||'en-GB');
 utterance.rate=Number($('[data-listening-speed]').value)||0.9;
 const voices=speechSynthesis.getVoices();
 const preferred=voices.find(v=>v.lang===utterance.lang)||voices.find(v=>v.lang.startsWith(activeLanguageCode==='de'?'de':'en'));
 if(preferred)utterance.voice=preferred;
 speechSynthesis.cancel();speechSynthesis.speak(utterance);
}
async function toSamples(blob){
 const AudioContextClass=window.AudioContext||window.webkitAudioContext;
 if(!AudioContextClass)throw Error('В этом браузере не поддерживается обработка аудио.');
 const context=new AudioContextClass();
 try{
  const decoded=await context.decodeAudioData(await blob.arrayBuffer());
  if(decoded.duration<1||decoded.duration>300)throw Error('Для автоматического распознавания выбери фрагмент от 1 секунды до 5 минут.');
  const mono=new Float32Array(decoded.length);
  for(let channel=0;channel<decoded.numberOfChannels;channel++){
   const data=decoded.getChannelData(channel);
   for(let i=0;i<decoded.length;i++)mono[i]+=data[i]/decoded.numberOfChannels;
  }
  const length=Math.ceil(decoded.duration*16000),samples=new Float32Array(length),ratio=decoded.sampleRate/16000;
  for(let i=0;i<length;i++){
   const position=i*ratio,left=Math.min(Math.floor(position),mono.length-1),right=Math.min(left+1,mono.length-1),fraction=position-left;
   samples[i]=mono[left]*(1-fraction)+mono[right]*fraction;
  }
  return samples;
 }finally{await context.close().catch(()=>{});}
}
async function getTranscriber(){
 if(!transcriberPromise){
  transcriberPromise=(async()=>{
   message('Загружаем Whisper. При первом запуске потребуется скачать модель; аудио остаётся на устройстве.');
   const module=await import(TRANSFORMERS_URL);module.env.allowLocalModels=false;module.env.useBrowserCache=true;
   return module.pipeline('automatic-speech-recognition',MODEL_ID,{
    dtype:'q8',
    progress_callback:progress=>{
     if(progress&&progress.status==='progress'&&Number.isFinite(progress.progress))message('Загрузка Whisper: '+Math.round(progress.progress)+'%. Файл не отправляется на сервер.');
     if(progress&&progress.status==='done')message('Модель готова. Распознаём аудио локально…');
    }
   });
  })().catch(error=>{transcriberPromise=null;throw error;});
 }
 return transcriberPromise;
}
transcribeButton.addEventListener('click',async()=>{
 if(!localAudio)return message('Сначала выбери аудиофайл с устройства.',true);
 transcribeButton.disabled=true;
 try{
  const samples=await toSamples(localAudio);
  const transcriber=await getTranscriber();
  message('Whisper распознаёт речь в браузере. Это может занять некоторое время…');
  const result=await transcriber(samples,{language:activeLanguageCode==='de'?'german':'english',task:'transcribe'});
  const text=String(result&&result.text||'').trim();
  if(!text)throw Error('Не удалось распознать речь. Попробуй запись с более чётким звучанием.');
  transcript.value=text;transcript.dispatchEvent(new Event('input',{bubbles:true}));
  message('Расшифровка готова. Проверь текст и нажми «Подготовить вопросы».');
 }catch(error){
  message(error.message||'Не удалось распознать аудио.',true);
 }finally{transcribeButton.disabled=false;}
});
$('[data-listening-repeat]').addEventListener('click',()=>{
 const from=Math.max(0,Number($('[data-listening-from]').value)||0);
 const to=Math.max(0,Number($('[data-listening-to]').value)||0);
 if(!player.src||!Number.isFinite(player.duration))return message('Сначала выбери аудиозапись.',true);
 if(to<=from||from>=player.duration)return message('Проверь начало и конец фрагмента.',true);
 repeatEnd=Math.min(to,player.duration);player.currentTime=from;player.play().catch(()=>message('Не удалось начать воспроизведение.',true));
});
player.addEventListener('timeupdate',()=>{
 if(repeatEnd!==null&&player.currentTime>=repeatEnd){player.pause();repeatEnd=null;}
});
function openDictionary(word){
 const value=word.toLowerCase().replace(/[^\p{L}'-]/gu,'').slice(0,60);
 if(value.length>1)location.href='/dictionary.html?word='+encodeURIComponent(value)+'&source=listening';
}
async function addWord(word,button){
 button.disabled=true;
 const original=button.textContent;
 try{
  const response=await fetch('https://api.dictionaryapi.dev/api/v2/entries/'+activeLanguageCode+'/'+encodeURIComponent(word));
  const entries=await response.json();
  if(!response.ok||!Array.isArray(entries)||!entries.length)throw Error('Не удалось получить карточку слова. Открой его в словаре.');
  const first=entries[0],meanings=first.meanings||[],phonetics=first.phonetics||[];
  const ipa=first.phonetic||(phonetics.find(item=>item.text)||{}).text||'';
  const audio=(phonetics.find(item=>item.audio&&item.audio.startsWith('https://'))||{}).audio||'';
  const definitions=meanings.flatMap(item=>(item.definitions||[]).slice(0,2).map(def=>def.definition).filter(Boolean)).slice(0,6);
  let enrichment={};
  try{
   const enriched=await fetch('/api/knowledge/dictionary-enrich/'+encodeURIComponent(word),{
    method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({definitions:definitions.slice(0,3)})
   });
   if(enriched.ok)enrichment=await enriched.json();
  }catch{}
  const payload={
   word:word,ipa:ipa,translation:enrichment.translation_ru||'',
   definition:definitions[0]||'',
   source:'listening',
   metadata:{
    audio:audio,definitions:definitions,
    synonyms:[...new Set(meanings.flatMap(item=>item.synonyms||[]))].slice(0,10),
    antonyms:[...new Set(meanings.flatMap(item=>item.antonyms||[]))].slice(0,10),
    collocations:enrichment.collocations||[],
    phrasal_verbs:enrichment.phrasal_verbs||[],
    examples:enrichment.examples||[]
   }
  };
  const saved=await fetch('/api/knowledge/vocabulary',{
   method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
   body:JSON.stringify(payload)
  });
  const result=await saved.json().catch(()=>({}));
  if(!saved.ok)throw Error(result.error||'Не удалось сохранить слово. Войди в аккаунт.');
  button.textContent='✓';button.title='Слово добавлено в словарь и в повторение';button.classList.add('is-saved');
  message('«'+word+'» добавлено в личный словарь и интервальное повторение.');
 }catch(error){
  button.disabled=false;button.textContent=original;button.title=error.message;
  message(error.message||'Не удалось сохранить слово.',true);
 }
}
function renderSentences(items){
 preparedSentences=items||[];sentencesNode.replaceChildren();sentencesNode.hidden=false;
 preparedSentences.forEach((item,index)=>{
  const card=make('article','listening-sentence');
  card.append(make('span','eyebrow','FRAGMENT '+(index+1)),make('p','listening-sentence-text',item.text));
  const controls=make('div','listening-sentence-actions');
  const translate=make('button','text-link','Показать перевод');translate.type='button';
  const translation=make('p','listening-sentence-translation',item.translation);translation.hidden=true;
  translate.addEventListener('click',()=>{translation.hidden=!translation.hidden;translate.textContent=translation.hidden?'Показать перевод':'Скрыть перевод';});
  const replay=make('button','text-link','Произнести фрагмент');replay.type='button';replay.addEventListener('click',()=>speak(item.text));
  controls.append(translate,replay);card.append(controls,translation);
  const words=make('div','listening-word-chips');
  item.text.split(/\s+/u).slice(0,20).forEach(token=>{
   const word=token.replace(/^[^\p{L}]+|[^\p{L}'-]+$/gu,'');if(word.length<2)return;
   const group=make('span','listening-word-item');
   const button=make('button','listening-word-chip',word);button.type='button';button.title='Открыть слово в словаре';
   button.addEventListener('click',()=>openDictionary(word));
   const add=make('button','listening-word-add','+');add.type='button';add.title='Добавить в личный словарь и повторение';
   add.setAttribute('aria-label','Добавить '+word+' в словарь');
   add.addEventListener('click',()=>addWord(word,add));
   group.append(button,add);words.append(group);
  });
  card.append(words);sentencesNode.append(card);
 });
}
function renderQuestions(items){
 preparedQuestions=items||[];questionsNode.replaceChildren();
 preparedQuestions.forEach((question,index)=>{
  const card=make('fieldset','listening-question'),legend=make('legend','',((index+1)+'. ')+question.question);
  card.append(legend);
  question.options.forEach((option,optionIndex)=>{
   const label=make('label','listening-option'),input=document.createElement('input');
   input.type='radio';input.name=question.id;input.value=String(optionIndex);input.required=true;
   label.append(input,make('span','',option));card.append(label);
  });
  questionsNode.append(card);
 });
 quiz.hidden=false;resultNode.hidden=true;
}
$('[data-listening-prepare]').addEventListener('click',async()=>{
 const text=transcript.value.trim();if(text.length<80)return message('Добавь расшифровку минимум из 80 символов.',true);
 const button=$('[data-listening-prepare]');button.disabled=true;quiz.hidden=true;resultNode.hidden=true;
 message('ИИ готовит переводы и вопросы по твоей расшифровке…');
 try{
  const response=await fetch('/api/studio/listening/prepare',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({transcript:text,title:'Listening Lab',level:$('[data-listening-level]').value})});
  const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'Не удалось подготовить аудирование.');
  sessionId=data.session_id;startedAt=Date.now();renderSentences(data.sentences);renderQuestions(data.questions);message('Материал готов. Сначала прослушай запись и ответь на вопросы.');
 }catch(error){message(error.message,true);}finally{button.disabled=false;}
});
quiz.addEventListener('submit',async event=>{
 event.preventDefault();
 const formData=new FormData(quiz);
 const answers=preparedQuestions.map(q=>({question_id:q.id,option_index:Number(formData.get(q.id))}));
 if(answers.some(answer=>!Number.isInteger(answer.option_index)))return message('Ответь на все вопросы.',true);
 const button=quiz.querySelector('button[type=submit]');button.disabled=true;
 try{
  const response=await fetch('/api/studio/listening/attempts',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sessionId,answers:answers,duration_seconds:Math.min(7200,Math.round((Date.now()-startedAt)/1000))})});
  const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'Не удалось сохранить результат.');
  resultNode.hidden=false;resultNode.replaceChildren(make('h3','',data.score+'% · '+data.correct_count+' из '+data.question_count+' верно'));
  data.details.forEach((detail,index)=>{
   const question=preparedQuestions[index],line=make('p','',((index+1)+'. ')+(detail.correct?'Верно. ':'Неверно. Правильный ответ: ')+question.options[detail.correct_option]+'. '+(detail.explanation_ru||''));
   resultNode.append(line);
  });
  message('Результат сохранён в твоей аналитике.');
 }catch(error){message(error.message,true);}finally{button.disabled=false;}
});
$('[data-listening-save-offline]').addEventListener('click',async()=>{
 const label=$('[data-listening-offline-status]');
 if(!window.QuietOffline)return label.textContent='Офлайн-хранилище недоступно.';
 if(transcript.value.trim().length<20)return label.textContent='Сначала добавь расшифровку.';
 try{
  await window.QuietOffline.save({id:'listening-'+Date.now(),type:'listening',title:'Listening Lab',content:transcript.value,audio:localAudio||undefined});
  label.textContent='Текст и аудиофайл сохранены на этом устройстве.';
 }catch(error){label.textContent=error.message;}
});
})();