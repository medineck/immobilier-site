import type { Metadata } from "next";
import { Suspense } from "react";
import { ListingFormPage } from "../form-page";

export const metadata: Metadata = { title: "Nouvelle annonce" };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
        <ListingFormPage />
      </Suspense>
    </div>
  );
}
