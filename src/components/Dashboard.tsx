import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  bumpStreak,
  createSubject,
  createTask,
  deleteTask as deleteTaskApi,
  fetchStreak,
  fetchSubjects,
  fetchTodaysTasks,
  setTaskCompleted,
  todayKey,
  type Subject,
  type Task,
} from "@/lib/data";
import { dailyQuote, randomCheer } from "@/lib/quotes";
import { playReminderChime, playSuccessChime, unlockAudio } from "@/lib/sound";
import { AddTaskDialog } from "./AddTaskDialog";
import { AddSubjectDialog } from "./AddSubjectDialog";
import { TaskItem } from "./TaskItem";
import { Button } from "@/components/ui/button";
import { Flame, LogOut, Quote, Target, BookOpen, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function Dashboard() {
  const { user, displayName, signOut } = useAuth();
  const userId = user!.id;

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [streak, setStreak] = useState({ count: 0, lastDate: null as string | null });
  const [loading, setLoading] = useState(true);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [subs, tks, str] = await Promise.all([
          fetchSubjects(userId),
          fetchTodaysTasks(userId),
          fetchStreak(userId),
        ]);
        if (cancelled) return;
        setSubjects(subs);
        setTasks(tks);
        setStreak(str);
      } catch (err) {
        toast.error("Failed to load your data");
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const unlock = () => {
      unlockAudio();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [userId]);

  // Reminder check every 30s
  useEffect(() => {
    const fired = new Set<string>();
    const tick = () => {
      const now = new Date();
      const hhmm = now.toTimeString().slice(0, 5);
      tasks.forEach((t) => {
        if (
          !t.completed &&
          t.date === todayKey() &&
          t.time === hhmm &&
          !fired.has(t.id)
        ) {
          fired.add(t.id);
          const subj = subjects.find((s) => s.id === t.subjectId);
          playReminderChime();
          toast(`Time to study ${subj?.name ?? t.title} 🔔`, {
            description: t.title,
          });
        }
      });
    };
    const id = setInterval(tick, 30000);
    tick();
    return () => clearInterval(id);
  }, [tasks, subjects]);

  const todays = useMemo(
    () => tasks.filter((t) => t.date === todayKey()),
    [tasks]
  );
  const pendingTasks = todays.filter((t) => !t.completed);
  const completedTasks = todays.filter((t) => t.completed);
  const completed = completedTasks.length;
  const progress = todays.length ? Math.round((completed / todays.length) * 100) : 0;

  const handleAddTask = async (input: { title: string; subjectId: string; time?: string }) => {
    try {
      const created = await createTask(userId, input);
      setTasks((prev) => [created, ...prev]);
      toast.success("Task added");
    } catch (err) {
      toast.error("Could not add task");
      console.error(err);
    }
  };

  const handleToggleTask = async (id: string) => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;
    const newCompleted = !target.completed;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: newCompleted } : t)));
    try {
      await setTaskCompleted(id, newCompleted);
      if (newCompleted) {
        playSuccessChime();
        toast.success(randomCheer());
        const s = await bumpStreak(userId);
        setStreak(s);
      }
    } catch (err) {
      // revert
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !newCompleted } : t)));
      toast.error("Failed to update task");
      console.error(err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    const prev = tasks;
    setTasks((p) => p.filter((t) => t.id !== id));
    try {
      await deleteTaskApi(id);
    } catch (err) {
      setTasks(prev);
      toast.error("Failed to delete task");
    }
  };

  const handleAddSubject = async (input: { name: string; color: string }) => {
    try {
      const created = await createSubject(userId, input.name, input.color);
      setSubjects((prev) => [...prev, created]);
      toast.success(`${created.name} added`);
    } catch (err) {
      toast.error("Could not add subject");
      console.error(err);
    }
  };

  const subjectStats = subjects.map((s) => {
    const list = todays.filter((t) => t.subjectId === s.id);
    const done = list.filter((t) => t.completed).length;
    return { ...s, total: list.length, done };
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-hero pb-20 pt-5 text-primary-foreground">
        <div className="absolute -top-20 right-0 h-56 w-56 rounded-full bg-accent-glow/20 blur-3xl" />
        <div className="absolute -bottom-20 left-0 h-56 w-56 rounded-full bg-primary-glow/30 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-primary-foreground/80">{greeting},</p>
              <h1 className="mt-0.5 text-xl font-bold tracking-tight sm:text-2xl">
                {displayName ?? "Friend"} 👋
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur-sm">
                <Flame className="h-3.5 w-3.5 text-accent-glow" />
                <span className="text-xs font-semibold">{streak.count} day streak</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => signOut()}
                className="h-8 w-8 text-primary-foreground hover:bg-white/15"
                aria-label="Logout"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-xl bg-white/10 p-3 backdrop-blur-sm">
            <Quote className="mt-0.5 h-4 w-4 shrink-0 text-accent-glow" />
            <p className="text-xs leading-relaxed text-primary-foreground/95">
              {dailyQuote()}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto -mt-12 max-w-4xl px-6">
        {/* Progress card */}
        <div className="rounded-3xl border bg-card p-6 shadow-elegant">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Today's Progress</h2>
                <p className="text-sm text-muted-foreground">
                  {completed} of {todays.length} tasks done
                </p>
              </div>
            </div>
            <span className="text-2xl font-bold text-primary">{progress}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-warm transition-smooth"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Subjects */}
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <BookOpen className="h-5 w-5 text-primary" /> Subjects
            </h2>
            <AddSubjectDialog onAdd={handleAddSubject} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {subjectStats.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border bg-card p-4 shadow-soft transition-smooth hover:shadow-elegant"
              >
                <div
                  className="mb-2 h-2 w-10 rounded-full"
                  style={{ backgroundColor: `var(--${s.color})` }}
                />
                <p className="font-semibold">{s.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.done}/{s.total} today
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Tasks */}
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Today's Tasks
              {todays.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({pendingTasks.length} pending · {completedTasks.length} done)
                </span>
              )}
            </h2>
            <AddTaskDialog subjects={subjects} onAdd={handleAddTask} />
          </div>

          {todays.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-card/50 p-10 text-center">
              <p className="text-4xl">📚</p>
              <p className="mt-3 font-semibold">No tasks for today yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first task to get started!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {pendingTasks.length > 0 && (
                <div className="space-y-2">
                  {pendingTasks.map((t) => (
                    <TaskItem
                      key={t.id}
                      task={t}
                      subject={subjects.find((s) => s.id === t.subjectId)}
                      onToggle={handleToggleTask}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </div>
              )}

              {completedTasks.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Check className="h-4 w-4 text-success" />
                    Completed ({completedTasks.length})
                  </h3>
                  <div className="space-y-2">
                    {completedTasks.map((t) => (
                      <TaskItem
                        key={t.id}
                        task={t}
                        subject={subjects.find((s) => s.id === t.subjectId)}
                        onToggle={handleToggleTask}
                        onDelete={handleDeleteTask}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
