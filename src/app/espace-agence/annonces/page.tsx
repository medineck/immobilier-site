import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Listing } from "@/lib/listings";
import { ListingCardAdmin } from "@/components/listings/listing-card-admin";
import { Alert } from "@/components/forms/ui";

export const metadata: Metadata = { title: "Annonces de l’agence" };

const messages: Record<string, { kind: "ok" | "error"; text: string }> = {
  creee: { kind: "ok", text: "Annonce publiée ✓" },
  modifiee: { kind: "ok", text: "Modifications enregistrées ✓" },
  supprimee: { kind: "ok", text: "Annonce supprimée." },
  erreur: { kind: "error", text: "Action impossible : vous ne pouvez gérer que vos propres annonces." },
};

async function Listings({ searchParams }: { searchParams: PageProps<"/espace-agence/annonces">["searchParams"] }) {
  const profile = await requireProfile("agence");
  const { ok, filtre } = await searchParams;
  const supabase = await createClient();
  const [{ data: listings }, { data: members }] = await Promise.all([
    supabase.from("listings").select("*").eq("agency_id", profile.agency!.id).order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name").eq("agency_id", profile.agency!.id),
  ]);
  const names = new Map((members ?? []).map((m) => [m.id, m.full_name]));
  const isDirector = profile.agency_role === "directeur";
  const mine = filtre === "miennes";
  const shown = ((listings ?? []) as Listing[]).filter((l) => !mine || l.agent_id === profile.id);
  const msg = typeof ok === "string" ? messages[ok] : undefined;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Annonces</h1>
          <p className="mt-1 text-muted">
            {listings?.length ?? 0} annonce{(listings?.length ?? 0) > 1 ? "s" : ""} pour {profile.agency!.name}
          </p>
        </div>
        <Link href="/espace-agence/annonces/nouvelle" className="rounded-xl bg-brand-500 px-5 py-2.5 font-semibold text-white hover:bg-brand-600">
          + Nouvelle annonce
        </Link>
      </div>
      {msg && (
        <div className="mt-6">
          <Alert kind={msg.kind}>{msg.text}</Alert>
        </div>
      )}
      <div className="mt-6 flex gap-2 text-sm">
        <Link href="/espace-agence/annonces" className={`rounded-full px-3 py-1.5 ${!mine ? "bg-ink text-white" : "border border-line"}`}>
          Toute l’agence
        </Link>
        <Link href="/espace-agence/annonces?filtre=miennes" className={`rounded-full px-3 py-1.5 ${mine ? "bg-ink text-white" : "border border-line"}`}>
          Mes annonces
        </Link>
      </div>
      {shown.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line p-10 text-center">
          <p className="font-medium">Aucune annonce pour le moment.</p>
          <p className="mt-1 text-sm text-muted">Cliquez sur « Nouvelle annonce » pour publier votre premier bien.</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4">
          {shown.map((l) => (
            <ListingCardAdmin
              key={l.id}
              listing={l}
              agentName={l.agent_id ? names.get(l.agent_id) : "—"}
              canManage={isDirector || l.agent_id === profile.id}
            />
          ))}
        </ul>
      )}
    </>
  );
}

export default function Page(props: PageProps<"/espace-agence/annonces">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-surface" />}>
        <Listings searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
