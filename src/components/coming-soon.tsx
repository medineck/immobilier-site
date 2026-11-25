import Link from "next/link";

// Page provisoire pour les parties pas encore construites.
export function ComingSoon({ title, step, children }: { title: string; step: number; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="mb-3 inline-block rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">Bientôt disponible · étape {step}</p>
      <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
      <div className="mt-3 text-muted">{children}</div>
      <Link href="/" className="mt-8 inline-block rounded-lg border border-line px-4 py-2 font-medium hover:bg-surface">
        Retour à l’accueil
      </Link>
    </div>
  );
}
