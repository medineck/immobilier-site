import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPublicListing } from "@/lib/public-data";
import { formatPrice, formatRooms, formatSurface, photoUrl } from "@/lib/listings";
import { ContactForm } from "@/components/messages/contact-form";

export const metadata: Metadata = { title: "Contacter l’agence" };

async function Contact({ params }: { params: PageProps<"/annonces/[id]/contact">["params"] }) {
  const { id } = await params;
  const listing = await getPublicListing(id);
  if (!listing) notFound();
  const profile = await getProfile();
  const back = `/annonces/${listing.id}/contact`;

  // Déjà une conversation sur cette annonce : on la reprend
  if (profile?.role === "chercheur") {
    const supabase = await createClient();
    const { data } = await supabase.from("conversations").select("id").eq("listing_id", listing.id).eq("seeker_id", profile.id).maybeSingle();
    if (data) redirect(`/messages/${data.id}`);
  }

  return (
    <>
      <Link href={`/annonces/${listing.id}`} className="text-sm text-muted hover:text-ink">
        ← Retour à l’annonce
      </Link>
      <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Écrire à {listing.agency.name}</h1>
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-line p-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-surface">
          {listing.photos[0] && <Image src={photoUrl(listing.photos[0])} alt="" fill sizes="64px" className="object-cover" />}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{listing.title}</p>
          <p className="text-sm text-muted">
            {formatPrice(listing.price, listing.type)} · {formatRooms(listing.rooms)} · {formatSurface(listing.surface)} · {listing.city}
          </p>
        </div>
      </div>

      <div className="mt-6">
        {!profile && (
          <div className="rounded-2xl bg-surface p-6 text-center">
            <p className="font-semibold">Créez votre compte gratuit pour écrire à l’agence</p>
            <p className="mt-1 text-sm text-muted">30 secondes : l’agence recevra votre nom, votre email et votre téléphone pour vous répondre.</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link href={`/inscription?next=${encodeURIComponent(back)}`} className="rounded-xl bg-brand-500 px-5 py-3 font-semibold text-white hover:bg-brand-600">
                Créer mon compte
              </Link>
              <Link href={`/connexion?next=${encodeURIComponent(back)}`} className="rounded-xl border border-line bg-white px-5 py-3 font-medium hover:bg-surface">
                J’ai déjà un compte
              </Link>
            </div>
          </div>
        )}
        {profile?.role === "agence" && (
          <p className="rounded-2xl bg-surface p-6 text-center text-muted">
            Vous êtes connecté(e) avec un compte agence. Pour contacter une agence, utilisez un compte chercheur.
          </p>
        )}
        {profile?.role === "chercheur" && (
          <>
            <ContactForm
              listingId={listing.id}
              defaultBody={`Bonjour,\n\nJe suis intéressé(e) par votre annonce « ${listing.title} ». Serait-il possible de la visiter ?\n\nMerci,\n${profile.full_name}`}
            />
            <p className="mt-4 text-sm text-muted">
              L’agence recevra vos coordonnées : <strong className="text-ink">{profile.full_name}</strong> · {profile.email}
              {profile.phone && <> · {profile.phone}</>}
            </p>
          </>
        )}
      </div>
    </>
  );
}

export default function Page(props: PageProps<"/annonces/[id]/contact">) {
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
        <Contact params={props.params} />
      </Suspense>
    </div>
  );
}
