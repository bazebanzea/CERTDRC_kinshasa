-- Roles enum
CREATE TYPE public.app_role AS ENUM ('citizen', 'analyst', 'admin', 'authority');

-- Incident type enum
CREATE TYPE public.incident_type AS ENUM ('phishing', 'fraude', 'malware', 'attaque_reseau', 'fuite_donnees', 'piratage');

-- Incident severity enum
CREATE TYPE public.incident_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Incident status enum
CREATE TYPE public.incident_status AS ENUM ('reported', 'under_analysis', 'confirmed', 'resolved', 'rejected');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  organization TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'citizen',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Incidents table
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_analyst_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type incident_type NOT NULL,
  severity incident_severity NOT NULL DEFAULT 'medium',
  status incident_status NOT NULL DEFAULT 'reported',
  location TEXT,
  region TEXT,
  proof_file_url TEXT,
  analyst_notes TEXT,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Incident logs / audit trail
CREATE TABLE public.incident_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.incident_logs ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_incidents_reporter ON public.incidents(reporter_id);
CREATE INDEX idx_incidents_status ON public.incidents(status);
CREATE INDEX idx_incidents_type ON public.incidents(type);
CREATE INDEX idx_incidents_severity ON public.incidents(severity);
CREATE INDEX idx_incidents_reported_at ON public.incidents(reported_at);
CREATE INDEX idx_incidents_region ON public.incidents(region);
CREATE INDEX idx_incident_logs_incident ON public.incident_logs(incident_id);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile and assign citizen role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'citizen');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Profiles
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Incidents
CREATE POLICY "Citizens can view own incidents"
  ON public.incidents FOR SELECT TO authenticated
  USING (
    auth.uid() = reporter_id
    OR public.has_role(auth.uid(), 'analyst')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'authority')
  );
CREATE POLICY "Authenticated users can create incidents"
  ON public.incidents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Analysts and admins can update incidents"
  ON public.incidents FOR UPDATE TO authenticated
  USING (
    auth.uid() = reporter_id
    OR public.has_role(auth.uid(), 'analyst')
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Admins can delete incidents"
  ON public.incidents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Incident logs
CREATE POLICY "Staff can view incident logs"
  ON public.incident_logs FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'analyst')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'authority')
  );
CREATE POLICY "Authenticated users can create logs"
  ON public.incident_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Storage bucket for proof files
INSERT INTO storage.buckets (id, name, public) VALUES ('proof-files', 'proof-files', false);

CREATE POLICY "Users can upload proof files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'proof-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own proof files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'proof-files' AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'analyst')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'authority')
    )
  );