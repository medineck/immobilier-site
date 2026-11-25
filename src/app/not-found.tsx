import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">Page introuvable</h1>
      <p className="mt-3 text-muted">Cette page n’existe pas ou a été déplacée.</p>
      <Link href="/" className="mt-8 inline-block rounded-lg bg-brand-500 px-5 py-2.5 font-semibold text-white">Retour à l’accueil</Link>
    </div>
  );
}
