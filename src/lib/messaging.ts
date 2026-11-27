import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth";

export type Conversation = {
  id: string;
  listing_id: string | null;
  listing_title: string;
  agency_id: string;
  agent_id: string | null;
  seeker_id: string;
  created_at: string;
  last_message_at: string;
  last_message_preview: string;
  last_sender_id: string | null;
  seeker_last_read_at: string;
  agency_last_read_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string;
  created_at: string;
  kind: "texte" | "proposition" | "visite_confirmee" | "visite_annulee";
  meta: Record<string, unknown>;
};

export type InboxItem = Conversation & {
  unread: boolean;
  counterpart: string; // nom affiché de l'autre partie
  agentName?: string;
  cover?: string;
};

// La conversation a-t-elle un message non lu pour cette personne ?
export function isUnread(c: Conversation, profile: Pick<Profile, "id" | "role">) {
  if (profile.role === "chercheur") return c.last_sender_id !== null && c.last_sender_id !== profile.id && c.last_message_at > c.seeker_last_read_at;
  return c.last_sender_id === c.seeker_id && c.last_message_at > c.agency_last_read_at;
}

export async function getInbox(profile: Profile): Promise<InboxItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("*, agency:agencies(name), seeker:profiles!conversations_seeker_id_fkey(full_name), listing:listings(photos)")
    .order("last_message_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as (Conversation & {
    agency: { name: string } | null;
    seeker: { full_name: string } | null;
    listing: { photos: string[] } | null;
  })[];

  let agents = new Map<string, string>();
  if (profile.role === "agence" && profile.agency) {
    const { data: team } = await supabase.from("profiles").select("id, full_name").eq("agency_id", profile.agency.id);
    agents = new Map((team ?? []).map((m) => [m.id, m.full_name]));
  }

  return rows.map(({ agency, seeker, listing, ...c }) => ({
    ...c,
    unread: isUnread(c, profile),
    counterpart: profile.role === "chercheur" ? (agency?.name ?? "Agence") : (seeker?.full_name ?? "Chercheur"),
    agentName: c.agent_id ? agents.get(c.agent_id) : undefined,
    cover: listing?.photos?.[0],
  }));
}

export async function countUnread(profile: Profile) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("seeker_id, last_sender_id, last_message_at, seeker_last_read_at, agency_last_read_at")
    .limit(500);
  return ((data ?? []) as Conversation[]).filter((c) => isUnread(c, profile)).length;
}

export async function getThread(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select(
      "*, agency:agencies(name, slug), seeker:profiles!conversations_seeker_id_fkey(id, full_name, email, phone), listing:listings(id, title, type, price, city, photos, published)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!conversation) return null;
  const { data: messages } = await supabase.from("messages").select("*").eq("conversation_id", id).order("created_at").limit(1000);
  return {
    conversation: conversation as Conversation & {
      agency: { name: string; slug: string };
      seeker: { id: string; full_name: string; email: string; phone: string | null };
      listing: { id: string; title: string; type: "location" | "vente"; price: number; city: string; photos: string[]; published: boolean } | null;
    },
    messages: (messages ?? []) as Message[],
  };
}

// Dates affichées à l'heure de Paris
const dayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
const dayKey = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });

export function shortDate(iso: string, now = new Date()) {
  const d = new Date(iso);
  return dayKey.format(d) === dayKey.format(now) ? timeFmt.format(d) : dayFmt.format(d);
}
