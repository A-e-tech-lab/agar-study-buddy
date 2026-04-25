import { supabase } from "@/integrations/supabase/client";

export type FocusSession = {
  id: string;
  durationMinutes: number;
  endedAt: string;
};

export async function logFocusSession(userId: string, durationMinutes: number) {
  const { data, error } = await supabase
    .from("focus_sessions")
    .insert({ user_id: userId, duration_minutes: durationMinutes })
    .select("id, duration_minutes, ended_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    durationMinutes: data.duration_minutes,
    endedAt: data.ended_at,
  } as FocusSession;
}

export async function fetchFocusSessions(userId: string, sinceISO?: string): Promise<FocusSession[]> {
  let q = supabase
    .from("focus_sessions")
    .select("id, duration_minutes, ended_at")
    .eq("user_id", userId)
    .order("ended_at", { ascending: false })
    .limit(100);
  if (sinceISO) q = q.gte("ended_at", sinceISO);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    durationMinutes: r.duration_minutes,
    endedAt: r.ended_at,
  }));
}

export function totalMinutesToday(sessions: FocusSession[]) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return sessions
    .filter((s) => new Date(s.endedAt) >= start)
    .reduce((acc, s) => acc + s.durationMinutes, 0);
}
