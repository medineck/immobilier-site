# VisiteFacile (nom provisoire)

Site d'annonces immobilières (France) où l'on demande et réserve ses visites **par écrit** :
le chercheur écrit à l'agence depuis l'annonce, l'agent propose des créneaux, le client en valide un,
et la visite s'ajoute à l'agenda de l'agent.

## Technologies
- Next.js (pages du site) + Tailwind CSS (design)
- Supabase (comptes, base de données, messagerie en temps réel) — à partir de l'étape 2
- Vercel (mise en ligne), Resend (emails)

## Lancer le site en local
```bash
npm install
npm run dev
```
Puis ouvrir http://localhost:3000

## Avancement
- [x] Étape 1 : squelette du site (accueil, recherche, menu mobile, pages provisoires)
- [ ] Étape 2 : inscription et connexion (agence / agents / chercheurs)
- [ ] Étape 3 : espace agence — annonces
- [ ] Étape 4 : pages publiques (annonce, agence, résultats de recherche)
- [ ] Étape 5 : messagerie
- [ ] Étape 6 : créneaux de visite
- [ ] Étape 7 : agenda des agents
- [ ] Étape 8 : emails de notification
- [ ] Étape 9 : finitions et mise en ligne
