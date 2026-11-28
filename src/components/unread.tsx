"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUnreadCount } from "@/app/actions/messages";

// Nombre de messages non lus, partagé par toutes les pastilles de la page
let count = 0;
const listeners = new Set<() => void>();
function setCount(n: number) {
  if (n === count) return;
  count = n;
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
// Recalcule le nombre de non-lus (ex. : juste après avoir lu une conversation)
export async function refreshUnread() {
  setCount(await getUnreadCount());
}

export const useUnread = (initial: number) => useSyncExternalStore(subscribe, () => count, () => initial);

const BASE_TITLE = /^\(\d+\) /;

// Écoute les nouveaux messages en direct et met à jour la pastille (une seule fois par page)
export function UnreadWatcher({ initial, userId }: { initial: number; userId: string }) {
  const path = usePathname();

  useEffect(() => {
    setCount(initial);
  }, [initial]);

  // Après chaque changement de page (ex. : conversation ouverte, donc lue)
  useEffect(() => {
    let cancelled = false;
    getUnreadCount().then((n) => !cancelled && setCount(n));
    return () => {
      cancelled = true;
    };
  }, [path]);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = (delay: number) => {
      clearTimeout(timer);
      // Petit délai : si la conversation est ouverte, elle est marquée lue d'abord
      timer = setTimeout(() => getUnreadCount().then(setCount), delay);
    };
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      channel = supabase
        .channel(`non-lus:${userId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
          if ((payload.new as { sender_id: string | null }).sender_id !== userId) refresh(1500);
        })
        .subscribe();
    })();
    const onFocus = () => refresh(0);
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  // « (2) VisiteFacile » dans l'onglet du navigateur
  const n = useUnread(initial);
  useEffect(() => {
    const apply = () => {
      const base = document.title.replace(BASE_TITLE, "");
      const next = n > 0 ? `(${n}) ${base}` : base;
      if (document.title !== next) document.title = next;
    };
    apply();
    // Le titre change à chaque page : on réapplique le compteur
    const obs = new MutationObserver(apply);
    obs.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => obs.disconnect();
  }, [n, path]);

  return null;
}

// Pastille avec le nombre (rien si 0)
export function UnreadBadge({ initial = 0, className = "" }: { initial?: number; className?: string }) {
  const n = useUnread(initial);
  if (n <= 0) return null;
  return (
    <span className={`rounded-full bg-brand-500 px-1.5 py-0.5 text-xs leading-none font-bold text-white ${className}`} aria-label={`${n} conversation(s) non lue(s)`}>
      {n}
    </span>
  );
}

// Point vert (bouton du menu sur téléphone)
export function UnreadDot({ initial = 0, className = "" }: { initial?: number; className?: string }) {
  const n = useUnread(initial);
  if (n <= 0) return null;
  return <span className={`size-2.5 rounded-full bg-brand-500 ring-2 ring-white ${className}`} aria-label="Messages non lus" />;
}
