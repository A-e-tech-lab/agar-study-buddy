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
import { BookPlus, Loader2 } from "lucide-react";

const COLORS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];

interface Props {
  onAdd: (input: { name: string; color: string }) => Promise<void> | void;
}

export function AddSubjectDialog({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onAdd({ name: name.trim(), color });
      setName("");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BookPlus className="mr-2 h-4 w-4" /> Subject
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Subject</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="sname">Name</Label>
            <Input
              id="sname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Biology"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full transition-bounce ${
                    color === c ? "ring-2 ring-ring ring-offset-2" : ""
                  }`}
                  style={{ backgroundColor: `var(--${c})` }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} className="bg-gradient-primary w-full" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Add Subject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
