ALTER TABLE billing_orders DROP CONSTRAINT IF EXISTS billing_orders_plan_code_check;
ALTER TABLE billing_orders
  ADD CONSTRAINT billing_orders_plan_code_check
  CHECK (plan_code IN ('premium_monthly','premium_quarterly','premium_yearly'));

ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_plan_code_check;
ALTER TABLE user_subscriptions
  ADD CONSTRAINT user_subscriptions_plan_code_check
  CHECK (plan_code IN ('premium_monthly','premium_quarterly','premium_yearly'));

ALTER TABLE subscription_guardian_approvals DROP CONSTRAINT IF EXISTS subscription_guardian_approvals_plan_code_check;
ALTER TABLE subscription_guardian_approvals
  ADD CONSTRAINT subscription_guardian_approvals_plan_code_check
  CHECK (plan_code IN ('premium_monthly','premium_quarterly','premium_yearly'));
