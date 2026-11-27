import "server-only";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fmtVisit } from "@/lib/visits";
import { sendEmail } from "./send";
import { layout, visitIcs } from "./templates";

type Contacts = {
  seeker_id: string;
  seeker_email: string;
  seeker_name: string;
  agent_id: string | null;
  agent_email: string | null;
  agent_name: string | null;
  agency_name: string;
  listing_id: string | null;
  listing_title: string;
  listing_city: string;
};

// Adresse du site pour les liens des emails
export async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

async function contacts(supabase: SupabaseClient, conversationId: string) {
  const { data } = await supabase.rpc("notification_contacts", { p_conversation: conversationId });
  return (data?.[0] as Contacts | undefined) ?? null;
}

const firstName = (n?: string | null) => (n ?? "").split(" ")[0] || "Bonjour";
const excerpt = (s: string) => (s.length > 600 ? s.slice(0, 600) + "…" : s);

// Nouveau message (premier contact ou réponse) → l'autre partie
export async function notifyNewMessage(supabase: SupabaseClient, conversationId: string, senderId: string, body: string, first: boolean) {
  const c = await contacts(supabase, conversationId);
  if (!c) return;
  const url = await siteUrl();
  const fromSeeker = senderId === c.seeker_id;
  if (fromSeeker) {
    if (!c.agent_email) return;
    const { html, text } = layout({
      preheader: `${c.seeker_name} : ${body.slice(0, 80)}`,
      title: first ? `Nouvelle demande pour « ${c.listing_title} »` : `Nouveau message de ${c.seeker_name}`,
      blocks: [
        { kind: "p", text: `Bonjour ${firstName(c.agent_name)},` },
        { kind: "p", text: first ? `${c.seeker_name} vous a écrit au sujet de votre annonce « ${c.listing_title} » :` : `${c.seeker_name} vous a répondu au sujet de « ${c.listing_title} » :` },
        { kind: "quote", text: excerpt(body) },
        ...(first ? [{ kind: "p" as const, text: "Répondez-lui ou cliquez sur « Proposer une visite » : il choisira lui-même un créneau dans votre agenda." }] : []),
      ],
      button: { label: "Répondre", url: `${url}/espace-agence/messages/${conversationId}` },
    });
    await sendEmail({ to: c.agent_email, subject: first ? `Nouvelle demande : ${c.listing_title}` : `Message de ${c.seeker_name} — ${c.listing_title}`, html, text });
  } else {
    const { html, text } = layout({
      preheader: `${c.agency_name} : ${body.slice(0, 80)}`,
      title: `${c.agency_name} vous a répondu`,
      blocks: [
        { kind: "p", text: `Bonjour ${firstName(c.seeker_name)},` },
        { kind: "p", text: `Nouveau message au sujet de « ${c.listing_title} » :` },
        { kind: "quote", text: excerpt(body) },
      ],
      button: { label: "Lire et répondre", url: `${url}/messages/${conversationId}` },
    });
    await sendEmail({ to: c.seeker_email, subject: `${c.agency_name} vous a répondu — ${c.listing_title}`, html, text });
  }
}

// L'agence propose une visite → le chercheur
export async function notifyProposal(supabase: SupabaseClient, conversationId: string, moved = false, previousStart?: string) {
  const c = await contacts(supabase, conversationId);
  if (!c) return;
  const url = await siteUrl();
  const { html, text } = layout({
    preheader: moved ? "Choisissez une nouvelle date de visite" : "Choisissez votre créneau de visite en un clic",
    title: moved ? "Votre visite doit être déplacée" : "L’agence vous propose une visite",
    blocks: [
      { kind: "p", text: `Bonjour ${firstName(c.seeker_name)},` },
      {
        kind: "p",
        text: moved
          ? `${c.agency_name} doit déplacer votre visite${previousStart ? ` du ${fmtVisit(previousStart)}` : ""} pour « ${c.listing_title} ». Choisissez une nouvelle date parmi les créneaux disponibles.`
          : `${c.agency_name} vous propose de visiter « ${c.listing_title} » (${c.listing_city}). Choisissez le créneau qui vous convient : la visite est confirmée immédiatement.`,
      },
    ],
    button: { label: "Choisir mon créneau", url: `${url}/messages/${conversationId}` },
  });
  await sendEmail({ to: c.seeker_email, subject: moved ? `Visite à déplacer — ${c.listing_title}` : `Choisissez votre créneau de visite — ${c.listing_title}`, html, text });
}

type VisitInfo = { id: string; starts_at: string; ends_at: string };

// Visite confirmée → le chercheur et l'agent, avec le fichier agenda
export async function notifyVisitConfirmed(supabase: SupabaseClient, conversationId: string, visit: VisitInfo) {
  const c = await contacts(supabase, conversationId);
  if (!c) return;
  const url = await siteUrl();
  const when = fmtVisit(visit.starts_at);
  const minutes = Math.round((Date.parse(visit.ends_at) - Date.parse(visit.starts_at)) / 60000);
  const box = { kind: "box" as const, lines: [`📅 ${when[0].toUpperCase()}${when.slice(1)} (${minutes} min)`, `🏠 ${c.listing_title}`, `📍 ${c.listing_city}`] };
  const ics = (description: string) => [
    {
      filename: "visite.ics",
      contentType: "text/calendar; charset=utf-8; method=PUBLISH",
      content: visitIcs({ id: visit.id, start: visit.starts_at, end: visit.ends_at, title: `Visite — ${c.listing_title}`, location: c.listing_city, description }),
    },
  ];

  const toSeeker = layout({
    preheader: `Votre visite est confirmée : ${when}`,
    title: "Votre visite est confirmée ✅",
    blocks: [
      { kind: "p", text: `Bonjour ${firstName(c.seeker_name)},` },
      { kind: "p", text: `Votre visite avec ${c.agency_name} est confirmée :` },
      box,
      { kind: "p", text: "Ouvrez le fichier joint pour l’ajouter à votre agenda. Un empêchement ? Vous pouvez annuler depuis la conversation." },
    ],
    button: { label: "Voir la conversation", url: `${url}/messages/${conversationId}` },
  });
  await sendEmail({ to: c.seeker_email, subject: `Visite confirmée — ${when}`, ...toSeeker, attachments: ics(`Visite avec ${c.agency_name}. Conversation : ${url}/messages/${conversationId}`) });

  if (c.agent_email) {
    const toAgent = layout({
      preheader: `${c.seeker_name} a réservé : ${when}`,
      title: "Nouvelle visite dans votre agenda",
      blocks: [
        { kind: "p", text: `Bonjour ${firstName(c.agent_name)},` },
        { kind: "p", text: `${c.seeker_name} a réservé une visite :` },
        box,
      ],
      button: { label: "Voir mon agenda", url: `${url}/espace-agence/agenda` },
    });
    await sendEmail({ to: c.agent_email, subject: `Nouvelle visite — ${when} — ${c.seeker_name}`, ...toAgent, attachments: ics(`Visite avec ${c.seeker_name}. Conversation : ${url}/espace-agence/messages/${conversationId}`) });
  }
}

// Visite annulée → l'autre partie
export async function notifyVisitCancelled(supabase: SupabaseClient, conversationId: string, visit: VisitInfo, bySeeker: boolean) {
  const c = await contacts(supabase, conversationId);
  if (!c) return;
  const url = await siteUrl();
  const when = fmtVisit(visit.starts_at);
  if (bySeeker) {
    if (!c.agent_email) return;
    const { html, text } = layout({
      preheader: `${c.seeker_name} a annulé la visite du ${when}`,
      title: "Visite annulée par le client",
      blocks: [
        { kind: "p", text: `Bonjour ${firstName(c.agent_name)},` },
        { kind: "p", text: `${c.seeker_name} a annulé la visite du ${when} pour « ${c.listing_title} ». Le créneau est de nouveau libre dans votre agenda.` },
      ],
      button: { label: "Voir la conversation", url: `${url}/espace-agence/messages/${conversationId}` },
    });
    await sendEmail({ to: c.agent_email, subject: `Visite annulée — ${when} — ${c.seeker_name}`, html, text });
  } else {
    const { html, text } = layout({
      preheader: `${c.agency_name} a annulé la visite du ${when}`,
      title: "Votre visite a été annulée",
      blocks: [
        { kind: "p", text: `Bonjour ${firstName(c.seeker_name)},` },
        { kind: "p", text: `${c.agency_name} a annulé la visite du ${when} pour « ${c.listing_title} ». Vous pouvez lui écrire pour convenir d’une autre date.` },
      ],
      button: { label: "Écrire à l’agence", url: `${url}/messages/${conversationId}` },
    });
    await sendEmail({ to: c.seeker_email, subject: `Visite annulée — ${c.listing_title}`, html, text });
  }
}

// Invitation d'un agent par son directeur
export async function notifyInvitation(email: string, agencyName: string, inviterName: string, link: string) {
  const { html, text } = layout({
    preheader: `${inviterName} vous invite à rejoindre ${agencyName}`,
    title: `Rejoignez ${agencyName}`,
    blocks: [
      { kind: "p", text: "Bonjour," },
      { kind: "p", text: `${inviterName} vous invite à rejoindre l’équipe de ${agencyName} en tant qu’agent : vous pourrez gérer vos annonces, répondre aux clients et retrouver vos visites dans votre agenda.` },
      { kind: "p", text: "Il vous suffit de choisir votre mot de passe :" },
    ],
    button: { label: "Rejoindre l’agence", url: link },
    footer: "Vous n’attendiez pas cette invitation ? Ignorez simplement cet email.",
  });
  await sendEmail({ to: email, subject: `${inviterName} vous invite à rejoindre ${agencyName}`, html, text });
}

// Rappel la veille de la visite (appelé par la tâche quotidienne)
export async function sendReminder(r: {
  visit: VisitInfo;
  conversation_id: string;
  listing_title: string;
  city: string;
  agency_name: string;
  seeker: { email: string; full_name: string };
  agent: { email: string; full_name: string } | null;
  url: string;
}) {
  const when = fmtVisit(r.visit.starts_at);
  const box = { kind: "box" as const, lines: [`📅 ${when[0].toUpperCase()}${when.slice(1)}`, `🏠 ${r.listing_title}`, `📍 ${r.city}`] };
  const s = layout({
    preheader: `Rappel : visite demain, ${when}`,
    title: "Rappel : votre visite est demain",
    blocks: [{ kind: "p", text: `Bonjour ${firstName(r.seeker.full_name)},` }, { kind: "p", text: `Petit rappel de votre visite avec ${r.agency_name} :` }, box],
    button: { label: "Voir la conversation", url: `${r.url}/messages/${r.conversation_id}` },
  });
  await sendEmail({ to: r.seeker.email, subject: `Rappel : visite demain — ${r.listing_title}`, ...s });
  if (r.agent) {
    const a = layout({
      preheader: `Rappel : visite demain avec ${r.seeker.full_name}`,
      title: "Rappel : visite demain",
      blocks: [{ kind: "p", text: `Bonjour ${firstName(r.agent.full_name)},` }, { kind: "p", text: `Visite prévue avec ${r.seeker.full_name} :` }, box],
      button: { label: "Voir mon agenda", url: `${r.url}/espace-agence/agenda` },
    });
    await sendEmail({ to: r.agent.email, subject: `Rappel : visite demain — ${r.seeker.full_name}`, ...a });
  }
}
