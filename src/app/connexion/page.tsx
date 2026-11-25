import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/forms/login-form";
import { AuthCard } from "@/components/forms/ui";

export const metadata: Metadata = { title: "Se connecter" };

async function Form({ searchParams }: { searchParams: PageProps<"/connexion">["searchParams"] }) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : ""} />;
}

export default function Page(props: PageProps<"/connexion">) {
  return (
    <AuthCard title="Se connecter" subtitle="Agences, agents et chercheurs : un seul espace de connexion.">
      <Suspense>
        <Form searchParams={props.searchParams} />
      </Suspense>
    </AuthCard>
  );
}
