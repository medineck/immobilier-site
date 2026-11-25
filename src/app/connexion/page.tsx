import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Se connecter" };

export default function Page() {
  return <ComingSoon title="Se connecter" step={2}>La connexion pour les agences et les chercheurs arrive à la prochaine étape.</ComingSoon>;
}
