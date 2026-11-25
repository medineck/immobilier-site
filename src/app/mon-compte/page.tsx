import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";

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
        <section className="rounded-2xl border border-dashed border-line p-6">
          <h2 className="font-semibold">Mes messages et visites</h2>
          <p className="mt-2 text-sm text-muted">Vos conversations avec les agences et vos visites apparaîtront ici (étapes 5 à 7).</p>
          <Link href="/annonces" className="mt-4 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            Voir les annonces
          </Link>
        </section>
      </div>
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
