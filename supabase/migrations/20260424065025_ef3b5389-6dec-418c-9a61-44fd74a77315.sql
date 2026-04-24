
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'chart-1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subjects"
  ON public.subjects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subjects"
  ON public.subjects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subjects"
  ON public.subjects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own subjects"
  ON public.subjects FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_subjects_user_id ON public.subjects(user_id);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  task_time TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tasks"
  ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tasks"
  ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tasks"
  ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tasks"
  ON public.tasks FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_tasks_user_date ON public.tasks(user_id, task_date);

-- Streaks table
CREATE TABLE public.streaks (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  count INTEGER NOT NULL DEFAULT 0,
  last_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own streak"
  ON public.streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own streak"
  ON public.streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own streak"
  ON public.streaks FOR UPDATE USING (auth.uid() = user_id);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + default subjects on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
