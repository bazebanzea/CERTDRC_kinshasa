ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'specialist';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'reader';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cert_validation_state') THEN
    CREATE TYPE public.cert_validation_state AS ENUM ('pending_review', 'needs_information', 'validated', 'mitigated', 'closed');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'advisory_severity') THEN
    CREATE TYPE public.advisory_severity AS ENUM ('informational', 'low', 'medium', 'high', 'critical');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bulletin_status') THEN
    CREATE TYPE public.bulletin_status AS ENUM ('draft', 'review', 'published', 'archived');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'advisory_status') THEN
    CREATE TYPE public.advisory_status AS ENUM ('new', 'tracking', 'mitigated', 'archived');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = ANY(_roles)
  )
$$;

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS affected_systems TEXT,
  ADD COLUMN IF NOT EXISTS expert_summary TEXT,
  ADD COLUMN IF NOT EXISTS remediation_steps TEXT,
  ADD COLUMN IF NOT EXISTS resolution_verification TEXT,
  ADD COLUMN IF NOT EXISTS public_reference TEXT,
  ADD COLUMN IF NOT EXISTS country_context TEXT NOT NULL DEFAULT 'RDC - Kinshasa',
  ADD COLUMN IF NOT EXISTS validation_state public.cert_validation_state NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.incident_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.incident_comments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.vulnerability_advisories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisory_id TEXT,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  severity public.advisory_severity NOT NULL DEFAULT 'medium',
  advisory_status public.advisory_status NOT NULL DEFAULT 'new',
  affected_products TEXT,
  remediation TEXT,
  country_context TEXT NOT NULL DEFAULT 'RDC - Kinshasa',
  standards_notes TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.vulnerability_advisories ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.security_bulletins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  status public.bulletin_status NOT NULL DEFAULT 'draft',
  country_context TEXT NOT NULL DEFAULT 'RDC - Kinshasa',
  bulletin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  iso_alignment TEXT,
  cyber_principles TEXT,
  audit_notes TEXT,
  incident_ids UUID[] NOT NULL DEFAULT '{}',
  advisory_ids UUID[] NOT NULL DEFAULT '{}',
  source_references TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ
);
ALTER TABLE public.security_bulletins ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_incident_comments_incident_id ON public.incident_comments(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_comments_created_at ON public.incident_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vulnerability_advisories_published_at ON public.vulnerability_advisories(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_vulnerability_advisories_status ON public.vulnerability_advisories(advisory_status);
CREATE INDEX IF NOT EXISTS idx_security_bulletins_date ON public.security_bulletins(bulletin_date DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_validation_state ON public.incidents(validation_state);

DROP TRIGGER IF EXISTS update_incident_comments_updated_at ON public.incident_comments;
CREATE TRIGGER update_incident_comments_updated_at
  BEFORE UPDATE ON public.incident_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_vulnerability_advisories_updated_at ON public.vulnerability_advisories;
CREATE TRIGGER update_vulnerability_advisories_updated_at
  BEFORE UPDATE ON public.vulnerability_advisories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_security_bulletins_updated_at ON public.security_bulletins;
CREATE TRIGGER update_security_bulletins_updated_at
  BEFORE UPDATE ON public.security_bulletins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Citizens can view own incidents" ON public.incidents;
DROP POLICY IF EXISTS "Authenticated users can view incidents" ON public.incidents;
CREATE POLICY "Authenticated users can view incidents"
  ON public.incidents FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create incidents" ON public.incidents;
DROP POLICY IF EXISTS "Non readers can create incidents" ON public.incidents;
CREATE POLICY "Non readers can create incidents"
  ON public.incidents FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reporter_id
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role::text = 'reader'
    )
  );

DROP POLICY IF EXISTS "Analysts and admins can update incidents" ON public.incidents;
DROP POLICY IF EXISTS "Reporters and cert staff can update incidents" ON public.incidents;
CREATE POLICY "Reporters and cert staff can update incidents"
  ON public.incidents FOR UPDATE TO authenticated
  USING (
    auth.uid() = reporter_id
    OR public.has_any_role(auth.uid(), ARRAY['analyst','admin','authority','specialist'])
  )
  WITH CHECK (
    auth.uid() = reporter_id
    OR public.has_any_role(auth.uid(), ARRAY['analyst','admin','authority','specialist'])
  );

DROP POLICY IF EXISTS "Staff can view incident logs" ON public.incident_logs;
DROP POLICY IF EXISTS "CERT staff can view incident logs" ON public.incident_logs;
CREATE POLICY "CERT staff can view incident logs"
  ON public.incident_logs FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['analyst','admin','authority','specialist']));

DROP POLICY IF EXISTS "Users can view own proof files" ON storage.objects;
DROP POLICY IF EXISTS "Incident actors can view proof files" ON storage.objects;
CREATE POLICY "Incident actors can view proof files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'proof-files' AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_any_role(auth.uid(), ARRAY['analyst','admin','authority','specialist','reader'])
    )
  );

DROP POLICY IF EXISTS "Authenticated users can read incident comments" ON public.incident_comments;
CREATE POLICY "Authenticated users can read incident comments"
  ON public.incident_comments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Reporters and cert staff can comment incidents" ON public.incident_comments;
CREATE POLICY "Reporters and cert staff can comment incidents"
  ON public.incident_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_id AND i.reporter_id = auth.uid())
      OR public.has_any_role(auth.uid(), ARRAY['analyst','admin','authority','specialist'])
    )
  );
DROP POLICY IF EXISTS "Authors and admins can update incident comments" ON public.incident_comments;
CREATE POLICY "Authors and admins can update incident comments"
  ON public.incident_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Authors and admins can delete incident comments" ON public.incident_comments;
CREATE POLICY "Authors and admins can delete incident comments"
  ON public.incident_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can read advisories" ON public.vulnerability_advisories;
CREATE POLICY "Authenticated users can read advisories"
  ON public.vulnerability_advisories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "CERT staff can manage advisories" ON public.vulnerability_advisories;
CREATE POLICY "CERT staff can manage advisories"
  ON public.vulnerability_advisories FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['analyst','admin','authority','specialist']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['analyst','admin','authority','specialist']));

DROP POLICY IF EXISTS "Authenticated users can read bulletins" ON public.security_bulletins;
CREATE POLICY "Authenticated users can read bulletins"
  ON public.security_bulletins FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "CERT staff can manage bulletins" ON public.security_bulletins;
CREATE POLICY "CERT staff can manage bulletins"
  ON public.security_bulletins FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['analyst','admin','authority','specialist']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['analyst','admin','authority','specialist']));

INSERT INTO public.vulnerability_advisories (
  advisory_id,
  source_name,
  source_url,
  title,
  summary,
  severity,
  advisory_status,
  affected_products,
  remediation,
  country_context,
  standards_notes,
  tags
)
SELECT
  'CERT-FR-SOURCE',
  'CERT-FR',
  'https://www.cert.ssi.gouv.fr',
  'Veille quotidienne des vulnerabilites internationales',
  'Source de reference pour relier les avis, alertes et bulletins de vulnerabilites a la plateforme nationale CERT RDC.',
  'informational',
  'tracking',
  'Systemes d''information critiques, postes de travail, serveurs et applications exposees',
  'Analyser les avis quotidiens, prioriser les correctifs, documenter la mitigation locale et confirmer la resolution avant cloture.',
  'RDC - Kinshasa',
  'Alignement recommande avec ISO 27001, ISO 27002, gestion de crise, journalisation, audit et defense en profondeur.',
  ARRAY['cert-fr', 'veille', 'vulnerabilite', 'rdc']
WHERE NOT EXISTS (
  SELECT 1 FROM public.vulnerability_advisories WHERE advisory_id = 'CERT-FR-SOURCE'
);
