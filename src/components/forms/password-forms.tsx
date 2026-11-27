"use client";

import { useActionState } from "react";
import { requestPasswordReset, updatePassword } from "@/app/actions/auth";
import { Alert, Field, SubmitButton } from "./ui";

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  if (state?.ok) return <Alert kind="ok">{state.ok}</Alert>;
  return (
    <form action={action} className="grid gap-5">
      <Field label="Email" name="email" type="email" defaultValue={state?.values?.email} autoComplete="email" />
      {state?.error && <Alert>{state.error}</Alert>}
      <SubmitButton pending={pending}>Recevoir le lien</SubmitButton>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, undefined);
  return (
    <form action={action} className="grid gap-5">
      <Field label="Nouveau mot de passe" name="password" type="password" autoComplete="new-password" hint="8 caractères minimum." />
      <Field label="Confirmez le mot de passe" name="confirm" type="password" autoComplete="new-password" />
      {state?.error && <Alert>{state.error}</Alert>}
      <SubmitButton pending={pending}>Enregistrer</SubmitButton>
    </form>
  );
}
