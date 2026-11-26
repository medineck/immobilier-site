"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { saveListing } from "@/app/actions/listings";
import type { Listing } from "@/lib/listings";
import { Alert, Field, keepValuesOnSubmit } from "@/components/forms/ui";
import { PhotoUploader } from "./photo-uploader";

type Member = { id: string; full_name: string };

export function ListingForm({
  agencyId,
  listing,
  members,
  currentUserId,
  isDirector,
  defaultCity,
}: {
  agencyId: string;
  listing?: Listing;
  members: Member[];
  currentUserId: string;
  isDirector: boolean;
  defaultCity: string;
}) {
  const [state, action, pending] = useActionState(saveListing, undefined);
  const [, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const v = state?.values;
  const val = (k: keyof Listing, fallback = "") => v?.[k] ?? (listing ? String(listing[k]) : fallback);
  // Choix gardés en mémoire : ils restent identiques si le formulaire affiche une erreur
  const [type, setType] = useState(listing?.type ?? "location");
  const [agentId, setAgentId] = useState(listing?.agent_id ?? currentUserId);
  const [published, setPublished] = useState(listing?.published ?? true);

  return (
    <form action={action} onSubmit={keepValuesOnSubmit(action, startTransition)} className="grid gap-6">
      {listing && <input type="hidden" name="id" value={listing.id} />}

      <section className="grid gap-4 rounded-2xl border border-line p-5 sm:p-6">
        <h2 className="font-semibold">Le bien</h2>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Type d’annonce</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["location", "vente"] as const).map((t) => (
              <label
                key={t}
                className="cursor-pointer rounded-xl border border-line px-4 py-2.5 text-center font-medium has-checked:border-brand-500 has-checked:bg-brand-50 has-checked:text-brand-700"
              >
                <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
                {t === "location" ? "Location" : "Vente"}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Titre de l’annonce" name="title" defaultValue={val("title")} placeholder="Ex. : T3 lumineux avec balcon, proche métro" />
        <div className="grid grid-cols-2 items-end gap-4 sm:grid-cols-3">
          <Field label={type === "location" ? "Loyer (€ / mois)" : "Prix (€)"} name="price" type="number" min="1" defaultValue={val("price")} />
          <Field label="Surface (m²)" name="surface" type="number" step="any" min="1" defaultValue={val("surface")} />
          <Field label="Pièces" name="rooms" type="number" min="1" defaultValue={val("rooms")} />
        </div>
        <Field label="Ville" name="city" defaultValue={val("city", defaultCity)} autoComplete="address-level2" />
        <label className="grid gap-1.5">
          <span className="text-sm font-medium">Description</span>
          <textarea
            name="description"
            rows={7}
            maxLength={5000}
            defaultValue={val("description")}
            placeholder="Étage, exposition, chauffage, charges, disponibilité, quartier…"
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>
      </section>

      <section className="grid gap-4 rounded-2xl border border-line p-5 sm:p-6">
        <h2 className="font-semibold">Photos</h2>
        <PhotoUploader agencyId={agencyId} initial={listing?.photos ?? []} onBusyChange={setUploading} />
      </section>

      <section className="grid gap-4 rounded-2xl border border-line p-5 sm:p-6">
        <h2 className="font-semibold">Publication</h2>
        {isDirector ? (
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Agent responsable</span>
            <select
              name="agent_id"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-base outline-none focus:border-brand-500"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                  {m.id === currentUserId ? " (vous)" : ""}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted">Il recevra les messages des personnes intéressées.</span>
          </label>
        ) : (
          <p className="text-sm text-muted">Vous êtes l’agent responsable de cette annonce : vous recevrez les messages des personnes intéressées.</p>
        )}
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="published"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="mt-1 size-5 accent-brand-500"
          />
          <span>
            <span className="block font-medium">Visible sur le site</span>
            <span className="text-sm text-muted">Décochez pour masquer l’annonce (bien loué ou vendu, par exemple) sans la supprimer.</span>
          </span>
        </label>
      </section>

      {state?.error && <Alert>{state.error}</Alert>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href="/espace-agence/annonces" className="rounded-xl border border-line px-5 py-3 text-center font-medium hover:bg-surface">
          Annuler
        </Link>
        <button
          disabled={pending || uploading}
          className="rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white hover:bg-brand-600 disabled:cursor-wait disabled:opacity-60"
        >
          {uploading ? "Envoi des photos…" : pending ? "Enregistrement…" : listing ? "Enregistrer les modifications" : "Publier l’annonce"}
        </button>
      </div>
    </form>
  );
}
