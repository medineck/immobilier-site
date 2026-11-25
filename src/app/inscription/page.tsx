import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/forms/signup-form";
import { AuthCard } from "@/components/forms/ui";

export const metadata: Metadata = { title: "Créer un compte" };

async function Form({ searchParams }: { searchParams: PageProps<"/inscription">["searchParams"] }) {
  const { role } = await searchParams;
  return <SignupForm initialRole={role === "agence" ? "agence" : "chercheur"} />;
}

export default function Page(props: PageProps<"/inscription">) {
  return (
    <AuthCard title="Créer un compte" subtitle="Quelques informations et c’est parti.">
      <Suspense>
        <Form searchParams={props.searchParams} />
      </Suspense>
    </AuthCard>
  );
}
