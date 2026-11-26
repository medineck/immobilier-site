import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Contacter l’agence" };

async function Back({ params }: { params: PageProps<"/annonces/[id]/contact">["params"] }) {
  const { id } = await params;
  return (
    <Link href={`/annonces/${id}`} className="mt-8 inline-block rounded-lg border border-line px-4 py-2 font-medium hover:bg-surface">
      ← Retour à l’annonce
    </Link>
  );
}

// Provisoire : la messagerie arrive à l'étape 5
export default function Page(props: PageProps<"/annonces/[id]/contact">) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="mb-3 inline-block rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">Bientôt disponible · étape 5</p>
      <h1 className="text-2xl font-bold sm:text-3xl">Écrire à l’agence</h1>
      <p className="mt-3 text-muted">Vous pourrez bientôt écrire à l’agence ici et choisir un créneau de visite, sans appeler.</p>
      <Suspense>
        <Back params={props.params} />
      </Suspense>
    </div>
  );
}
