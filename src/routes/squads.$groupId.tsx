import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Copy,
  LogOut as LeaveIcon,
  Loader2,
  Trash2,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import {
  deleteGroup,
  fetchGroup,
  fetchMembersWithStats,
  leaveGroup,
  type GroupMember,
  type StudyGroup,
} from "@/lib/squads";
import { fetchFriendsWithStats } from "@/lib/friends";

export const Route = createFileRoute("/squads/$groupId")({
  head: () => ({
    meta: [{ title: "Squad — Agar Planner" }],
  }),
  component: () => (
    <RequireAuth>
      <SquadDetailPage />
    </RequireAuth>
  ),
});

function SquadDetailPage() {
  const { user } = useAuth();
  const userId = user!.id;
  const { groupId } = Route.useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [friends, setFriends] = useState<{ userId: string; displayName: string }[]>([]);
  const [inviting, setInviting] = useState<string | null>(null);

  const isOwner = group?.ownerId === userId;

  const refresh = async () => {
    try {
      const [g, mems] = await Promise.all([
        fetchGroup(groupId),
        fetchMembersWithStats(groupId),
      ]);
      if (!g) {
        toast.error("Squad not found");
        navigate({ to: "/squads" });
        return;
      }
      setGroup(g);
      setMembers(mems);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't load squad");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const inviteUrl = useMemo(() => {
    if (!group) return "";
    if (typeof window === "undefined") return `/join/${group.inviteToken}`;
    return `${window.location.origin}/join/${group.inviteToken}`;
  }, [group]);

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Invite link copied!");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const openFriendPicker = async () => {
    setShowFriendPicker(true);
    try {
      const list = await fetchFriendsWithStats(userId);
      const memberSet = new Set(members.map((m) => m.userId));
      setFriends(
        list
          .filter((f) => f.status === "accepted" && f.direction !== "self" && !memberSet.has(f.friendUserId))
          .map((f) => ({ userId: f.friendUserId, displayName: f.displayName }))
      );
    } catch {
      toast.error("Couldn't load friends");
    }
  };

  // "Inviting" a friend = directly add them as member (they're already an accepted friend).
  const addFriend = async (friendUserId: string) => {
    setInviting(friendUserId);
    try {
      // Use joinGroup — but this inserts as the *current* user, not the friend.
      // RLS only lets users add themselves. So we share the invite URL/code instead.
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied — share it with your friend");
    } catch {
      toast.error("Couldn't copy invite");
    } finally {
      setInviting(null);
    }
  };

  const handleLeave = async () => {
    if (!confirm("Leave this squad?")) return;
    try {
      await leaveGroup(userId, groupId);
      toast.success("Left squad");
      navigate({ to: "/squads" });
    } catch {
      toast.error("Couldn't leave");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this squad permanently?")) return;
    try {
      await deleteGroup(groupId);
      toast.success("Squad deleted");
      navigate({ to: "/squads" });
    } catch {
      toast.error("Couldn't delete");
    }
  };

  const statusDot = (s: GroupMember["status"]) =>
    s === "studying"
      ? "bg-success"
      : s === "break"
        ? "bg-accent"
        : "bg-muted-foreground/40";

  const statusLabel = (s: GroupMember["status"]) =>
    s === "studying" ? "Studying" : s === "break" ? "Break" : "Offline";

  if (loading || !group) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <header className="bg-gradient-hero pb-10 pt-6 text-primary-foreground">
        <div className="mx-auto max-w-3xl px-6">
          <Link
            to="/squads"
            className="inline-flex items-center gap-2 text-sm text-primary-foreground/85 hover:text-primary-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Squads
          </Link>
          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{group.name}</h1>
          <p className="text-sm text-primary-foreground/85">
            {members.length} member{members.length === 1 ? "" : "s"} · code{" "}
            <span className="font-mono">{group.inviteToken}</span>
          </p>
        </div>
      </header>

      <main className="mx-auto -mt-4 max-w-3xl space-y-6 px-6">
        {/* Invite */}
        <div className="rounded-3xl border bg-card p-5 shadow-elegant">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Invite friends
          </p>
          <div className="mt-2 flex gap-2">
            <code className="flex-1 truncate rounded-lg bg-muted px-3 py-2 text-xs">
              {inviteUrl}
            </code>
            <Button size="icon" variant="outline" onClick={copyInvite} aria-label="Copy invite">
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={openFriendPicker}>
              <UserPlus className="mr-1 h-4 w-4" /> Pick from friends
            </Button>
            {isOwner ? (
              <Button size="sm" variant="ghost" onClick={handleDelete} className="text-destructive">
                <Trash2 className="mr-1 h-4 w-4" /> Delete squad
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={handleLeave}>
                <LeaveIcon className="mr-1 h-4 w-4" /> Leave squad
              </Button>
            )}
          </div>

          {showFriendPicker && (
            <div className="mt-4 rounded-2xl border bg-muted/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Your friends
                </p>
                <button
                  onClick={() => setShowFriendPicker(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
              </div>
              {friends.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No friends to add. They need to accept your friend request first.
                </p>
              ) : (
                <div className="space-y-1">
                  {friends.map((f) => (
                    <div
                      key={f.userId}
                      className="flex items-center justify-between rounded-lg bg-card p-2 text-sm"
                    >
                      <span>{f.displayName}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => addFriend(f.userId)}
                        disabled={inviting === f.userId}
                      >
                        Send invite
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground">
                Tap "Send invite" to copy the join link, then share it with them.
              </p>
            </div>
          )}
        </div>

        {/* Leaderboard / members */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Trophy className="h-5 w-5 text-primary" /> Squad Leaderboard
          </h2>
          <div className="overflow-hidden rounded-3xl border bg-card shadow-soft">
            {members.map((m, i) => {
              const isMe = m.userId === userId;
              const medal = ["🥇", "🥈", "🥉"][i] ?? `#${i + 1}`;
              return (
                <div
                  key={m.userId}
                  className={`flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 ${
                    isMe ? "bg-primary/5" : ""
                  }`}
                >
                  <span className="w-8 text-center text-lg">{medal}</span>
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDot(m.status)}`} aria-label={statusLabel(m.status)} />
                  <div className="flex-1">
                    <p className="font-medium">
                      {m.displayName}
                      {isMe && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                      {m.role === "owner" && (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                          Owner
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.tasksThisWeek} tasks · {m.focusMinutesThisWeek} focus min · {statusLabel(m.status)}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-sm font-semibold">
                    {m.points} pts
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Points = 1 per completed task + 1 per 10 focus minutes (last 7 days).
          </p>
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Users className="h-4 w-4" /> Status legend
          </h2>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Studying</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> Break</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Offline</span>
          </div>
        </section>
      </main>
    </div>
  );
}
