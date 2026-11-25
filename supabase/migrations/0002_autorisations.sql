-- Autorisations explicites (les nouveaux projets Supabase n'en donnent plus par défaut).
-- Les règles de sécurité (RLS) de 0001 restent appliquées en plus.
grant usage on schema public to anon, authenticated;

grant select on public.agencies to anon, authenticated;
grant update (name, city, phone, email, description) on public.agencies to authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

grant select, insert, delete on public.agency_invitations to authenticated;
