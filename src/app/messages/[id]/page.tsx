import type { Metadata } from "next";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { ConversationView } from "@/components/messages/inbox";

export const metadata: Metadata = { title: "Conversation" };

async function Content({ params, searchParams }: PageProps<"/messages/[id]">) {
  const profile = await requireProfile("chercheur");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  return <ConversationView id={id} profile={profile} basePath="/messages" justSent={sp.envoye === "1"} />;
}

export default function Page(props: PageProps<"/messages/[id]">) {
  return (
    <Suspense fallback={<div className="mx-auto mt-8 h-96 max-w-3xl animate-pulse rounded-2xl bg-surface" />}>
      <Content {...props} />
    </Suspense>
  );
}
