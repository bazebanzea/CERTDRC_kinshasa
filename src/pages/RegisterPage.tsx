import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error("Veuillez saisir une adresse email valide");
      return;
    }

    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caracteres");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (!data.session) {
      toast.success("Compte public cree. Connectez-vous ensuite depuis l'espace public.");
      navigate("/login/public");
      return;
    }

    toast.success("Compte public cree avec succes");
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary">
            <UserPlus className="h-6 w-6 text-primary-foreground" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Inscription publique</p>
          <h1 className="text-2xl font-semibold text-foreground">Creer un compte declarant</h1>
          <p className="text-sm text-muted-foreground">Cette inscription est reservee aux comptes publics. Les comptes administrateurs et specialistes sont actives par l'administration CERT.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nom complet</Label>
            <Input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Jean Dupont" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nom@organisation.cd" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Min. 6 caracteres" required minLength={6} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Inscription..." : "Creer le compte public"}</Button>
        </form>

        <div className="space-y-3 text-center text-sm text-muted-foreground">
          <p>
            Deja un compte ? <Link to="/login/public" className="font-medium text-primary hover:underline">Se connecter</Link>
          </p>
          <p>
            Vous attendez un compte staff ? Contactez un administrateur puis utilisez <Link to="/login/staff" className="font-medium text-primary hover:underline">la connexion reservee</Link>.
          </p>
          <p>
            <Link to="/login" className="inline-flex items-center gap-2 font-medium text-primary hover:underline">
              <Shield className="h-4 w-4" />Retour au portail d'acces
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
