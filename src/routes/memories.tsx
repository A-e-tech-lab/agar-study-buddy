import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ImagePlus, Loader2, Lock, Trash2, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import {
  checkMemoryLock,
  deleteMemory,
  fetchMemories,
  hasMemoryLock,
  setMemoryLock,
  uploadMemory,
  type Memory,
} from "@/lib/memories";

export const Route = createFileRoute("/memories")({
  head: () => ({
    meta: [
      { title: "Memory Page — Agar Planner" },
      {
        name: "description",
        content:
          "Your private photo memories, locked behind a password only you know.",
      },
      { property: "og:title", content: "Private Memories — Agar Planner" },
      {
        property: "og:description",
        content: "A password-protected scrapbook of your favourite moments.",
      },
    ],
  }),
  component: MemoriesPage,
});

function MemoriesPage() {
  return (
    <RequireAuth>
      <MemoriesInner />
    </RequireAuth>
  );
}

function MemoriesInner() {
  const { user } = useAuth();
  const userId = user!.id;

  const [checking, setChecking] = useState(true);
  const [hasLock, setHasLock] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    hasMemoryLock(userId)
      .then(setHasLock)
      .catch(() => toast.error("Could not load lock"))
      .finally(() => setChecking(false));
  }, [userId]);

  const handleSetPassword = async () => {
    if (pwd.length < 4) return toast.error("At least 4 characters");
    if (pwd !== pwd2) return toast.error("Passwords don't match");
    setWorking(true);
    try {
      await setMemoryLock(userId, pwd);
      setHasLock(true);
      setUnlocked(true);
      setPwd("");
      setPwd2("");
      toast.success("Password set 🔐");
    } catch (err) {
      toast.error("Couldn't save password");
      console.error(err);
    } finally {
      setWorking(false);
    }
  };

  const handleUnlock = async () => {
    setWorking(true);
    try {
      const ok = await checkMemoryLock(userId, pwd);
      if (ok) {
        setUnlocked(true);
        setPwd("");
      } else {
        toast.error("Wrong password");
      }
    } finally {
      setWorking(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <header className="bg-gradient-hero pb-10 pt-6 text-primary-foreground">
        <div className="mx-auto max-w-4xl px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-primary-foreground/85 hover:text-primary-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Memory Page 📸</h1>
          <p className="text-sm text-primary-foreground/85">
            Photos and moments you want to keep close — locked behind your password.
          </p>
        </div>
      </header>

      <main className="mx-auto -mt-4 max-w-4xl px-6">
        {!unlocked ? (
          <div className="mx-auto max-w-md rounded-3xl border bg-card p-6 shadow-elegant">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">{hasLock ? "Enter password" : "Create a password"}</p>
                <p className="text-xs text-muted-foreground">
                  {hasLock ? "Unlock your memories" : "You'll need this to view them later"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="m-pwd">Password</Label>
                <Input
                  id="m-pwd"
                  type="password"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (hasLock ? handleUnlock() : pwd2 && handleSetPassword())}
                  autoFocus
                />
              </div>
              {!hasLock && (
                <div className="space-y-1">
                  <Label htmlFor="m-pwd2">Confirm password</Label>
                  <Input
                    id="m-pwd2"
                    type="password"
                    value={pwd2}
                    onChange={(e) => setPwd2(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSetPassword()}
                  />
                </div>
              )}
              <Button
                className="w-full bg-gradient-primary"
                onClick={hasLock ? handleUnlock : handleSetPassword}
                disabled={working}
              >
                {working ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Unlock className="mr-2 h-4 w-4" />
                )}
                {hasLock ? "Unlock" : "Set password"}
              </Button>
              {!hasLock && (
                <p className="text-center text-xs text-muted-foreground">
                  Password is hashed and stored privately. There's no recovery — write it down somewhere safe.
                </p>
              )}
            </div>
          </div>
        ) : (
          <UnlockedGallery userId={userId} />
        )}
      </main>
    </div>
  );
}

function UnlockedGallery({ userId }: { userId: string }) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchMemories(userId)
      .then(setMemories)
      .catch((err) => {
        console.error(err);
        toast.error("Couldn't load memories");
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Max 8 MB per photo");
      return;
    }
    setUploading(true);
    try {
      const created = await uploadMemory(userId, file, caption);
      setMemories((prev) => [created, ...prev]);
      setCaption("");
      toast.success("Memory added 💛");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (m: Memory) => {
    const prev = memories;
    setMemories((p) => p.filter((x) => x.id !== m.id));
    try {
      await deleteMemory(m);
    } catch {
      setMemories(prev);
      toast.error("Couldn't delete");
    }
  };

  return (
    <>
      <div className="rounded-3xl border bg-card p-5 shadow-elegant">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption (optional)"
            className="flex-1"
          />
          <Button onClick={handlePick} disabled={uploading} className="bg-gradient-primary">
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="mr-2 h-4 w-4" />
            )}
            Add photo
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : memories.length === 0 ? (
          <div className="rounded-3xl border border-dashed bg-card/50 p-10 text-center">
            <p className="text-3xl">🖼️</p>
            <p className="mt-2 font-semibold">No memories yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload your first photo above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {memories.map((m) => (
              <div
                key={m.id}
                className="group relative overflow-hidden rounded-2xl border bg-card shadow-soft"
              >
                {m.signedUrl ? (
                  <img
                    src={m.signedUrl}
                    alt={m.caption ?? "Memory"}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-muted text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
                {m.caption && (
                  <p className="truncate px-3 py-2 text-xs text-foreground">{m.caption}</p>
                )}
                <button
                  onClick={() => handleDelete(m)}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Delete memory"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
