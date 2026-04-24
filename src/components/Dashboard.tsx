import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  bumpStreak,
  getStreak,
  getSubjects,
  getTasks,
  setSubjects as saveSubjects,
  setTasks as saveTasks,
  todayKey,
  type Subject,
  type Task,
} from "@/lib/storage";
import { dailyQuote, randomCheer } from "@/lib/quotes";
import { playReminderChime, playSuccessChime, unlockAudio } from "@/lib/sound";
import { AddTaskDialog } from "./AddTaskDialog";
import { AddSubjectDialog } from "./AddSubjectDialog";
import { TaskItem } from "./TaskItem";
import { Button } from "@/components/ui/button";
import { Flame, LogOut, Quote, Target, BookOpen } from "lucide-react";

interface Props {
  user: string;
  onLogout: () => void;
}

export function Dashboard({ user, onLogout }: Props) {
  const [subjects, setSubjectsState] = useState<Subject[]>([]);
  const [tasks, setTasksState] = useState<Task[]>([]);
  const [streak, setStreak] = useState({ count: 0, lastDate: null as string | null });

  useEffect(() => {
    setSubjectsState(getSubjects());
    setTasksState(getTasks());
    setStreak(getStreak());
  }, []);

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
  const completed = todays.filter((t) => t.completed).length;
  const progress = todays.length ? Math.round((completed / todays.length) * 100) : 0;

  const updateTasks = (next: Task[]) => {
    setTasksState(next);
    saveTasks(next);
  };

  const addTask = (t: Task) => {
    updateTasks([t, ...tasks]);
    toast.success("Task added");
  };

  const toggleTask = (id: string) => {
    const next = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    updateTasks(next);
    const t = next.find((x) => x.id === id);
    if (t?.completed) {
      playSuccessChime();
      toast.success(randomCheer());
      const s = bumpStreak();
      setStreak(s);
    }
  };

  const deleteTask = (id: string) => {
    updateTasks(tasks.filter((t) => t.id !== id));
  };

  const addSubject = (s: Subject) => {
    const next = [...subjects, s];
    setSubjectsState(next);
    saveSubjects(next);
    toast.success(`${s.name} added`);
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

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-hero pb-20 pt-10 text-primary-foreground">
        <div className="absolute -top-20 right-0 h-72 w-72 rounded-full bg-accent-glow/20 blur-3xl" />
        <div className="absolute -bottom-20 left-0 h-72 w-72 rounded-full bg-primary-glow/30 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-primary-foreground/80">
                {greeting},
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                {user} 👋
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 backdrop-blur-sm">
                <Flame className="h-4 w-4 text-accent-glow" />
                <span className="text-sm font-semibold">{streak.count} day streak</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={onLogout}
                className="text-primary-foreground hover:bg-white/15"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
            <Quote className="mt-0.5 h-5 w-5 shrink-0 text-accent-glow" />
            <p className="text-sm leading-relaxed text-primary-foreground/95">
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
            <AddSubjectDialog onAdd={addSubject} />
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
            <h2 className="text-lg font-semibold">Today's Tasks</h2>
            <AddTaskDialog subjects={subjects} onAdd={addTask} />
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
            <div className="space-y-2">
              {todays.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  subject={subjects.find((s) => s.id === t.subjectId)}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
