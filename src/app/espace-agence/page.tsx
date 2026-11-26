import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { requireProfile, type Profile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cancelInvitation } from "@/app/actions/auth";
import { InviteForm } from "@/components/forms/invite-form";
import { CopyButton } from "@/components/copy-button";

export const metadata: Metadata = { title: "Espace agence" };

async function Team({ profile }: { profile: Profile }) {
  const supabase = await createClient();
  const [{ data: members }, { data: invitations }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, phone, agency_role").eq("agency_id", profile.agency!.id).order("created_at"),
    supabase.from("agency_invitations").select("id, email, token").is("accepted_at", null).order("created_at"),
  ]);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  return (
    <section className="rounded-2xl border border-line p-6">
      <h2 className="text-lg font-semibold">Mon équipe</h2>
      <ul className="mt-4 divide-y divide-line">
        {members?.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div>
              <p className="font-medium">{m.full_name}{m.id === profile.id && <span className="text-muted"> (vous)</span>}</p>
              <p className="text-sm text-muted">{m.email} · {m.phone ?? "—"}</p>
            </div>
            <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium">{m.agency_role === "directeur" ? "Directeur" : "Agent"}</span>
          </li>
        ))}
      </ul>

      {profile.agency_role === "directeur" && (
        <div className="mt-6 border-t border-line pt-6">
          <h3 className="font-semibold">Inviter un agent</h3>
          <p className="mt-1 mb-3 text-sm text-muted">
            Saisissez son email : un lien d’invitation est créé. Envoyez-le-lui (email, SMS…). Bientôt, il sera envoyé automatiquement.
          </p>
          <InviteForm />
          {!!invitations?.length && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold">Invitations en attente</h4>
              <ul className="mt-2 grid gap-2">
                {invitations.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-4 py-3">
                    <span className="text-sm font-medium break-all">{i.email}</span>
                    <span className="flex gap-2">
                      <CopyButton text={`${origin}/invitation/${i.token}`} />
                      <form action={cancelInvitation}>
                        <input type="hidden" name="id" value={i.id} />
                        <button className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50">Annuler</button>
                      </form>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

async function Dashboard() {
  const profile = await requireProfile("agence");
  if (!profile.agency) {
    return <p className="text-muted">Votre compte n’est rattaché à aucune agence. Contactez votre directeur.</p>;
  }
  return (
    <>
      <p className="text-sm font-medium text-brand-600">{profile.agency.name} · {profile.agency.city}</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Bonjour {profile.full_name} 👋</h1>
      <p className="mt-2 text-muted">
        Vous êtes connecté(e) en tant que <strong className="text-ink">{profile.agency_role === "directeur" ? "directeur" : "agent"}</strong>.
      </p>
      <Link href={`/agences/${profile.agency.slug}`} className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">
        Voir la page publique de l’agence →
      </Link>

      <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Team profile={profile} />
        <aside className="grid content-start gap-4">
          <Link href="/espace-agence/annonces" className="rounded-2xl border border-line p-5 hover:border-brand-500 hover:bg-brand-50">
            <p className="font-semibold">Annonces →</p>
            <p className="text-sm text-muted">Créer et gérer les annonces de l’agence</p>
          </Link>
          {[
            { t: "Messages", d: "Les demandes des chercheurs", s: 5 },
            { t: "Agenda", d: "Vos visites confirmées", s: 7 },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border border-dashed border-line p-5">
              <p className="font-semibold">{c.t}</p>
              <p className="text-sm text-muted">{c.d}</p>
              <p className="mt-2 text-xs text-brand-700">Bientôt · étape {c.s}</p>
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-surface" />}>
        <Dashboard />
      </Suspense>
    </div>
  );
}
