"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { DAYS, type Weekly } from "@/lib/visits";
import type { Message } from "@/lib/messaging";

const ERRORS: Record<string, string> = {
  DEJA_RESERVEE: "Une visite est déjà prévue pour ce bien.",
  AUCUN_CRENEAU: "Aucun créneau libre dans les 14 prochains jours. Vérifiez vos disponibilités.",
  CRENEAU_PRIS: "Ce créneau vient d’être réservé. Choisissez-en un autre.",
};
const translate = (msg?: string) => (msg && Object.entries(ERRORS).find(([k]) => msg.includes(k))?.[1]) ?? "Une erreur est survenue. Réessayez.";

// L'agence propose une visite : la fenêtre de créneaux apparaît chez le client
export async function proposeVisit(conversationId: string): Promise<{ message?: Message; error?: string }> {
  await requireProfile("agence");
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("propose_visit", { p_conversation: conversationId });
  if (error) return { error: translate(error.message) };
  const { data } = await supabase.from("messages").select("*").eq("id", id).single();
  return { message: data as Message };
}

export type SlotsResult = { slots: string[]; minutes: number; visit?: { starts_at: string }; error?: string };

// Créneaux libres de l'agent et éventuelle visite déjà réservée
export async function getSlots(conversationId: string): Promise<SlotsResult> {
  await requireProfile();
  const supabase = await createClient();
  const [{ data: slots, error }, { data: visit }] = await Promise.all([
    supabase.rpc("available_slots", { p_conversation: conversationId }),
    supabase.rpc("upcoming_visit", { p_conversation: conversationId }),
  ]);
  if (error) return { slots: [], minutes: 30, error: translate(error.message) };
  const v = visit as { id: string | null; starts_at: string; ends_at: string } | null;
  const minutes = v?.id ? Math.round((Date.parse(v.ends_at) - Date.parse(v.starts_at)) / 60000) : 30;
  return { slots: (slots as string[]) ?? [], minutes, visit: v?.id ? { starts_at: v.starts_at } : undefined };
}

// Le client valide un créneau : visite confirmée immédiatement
export async function bookVisit(conversationId: string, start: string): Promise<{ ok?: true; error?: string }> {
  await requireProfile("chercheur");
  const supabase = await createClient();
  const { error } = await supabase.rpc("book_visit", { p_conversation: conversationId, p_start: start });
  if (error) return { error: translate(error.message) };
  revalidatePath("/messages");
  return { ok: true };
}

export type ScheduleState = { ok?: string; error?: string } | undefined;

// L'agent règle ses horaires de visite
export async function saveSchedule(_: ScheduleState, fd: FormData): Promise<ScheduleState> {
  const profile = await requireProfile("agence");
  const visit = Number(fd.get("visit_minutes"));
  const buffer = Number(fd.get("buffer_minutes"));
  const weekly: Weekly = {};
  for (const d of DAYS) {
    const open = fd.get(`open_${d.n}`) === "on";
    const from = String(fd.get(`from_${d.n}`) ?? "");
    const to = String(fd.get(`to_${d.n}`) ?? "");
    if (!open) {
      weekly[d.n] = null;
      continue;
    }
    if (!/^\d{2}:\d{2}$/.test(from) || !/^\d{2}:\d{2}$/.test(to) || from >= to)
      return { error: `${d.label} : l’heure de fin doit être après l’heure de début.` };
    weekly[d.n] = [from, to];
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("agent_schedules")
    .upsert({ agent_id: profile.id, visit_minutes: visit, buffer_minutes: buffer, weekly, updated_at: new Date().toISOString() });
  if (error) return { error: "Impossible d’enregistrer vos disponibilités. Vérifiez les valeurs." };
  revalidatePath("/espace-agence/disponibilites");
  return { ok: "Disponibilités enregistrées ✓" };
}
