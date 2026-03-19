import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, UserRound } from "lucide-react";

const STAFF_ROLES = ["analyst", "specialist", "authority", "admin"];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error("Veuillez saisir une adresse email valide");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    const { data: rolesRes, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);

    setLoading(false);

    if (rolesError) {
      await supabase.auth.signOut();
      toast.error(rolesError.message);
      return;
    }

    const roles = rolesRes?.map((entry) => entry.role) ?? [];
    const isStaff = roles.some((role) => STAFF_ROLES.includes(role));

    if (isStaff) {
      await supabase.auth.signOut();
      toast.error("Ce compte appartient a l'espace reserve. Utilisez la connexion administrateur et specialistes.");
      navigate("/login/staff");
      return;
    }

    toast.success("Connexion etablie");
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary">
            <UserRound className="h-6 w-6 text-primary-foreground" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Espace public</p>
          <h1 className="text-2xl font-semibold text-foreground">Connexion citoyen et lecture</h1>
          <p className="text-sm text-muted-foreground">Acces reserve aux declarants, organisations et comptes lecture seule.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nom@exemple.cd" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mot de passe" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Connexion..." : "Se connecter"}</Button>
        </form>

        <div className="space-y-3 text-center text-sm text-muted-foreground">
          <p>
            Pas encore de compte ? <Link to="/register" className="font-medium text-primary hover:underline">Creer un compte public</Link>
          </p>
          <p>
            Vous faites partie du CERT ? <Link to="/login/staff" className="font-medium text-primary hover:underline">Acceder a l'espace reserve</Link>
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
