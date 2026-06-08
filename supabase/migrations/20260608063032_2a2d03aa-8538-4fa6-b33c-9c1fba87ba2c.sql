CREATE TABLE public.guest_usage (
  ip_hash TEXT NOT NULL,
  usage_date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ip_hash, usage_date)
);
GRANT ALL ON public.guest_usage TO service_role;
ALTER TABLE public.guest_usage ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role accesses this table.
CREATE INDEX idx_guest_usage_date ON public.guest_usage(usage_date);