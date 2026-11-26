import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { Listing, ListingType } from "@/lib/listings";

// Lecture des données publiques (sans session) : annonces visibles et agences.
// Mises en cache quelques minutes, et rafraîchies dès qu'une agence modifie ses annonces.

export const LISTINGS_TAG = "annonces";
export const PAGE_SIZE = 24;

export type PublicAgency = { id: string; name: string; slug: string; city: string; description: string | null };
export type PublicListing = Listing & { agency: Pick<PublicAgency, "name" | "slug" | "city"> };

function anon() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

// Même règle que la base : minuscules, sans accents, mots séparés par des tirets
export function cityKey(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const COLUMNS = "*, agency:agencies(name, slug, city)";

export async function searchListings(params: { type: ListingType; ville: string; tri: "recent" | "prix-asc" | "prix-desc"; page: number }) {
  "use cache";
  cacheTag(LISTINGS_TAG);
  cacheLife("minutes");

  let q = anon().from("listings").select(COLUMNS, { count: "exact" }).eq("published", true).eq("type", params.type);
  const key = cityKey(params.ville);
  if (key) q = q.like("city_key", `%${key}%`);
  q =
    params.tri === "prix-asc"
      ? q.order("price", { ascending: true })
      : params.tri === "prix-desc"
        ? q.order("price", { ascending: false })
        : q.order("created_at", { ascending: false });
  const from = (params.page - 1) * PAGE_SIZE;
  const { data, count, error } = await q.range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error("Recherche impossible pour le moment.");
  return { listings: (data ?? []) as PublicListing[], total: count ?? 0 };
}

export async function getLatestListings(limit = 6) {
  "use cache";
  cacheTag(LISTINGS_TAG);
  cacheLife("minutes");
  const { data } = await anon().from("listings").select(COLUMNS).eq("published", true).order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as PublicListing[];
}

export async function getPublicListing(id: string) {
  "use cache";
  cacheTag(LISTINGS_TAG);
  cacheLife("minutes");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await anon().from("listings").select(COLUMNS).eq("id", id).eq("published", true).maybeSingle();
  return (data as PublicListing | null) ?? null;
}

export async function getAgencyPage(slug: string) {
  "use cache";
  cacheTag(LISTINGS_TAG);
  cacheLife("minutes");
  const db = anon();
  const { data: agency } = await db.from("agencies").select("id, name, slug, city, description").eq("slug", slug).maybeSingle();
  if (!agency) return null;
  const { data } = await db.from("listings").select(COLUMNS).eq("agency_id", agency.id).eq("published", true).order("created_at", { ascending: false });
  return { agency: agency as PublicAgency, listings: (data ?? []) as PublicListing[] };
}
