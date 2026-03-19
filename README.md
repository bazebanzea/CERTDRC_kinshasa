# CERT RDC Kinshasa

Plateforme nationale de veille, signalement et reponse aux incidents de cybersecurite pour la RDC.

## Objectif

Cette application permet de :

- signaler des incidents cyber
- qualifier, confirmer ou rejeter les incidents
- passer un incident en etat d'alerte
- publier des mesures preventives et correctives
- centraliser une veille sur les vulnerabilites
- publier des bulletins de securite
- gerer des comptes publics, lecteurs, analystes, specialistes et administrateurs

L'approche fonctionnelle s'inspire d'un fonctionnement de type CERT national, avec une orientation RDC / Kinshasa.

## Fonctionnalites principales

- espace public pour les declarants et comptes lecture seule
- espace reserve pour les administrateurs, specialistes, analystes et autorites
- centre d'operations pour la validation et la gestion des incidents
- gestion des roles utilisateur
- invitations par email pour les comptes reserves
- mot de passe temporaire et changement obligatoire a la premiere connexion
- authentification a double facteur (TOTP)
- veille CERT-FR importee automatiquement via une Edge Function Supabase
- publication de bulletins de securite

## Stack technique

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Supabase

## Demarrage local

Prerequis :

- Node.js
- npm

Installation :

```bash
npm install
npm run dev
```

Build de production :

```bash
npm run build
```

## Acces application

Portail principal :

- `/login`

Connexion publique :

- `/login/public`

Connexion reservee staff :

- `/login/staff`

Administration utilisateurs :

- `/admin/users`

Centre d'operations :

- `/operations`

## Roles applicatifs

- `citizen` : declarant standard
- `reader` : lecture seule
- `analyst` : analyse et suivi
- `specialist` : validation experte et publication
- `authority` : supervision institutionnelle
- `admin` : administration complete de la plateforme

## Supabase

Le projet utilise Supabase pour :

- l'authentification
- la gestion des roles
- la base de donnees
- les Edge Functions
- la MFA

Principales Edge Functions :

- `import-cert-fr`
- `invite-staff-user`

## GitHub

Depot source :

- https://github.com/bazebanzea/CERTDRC_kinshasa

## Securite

Bonnes pratiques recommandees :

- activer la 2FA pour les comptes reserves
- changer immediatement le mot de passe temporaire apres invitation
- limiter les roles admin aux seuls comptes necessaires
- ne jamais publier les fichiers `.env` ni les cles sensibles
