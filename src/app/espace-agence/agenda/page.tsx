import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDays, fmtHM, isValidKey, labelDay, labelDayLong, mondayOf, paris, segmentOnDay, weekDays } from "@/lib/agenda";
import { fmtVisit } from "@/lib/visits";
import { deleteTimeOff } from "@/app/actions/visits";
import { VisitActions } from "@/components/visits/visit-actions";
import { TimeOffForm } from "@/components/visits/time-off-form";
import { ConfirmButton } from "@/components/confirm-button";

export const metadata: Metadata = { title: "Agenda" };

type Visit = {
  id: string;
  starts_at: string;
  ends_at: string;
  agent_id: string;
  conversation_id: string;
  listing_title: string;
  seeker: { full_name: string; phone: string | null } | null;
};
type TimeOff = { id: string; agent_id: string; starts_at: string; ends_at: string; reason: string };

const START_H = 7;
const END_H = 21;
const HOUR_PX = 44;
const COLORS = ["bg-brand-500", "bg-sky-600", "bg-violet-600", "bg-amber-600", "bg-rose-600", "bg-teal-700", "bg-indigo-600"];

async function Agenda({ searchParams }: { searchParams: PageProps<"/espace-agence/agenda">["searchParams"] }) {
  const profile = await requireProfile("agence");
  const sp = await searchParams;
  const now = new Date();
  const today = paris(now).key;
  const monday = mondayOf(isValidKey(sp.semaine) ? sp.semaine : today);
  const days = weekDays(monday);
  const isDirector = profile.agency_role === "directeur";
  const agentFilter = isDirector ? (typeof sp.agent === "string" ? sp.agent : "tous") : profile.id;

  const supabase = await createClient();
  const from = new Date(Date.parse(`${monday}T00:00:00Z`) - 86400000).toISOString();
  const to = new Date(Date.parse(`${addDays(monday, 8)}T00:00:00Z`)).toISOString();
  let vq = supabase
    .from("visits")
    .select("id, starts_at, ends_at, agent_id, conversation_id, listing_title, seeker:profiles!visits_seeker_id_fkey(full_name, phone)")
    .eq("status", "confirmee")
    .gte("starts_at", from)
    .lt("starts_at", to)
    .order("starts_at");
  let tq = supabase.from("time_off").select("id, agent_id, starts_at, ends_at, reason").lt("starts_at", to).gt("ends_at", from).order("starts_at");
  if (agentFilter !== "tous") {
    vq = vq.eq("agent_id", agentFilter);
    tq = tq.eq("agent_id", agentFilter);
  }
  const [{ data: team }, { data: vData }, { data: tData }, { data: myOff }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("agency_id", profile.agency!.id).order("full_name"),
    vq,
    tq,
    supabase.from("time_off").select("id, agent_id, starts_at, ends_at, reason").eq("agent_id", profile.id).gt("ends_at", now.toISOString()).order("starts_at"),
  ]);
  const visits = ((vData ?? []) as unknown as Visit[]).filter((v) => days.includes(paris(v.starts_at).key));
  const offs = (tData ?? []) as TimeOff[];
  const names = new Map((team ?? []).map((m) => [m.id, m.full_name]));
  const color = new Map((team ?? []).map((m, i) => [m.id, COLORS[i % COLORS.length]]));
  const showAgent = agentFilter === "tous" && (team?.length ?? 0) > 1;
  const link = (p: { semaine?: string; agent?: string }) => {
    const q = new URLSearchParams();
    q.set("semaine", p.semaine ?? monday);
    if (isDirector) q.set("agent", p.agent ?? agentFilter);
    return `/espace-agence/agenda?${q}`;
  };
  const canManage = (v: Visit) => isDirector || v.agent_id === profile.id;

  return (
    <>
      {/* En-tête : semaine et filtre */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={link({ semaine: addDays(monday, -7) })} aria-label="Semaine précédente" className="grid size-9 place-items-center rounded-lg border border-line hover:bg-surface">
            ‹
          </Link>
          <Link href={link({ semaine: mondayOf(today) })} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface">
            Aujourd’hui
          </Link>
          <Link href={link({ semaine: addDays(monday, 7) })} aria-label="Semaine suivante" className="grid size-9 place-items-center rounded-lg border border-line hover:bg-surface">
            ›
          </Link>
          <p className="ml-2 font-semibold">
            Semaine du {labelDay(monday)} au {labelDay(addDays(monday, 6))}
          </p>
        </div>
        {isDirector && (team?.length ?? 0) > 1 && (
          <nav className="flex flex-wrap gap-2 text-sm" aria-label="Agenda de">
            {[{ id: "tous", full_name: "Toute l’équipe" }, ...(team ?? [])].map((m) => (
              <Link
                key={m.id}
                href={link({ agent: m.id })}
                aria-current={agentFilter === m.id ? "true" : undefined}
                className={`rounded-full px-3 py-1.5 ${agentFilter === m.id ? "bg-ink text-white" : "border border-line hover:bg-surface"}`}
              >
                {m.id === profile.id ? "Moi" : m.full_name}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {/* Vue semaine (ordinateur) */}
      <div className="mt-6 hidden overflow-hidden rounded-2xl border border-line md:block">
        <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-line bg-surface text-sm">
          <div />
          {days.map((d) => (
            <div key={d} className={`px-2 py-2 text-center first-letter:uppercase ${d === today ? "font-bold text-brand-700" : "text-muted"}`}>
              {labelDay(d)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[3.5rem_repeat(7,1fr)]" style={{ height: (END_H - START_H) * HOUR_PX }}>
          <div className="relative">
            {Array.from({ length: END_H - START_H }, (_, i) => (
              <span key={i} className="absolute right-2 -translate-y-1/2 text-[11px] text-muted" style={{ top: i * HOUR_PX }}>
                {i > 0 && `${START_H + i} h`}
              </span>
            ))}
          </div>
          {days.map((d) => (
            <div key={d} className={`relative border-l border-line ${d === today ? "bg-brand-50/40" : ""}`}>
              {Array.from({ length: END_H - START_H }, (_, i) => (
                <div key={i} className="absolute inset-x-0 border-t border-line/70" style={{ top: i * HOUR_PX }} />
              ))}
              {offs.map((t) => {
                const seg = segmentOnDay(t.starts_at, t.ends_at, d);
                if (!seg) return null;
                const top = Math.max(0, (seg.from / 60 - START_H) * HOUR_PX);
                const bottom = Math.min((END_H - START_H) * HOUR_PX, (seg.to / 60 - START_H) * HOUR_PX);
                if (bottom <= top) return null;
                return (
                  <div
                    key={t.id + d}
                    className="absolute inset-x-1 overflow-hidden rounded-md bg-[repeating-linear-gradient(45deg,#e3e8e6,#e3e8e6_6px,#f2f4f3_6px,#f2f4f3_12px)] px-1.5 py-1 text-[11px] text-muted"
                    style={{ top, height: bottom - top }}
                    title={t.reason || "Indisponible"}
                  >
                    {t.reason || "Indisponible"}
                    {showAgent && ` · ${names.get(t.agent_id)?.split(" ")[0]}`}
                  </div>
                );
              })}
              {visits
                .filter((v) => paris(v.starts_at).key === d)
                .map((v) => {
                  const s = paris(v.starts_at).minutes;
                  const e = paris(v.ends_at).minutes;
                  const top = Math.max(0, (s / 60 - START_H) * HOUR_PX);
                  const height = Math.max(22, ((e - s) / 60) * HOUR_PX - 2);
                  const past = Date.parse(v.ends_at) < now.getTime();
                  return (
                    <a
                      key={v.id}
                      href={`#visite-${v.id}`}
                      className={`absolute inset-x-1 overflow-hidden rounded-md px-1.5 py-1 text-[11px] leading-tight text-white shadow-sm hover:brightness-110 ${color.get(v.agent_id) ?? COLORS[0]} ${past ? "opacity-50" : ""}`}
                      style={{ top, height }}
                    >
                      <span className="font-semibold">{fmtHM(s)}</span> {v.seeker?.full_name}
                      <span className="block truncate opacity-90">{v.listing_title}</span>
                    </a>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Liste des visites (téléphone et ordinateur) */}
        <section>
          <h2 className="text-lg font-semibold">Visites de la semaine</h2>
          {visits.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-line p-6 text-center text-muted">Aucune visite cette semaine.</p>
          ) : (
            <ol className="mt-3 grid gap-5">
              {days
                .filter((d) => visits.some((v) => paris(v.starts_at).key === d))
                .map((d) => (
                  <li key={d}>
                    <h3 className={`mb-2 text-sm font-semibold first-letter:uppercase ${d === today ? "text-brand-700" : "text-muted"}`}>
                      {labelDayLong(d)}
                      {d === today && " · aujourd’hui"}
                    </h3>
                    <ul className="grid gap-2">
                      {visits
                        .filter((v) => paris(v.starts_at).key === d)
                        .map((v) => {
                          const future = Date.parse(v.starts_at) > now.getTime();
                          return (
                            <li key={v.id} id={`visite-${v.id}`} className="scroll-mt-24 rounded-xl border border-line p-4 target:ring-2 target:ring-brand-500">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="font-semibold">
                                    {fmtHM(paris(v.starts_at).minutes)} – {fmtHM(paris(v.ends_at).minutes)} · {v.seeker?.full_name}
                                  </p>
                                  <p className="text-sm text-muted">{v.listing_title}</p>
                                  {v.seeker?.phone && <p className="text-sm text-muted">{v.seeker.phone}</p>}
                                  {showAgent && (
                                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                                      <span className={`size-2 rounded-full ${color.get(v.agent_id)}`} />
                                      {names.get(v.agent_id)}
                                    </p>
                                  )}
                                </div>
                                <Link href={`/espace-agence/messages/${v.conversation_id}`} className="text-sm font-medium text-brand-700 hover:underline">
                                  Conversation →
                                </Link>
                              </div>
                              {future && canManage(v) && (
                                <div className="mt-3 border-t border-line pt-3">
                                  <VisitActions visitId={v.id} label={fmtVisit(v.starts_at)} canMove />
                                </div>
                              )}
                            </li>
                          );
                        })}
                    </ul>
                  </li>
                ))}
            </ol>
          )}
        </section>

        {/* Moments bloqués */}
        <aside className="grid content-start gap-4">
          <section className="rounded-2xl border border-line p-5">
            <h2 className="font-semibold">Bloquer un moment</h2>
            <p className="mt-1 mb-4 text-sm text-muted">Congés, rendez-vous… Aucun client ne pourra réserver pendant ce moment.</p>
            <TimeOffForm today={today} />
          </section>
          {!!myOff?.length && (
            <section className="rounded-2xl border border-line p-5">
              <h2 className="font-semibold">Mes moments bloqués</h2>
              <ul className="mt-3 divide-y divide-line">
                {(myOff as TimeOff[]).map((t) => (
                  <li key={t.id} className="flex items-start justify-between gap-2 py-2.5 text-sm">
                    <span>
                      <span className="font-medium">{t.reason || "Indisponible"}</span>
                      <br />
                      <span className="text-muted">
                        du {fmtVisit(t.starts_at)}
                        <br />
                        au {fmtVisit(t.ends_at)}
                      </span>
                    </span>
                    <form action={deleteTimeOff}>
                      <input type="hidden" name="id" value={t.id} />
                      <ConfirmButton message="Supprimer ce moment bloqué ? Les clients pourront à nouveau réserver pendant cette période.">Supprimer</ConfirmButton>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}

export default function Page(props: PageProps<"/espace-agence/agenda">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Agenda</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
        <Agenda searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
