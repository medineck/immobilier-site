"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/app/actions/auth";
import { Alert, Field, SubmitButton } from "./ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="next" value={next} />
      <Field label="Email" name="email" type="email" defaultValue={state?.values?.email} autoComplete="email" />
      <div className="grid gap-1.5">
        <Field label="Mot de passe" name="password" type="password" autoComplete="current-password" />
        <Link href="/mot-de-passe-oublie" className="justify-self-end text-sm text-brand-600 hover:underline">
          Mot de passe oublié ?
        </Link>
      </div>
      {state?.error && <Alert>{state.error}</Alert>}
      <SubmitButton pending={pending}>Se connecter</SubmitButton>
      <p className="text-center text-sm text-muted">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-medium text-brand-600 hover:underline">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}
