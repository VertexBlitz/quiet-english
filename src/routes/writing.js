import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { pool, requireDatabase, requireUser, loadActiveStudyLanguage, recordActivity } from '../db.js';
import { isExternalPersonalDataProcessingAllowed } from '../region-config.js';
import { consumeMonthlyQuota } from '../subscription-access.js';

const router = express.Router();
router.use(requireDatabase, requireUser, loadActiveStudyLanguage);
const MODEL = process.env.CLOUDFLARE_MODEL || '@cf/google/gemma-4-26b-a4b-it';
const TYPES = ['essay','email','story','article','exam'];
const LEVELS = ['A1','A2','B1','B2','C1','C2'];

function clean(value, max = 240) {
  return typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim().slice(0, max) : '';
}
function multiline(value, max = 7000) {
  return typeof value === 'string' ? value.replace(/\r\n?/gu, '\n').trim().slice(0, max) : '';
}
function parseJson(raw) {
  if (typeof raw !== 'string') throw new Error('AI_EMPTY');
  const value = raw.trim();
  const first = value.indexOf('{');
  const last = value.lastIndexOf('}');
  if (first < 0 || last <= first) throw new Error('AI_JSON');
  return JSON.parse(value.slice(first, last + 1));
}
async function callAi(system, user) {
  if (!isExternalPersonalDataProcessingAllowed() || !process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) throw new Error('AI_NOT_CONFIGURED');
  const endpoint = 'https://api.cloudflare.com/client/v4/accounts/' +
    encodeURIComponent(process.env.CLOUDFLARE_ACCOUNT_ID) + '/ai/v1/chat/completions';
  const response = await fetch(endpoint, {
    method:'POST',
    headers:{Authorization:'Bearer '+process.env.CLOUDFLARE_API_TOKEN,'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({
      model:MODEL,
      messages:[{role:'system',content:system},{role:'user',content:user}],
      stream:false,max_tokens:2200,temperature:0.25,
      chat_template_kwargs:{enable_thinking:false}
    }),
    signal:AbortSignal.timeout(45000)
  });
  if (!response.ok) {
    const detail = await response.text().catch(function(){return '';});
    console.error('Writing AI upstream:',response.status,detail.slice(0,180));
    throw new Error(response.status === 429 ? 'AI_RATE_LIMIT' : 'AI_UPSTREAM');
  }
  const payload = await response.json();
  let raw = payload.choices && payload.choices[0] && payload.choices[0].message ? payload.choices[0].message.content : null;
  if (!raw && payload.result) raw = payload.result.response;
  return parseJson(raw || payload.response);
}
function handleAiError(res,error) {
  if (error.message === 'AI_NOT_CONFIGURED') {res.status(503).json({error:'Для Writing Lab нужно подключить Cloudflare Workers AI в Render.'});return true;}
  if (error.message === 'AI_RATE_LIMIT') {res.status(429).json({error:'Лимит запросов ИИ исчерпан. Попробуй позже.'});return true;}
  if (error.message === 'AI_UPSTREAM') {res.status(502).json({error:'ИИ временно недоступен. Попробуй позже.'});return true;}
  return false;
}
const writingLimiter = rateLimit({windowMs:3600000,limit:6,standardHeaders:'draft-8',legacyHeaders:false});
router.post('/writing/review',writingLimiter,async function(req,res,next) {
  const body = req.body || {};
  const text = multiline(body.text);
  const taskType = clean(body.task_type,20).toLowerCase();
  const level = clean(body.level,3).toUpperCase();
  const topic = clean(body.topic,160);
  if (text.length < 30) return res.status(400).json({error:'Добавь текст минимум из 30 символов.'});
  if (!TYPES.includes(taskType)) return res.status(400).json({error:'Выбери формат текста.'});
  if (!LEVELS.includes(level)) return res.status(400).json({error:'Выбери уровень CEFR.'});
  if (req.studyLanguageCode === 'de' && !['A1','A2'].includes(level)) {
    return res.status(400).json({error:'Немецкий Writing Lab сейчас поддерживает уровни A1–A2.'});
  }
  try {
    const profile = await pool.query("SELECT COALESCE(assessed_level,self_assessed_level,$2) AS level FROM learner_language_profiles WHERE user_id=$1 AND language_code=$3",[req.user.id,level,req.studyLanguageCode]);
    const actualLevel = profile.rows[0] && LEVELS.includes(profile.rows[0].level) ? profile.rows[0].level : level;
    const targetLanguage = req.studyLanguageCode === 'de' ? 'German' : 'English';
    const system = [
      'You are a careful, supportive ' + targetLanguage + ' writing teacher for a general-audience learning service.',
      'The learner is practising ' + targetLanguage + '. All corrections and the natural_version must remain in ' + targetLanguage + '.',
      'Preserve the learner meaning. Do not invent facts or change the argument.',
      'Correct grammar and punctuation, find unnatural expressions, assess vocabulary and structure.',
      'Return one JSON object only with keys corrected_text, natural_version, summary_ru, scores, issues, strengths, next_steps, repeated_patterns.',
      'Write summary_ru, explanation_ru, strengths, next_steps and repeated-pattern explanations in Russian. Write explanation_en in English.',
      'scores must contain grammar, naturalness, vocabulary, structure as integers 0-100.',
      'issues are objects with type, original, correction, explanation_ru, explanation_en. type is grammar, naturalness, vocabulary, punctuation, or structure.',
      'Use exact short spans. Do not invent errors. Keep feedback supportive, concise and suitable for A1-A2 learners when the target language is German.',
      'repeated_patterns are objects with label, explanation_ru, example_wrong, example_correct. No Markdown.'
    ].join(' ');
    const quota = await consumeMonthlyQuota(req.user.id,'writing_review',3,30);
    if (!quota.allowed) return res.status(429).json({
      error:'Лимит проверок Writing Lab на этот месяц исчерпан ('+quota.used+'/'+quota.limit+'). Premium увеличивает лимит до 30 проверок в месяц.'
    });
    const data = await callAi(system,JSON.stringify({
      target_language: targetLanguage,
      interface_language: req.interfaceLanguage,
      level:actualLevel,task_type:taskType,topic:topic,learner_text:text
    }));
    const score = function(value) {const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(100,Math.round(n))):null;};
    const scores = {
      grammar:score(data.scores && data.scores.grammar),
      naturalness:score(data.scores && data.scores.naturalness),
      vocabulary:score(data.scores && data.scores.vocabulary),
      structure:score(data.scores && data.scores.structure)
    };
    if (Object.values(scores).some(function(x){return x === null;})) throw new Error('AI_SCORE');
    const issues = (Array.isArray(data.issues)?data.issues:[]).slice(0,24).map(function(item){
      const types = ['grammar','naturalness','vocabulary','punctuation','structure'];
      return {
        type:types.includes(item.type)?item.type:'grammar',
        original:clean(item.original,220),correction:clean(item.correction,220),
        explanation_ru:clean(item.explanation_ru,420),explanation_en:clean(item.explanation_en,420)
      };
    }).filter(function(x){return x.original && x.correction;});
    const strengths = (Array.isArray(data.strengths)?data.strengths:[]).slice(0,6).map(function(x){return clean(x,220);}).filter(Boolean);
    const nextSteps = (Array.isArray(data.next_steps)?data.next_steps:[]).slice(0,6).map(function(x){return clean(x,220);}).filter(Boolean);
    const repeated = (Array.isArray(data.repeated_patterns)?data.repeated_patterns:[]).slice(0,8).map(function(x){
      return {label:clean(x.label,120),explanation_ru:clean(x.explanation_ru,300),example_wrong:clean(x.example_wrong,180),example_correct:clean(x.example_correct,180)};
    }).filter(function(x){return x.label;});
    const overall = Math.round((scores.grammar+scores.naturalness+scores.vocabulary+scores.structure)/4);
    const corrected = multiline(data.corrected_text);
    const natural = multiline(data.natural_version);
    const summary = clean(data.summary_ru,700);
    const inserted = await pool.query(
      "INSERT INTO writing_submissions (user_id,language_code,task_type,level,topic,submitted_text,corrected_text,natural_version,summary_ru,grammar_score,naturalness_score,vocabulary_score,structure_score,overall_score,issues,strengths,next_steps,repeated_patterns) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,$17::jsonb,$18::jsonb) RETURNING id,created_at",
      [req.user.id,req.studyLanguageCode,taskType,actualLevel,topic,text,corrected,natural,summary,scores.grammar,scores.naturalness,scores.vocabulary,scores.structure,overall,JSON.stringify(issues),JSON.stringify(strengths),JSON.stringify(nextSteps),JSON.stringify(repeated)]
    );
    for (const issue of issues) {
      const errorType = 'writing:' + issue.type;
      const prior = await pool.query("SELECT id FROM error_journal WHERE user_id=$1 AND language_code=$4 AND error_type=$2 AND incorrect_form=$3 AND resolved_at IS NULL ORDER BY updated_at DESC LIMIT 1",[req.user.id,errorType,issue.original,req.studyLanguageCode]);
      const explanation = issue.explanation_ru || issue.explanation_en || null;
      if (prior.rows[0]) {
        await pool.query("UPDATE error_journal SET occurrences=occurrences+1,correction=$2,explanation=$3,updated_at=NOW() WHERE id=$1",[prior.rows[0].id,issue.correction,explanation]);
      } else {
        await pool.query("INSERT INTO error_journal (user_id,language_code,error_type,incorrect_form,correction,explanation) VALUES ($1,$2,$3,$4,$5,$6)",[req.user.id,req.studyLanguageCode,errorType,issue.original,issue.correction,explanation]);
      }
    }
    await recordActivity(req.user.id,{minutes:5,completedTasks:1,languageCode:req.studyLanguageCode});
    res.status(201).json({submission:{
      id:inserted.rows[0].id,created_at:inserted.rows[0].created_at,task_type:taskType,level:actualLevel,
      scores:scores,overall_score:overall,corrected_text:corrected,natural_version:natural,
      summary_ru:summary,issues:issues,strengths:strengths,next_steps:nextSteps,repeated_patterns:repeated
    }});
  } catch(error) {
    if (handleAiError(res,error)) return;
    console.error('Writing review failed:',error.message);
    next(error);
  }
});
router.get('/writing/history',async function(req,res,next) {
  try {
    const result = await pool.query("SELECT id,task_type,level,topic,summary_ru,grammar_score,naturalness_score,vocabulary_score,structure_score,overall_score,created_at FROM writing_submissions WHERE user_id=$1 AND language_code=$2 ORDER BY created_at DESC LIMIT 20",[req.user.id,req.studyLanguageCode]);
    res.json({submissions:result.rows});
  } catch(error) {next(error);}
});
router.get('/writing/:id',async function(req,res,next) {
  try {
    const result = await pool.query("SELECT id,task_type,level,topic,submitted_text,corrected_text,natural_version,summary_ru,grammar_score,naturalness_score,vocabulary_score,structure_score,overall_score,issues,strengths,next_steps,repeated_patterns,created_at FROM writing_submissions WHERE id=$1 AND user_id=$2 AND language_code=$3",[req.params.id,req.user.id,req.studyLanguageCode]);
    if (!result.rows[0]) return res.status(404).json({error:'Работа не найдена.'});
    res.json({submission:result.rows[0]});
  } catch(error) {next(error);}
});
export default router;
