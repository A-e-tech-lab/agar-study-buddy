import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { createGroup, fetchMyGroups, type StudyGroup } from "@/lib/squads";

export const Route = createFileRoute("/squads")({
  head: () => ({
    meta: [
      { title: "Study Squads — Agar Planner" },
      {
        name: "description",
        content: "Create a study squad, invite friends, and study together with shared progress and a live leaderboard.",
      },
      { property: "og:title", content: "Study Squads — Agar Planner" },
      {
        property: "og:description",
        content: "Group study with live status, shared tasks, and a combined leaderboard.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <SquadsPage />
    </RequireAuth>
  ),
});

function SquadsPage() {
  const { user } = useAuth();
  const userId = user!.id;
  const navigate = useNavigate();

  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    try {
      setGroups(await fetchMyGroups(userId));
    } catch (err) {
      console.error(err);
      toast.error("Couldn't load your squads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleCreate = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const g = await createGroup(userId, name);
      toast.success("Squad created!");
      setName("");
      navigate({ to: "/squads/$groupId", params: { groupId: g.id } });
    } catch (err) {
      console.error(err);
      toast.error("Couldn't create squad");
    } finally {
      setCreating(false);
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
          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Study Squads</h1>
          <p className="text-sm text-primary-foreground/85">
            Study together. Stay accountable. 🔥
          </p>
        </div>
      </header>

      <main className="mx-auto -mt-4 max-w-3xl space-y-6 px-6">
        <div className="rounded-3xl border bg-card p-5 shadow-elegant">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Create a new squad
          </p>
          <div className="mt-2 flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Agar Study Squad 🔥"
              maxLength={60}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button onClick={handleCreate} disabled={creating} className="bg-gradient-primary">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5 text-primary" /> Your squads
          </h2>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-card/50 p-8 text-center">
              <p className="text-3xl">👥</p>
              <p className="mt-2 font-semibold">No squads yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create one above or open an invite link from a friend.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((g) => (
                <Link
                  key={g.id}
                  to="/squads/$groupId"
                  params={{ groupId: g.id }}
                  className="flex items-center justify-between rounded-2xl border bg-card p-4 transition-smooth hover:shadow-elegant"
                >
                  <div>
                    <p className="font-semibold">{g.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Code: <span className="font-mono">{g.inviteToken}</span>
                    </p>
                  </div>
                  <span className="text-sm text-primary">Open →</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
