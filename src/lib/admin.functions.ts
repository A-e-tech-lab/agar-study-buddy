import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden: admin only");
}

export const checkIsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { isAdmin: !!data };
  });

export const listAdminUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw new Error(error.message);
    const { data: profiles } = await supabaseAdmin.from("profiles").select("user_id, display_name");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const names = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name]));
    const admins = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    const now = Date.now();
    return data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      name: names.get(u.id) ?? null,
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at ?? null,
      verified: !!u.email_confirmed_at,
      banned: !!(u as any).banned_until && new Date((u as any).banned_until).getTime() > now,
      isAdmin: admins.has(u.id),
    }));
  });

export const setUserBan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; ban: boolean }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("You can't ban yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.ban ? "876000h" : "none",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listUploadedFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("memories")
      .select("id, user_id, caption, storage_path, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const { data: profiles } = await supabaseAdmin.from("profiles").select("user_id, display_name");
    const names = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name]));
    const paths = (rows ?? []).map((r) => r.storage_path);
    const { data: signed } = paths.length
      ? await supabaseAdmin.storage.from("memory-photos").createSignedUrls(paths, 3600)
      : { data: [] as { signedUrl: string }[] };
    return (rows ?? []).map((r, i) => ({
      id: r.id,
      owner: names.get(r.user_id) ?? r.user_id.slice(0, 8),
      caption: r.caption,
      path: r.storage_path,
      createdAt: r.created_at,
      url: signed?.[i]?.signedUrl ?? null,
    }));
  });
