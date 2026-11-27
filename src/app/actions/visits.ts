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

export type SlotsResult = { slots: string[]; minutes: number; visit?: { id: string; starts_at: string }; error?: string };

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
  return { slots: (slots as string[]) ?? [], minutes, visit: v?.id ? { id: v.id, starts_at: v.starts_at } : undefined };
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

const AGENDA_ERRORS: Record<string, string> = {
  VISITE_PASSEE: "Cette visite est passée ou déjà annulée.",
  FIN_AVANT_DEBUT: "La fin doit être après le début.",
};
const agendaError = (msg?: string) => (msg && Object.entries(AGENDA_ERRORS).find(([k]) => msg.includes(k))?.[1]) ?? "Action impossible. Réessayez.";

function refreshVisits() {
  revalidatePath("/espace-agence/agenda");
  revalidatePath("/mon-compte");
}

// Annuler une visite (client ou agence)
export async function cancelVisit(visitId: string): Promise<{ ok?: true; error?: string }> {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_visit", { p_visit: visitId });
  if (error) return { error: agendaError(error.message) };
  refreshVisits();
  return { ok: true };
}

// Déplacer une visite (agence) : le client reçoit une nouvelle fenêtre de créneaux
export async function moveVisit(visitId: string): Promise<{ ok?: true; error?: string }> {
  await requireProfile("agence");
  const supabase = await createClient();
  const { error } = await supabase.rpc("move_visit", { p_visit: visitId });
  if (error) return { error: agendaError(error.message) };
  refreshVisits();
  return { ok: true };
}

export type TimeOffState = { ok?: string; error?: string } | undefined;

// Bloquer un moment dans son agenda (heures de Paris)
export async function addTimeOff(_: TimeOffState, fd: FormData): Promise<TimeOffState> {
  await requireProfile("agence");
  const start = `${fd.get("start_date")}T${fd.get("start_time") || "00:00"}`;
  const end = `${fd.get("end_date")}T${fd.get("end_time") || "23:59"}`;
  const re = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
  if (!re.test(start) || !re.test(end)) return { error: "Indiquez les dates de début et de fin." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_time_off", { p_start: start, p_end: end, p_reason: String(fd.get("reason") ?? "") });
  if (error) return { error: error.message.includes("FIN_AVANT_DEBUT") ? AGENDA_ERRORS.FIN_AVANT_DEBUT : "Impossible d’enregistrer ce moment (120 jours maximum)." };
  revalidatePath("/espace-agence/agenda");
  return { ok: "Moment bloqué ✓ Aucun client ne pourra réserver pendant cette période." };
}

export async function deleteTimeOff(fd: FormData) {
  await requireProfile("agence");
  const supabase = await createClient();
  await supabase.from("time_off").delete().eq("id", String(fd.get("id") ?? ""));
  revalidatePath("/espace-agence/agenda");
}
