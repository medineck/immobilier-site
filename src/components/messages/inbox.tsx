import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Profile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getInbox, getThread, shortDate } from "@/lib/messaging";
import { formatPrice, photoUrl } from "@/lib/listings";
import { markRead } from "@/app/actions/messages";
import { Thread } from "./thread";

// Liste des conversations (chercheur ou agence)
export async function InboxList({ profile, basePath }: { profile: Profile; basePath: string }) {
  const items = await getInbox(profile);
  const isAgency = profile.role === "agence";

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-10 text-center">
        <p className="font-medium">Aucune conversation pour le moment.</p>
        <p className="mt-1 text-sm text-muted">
          {isAgency
            ? "Les messages des personnes intéressées par vos annonces arriveront ici."
            : "Ouvrez une annonce et cliquez sur « Contacter l’agence » pour démarrer une conversation."}
        </p>
        {!isAgency && (
          <Link href="/annonces" className="mt-4 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            Voir les annonces
          </Link>
        )}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
      {items.map((c) => (
        <li key={c.id}>
          <Link href={`${basePath}/${c.id}`} className={`flex gap-3 p-4 hover:bg-surface ${c.unread ? "bg-brand-50/60" : ""}`}>
            <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-surface">
              {c.cover && <Image src={photoUrl(c.cover)} alt="" fill sizes="56px" className="object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className={`truncate ${c.unread ? "font-bold" : "font-semibold"}`}>{c.counterpart}</p>
                <span className={`shrink-0 text-xs ${c.unread ? "font-semibold text-brand-700" : "text-muted"}`}>{shortDate(c.last_message_at)}</span>
              </div>
              <p className="truncate text-sm text-muted">{c.listing_title}</p>
              <p className={`mt-0.5 truncate text-sm ${c.unread ? "font-medium text-ink" : "text-muted"}`}>
                {c.last_sender_id === profile.id && "Vous : "}
                {c.last_message_preview}
              </p>
              {isAgency && profile.agency_role === "directeur" && c.agentName && <p className="mt-1 text-xs text-muted">Agent : {c.agentName}</p>}
            </div>
            {c.unread && <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-brand-500" aria-label="Non lu" />}
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Une conversation ouverte
export async function ConversationView({ id, profile, basePath, justSent }: { id: string; profile: Profile; basePath: string; justSent?: boolean }) {
  const thread = await getThread(id);
  if (!thread) notFound();
  const { conversation: c, messages } = thread;
  await markRead(c.id);

  const isAgency = profile.role === "agence";
  const names: Record<string, string> = { [c.seeker.id]: c.seeker.full_name };
  if (isAgency && profile.agency) {
    const supabase = await createClient();
    const { data: team } = await supabase.from("profiles").select("id, full_name").eq("agency_id", profile.agency.id);
    for (const m of team ?? []) names[m.id] = `${m.full_name} · ${c.agency.name}`;
  }
  const l = c.listing;

  return (
    <div className="flex flex-col">
      <div className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link href={basePath} className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-surface" aria-label="Retour aux messages">
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{isAgency ? c.seeker.full_name : c.agency.name}</p>
            {l?.published ? (
              <Link href={`/annonces/${l.id}`} className="block truncate text-sm text-brand-700 hover:underline">
                {l.title} · {formatPrice(l.price, l.type)}
              </Link>
            ) : (
              <p className="truncate text-sm text-muted">{c.listing_title}{l ? "" : " (annonce retirée)"}</p>
            )}
          </div>
          {l?.photos?.[0] && (
            <div className="relative hidden size-12 shrink-0 overflow-hidden rounded-lg sm:block">
              <Image src={photoUrl(l.photos[0])} alt="" fill sizes="48px" className="object-cover" />
            </div>
          )}
        </div>
        {isAgency && (
          <div className="mx-auto max-w-3xl px-4 pb-3">
            <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-xl bg-surface px-4 py-2.5 text-sm">
              <span className="font-medium">Coordonnées :</span>
              <a href={`mailto:${c.seeker.email}`} className="text-brand-700 hover:underline">
                {c.seeker.email}
              </a>
              {c.seeker.phone && (
                <a href={`tel:${c.seeker.phone.replace(/\s/g, "")}`} className="text-brand-700 hover:underline">
                  {c.seeker.phone}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="mx-auto flex w-full max-w-3xl flex-col px-4">
        {justSent && !isAgency && (
          <p role="status" className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
            Message envoyé ✓ L’agence vous répondra ici, et vous serez prévenu(e) par email.
          </p>
        )}
        <Thread conversationId={c.id} initialMessages={messages} currentUserId={profile.id} names={names} fallbackName={c.agency.name} isSeeker={!isAgency} />
      </div>
    </div>
  );
}
