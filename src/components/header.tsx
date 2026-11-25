import Link from "next/link";
import { Logo } from "@/components/logo";
import { MobileMenu } from "@/components/mobile-menu";

export const navLinks = [
  { href: "/annonces?type=location", label: "Louer" },
  { href: "/annonces?type=vente", label: "Acheter" },
  { href: "/espace-agence", label: "Espace agence" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/connexion" className="rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-surface">
            Se connecter
          </Link>
          <Link href="/inscription" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            Créer un compte
          </Link>
        </div>
        <MobileMenu links={navLinks} />
      </div>
    </header>
  );
}
