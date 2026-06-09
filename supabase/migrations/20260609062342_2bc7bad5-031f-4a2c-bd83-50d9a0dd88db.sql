
-- analisi: add pasto / kcal / consumed_at
ALTER TABLE public.analisi
  ADD COLUMN IF NOT EXISTS pasto text,
  ADD COLUMN IF NOT EXISTS kcal numeric,
  ADD COLUMN IF NOT EXISTS consumed_at date NOT NULL DEFAULT CURRENT_DATE;

CREATE INDEX IF NOT EXISTS analisi_user_consumed_idx ON public.analisi(user_id, consumed_at);

-- profiles: target goals
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_kcal integer NOT NULL DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS target_ml integer NOT NULL DEFAULT 2000;

-- idratazione table
CREATE TABLE IF NOT EXISTS public.idratazione (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  ml integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.idratazione TO authenticated;
GRANT ALL ON public.idratazione TO service_role;

ALTER TABLE public.idratazione ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own idratazione"
  ON public.idratazione FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idratazione_user_data_idx ON public.idratazione(user_id, data);

-- Realtime publication for analisi counter
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'analisi'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.analisi;
  END IF;
END $$;
