import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SetupPasswordPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password.length < 10) {
      toast.error("Le nouveau mot de passe doit contenir au moins 10 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password,
      data: {
        ...(user?.user_metadata ?? {}),
        force_password_change: false,
        temp_password: "",
      },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Mot de passe mis a jour. Vous pouvez maintenant acceder a la plateforme.");
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Premiere connexion</p>
        <h1 className="text-2xl font-semibold text-foreground">Changer le mot de passe temporaire</h1>
        <p className="text-sm text-muted-foreground">
          Pour securiser votre compte reserve, vous devez remplacer le mot de passe envoye par email avant d'acceder a la plateforme.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="newPassword">Nouveau mot de passe</Label>
          <Input id="newPassword" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 10 caracteres" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
          <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Retapez le mot de passe" required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Mise a jour..." : "Enregistrer le nouveau mot de passe"}
        </Button>
      </form>
    </div>
  );
}
