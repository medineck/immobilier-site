"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { bookVisit, getSlots, type SlotsResult } from "@/app/actions/visits";
import { dayKey, fmtDayLong, fmtDayShort, fmtTime, fmtVisit } from "@/lib/visits";

// Fenêtre de créneaux affichée dans la conversation après « Proposer une visite »
export function ProposalCard({ conversationId, isSeeker, active, version }: { conversationId: string; isSeeker: boolean; active: boolean; version: string }) {
  const [data, setData] = useState<SlotsResult>();
  const [day, setDay] = useState<string>();
  const [chosen, setChosen] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const res = await getSlots(conversationId);
    setData(res);
    setChosen(undefined);
  }, [conversationId]);

  // Charge les créneaux, et recharge quand une visite est confirmée ou annulée dans la conversation
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    getSlots(conversationId).then((res) => {
      if (cancelled) return;
      setData(res);
      setChosen(undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [active, conversationId, version]);

  // Créneaux regroupés par jour
  const days = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of data?.slots ?? []) {
      const k = dayKey.format(new Date(s));
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return [...map.entries()];
  }, [data]);
  const currentDay = day && days.some(([k]) => k === day) ? day : days[0]?.[0];
  const slots = days.find(([k]) => k === currentDay)?.[1] ?? [];

  function validate() {
    if (!chosen) return;
    setError(undefined);
    startTransition(async () => {
      const res = await bookVisit(conversationId, chosen);
      if (res.error) {
        setError(res.error);
        await load();
      } else setData((d) => ({ ...(d as SlotsResult), visit: { starts_at: chosen } }));
    });
  }

  const shell = (children: React.ReactNode) => (
    <div className="my-2 w-full max-w-md self-center rounded-2xl border border-brand-100 bg-brand-50/50 p-4 sm:self-start">
      <p className="font-semibold">📅 Proposition de visite</p>
      {children}
    </div>
  );

  if (!active) return shell(<p className="mt-1 text-sm text-muted">Une nouvelle proposition a été envoyée plus bas.</p>);
  if (!data) return shell(<div className="mt-3 h-24 animate-pulse rounded-xl bg-white" />);

  if (data.visit)
    return shell(
      <p className="mt-2 rounded-xl bg-white px-3 py-2.5 text-sm">
        ✅ Visite réservée le <strong>{fmtVisit(data.visit.starts_at)}</strong>
      </p>,
    );

  if (!isSeeker)
    return shell(
      <p className="mt-1 text-sm text-muted">
        Le client choisit parmi vos <strong className="text-ink">{data.slots.length} créneaux libres</strong> des 14 prochains jours. Vous serez prévenu(e)
        dès qu’il valide.{" "}
        <Link href="/espace-agence/disponibilites" className="font-medium text-brand-700 hover:underline">
          Mes disponibilités
        </Link>
      </p>,
    );

  if (data.slots.length === 0)
    return shell(<p className="mt-1 text-sm text-muted">Aucun créneau libre pour le moment. Écrivez à l’agence pour convenir d’une date.</p>);

  return shell(
    <>
      <p className="mt-1 text-sm text-muted">Choisissez un créneau puis validez : la visite est confirmée immédiatement.</p>
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Jours">
        {days.map(([k, list]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={k === currentDay}
            onClick={() => {
              setDay(k);
              setChosen(undefined);
            }}
            className={`shrink-0 rounded-xl border px-3 py-2 text-sm first-letter:uppercase ${
              k === currentDay ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white hover:border-brand-500"
            }`}
          >
            {fmtDayShort.format(new Date(list[0]))}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {slots.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setChosen(s)}
            aria-pressed={chosen === s}
            className={`rounded-lg border py-2 text-sm font-medium ${
              chosen === s ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white hover:border-brand-500"
            }`}
          >
            {fmtTime.format(new Date(s))}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <button
        type="button"
        onClick={validate}
        disabled={!chosen || pending}
        className="mt-4 w-full rounded-xl bg-brand-500 px-4 py-3 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
      >
        {pending ? "Réservation…" : chosen ? `Valider : ${fmtDayLong.format(new Date(chosen))} à ${fmtTime.format(new Date(chosen))}` : "Choisissez un créneau"}
      </button>
    </>,
  );
}
