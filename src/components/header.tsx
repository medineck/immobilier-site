import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { MobileMenu } from "@/components/mobile-menu";
import { getProfile, homeFor } from "@/lib/auth";
import { countUnread } from "@/lib/messaging";
import { signOut } from "@/app/actions/auth";

export const navLinks = [
  { href: "/annonces?type=location", label: "Louer" },
  { href: "/annonces?type=vente", label: "Acheter" },
  { href: "/espace-agence", label: "Espace agence" },
];

// Partie droite du menu : dépend de la personne connectée
async function HeaderActions() {
  const profile = await getProfile();
  const unread = profile ? await countUnread(profile) : 0;
  const user = profile
    ? {
        name: profile.full_name.split(" ")[0],
        home: homeFor(profile),
        messages: profile.role === "agence" ? "/espace-agence/messages" : "/messages",
        unread,
      }
    : null;

  return (
    <>
      <div className="hidden items-center gap-2 md:flex">
        {user ? (
          <>
            <Link href={user.messages} className="relative rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-surface">
              Messages
              {user.unread > 0 && (
                <span className="ml-1.5 rounded-full bg-brand-500 px-1.5 py-0.5 text-xs font-bold text-white" aria-label={`${user.unread} non lu(s)`}>
                  {user.unread}
                </span>
              )}
            </Link>
            <Link href={user.home} className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100">
              Mon espace · {user.name}
            </Link>
            <form action={signOut}>
              <button className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-surface hover:text-ink">Se déconnecter</button>
            </form>
          </>
        ) : (
          <>
            <Link href="/connexion" className="rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-surface">
              Se connecter
            </Link>
            <Link href="/inscription" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              Créer un compte
            </Link>
          </>
        )}
      </div>
      <MobileMenu links={navLinks} user={user} signOut={signOut} />
    </>
  );
}

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
        <Suspense fallback={<div className="h-10 w-10 md:w-56" />}>
          <HeaderActions />
        </Suspense>
      </div>
    </header>
  );
}
