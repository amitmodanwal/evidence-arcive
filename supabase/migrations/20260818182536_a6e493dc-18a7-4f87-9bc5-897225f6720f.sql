-- Roles
CREATE TYPE public.app_role AS ENUM ('admin','investigator','viewer');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_authorized(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.can_edit(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','investigator'));
$$;

CREATE POLICY "profiles readable by authorized" ON public.profiles FOR SELECT TO authenticated USING (public.is_authorized(auth.uid()) OR id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "roles readable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- New user bootstrap
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE first_user boolean;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO first_user;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN first_user THEN 'admin'::public.app_role ELSE 'investigator'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Cases
CREATE TABLE public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  opened_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  latitude double precision,
  longitude double precision,
  occurred_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.suspects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact text,
  reference_no text,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.victims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact text,
  reference_no text,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.witnesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact text,
  reference_no text,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.witness_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  witness_id uuid REFERENCES public.witnesses(id) ON DELETE CASCADE,
  statement text NOT NULL,
  statement_date timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  registration_number text NOT NULL,
  vehicle_type text,
  make_model text,
  color text,
  owner_reference text,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'document',
  source text,
  occurred_at timestamptz,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  suspect_id uuid REFERENCES public.suspects(id) ON DELETE SET NULL,
  victim_id uuid REFERENCES public.victims(id) ON DELETE SET NULL,
  witness_id uuid REFERENCES public.witnesses(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  verification_status text NOT NULL DEFAULT 'pending',
  legally_obtained boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.evidence_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id uuid NOT NULL REFERENCES public.evidence(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT 'note',
  title text NOT NULL,
  description text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  evidence_id uuid REFERENCES public.evidence(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Grants + RLS for case data
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['cases','locations','suspects','victims','witnesses','witness_statements','vehicles','evidence','evidence_files','case_events']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('CREATE POLICY "authorized read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.is_authorized(auth.uid()));', t);
    EXECUTE format('CREATE POLICY "editors insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));', t);
    EXECUTE format('CREATE POLICY "editors update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));', t);
    EXECUTE format('CREATE POLICY "admins delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.has_role(auth.uid(),''admin''));', t);
  END LOOP;
END $$;

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authorized read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY "authorized insert audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_authorized(auth.uid()) AND user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER cases_touch BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER evidence_touch BEFORE UPDATE ON public.evidence FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_evidence_case ON public.evidence(case_id);
CREATE INDEX idx_evidence_files_evidence ON public.evidence_files(evidence_id);
CREATE INDEX idx_case_events_case ON public.case_events(case_id, occurred_at);
CREATE INDEX idx_audit_case ON public.audit_logs(case_id, created_at DESC);