-- =============================================================
-- Étape 6 : disponibilités des agents, propositions et réservation de visites
-- Toutes les heures sont calculées à l'heure de Paris.
-- =============================================================

create extension if not exists btree_gist with schema extensions;

-- Horaires de visite de chaque agent ----------------------------
-- weekly : { "1": ["09:00","19:00"], ..., "7": null }  (1 = lundi, 7 = dimanche ; null = pas de visite)
create table public.agent_schedules (
  agent_id uuid primary key references public.profiles (id) on delete cascade,
  visit_minutes smallint not null default 30 check (visit_minutes in (15, 30, 45, 60, 90)),
  buffer_minutes smallint not null default 15 check (buffer_minutes in (0, 15, 30, 45, 60)),
  weekly jsonb not null default '{"1":["09:00","19:00"],"2":["09:00","19:00"],"3":["09:00","19:00"],"4":["09:00","19:00"],"5":["09:00","19:00"],"6":["09:00","13:00"],"7":null}',
  updated_at timestamptz not null default now()
);

-- Horaires d'un agent (valeurs par défaut s'il n'a rien réglé)
create or replace function public.agent_schedule(p_agent uuid)
returns public.agent_schedules language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select s from public.agent_schedules s where s.agent_id = p_agent),
    row(p_agent, 30, 15,
      '{"1":["09:00","19:00"],"2":["09:00","19:00"],"3":["09:00","19:00"],"4":["09:00","19:00"],"5":["09:00","19:00"],"6":["09:00","13:00"],"7":null}'::jsonb,
      now())::public.agent_schedules
  );
$$;

-- Visites --------------------------------------------------------
create type public.visit_status as enum ('confirmee', 'annulee');

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete set null,
  listing_title text not null,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  agent_id uuid not null references public.profiles (id) on delete cascade,
  seeker_id uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  busy_until timestamptz not null,           -- fin de la visite + battement
  status public.visit_status not null default 'confirmee',
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles (id) on delete set null,
  check (ends_at > starts_at and busy_until >= ends_at),
  -- Impossible d'avoir deux visites qui se chevauchent pour le même agent
  constraint visits_no_overlap exclude using gist (agent_id with =, tstzrange(starts_at, busy_until) with &&) where (status = 'confirmee')
);
create index visits_agent_idx on public.visits (agent_id, starts_at);
create index visits_seeker_idx on public.visits (seeker_id, starts_at);
create index visits_conversation_idx on public.visits (conversation_id);

-- Messages spéciaux dans la conversation ---------------------------
-- texte : message normal ; proposition : fenêtre de créneaux ; visite_confirmee / visite_annulee : messages automatiques
alter table public.messages
  add column kind text not null default 'texte' check (kind in ('texte', 'proposition', 'visite_confirmee', 'visite_annulee')),
  add column meta jsonb not null default '{}';

-- Les messages écrits à la main sont forcément de type « texte »
drop policy "écrire dans ses conversations" on public.messages;
create policy "écrire dans ses conversations" on public.messages
  for insert to authenticated
  with check (kind = 'texte' and sender_id = auth.uid() and public.can_access_conversation(conversation_id));

-- Date en français : « mardi 3 décembre à 18 h 00 »
create or replace function public.fr_datetime(p timestamptz)
returns text language sql stable set search_path = '' as $$
  select (array['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'])[extract(isodow from l)::int]
      || ' ' || extract(day from l)::int
      || case when extract(day from l)::int = 1 then 'er' else '' end
      || ' ' || (array['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'])[extract(month from l)::int]
      || ' à ' || to_char(l, 'FMHH24" h "MI')
  from (select p at time zone 'Europe/Paris' as l) t;
$$;

-- Agent dont l'agenda est utilisé pour la conversation
create or replace function public.conversation_agent(p_conversation uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select coalesce(c.agent_id, (select id from public.profiles where agency_id = c.agency_id and agency_role = 'directeur' limit 1))
  from public.conversations c where c.id = p_conversation;
$$;

-- Visite à venir du chercheur pour cette conversation
create or replace function public.upcoming_visit(p_conversation uuid)
returns public.visits language sql stable security definer set search_path = '' as $$
  select v.* from public.visits v
  join public.conversations c on c.id = p_conversation
  where v.seeker_id = c.seeker_id
    and v.listing_id is not distinct from c.listing_id
    and v.status = 'confirmee' and v.starts_at > now()
    and public.can_access_conversation(p_conversation)
  order by v.starts_at limit 1;
$$;

-- Créneaux libres de l'agent : 14 prochains jours, au moins 2 h à l'avance, toutes les 30 min
create or replace function public.available_slots(p_conversation uuid)
returns setof timestamptz language plpgsql stable security definer set search_path = '' as $$
declare
  v_agent uuid;
  s public.agent_schedules;
begin
  if not public.can_access_conversation(p_conversation) then
    raise exception 'Accès refusé';
  end if;
  v_agent := public.conversation_agent(p_conversation);
  if v_agent is null then return; end if;
  s := public.agent_schedule(v_agent);

  return query
  with days as (
    select d::date as day
    from generate_series((now() at time zone 'Europe/Paris')::date, (now() at time zone 'Europe/Paris')::date + 14, interval '1 day') d
  ),
  ranges as (
    select day,
           (day + ((s.weekly -> extract(isodow from day)::text) ->> 0)::time) as open_at,
           (day + ((s.weekly -> extract(isodow from day)::text) ->> 1)::time) as close_at
    from days
    where jsonb_typeof(s.weekly -> extract(isodow from day)::text) = 'array'
  ),
  candidates as (
    select (gs at time zone 'Europe/Paris') as slot
    from ranges r,
         generate_series(r.open_at, r.close_at - make_interval(mins => s.visit_minutes), interval '30 minutes') gs
  )
  select c.slot from candidates c
  where c.slot >= now() + interval '2 hours'
    and c.slot < now() + interval '14 days'
    and not exists (
      select 1 from public.visits v
      where v.agent_id = v_agent and v.status = 'confirmee'
        and tstzrange(v.starts_at, v.busy_until) && tstzrange(c.slot, c.slot + make_interval(mins => s.visit_minutes + s.buffer_minutes))
    )
  order by c.slot;
end;
$$;

-- L'agence propose une visite : affiche la fenêtre de créneaux chez le client
create or replace function public.propose_visit(p_conversation uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  c public.conversations%rowtype;
  v_msg uuid;
begin
  select * into c from public.conversations where id = p_conversation;
  if not found or not public.can_access_conversation(p_conversation) or c.seeker_id = auth.uid() then
    raise exception 'Seule l’agence peut proposer une visite';
  end if;
  if (public.upcoming_visit(p_conversation)).id is not null then
    raise exception 'DEJA_RESERVEE';
  end if;
  if not exists (select 1 from public.available_slots(p_conversation)) then
    raise exception 'AUCUN_CRENEAU';
  end if;
  insert into public.messages (conversation_id, sender_id, body, kind)
    values (p_conversation, auth.uid(), '📅 Choisissez un créneau de visite', 'proposition')
    returning id into v_msg;
  return v_msg;
end;
$$;

-- Le client valide un créneau : la visite est confirmée immédiatement
create or replace function public.book_visit(p_conversation uuid, p_start timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  c public.conversations%rowtype;
  s public.agent_schedules;
  v_agent uuid;
  v_visit uuid;
begin
  select * into c from public.conversations where id = p_conversation;
  if not found or c.seeker_id <> auth.uid() then
    raise exception 'Seul le client peut réserver';
  end if;
  if not exists (select 1 from public.messages where conversation_id = p_conversation and kind = 'proposition') then
    raise exception 'Aucune proposition de visite';
  end if;
  if (public.upcoming_visit(p_conversation)).id is not null then
    raise exception 'DEJA_RESERVEE';
  end if;
  if p_start not in (select public.available_slots(p_conversation)) then
    raise exception 'CRENEAU_PRIS';
  end if;
  v_agent := public.conversation_agent(p_conversation);
  s := public.agent_schedule(v_agent);

  begin
    insert into public.visits (conversation_id, listing_id, listing_title, agency_id, agent_id, seeker_id, starts_at, ends_at, busy_until)
      values (c.id, c.listing_id, c.listing_title, c.agency_id, v_agent, c.seeker_id, p_start,
              p_start + make_interval(mins => s.visit_minutes),
              p_start + make_interval(mins => s.visit_minutes + s.buffer_minutes))
      returning id into v_visit;
  exception when exclusion_violation then
    raise exception 'CRENEAU_PRIS';
  end;

  insert into public.messages (conversation_id, sender_id, body, kind, meta)
    values (p_conversation, auth.uid(),
            '✅ Visite confirmée le ' || public.fr_datetime(p_start) || ' (' || s.visit_minutes || ' min)',
            'visite_confirmee',
            jsonb_build_object('visit_id', v_visit, 'starts_at', p_start, 'minutes', s.visit_minutes));
  return v_visit;
end;
$$;

-- Sécurité ----------------------------------------------------------
alter table public.agent_schedules enable row level security;
alter table public.visits enable row level security;

grant select, insert, update on public.agent_schedules to authenticated;
grant select on public.visits to authenticated;

create policy "voir ses horaires (et ceux de l'équipe pour le directeur)" on public.agent_schedules
  for select to authenticated
  using (agent_id = auth.uid() or public.is_agency_director(public.current_agency_id()) and public.is_agency_member(agent_id, public.current_agency_id()));
create policy "régler ses horaires" on public.agent_schedules
  for insert to authenticated
  with check (agent_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'agence'));
create policy "modifier ses horaires" on public.agent_schedules
  for update to authenticated using (agent_id = auth.uid()) with check (agent_id = auth.uid());

create policy "voir ses visites" on public.visits
  for select to authenticated
  using (seeker_id = auth.uid() or agent_id = auth.uid() or public.is_agency_director(agency_id));

revoke execute on function public.available_slots(uuid) from public, anon;
revoke execute on function public.propose_visit(uuid) from public, anon;
revoke execute on function public.book_visit(uuid, timestamptz) from public, anon;
revoke execute on function public.upcoming_visit(uuid) from public, anon;
revoke execute on function public.conversation_agent(uuid) from public, anon;
revoke execute on function public.agent_schedule(uuid) from public, anon;
grant execute on function public.available_slots(uuid) to authenticated;
grant execute on function public.propose_visit(uuid) to authenticated;
grant execute on function public.book_visit(uuid, timestamptz) to authenticated;
grant execute on function public.upcoming_visit(uuid) to authenticated;
