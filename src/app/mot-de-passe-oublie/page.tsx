import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard, Alert } from "@/components/forms/ui";
import { ResetRequestForm } from "@/components/forms/password-forms";

export const metadata: Metadata = { title: "Mot de passe oublié" };

async function Expired({ searchParams }: { searchParams: PageProps<"/mot-de-passe-oublie">["searchParams"] }) {
  const { expire } = await searchParams;
  return expire ? (
    <div className="mb-5">
      <Alert>Ce lien n’est plus valable (il a expiré ou a déjà servi). Faites une nouvelle demande ci-dessous.</Alert>
    </div>
  ) : null;
}

export default function Page(props: PageProps<"/mot-de-passe-oublie">) {
  return (
    <AuthCard title="Mot de passe oublié" subtitle="Indiquez votre email : vous recevrez un lien pour choisir un nouveau mot de passe.">
      <Suspense>
        <Expired searchParams={props.searchParams} />
      </Suspense>
      <ResetRequestForm />
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/connexion" className="font-medium text-brand-600 hover:underline">
          ← Retour à la connexion
        </Link>
      </p>
    </AuthCard>
  );
}
