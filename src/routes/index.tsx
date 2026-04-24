import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Login } from "@/components/Login";
import { Dashboard } from "@/components/Dashboard";
import { clearUser, getUser, setUser } from "@/lib/storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agar Planner — Your Personal Study Companion" },
      {
        name: "description",
        content:
          "Plan daily study tasks, set reminders, track progress and stay motivated with Agar Planner.",
      },
      { property: "og:title", content: "Agar Planner — Study Smarter" },
      {
        property: "og:description",
        content:
          "A simple, beautiful study planner with tasks, reminders, streaks and daily motivation.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [user, setUserState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUserState(getUser());
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <>
      {user ? (
        <Dashboard
          user={user}
          onLogout={() => {
            clearUser();
            setUserState(null);
          }}
        />
      ) : (
        <Login
          onLogin={(name) => {
            setUser(name);
            setUserState(name);
          }}
        />
      )}
      <Toaster position="top-center" richColors />
    </>
  );
}
