import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { fetchGroupByToken, joinGroup, type StudyGroup } from "@/lib/squads";

export const Route = createFileRoute("/join/$token")({
  head: () => ({
    meta: [
      { title: "Join Study Squad — Agar Planner" },
      {
        name: "description",
        content: "You've been invited to join a study squad. Join to share tasks and compete on the squad leaderboard.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <JoinPage />
    </RequireAuth>
  ),
});

function JoinPage() {
  const { user } = useAuth();
  const userId = user!.id;
  const { token } = Route.useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const g = await fetchGroupByToken(token);
        if (!g) {
          toast.error("Invalid invite link");
          navigate({ to: "/squads" });
          return;
        }
        setGroup(g);
      } catch (err) {
        console.error(err);
        toast.error("Couldn't open invite");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleJoin = async () => {
    if (!group || joining) return;
    setJoining(true);
    try {
      await joinGroup(userId, group.id);
      toast.success("Joined!");
      navigate({ to: "/squads/$groupId", params: { groupId: group.id } });
    } catch (err) {
      console.error(err);
      toast.error("Couldn't join");
    } finally {
      setJoining(false);
    }
  };

  if (loading || !group) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-hero pb-10 pt-6 text-primary-foreground">
        <div className="mx-auto max-w-2xl px-6">
          <Link
            to="/squads"
            className="inline-flex items-center gap-2 text-sm text-primary-foreground/85 hover:text-primary-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Squads
          </Link>
          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">You're invited!</h1>
          <p className="text-sm text-primary-foreground/85">
            Join <span className="font-semibold">{group.name}</span> 🚀
          </p>
        </div>
      </header>

      <main className="mx-auto -mt-4 max-w-2xl px-6">
        <div className="rounded-3xl border bg-card p-6 shadow-elegant text-center">
          <p className="text-4xl">👥</p>
          <h2 className="mt-3 text-xl font-bold">{group.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Study together, share progress, and compete on the leaderboard.
          </p>
          <Button
            onClick={handleJoin}
            disabled={joining}
            className="mt-5 bg-gradient-primary"
          >
            {joining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Join Squad
          </Button>
        </div>
      </main>
    </div>
  );
}
