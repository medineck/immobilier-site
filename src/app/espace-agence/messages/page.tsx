import type { Metadata } from "next";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { InboxList } from "@/components/messages/inbox";

export const metadata: Metadata = { title: "Messages de l’agence" };

async function Inbox() {
  const profile = await requireProfile("agence");
  return (
    <>
      <p className="mb-6 text-muted">
        {profile.agency_role === "directeur"
          ? "Toutes les conversations de l’agence."
          : "Les conversations sur les annonces dont vous êtes responsable."}
      </p>
      <InboxList profile={profile} basePath="/espace-agence/messages" />
    </>
  );
}

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold sm:text-3xl">Messages</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-surface" />}>
        <Inbox />
      </Suspense>
    </div>
  );
}
