import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fmtVisit } from "@/lib/visits";
import { VisitActions } from "@/components/visits/visit-actions";

// Visites à venir du chercheur
async function MyVisits() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("visits")
    .select("id, starts_at, listing_title, conversation_id, agency:agencies(name)")
    .eq("status", "confirmee")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at");
  const visits = (data ?? []) as unknown as { id: string; starts_at: string; listing_title: string; conversation_id: string; agency: { name: string } | null }[];
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Mes visites à venir</h2>
      {visits.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
          Aucune visite prévue. Écrivez à une agence depuis une annonce : elle vous proposera des créneaux.
        </p>
      ) : (
        <ul className="mt-3 grid gap-3">
          {visits.map((v) => (
            <li key={v.id} className="rounded-2xl border border-line p-4">
              <p className="font-semibold first-letter:uppercase">📅 {fmtVisit(v.starts_at)}</p>
              <p className="text-sm text-muted">
                {v.listing_title} · {v.agency?.name}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                <Link href={`/messages/${v.conversation_id}`} className="text-sm font-medium text-brand-700 hover:underline">
                  Conversation avec l’agence →
                </Link>
                <VisitActions visitId={v.id} label={fmtVisit(v.starts_at)} canMove={false} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export const metadata: Metadata = { title: "Mon compte" };

async function Account() {
  const p = await requireProfile("chercheur");
  return (
    <>
      <h1 className="text-2xl font-bold sm:text-3xl">Bonjour {p.full_name} 👋</h1>
      <p className="mt-2 text-muted">Bienvenue dans votre espace.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-line p-6">
          <h2 className="font-semibold">Mes informations</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div><dt className="text-muted">Nom</dt><dd className="font-medium">{p.full_name}</dd></div>
            <div><dt className="text-muted">Email</dt><dd className="font-medium">{p.email}</dd></div>
            <div><dt className="text-muted">Téléphone</dt><dd className="font-medium">{p.phone ?? "—"}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-muted">Ces coordonnées sont transmises uniquement aux agences que vous contactez.</p>
        </section>
        <section className="rounded-2xl border border-line p-6">
          <h2 className="font-semibold">Mes messages et visites</h2>
          <p className="mt-2 text-sm text-muted">Retrouvez vos conversations avec les agences, et choisissez vos créneaux de visite.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/messages" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              Mes messages
            </Link>
            <Link href="/annonces" className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-surface">
              Voir les annonces
            </Link>
          </div>
        </section>
      </div>
      <MyVisits />
    </>
  );
}

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-surface" />}>
        <Account />
      </Suspense>
    </div>
  );
}
