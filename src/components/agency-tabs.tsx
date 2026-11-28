"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UnreadBadge } from "@/components/unread";

const tabs = [
  { href: "/espace-agence", label: "Tableau de bord", exact: true },
  { href: "/espace-agence/annonces", label: "Annonces" },
  { href: "/espace-agence/messages", label: "Messages" },
  { href: "/espace-agence/agenda", label: "Agenda" },
  { href: "/espace-agence/disponibilites", label: "Disponibilités" },
];

export function AgencyTabs({ static: isStatic }: { static?: boolean }) {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- version statique sans hook pour le chargement
  const path = isStatic ? "" : usePathname();
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto">
      {tabs.map((t) => {
        const active = t.exact ? path === t.href : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap ${active ? "border-brand-500 text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t.label}
            {t.href === "/espace-agence/messages" && <UnreadBadge className="ml-1.5" />}
          </Link>
        );
      })}
    </nav>
  );
}
