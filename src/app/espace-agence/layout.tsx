import { Suspense } from "react";
import { AgencyTabs } from "@/components/agency-tabs";

export default function AgencyLayout({ children }: LayoutProps<"/espace-agence">) {
  return (
    <>
      <div className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4">
          <Suspense fallback={<AgencyTabs static />}>
            <AgencyTabs />
          </Suspense>
        </div>
      </div>
      {children}
    </>
  );
}
