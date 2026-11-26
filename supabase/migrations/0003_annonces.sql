-- =============================================================
-- Étape 3 : annonces et photos
-- =============================================================

create type public.listing_type as enum ('location', 'vente');

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  agent_id uuid references public.profiles (id) on delete set null,
  title text not null check (char_length(title) between 3 and 140),
  type public.listing_type not null,
  price integer not null check (price > 0 and price < 100000000),
  surface numeric(7, 1) not null check (surface > 0 and surface < 100000),
  rooms smallint not null check (rooms between 1 and 50),
  city text not null check (char_length(city) between 1 and 120),
  description text not null default '' check (char_length(description) <= 5000),
  photos text[] not null default '{}' check (cardinality(photos) <= 15),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index listings_agency_idx on public.listings (agency_id);
create index listings_search_idx on public.listings (type, lower(city)) where published;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger listings_touch before update on public.listings
  for each row execute function public.touch_updated_at();

-- L'agent indiqué fait-il partie de l'agence ?
create or replace function public.is_agency_member(p_user uuid, p_agency uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = p_user and agency_id = p_agency);
$$;

-- Peut-on gérer cette annonce ? (le directeur : toutes ; un agent : les siennes)
create or replace function public.can_manage_listing(p_agency uuid, p_agent uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_agency_director(p_agency)
      or (p_agent = auth.uid() and public.current_agency_id() = p_agency);
$$;

alter table public.listings enable row level security;
grant select on public.listings to anon, authenticated;
grant insert, update, delete on public.listings to authenticated;

create policy "annonces publiées visibles par tous, toutes visibles par l'agence" on public.listings
  for select using (published or agency_id = public.current_agency_id());
create policy "créer une annonce pour son agence" on public.listings
  for insert to authenticated
  with check (
    agency_id = public.current_agency_id()
    and public.can_manage_listing(agency_id, agent_id)
    and public.is_agency_member(agent_id, agency_id)
  );
create policy "modifier ses annonces" on public.listings
  for update to authenticated
  using (public.can_manage_listing(agency_id, agent_id))
  with check (
    agency_id = public.current_agency_id()
    and public.can_manage_listing(agency_id, agent_id)
    and public.is_agency_member(agent_id, agency_id)
  );
create policy "supprimer ses annonces" on public.listings
  for delete to authenticated
  using (public.can_manage_listing(agency_id, agent_id));

-- Photos : espace de stockage public en lecture ------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('annonces', 'annonces', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Chaque agence dépose et supprime uniquement dans son propre dossier : <agency_id>/...
create policy "l'agence dépose ses photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'annonces' and (storage.foldername(name))[1] = public.current_agency_id()::text);
create policy "l'agence voit ses photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'annonces' and (storage.foldername(name))[1] = public.current_agency_id()::text);
create policy "l'agence supprime ses photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'annonces' and (storage.foldername(name))[1] = public.current_agency_id()::text);
