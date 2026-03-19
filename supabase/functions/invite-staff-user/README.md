# invite-staff-user

Fonction Edge Supabase pour inviter un compte reserve depuis l'espace d'administration.

## Entree attendue

```json
{
  "email": "prenom.nom@cert-rdc.cd",
  "full_name": "Prenom Nom",
  "role": "specialist"
}
```

## Regles

- l'appelant doit etre authentifie
- l'appelant doit avoir le role `admin`
- la fonction envoie une invitation email si le compte n'existe pas encore
- si le compte existe deja, la fonction ajoute simplement le role demande
- les roles acceptes sont `analyst`, `specialist`, `authority`, `admin`, `reader`

## Secrets requis

- `SERVICE_ROLE_KEY`
- `APP_URL`
