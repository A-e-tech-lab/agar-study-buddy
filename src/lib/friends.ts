import { supabase } from "@/integrations/supabase/client";

export type FriendCode = { userId: string; code: string };

export type FriendRow = {
  friendUserId: string;
  displayName: string;
  status: "pending" | "accepted";
  direction: "incoming" | "outgoing" | "self";
  friendshipId: string;
  tasksThisWeek: number;
};

export async function fetchMyCode(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("friend_codes")
    .select("code")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.code ?? null;
}

export async function ensureMyCode(userId: string): Promise<string> {
  const existing = await fetchMyCode(userId);
  if (existing) return existing;
  // Generate a fallback unique-ish code client-side; DB trigger normally handles this.
  const code = Math.random().toString(36).slice(2, 10).toUpperCase();
  const { data, error } = await supabase
    .from("friend_codes")
    .insert({ user_id: userId, code })
    .select("code")
    .single();
  if (error) throw error;
  return data.code;
}

export async function sendFriendRequestByCode(myUserId: string, code: string): Promise<void> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) throw new Error("Enter a code");

  const { data: target, error: lookupErr } = await supabase
    .from("friend_codes")
    .select("user_id")
    .eq("code", trimmed)
    .maybeSingle();
  if (lookupErr) throw lookupErr;
  if (!target) throw new Error("No friend with that code");
  if (target.user_id === myUserId) throw new Error("That's your own code 😅");

  const { error } = await supabase.from("friendships").insert({
    requester_id: myUserId,
    addressee_id: target.user_id,
    status: "pending",
  });
  if (error) {
    if (error.code === "23505") throw new Error("Friend request already exists");
    throw error;
  }
}

export async function respondToRequest(friendshipId: string, accept: boolean) {
  if (accept) {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
    if (error) throw error;
  }
}

export async function removeFriend(friendshipId: string) {
  const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
  if (error) throw error;
}

/** Returns all friendships involving me, with display names and weekly task counts. */
export async function fetchFriendsWithStats(myUserId: string): Promise<FriendRow[]> {
  const { data: rels, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status");
  if (error) throw error;

  const otherIds = new Set<string>();
  (rels ?? []).forEach((r) => {
    otherIds.add(r.requester_id);
    otherIds.add(r.addressee_id);
  });
  otherIds.add(myUserId);

  // Names
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", Array.from(otherIds));
  const nameOf = new Map<string, string>();
  (profiles ?? []).forEach((p) => nameOf.set(p.user_id, p.display_name ?? "Friend"));

  // Weekly task counts (per user, for accepted friends + me)
  const start = new Date();
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  const startKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;

  const counts = new Map<string, number>();
  const acceptedIds: string[] = [myUserId];
  (rels ?? []).forEach((r) => {
    if (r.status === "accepted") {
      const other = r.requester_id === myUserId ? r.addressee_id : r.requester_id;
      acceptedIds.push(other);
    }
  });

  if (acceptedIds.length > 0) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("user_id")
      .eq("completed", true)
      .gte("task_date", startKey)
      .in("user_id", acceptedIds);
    (tasks ?? []).forEach((t: any) => {
      counts.set(t.user_id, (counts.get(t.user_id) ?? 0) + 1);
    });
  }

  const rows: FriendRow[] = [];
  // Always include self in leaderboard
  rows.push({
    friendUserId: myUserId,
    displayName: (nameOf.get(myUserId) ?? "You") + " (you)",
    status: "accepted",
    direction: "self",
    friendshipId: "self",
    tasksThisWeek: counts.get(myUserId) ?? 0,
  });

  (rels ?? []).forEach((r) => {
    const other = r.requester_id === myUserId ? r.addressee_id : r.requester_id;
    rows.push({
      friendUserId: other,
      displayName: nameOf.get(other) ?? "Friend",
      status: r.status as "pending" | "accepted",
      direction: r.requester_id === myUserId ? "outgoing" : "incoming",
      friendshipId: r.id,
      tasksThisWeek: counts.get(other) ?? 0,
    });
  });

  return rows;
}
