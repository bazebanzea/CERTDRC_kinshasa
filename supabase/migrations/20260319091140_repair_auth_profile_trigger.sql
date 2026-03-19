-- Repair signup trigger and backfill profiles/roles for existing auth users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = CASE
      WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' THEN EXCLUDED.full_name
      ELSE public.profiles.full_name
    END,
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'citizen')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (user_id, email, full_name)
SELECT
  u.id,
  COALESCE(u.email, ''),
  COALESCE(u.raw_user_meta_data->>'full_name', '')
FROM auth.users u
ON CONFLICT (user_id) DO UPDATE
SET
  email = EXCLUDED.email,
  full_name = CASE
    WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' THEN EXCLUDED.full_name
    ELSE public.profiles.full_name
  END,
  updated_at = now();

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'citizen'::public.app_role
FROM auth.users u
ON CONFLICT (user_id, role) DO NOTHING;
