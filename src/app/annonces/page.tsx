import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SearchForm } from "@/components/search-form";
import { ListingGrid } from "@/components/listings/listing-card";
import { PAGE_SIZE, searchListings } from "@/lib/public-data";

export const metadata: Metadata = { title: "Annonces", description: "Logements à louer et à acheter : contactez l’agence et réservez votre visite par écrit." };

const SORTS = [
  { value: "recent", label: "Plus récentes" },
  { value: "prix-asc", label: "Prix croissant" },
  { value: "prix-desc", label: "Prix décroissant" },
] as const;

type Sort = (typeof SORTS)[number]["value"];

function href(p: { ville: string; type: string; tri: string; page?: number }) {
  const sp = new URLSearchParams({ type: p.type });
  if (p.ville) sp.set("ville", p.ville);
  if (p.tri !== "recent") sp.set("tri", p.tri);
  if (p.page && p.page > 1) sp.set("page", String(p.page));
  return `/annonces?${sp}`;
}

async function Results({ searchParams }: { searchParams: PageProps<"/annonces">["searchParams"] }) {
  const sp = await searchParams;
  const ville = typeof sp.ville === "string" ? sp.ville.trim().slice(0, 80) : "";
  const type = sp.type === "vente" ? "vente" : "location";
  const tri: Sort = SORTS.some((s) => s.value === sp.tri) ? (sp.tri as Sort) : "recent";
  const page = Math.max(1, Math.min(500, Number(sp.page) || 1));
  const { listings, total } = await searchListings({ type, ville, tri, page });
  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <SearchForm defaultVille={ville} defaultType={type} />
      <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {type === "vente" ? "Biens à acheter" : "Logements à louer"}
            {ville && <> à {ville}</>}
          </h1>
          <p className="mt-1 text-muted">
            {total} annonce{total > 1 ? "s" : ""}
          </p>
        </div>
        {total > 1 && (
          <nav className="flex flex-wrap gap-2 text-sm" aria-label="Trier">
            {SORTS.map((s) => (
              <Link
                key={s.value}
                href={href({ ville, type, tri: s.value })}
                aria-current={tri === s.value ? "true" : undefined}
                className={`rounded-full px-3 py-1.5 ${tri === s.value ? "bg-ink text-white" : "border border-line hover:bg-surface"}`}
              >
                {s.label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {listings.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line p-10 text-center">
          <p className="font-medium">Aucune annonce ne correspond à votre recherche.</p>
          <p className="mt-1 text-sm text-muted">Essayez une ville voisine, ou {type === "vente" ? "la location" : "l’achat"}.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href={href({ ville, type: type === "vente" ? "location" : "vente", tri })} className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-surface">
              Voir les biens {type === "vente" ? "à louer" : "à vendre"}
              {ville && <> à {ville}</>}
            </Link>
            {ville && (
              <Link href={href({ ville: "", type, tri })} className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-surface">
                Toutes les villes
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <ListingGrid listings={listings} />
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pages">
          {page > 1 && (
            <Link href={href({ ville, type, tri, page: page - 1 })} className="rounded-lg border border-line px-4 py-2 font-medium hover:bg-surface">
              ← Précédente
            </Link>
          )}
          <span className="text-sm text-muted">
            Page {page} sur {pages}
          </span>
          {page < pages && (
            <Link href={href({ ville, type, tri, page: page + 1 })} className="rounded-lg border border-line px-4 py-2 font-medium hover:bg-surface">
              Suivante →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}

export default function AnnoncesPage(props: PageProps<"/annonces">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
        <Results searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
