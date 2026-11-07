(() => {
const params=new URLSearchParams(location.search),root=document.querySelector('[data-ai-practice]');
if(!root)return;
const skill=root.querySelector('[data-ai-skill]'),topic=root.querySelector('[data-ai-topic]'),button=root.querySelector('[data-ai-generate]');
const wantedSkill=params.get('skill'),wantedTopic=params.get('topic');
if(wantedSkill&&skill){
 const allowed=['grammar','vocabulary','reading','listening','mixed'];
 if(allowed.includes(wantedSkill))skill.value=wantedSkill;
 else if(wantedSkill==='writing'){location.href='/writing.html';return;}
 else if(wantedSkill==='speaking'){location.href='/pronunciation.html';return;}
}
if(wantedTopic&&topic){
 let option=Array.from(topic.options).find(item=>item.value.toLowerCase()===wantedTopic.toLowerCase());
 if(!option){option=document.createElement('option');option.value=wantedTopic;option.textContent=wantedTopic;topic.add(option);}
 topic.value=option.value;
}
if(params.get('autostart')==='1'&&button)window.addEventListener('load',()=>setTimeout(()=>button.click(),150));
})();