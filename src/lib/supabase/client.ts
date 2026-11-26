import { createBrowserClient } from "@supabase/ssr";

// Client Supabase dans le navigateur (utilisé pour envoyer les photos)
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
