import type { Metadata } from "next";
import { Suspense } from "react";
import { ListingFormPage } from "../../form-page";

export const metadata: Metadata = { title: "Modifier l’annonce" };

async function Content({ params }: { params: PageProps<"/espace-agence/annonces/[id]/modifier">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return <p className="text-muted">Annonce introuvable.</p>;
  return <ListingFormPage id={id} />;
}

export default function Page(props: PageProps<"/espace-agence/annonces/[id]/modifier">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
        <Content params={props.params} />
      </Suspense>
    </div>
  );
}
