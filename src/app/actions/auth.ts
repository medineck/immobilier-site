"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export type FormState = { error?: string; ok?: string; values?: Record<string, string> } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function read(fd: FormData, ...keys: string[]) {
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = String(fd.get(k) ?? "").trim();
  return out;
}

function validPhone(p: string) {
  return p.replace(/[^\d]/g, "").length >= 10 && /^[+\d\s().-]+$/.test(p);
}

// Traduit les messages d'erreur de Supabase en français
function translate(message: string) {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered")) return "Un compte existe déjà avec cet email. Essayez de vous connecter.";
  if (m.includes("invalid login credentials")) return "Email ou mot de passe incorrect.";
  if (m.includes("password") && (m.includes("at least") || m.includes("weak"))) return "Le mot de passe doit contenir au moins 8 caractères.";
  if (m.includes("invalid") && m.includes("email")) return "Cette adresse email n’est pas valide.";
  if (m.includes("rate limit") || m.includes("too many")) return "Trop de tentatives. Patientez quelques minutes puis réessayez.";
  if (m.includes("database error")) return "Impossible de créer le compte. Vérifiez vos informations ou votre lien d’invitation.";
  return "Une erreur est survenue. Réessayez dans un instant.";
}

function checkCommon(v: Record<string, string>): string | undefined {
  if (!v.full_name) return "Indiquez votre nom et prénom.";
  if (!EMAIL_RE.test(v.email)) return "Indiquez une adresse email valide.";
  if (!validPhone(v.phone)) return "Indiquez un numéro de téléphone valide (10 chiffres).";
  if (v.password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
}

// Inscription : chercheur ou agence (avec son directeur)
export async function signUp(_: FormState, fd: FormData): Promise<FormState> {
  const role = fd.get("role") === "agence" ? "agence" : "chercheur";
  const v = read(fd, "full_name", "email", "phone", "password", "agency_name", "agency_city");
  const values = { ...v, password: "" };
  const err = checkCommon(v);
  if (err) return { error: err, values };
  if (role === "agence" && (v.agency_name.length < 2 || !v.agency_city)) return { error: "Indiquez le nom et la ville de l’agence.", values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: v.email.toLowerCase(),
    password: v.password,
    options: {
      data:
        role === "agence"
          ? { role, full_name: v.full_name, phone: v.phone, agency_name: v.agency_name, agency_city: v.agency_city }
          : { role, full_name: v.full_name, phone: v.phone },
    },
  });
  if (error) return { error: translate(error.message), values };
  // Supabase renvoie un compte sans identités si l'email existe déjà
  if (data.user && data.user.identities?.length === 0) return { error: translate("already registered"), values };
  const next = String(fd.get("next") ?? "");
  if (role === "chercheur" && next.startsWith("/") && !next.startsWith("//")) redirect(next);
  redirect(role === "agence" ? "/espace-agence" : "/mon-compte");
}

// Inscription d'un agent invité par son directeur
export async function signUpAgent(_: FormState, fd: FormData): Promise<FormState> {
  const v = read(fd, "full_name", "email", "phone", "password", "token");
  const values = { ...v, password: "" };
  const err = checkCommon(v);
  if (err) return { error: err, values };

  const supabase = await createClient();
  const { data: inv } = await supabase.rpc("get_invitation", { p_token: v.token });
  const invitation = inv?.[0];
  if (!invitation) return { error: "Cette invitation n’est plus valable. Demandez un nouveau lien à votre agence.", values };
  if (invitation.email !== v.email.toLowerCase())
    return { error: `Utilisez l’adresse à laquelle l’invitation a été envoyée : ${invitation.email}`, values };

  const { error } = await supabase.auth.signUp({
    email: v.email.toLowerCase(),
    password: v.password,
    options: { data: { full_name: v.full_name, phone: v.phone, invite_token: v.token } },
  });
  if (error) return { error: translate(error.message), values };
  redirect("/espace-agence");
}

export async function signIn(_: FormState, fd: FormData): Promise<FormState> {
  const v = read(fd, "email", "password", "next");
  const values = { email: v.email, next: v.next };
  if (!EMAIL_RE.test(v.email) || !v.password) return { error: "Indiquez votre email et votre mot de passe.", values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: v.email.toLowerCase(), password: v.password });
  if (error) return { error: translate(error.message), values };

  // Seuls les chemins internes sont acceptés pour la redirection
  if (v.next.startsWith("/") && !v.next.startsWith("//")) redirect(v.next);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  redirect(profile?.role === "agence" ? "/espace-agence" : "/mon-compte");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// Le directeur invite un agent par email
export async function inviteAgent(_: FormState, fd: FormData): Promise<FormState> {
  const profile = await requireProfile("agence");
  if (profile.agency_role !== "directeur" || !profile.agency) return { error: "Seul le directeur peut inviter des agents." };
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Indiquez une adresse email valide.", values: { email } };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) return { error: "Cette personne fait déjà partie de votre agence.", values: { email } };

  const { error } = await supabase.from("agency_invitations").insert({ agency_id: profile.agency.id, email, invited_by: profile.id });
  if (error) {
    if (error.code === "23505") return { error: "Une invitation a déjà été créée pour cet email.", values: { email } };
    return { error: "Impossible de créer l’invitation. Réessayez.", values: { email } };
  }
  revalidatePath("/espace-agence");
  return { ok: `Invitation créée pour ${email}. Copiez le lien ci-dessous et envoyez-le à votre agent.` };
}

export async function cancelInvitation(fd: FormData) {
  await requireProfile("agence");
  const supabase = await createClient();
  await supabase.from("agency_invitations").delete().eq("id", String(fd.get("id")));
  revalidatePath("/espace-agence");
}
