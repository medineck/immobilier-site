import type { Metadata } from "next";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_SCHEDULE, type Weekly } from "@/lib/visits";
import { ScheduleForm } from "@/components/visits/schedule-form";

export const metadata: Metadata = { title: "Mes disponibilités" };

async function Schedule() {
  const profile = await requireProfile("agence");
  const supabase = await createClient();
  const { data } = await supabase.from("agent_schedules").select("visit_minutes, buffer_minutes, weekly").eq("agent_id", profile.id).maybeSingle();
  const s = data ?? DEFAULT_SCHEDULE;
  return <ScheduleForm visitMinutes={s.visit_minutes} bufferMinutes={s.buffer_minutes} weekly={s.weekly as Weekly} />;
}

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Mes disponibilités</h1>
      <p className="mt-1 mb-6 text-muted">
        Quand vous cliquez sur « Proposer une visite » dans une conversation, le client choisit parmi vos créneaux libres des 14 prochains jours.
      </p>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
        <Schedule />
      </Suspense>
    </div>
  );
}
