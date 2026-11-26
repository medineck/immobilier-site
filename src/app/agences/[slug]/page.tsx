import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListingGrid } from "@/components/listings/listing-card";
import { getAgencyPage } from "@/lib/public-data";

export async function generateMetadata({ params }: PageProps<"/agences/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getAgencyPage(slug);
  if (!data) return { title: "Agence introuvable" };
  return { title: `${data.agency.name} — ${data.agency.city}`, description: `Toutes les annonces de ${data.agency.name} à ${data.agency.city}.` };
}

async function Agency({ params }: { params: PageProps<"/agences/[slug]">["params"] }) {
  const { slug } = await params;
  const data = await getAgencyPage(slug);
  if (!data) notFound();
  const { agency, listings } = data;
  const rent = listings.filter((l) => l.type === "location");
  const sale = listings.filter((l) => l.type === "vente");

  return (
    <>
      <div className="flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-500 text-2xl font-bold text-white">{agency.name.charAt(0).toUpperCase()}</span>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{agency.name}</h1>
          <p className="text-muted">Agence immobilière · {agency.city}</p>
        </div>
      </div>
      {agency.description && <p className="mt-6 max-w-3xl whitespace-pre-line text-ink/90">{agency.description}</p>}
      <p className="mt-6 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
        Un bien vous intéresse ? Ouvrez l’annonce et écrivez à l’agence : elle vous proposera des créneaux de visite.
      </p>

      {listings.length === 0 && <p className="mt-10 text-muted">Cette agence n’a pas d’annonce en ligne pour le moment.</p>}
      {rent.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">
            À louer <span className="text-muted">({rent.length})</span>
          </h2>
          <ListingGrid listings={rent} showAgency={false} />
        </section>
      )}
      {sale.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">
            À vendre <span className="text-muted">({sale.length})</span>
          </h2>
          <ListingGrid listings={sale} showAgency={false} />
        </section>
      )}
    </>
  );
}

export default function Page(props: PageProps<"/agences/[slug]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-surface" />}>
        <Agency params={props.params} />
      </Suspense>
    </div>
  );
}
