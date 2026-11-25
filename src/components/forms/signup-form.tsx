"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signUp } from "@/app/actions/auth";
import { Alert, Field, SubmitButton } from "./ui";

export function SignupForm({ initialRole }: { initialRole: "chercheur" | "agence" }) {
  const [role, setRole] = useState(initialRole);
  const [state, action, pending] = useActionState(signUp, undefined);
  const v = state?.values ?? {};

  return (
    <form action={action} className="grid gap-5">
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="mb-2 text-sm font-medium">Vous êtes…</legend>
        {(
          [
            { value: "chercheur", title: "Je cherche un logement", text: "Gratuit" },
            { value: "agence", title: "Je suis une agence", text: "Directeur d’agence" },
          ] as const
        ).map((o) => (
          <label
            key={o.value}
            className="cursor-pointer rounded-xl border border-line p-3 has-checked:border-brand-500 has-checked:bg-brand-50 has-checked:ring-1 has-checked:ring-brand-500"
          >
            <input type="radio" name="role" value={o.value} checked={role === o.value} onChange={() => setRole(o.value)} className="sr-only" />
            <span className="block text-sm font-semibold">{o.title}</span>
            <span className="block text-xs text-muted">{o.text}</span>
          </label>
        ))}
      </fieldset>

      {role === "agence" && (
        <div className="grid gap-4 rounded-xl bg-surface p-4">
          <p className="text-sm font-semibold">Votre agence</p>
          <Field label="Nom de l’agence" name="agency_name" defaultValue={v.agency_name} autoComplete="organization" />
          <Field label="Ville" name="agency_city" defaultValue={v.agency_city} autoComplete="address-level2" />
        </div>
      )}

      {role === "agence" && <p className="-mb-1 text-sm font-semibold">Vous (directeur de l’agence)</p>}
      <Field label="Nom et prénom" name="full_name" defaultValue={v.full_name} autoComplete="name" />
      <Field label="Email" name="email" type="email" defaultValue={v.email} autoComplete="email" />
      <Field
        label="Téléphone"
        name="phone"
        type="tel"
        defaultValue={v.phone}
        autoComplete="tel"
        hint={role === "chercheur" ? "Transmis uniquement aux agences que vous contactez." : undefined}
      />
      <Field label="Mot de passe" name="password" type="password" autoComplete="new-password" hint="8 caractères minimum." />

      {state?.error && <Alert>{state.error}</Alert>}
      <SubmitButton pending={pending}>{role === "agence" ? "Créer l’espace de mon agence" : "Créer mon compte"}</SubmitButton>
      {role === "agence" && (
        <p className="text-xs text-muted">Vous êtes agent ? Demandez à votre directeur de vous inviter depuis son espace agence.</p>
      )}
      <p className="text-center text-sm text-muted">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-medium text-brand-600 hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
