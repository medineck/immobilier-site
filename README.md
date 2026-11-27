# VisiteFacile (nom provisoire)

Site d'annonces immobilières (France) où l'on demande et réserve ses visites **par écrit** :
le chercheur écrit à l'agence depuis l'annonce, l'agent propose des créneaux, le client en valide un,
et la visite s'ajoute à l'agenda de l'agent.

## Technologies
- Next.js (pages du site) + Tailwind CSS (design)
- Supabase (comptes, base de données, messagerie en temps réel) — à partir de l'étape 2
- Vercel (mise en ligne), Resend (emails)

## Lancer le site en local
Copier `.env.example` en `.env.local` et y mettre l'adresse et la clé publique du projet Supabase, puis :
```bash
npm install
npm run dev
```

## Base de données
Les fichiers de `supabase/migrations/` décrivent la base (tables, sécurité). Ils sont appliqués dans l'ordre.
Puis ouvrir http://localhost:3000

## Avancement
- [x] Étape 1 : squelette du site (accueil, recherche, menu mobile, pages provisoires)
- [x] Étape 2 : inscription et connexion (agence + directeur, agents invités, chercheurs)
- [x] Étape 3 : espace agence — annonces (photos, agent responsable, masquer/supprimer)
- [x] Étape 4 : pages publiques (annonce avec galerie, page agence, recherche par ville avec tri et pages)
- [x] Étape 5 : messagerie en direct (contact depuis l’annonce, boîtes chercheur et agence, non lus)
- [x] Étape 6 : visites — disponibilités de l’agent, « Proposer une visite », choix du créneau par le client, confirmation immédiate
- [x] Étape 7 : agenda (vue semaine, équipe pour le directeur, déplacer/annuler, moments bloqués, « Mes visites » du client)
- [x] Étape 8 : emails (messages, proposition, confirmation avec fichier agenda, déplacement, annulation, rappel la veille, invitation, mot de passe oublié)
- [ ] Étape 9 : finitions et mise en ligne
