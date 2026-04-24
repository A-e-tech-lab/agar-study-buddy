import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Login } from "@/components/Login";
import { Dashboard } from "@/components/Dashboard";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

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

function Gate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return user ? <Dashboard /> : <Login />;
}

function Index() {
  return (
    <AuthProvider>
      <Gate />
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}
