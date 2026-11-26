import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Listing } from "@/lib/listings";
import { ListingForm } from "@/components/listings/listing-form";

// Partie commune aux pages « nouvelle annonce » et « modifier »
export async function ListingFormPage({ id }: { id?: string }) {
  const profile = await requireProfile("agence");
  const agency = profile.agency!;
  const supabase = await createClient();
  const { data: members } = await supabase.from("profiles").select("id, full_name").eq("agency_id", agency.id).order("full_name");

  let listing: Listing | undefined;
  if (id) {
    const { data } = await supabase.from("listings").select("*").eq("id", id).eq("agency_id", agency.id).maybeSingle();
    if (!data) notFound();
    listing = data as Listing;
    if (profile.agency_role !== "directeur" && listing.agent_id !== profile.id) redirect("/espace-agence/annonces?ok=erreur");
  }

  return (
    <>
      <h1 className="text-2xl font-bold sm:text-3xl">{listing ? "Modifier l’annonce" : "Nouvelle annonce"}</h1>
      <div className="mt-6">
        <ListingForm
          agencyId={agency.id}
          listing={listing}
          members={members ?? []}
          currentUserId={profile.id}
          isDirector={profile.agency_role === "directeur"}
          defaultCity={agency.city}
        />
      </div>
    </>
  );
}
