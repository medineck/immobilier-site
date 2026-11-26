import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Gallery } from "@/components/listings/gallery";
import { formatPrice, formatRooms, formatSurface, photoUrl } from "@/lib/listings";
import { getPublicListing } from "@/lib/public-data";

export async function generateMetadata({ params }: PageProps<"/annonces/[id]">): Promise<Metadata> {
  const { id } = await params;
  const l = await getPublicListing(id);
  if (!l) return { title: "Annonce introuvable" };
  const summary = `${formatPrice(l.price, l.type)} · ${formatRooms(l.rooms)} · ${formatSurface(l.surface)} · ${l.city}`;
  return {
    title: l.title,
    description: `${summary}. ${l.description.slice(0, 140)}`,
    openGraph: { title: l.title, description: summary, images: l.photos[0] ? [photoUrl(l.photos[0])] : [] },
  };
}

async function ListingDetail({ params }: { params: PageProps<"/annonces/[id]">["params"] }) {
  const { id } = await params;
  const l = await getPublicListing(id);
  if (!l) notFound();
  const pricePerM2 = l.type === "vente" ? Math.round(l.price / l.surface) : null;

  return (
    <>
      <nav className="mb-4 text-sm text-muted">
        <Link href={`/annonces?type=${l.type}&ville=${encodeURIComponent(l.city)}`} className="hover:text-ink">
          ← {l.type === "vente" ? "Biens à acheter" : "Logements à louer"} à {l.city}
        </Link>
      </nav>
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <Gallery photos={l.photos} title={l.title} />
          <div className="mt-6">
            <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">
              {l.type === "vente" ? "À vendre" : "À louer"} · {l.city}
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{l.title}</h1>
            <p className="mt-3 text-2xl font-bold">{formatPrice(l.price, l.type)}</p>
            {pricePerM2 && <p className="text-sm text-muted">{new Intl.NumberFormat("fr-FR").format(pricePerM2)} € / m²</p>}
          </div>
          <dl className="mt-6 grid grid-cols-3 gap-3">
            {[
              { k: "Surface", v: formatSurface(l.surface) },
              { k: "Pièces", v: String(l.rooms) },
              { k: "Ville", v: l.city },
            ].map((x) => (
              <div key={x.k} className="rounded-xl bg-surface p-3">
                <dt className="text-xs text-muted">{x.k}</dt>
                <dd className="mt-0.5 font-semibold break-words">{x.v}</dd>
              </div>
            ))}
          </dl>
          {l.description && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold">Description</h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-ink/90">{l.description}</p>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-line p-5 shadow-sm">
            <p className="text-sm text-muted">Annonce publiée par</p>
            <Link href={`/agences/${l.agency.slug}`} className="mt-1 block text-lg font-semibold hover:text-brand-700">
              {l.agency.name}
            </Link>
            <p className="text-sm text-muted">{l.agency.city}</p>
            <Link
              href={`/annonces/${l.id}/contact`}
              className="mt-5 block rounded-xl bg-brand-500 px-5 py-3 text-center font-semibold text-white hover:bg-brand-600"
            >
              Contacter l’agence / demander une visite
            </Link>
            <p className="mt-3 text-center text-xs text-muted">Pas d’appel : l’agence vous répond par écrit et vous propose des créneaux.</p>
            <Link href={`/agences/${l.agency.slug}`} className="mt-4 block text-center text-sm font-medium text-brand-600 hover:underline">
              Voir toutes les annonces de l’agence
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}

export default function Page(props: PageProps<"/annonces/[id]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Suspense fallback={<div className="aspect-[16/9] animate-pulse rounded-2xl bg-surface" />}>
        <ListingDetail params={props.params} />
      </Suspense>
    </div>
  );
}
