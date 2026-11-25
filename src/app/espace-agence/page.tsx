import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Espace agence" };

export default function Page() {
  return <ComingSoon title="Espace agence" step={3}>Ici, les agences géreront leurs annonces, leurs messages et l’agenda de leurs agents.</ComingSoon>;
}
