import Image from "next/image";
import Link from "next/link";
import { deleteListing, togglePublished } from "@/app/actions/listings";
import { formatPrice, formatRooms, formatSurface, photoUrl, typeLabel, type Listing } from "@/lib/listings";
import { ConfirmButton } from "@/components/confirm-button";

export function ListingCardAdmin({ listing, agentName, canManage }: { listing: Listing; agentName?: string; canManage: boolean }) {
  const cover = listing.photos[0];
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-line sm:flex-row">
      <div className="relative aspect-[4/3] w-full shrink-0 bg-surface sm:aspect-auto sm:w-56">
        {cover ? (
          <Image src={photoUrl(cover)} alt="" fill sizes="(min-width: 640px) 224px, 100vw" className="object-cover" />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-sm text-muted">Pas de photo</span>
        )}
        {!listing.published && <span className="absolute top-2 left-2 rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-white">Masquée</span>}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">
            {typeLabel[listing.type]} · {listing.city}
          </p>
          <h3 className="mt-1 font-semibold">{listing.title}</h3>
          <p className="mt-1 text-lg font-bold">{formatPrice(listing.price, listing.type)}</p>
          <p className="text-sm text-muted">
            {formatSurface(listing.surface)} · {formatRooms(listing.rooms)} · {listing.photos.length} photo{listing.photos.length > 1 ? "s" : ""}
          </p>
          {agentName && <p className="mt-1 text-sm text-muted">Agent : {agentName}</p>}
        </div>
        {canManage && (
          <div className="mt-auto flex flex-wrap gap-2">
            <Link href={`/espace-agence/annonces/${listing.id}/modifier`} className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600">
              Modifier
            </Link>
            {listing.published && (
              <Link href={`/annonces/${listing.id}`} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface">
                Voir
              </Link>
            )}
            <form action={togglePublished}>
              <input type="hidden" name="id" value={listing.id} />
              <input type="hidden" name="published" value={String(!listing.published)} />
              <button className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface">{listing.published ? "Masquer" : "Rendre visible"}</button>
            </form>
            <form action={deleteListing}>
              <input type="hidden" name="id" value={listing.id} />
              <ConfirmButton message={`Supprimer définitivement « ${listing.title} » et ses photos ?`}>Supprimer</ConfirmButton>
            </form>
          </div>
        )}
      </div>
    </li>
  );
}
