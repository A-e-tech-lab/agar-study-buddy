import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Loader2, ShieldCheck, ShieldAlert, Ban, Undo2, Users, FileImage } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RequireAuth } from "@/components/RequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin, listAdminUsers, setUserBan, listUploadedFiles } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  component: () => (
    <RequireAuth>
      <AdminPage />
    </RequireAuth>
  ),
  head: () => ({
    meta: [
      { title: "Admin Panel — Agar Planner" },
      { name: "description", content: "Manage users, bans and uploaded files in Agar Planner." },
      { property: "og:title", content: "Admin Panel — Agar Planner" },
      { property: "og:description", content: "Admin tools for Agar Planner." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token ?? ""}` };
}

type U = Awaited<ReturnType<typeof listAdminUsers>>[number];
type F = Awaited<ReturnType<typeof listUploadedFiles>>[number];

function AdminPage() {
  const [state, setState] = useState<"checking" | "denied" | "ok">("checking");
  const [tab, setTab] = useState<"users" | "files">("users");
  const [users, setUsers] = useState<U[]>([]);
  const [files, setFiles] = useState<F[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const headers = await authHeaders();
    const [u, f] = await Promise.all([listAdminUsers({ headers }), listUploadedFiles({ headers })]);
    setUsers(u);
    setFiles(f);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { isAdmin } = await checkIsAdmin({ headers: await authHeaders() });
        if (!isAdmin) return setState("denied");
        await load();
        setState("ok");
      } catch {
        setState("denied");
      }
    })();
  }, [load]);

  const toggleBan = async (u: U) => {
    setBusy(u.id);
    try {
      await setUserBan({ data: { userId: u.id, ban: !u.banned }, headers: await authHeaders() });
      toast.success(u.banned ? "Account unbanned" : "Account banned");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  if (state === "checking")
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );

  if (state === "denied")
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <h1 className="text-xl font-semibold">Admins only</h1>
        <p className="text-sm text-muted-foreground">Your account doesn't have admin access.</p>
        <Link to="/" className="text-sm font-medium text-primary hover:underline">Back to dashboard</Link>
      </div>
    );

  const filtered = users.filter(
    (u) => !q || u.email.toLowerCase().includes(q.toLowerCase()) || (u.name ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-hero px-4 py-4 text-primary-foreground">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link to="/" className="rounded-md p-1 hover:bg-primary-foreground/10"><ArrowLeft className="h-4 w-4" /></Link>
          <ShieldCheck className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Admin Panel</h1>
          <span className="ml-auto text-xs opacity-80">{users.length} users · {users.filter((u) => u.banned).length} banned · {files.length} files</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4">
        <div className="mb-4 flex gap-2">
          <Button variant={tab === "users" ? "default" : "outline"} size="sm" onClick={() => setTab("users")}>
            <Users className="mr-1 h-4 w-4" /> Users
          </Button>
          <Button variant={tab === "files" ? "default" : "outline"} size="sm" onClick={() => setTab("files")}>
            <FileImage className="mr-1 h-4 w-4" /> Uploaded files
          </Button>
        </div>

        {tab === "users" ? (
          <>
            <Input placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} className="mb-3 h-9" />
            <div className="overflow-hidden rounded-xl border bg-card">
              {filtered.map((u) => (
                <div key={u.id} className="flex items-center gap-3 border-b p-3 last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {u.name ?? "—"}
                      {u.isAdmin && <span className="rounded bg-primary/10 px-1.5 text-xs text-primary">Admin</span>}
                      {u.verified && <span className="rounded bg-accent/15 px-1.5 text-xs">Verified</span>}
                      {u.banned && <span className="rounded bg-destructive/15 px-1.5 text-xs text-destructive">Banned</span>}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                    <div className="text-xs text-muted-foreground">
                      Joined {new Date(u.createdAt).toLocaleDateString()} · Last login {u.lastSignIn ? new Date(u.lastSignIn).toLocaleString() : "never"}
                    </div>
                  </div>
                  {!u.isAdmin && (
                    <Button size="sm" variant={u.banned ? "outline" : "destructive"} disabled={busy === u.id} onClick={() => toggleBan(u)}>
                      {busy === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : u.banned ? <><Undo2 className="mr-1 h-4 w-4" />Unban</> : <><Ban className="mr-1 h-4 w-4" />Ban</>}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : files.length === 0 ? (
          <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {files.map((f) => (
              <a key={f.id} href={f.url ?? "#"} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border bg-card">
                {f.url ? <img src={f.url} alt={f.caption ?? "upload"} className="aspect-square w-full object-cover" /> : <div className="aspect-square bg-muted" />}
                <div className="p-2 text-xs">
                  <div className="font-medium">{f.owner}</div>
                  <div className="truncate text-muted-foreground">{f.caption ?? f.path}</div>
                  <div className="text-muted-foreground">{new Date(f.createdAt).toLocaleString()}</div>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
