import { pool } from './db.js';

export async function hasActivePremium(userId) {
  if (!pool || !userId) return false;
  const result = await pool.query(
    "SELECT 1 FROM user_subscriptions WHERE user_id=$1 AND status='active' AND current_period_end>NOW() LIMIT 1",
    [userId]
  );
  return Boolean(result.rowCount);
}

export async function consumeMonthlyQuota(userId, featureKey, freeLimit, premiumLimit) {
  if (!pool || !userId) return { allowed:false, used:0, limit:0, premium:false };
  const premium = await hasActivePremium(userId);
  const limit = premium ? premiumLimit : freeLimit;
  const result = await pool.query(
    "INSERT INTO subscription_usage (user_id,feature_key,month_start,used) " +
    "VALUES ($1,$2,date_trunc('month',NOW())::date,1) " +
    "ON CONFLICT (user_id,feature_key,month_start) " +
    "DO UPDATE SET used=subscription_usage.used+1,updated_at=NOW() " +
    "WHERE subscription_usage.used < $3 RETURNING used",
    [userId,featureKey,limit]
  );
  if (!result.rowCount) {
    const current = await pool.query(
      "SELECT used FROM subscription_usage WHERE user_id=$1 AND feature_key=$2 AND month_start=date_trunc('month',NOW())::date",
      [userId,featureKey]
    );
    return { allowed:false, used:Number(current.rows[0]?.used || 0), limit, premium };
  }
  return { allowed:true, used:Number(result.rows[0].used), limit, premium };
}
