import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Copy, Loader2, Trophy, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import {
  ensureMyCode,
  fetchFriendsWithStats,
  removeFriend,
  respondToRequest,
  sendFriendRequestByCode,
  type FriendRow,
} from "@/lib/friends";

export const Route = createFileRoute("/friends")({
  head: () => ({
    meta: [
      { title: "Friend Competition — Agar Planner" },
      {
        name: "description",
        content:
          "Add friends with a code and see who studied more this week. Friendly competition keeps you going.",
      },
      { property: "og:title", content: "Who studied more? — Agar Planner" },
      {
        property: "og:description",
        content: "Compete with friends on weekly tasks completed.",
      },
    ],
  }),
  component: FriendsPage,
});

function FriendsPage() {
  return (
    <RequireAuth>
      <FriendsInner />
    </RequireAuth>
  );
}

function FriendsInner() {
  const { user } = useAuth();
  const userId = user!.id;

  const [myCode, setMyCode] = useState<string | null>(null);
  const [rows, setRows] = useState<FriendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = async () => {
    try {
      const [code, list] = await Promise.all([
        ensureMyCode(userId),
        fetchFriendsWithStats(userId),
      ]);
      setMyCode(code);
      setRows(list);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load friends");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const accepted = useMemo(
    () =>
      [...rows]
        .filter((r) => r.status === "accepted")
        .sort((a, b) => b.tasksThisWeek - a.tasksThisWeek),
    [rows]
  );
  const incoming = rows.filter((r) => r.status === "pending" && r.direction === "incoming");
  const outgoing = rows.filter((r) => r.status === "pending" && r.direction === "outgoing");

  const handleInvite = async () => {
    if (!inviteCode.trim() || sending) return;
    setSending(true);
    try {
      await sendFriendRequestByCode(userId, inviteCode);
      toast.success("Request sent!");
      setInviteCode("");
      await refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't send request");
    } finally {
      setSending(false);
    }
  };

  const handleRespond = async (id: string, accept: boolean) => {
    try {
      await respondToRequest(id, accept);
      toast.success(accept ? "Friend added!" : "Request declined");
      await refresh();
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeFriend(id);
      toast.success("Friend removed");
      await refresh();
    } catch {
      toast.error("Couldn't remove");
    }
  };

  const copyCode = async () => {
    if (!myCode) return;
    try {
      await navigator.clipboard.writeText(myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <div className="min-h-screen pb-12">
      <header className="bg-gradient-hero pb-10 pt-6 text-primary-foreground">
        <div className="mx-auto max-w-3xl px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-primary-foreground/85 hover:text-primary-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Friend Competition</h1>
          <p className="text-sm text-primary-foreground/85">
            Who studied more this week? 😎
          </p>
        </div>
      </header>

      <main className="mx-auto -mt-4 max-w-3xl space-y-6 px-6">
        {/* My code + invite */}
        <div className="grid gap-4 rounded-3xl border bg-card p-5 shadow-elegant sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Your friend code
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="rounded-lg bg-muted px-3 py-2 text-lg font-bold tracking-widest">
                {myCode ?? "…"}
              </code>
              <Button size="icon" variant="outline" onClick={copyCode} aria-label="Copy code">
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Share this with friends so they can add you.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Add a friend
            </p>
            <div className="mt-2 flex gap-2">
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Enter their code"
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
              <Button onClick={handleInvite} disabled={sending} className="bg-gradient-primary">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Incoming requests */}
        {incoming.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
              Incoming requests
            </h2>
            <div className="space-y-2">
              {incoming.map((r) => (
                <div
                  key={r.friendshipId}
                  className="flex items-center justify-between rounded-2xl border bg-card p-3"
                >
                  <p className="font-medium">{r.displayName}</p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleRespond(r.friendshipId, true)} className="bg-gradient-primary">
                      <Check className="mr-1 h-4 w-4" /> Accept
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleRespond(r.friendshipId, false)}>
                      <X className="mr-1 h-4 w-4" /> Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Outgoing pending */}
        {outgoing.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
              Pending requests
            </h2>
            <div className="space-y-2">
              {outgoing.map((r) => (
                <div
                  key={r.friendshipId}
                  className="flex items-center justify-between rounded-2xl border bg-card p-3 text-sm"
                >
                  <p>{r.displayName}</p>
                  <span className="text-xs text-muted-foreground">Waiting…</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Leaderboard */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Trophy className="h-5 w-5 text-primary" /> Weekly Leaderboard
          </h2>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : accepted.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-card/50 p-8 text-center">
              <p className="text-3xl">🤝</p>
              <p className="mt-2 font-semibold">No friends yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Share your code or enter a friend's code to start.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border bg-card shadow-soft">
              {accepted.map((r, i) => {
                const isMe = r.direction === "self";
                const medal = ["🥇", "🥈", "🥉"][i] ?? `#${i + 1}`;
                return (
                  <div
                    key={r.friendUserId}
                    className={`flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 ${
                      isMe ? "bg-primary/5" : ""
                    }`}
                  >
                    <span className="w-8 text-center text-lg">{medal}</span>
                    <p className="flex-1 font-medium">{r.displayName}</p>
                    <span className="rounded-full bg-muted px-3 py-1 text-sm font-semibold">
                      {r.tasksThisWeek} tasks
                    </span>
                    {!isMe && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemove(r.friendshipId)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label="Remove friend"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
