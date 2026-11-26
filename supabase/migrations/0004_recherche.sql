-- =============================================================
-- Étape 4 : recherche par ville sans tenir compte des accents
-- « Saint-Étienne », « saint etienne » et « ST ETIENNE » → saint-etienne
-- =============================================================
alter table public.listings
  add column city_key text generated always as (public.slugify(city)) stored;

drop index if exists public.listings_search_idx;
create index listings_search_idx on public.listings (type, city_key, created_at desc) where published;
create index listings_agency_published_idx on public.listings (agency_id, created_at desc) where published;
