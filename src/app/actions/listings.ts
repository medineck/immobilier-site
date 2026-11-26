"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { LISTINGS_TAG } from "@/lib/public-data";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { MAX_PHOTOS, PHOTO_BUCKET } from "@/lib/listings";

export type ListingFormState = { error?: string; values?: Record<string, string> } | undefined;

// Lit et vérifie le formulaire d'annonce
function parse(fd: FormData, agencyId: string) {
  const raw: Record<string, string> = {};
  for (const k of ["title", "type", "price", "surface", "rooms", "city", "description", "agent_id", "photos", "published"])
    raw[k] = String(fd.get(k) ?? "").trim();

  const price = Number(raw.price.replace(/[\s ]/g, ""));
  const surface = Number(raw.surface.replace(",", "."));
  const rooms = Number(raw.rooms);
  let photos: string[] = [];
  try {
    photos = JSON.parse(raw.photos || "[]");
  } catch {}

  let error: string | undefined;
  if (raw.title.length < 3) error = "Indiquez un titre (3 caractères minimum).";
  else if (raw.title.length > 140) error = "Le titre est trop long (140 caractères maximum).";
  else if (raw.type !== "location" && raw.type !== "vente") error = "Choisissez « Location » ou « Vente ».";
  else if (!Number.isInteger(price) || price <= 0) error = "Indiquez un prix valide, en euros, sans centimes.";
  else if (!(surface > 0) || surface >= 100000) error = "Indiquez une surface valide, en m².";
  else if (!Number.isInteger(rooms) || rooms < 1 || rooms > 50) error = "Indiquez un nombre de pièces valide (1 à 50).";
  else if (!raw.city) error = "Indiquez la ville.";
  else if (raw.description.length > 5000) error = "La description est trop longue (5000 caractères maximum).";
  else if (
    !Array.isArray(photos) ||
    photos.length > MAX_PHOTOS ||
    photos.some((p) => typeof p !== "string" || !p.startsWith(`${agencyId}/`) || !/^[0-9a-f-]+\/[0-9a-f-]+\.(webp|jpg|jpeg|png)$/.test(p))
  )
    error = "Les photos n’ont pas pu être enregistrées. Réessayez.";

  return {
    error,
    values: raw,
    data: {
      title: raw.title,
      type: raw.type as "location" | "vente",
      price,
      surface: Math.round(surface * 10) / 10,
      rooms,
      city: raw.city,
      description: raw.description,
      photos,
      published: raw.published === "on",
    },
  };
}

export async function saveListing(_: ListingFormState, fd: FormData): Promise<ListingFormState> {
  const profile = await requireProfile("agence");
  if (!profile.agency) return { error: "Votre compte n’est rattaché à aucune agence." };
  const id = String(fd.get("id") ?? "");
  const { error, values, data } = parse(fd, profile.agency.id);
  if (error) return { error, values };

  // Un agent publie toujours en son nom ; le directeur choisit l'agent responsable
  const agent_id = profile.agency_role === "directeur" && values.agent_id ? values.agent_id : profile.id;
  const supabase = await createClient();

  if (id) {
    const { data: before } = await supabase.from("listings").select("photos").eq("id", id).single();
    const { error: dbError, data: updated } = await supabase
      .from("listings")
      .update({ ...data, agent_id })
      .eq("id", id)
      .select("id");
    if (dbError || !updated?.length) return { error: "Impossible d’enregistrer : vous ne pouvez modifier que vos propres annonces.", values };
    const removed = (before?.photos ?? []).filter((p: string) => !data.photos.includes(p));
    if (removed.length) await supabase.storage.from(PHOTO_BUCKET).remove(removed);
  } else {
    const { error: dbError } = await supabase.from("listings").insert({ ...data, agent_id, agency_id: profile.agency.id });
    if (dbError) return { error: "Impossible de créer l’annonce. Vérifiez les informations et réessayez.", values };
  }
  revalidatePath("/espace-agence/annonces");
  updateTag(LISTINGS_TAG);
  redirect(`/espace-agence/annonces?ok=${id ? "modifiee" : "creee"}`);
}

export async function deleteListing(fd: FormData) {
  await requireProfile("agence");
  const id = String(fd.get("id") ?? "");
  const supabase = await createClient();
  const { data } = await supabase.from("listings").delete().eq("id", id).select("photos");
  const photos = data?.[0]?.photos ?? [];
  if (photos.length) await supabase.storage.from(PHOTO_BUCKET).remove(photos);
  revalidatePath("/espace-agence/annonces");
  updateTag(LISTINGS_TAG);
  redirect(`/espace-agence/annonces?ok=${data?.length ? "supprimee" : "erreur"}`);
}

export async function togglePublished(fd: FormData) {
  await requireProfile("agence");
  const supabase = await createClient();
  await supabase
    .from("listings")
    .update({ published: fd.get("published") === "true" })
    .eq("id", String(fd.get("id") ?? ""));
  revalidatePath("/espace-agence/annonces");
  updateTag(LISTINGS_TAG);
}
