import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchForm } from "@/components/search-form";

export const metadata: Metadata = { title: "Annonces" };

async function Results({ searchParams }: { searchParams: PageProps<"/annonces">["searchParams"] }) {
  const sp = await searchParams;
  const ville = typeof sp.ville === "string" ? sp.ville.trim() : "";
  const type = sp.type === "vente" ? "vente" : "location";
  return (
    <>
      <SearchForm defaultVille={ville} defaultType={type} />
      <h1 className="mt-10 text-2xl font-bold">
        {type === "vente" ? "Biens à acheter" : "Logements à louer"}
        {ville && <> à {ville}</>}
      </h1>
      <div className="mt-6 rounded-2xl border border-dashed border-line p-10 text-center text-muted">
        <p className="font-medium text-ink">Aucune annonce pour le moment.</p>
        <p className="mt-1 text-sm">Les annonces des agences apparaîtront ici à l’étape 4.</p>
      </div>
    </>
  );
}

export default function AnnoncesPage(props: PageProps<"/annonces">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-surface" />}>
        <Results searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
