"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelVisit, moveVisit } from "@/app/actions/visits";

// Boutons « Déplacer » (agence) et « Annuler » (agence ou client), avec confirmation
export function VisitActions({ visitId, label, canMove, onDone }: { visitId: string; label: string; canMove: boolean; onDone?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const run = (fn: () => Promise<{ error?: string }>, question: string) => {
    if (!window.confirm(question)) return;
    setError(undefined);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else {
        onDone?.();
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canMove && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => moveVisit(visitId), `Déplacer la visite du ${label} ?\n\nLe créneau sera libéré et le client recevra une nouvelle liste de créneaux pour choisir une autre date.`)}
          className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium hover:bg-surface disabled:opacity-50"
        >
          🔁 Déplacer
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => cancelVisit(visitId), `Annuler la visite du ${label} ?`)}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        Annuler la visite
      </button>
      {error && <span className="text-sm text-red-700">{error}</span>}
    </div>
  );
}
