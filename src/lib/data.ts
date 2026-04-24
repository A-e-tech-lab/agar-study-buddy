import { supabase } from "@/integrations/supabase/client";

export type Subject = {
  id: string;
  name: string;
  color: string;
};

export type Task = {
  id: string;
  title: string;
  subjectId: string | null;
  time?: string;
  completed: boolean;
  date: string;
  createdAt: number;
};

export const todayKey = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// ---------- Subjects ----------
export async function fetchSubjects(userId: string): Promise<Subject[]> {
  const { data, error } = await supabase
    .from("subjects")
    .select("id, name, color")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createSubject(
  userId: string,
  name: string,
  color: string
): Promise<Subject> {
  const { data, error } = await supabase
    .from("subjects")
    .insert({ user_id: userId, name, color })
    .select("id, name, color")
    .single();
  if (error) throw error;
  return data;
}

// ---------- Tasks ----------
export async function fetchTodaysTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, subject_id, task_time, completed, task_date, created_at")
    .eq("user_id", userId)
    .eq("task_date", todayKey())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    subjectId: t.subject_id,
    time: t.task_time ?? undefined,
    completed: t.completed,
    date: t.task_date,
    createdAt: new Date(t.created_at).getTime(),
  }));
}

export async function createTask(
  userId: string,
  input: { title: string; subjectId: string; time?: string }
): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      title: input.title,
      subject_id: input.subjectId,
      task_time: input.time ?? null,
      task_date: todayKey(),
    })
    .select("id, title, subject_id, task_time, completed, task_date, created_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    title: data.title,
    subjectId: data.subject_id,
    time: data.task_time ?? undefined,
    completed: data.completed,
    date: data.task_date,
    createdAt: new Date(data.created_at).getTime(),
  };
}

export async function setTaskCompleted(id: string, completed: boolean) {
  const { error } = await supabase.from("tasks").update({ completed }).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Streak ----------
export type Streak = { count: number; lastDate: string | null };

export async function fetchStreak(userId: string): Promise<Streak> {
  const { data, error } = await supabase
    .from("streaks")
    .select("count, last_date")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return { count: data?.count ?? 0, lastDate: data?.last_date ?? null };
}

export async function bumpStreak(userId: string): Promise<Streak> {
  const today = todayKey();
  const current = await fetchStreak(userId);
  if (current.lastDate === today) return current;

  const yesterday = new Date(Date.now() - 86400000);
  const ykey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  const next: Streak = {
    count: current.lastDate === ykey ? current.count + 1 : 1,
    lastDate: today,
  };

  const { error } = await supabase
    .from("streaks")
    .upsert({ user_id: userId, count: next.count, last_date: next.lastDate }, { onConflict: "user_id" });
  if (error) throw error;
  return next;
}
