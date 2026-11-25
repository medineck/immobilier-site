-- =============================================================
-- Étape 2 : comptes, agences et invitations d'agents
-- =============================================================

create extension if not exists unaccent with schema extensions;

create type public.user_role as enum ('chercheur', 'agence');
create type public.agency_role as enum ('directeur', 'agent');

-- Agences ------------------------------------------------------
create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique,
  city text not null check (char_length(city) between 1 and 120),
  phone text,
  email text,
  description text,
  created_at timestamptz not null default now()
);

-- Profils (un par compte) --------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  full_name text not null check (char_length(full_name) between 1 and 120),
  email text not null,
  phone text,
  agency_id uuid references public.agencies (id) on delete set null,
  agency_role public.agency_role,
  created_at timestamptz not null default now(),
  constraint chercheur_sans_agence check (role = 'agence' or (agency_id is null and agency_role is null))
);
create index profiles_agency_idx on public.profiles (agency_id);

-- Invitations d'agents -----------------------------------------
create table public.agency_invitations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  email text not null check (email = lower(email)),
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (agency_id, email)
);

-- Fonctions utilitaires ----------------------------------------
create or replace function public.current_agency_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select agency_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_agency_director(p_agency uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and agency_id = p_agency and agency_role = 'directeur'
  );
$$;

create or replace function public.slugify(p_text text)
returns text language sql immutable set search_path = '' as $$
  select trim(both '-' from regexp_replace(lower(extensions.unaccent(p_text)), '[^a-z0-9]+', '-', 'g'));
$$;

-- Infos publiques d'une invitation (pour la page d'inscription de l'agent)
create or replace function public.get_invitation(p_token uuid)
returns table (agency_name text, email text)
language sql stable security definer set search_path = '' as $$
  select a.name, i.email
  from public.agency_invitations i
  join public.agencies a on a.id = i.agency_id
  where i.token = p_token and i.accepted_at is null;
$$;

-- Création automatique du profil à l'inscription -------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name text := coalesce(nullif(trim(meta ->> 'full_name'), ''), split_part(new.email, '@', 1));
  v_phone text := nullif(trim(meta ->> 'phone'), '');
  v_agency uuid;
  v_inv public.agency_invitations%rowtype;
  v_slug text;
begin
  if nullif(meta ->> 'invite_token', '') is not null then
    select * into v_inv from public.agency_invitations
      where token = (meta ->> 'invite_token')::uuid
        and accepted_at is null
        and email = lower(new.email)
      for update;
    if not found then
      raise exception 'Invitation invalide ou déjà utilisée';
    end if;
    insert into public.profiles (id, role, full_name, email, phone, agency_id, agency_role)
      values (new.id, 'agence', v_name, lower(new.email), v_phone, v_inv.agency_id, 'agent');
    update public.agency_invitations set accepted_at = now() where id = v_inv.id;

  elsif meta ->> 'role' = 'agence' then
    v_slug := public.slugify((meta ->> 'agency_name') || '-' || (meta ->> 'agency_city'));
    if v_slug = '' or exists (select 1 from public.agencies where slug = v_slug) then
      v_slug := trim(both '-' from v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    end if;
    insert into public.agencies (name, slug, city, phone, email)
      values (trim(meta ->> 'agency_name'), v_slug, trim(meta ->> 'agency_city'), v_phone, lower(new.email))
      returning id into v_agency;
    insert into public.profiles (id, role, full_name, email, phone, agency_id, agency_role)
      values (new.id, 'agence', v_name, lower(new.email), v_phone, v_agency, 'directeur');

  else
    insert into public.profiles (id, role, full_name, email, phone)
      values (new.id, 'chercheur', v_name, lower(new.email), v_phone);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Sécurité : qui peut lire / modifier quoi ---------------------
alter table public.agencies enable row level security;
alter table public.profiles enable row level security;
alter table public.agency_invitations enable row level security;

-- Agences : visibles par tous (page publique), modifiables par le directeur
revoke insert, delete, truncate on public.agencies from anon, authenticated;
create policy "agences visibles par tous" on public.agencies
  for select using (true);
create policy "le directeur modifie son agence" on public.agencies
  for update to authenticated
  using (public.is_agency_director(id)) with check (public.is_agency_director(id));

-- Profils : chacun voit le sien ; les membres d'une agence se voient entre eux
revoke insert, update, delete, truncate on public.profiles from anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
create policy "voir son profil et ses collègues" on public.profiles
  for select to authenticated
  using (id = auth.uid() or (agency_id is not null and agency_id = public.current_agency_id()));
create policy "modifier son profil" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Invitations : gérées uniquement par le directeur de l'agence
revoke update, truncate on public.agency_invitations from anon, authenticated;
revoke all on public.agency_invitations from anon;
create policy "le directeur voit ses invitations" on public.agency_invitations
  for select to authenticated using (public.is_agency_director(agency_id));
create policy "le directeur invite" on public.agency_invitations
  for insert to authenticated
  with check (public.is_agency_director(agency_id) and invited_by = auth.uid());
create policy "le directeur annule une invitation" on public.agency_invitations
  for delete to authenticated
  using (public.is_agency_director(agency_id) and accepted_at is null);

revoke execute on function public.get_invitation(uuid) from public;
grant execute on function public.get_invitation(uuid) to anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
