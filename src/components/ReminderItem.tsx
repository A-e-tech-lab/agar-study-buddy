import { Bell, Mail, Repeat, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { Reminder } from "@/lib/reminders";

interface Props {
  reminder: Reminder;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}

export function ReminderItem({ reminder, onToggle, onDelete }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
        <Bell className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{reminder.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{reminder.remindTime}</span>
          <span className="flex items-center gap-1">
            <Repeat className="h-3 w-3" />
            {reminder.recurrence === "daily" ? "Every day" : reminder.remindDate ?? "Once"}
          </span>
          {reminder.notifyEmail && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" /> Email
            </span>
          )}
        </div>
        {reminder.message && (
          <p className="mt-1 truncate text-xs text-muted-foreground">{reminder.message}</p>
        )}
      </div>
      <Switch
        checked={reminder.enabled}
        onCheckedChange={(v) => onToggle(reminder.id, v)}
        aria-label="Toggle reminder"
      />
      <Button
        size="icon"
        variant="ghost"
        onClick={() => onDelete(reminder.id)}
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        aria-label="Delete reminder"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
