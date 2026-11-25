"use client";

import { useActionState } from "react";
import { signUpAgent } from "@/app/actions/auth";
import { Alert, Field, SubmitButton } from "./ui";

export function AgentSignupForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(signUpAgent, undefined);
  const v = state?.values ?? {};
  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="token" value={token} />
      <Field label="Email" name="email" type="email" defaultValue={email} readOnly autoComplete="email" />
      <Field label="Nom et prénom" name="full_name" defaultValue={v.full_name} autoComplete="name" />
      <Field label="Téléphone" name="phone" type="tel" defaultValue={v.phone} autoComplete="tel" />
      <Field label="Mot de passe" name="password" type="password" autoComplete="new-password" hint="8 caractères minimum." />
      {state?.error && <Alert>{state.error}</Alert>}
      <SubmitButton pending={pending}>Rejoindre l’agence</SubmitButton>
    </form>
  );
}
