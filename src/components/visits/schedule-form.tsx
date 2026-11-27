"use client";

import { useActionState, useState, useTransition } from "react";
import { saveSchedule } from "@/app/actions/visits";
import { DAYS, type Weekly } from "@/lib/visits";
import { Alert, SubmitButton, keepValuesOnSubmit } from "@/components/forms/ui";

const select = "rounded-xl border border-line bg-white px-3 py-2.5 text-base outline-none focus:border-brand-500";

export function ScheduleForm({ visitMinutes, bufferMinutes, weekly }: { visitMinutes: number; bufferMinutes: number; weekly: Weekly }) {
  const [state, action, pending] = useActionState(saveSchedule, undefined);
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState<Record<string, boolean>>(Object.fromEntries(DAYS.map((d) => [d.n, !!weekly[d.n]])));

  return (
    <form action={action} onSubmit={keepValuesOnSubmit(action, startTransition)} className="grid gap-6">
      <section className="rounded-2xl border border-line p-5 sm:p-6">
        <h2 className="font-semibold">Jours et horaires de visite</h2>
        <p className="mt-1 text-sm text-muted">Les clients ne verront que des créneaux dans ces horaires, hors visites déjà prévues.</p>
        <ul className="mt-4 divide-y divide-line">
          {DAYS.map((d) => {
            const range = weekly[d.n] ?? ["09:00", "19:00"];
            return (
              <li key={d.n} className="flex flex-wrap items-center gap-3 py-3">
                <label className="flex w-32 items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    name={`open_${d.n}`}
                    checked={open[d.n]}
                    onChange={(e) => setOpen({ ...open, [d.n]: e.target.checked })}
                    className="size-5 accent-brand-500"
                  />
                  {d.label}
                </label>
                {open[d.n] ? (
                  <span className="flex items-center gap-2 text-sm">
                    de
                    <input type="time" name={`from_${d.n}`} defaultValue={range[0]} step={1800} required className={select} aria-label={`${d.label} : début`} />
                    à
                    <input type="time" name={`to_${d.n}`} defaultValue={range[1]} step={1800} required className={select} aria-label={`${d.label} : fin`} />
                  </span>
                ) : (
                  <span className="text-sm text-muted">Pas de visite</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid gap-4 rounded-2xl border border-line p-5 sm:grid-cols-2 sm:p-6">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium">Durée d’une visite</span>
          <select name="visit_minutes" defaultValue={visitMinutes} className={select}>
            {[15, 30, 45, 60, 90].map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} minutes` : m === 60 ? "1 heure" : "1 h 30"}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium">Battement entre deux visites</span>
          <select name="buffer_minutes" defaultValue={bufferMinutes} className={select}>
            {[0, 15, 30, 45, 60].map((m) => (
              <option key={m} value={m}>
                {m === 0 ? "Aucun" : m === 60 ? "1 heure" : `${m} minutes`}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted">Temps pour vous déplacer d’un bien à l’autre.</span>
        </label>
      </section>

      {state?.error && <Alert>{state.error}</Alert>}
      {state?.ok && <Alert kind="ok">{state.ok}</Alert>}
      <div className="sm:ml-auto sm:w-64">
        <SubmitButton pending={pending}>Enregistrer</SubmitButton>
      </div>
    </form>
  );
}
