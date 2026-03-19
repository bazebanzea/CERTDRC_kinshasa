import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, Shield } from "lucide-react";

const STAFF_ROLES = ["analyst", "specialist", "authority", "admin"];

export default function StaffLoginPage() {
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

    if (!isStaff) {
      await supabase.auth.signOut();
      toast.error("Cette page est reservee aux administrateurs, specialistes, analystes et autorites.");
      navigate("/login/public");
      return;
    }

    toast.success("Connexion reservee etablie");
    navigate("/operations");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Espace reserve</p>
          <h1 className="text-2xl font-semibold text-foreground">Connexion administrateur et specialistes</h1>
          <p className="text-sm text-muted-foreground">Acces restreint aux comptes staff CERT RDC.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email professionnel</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="prenom.nom@cert-rdc.cd" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mot de passe" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Connexion..." : "Acceder a l'espace reserve"}</Button>
        </form>

        <div className="space-y-3 text-center text-sm text-muted-foreground">
          <p>Les comptes staff sont crees et actives par l'administration CERT.</p>
          <p>
            Vous etes declarant ou lecteur ? <Link to="/login/public" className="font-medium text-primary hover:underline">Aller a la connexion publique</Link>
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
