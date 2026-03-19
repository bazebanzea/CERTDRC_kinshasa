import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Users, KeyRound, UserRound } from "lucide-react";

export default function AccessPortalPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-5xl space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Shield className="h-7 w-7 text-primary-foreground" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">CERT RDC</p>
          <h1 className="text-3xl font-semibold text-foreground">Portail d'acces a la plateforme</h1>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
            Choisissez l'espace de connexion correspondant a votre profil. L'inscription libre est reservee aux comptes publics. Les comptes administrateurs et specialistes sont actives par l'administration CERT.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Espace public</p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">Citoyens, organisations et lecture</h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  Signaler un incident, suivre les dossiers ouverts, consulter les bulletins et acceder a la veille selon vos droits.
                </p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <UserRound className="h-5 w-5" />
              </div>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              <li>Connexion reservee aux comptes publics et lecture seule.</li>
              <li>Inscription autonome autorisee pour les nouveaux declarants.</li>
              <li>Les droits avances sont attribues ensuite par un administrateur.</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/login/public"><Button>Connexion publique</Button></Link>
              <Link to="/register"><Button variant="outline">Creer un compte</Button></Link>
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Espace reserve</p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">Administrateurs et specialistes cybers</h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  Validation des incidents, passage en alerte, supervision des mesures preventives, publication des bulletins et administration des utilisateurs.
                </p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              <li>Acces reserve aux roles analyste, specialiste, autorite et administrateur.</li>
              <li>Verification du role apres authentification.</li>
              <li>Authentification forte recommandee via la page 2FA.</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/login/staff"><Button>Connexion reservee</Button></Link>
              <Link to="/security"><Button variant="outline"><KeyRound className="mr-2 h-4 w-4" />2FA</Button></Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
