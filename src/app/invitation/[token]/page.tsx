import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { AgentSignupForm } from "@/components/forms/agent-signup-form";
import { AuthCard } from "@/components/forms/ui";

export const metadata: Metadata = { title: "Rejoindre une agence" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Invitation({ params }: { params: PageProps<"/invitation/[token]">["params"] }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = UUID_RE.test(token) ? await supabase.rpc("get_invitation", { p_token: token }) : { data: null };
  const inv = data?.[0] as { agency_name: string; email: string } | undefined;

  if (!inv) {
    return (
      <AuthCard title="Invitation non valable" subtitle="Ce lien a déjà été utilisé ou a été annulé.">
        <p className="text-muted">Demandez un nouveau lien au directeur de votre agence.</p>
        <Link href="/" className="mt-6 inline-block font-medium text-brand-600 hover:underline">Retour à l’accueil</Link>
      </AuthCard>
    );
  }
  return (
    <AuthCard
      title="Rejoindre l’agence"
      subtitle={<>Vous êtes invité(e) à rejoindre <strong className="text-ink">{inv.agency_name}</strong> en tant qu’agent.</>}
    >
      <AgentSignupForm token={token} email={inv.email} />
    </AuthCard>
  );
}

export default function Page(props: PageProps<"/invitation/[token]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-md animate-pulse rounded-2xl bg-surface" />}>
      <Invitation params={props.params} />
    </Suspense>
  );
}
