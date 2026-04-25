-- ============ Focus sessions ============
CREATE TABLE public.focus_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  ended_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own focus sessions" ON public.focus_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert own focus sessions" ON public.focus_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own focus sessions" ON public.focus_sessions
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_focus_sessions_user_time ON public.focus_sessions (user_id, ended_at DESC);

-- ============ Friend codes ============
CREATE TABLE public.friend_codes (
  user_id UUID NOT NULL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.friend_codes ENABLE ROW LEVEL SECURITY;

-- Any signed-in user can look up codes (to invite). Only the owner can change.
CREATE POLICY "any authed can read friend codes" ON public.friend_codes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert own friend code" ON public.friend_codes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own friend code" ON public.friend_codes
  FOR UPDATE USING (auth.uid() = user_id);

-- Helper: generate a short readable code (8 chars, no ambiguous chars)
CREATE OR REPLACE FUNCTION public.generate_friend_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Hook: create a friend_code row whenever a new profile/user appears.
-- We extend handle_new_user to also create friend code + memory lock placeholder is unnecessary.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_code TEXT;
  attempts INT := 0;
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );

  INSERT INTO public.subjects (user_id, name, color) VALUES
    (NEW.id, 'Maths', 'chart-1'),
    (NEW.id, 'Physics', 'chart-2'),
    (NEW.id, 'Chemistry', 'chart-3');

  INSERT INTO public.streaks (user_id, count, last_date)
  VALUES (NEW.id, 0, NULL);

  -- Generate a unique friend code
  LOOP
    new_code := public.generate_friend_code();
    BEGIN
      INSERT INTO public.friend_codes (user_id, code) VALUES (NEW.id, new_code);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      attempts := attempts + 1;
      IF attempts > 5 THEN RAISE; END IF;
    END;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Backfill friend codes for existing users
INSERT INTO public.friend_codes (user_id, code)
SELECT p.user_id, public.generate_friend_code()
FROM public.profiles p
LEFT JOIN public.friend_codes fc ON fc.user_id = p.user_id
WHERE fc.user_id IS NULL;

-- ============ Friendships ============
CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted');

CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  addressee_id UUID NOT NULL,
  status public.friendship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (requester_id <> addressee_id),
  UNIQUE (requester_id, addressee_id)
);
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view friendships involving me" ON public.friendships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "request friendship" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "update friendships involving me" ON public.friendships
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "delete friendships involving me" ON public.friendships
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_friendships_requester ON public.friendships (requester_id, status);
CREATE INDEX idx_friendships_addressee ON public.friendships (addressee_id, status);

-- ============ Memories ============
CREATE TABLE public.memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  caption TEXT,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own memories" ON public.memories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert own memories" ON public.memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own memories" ON public.memories
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete own memories" ON public.memories
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_memories_user_time ON public.memories (user_id, created_at DESC);

-- ============ Memory lock (single password per user) ============
CREATE TABLE public.memory_locks (
  user_id UUID NOT NULL PRIMARY KEY,
  password_hash TEXT NOT NULL,            -- client-hashed (sha-256 hex)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.memory_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own memory lock" ON public.memory_locks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert own memory lock" ON public.memory_locks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own memory lock" ON public.memory_locks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete own memory lock" ON public.memory_locks
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_memory_locks_updated_at
  BEFORE UPDATE ON public.memory_locks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Storage bucket for memory photos (private) ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('memory-photos', 'memory-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Files are stored at "<user_id>/<filename>"
CREATE POLICY "users read own memory photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'memory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users upload own memory photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'memory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users update own memory photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'memory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users delete own memory photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'memory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
