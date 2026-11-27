import type { Metadata } from "next";
import { AuthCard } from "@/components/forms/ui";
import { NewPasswordForm } from "@/components/forms/password-forms";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default function Page() {
  return (
    <AuthCard title="Nouveau mot de passe" subtitle="Choisissez votre nouveau mot de passe.">
      <NewPasswordForm />
    </AuthCard>
  );
}
