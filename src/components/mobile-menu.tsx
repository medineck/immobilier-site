"use client";

import Link from "next/link";
import { useState } from "react";

type User = { name: string; home: string } | null;

export function MobileMenu({
  links,
  user,
  signOut,
}: {
  links: { href: string; label: string }[];
  user: User;
  signOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        className="grid size-10 place-items-center rounded-lg text-ink hover:bg-surface"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-6" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />}
        </svg>
      </button>
      {open && (
        <div className="absolute inset-x-0 top-16 border-b border-line bg-white px-4 pb-4 shadow-sm">
          <nav className="flex flex-col py-2">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={close} className="rounded-lg px-2 py-3 font-medium text-ink hover:bg-surface">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="grid gap-2 border-t border-line pt-4">
            {user ? (
              <>
                <Link href={user.home} onClick={close} className="rounded-lg bg-brand-500 px-4 py-3 text-center font-semibold text-white">
                  Mon espace · {user.name}
                </Link>
                <form action={signOut}>
                  <button onClick={close} className="w-full rounded-lg border border-line px-4 py-3 text-center font-medium">
                    Se déconnecter
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/connexion" onClick={close} className="rounded-lg border border-line px-4 py-3 text-center font-medium">
                  Se connecter
                </Link>
                <Link href="/inscription" onClick={close} className="rounded-lg bg-brand-500 px-4 py-3 text-center font-semibold text-white">
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
