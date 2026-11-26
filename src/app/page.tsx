import Link from "next/link";
import { Suspense } from "react";
import { SearchForm } from "@/components/search-form";
import { ListingGrid } from "@/components/listings/listing-card";
import { getLatestListings } from "@/lib/public-data";

async function Latest() {
  const listings = await getLatestListings(6);
  if (listings.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pt-16">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="text-2xl font-bold sm:text-3xl">Dernières annonces</h2>
        <Link href="/annonces" className="text-sm font-medium text-brand-600 hover:underline">
          Tout voir →
        </Link>
      </div>
      <ListingGrid listings={listings} />
    </section>
  );
}

const steps = [
  { title: "Écrivez à l’agence", text: "Depuis l’annonce, envoyez votre message en un clic. Fini l’attente au téléphone." },
  { title: "Choisissez un créneau", text: "L’agent vous propose plusieurs dates de visite. Vous validez celle qui vous convient." },
  { title: "Visitez", text: "La visite est confirmée par email et ajoutée à l’agenda de l’agent. C’est tout." },
];

const villes = ["Paris", "Lyon", "Marseille", "Bordeaux", "Toulouse", "Nantes", "Lille", "Montpellier"];

export default function Home() {
  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-6xl px-4 pt-12 pb-12 sm:pt-20 sm:pb-16">
          <div className="max-w-2xl">
            <h1 className="text-3xl leading-tight font-bold tracking-tight sm:text-5xl">
              Trouvez un logement. Réservez la visite <span className="text-brand-600">par écrit.</span>
            </h1>
            <p className="mt-4 text-lg text-muted">
              Contactez les agences depuis l’annonce, recevez des créneaux de visite et confirmez en un clic. Sans un seul appel.
            </p>
          </div>
          <div className="mt-8 max-w-3xl">
            <SearchForm />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {villes.map((v) => (
              <Link
                key={v}
                href={`/annonces?ville=${encodeURIComponent(v)}&type=location`}
                className="rounded-full bg-white px-3 py-1.5 text-sm text-muted ring-1 ring-line hover:text-ink hover:ring-brand-500"
              >
                {v}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Suspense>
        <Latest />
      </Suspense>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold sm:text-3xl">Comment ça marche ?</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-line p-6">
              <span className="grid size-9 place-items-center rounded-full bg-brand-500 font-semibold text-white">{i + 1}</span>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="flex flex-col gap-6 rounded-2xl bg-ink p-8 text-white sm:p-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold">Vous êtes une agence immobilière ?</h2>
            <p className="mt-2 text-white/75">
              Publiez vos annonces, répondez aux demandes par écrit et retrouvez toutes vos visites dans l’agenda de chaque agent.
            </p>
          </div>
          <Link href="/inscription?role=agence" className="shrink-0 rounded-xl bg-white px-6 py-3 text-center font-semibold text-ink hover:bg-brand-50">
            Créer l’espace de mon agence
          </Link>
        </div>
      </section>
    </>
  );
}
