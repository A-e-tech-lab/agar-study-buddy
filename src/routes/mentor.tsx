import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Loader2, Send, Sparkles, Bot, User as UserIcon, Brain, MessageSquare, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";

export const Route = createFileRoute("/mentor")({
  component: () => (
    <RequireAuth>
      <MentorPage />
    </RequireAuth>
  ),
  head: () => ({
    meta: [
      { title: "AI Mentor — Agar Planner" },
      {
        name: "description",
        content: "Chat with your personal AI study mentor or take an AI-generated quiz.",
      },
    ],
  }),
});

type Msg = { role: "user" | "assistant"; content: string };
type QuizQ = { question: string; options: string[]; correctIndex: number; explanation: string };

const STARTERS = [
  "Explain photosynthesis like I'm 12",
  "Quiz me on quadratic equations",
  "Summarise Newton's laws in 5 bullets",
  "Help me plan tomorrow's study session",
];

function MentorPage() {
  const [mode, setMode] = useState<"chat" | "quiz">("chat");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="relative overflow-hidden bg-gradient-hero pb-6 pt-8 text-primary-foreground">
        <div className="absolute -top-16 right-0 h-48 w-48 rounded-full bg-accent-glow/20 blur-3xl" />
        <div className="absolute -bottom-16 left-0 h-48 w-48 rounded-full bg-primary-glow/30 blur-3xl" />
        <div className="relative mx-auto flex max-w-3xl items-center gap-3 px-6">
          <Link
            to="/"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/25"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-glow">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold tracking-tight sm:text-xl">AI Mentor</h1>
            <p className="text-xs text-primary-foreground/80">Your personal study coach 🤖</p>
          </div>
        </div>
        <div className="relative mx-auto mt-4 flex max-w-3xl gap-2 px-6">
          <button
            onClick={() => setMode("chat")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              mode === "chat" ? "bg-white text-primary" : "bg-white/15 text-primary-foreground hover:bg-white/25"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" /> Chat
          </button>
          <button
            onClick={() => setMode("quiz")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              mode === "quiz" ? "bg-white text-primary" : "bg-white/15 text-primary-foreground hover:bg-white/25"
            }`}
          >
            <Brain className="h-3.5 w-3.5" /> Quiz Mode
          </button>
        </div>
      </header>

      {mode === "chat" ? <ChatMode /> : <QuizMode />}
    </div>
  );
}

function ChatMode() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Msg = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m,
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-mentor`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Rate limited — try again in a moment.");
        else if (resp.status === 402) toast.error("AI credits exhausted. Add credits in workspace settings.");
        else toast.error("AI mentor failed to respond");
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, nl);
          textBuffer = textBuffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <>
      <div ref={scrollRef} className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="mt-4 rounded-3xl border bg-card p-6 shadow-soft">
            <p className="text-sm font-semibold">Hi! I'm your AI mentor 👋</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask me anything about your studies, or pick a starter:
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-xl border bg-background px-3 py-2 text-left text-xs font-medium transition-smooth hover:border-primary hover:bg-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    m.role === "user"
                      ? "bg-gradient-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {m.role === "user" ? (
                    <UserIcon className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm shadow-soft ${
                    m.role === "user"
                      ? "bg-gradient-primary text-primary-foreground"
                      : "bg-card border"
                  }`}
                >
                  {m.content || (loading && i === messages.length - 1 ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="sticky bottom-0 border-t bg-background/95 px-4 py-3 backdrop-blur"
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask anything... (Shift+Enter for new line)"
            disabled={loading}
            rows={1}
            className="min-h-[44px] resize-none text-sm"
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading || !input.trim()}
            className="h-11 w-11 shrink-0 bg-gradient-primary"
            aria-label="Send"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </>
  );
}

function QuizMode() {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuizQ[] | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const generate = async (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || loading) return;
    setLoading(true);
    setQuestions(null);
    setSubmitted(false);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-quiz`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ topic: topic.trim(), count, difficulty }),
      });
      if (!resp.ok) {
        if (resp.status === 429) toast.error("Rate limited — try again in a moment.");
        else if (resp.status === 402) toast.error("AI credits exhausted.");
        else toast.error("Failed to generate quiz");
        return;
      }
      const data = await resp.json();
      if (!Array.isArray(data?.questions)) {
        toast.error("No quiz returned");
        return;
      }
      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(-1));
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const score = questions
    ? answers.reduce((acc, a, i) => acc + (a === questions[i].correctIndex ? 1 : 0), 0)
    : 0;

  const reset = () => {
    setQuestions(null);
    setAnswers([]);
    setSubmitted(false);
  };

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      {!questions ? (
        <form onSubmit={generate} className="rounded-3xl border bg-card p-6 shadow-soft space-y-4">
          <div>
            <p className="text-sm font-semibold">Generate an MCQ quiz 🧠</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick a topic and I'll create multiple-choice questions, then score your answers.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">Topic</label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Photosynthesis, World War II, JS arrays"
              disabled={loading}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium">Questions</label>
              <Input
                type="number"
                min={3}
                max={10}
                value={count}
                onChange={(e) => setCount(Math.max(3, Math.min(10, Number(e.target.value) || 5)))}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Difficulty</label>
              <div className="flex gap-1">
                {(["easy", "medium", "hard"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    disabled={loading}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium capitalize transition ${
                      difficulty === d ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading || !topic.trim()}
            className="w-full bg-gradient-primary"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" /> Start Quiz
              </>
            )}
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          {submitted && (
            <div className="rounded-2xl border bg-gradient-primary p-5 text-primary-foreground shadow-soft">
              <p className="text-xs font-medium opacity-80">Your score</p>
              <p className="text-3xl font-bold">
                {score} / {questions.length}
              </p>
              <p className="mt-1 text-xs opacity-90">
                {score === questions.length
                  ? "Perfect! 🎉"
                  : score >= questions.length * 0.7
                  ? "Great job! 💪"
                  : score >= questions.length * 0.4
                  ? "Keep practising! 📚"
                  : "Review the explanations below 👇"}
              </p>
            </div>
          )}

          {questions.map((q, qi) => (
            <div key={qi} className="rounded-2xl border bg-card p-4 shadow-soft">
              <p className="text-sm font-semibold">
                {qi + 1}. {q.question}
              </p>
              <div className="mt-3 space-y-2">
                {q.options.map((opt, oi) => {
                  const selected = answers[qi] === oi;
                  const isCorrect = oi === q.correctIndex;
                  const showCorrect = submitted && isCorrect;
                  const showWrong = submitted && selected && !isCorrect;
                  return (
                    <button
                      key={oi}
                      type="button"
                      disabled={submitted}
                      onClick={() => {
                        const next = [...answers];
                        next[qi] = oi;
                        setAnswers(next);
                      }}
                      className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                        showCorrect
                          ? "border-emerald-500 bg-emerald-500/10"
                          : showWrong
                          ? "border-destructive bg-destructive/10"
                          : selected
                          ? "border-primary bg-primary/10"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                          selected || showCorrect ? "border-current" : "border-muted-foreground/40"
                        }`}
                      >
                        {showCorrect ? (
                          <Check className="h-3 w-3" />
                        ) : showWrong ? (
                          <X className="h-3 w-3" />
                        ) : (
                          String.fromCharCode(65 + oi)
                        )}
                      </span>
                      <span className="flex-1">{opt}</span>
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Explanation: </span>
                  {q.explanation}
                </p>
              )}
            </div>
          ))}

          <div className="flex gap-2 pb-6">
            {!submitted ? (
              <Button
                onClick={() => {
                  if (answers.some((a) => a === -1)) {
                    toast.error("Answer every question first");
                    return;
                  }
                  setSubmitted(true);
                }}
                className="flex-1 bg-gradient-primary"
              >
                Submit answers
              </Button>
            ) : (
              <>
                <Button onClick={reset} variant="outline" className="flex-1">
                  New quiz
                </Button>
                <Button
                  onClick={() => {
                    setAnswers(new Array(questions.length).fill(-1));
                    setSubmitted(false);
                  }}
                  className="flex-1 bg-gradient-primary"
                >
                  Retry
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
