import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Rocket, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

type Mode = "signin" | "signup";

export function Login() {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) {
          toast.error("Please enter your name");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: name.trim() },
          },
        });
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Welcome aboard! 🎉");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const signInGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google sign-in failed");
        setGoogleLoading(false);
      }
      // If redirected, the browser navigates away
    } catch (err) {
      toast.error("Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="absolute inset-0 bg-gradient-hero opacity-90" />
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary-glow/30 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-accent-glow/30 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-3 text-center text-primary-foreground">
          <div className="mx-auto mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm shadow-glow">
            <Rocket className="h-3.5 w-3.5" />
          </div>
          <h1 className="text-base font-semibold tracking-tight">Welcome to Agar Planner 🚀</h1>
          <p className="mt-0.5 text-xs text-primary-foreground/80">Your personal study companion</p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-3xl border bg-card/95 p-8 shadow-elegant backdrop-blur-xl"
        >
          <div className="mb-4 flex rounded-lg bg-muted p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
                mode === "signin" ? "bg-card shadow-sm" : "text-muted-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
                mode === "signup" ? "bg-card shadow-sm" : "text-muted-foreground"
              }`}
            >
              Sign Up
            </button>
          </div>

          {mode === "signup" && (
            <div className="mb-3 space-y-2">
              <Label htmlFor="name" className="text-sm">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="h-9 text-sm"
                disabled={loading}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-9 text-sm"
              disabled={loading}
              required
            />
          </div>

          <div className="mt-3 space-y-2">
            <Label htmlFor="password" className="text-sm">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-9 text-sm"
              disabled={loading}
              minLength={6}
              required
            />
          </div>

          <Button
            type="submit"
            className="mt-5 h-11 w-full bg-gradient-primary text-sm font-semibold shadow-elegant transition-smooth hover:opacity-90"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "signup" ? "Creating account..." : "Signing you in..."}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {mode === "signup" ? "Create Account" : "Start Studying"}
              </>
            )}
          </Button>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={signInGoogle}
            disabled={googleLoading}
            className="h-11 w-full text-sm font-medium"
          >
            {googleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </Button>
        </form>
      </div>
    </div>
  );
}
