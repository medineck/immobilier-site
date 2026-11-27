import type { Metadata } from "next";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { ConversationView } from "@/components/messages/inbox";

export const metadata: Metadata = { title: "Conversation" };

async function Content({ params }: { params: PageProps<"/espace-agence/messages/[id]">["params"] }) {
  const profile = await requireProfile("agence");
  const { id } = await params;
  return <ConversationView id={id} profile={profile} basePath="/espace-agence/messages" />;
}

export default function Page(props: PageProps<"/espace-agence/messages/[id]">) {
  return (
    <Suspense fallback={<div className="mx-auto mt-8 h-96 max-w-3xl animate-pulse rounded-2xl bg-surface" />}>
      <Content params={props.params} />
    </Suspense>
  );
}
