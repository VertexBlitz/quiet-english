import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { pool, requireDatabase, requireUser, loadActiveStudyLanguage, requireEnglishStudyLanguage, recordActivity } from '../db.js';
import { isExternalPersonalDataProcessingAllowed } from '../region-config.js';
import { consumeMonthlyQuota } from '../subscription-access.js';

const router = express.Router();
router.use(requireDatabase, requireUser, loadActiveStudyLanguage);
const MODEL = process.env.CLOUDFLARE_MODEL || '@cf/google/gemma-4-26b-a4b-it';
const LEVELS = ['A1','A2','B1','B2','C1','C2'];
const SKILLS = ['grammar','vocabulary','reading','listening','speaking','writing','mixed'];

function clean(value,max) {
  return typeof value === 'string' ? value.replace(/\s+/gu,' ').trim().slice(0,max || 240) : '';
}
function multiline(value,max) {
  return typeof value === 'string' ? value.replace(/\r\n?/gu,'\n').trim().slice(0,max || 12000) : '';
}
function parseJson(raw) {
  if (typeof raw !== 'string') throw new Error('AI_EMPTY');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('AI_JSON');
  return JSON.parse(raw.slice(start,end+1));
}
async function callAi(system,user,maxTokens) {
  if (!isExternalPersonalDataProcessingAllowed() || !process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) throw new Error('AI_NOT_CONFIGURED');
  const endpoint = 'https://api.cloudflare.com/client/v4/accounts/' +
    encodeURIComponent(process.env.CLOUDFLARE_ACCOUNT_ID) + '/ai/v1/chat/completions';
  const response = await fetch(endpoint,{
    method:'POST',
    headers:{Authorization:'Bearer '+process.env.CLOUDFLARE_API_TOKEN,'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({model:MODEL,messages:[{role:'system',content:system},{role:'user',content:user}],
      stream:false,max_tokens:maxTokens || 1300,temperature:0.25,chat_template_kwargs:{enable_thinking:false}}),
    signal:AbortSignal.timeout(40000)
  });
  if (!response.ok) {
    const detail = await response.text().catch(function(){return '';});
    console.error('Study tools AI upstream:',response.status,detail.slice(0,180));
    throw new Error(response.status === 429 ? 'AI_RATE_LIMIT' : 'AI_UPSTREAM');
  }
  const payload=await response.json();
  let raw=payload.choices && payload.choices[0] && payload.choices[0].message ? payload.choices[0].message.content : null;
  if (!raw && payload.result) raw=payload.result.response;
  return parseJson(raw || payload.response);
}
function aiError(res,error) {
  if (error.message === 'AI_NOT_CONFIGURED') {res.status(503).json({error:'Для этой функции нужно подключить Cloudflare Workers AI в Render.'});return true;}
  if (error.message === 'AI_RATE_LIMIT') {res.status(429).json({error:'Лимит запросов ИИ исчерпан. Попробуй позже.'});return true;}
  if (error.message === 'AI_UPSTREAM') {res.status(502).json({error:'ИИ временно недоступен. Попробуй позже.'});return true;}
  return false;
}

const listeningLimiter=rateLimit({windowMs:3600000,limit:8,standardHeaders:'draft-8',legacyHeaders:false});
router.post('/listening/prepare',requireEnglishStudyLanguage,listeningLimiter,async function(req,res,next) {
  const body=req.body || {};
  const transcript=multiline(body.transcript,12000);
  const title=clean(body.title,120);
  const level=clean(body.level,3).toUpperCase();
  if (transcript.length<80) return res.status(400).json({error:'Добавь расшифровку минимум из 80 символов.'});
  if (!LEVELS.includes(level)) return res.status(400).json({error:'Выбери уровень CEFR.'});
  const sentences=transcript.split(/(?<=[.!?])\s+|\n+/u).map(function(x){return x.trim();}).filter(Boolean).slice(0,16);
  if (sentences.length<2) return res.status(400).json({error:'Нужно хотя бы два предложения для тренажёра.'});
  try {
    const quota=await consumeMonthlyQuota(req.user.id,'listening_prepare',3,60);
    if (!quota.allowed) return res.status(429).json({
      error:'Лимит подготовки аудирования с ИИ на этот месяц исчерпан ('+quota.used+'/'+quota.limit+'). Premium увеличивает лимит до 60.'
    });
    const data=await callAi(
      'Create listening comprehension from the learner transcript. Use only the supplied text. Return JSON with sentence_translations (exactly one Russian translation per sentence in the same order) and exactly four questions. Each question has id, question, four options, correct_option integer 0-3, explanation_ru. Questions test details present in the text. Use age-appropriate neutral topics. JSON only.',
      JSON.stringify({level:level,title:title,sentences:sentences}),1500
    );
    if (!Array.isArray(data.sentence_translations) || data.sentence_translations.length!==sentences.length) throw new Error('AI_TRANSLATIONS');
    const translations=data.sentence_translations.map(function(x){return clean(x,500);});
    if (translations.some(function(x){return !x;})) throw new Error('AI_TRANSLATIONS');
    const questions=(Array.isArray(data.questions)?data.questions:[]).slice(0,4).map(function(item,index){
      const options=Array.isArray(item.options)?item.options.slice(0,4).map(function(x){return clean(x,180);}):[];
      return {id:'q'+(index+1),question:clean(item.question,240),options:options,
        correct_option:Number(item.correct_option),explanation_ru:clean(item.explanation_ru,320)};
    });
    if (questions.length!==4 || questions.some(function(q){
      return !q.question || q.options.length!==4 || q.options.some(function(x){return !x;}) ||
        !Number.isInteger(q.correct_option) || q.correct_option<0 || q.correct_option>3;
    })) throw new Error('AI_QUESTIONS');
    const inserted=await pool.query(
      "INSERT INTO listening_quiz_sessions (user_id,language_code,title,level,question_set,expires_at) VALUES ($1,$2,$3,$4,$5::jsonb,NOW()+INTERVAL '90 minutes') RETURNING id",
      [req.user.id,req.studyLanguageCode,title || 'Listening practice',level,JSON.stringify(questions)]
    );
    res.status(201).json({
      session_id:inserted.rows[0].id,
      sentences:sentences.map(function(text,index){return {text:text,translation:translations[index]};}),
      questions:questions.map(function(q){return {id:q.id,question:q.question,options:q.options};})
    });
  } catch(error) {
    if (aiError(res,error)) return;
    console.error('Listening preparation failed:',error.message);
    res.status(502).json({error:'Не удалось подготовить вопросы. Проверь расшифровку и попробуй ещё раз.'});
  }
});
router.post('/listening/attempts',async function(req,res,next) {
  const body=req.body || {};
  const sessionId=body.session_id;
  const answers=body.answers;
  const duration=Number(body.duration_seconds || 0);
  if (typeof sessionId!=='string' || !Array.isArray(answers) || answers.length!==4) return res.status(400).json({error:'Ответь на все четыре вопроса.'});
  if (!Number.isInteger(duration) || duration<0 || duration>7200) return res.status(400).json({error:'Некорректная длительность занятия.'});
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const found=await client.query(
      "SELECT id,title,level,language_code,question_set FROM listening_quiz_sessions WHERE id=$1 AND user_id=$2 AND language_code=$3 AND completed_at IS NULL AND expires_at>NOW() FOR UPDATE",
      [sessionId,req.user.id,req.studyLanguageCode]
    );
    if (!found.rows[0]) {await client.query('ROLLBACK');return res.status(404).json({error:'Сессия аудирования истекла. Подготовь вопросы ещё раз.'});}
    const questions=found.rows[0].question_set;
    const answerMap=new Map(answers.map(function(item){return [item.question_id,item.option_index];}));
    if (questions.some(function(q){return !answerMap.has(q.id) || !Number.isInteger(Number(answerMap.get(q.id)));})) {
      await client.query('ROLLBACK');return res.status(400).json({error:'В ответах отсутствует один или несколько вопросов.'});
    }
    const details=questions.map(function(q){return {id:q.id,correct:Number(answerMap.get(q.id))===q.correct_option,correct_option:q.correct_option,explanation_ru:q.explanation_ru};});
    const correct=details.filter(function(x){return x.correct;}).length;
    const resultScore=Math.round(correct/questions.length*100);
    const stored=await client.query(
      "INSERT INTO listening_attempts (user_id,language_code,title,level,score,correct_count,question_count,duration_seconds) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,created_at",
      [req.user.id,found.rows[0].language_code,found.rows[0].title,found.rows[0].level,resultScore,correct,questions.length,duration]
    );
    await client.query('UPDATE listening_quiz_sessions SET completed_at=NOW() WHERE id=$1 AND user_id=$2 AND language_code=$3',[sessionId,req.user.id,req.studyLanguageCode]);
    await client.query('COMMIT');
    await recordActivity(req.user.id,{minutes:Math.max(1,Math.round(duration/60)),completedTasks:1,languageCode:found.rows[0].language_code});
    res.json({attempt_id:stored.rows[0].id,score:resultScore,correct_count:correct,question_count:questions.length,details:details});
  } catch(error) {
    await client.query('ROLLBACK');next(error);
  } finally {client.release();}
});

router.get('/analytics',async function(req,res,next) {
  let range='7d';
  if (['7d','30d','all'].includes(req.query.range)) range=req.query.range;
  let bucket='day';let days=7;
  if (range==='30d') days=30;
  if (range==='all') {bucket='month';days=null;}
  try {
    const result=await Promise.all([
      pool.query("SELECT date_trunc($2,activity_date::timestamp)::date::text AS period,SUM(minutes)::int AS minutes,SUM(completed_tasks)::int AS completed_tasks FROM daily_activity WHERE user_id=$1 AND language_code=$4 AND ($3::int IS NULL OR activity_date>=CURRENT_DATE-($3::int-1)) GROUP BY 1 ORDER BY 1",[req.user.id,bucket,days,req.studyLanguageCode]),
      pool.query("SELECT e.skill,COUNT(*)::int AS attempts,ROUND(AVG(a.score))::int AS accuracy FROM exercise_attempts a JOIN exercises e ON e.id=a.exercise_id WHERE a.user_id=$1 AND a.language_code=$2 GROUP BY e.skill",[req.user.id,req.studyLanguageCode]),
      pool.query("SELECT COUNT(*)::int AS attempts,ROUND(AVG(score))::int AS accuracy FROM listening_attempts WHERE user_id=$1 AND language_code=$2",[req.user.id,req.studyLanguageCode]),
      pool.query("SELECT COUNT(*)::int AS attempts,ROUND(AVG(overall_score))::int AS accuracy FROM writing_submissions WHERE user_id=$1 AND language_code=$2",[req.user.id,req.studyLanguageCode]),
      pool.query("SELECT COUNT(*)::int AS attempts,ROUND(AVG(word_match_score))::int AS accuracy FROM pronunciation_attempts WHERE user_id=$1 AND language_code=$2",[req.user.id,req.studyLanguageCode]),
      pool.query("SELECT COALESCE(SUM(minutes),0)::int AS minutes,COALESCE(SUM(completed_tasks),0)::int AS tasks,COUNT(*) FILTER (WHERE completed_tasks>0)::int AS active_days FROM daily_activity WHERE user_id=$1 AND language_code=$2",[req.user.id,req.studyLanguageCode]),
      pool.query("SELECT COUNT(*)::int AS count FROM srs_items WHERE user_id=$1 AND language_code=$2 AND item_type='vocabulary' AND due_at<=NOW()",[req.user.id,req.studyLanguageCode]),
      pool.query("SELECT error_type,COUNT(*)::int AS count,SUM(occurrences)::int AS occurrences FROM error_journal WHERE user_id=$1 AND language_code=$2 AND resolved_at IS NULL GROUP BY error_type ORDER BY SUM(occurrences) DESC LIMIT 8",[req.user.id,req.studyLanguageCode])
    ]);
    const bySkill=new Map(result[1].rows.map(function(row){return [row.skill,row];}));
    const skills=[];
    ['grammar','vocabulary','reading'].forEach(function(name){
      const row=bySkill.get(name);skills.push({skill:name,attempts:row?Number(row.attempts):0,accuracy:row?row.accuracy:null});
    });
    skills.push({skill:'listening',attempts:Number(result[2].rows[0].attempts),accuracy:result[2].rows[0].accuracy});
    skills.push({skill:'writing',attempts:Number(result[3].rows[0].attempts),accuracy:result[3].rows[0].accuracy});
    skills.push({skill:'speaking',attempts:Number(result[4].rows[0].attempts),accuracy:result[4].rows[0].accuracy});
    res.json({range:range,bucket:bucket,activity:result[0].rows,skills:skills,summary:result[5].rows[0],
      due_vocabulary:result[6].rows[0].count,repeated_errors:result[7].rows});
  } catch(error) {next(error);}
});

async function learnerSnapshot(userId, languageCode) {
  const result=await Promise.all([
    pool.query("SELECT goal,COALESCE(assessed_level,self_assessed_level,'A2') AS level,minutes_per_day FROM learner_language_profiles WHERE user_id=$1 AND language_code=$2",[userId,languageCode]),
    pool.query("SELECT error_type,incorrect_form,correction,explanation,occurrences FROM error_journal WHERE user_id=$1 AND language_code=$2 AND resolved_at IS NULL ORDER BY occurrences DESC,updated_at DESC LIMIT 10",[userId,languageCode]),
    pool.query("SELECT e.skill,COUNT(*)::int AS attempts,ROUND(AVG(a.score))::int AS accuracy FROM exercise_attempts a JOIN exercises e ON e.id=a.exercise_id WHERE a.user_id=$1 AND a.language_code=$2 GROUP BY e.skill",[userId,languageCode]),
    pool.query("SELECT COUNT(*)::int AS due_words FROM srs_items WHERE user_id=$1 AND language_code=$2 AND item_type='vocabulary' AND due_at<=NOW()",[userId,languageCode]),
    pool.query("SELECT COALESCE(SUM(minutes),0)::int AS minutes,COUNT(*) FILTER (WHERE completed_tasks>0)::int AS active_days FROM daily_activity WHERE user_id=$1 AND language_code=$2 AND activity_date>=CURRENT_DATE-6",[userId,languageCode]),
    pool.query("SELECT COUNT(*)::int AS attempts,ROUND(AVG(score))::int AS accuracy FROM listening_attempts WHERE user_id=$1 AND language_code=$2",[userId,languageCode]),
    pool.query("SELECT COUNT(*)::int AS attempts,ROUND(AVG(overall_score))::int AS accuracy FROM writing_submissions WHERE user_id=$1 AND language_code=$2",[userId,languageCode]),
    pool.query("SELECT COUNT(*)::int AS attempts,ROUND(AVG(word_match_score))::int AS accuracy FROM pronunciation_attempts WHERE user_id=$1 AND language_code=$2",[userId,languageCode])
  ]);
  const measuredSkills=result[2].rows.slice();
  [
    ['listening',result[5].rows[0]],
    ['writing',result[6].rows[0]],
    ['speaking',result[7].rows[0]]
  ].forEach(function(pair){
    if (Number(pair[1].attempts)>0) measuredSkills.push({
      skill:pair[0],attempts:Number(pair[1].attempts),accuracy:pair[1].accuracy
    });
  });
  return {profile:result[0].rows[0] || {goal:'general',level:'A2',minutes_per_day:10},
    repeated_errors:result[1].rows,exercise_skills:measuredSkills,
    vocabulary_due:Number(result[3].rows[0].due_words),last_7_days:result[4].rows[0]};
}
function fallbackRecommendations(snapshot) {
  const items=[];
  let grammar=null;
  for (const error of snapshot.repeated_errors) {if (String(error.error_type).includes('grammar')) {grammar=error;break;}}
  if (grammar) items.push({skill:'grammar',title:'Разобрать повторяющуюся грамматическую ошибку',
    focus:grammar.incorrect_form+' → '+grammar.correction,reason:'Эта ошибка повторялась '+grammar.occurrences+' раз.',
    action:'Повтори правило и выполни короткую практику на эту тему.',topic:'Grammar review'});
  const weak=snapshot.exercise_skills.filter(function(x){return Number(x.attempts)>=2 && x.accuracy!==null && Number(x.accuracy)<70;})
    .sort(function(a,b){return Number(a.accuracy)-Number(b.accuracy);})[0];
  if (weak) items.push({skill:weak.skill,title:'Укрепить навык: '+weak.skill,
    focus:'Точность по попыткам: около '+weak.accuracy+'%',reason:'Результаты показывают, что этому навыку полезно уделить больше внимания.',
    action:'Сделай короткую серию упражнений и разбери ошибки.',topic:weak.skill+' practice'});
  if (snapshot.vocabulary_due>0) items.push({skill:'vocabulary',title:'Повторить личный словарь',
    focus:snapshot.vocabulary_due+' карточек ожидают повторения',reason:'Слова уже добавлены в интервальное повторение.',
    action:'Открой карточки и оцени, насколько легко вспоминается каждое слово.',topic:'Vocabulary review'});
  if (!items.length) items.push({skill:'mixed',title:'Поддержать учебный ритм',focus:'Короткая практика в нескольких навыках',
    reason:'Пока недостаточно результатов для поиска устойчивых ошибок.',action:'Выполни небольшое упражнение и сохрани результат.',topic:'Mixed practice'});
  return items.slice(0,4);
}
const coachLimiter=rateLimit({windowMs:3600000,limit:4,standardHeaders:'draft-8',legacyHeaders:false});
router.get('/coach/latest',async function(req,res,next) {
  try {
    const result=await Promise.all([
      pool.query("SELECT id,recommendations,summary,source,created_at FROM learner_coach_reports WHERE user_id=$1 AND language_code=$2 ORDER BY created_at DESC LIMIT 1",[req.user.id,req.studyLanguageCode]),
      pool.query("SELECT id,title,description,skill,topic,due_date,completed_at FROM learner_focus_tasks WHERE user_id=$1 AND language_code=$2 AND completed_at IS NULL ORDER BY due_date,id LIMIT 8",[req.user.id,req.studyLanguageCode])
    ]);
    res.json({report:result[0].rows[0] || null,tasks:result[1].rows});
  } catch(error){next(error);}
});
router.post('/coach/analyze',coachLimiter,async function(req,res,next) {
  try {
    const cached=await pool.query("SELECT id,recommendations,summary,source,created_at FROM learner_coach_reports WHERE user_id=$1 AND language_code=$2 AND created_at>NOW()-INTERVAL '20 hours' ORDER BY created_at DESC LIMIT 1",[req.user.id,req.studyLanguageCode]);
    if (cached.rows[0]) {
      const tasks=await pool.query("SELECT id,title,description,skill,topic,due_date,completed_at FROM learner_focus_tasks WHERE user_id=$1 AND language_code=$3 AND report_id=$2 AND completed_at IS NULL ORDER BY due_date,id",[req.user.id,cached.rows[0].id,req.studyLanguageCode]);
      return res.json({report:cached.rows[0],tasks:tasks.rows,cached:true});
    }
    const quota=await consumeMonthlyQuota(req.user.id,'coach_analyze',2,30);
    if (!quota.allowed) return res.status(429).json({
      error:'Лимит AI-анализа прогресса на этот месяц исчерпан ('+quota.used+'/'+quota.limit+'). Premium увеличивает лимит до 30.'
    });
    const snapshot=await learnerSnapshot(req.user.id,req.studyLanguageCode);
    let summary='Анализ по сохранённым учебным результатам.';
    let recommendations=fallbackRecommendations(snapshot);
    let source='learning-patterns';
    if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) {
      try {
        const data=await callAi(
          'You are Quiet English AI, a supportive age-appropriate learning coach. Analyse only supplied aggregate learning data. Do not infer sensitive traits. Return JSON with summary_ru and 3-4 recommendations, each with skill,title,focus,reason,action,topic. Skills: grammar,vocabulary,reading,listening,speaking,writing,mixed. Prioritise repeated errors and weak measured skills. If evidence is sparse, say so. Never invent scores or claim official CEFR certification. JSON only.',
          JSON.stringify(snapshot),1200
        );
        const parsed=(Array.isArray(data.recommendations)?data.recommendations:[]).slice(0,4).map(function(item){
          return {skill:SKILLS.includes(item.skill)?item.skill:'mixed',title:clean(item.title,140),focus:clean(item.focus,200),
            reason:clean(item.reason,260),action:clean(item.action,260),topic:clean(item.topic,100)};
        }).filter(function(item){return item.title && item.action;});
        if (parsed.length) {recommendations=parsed;summary=clean(data.summary_ru,500) || summary;source='cloudflare-ai';}
      } catch(error){console.error('Coach AI fallback:',error.message);}
    }
    const inserted=await pool.query("INSERT INTO learner_coach_reports (user_id,language_code,summary,recommendations,source) VALUES ($1,$2,$3,$4::jsonb,$5) RETURNING id,summary,recommendations,source,created_at",[req.user.id,req.studyLanguageCode,summary,JSON.stringify(recommendations),source]);
    const report=inserted.rows[0];const tasks=[];
    for (let i=0;i<recommendations.length;i++) {
      const item=recommendations[i];
      const task=await pool.query(
        "INSERT INTO learner_focus_tasks (user_id,language_code,report_id,position,title,description,skill,topic,due_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_DATE+$4::int) ON CONFLICT (report_id,position) DO NOTHING RETURNING id,title,description,skill,topic,due_date,completed_at",
        [req.user.id,req.studyLanguageCode,report.id,i,item.title,item.action,item.skill,item.topic]
      );
      if (task.rows[0]) tasks.push(task.rows[0]);
    }
    res.json({report:report,tasks:tasks,source:source});
  } catch(error){next(error);}
});
router.get('/coach/tasks',async function(req,res,next) {
  try {
    const result=await pool.query("SELECT id,title,description,skill,topic,due_date,completed_at FROM learner_focus_tasks WHERE user_id=$1 AND language_code=$2 ORDER BY completed_at NULLS FIRST,due_date,id LIMIT 30",[req.user.id,req.studyLanguageCode]);
    res.json({tasks:result.rows});
  } catch(error){next(error);}
});
router.patch('/coach/tasks/:id',async function(req,res,next) {
  if (!req.body || typeof req.body.completed!=='boolean') return res.status(400).json({error:'Укажи состояние задачи.'});
  try {
    const result=await pool.query("UPDATE learner_focus_tasks SET completed_at=CASE WHEN $3 THEN COALESCE(completed_at,NOW()) ELSE NULL END WHERE id=$1 AND user_id=$2 AND language_code=$4 RETURNING id,title,completed_at",[req.params.id,req.user.id,req.body.completed,req.studyLanguageCode]);
    if (!result.rows[0]) return res.status(404).json({error:'Задача не найдена.'});
    if (req.body.completed) await recordActivity(req.user.id,{minutes:3,completedTasks:1,languageCode:req.studyLanguageCode});
    res.json({task:result.rows[0]});
  } catch(error){next(error);}
});

router.get('/calendar/events',async function(req,res,next) {
  let from=new Date();let to=new Date(Date.now()+35*86400000);
  if (typeof req.query.from==='string') from=new Date(req.query.from);
  if (typeof req.query.to==='string') to=new Date(req.query.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to<=from || to-from>370*86400000) return res.status(400).json({error:'Проверь диапазон календаря.'});
  try {
    const result=await pool.query("SELECT id,title,description,event_type,starts_at,duration_minutes,completed_at,created_at FROM study_calendar_events WHERE user_id=$1 AND language_code=$4 AND starts_at>=$2 AND starts_at<$3 ORDER BY starts_at",[req.user.id,from,to,req.studyLanguageCode]);
    res.json({events:result.rows});
  } catch(error){next(error);}
});
router.post('/calendar/events',async function(req,res,next) {
  const body=req.body || {};
  const title=clean(body.title,120);const description=clean(body.description,500);
  const eventType=clean(body.event_type,20);const startsAt=new Date(body.starts_at);
  const duration=Number(body.duration_minutes || 20);
  if (title.length<2) return res.status(400).json({error:'Добавь название занятия.'});
  if (Number.isNaN(startsAt.getTime())) return res.status(400).json({error:'Укажи корректные дату и время.'});
  if (!['study','review','writing','listening','speaking','other'].includes(eventType)) return res.status(400).json({error:'Выбери тип занятия.'});
  if (!Number.isInteger(duration) || duration<5 || duration>240) return res.status(400).json({error:'Длительность должна быть от 5 до 240 минут.'});
  try {
    const result=await pool.query("INSERT INTO study_calendar_events (user_id,language_code,title,description,event_type,starts_at,duration_minutes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id,title,description,event_type,starts_at,duration_minutes,completed_at",[req.user.id,req.studyLanguageCode,title,description,eventType,startsAt,duration]);
    res.status(201).json({event:result.rows[0]});
  } catch(error){next(error);}
});
router.patch('/calendar/events/:id',async function(req,res,next) {
  if (!req.body || typeof req.body.completed!=='boolean') return res.status(400).json({error:'Укажи состояние занятия.'});
  try {
    const result=await pool.query("UPDATE study_calendar_events SET completed_at=CASE WHEN $3 THEN COALESCE(completed_at,NOW()) ELSE NULL END WHERE id=$1 AND user_id=$2 AND language_code=$4 RETURNING id,title,completed_at",[req.params.id,req.user.id,req.body.completed,req.studyLanguageCode]);
    if (!result.rows[0]) return res.status(404).json({error:'Занятие не найдено.'});
    if (req.body.completed) await recordActivity(req.user.id,{minutes:1,completedTasks:0,languageCode:req.studyLanguageCode});
    res.json({event:result.rows[0]});
  } catch(error){next(error);}
});
router.delete('/calendar/events/:id',async function(req,res,next) {
  try {
    const result=await pool.query("DELETE FROM study_calendar_events WHERE id=$1 AND user_id=$2 AND language_code=$3",[req.params.id,req.user.id,req.studyLanguageCode]);
    if (!result.rowCount) return res.status(404).json({error:'Занятие не найдено.'});
    res.json({ok:true});
  } catch(error){next(error);}
});

export default router;
