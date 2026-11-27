import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReminder, siteUrl } from "@/lib/email/notify";
import { addDays, paris } from "@/lib/agenda";

// Tâche quotidienne (lancée par Vercel chaque soir) : rappel des visites du lendemain
export async function GET(request: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  const db = createAdminClient();
  const tomorrow = addDays(paris(new Date()).key, 1);
  const { data, error } = await db
    .from("visits")
    .select(
      "id, starts_at, ends_at, conversation_id, listing_title, agency:agencies(name, city), listing:listings(city), seeker:profiles!visits_seeker_id_fkey(email, full_name), agent:profiles!visits_agent_id_fkey(email, full_name)",
    )
    .eq("status", "confirmee")
    .is("reminder_sent_at", null)
    .gt("starts_at", new Date().toISOString())
    .lt("starts_at", new Date(Date.now() + 2 * 86400000).toISOString());
  if (error) return Response.json({ error: error.message }, { status: 500 });

  type Row = {
    id: string;
    starts_at: string;
    ends_at: string;
    conversation_id: string;
    listing_title: string;
    agency: { name: string; city: string } | null;
    listing: { city: string } | null;
    seeker: { email: string; full_name: string } | null;
    agent: { email: string; full_name: string } | null;
  };
  const rows = ((data ?? []) as unknown as Row[]).filter((v) => paris(v.starts_at).key === tomorrow);
  const url = await siteUrl();
  let sent = 0;
  for (const v of rows) {
    if (!v.seeker) continue;
    await sendReminder({
      visit: v,
      conversation_id: v.conversation_id,
      listing_title: v.listing_title,
      city: v.listing?.city ?? v.agency?.city ?? "",
      agency_name: v.agency?.name ?? "",
      seeker: v.seeker,
      agent: v.agent,
      url,
    });
    await db.from("visits").update({ reminder_sent_at: new Date().toISOString() }).eq("id", v.id);
    sent++;
  }
  return Response.json({ jour: tomorrow, rappels: sent });
}
