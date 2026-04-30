import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [{ title: "Reset password — Agar Planner" }],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the user lands from the email link
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // If session already exists and URL hash has type=recovery, we're good too
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      setReady(true);
    }
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated! 🎉");
    navigate({ to: "/" });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="absolute inset-0 bg-gradient-hero opacity-90" />
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary-glow/30 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-accent-glow/30 blur-3xl" />

      <form
        onSubmit={submit}
        className="relative w-full max-w-md rounded-3xl border bg-card/95 p-8 shadow-elegant backdrop-blur-xl"
      >
        <div className="mb-5 text-center">
          <div className="mx-auto mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
            <KeyRound className="h-4 w-4" />
          </div>
          <h1 className="text-lg font-semibold">Set a new password</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {ready
              ? "Enter your new password below."
              : "Open this page from the password reset email."}
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="pw" className="text-sm">New password</Label>
            <Input
              id="pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
              disabled={!ready || loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw2" className="text-sm">Confirm password</Label>
            <Input
              id="pw2"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
              disabled={!ready || loading}
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={!ready || loading}
          className="mt-5 h-11 w-full bg-gradient-primary text-sm font-semibold shadow-elegant hover:opacity-90"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Update password
        </Button>
      </form>
    </div>
  );
}
