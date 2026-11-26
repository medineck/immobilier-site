// Outils communs aux annonces (utilisables côté serveur et navigateur)

export type ListingType = "location" | "vente";

export type Listing = {
  id: string;
  agency_id: string;
  agent_id: string | null;
  title: string;
  type: ListingType;
  price: number;
  surface: number;
  rooms: number;
  city: string;
  description: string;
  photos: string[];
  published: boolean;
  created_at: string;
  updated_at: string;
};

export const MAX_PHOTOS = 15;
export const PHOTO_BUCKET = "annonces";

export function photoUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}

const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export function formatPrice(price: number, type: ListingType) {
  return type === "location" ? `${euros.format(price)} / mois` : euros.format(price);
}

export function formatSurface(surface: number) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(surface)} m²`;
}

export function formatRooms(rooms: number) {
  return `${rooms} pièce${rooms > 1 ? "s" : ""}`;
}

export const typeLabel: Record<ListingType, string> = { location: "Location", vente: "Vente" };
