-- =============================================================
-- Étape 8 : informations nécessaires aux emails de notification
-- =============================================================

-- Destinataires d'une conversation : le chercheur et l'agent responsable (ou le directeur)
-- Utilisable uniquement par les participants de la conversation.
create or replace function public.notification_contacts(p_conversation uuid)
returns table (
  seeker_id uuid, seeker_email text, seeker_name text,
  agent_id uuid, agent_email text, agent_name text,
  agency_name text, listing_id uuid, listing_title text, listing_city text
)
language sql stable security definer set search_path = '' as $$
  select s.id, s.email, s.full_name,
         a.id, a.email, a.full_name,
         ag.name, c.listing_id, c.listing_title, coalesce(l.city, ag.city)
  from public.conversations c
  join public.profiles s on s.id = c.seeker_id
  join public.agencies ag on ag.id = c.agency_id
  left join public.profiles a on a.id = public.conversation_agent(c.id)
  left join public.listings l on l.id = c.listing_id
  where c.id = p_conversation and public.can_access_conversation(c.id);
$$;

revoke execute on function public.notification_contacts(uuid) from public, anon;
grant execute on function public.notification_contacts(uuid) to authenticated;

-- Rappel de la veille : pour ne jamais l'envoyer deux fois
alter table public.visits add column reminder_sent_at timestamptz;

-- La tâche des rappels (clé secrète, côté serveur uniquement) lit les visites et marque les rappels envoyés
grant usage on schema public to service_role;
grant select on public.visits, public.profiles, public.agencies, public.listings to service_role;
grant update (reminder_sent_at) on public.visits to service_role;
