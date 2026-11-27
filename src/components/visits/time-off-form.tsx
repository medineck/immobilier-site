"use client";

import { useActionState, useTransition } from "react";
import { addTimeOff } from "@/app/actions/visits";
import { Alert, keepValuesOnSubmit } from "@/components/forms/ui";

const input = "w-full min-w-0 rounded-xl border border-line bg-white px-3 py-2 text-base outline-none focus:border-brand-500";

export function TimeOffForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(addTimeOff, undefined);
  const [, startTransition] = useTransition();
  return (
    <form action={action} onSubmit={keepValuesOnSubmit(action, startTransition)} className="grid gap-3">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,8rem)] gap-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Du</span>
          <input type="date" name="start_date" required defaultValue={today} min={today} className={input} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">à</span>
          <input type="time" name="start_time" defaultValue="00:00" step={1800} className={input} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Au</span>
          <input type="date" name="end_date" required defaultValue={today} min={today} className={input} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">à</span>
          <input type="time" name="end_time" defaultValue="23:59" className={input} />
        </label>
      </div>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Motif (visible seulement par l’agence)</span>
        <input name="reason" maxLength={120} placeholder="Congés, rendez-vous…" className={input} />
      </label>
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.ok && <Alert kind="ok">{state.ok}</Alert>}
      <button disabled={pending} className="rounded-xl bg-ink px-4 py-2.5 font-semibold text-white hover:bg-ink/90 disabled:opacity-60">
        {pending ? "Patientez…" : "Bloquer ce moment"}
      </button>
    </form>
  );
}
