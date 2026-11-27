"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { markRead, sendMessage } from "@/app/actions/messages";
import { proposeVisit } from "@/app/actions/visits";
import { ProposalCard } from "./proposal-card";
import type { Message } from "@/lib/messaging";

const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });

export function Thread({
  conversationId,
  initialMessages,
  currentUserId,
  names,
  fallbackName,
  isSeeker,
}: {
  conversationId: string;
  initialMessages: Message[];
  currentUserId: string;
  names: Record<string, string>; // nom affiché de chaque expéditeur
  fallbackName: string;
  isSeeker: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);

  const add = (m: Message) => setMessages((ms) => (ms.some((x) => x.id === m.id) ? ms : [...ms, m]));

  // Réception des nouveaux messages en direct
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;
    (async () => {
      // On transmet d'abord l'identité de la personne : les règles de sécurité filtrent les messages reçus
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      channel = supabase
        .channel(`conversation:${conversationId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
          const m = payload.new as Message;
          add(m);
          if (m.sender_id !== currentUserId) markRead(conversationId);
        })
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // Seule la dernière proposition de visite est active ; elle se met à jour à chaque confirmation
  const lastProposal = [...messages].reverse().find((m) => m.kind === "proposition")?.id;
  const visitVersion = [...messages].reverse().find((m) => m.kind === "visite_confirmee" || m.kind === "visite_annulee")?.id ?? "";

  function propose() {
    setError(undefined);
    startTransition(async () => {
      const res = await proposeVisit(conversationId);
      if (res.message) add(res.message);
      else setError(res.error);
    });
  }

  function send() {
    const text = draft.trim();
    if (!text || pending) return;
    setError(undefined);
    startTransition(async () => {
      const res = await sendMessage(conversationId, text);
      if (res.message) {
        add(res.message);
        setDraft("");
      } else setError(res.error);
    });
  }

  return (
    <div className="flex flex-col">
      <ol className="flex min-h-[40vh] flex-col gap-2 px-1 py-4" aria-live="polite">
        {messages.map((m, i) => {
          const mine = m.sender_id === currentUserId;
          const d = new Date(m.created_at);
          const day = dayFmt.format(d);
          // Affiche la date au premier message de chaque jour
          const showDay = i === 0 || dayFmt.format(new Date(messages[i - 1].created_at)) !== day;
          return (
            <li key={m.id} className="contents">
              {showDay && <p className="my-2 text-center text-xs font-medium text-muted first-letter:uppercase">{day}</p>}
              {m.kind === "proposition" ? (
                <ProposalCard conversationId={conversationId} isSeeker={isSeeker} active={m.id === lastProposal} version={visitVersion} />
              ) : m.kind === "visite_confirmee" || m.kind === "visite_annulee" ? (
                <p
                  className={`my-1 self-center rounded-xl px-4 py-2.5 text-center text-sm font-medium ${
                    m.kind === "visite_confirmee" ? "bg-brand-50 text-brand-700" : "bg-red-50 text-red-800"
                  }`}
                >
                  {m.body}
                </p>
              ) : (
              <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                {!mine && <span className="mb-0.5 px-1 text-xs text-muted">{(m.sender_id && names[m.sender_id]) || fallbackName}</span>}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 whitespace-pre-line break-words sm:max-w-[70%] ${
                    mine ? "rounded-br-md bg-brand-500 text-white" : "rounded-bl-md bg-surface text-ink"
                  }`}
                >
                  {m.body}
                </div>
                <span className="mt-0.5 px-1 text-[11px] text-muted">{timeFmt.format(d)}</span>
              </div>
              )}
            </li>
          );
        })}
        <div ref={bottom} />
      </ol>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="sticky bottom-0 border-t border-line bg-white pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
        {!isSeeker && (
          <button
            type="button"
            onClick={propose}
            disabled={pending}
            className="mb-2 w-full rounded-xl border border-brand-500 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50 sm:w-auto"
          >
            📅 Proposer une visite
          </button>
        )}
        <div className="flex items-end gap-2">
          <label className="flex-1">
            <span className="sr-only">Votre message</span>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              maxLength={4000}
              placeholder="Écrire un message…"
              className="block max-h-40 w-full resize-y rounded-xl border border-line px-3.5 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <button
            disabled={pending || !draft.trim()}
            className="rounded-xl bg-brand-500 px-5 py-3 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {pending ? "…" : "Envoyer"}
          </button>
        </div>
      </form>
    </div>
  );
}
