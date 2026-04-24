export type Subject = {
  id: string;
  name: string;
  color: string;
};

export type Task = {
  id: string;
  title: string;
  subjectId: string;
  time?: string; // HH:MM
  completed: boolean;
  date: string; // YYYY-MM-DD
  createdAt: number;
};

const KEYS = {
  user: "agar.user",
  subjects: "agar.subjects",
  tasks: "agar.tasks",
  streak: "agar.streak",
} as const;

export const todayKey = () => new Date().toISOString().slice(0, 10);

export function getUser(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEYS.user);
}

export function setUser(name: string) {
  localStorage.setItem(KEYS.user, name);
}

export function clearUser() {
  localStorage.removeItem(KEYS.user);
}

export function getSubjects(): Subject[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEYS.subjects);
  if (!raw) {
    const seed: Subject[] = [
      { id: crypto.randomUUID(), name: "Maths", color: "chart-1" },
      { id: crypto.randomUUID(), name: "Physics", color: "chart-2" },
      { id: crypto.randomUUID(), name: "Chemistry", color: "chart-3" },
    ];
    localStorage.setItem(KEYS.subjects, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(raw);
}

export function setSubjects(subjects: Subject[]) {
  localStorage.setItem(KEYS.subjects, JSON.stringify(subjects));
}

export function getTasks(): Task[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEYS.tasks);
  return raw ? JSON.parse(raw) : [];
}

export function setTasks(tasks: Task[]) {
  localStorage.setItem(KEYS.tasks, JSON.stringify(tasks));
}

export function getStreak(): { count: number; lastDate: string | null } {
  if (typeof window === "undefined") return { count: 0, lastDate: null };
  const raw = localStorage.getItem(KEYS.streak);
  return raw ? JSON.parse(raw) : { count: 0, lastDate: null };
}

export function bumpStreak() {
  const today = todayKey();
  const s = getStreak();
  if (s.lastDate === today) return s;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const next = {
    count: s.lastDate === yesterday ? s.count + 1 : 1,
    lastDate: today,
  };
  localStorage.setItem(KEYS.streak, JSON.stringify(next));
  return next;
}
