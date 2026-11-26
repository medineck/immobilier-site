import Image from "next/image";
import Link from "next/link";
import { formatPrice, formatRooms, formatSurface, photoUrl } from "@/lib/listings";
import type { PublicListing } from "@/lib/public-data";

// Carte d'annonce pour les pages publiques
export function ListingCard({ listing, showAgency = true, priority = false }: { listing: PublicListing; showAgency?: boolean; priority?: boolean }) {
  const cover = listing.photos[0];
  return (
    <li>
      <Link href={`/annonces/${listing.id}`} className="group block overflow-hidden rounded-2xl border border-line bg-white transition hover:shadow-md">
        <div className="relative aspect-[4/3] bg-surface">
          {cover ? (
            <Image
              src={photoUrl(cover)}
              alt={listing.title}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-sm text-muted">Pas de photo</span>
          )}
          <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold">
            {listing.type === "location" ? "À louer" : "À vendre"}
          </span>
          {listing.photos.length > 1 && (
            <span className="absolute right-3 bottom-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">📷 {listing.photos.length}</span>
          )}
        </div>
        <div className="p-4">
          <p className="text-lg font-bold">{formatPrice(listing.price, listing.type)}</p>
          <p className="text-sm text-muted">
            {formatRooms(listing.rooms)} · {formatSurface(listing.surface)} · {listing.city}
          </p>
          <h3 className="mt-2 line-clamp-2 font-medium group-hover:text-brand-700">{listing.title}</h3>
          {showAgency && <p className="mt-2 text-xs text-muted">{listing.agency.name}</p>}
        </div>
      </Link>
    </li>
  );
}

export function ListingGrid({ listings, showAgency = true }: { listings: PublicListing[]; showAgency?: boolean }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((l, i) => (
        <ListingCard key={l.id} listing={l} showAgency={showAgency} priority={i < 3} />
      ))}
    </ul>
  );
}
