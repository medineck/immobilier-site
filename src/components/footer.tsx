import Link from "next/link";
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <p>© {site.name}. Annonces immobilières en France.</p>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/annonces" className="hover:text-ink">Toutes les annonces</Link>
          <Link href="/espace-agence" className="hover:text-ink">Vous êtes une agence ?</Link>
        </nav>
      </div>
    </footer>
  );
}
