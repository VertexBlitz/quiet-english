import express from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { pool, requireDatabase, requireUser } from '../db.js';

const router = express.Router();
const PLANS = {
  premium_monthly:{code:'premium_monthly',name:'Premium · месяц',amount:299,months:1,label:'299 ₽ / месяц'},
  premium_yearly:{code:'premium_yearly',name:'Premium · год',amount:2490,months:12,label:'2 490 ₽ / год'}
};
const tokenHash = value => createHash('sha256').update(value).digest('hex');
const appUrl = () => (process.env.APP_BASE_URL || '').replace(/\/$/,'');
const paymentsReady = () => process.env.YOOKASSA_LIVE_ENABLED === 'true' &&
  Boolean(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY && appUrl());
const renewalsReady = () => Boolean(process.env.BILLING_CRON_SECRET);

function sameSite(req,res,next) {
  const origin=req.get('origin');
  if (!origin || !appUrl()) return res.status(403).json({error:'Запрос должен быть отправлен с официального сайта.'});
  try {
    if (new URL(origin).origin !== new URL(appUrl()).origin) {
      return res.status(403).json({error:'Источник запроса не разрешён.'});
    }
  } catch {
    return res.status(403).json({error:'Проверь APP_BASE_URL в настройках сервера.'});
  }
  next();
}
function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[ch]);
}
async function sendGuardianEmail(to,plan,token) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !appUrl()) {
    throw new Error('EMAIL_NOT_CONFIGURED');
  }
  const link=appUrl()+'/guardian-approval.html?token='+encodeURIComponent(token);
  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({
      from:process.env.EMAIL_FROM,
      to:[to],
      subject:'Подтверждение подписки Quiet English',
      html:'<p>Поступил запрос на оформление '+escapeHtml(plan.name)+' для учебного аккаунта Quiet English.</p>'+
        '<p>Чтобы проверить сумму, условия и самостоятельно решить, разрешать ли оплату, откройте защищённую страницу:</p>'+
        '<p><a href="'+link+'">Проверить запрос на Premium</a></p>'+
        '<p>Ссылка действует 48 часов. Не пересылайте её третьим лицам. Если запрос вам неизвестен, проигнорируйте письмо.</p>'
    }),
    signal:AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error('EMAIL_DELIVERY_FAILED');
}
function providerAuth() {
  return 'Basic '+Buffer.from(process.env.YOOKASSA_SHOP_ID+':'+process.env.YOOKASSA_SECRET_KEY).toString('base64');
}
async function yookassaRequest(path,method,body,idempotenceKey) {
  const response=await fetch('https://api.yookassa.ru/v3'+path,{
    method:method,
    headers:{
      Authorization:providerAuth(),
      'Content-Type':'application/json',
      ...(idempotenceKey ? {'Idempotence-Key':idempotenceKey} : {})
    },
    ...(body ? {body:JSON.stringify(body)} : {}),
    signal:AbortSignal.timeout(25000)
  });
  const payload=await response.json().catch(()=>({}));
  if (!response.ok) {
    console.error('YooKassa request failed:',response.status);
    throw new Error('PAYMENT_PROVIDER_ERROR');
  }
  return payload;
}
async function createCheckoutOrder(options) {
  const userId=options.userId;
  const planCode=options.planCode;
  const autoRenew=options.autoRenew===true;
  const guardianApprovalId=options.guardianApprovalId||null;
  if (!paymentsReady()) throw new Error('PAYMENTS_NOT_CONFIGURED');
  const plan=PLANS[planCode];
  if (!plan) throw new Error('PLAN_NOT_FOUND');
  if (autoRenew && !renewalsReady()) throw new Error('RENEWALS_NOT_CONFIGURED');

  const inserted=await pool.query(
    "INSERT INTO billing_orders (user_id,plan_code,amount,currency,auto_renew_requested,guardian_approval_id) " +
    "VALUES ($1,$2,$3,'RUB',$4,$5) RETURNING id",
    [userId,planCode,plan.amount,autoRenew,guardianApprovalId]
  );
  const orderId=inserted.rows[0].id;
  try {
    const returnUrl=appUrl()+'/subscription.html?payment=return&order='+encodeURIComponent(orderId);
    const payment=await yookassaRequest('/payments','POST',{
      amount:{value:plan.amount.toFixed(2),currency:'RUB'},
      capture:true,
      confirmation:{type:'redirect',return_url:returnUrl},
      description:'Quiet English Premium — '+(plan.months===12?'год':'месяц'),
      ...(autoRenew ? {save_payment_method:true} : {}),
      metadata:{order_id:orderId,user_id:userId,plan_code:planCode}
    },orderId);
    const confirmationUrl=payment.confirmation && payment.confirmation.confirmation_url;
    if (!payment.id || !confirmationUrl) throw new Error('PAYMENT_RESPONSE_INVALID');
    await pool.query(
      "UPDATE billing_orders SET provider_payment_id=$2,status='pending',checkout_url=$3,provider_payload=$4::jsonb WHERE id=$1",
      [orderId,payment.id,confirmationUrl,JSON.stringify({status:payment.status||'pending'})]
    );
    return {order_id:orderId,checkout_url:confirmationUrl};
  } catch(error) {
    await pool.query("UPDATE billing_orders SET status='failed' WHERE id=$1",[orderId]).catch(()=>{});
    throw error;
  }
}
async function applySucceededPayment(payment) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const found=await client.query('SELECT * FROM billing_orders WHERE provider_payment_id=$1 FOR UPDATE',[payment.id]);
    if (!found.rows[0]) { await client.query('COMMIT'); return {matched:false}; }
    const order=found.rows[0];
    if (order.status==='succeeded') { await client.query('COMMIT'); return {matched:true,duplicate:true}; }
    const plan=PLANS[order.plan_code];
    const currency=payment.amount && payment.amount.currency;
    const value=payment.amount && Number(payment.amount.value);
    if (!plan || payment.status!=='succeeded' || payment.paid!==true ||
        currency!=='RUB' || !Number.isFinite(value) || value!==Number(order.amount)) {
      await client.query('ROLLBACK');
      throw new Error('PAYMENT_VALIDATION_FAILED');
    }
    const returnedMethodId=payment.payment_method && typeof payment.payment_method.id==='string'
      ? payment.payment_method.id : null;
    const savedMethod=payment.payment_method && payment.payment_method.saved===true && returnedMethodId
      ? returnedMethodId : order.payment_method_id || null;
    const autoRenew=Boolean(order.auto_renew_requested && savedMethod);
    await client.query(
      "UPDATE billing_orders SET status='succeeded',paid_at=NOW(),payment_method_id=$2,provider_payload=$3::jsonb WHERE id=$1",
      [order.id,savedMethod,JSON.stringify({payment_id:payment.id,status:payment.status,paid:payment.paid,
        amount:payment.amount,payment_method_saved:Boolean(savedMethod)})]
    );
    await client.query(
      "INSERT INTO user_subscriptions " +
      "(user_id,plan_code,status,current_period_start,current_period_end,auto_renew,cancel_at_period_end," +
      "payment_method_id,last_order_id,next_renewal_at,renewal_attempts) " +
      "VALUES ($1,$2,'active',NOW(),NOW()+($3::int*INTERVAL '1 month'),$4,FALSE,$5,$6," +
      "CASE WHEN $4 THEN NOW()+($3::int*INTERVAL '1 month') ELSE NULL END,0) " +
      "ON CONFLICT (user_id) DO UPDATE SET " +
      "plan_code=EXCLUDED.plan_code,status='active'," +
      "current_period_start=GREATEST(user_subscriptions.current_period_end,NOW())," +
      "current_period_end=GREATEST(user_subscriptions.current_period_end,NOW())+($3::int*INTERVAL '1 month')," +
      "auto_renew=EXCLUDED.auto_renew,cancel_at_period_end=FALSE,payment_method_id=EXCLUDED.payment_method_id," +
      "last_order_id=EXCLUDED.last_order_id,last_renewal_attempt_at=NULL,renewal_attempts=0," +
      "next_renewal_at=CASE WHEN EXCLUDED.auto_renew " +
      "THEN GREATEST(user_subscriptions.current_period_end,NOW())+($3::int*INTERVAL '1 month') ELSE NULL END," +
      "updated_at=NOW()",
      [order.user_id,order.plan_code,plan.months,autoRenew,savedMethod,order.id]
    );
    await client.query('COMMIT');
    return {matched:true,activated:true,auto_renew:autoRenew};
  } catch(error) {
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  } finally {
    client.release();
  }
}
async function confirmProviderPayment(paymentId) {
  const payment=await yookassaRequest('/payments/'+encodeURIComponent(paymentId),'GET');
  if (payment.status==='succeeded' && payment.paid===true) return applySucceededPayment(payment);
  if (payment.status==='canceled') {
    await pool.query("UPDATE billing_orders SET status='canceled' WHERE provider_payment_id=$1 AND status<>'succeeded'",[paymentId]);
  }
  return {matched:Boolean(payment.id),status:payment.status};
}

router.get('/plans',(req,res)=>{
  res.json({plans:Object.values(PLANS),currency:'RUB'});
});
router.get('/me',requireDatabase,requireUser,async(req,res,next)=>{
  try {
    const [subscription,usage,orders,user]=await Promise.all([
      pool.query(
        "SELECT plan_code,status,current_period_start,current_period_end,auto_renew,cancel_at_period_end " +
        "FROM user_subscriptions WHERE user_id=$1 AND status='active' AND current_period_end>NOW()",
        [req.user.id]
      ),
      pool.query(
        "SELECT feature_key,used FROM subscription_usage WHERE user_id=$1 AND month_start=date_trunc('month',NOW())::date",
        [req.user.id]
      ),
      pool.query(
        "SELECT id,plan_code,amount,currency,status,created_at,paid_at FROM billing_orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10",
        [req.user.id]
      ),
      pool.query("SELECT age_band,guardian_email FROM users WHERE id=$1",[req.user.id])
    ]);
    const item=user.rows[0]||{};
    const active=subscription.rows[0]||null;
    const usageMap=Object.fromEntries(usage.rows.map(row=>[row.feature_key,Number(row.used)]));
    res.json({
      plan:active?'premium':'free',
      subscription:active,
      usage:usageMap,
      guardian_required:item.age_band!=='18_plus',
      guardian_email_on_file:Boolean(item.guardian_email),
      checkout_ready:paymentsReady(),
      auto_renew_ready:renewalsReady(),
      payments_history:orders.rows
    });
  } catch(error){next(error);}
});
router.post('/checkout',sameSite,requireDatabase,requireUser,async(req,res,next)=>{
  if (req.user.age_band!=='18_plus') {
    return res.status(403).json({error:'Для оформления Premium на этом аккаунте нужно подтверждение родителя или законного представителя. Отправь ему запрос со страницы подписки.'});
  }
  const planCode=String(req.body?.plan_code||'');
  const autoRenew=req.body?.auto_renew===true;
  try {
    const result=await createCheckoutOrder({userId:req.user.id,planCode,autoRenew});
    res.status(201).json(result);
  } catch(error) {
    if (error.message==='PAYMENTS_NOT_CONFIGURED') return res.status(503).json({error:'Онлайн-оплата ещё не включена. Владелец магазина должен заключить договор с ЮKassa и добавить ключи в Render.'});
    if (error.message==='RENEWALS_NOT_CONFIGURED') return res.status(503).json({error:'Автопродление пока не настроено. Сними отметку об автопродлении и выбери разовую оплату.'});
    if (error.message==='PLAN_NOT_FOUND') return res.status(400).json({error:'Неизвестный тариф.'});
    next(error);
  }
});
router.post('/guardian/request',sameSite,requireDatabase,requireUser,async(req,res,next)=>{
  const planCode=String(req.body?.plan_code||'');
  const plan=PLANS[planCode];
  if (!plan) return res.status(400).json({error:'Выбери тариф.'});
  try {
    const userResult=await pool.query('SELECT age_band,email,guardian_email FROM users WHERE id=$1',[req.user.id]);
    const user=userResult.rows[0];
    if (!user || user.age_band==='18_plus') return res.status(400).json({error:'Для взрослого аккаунта используй обычное оформление подписки.'});
    if (!user.guardian_email) return res.status(400).json({error:'В аккаунте не указан email родителя или законного представителя. Попроси взрослого помочь обновить данные аккаунта.'});
    if (user.guardian_email.toLowerCase()===user.email.toLowerCase()) return res.status(400).json({error:'Для подтверждения нужен отдельный email родителя или законного представителя.'});
    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !appUrl()) {
      return res.status(503).json({error:'Не настроена отправка писем для подтверждения родителем.'});
    }
    const raw=randomBytes(32).toString('base64url');
    const inserted=await pool.query(
      "INSERT INTO subscription_guardian_approvals (user_id,guardian_email,plan_code,token_hash,expires_at) " +
      "VALUES ($1,$2,$3,$4,NOW()+INTERVAL '48 hours') RETURNING id",
      [req.user.id,user.guardian_email,planCode,tokenHash(raw)]
    );
    try {
      await sendGuardianEmail(user.guardian_email,plan,raw);
    } catch(error) {
      await pool.query('DELETE FROM subscription_guardian_approvals WHERE id=$1',[inserted.rows[0].id]).catch(()=>{});
      console.error('Guardian subscription email failed:',error.message);
      return res.status(503).json({error:'Не удалось отправить письмо родителю. Проверьте почтовый адрес и настройки почты сайта.'});
    }
    res.json({ok:true,message:'Запрос отправлен на email родителя. Оплатить подписку сможет только взрослый по защищённой ссылке.'});
  } catch(error){next(error);}
});
router.get('/guardian/quote',requireDatabase,async(req,res,next)=>{
  const token=typeof req.query.token==='string'?req.query.token:'';
  if (token.length<30 || token.length>200) return res.status(400).json({error:'Ссылка некорректна.'});
  try {
    const found=await pool.query(
      "SELECT a.id,a.plan_code FROM subscription_guardian_approvals a " +
      "WHERE a.token_hash=$1 AND a.approved_at IS NULL AND a.used_at IS NULL AND a.expires_at>NOW()",
      [tokenHash(token)]
    );
    if (!found.rows[0]) return res.status(404).json({error:'Ссылка уже использована или срок её действия истёк.'});
    const plan=PLANS[found.rows[0].plan_code];
    res.json({plan:plan,message:'Оплату и согласие на возможное автопродление подтверждает родитель или законный представитель.'});
  } catch(error){next(error);}
});
router.post('/guardian/checkout',sameSite,requireDatabase,async(req,res,next)=>{
  const token=typeof req.body?.token==='string'?req.body.token:'';
  if (token.length<30 || token.length>200 || req.body?.guardian_confirmed!==true) {
    return res.status(400).json({error:'Для продолжения необходимо подтверждение родителя или законного представителя.'});
  }
  const autoRenew=req.body?.auto_renew===true;
  const client=await pool.connect();
  let approval;
  try {
    await client.query('BEGIN');
    const found=await client.query(
      "SELECT a.id,a.user_id,a.plan_code FROM subscription_guardian_approvals a " +
      "WHERE a.token_hash=$1 AND a.approved_at IS NULL AND a.used_at IS NULL AND a.expires_at>NOW() " +
      "FOR UPDATE OF a",
      [tokenHash(token)]
    );
    if (!found.rows[0]) {await client.query('ROLLBACK');return res.status(404).json({error:'Ссылка уже использована или срок её действия истёк.'});}
    approval=found.rows[0];
    await client.query(
      'UPDATE subscription_guardian_approvals SET approved_at=NOW(),auto_renew_consent=$2 WHERE id=$1',
      [approval.id,autoRenew]
    );
    await client.query('COMMIT');
  } catch(error) {
    await client.query('ROLLBACK').catch(()=>{});
    return next(error);
  } finally {client.release();}
  try {
    const result=await createCheckoutOrder({
      userId:approval.user_id,planCode:approval.plan_code,autoRenew,guardianApprovalId:approval.id
    });
    await pool.query('UPDATE subscription_guardian_approvals SET used_at=NOW() WHERE id=$1',[approval.id]);
    res.status(201).json(result);
  } catch(error) {
    if (error.message==='PAYMENTS_NOT_CONFIGURED') return res.status(503).json({error:'Онлайн-оплата ещё не включена владельцем магазина.'});
    if (error.message==='RENEWALS_NOT_CONFIGURED') return res.status(503).json({error:'Автопродление ещё не настроено. Сними отметку об автопродлении и выбери разовую оплату.'});
    if (error.message==='PLAN_NOT_FOUND') return res.status(400).json({error:'Неизвестный тариф.'});
    next(error);
  }
});
router.post('/cancel',sameSite,requireDatabase,requireUser,async(req,res,next)=>{
  try {
    const result=await pool.query(
      "UPDATE user_subscriptions SET auto_renew=FALSE,cancel_at_period_end=TRUE," +
      "payment_method_id=NULL,next_renewal_at=NULL,updated_at=NOW() " +
      "WHERE user_id=$1 AND status='active' AND current_period_end>NOW() RETURNING current_period_end",
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({error:'Активной подписки не найдено.'});
    res.json({ok:true,current_period_end:result.rows[0].current_period_end,message:'Автопродление отключено. Premium останется доступен до конца оплаченного периода.'});
  } catch(error){next(error);}
});
router.post('/webhook',requireDatabase,async(req,res)=>{
  const event=String(req.body?.event||'');
  const paymentId=req.body?.object?.id;
  if (!['payment.succeeded','payment.canceled'].includes(event) || typeof paymentId!=='string') {
    return res.status(200).json({ok:true,ignored:true});
  }
  try {
    await confirmProviderPayment(paymentId);
    res.status(200).json({ok:true});
  } catch(error) {
    console.error('YooKassa webhook verification failed:',error.message);
    res.status(500).json({error:'Не удалось проверить уведомление.'});
  }
});
function safeSecretEqual(a,b) {
  if (typeof a!=='string' || typeof b!=='string') return false;
  const left=Buffer.from(a);const right=Buffer.from(b);
  return left.length===right.length && timingSafeEqual(left,right);
}
async function createRenewalCharge(subscription) {
  const plan=PLANS[subscription.plan_code];
  if (!plan || !subscription.payment_method_id) return 'skipped';
  const inserted=await pool.query(
    "INSERT INTO billing_orders (user_id,plan_code,amount,currency,status,auto_renew_requested,payment_method_id) " +
    "VALUES ($1,$2,$3,'RUB','creating',TRUE,$4) RETURNING id",
    [subscription.user_id,subscription.plan_code,plan.amount,subscription.payment_method_id]
  );
  const orderId=inserted.rows[0].id;
  try {
    const payment=await yookassaRequest('/payments','POST',{
      amount:{value:plan.amount.toFixed(2),currency:'RUB'},
      capture:true,
      payment_method_id:subscription.payment_method_id,
      description:'Quiet English Premium — продление',
      metadata:{order_id:orderId,user_id:subscription.user_id,plan_code:subscription.plan_code,renewal:'true'}
    },orderId);
    await pool.query(
      "UPDATE billing_orders SET provider_payment_id=$2,status='pending',provider_payload=$3::jsonb WHERE id=$1",
      [orderId,payment.id,JSON.stringify({status:payment.status||'pending'})]
    );
    if (payment.status==='succeeded' && payment.id) {
      await confirmProviderPayment(payment.id);
      return 'succeeded';
    }
    if (payment.status==='canceled' || payment.status==='failed') {
      await pool.query("UPDATE billing_orders SET status='failed' WHERE id=$1",[orderId]);
      return 'failed';
    }
    return 'pending';
  } catch(error) {
    await pool.query("UPDATE billing_orders SET status='failed' WHERE id=$1",[orderId]).catch(()=>{});
    console.error('Subscription renewal failed:',error.message);
    return 'failed';
  }
}
router.post('/cron/renewals',requireDatabase,async(req,res)=>{
  if (!safeSecretEqual(req.get('x-cron-secret'),process.env.BILLING_CRON_SECRET)) {
    return res.status(401).json({error:'Недействительный ключ планировщика.'});
  }
  if (!paymentsReady()) return res.status(503).json({error:'Приём платежей не настроен.'});
  const client=await pool.connect();
  let due=[];
  try {
    await client.query('BEGIN');
    const claimed=await client.query(
      "SELECT user_id,plan_code,payment_method_id FROM user_subscriptions " +
      "WHERE status='active' AND auto_renew=TRUE AND payment_method_id IS NOT NULL " +
      "AND current_period_end<=NOW()+INTERVAL '6 hours' AND renewal_attempts<3 " +
      "AND (last_renewal_attempt_at IS NULL OR last_renewal_attempt_at<NOW()-INTERVAL '20 hours') " +
      "ORDER BY current_period_end LIMIT 40 FOR UPDATE SKIP LOCKED"
    );
    due=claimed.rows;
    if (due.length) {
      await client.query(
        "UPDATE user_subscriptions SET last_renewal_attempt_at=NOW(),renewal_attempts=renewal_attempts+1,updated_at=NOW() " +
        "WHERE user_id=ANY($1::uuid[])",
        [due.map(item=>item.user_id)]
      );
    }
    await client.query('COMMIT');
  } catch(error) {
    await client.query('ROLLBACK').catch(()=>{});
    return res.status(500).json({error:'Не удалось получить список продлений.'});
  } finally {client.release();}
  const results=[];
  for (const subscription of due) {
    const outcome=await createRenewalCharge(subscription);
    if (outcome==='failed' && subscription.renewal_attempts>=2) {
      await pool.query(
        "UPDATE user_subscriptions SET auto_renew=FALSE,cancel_at_period_end=TRUE,next_renewal_at=NULL,updated_at=NOW() WHERE user_id=$1",
        [subscription.user_id]
      );
    }
    results.push({outcome});
  }
  res.json({processed:results.length,results});
});
export default router;
