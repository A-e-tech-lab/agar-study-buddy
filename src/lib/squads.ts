import { supabase } from "@/integrations/supabase/client";

export type StudyGroup = {
  id: string;
  name: string;
  ownerId: string;
  inviteToken: string;
  createdAt: string;
};

export type GroupMember = {
  userId: string;
  displayName: string;
  role: "owner" | "member";
  status: "studying" | "break" | "offline";
  statusUpdatedAt: string | null;
  tasksThisWeek: number;
  focusMinutesThisWeek: number;
  points: number; // 1 per task + 1 per 10 focus min
};

export type PresenceStatus = "studying" | "break" | "offline";

function genToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function weekStartKeyISO() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekStartTaskKey() {
  const d = weekStartKeyISO();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------- Groups ----------
export async function fetchMyGroups(userId: string): Promise<StudyGroup[]> {
  const { data: memberRows, error: mErr } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId);
  if (mErr) throw mErr;
  const ids = (memberRows ?? []).map((r) => r.group_id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("study_groups")
    .select("id, name, owner_id, invite_token, created_at")
    .in("id", ids)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    ownerId: g.owner_id,
    inviteToken: g.invite_token,
    createdAt: g.created_at,
  }));
}

export async function createGroup(userId: string, name: string): Promise<StudyGroup> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name required");
  // try a few tokens to avoid rare collision
  let lastErr: unknown = null;
  for (let i = 0; i < 5; i++) {
    const token = genToken();
    const { data, error } = await supabase
      .from("study_groups")
      .insert({ name: trimmed, owner_id: userId, invite_token: token })
      .select("id, name, owner_id, invite_token, created_at")
      .single();
    if (!error && data) {
      return {
        id: data.id,
        name: data.name,
        ownerId: data.owner_id,
        inviteToken: data.invite_token,
        createdAt: data.created_at,
      };
    }
    lastErr = error;
    if (error?.code !== "23505") break;
  }
  throw lastErr ?? new Error("Failed to create group");
}

export async function fetchGroupByToken(token: string): Promise<StudyGroup | null> {
  const { data, error } = await supabase
    .from("study_groups")
    .select("id, name, owner_id, invite_token, created_at")
    .eq("invite_token", token.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    ownerId: data.owner_id,
    inviteToken: data.invite_token,
    createdAt: data.created_at,
  };
}

export async function fetchGroup(id: string): Promise<StudyGroup | null> {
  const { data, error } = await supabase
    .from("study_groups")
    .select("id, name, owner_id, invite_token, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    ownerId: data.owner_id,
    inviteToken: data.invite_token,
    createdAt: data.created_at,
  };
}

export async function joinGroup(userId: string, groupId: string): Promise<void> {
  const { error } = await supabase
    .from("group_members")
    .insert({ group_id: groupId, user_id: userId, role: "member" });
  if (error && error.code !== "23505") throw error;
}

export async function leaveGroup(userId: string, groupId: string): Promise<void> {
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from("study_groups").delete().eq("id", groupId);
  if (error) throw error;
}

// ---------- Members + leaderboard ----------
export async function fetchMembersWithStats(groupId: string): Promise<GroupMember[]> {
  const { data: memRows, error } = await supabase
    .from("group_members")
    .select("user_id, role")
    .eq("group_id", groupId);
  if (error) throw error;

  const userIds = (memRows ?? []).map((m) => m.user_id);
  if (userIds.length === 0) return [];

  const [{ data: profiles }, { data: presence }, { data: tasks }, { data: focus }] = await Promise.all([
    supabase.from("profiles").select("user_id, display_name").in("user_id", userIds),
    supabase.from("user_presence").select("user_id, status, updated_at").in("user_id", userIds),
    supabase
      .from("tasks")
      .select("user_id")
      .eq("completed", true)
      .gte("task_date", weekStartTaskKey())
      .in("user_id", userIds),
    supabase
      .from("focus_sessions")
      .select("user_id, duration_minutes")
      .gte("ended_at", weekStartKeyISO().toISOString())
      .in("user_id", userIds),
  ]);

  const nameOf = new Map<string, string>();
  (profiles ?? []).forEach((p: any) => nameOf.set(p.user_id, p.display_name ?? "Friend"));
  const presenceOf = new Map<string, { status: PresenceStatus; updatedAt: string }>();
  (presence ?? []).forEach((p: any) =>
    presenceOf.set(p.user_id, { status: p.status as PresenceStatus, updatedAt: p.updated_at })
  );
  const taskCount = new Map<string, number>();
  (tasks ?? []).forEach((t: any) => taskCount.set(t.user_id, (taskCount.get(t.user_id) ?? 0) + 1));
  const focusMin = new Map<string, number>();
  (focus ?? []).forEach((f: any) =>
    focusMin.set(f.user_id, (focusMin.get(f.user_id) ?? 0) + (f.duration_minutes ?? 0))
  );

  const rows: GroupMember[] = (memRows ?? []).map((m: any) => {
    const tasksW = taskCount.get(m.user_id) ?? 0;
    const minutesW = focusMin.get(m.user_id) ?? 0;
    const p = presenceOf.get(m.user_id);
    // stale if updated > 5 min ago and status is "studying" -> treat as offline
    let status: PresenceStatus = p?.status ?? "offline";
    if (p && status !== "offline") {
      const ageMs = Date.now() - new Date(p.updatedAt).getTime();
      if (ageMs > 5 * 60_000) status = "offline";
    }
    return {
      userId: m.user_id,
      displayName: nameOf.get(m.user_id) ?? "Friend",
      role: m.role as "owner" | "member",
      status,
      statusUpdatedAt: p?.updatedAt ?? null,
      tasksThisWeek: tasksW,
      focusMinutesThisWeek: minutesW,
      points: tasksW + Math.floor(minutesW / 10),
    };
  });

  rows.sort((a, b) => b.points - a.points);
  return rows;
}

// ---------- Presence ----------
export async function setPresence(userId: string, status: PresenceStatus): Promise<void> {
  const { error } = await supabase
    .from("user_presence")
    .upsert(
      { user_id: userId, status, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) throw error;
}

export async function fetchPresence(userId: string): Promise<PresenceStatus> {
  const { data, error } = await supabase
    .from("user_presence")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.status as PresenceStatus) ?? "offline";
}
