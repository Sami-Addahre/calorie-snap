
-- Trigger per creare automaticamente un profilo al signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, piano, analisi_oggi, reset_date)
  VALUES (NEW.id, 'free', 0, CURRENT_DATE)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: crea profili per utenti esistenti senza profilo
INSERT INTO public.profiles (user_id, piano, analisi_oggi, reset_date)
SELECT u.id, 'free', 0, CURRENT_DATE
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL;
