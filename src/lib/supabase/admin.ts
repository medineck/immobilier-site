import "server-only";
import { createClient } from "@supabase/supabase-js";

// Accès complet à la base, réservé aux tâches automatiques côté serveur (rappels).
// La clé secrète n'est jamais envoyée au navigateur.
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY manquante");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
