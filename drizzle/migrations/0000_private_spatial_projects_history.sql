CREATE TABLE public.spatial_projects (
 id text PRIMARY KEY,
 user_id uuid NOT NULL DEFAULT auth.uid(),
 title text NOT NULL,
 scene jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 revision integer NOT NULL DEFAULT 1
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spatial_projects TO authenticated;
GRANT ALL ON public.spatial_projects TO service_role;
ALTER TABLE public.spatial_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY projects_select_own ON public.spatial_projects FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY projects_insert_own ON public.spatial_projects FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY projects_update_own ON public.spatial_projects FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY projects_delete_own ON public.spatial_projects FOR DELETE TO authenticated USING (user_id = (select auth.uid()));
CREATE INDEX spatial_projects_owner_updated ON public.spatial_projects(user_id, updated_at DESC);
CREATE TABLE public.spatial_revisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id text NOT NULL REFERENCES public.spatial_projects(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 revision integer NOT NULL,
 scene jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(project_id, revision)
);
GRANT SELECT ON public.spatial_revisions TO authenticated;
GRANT ALL ON public.spatial_revisions TO service_role;
ALTER TABLE public.spatial_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY revisions_select_own ON public.spatial_revisions FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE INDEX spatial_revisions_owner_project ON public.spatial_revisions(user_id, project_id, revision DESC);
CREATE FUNCTION public.prepare_spatial_save() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_OP = 'UPDATE' THEN
  NEW.user_id := OLD.user_id;
  NEW.revision := OLD.revision + 1;
 ELSE
  NEW.revision := 1;
 END IF;
 NEW.updated_at := now();
 RETURN NEW;
END;
$$;
CREATE TRIGGER prepare_spatial_save BEFORE INSERT OR UPDATE ON public.spatial_projects FOR EACH ROW EXECUTE FUNCTION public.prepare_spatial_save();
CREATE FUNCTION public.record_spatial_revision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.spatial_revisions(project_id, user_id, revision, scene) VALUES (NEW.id, NEW.user_id, NEW.revision, NEW.scene);
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_spatial_revision() FROM PUBLIC;
CREATE TRIGGER record_spatial_revision AFTER INSERT OR UPDATE ON public.spatial_projects FOR EACH ROW EXECUTE FUNCTION public.record_spatial_revision();