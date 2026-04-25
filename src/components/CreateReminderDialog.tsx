import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Loader2 } from "lucide-react";
import type { Recurrence } from "@/lib/reminders";

interface Props {
  onCreate: (input: {
    title: string;
    message?: string;
    remindTime: string;
    remindDate?: string | null;
    recurrence: Recurrence;
    notifyBrowser: boolean;
    notifyEmail: boolean;
  }) => Promise<void> | void;
}

export function CreateReminderDialog({ onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [time, setTime] = useState("18:00");
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [recurrence, setRecurrence] = useState<Recurrence>("daily");
  const [notifyBrowser, setNotifyBrowser] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim() || !time || saving) return;
    setSaving(true);
    try {
      // Ask for browser notification permission lazily
      if (notifyBrowser && "Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
      await onCreate({
        title: title.trim(),
        message: message.trim() || undefined,
        remindTime: time,
        remindDate: recurrence === "once" ? date : null,
        recurrence,
        notifyBrowser,
        notifyEmail,
      });
      setTitle("");
      setMessage("");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Bell className="h-4 w-4" /> New Reminder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Reminder</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="r-title">Title</Label>
            <Input
              id="r-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Revise flashcards"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-msg">Note (optional)</Label>
            <Input
              id="r-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Anything you want to remember"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="r-time">Time</Label>
              <Input id="r-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Repeat</Label>
              <Select value={recurrence} onValueChange={(v) => setRecurrence(v as Recurrence)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Once</SelectItem>
                  <SelectItem value="daily">Every day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {recurrence === "once" && (
            <div className="space-y-2">
              <Label htmlFor="r-date">Date</Label>
              <Input id="r-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          )}
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Browser notification</p>
                <p className="text-xs text-muted-foreground">Pop up on this device</p>
              </div>
              <Switch checked={notifyBrowser} onCheckedChange={setNotifyBrowser} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email reminder</p>
                <p className="text-xs text-muted-foreground">Sent to your account email</p>
              </div>
              <Switch checked={notifyEmail} onCheckedChange={setNotifyEmail} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} className="bg-gradient-primary" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
