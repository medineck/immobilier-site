import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Créer un compte" };

export default function Page() {
  return (
    <ComingSoon title="Créer un compte" step={2}>
      Vous pourrez bientôt choisir « Je cherche un logement » ou « Je suis une agence ».
    </ComingSoon>
  );
}
