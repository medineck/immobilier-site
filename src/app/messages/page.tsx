import type { Metadata } from "next";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { InboxList } from "@/components/messages/inbox";

export const metadata: Metadata = { title: "Mes messages" };

async function Inbox() {
  const profile = await requireProfile("chercheur");
  return <InboxList profile={profile} basePath="/messages" />;
}

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Mes messages</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-surface" />}>
        <Inbox />
      </Suspense>
    </div>
  );
}
