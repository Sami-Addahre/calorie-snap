CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.create_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, piano, analisi_oggi, reset_date)
  VALUES (NEW.id, 'free', 0, CURRENT_DATE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS create_profile_after_signup ON auth.users;
CREATE TRIGGER create_profile_after_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.create_profile_on_signup();

DROP FUNCTION IF EXISTS public.create_profile_on_signup();