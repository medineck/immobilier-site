-- =============================================================
-- Étape 7 : agenda — moments bloqués, annulation et déplacement des visites
-- =============================================================

-- Moments bloqués par l'agent (congés, rendez-vous personnel…)
create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '' check (char_length(reason) <= 120),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at - starts_at <= interval '120 days')
);
create index time_off_agent_idx on public.time_off (agent_id, starts_at);

alter table public.time_off enable row level security;
grant select, delete on public.time_off to authenticated;
create policy "voir ses moments bloqués (et ceux de l'équipe pour le directeur)" on public.time_off
  for select to authenticated
  using (agent_id = auth.uid() or (public.is_agency_director(public.current_agency_id()) and public.is_agency_member(agent_id, public.current_agency_id())));
create policy "supprimer ses moments bloqués" on public.time_off
  for delete to authenticated using (agent_id = auth.uid());

-- Ajout d'un moment bloqué, saisi en heure de Paris
create or replace function public.add_time_off(p_start timestamp, p_end timestamp, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'agence') then
    raise exception 'Réservé aux agents';
  end if;
  if p_end <= p_start then
    raise exception 'FIN_AVANT_DEBUT';
  end if;
  insert into public.time_off (agent_id, starts_at, ends_at, reason)
    values (auth.uid(), p_start at time zone 'Europe/Paris', p_end at time zone 'Europe/Paris', left(coalesce(trim(p_reason), ''), 120))
    returning id into v_id;
  return v_id;
end;
$$;

-- Les créneaux libres excluent désormais les moments bloqués
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
    and not exists (
      select 1 from public.time_off t
      where t.agent_id = v_agent
        and tstzrange(t.starts_at, t.ends_at) && tstzrange(c.slot, c.slot + make_interval(mins => s.visit_minutes))
    )
  order by c.slot;
end;
$$;

-- Annuler une visite (client, agent responsable ou directeur)
create or replace function public.cancel_visit(p_visit uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v public.visits%rowtype;
  v_by_seeker boolean;
begin
  select * into v from public.visits where id = p_visit for update;
  if not found or not (v.seeker_id = auth.uid() or v.agent_id = auth.uid() or public.is_agency_director(v.agency_id)) then
    raise exception 'Visite introuvable';
  end if;
  if v.status <> 'confirmee' or v.starts_at <= now() then
    raise exception 'VISITE_PASSEE';
  end if;
  v_by_seeker := v.seeker_id = auth.uid();
  update public.visits set status = 'annulee', cancelled_at = now(), cancelled_by = auth.uid() where id = p_visit;
  insert into public.messages (conversation_id, sender_id, body, kind, meta)
    values (v.conversation_id, auth.uid(),
            '❌ Visite du ' || public.fr_datetime(v.starts_at) || ' annulée par ' || case when v_by_seeker then 'le client' else 'l’agence' end,
            'visite_annulee', jsonb_build_object('visit_id', v.id));
end;
$$;

-- Déplacer une visite (agence) : la visite est libérée et une nouvelle fenêtre de créneaux est envoyée au client
create or replace function public.move_visit(p_visit uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v public.visits%rowtype;
begin
  select * into v from public.visits where id = p_visit for update;
  if not found or not (v.agent_id = auth.uid() or public.is_agency_director(v.agency_id)) then
    raise exception 'Visite introuvable';
  end if;
  if v.status <> 'confirmee' or v.starts_at <= now() then
    raise exception 'VISITE_PASSEE';
  end if;
  update public.visits set status = 'annulee', cancelled_at = now(), cancelled_by = auth.uid() where id = p_visit;
  insert into public.messages (conversation_id, sender_id, body, kind, meta)
    values (v.conversation_id, auth.uid(),
            '🔁 L’agence doit déplacer la visite du ' || public.fr_datetime(v.starts_at) || '. Choisissez un nouveau créneau ci-dessous.',
            'visite_annulee', jsonb_build_object('visit_id', v.id, 'moved', true));
  insert into public.messages (conversation_id, sender_id, body, kind)
    values (v.conversation_id, auth.uid(), '📅 Choisissez un créneau de visite', 'proposition');
end;
$$;

revoke execute on function public.add_time_off(timestamp, timestamp, text) from public, anon;
revoke execute on function public.cancel_visit(uuid) from public, anon;
revoke execute on function public.move_visit(uuid) from public, anon;
grant execute on function public.add_time_off(timestamp, timestamp, text) to authenticated;
grant execute on function public.cancel_visit(uuid) to authenticated;
grant execute on function public.move_visit(uuid) to authenticated;
