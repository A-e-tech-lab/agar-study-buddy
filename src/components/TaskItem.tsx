import { Check, Clock, Trash2 } from "lucide-react";
import type { Subject, Task } from "@/lib/data";
import { Button } from "@/components/ui/button";

interface Props {
  task: Task;
  subject?: Subject;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TaskItem({ task, subject, onToggle, onDelete }: Props) {
  return (
    <div
      className={`group flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-soft transition-smooth hover:shadow-elegant ${
        task.completed ? "opacity-60" : ""
      }`}
    >
      <button
        onClick={() => onToggle(task.id)}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-bounce ${
          task.completed
            ? "border-success bg-success text-success-foreground"
            : "border-border hover:border-primary hover:bg-primary/5"
        }`}
        aria-label="Toggle complete"
      >
        {task.completed && <Check className="h-4 w-4" />}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate font-medium ${
            task.completed ? "line-through text-muted-foreground" : ""
          }`}
        >
          {task.title}
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {subject && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium"
              style={{
                backgroundColor: `color-mix(in oklab, var(--${subject.color}) 15%, transparent)`,
                color: `var(--${subject.color})`,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: `var(--${subject.color})` }}
              />
              {subject.name}
            </span>
          )}
          {task.time && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {task.time}
            </span>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 transition-smooth text-muted-foreground hover:text-destructive"
        aria-label="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
