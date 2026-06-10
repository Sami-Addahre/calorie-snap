
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS subscription_end timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_product_id text;
