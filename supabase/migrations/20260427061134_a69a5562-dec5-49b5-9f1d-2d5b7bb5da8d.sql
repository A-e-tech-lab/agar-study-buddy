-- Study groups
CREATE TABLE public.study_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  invite_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX idx_group_members_user ON public.group_members(user_id);
CREATE INDEX idx_group_members_group ON public.group_members(group_id);

-- Presence
CREATE TABLE public.user_presence (
  user_id UUID NOT NULL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'offline',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helpers (security definer to avoid recursive RLS on group_members)
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.shared_group_user_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT gm2.user_id
  FROM public.group_members gm1
  JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
  WHERE gm1.user_id = _user_id;
$$;

-- Token generator
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..10 LOOP
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Auto-add owner as member
CREATE OR REPLACE FUNCTION public.add_group_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_add_group_owner_as_member
AFTER INSERT ON public.study_groups
FOR EACH ROW EXECUTE FUNCTION public.add_group_owner_as_member();

CREATE TRIGGER trg_study_groups_updated
BEFORE UPDATE ON public.study_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- study_groups policies
CREATE POLICY "members can view their groups"
  ON public.study_groups FOR SELECT
  TO authenticated
  USING (public.is_group_member(id, auth.uid()));

CREATE POLICY "anyone authed can lookup by token"
  ON public.study_groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authed can create groups they own"
  ON public.study_groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner can update group"
  ON public.study_groups FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "owner can delete group"
  ON public.study_groups FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- group_members policies
CREATE POLICY "view members of my groups"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "join group as self"
  ON public.group_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "leave group as self"
  ON public.group_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- user_presence policies
CREATE POLICY "view presence of users in shared groups"
  ON public.user_presence FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (SELECT public.shared_group_user_ids(auth.uid()))
  );

CREATE POLICY "upsert own presence (insert)"
  ON public.user_presence FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "upsert own presence (update)"
  ON public.user_presence FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow authed users to read profile names of users in their shared groups
-- (needed for member lists / leaderboards)
CREATE POLICY "view profiles of users in shared groups"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (SELECT public.shared_group_user_ids(auth.uid()))
  );

-- Allow authed users to see tasks/focus rows of users in their shared groups (read-only),
-- so we can compute leaderboard client-side.
CREATE POLICY "view tasks of users in shared groups"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (SELECT public.shared_group_user_ids(auth.uid()))
  );

CREATE POLICY "view focus_sessions of users in shared groups"
  ON public.focus_sessions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (SELECT public.shared_group_user_ids(auth.uid()))
  );