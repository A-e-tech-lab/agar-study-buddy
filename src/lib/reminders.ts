import { supabase } from "@/integrations/supabase/client";

export type Recurrence = "once" | "daily";

export type Reminder = {
  id: string;
  title: string;
  message: string | null;
  remindTime: string;        // HH:MM
  remindDate: string | null; // YYYY-MM-DD when recurrence === "once"
  recurrence: Recurrence;
  notifyBrowser: boolean;
  notifyEmail: boolean;
  enabled: boolean;
  lastSentDate: string | null;
};

const fromRow = (r: any): Reminder => ({
  id: r.id,
  title: r.title,
  message: r.message ?? null,
  remindTime: r.remind_time,
  remindDate: r.remind_date ?? null,
  recurrence: (r.recurrence ?? "once") as Recurrence,
  notifyBrowser: !!r.notify_browser,
  notifyEmail: !!r.notify_email,
  enabled: !!r.enabled,
  lastSentDate: r.last_sent_date ?? null,
});

export async function fetchReminders(userId: string): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("user_id", userId)
    .order("remind_time", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function createReminder(
  userId: string,
  input: {
    title: string;
    message?: string;
    remindTime: string;
    remindDate?: string | null;
    recurrence: Recurrence;
    notifyBrowser: boolean;
    notifyEmail: boolean;
  }
): Promise<Reminder> {
  const { data, error } = await supabase
    .from("reminders")
    .insert({
      user_id: userId,
      title: input.title,
      message: input.message ?? null,
      remind_time: input.remindTime,
      remind_date: input.recurrence === "once" ? input.remindDate ?? null : null,
      recurrence: input.recurrence,
      notify_browser: input.notifyBrowser,
      notify_email: input.notifyEmail,
      enabled: true,
    })
    .select("*")
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function toggleReminder(id: string, enabled: boolean) {
  const { error } = await supabase.from("reminders").update({ enabled }).eq("id", id);
  if (error) throw error;
}

export async function deleteReminder(id: string) {
  const { error } = await supabase.from("reminders").delete().eq("id", id);
  if (error) throw error;
}

export async function markReminderSent(id: string, dateKey: string) {
  const { error } = await supabase
    .from("reminders")
    .update({ last_sent_date: dateKey })
    .eq("id", id);
  if (error) throw error;
}
