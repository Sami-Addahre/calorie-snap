CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  piano TEXT NOT NULL DEFAULT 'free' CHECK (piano IN ('free', 'pro', 'ristorante')),
  analisi_oggi INTEGER NOT NULL DEFAULT 0,
  reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  stripe_customer_id text,
  subscription_end timestamptz,
  stripe_product_id text,
  target_kcal integer NOT NULL DEFAULT 2000,
  target_ml integer NOT NULL DEFAULT 2000,
  sesso TEXT CHECK (sesso IN ('uomo','donna')),
  eta INTEGER,
  altezza_cm INTEGER,
  peso_kg NUMERIC,
  peso_target_kg NUMERIC,
  stile_vita TEXT CHECK (stile_vita IN ('sedentario','leggero','moderato','attivo')),
  obiettivo TEXT CHECK (obiettivo IN ('perdere','mantenere','aumentare')),
  target_proteine_g INTEGER NOT NULL DEFAULT 150,
  target_carbo_g INTEGER NOT NULL DEFAULT 250,
  target_grassi_g INTEGER NOT NULL DEFAULT 60,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  coach_msg_oggi INTEGER NOT NULL DEFAULT 0,
  coach_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_user_id_idx ON public.profiles(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own profile" ON public.profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.analisi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  immagine_url TEXT,
  risultato_json JSONB NOT NULL DEFAULT '{}',
  pasto text,
  kcal numeric,
  consumed_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX analisi_user_id_idx ON public.analisi(user_id);
CREATE INDEX analisi_user_consumed_idx ON public.analisi(user_id, consumed_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analisi TO authenticated;
GRANT ALL ON public.analisi TO service_role;
ALTER TABLE public.analisi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own analisi" ON public.analisi
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.guest_usage (
  ip_hash TEXT NOT NULL,
  usage_date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ip_hash, usage_date)
);
GRANT ALL ON public.guest_usage TO service_role;
ALTER TABLE public.guest_usage ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_guest_usage_date ON public.guest_usage(usage_date);

CREATE TABLE public.idratazione (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  ml integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.idratazione TO authenticated;
GRANT ALL ON public.idratazione TO service_role;
ALTER TABLE public.idratazione ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own idratazione" ON public.idratazione FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idratazione_user_data_idx ON public.idratazione(user_id, data);

CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.create_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, piano, analisi_oggi, reset_date)
  VALUES (NEW.id, 'free', 0, CURRENT_DATE)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER create_profile_after_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.create_profile_on_signup();

ALTER PUBLICATION supabase_realtime ADD TABLE public.analisi;