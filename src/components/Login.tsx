import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Rocket, Loader2 } from "lucide-react";

interface Props {
  onLogin: (name: string) => void;
}

export function Login({ onLogin }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || loading) return;
    setLoading(true);
    // Simulate brief processing so users see feedback
    setTimeout(() => {
      onLogin(name.trim());
    }, 700);
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
          <p className="mt-0.5 text-xs text-primary-foreground/80">
            Your personal study companion
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-3xl border bg-card/95 p-8 shadow-elegant backdrop-blur-xl"
        >
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm">
              What should we call you?
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-9 text-sm"
              disabled={loading}
              autoFocus
            />
          </div>
          <Button
            type="submit"
            className="mt-6 h-12 w-full bg-gradient-primary text-base font-semibold shadow-elegant transition-smooth hover:opacity-90"
            disabled={!name.trim() || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing you in...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Start Studying
              </>
            )}
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            No password needed — let's get to work!
          </p>
        </form>
      </div>
    </div>
  );
}

