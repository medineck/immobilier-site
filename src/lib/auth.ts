import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Agency = { id: string; name: string; slug: string; city: string };
export type Profile = {
  id: string;
  role: "chercheur" | "agence";
  full_name: string;
  email: string;
  phone: string | null;
  agency_role: "directeur" | "agent" | null;
  agency: Agency | null;
};

// Renvoie le profil de la personne connectée, ou null.
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, phone, agency_role, agency:agencies(id, name, slug, city)")
    .eq("id", user.id)
    .single();
  return (data as Profile | null) ?? null;
}

// Pour les pages réservées : redirige si la personne n'a pas le bon type de compte.
export async function requireProfile(role?: Profile["role"]): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/connexion");
  if (role && profile.role !== role) redirect(homeFor(profile));
  return profile;
}

export function homeFor(p: Pick<Profile, "role">) {
  return p.role === "agence" ? "/espace-agence" : "/mon-compte";
}
