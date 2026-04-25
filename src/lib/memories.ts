import { supabase } from "@/integrations/supabase/client";

export type Memory = {
  id: string;
  caption: string | null;
  storagePath: string;
  createdAt: string;
  signedUrl?: string;
};

const BUCKET = "memory-photos";

async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------- Lock ----------
export async function hasMemoryLock(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("memory_locks")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function setMemoryLock(userId: string, password: string) {
  const password_hash = await sha256Hex(password);
  const { error } = await supabase
    .from("memory_locks")
    .upsert({ user_id: userId, password_hash }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function checkMemoryLock(userId: string, password: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("memory_locks")
    .select("password_hash")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return false;
  const h = await sha256Hex(password);
  return data.password_hash === h;
}

// ---------- Memories ----------
export async function fetchMemories(userId: string): Promise<Memory[]> {
  const { data, error } = await supabase
    .from("memories")
    .select("id, caption, storage_path, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows: Memory[] = (data ?? []).map((r) => ({
    id: r.id,
    caption: r.caption ?? null,
    storagePath: r.storage_path,
    createdAt: r.created_at,
  }));

  // Generate signed URLs in parallel
  await Promise.all(
    rows.map(async (m) => {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(m.storagePath, 60 * 60);
      m.signedUrl = signed?.signedUrl;
    })
  );

  return rows;
}

export async function uploadMemory(
  userId: string,
  file: File,
  caption: string
): Promise<Memory> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("memories")
    .insert({ user_id: userId, caption: caption || null, storage_path: path })
    .select("id, caption, storage_path, created_at")
    .single();
  if (error) throw error;

  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return {
    id: data.id,
    caption: data.caption ?? null,
    storagePath: data.storage_path,
    createdAt: data.created_at,
    signedUrl: signed?.signedUrl,
  };
}

export async function deleteMemory(memory: Memory) {
  await supabase.storage.from(BUCKET).remove([memory.storagePath]);
  const { error } = await supabase.from("memories").delete().eq("id", memory.id);
  if (error) throw error;
}
