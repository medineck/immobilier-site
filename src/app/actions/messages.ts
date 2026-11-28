"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile, requireProfile } from "@/lib/auth";
import { countUnread, type Message } from "@/lib/messaging";
import { notifyNewMessage } from "@/lib/email/notify";

export type ContactState = { error?: string; body?: string } | undefined;

// Premier message du chercheur, envoyé depuis l'annonce
export async function contactAgency(_: ContactState, fd: FormData): Promise<ContactState> {
  const profile = await requireProfile("chercheur");
  const listingId = String(fd.get("listing_id") ?? "");
  const body = String(fd.get("body") ?? "").trim();
  if (!body) return { error: "Écrivez votre message.", body };
  if (body.length > 4000) return { error: "Votre message est trop long (4000 caractères maximum).", body };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("contact_agency", { p_listing: listingId, p_body: body });
  if (error || !data) return { error: "Impossible d’envoyer le message : l’annonce n’est peut-être plus en ligne.", body };
  // Email à l'agent : premier message de la conversation ?
  const { count } = await supabase.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", data);
  after(() => notifyNewMessage(supabase, data, profile.id, body, count === 1));
  revalidatePath("/messages");
  redirect(`/messages/${data}?envoye=1`);
}

// Message suivant dans une conversation (chercheur ou agence)
export async function sendMessage(conversationId: string, body: string): Promise<{ message?: Message; error?: string }> {
  const profile = await requireProfile();
  const text = body.trim();
  if (!text) return { error: "Le message est vide." };
  if (text.length > 4000) return { error: "Message trop long (4000 caractères maximum)." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: profile.id, body: text })
    .select("*")
    .single();
  if (error || !data) return { error: "Le message n’a pas pu être envoyé. Réessayez." };
  after(() => notifyNewMessage(supabase, conversationId, profile.id, text, false));
  return { message: data as Message };
}

export async function markRead(conversationId: string) {
  await requireProfile();
  const supabase = await createClient();
  await supabase.rpc("mark_conversation_read", { p_conversation: conversationId });
}

// Nombre de conversations non lues (pour la pastille, mise à jour en direct)
export async function getUnreadCount(): Promise<number> {
  const profile = await getProfile();
  return profile ? countUnread(profile) : 0;
}
