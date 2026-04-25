import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Headphones, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchFocusSessions,
  logFocusSession,
  totalMinutesToday,
  type FocusSession,
} from "@/lib/focus";
import { playSuccessChime } from "@/lib/sound";

export const Route = createFileRoute("/focus")({
  head: () => ({
    meta: [
      { title: "Focus Mode — Agar Planner" },
      {
        name: "description",
        content:
          "Distraction-free Pomodoro timer with calming lofi background sound to help you study deeply.",
      },
      { property: "og:title", content: "Focus Mode — Agar Planner" },
      {
        property: "og:description",
        content: "Pomodoro + lofi background music. Focus on what matters.",
      },
    ],
  }),
  component: FocusPage,
});

const DURATIONS = [15, 25, 45];
// Free, hosted lofi stream (HLS-friendly mp3 mirror). If unavailable, the user can mute.
const LOFI_URL = "https://stream.zeno.fm/0r0xa792kwzuv";

function FocusPage() {
  return (
    <RequireAuth>
      <FocusInner />
    </RequireAuth>
  );
}

function FocusInner() {
  const { user } = useAuth();
  const userId = user!.id;

  const [duration, setDuration] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [audioOn, setAudioOn] = useState(false);
  const [volume, setVolume] = useState(60);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedAtRef = useRef<number | null>(null);

  // Load history
  useEffect(() => {
    fetchFocusSessions(userId).then(setSessions).catch(() => {});
  }, [userId]);

  // Reset timer when duration changes (only if not running)
  useEffect(() => {
    if (!running) setSecondsLeft(duration * 60);
  }, [duration, running]);

  // Tick
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          completeSession();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Audio control
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume / 100;
    if (audioOn) {
      a.play().catch(() => {
        toast.error("Couldn't start audio. Tap play again or check your connection.");
        setAudioOn(false);
      });
    } else {
      a.pause();
    }
  }, [audioOn, volume]);

  const completeSession = async () => {
    setRunning(false);
    playSuccessChime();
    toast.success(`Nice! ${duration} min focused 🎉`);
    try {
      const created = await logFocusSession(userId, duration);
      setSessions((prev) => [created, ...prev]);
    } catch (err) {
      console.error(err);
    }
    startedAtRef.current = null;
  };

  const start = () => {
    if (secondsLeft === 0) setSecondsLeft(duration * 60);
    startedAtRef.current = Date.now();
    setRunning(true);
  };

  const pause = () => setRunning(false);

  const reset = () => {
    setRunning(false);
    setSecondsLeft(duration * 60);
    startedAtRef.current = null;
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const progress = 1 - secondsLeft / (duration * 60);

  const todayMin = useMemo(() => totalMinutesToday(sessions), [sessions]);

  // Circular progress geometry
  const R = 130;
  const C = 2 * Math.PI * R;

  return (
    <div className="min-h-screen bg-gradient-hero pb-12 text-primary-foreground">
      <header className="mx-auto max-w-3xl px-6 pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-primary-foreground/85 hover:text-primary-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Focus Mode</h1>
        <p className="text-sm text-primary-foreground/85">
          Pick a length, hit start, and let the lofi carry you. {todayMin} min today.
        </p>
      </header>

      <main className="mx-auto mt-6 max-w-3xl px-6">
        {/* Timer card */}
        <div className="rounded-3xl bg-card p-8 text-card-foreground shadow-elegant">
          <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
            {DURATIONS.map((d) => (
              <Button
                key={d}
                variant={duration === d ? "default" : "outline"}
                size="sm"
                disabled={running}
                onClick={() => setDuration(d)}
                className={duration === d ? "bg-gradient-primary" : ""}
              >
                {d} min
              </Button>
            ))}
          </div>

          <div className="relative mx-auto h-72 w-72">
            <svg viewBox="0 0 300 300" className="h-full w-full -rotate-90">
              <circle
                cx="150"
                cy="150"
                r={R}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="14"
              />
              <circle
                cx="150"
                cy="150"
                r={R}
                fill="none"
                stroke="url(#focusGrad)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - progress)}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
              <defs>
                <linearGradient id="focusGrad" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--accent))" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-6xl font-bold tabular-nums tracking-tight text-foreground">
                {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </p>
              <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                {running ? "Focusing" : secondsLeft === 0 ? "Done" : "Ready"}
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-3">
            {running ? (
              <Button size="lg" onClick={pause} variant="outline">
                <Pause className="mr-2 h-5 w-5" /> Pause
              </Button>
            ) : (
              <Button size="lg" onClick={start} className="bg-gradient-primary px-8">
                <Play className="mr-2 h-5 w-5" /> Start
              </Button>
            )}
            <Button size="lg" variant="ghost" onClick={reset}>
              <RotateCcw className="mr-2 h-5 w-5" /> Reset
            </Button>
          </div>
        </div>

        {/* Lofi card */}
        <div className="mt-6 rounded-3xl bg-card p-5 text-card-foreground shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-warm text-primary-foreground">
              <Headphones className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Lofi background</p>
              <p className="text-xs text-muted-foreground">
                Calm beats to keep you in flow
              </p>
            </div>
            <Button
              variant={audioOn ? "default" : "outline"}
              size="sm"
              onClick={() => setAudioOn((v) => !v)}
              className={audioOn ? "bg-gradient-primary" : ""}
            >
              {audioOn ? (
                <>
                  <Volume2 className="mr-2 h-4 w-4" /> Playing
                </>
              ) : (
                <>
                  <VolumeX className="mr-2 h-4 w-4" /> Off
                </>
              )}
            </Button>
          </div>
          <div className="mt-4">
            <Slider
              value={[volume]}
              onValueChange={(v) => setVolume(v[0] ?? 0)}
              max={100}
              step={1}
            />
          </div>
          {/* Hidden audio element */}
          <audio ref={audioRef} src={LOFI_URL} loop preload="none" />
        </div>

        {/* Recent sessions */}
        <div className="mt-6 rounded-3xl bg-card p-5 text-card-foreground shadow-soft">
          <p className="font-semibold">Recent focus sessions</p>
          {sessions.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No sessions yet. Your first one's a click away.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {sessions.slice(0, 8).map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{new Date(s.endedAt).toLocaleString()}</span>
                  <span className="font-semibold">{s.durationMinutes} min</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
