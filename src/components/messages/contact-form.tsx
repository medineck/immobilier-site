"use client";

import { useActionState } from "react";
import { contactAgency } from "@/app/actions/messages";
import { Alert, SubmitButton } from "@/components/forms/ui";

export function ContactForm({ listingId, defaultBody }: { listingId: string; defaultBody: string }) {
  const [state, action, pending] = useActionState(contactAgency, undefined);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="listing_id" value={listingId} />
      <label className="grid gap-1.5">
        <span className="text-sm font-medium">Votre message</span>
        <textarea
          name="body"
          rows={6}
          required
          maxLength={4000}
          defaultValue={state?.body ?? defaultBody}
          className="w-full rounded-xl border border-line px-3.5 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </label>
      {state?.error && <Alert>{state.error}</Alert>}
      <SubmitButton pending={pending}>Envoyer à l’agence</SubmitButton>
    </form>
  );
}
