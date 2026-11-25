"use client";

import { useActionState } from "react";
import { inviteAgent } from "@/app/actions/auth";
import { Alert } from "./ui";

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteAgent, undefined);
  return (
    <form action={action} className="grid gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Email de l’agent</span>
          <input
            key={state?.ok ?? "form"}
            name="email"
            type="email"
            required
            placeholder="email@exemple.fr"
            defaultValue={state?.values?.email}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <button disabled={pending} className="rounded-xl bg-brand-500 px-5 py-2.5 font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
          {pending ? "Patientez…" : "Inviter un agent"}
        </button>
      </div>
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.ok && <Alert kind="ok">{state.ok}</Alert>}
    </form>
  );
}
