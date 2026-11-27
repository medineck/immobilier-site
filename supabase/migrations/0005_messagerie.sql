-- =============================================================
-- Étape 5 : messagerie entre chercheurs et agences
-- =============================================================

-- Une conversation par annonce et par chercheur
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings (id) on delete set null,
  listing_title text not null,               -- conservé si l'annonce est supprimée
  agency_id uuid not null references public.agencies (id) on delete cascade,
  agent_id uuid references public.profiles (id) on delete set null,
  seeker_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_message_preview text not null default '',
  last_sender_id uuid,
  seeker_last_read_at timestamptz not null default now(),
  agency_last_read_at timestamptz not null default 'epoch',
  unique (listing_id, seeker_id)
);
create index conversations_seeker_idx on public.conversations (seeker_id, last_message_at desc);
create index conversations_agency_idx on public.conversations (agency_id, last_message_at desc);
create index conversations_agent_idx on public.conversations (agent_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- Qui a accès à une conversation : le chercheur, l'agent responsable, le directeur de l'agence
create or replace function public.can_access_conversation(p_conversation uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation
      and (c.seeker_id = auth.uid() or c.agent_id = auth.uid() or public.is_agency_director(c.agency_id))
  );
$$;

-- Chaque nouveau message met à jour le résumé de la conversation
create or replace function public.on_message_inserted()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations
     set last_message_at = new.created_at,
         last_message_preview = left(regexp_replace(new.body, '\s+', ' ', 'g'), 140),
         last_sender_id = new.sender_id,
         seeker_last_read_at = case when new.sender_id = seeker_id then new.created_at else seeker_last_read_at end,
         agency_last_read_at = case when new.sender_id <> seeker_id then new.created_at else agency_last_read_at end
   where id = new.conversation_id;
  return new;
end;
$$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_message_inserted();

-- Le chercheur écrit depuis une annonce : crée la conversation (ou reprend l'existante) et envoie le message
create or replace function public.contact_agency(p_listing uuid, p_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_listing public.listings%rowtype;
  v_conv uuid;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'chercheur') then
    raise exception 'Seuls les comptes chercheur peuvent contacter une agence';
  end if;
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 4000 then
    raise exception 'Message vide ou trop long';
  end if;
  select * into v_listing from public.listings where id = p_listing and published;
  if not found then
    raise exception 'Annonce introuvable';
  end if;

  insert into public.conversations (listing_id, listing_title, agency_id, agent_id, seeker_id)
    values (v_listing.id, v_listing.title, v_listing.agency_id, v_listing.agent_id, auth.uid())
    on conflict (listing_id, seeker_id) do update set listing_title = excluded.listing_title
    returning id into v_conv;

  insert into public.messages (conversation_id, sender_id, body) values (v_conv, auth.uid(), trim(p_body));
  return v_conv;
end;
$$;

-- Marque la conversation comme lue (côté chercheur ou côté agence)
create or replace function public.mark_conversation_read(p_conversation uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations
     set seeker_last_read_at = case when seeker_id = auth.uid() then now() else seeker_last_read_at end,
         agency_last_read_at = case when seeker_id <> auth.uid() then now() else agency_last_read_at end
   where id = p_conversation and public.can_access_conversation(id);
end;
$$;

-- L'agence voit les coordonnées des chercheurs qui lui écrivent
create or replace function public.is_my_contact(p_profile uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversations c
    where c.seeker_id = p_profile
      and (c.agent_id = auth.uid() or public.is_agency_director(c.agency_id))
  );
$$;
create policy "l'agence voit les chercheurs qui la contactent" on public.profiles
  for select to authenticated using (public.is_my_contact(id));

-- Sécurité --------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

grant select on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;

create policy "voir ses conversations" on public.conversations
  for select to authenticated
  using (seeker_id = auth.uid() or agent_id = auth.uid() or public.is_agency_director(agency_id));

create policy "lire les messages de ses conversations" on public.messages
  for select to authenticated using (public.can_access_conversation(conversation_id));
create policy "écrire dans ses conversations" on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid() and public.can_access_conversation(conversation_id));

revoke execute on function public.contact_agency(uuid, text) from public, anon;
grant execute on function public.contact_agency(uuid, text) to authenticated;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
revoke execute on function public.on_message_inserted() from public, anon, authenticated;

-- Messages en direct
alter publication supabase_realtime add table public.messages;
