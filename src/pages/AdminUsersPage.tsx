import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Constants, type Enums } from "@/integrations/supabase/types";
import { ROLE_LABELS, statusBadgeClass } from "@/lib/cert";
import { useIsMobile } from "@/hooks/use-mobile";

const INVITABLE_ROLES: Enums<"app_role">[] = ["reader", "analyst", "specialist", "authority", "admin"];

export default function AdminUsersPage() {
  const { hasRole } = useAuth();
  const isMobile = useIsMobile();
  const [inviteForm, setInviteForm] = useState({
    fullName: "",
    email: "",
    role: "specialist" as Enums<"app_role">,
  });
  const [lastInvite, setLastInvite] = useState<{ email: string; role: string; temporaryPassword: string; mailSent: boolean } | null>(null);

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const { data: allRoles } = await supabase.from("user_roles").select("*");
      return profiles.map((profile) => ({
        ...profile,
        roles: allRoles?.filter((role) => role.user_id === profile.user_id).map((role) => role.role) || [],
      }));
    },
    enabled: hasRole("admin"),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        full_name: inviteForm.fullName.trim(),
        email: inviteForm.email.trim().toLowerCase(),
        role: inviteForm.role,
      };

      const { data, error } = await supabase.functions.invoke("invite-staff-user", { body: payload });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error || "Invitation impossible");
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Invitation envoyee");
      setLastInvite({
        email: data.email,
        role: data.role,
        temporaryPassword: data.temporary_password,
        mailSent: Boolean(data.mail_sent),
      });
      setInviteForm({ fullName: "", email: "", role: "specialist" });
      refetch();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const handleAddRole = async (userId: string, role: Enums<"app_role">) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) {
      if (error.code === "23505") toast.info("Role deja attribue");
      else toast.error(error.message);
    } else {
      toast.success("Role ajoute");
      refetch();
    }
  };

  if (!hasRole("admin")) return <div className="text-destructive">Acces non autorise</div>;
  if (isLoading) return <div className="text-muted-foreground text-sm">Chargement...</div>;

  return (
    <div className="animate-fade-in space-y-4 sm:space-y-5">
      <div className="page-header">
        <h1 className="page-title">Administration des utilisateurs</h1>
        <p className="page-description">Gestion des profils lecture seule, specialistes cyber, analystes et autorites.</p>
      </div>

      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Inviter un compte reserve</h2>
          <p className="text-sm text-muted-foreground">Envoyer un email d'invitation avec mot de passe temporaire a un administrateur, specialiste, analyste, autorite ou lecteur.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="invite_name">Nom complet</Label>
            <Input id="invite_name" value={inviteForm.fullName} onChange={(event) => setInviteForm({ ...inviteForm, fullName: event.target.value })} placeholder="Prenom Nom" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite_email">Email</Label>
            <Input id="invite_email" type="email" value={inviteForm.email} onChange={(event) => setInviteForm({ ...inviteForm, email: event.target.value })} placeholder="prenom.nom@cert-rdc.cd" />
          </div>
          <div className="space-y-2">
            <Label>Role reserve</Label>
            <Select value={inviteForm.role} onValueChange={(value) => setInviteForm({ ...inviteForm, role: value as Enums<"app_role"> })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INVITABLE_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={() => inviteMutation.mutate()} disabled={inviteMutation.isPending || !inviteForm.email.trim()}>
              {inviteMutation.isPending ? "Envoi..." : "Envoyer l'invitation"}
            </Button>
          </div>
        </div>
        {lastInvite && (
          <div className="rounded-xl border p-4 text-sm text-foreground">
            <p className="font-medium">Derniere invitation</p>
            <p className="mt-2 break-all text-muted-foreground">Email: {lastInvite.email}</p>
            <p className="text-muted-foreground">Role: {ROLE_LABELS[lastInvite.role] || lastInvite.role}</p>
            <p className="text-muted-foreground">Mail envoye: {lastInvite.mailSent ? "oui" : "non"}</p>
            <p className="mt-3 overflow-x-auto rounded-lg bg-muted px-3 py-2 font-mono text-sm">Mot de passe temporaire: {lastInvite.temporaryPassword}</p>
          </div>
        )}
        <div className="rounded-xl border p-4 text-sm text-muted-foreground">
          Le compte invite recoit un email d'acces avec un mot de passe temporaire. Par securite, demande ensuite a l'utilisateur de le changer apres sa premiere connexion.
        </div>
      </section>

      <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground shadow-sm sm:p-5">
        Les comptes publics se creent via l'inscription publique. Pour donner un acces reserve, vous pouvez soit attribuer un role a un compte existant, soit envoyer directement une invitation reservee. Les utilisateurs privilegies se connecteront ensuite par la page <span className="font-medium text-foreground">/login/staff</span>.
      </div>

      {isMobile ? (
        <div className="space-y-3">
          {users.map((user) => (
            <article key={user.id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="space-y-1">
                <p className="font-medium text-foreground">{user.full_name || "Utilisateur"}</p>
                <p className="break-all text-sm text-muted-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground">Inscription: {new Date(user.created_at).toLocaleDateString("fr-FR")}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {user.roles.map((role: string) => (
                  <span key={role} className={`status-badge ${statusBadgeClass(role)}`}>{ROLE_LABELS[role] || role}</span>
                ))}
              </div>
              <div className="mt-4">
                <Select onValueChange={(value) => handleAddRole(user.user_id, value as Enums<"app_role">)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Ajouter un role" /></SelectTrigger>
                  <SelectContent>
                    {Constants.public.Enums.app_role.filter((role) => !user.roles.includes(role)).map((role) => (
                      <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="table-scroll">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Nom</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Roles</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Ajouter un role</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Inscription</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t align-top">
                    <td className="px-4 py-3 font-medium text-foreground">{user.full_name || "Utilisateur"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {user.roles.map((role: string) => (
                          <span key={role} className={`status-badge ${statusBadgeClass(role)}`}>{ROLE_LABELS[role] || role}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select onValueChange={(value) => handleAddRole(user.user_id, value as Enums<"app_role">)}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Attribuer..." /></SelectTrigger>
                        <SelectContent>
                          {Constants.public.Enums.app_role.filter((role) => !user.roles.includes(role)).map((role) => (
                            <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(user.created_at).toLocaleDateString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
