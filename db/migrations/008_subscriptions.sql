CREATE TABLE IF NOT EXISTS billing_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL CHECK (plan_code IN ('premium_monthly','premium_yearly')),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL DEFAULT 'RUB' CHECK (currency = 'RUB'),
  provider_payment_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'creating'
    CHECK (status IN ('creating','pending','succeeded','canceled','failed')),
  checkout_url TEXT,
  auto_renew_requested BOOLEAN NOT NULL DEFAULT FALSE,
  payment_method_id TEXT,
  guardian_approval_id UUID,
  provider_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS billing_orders_user_created_idx
  ON billing_orders(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL CHECK (plan_code IN ('premium_monthly','premium_yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','past_due','canceled')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  payment_method_id TEXT,
  last_order_id UUID REFERENCES billing_orders(id) ON DELETE SET NULL,
  last_renewal_attempt_at TIMESTAMPTZ,
  next_renewal_at TIMESTAMPTZ,
  renewal_attempts SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (current_period_end > current_period_start)
);
CREATE INDEX IF NOT EXISTS user_subscriptions_renewal_idx
  ON user_subscriptions(auto_renew,next_renewal_at)
  WHERE auto_renew = TRUE;

CREATE TABLE IF NOT EXISTS subscription_guardian_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guardian_email TEXT NOT NULL,
  plan_code TEXT NOT NULL CHECK (plan_code IN ('premium_monthly','premium_yearly')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  approved_at TIMESTAMPTZ,
  auto_renew_consent BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS subscription_guardian_user_idx
  ON subscription_guardian_approvals(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS subscription_usage (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  month_start DATE NOT NULL,
  used INTEGER NOT NULL DEFAULT 0 CHECK (used >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(user_id,feature_key,month_start)
);
CREATE INDEX IF NOT EXISTS subscription_usage_month_idx
  ON subscription_usage(user_id,month_start);
