import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Constants, type Enums } from "@/integrations/supabase/types";
import { DRC_REGIONS, INCIDENT_SEVERITY_LABELS, INCIDENT_TYPE_LABELS } from "@/lib/cert";

export default function CreateIncidentPage() {
  const { user, canReport } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "" as Enums<"incident_type"> | "",
    severity: "medium" as Enums<"incident_severity">,
    location: "",
    region: "Kinshasa",
    affected_systems: "",
  });
  const [proofFile, setProofFile] = useState<File | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !form.type || !canReport) return;

    setLoading(true);

    let proofUrl: string | null = null;
    if (proofFile) {
      const filePath = `${user.id}/${Date.now()}-${proofFile.name}`;
      const { error: uploadError } = await supabase.storage.from("proof-files").upload(filePath, proofFile);
      if (uploadError) {
        toast.error(`Erreur upload fichier: ${uploadError.message}`);
        setLoading(false);
        return;
      }
      proofUrl = filePath;
    }

    const { error } = await supabase.from("incidents").insert({
      reporter_id: user.id,
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type as Enums<"incident_type">,
      severity: form.severity,
      location: form.location.trim() || null,
      region: form.region,
      proof_file_url: proofUrl,
      affected_systems: form.affected_systems.trim() || null,
      country_context: "RDC - Kinshasa",
    });

    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Incident signale avec succes");
      navigate("/incidents");
    }
  };

  if (!canReport) {
    return <div className="text-destructive">Votre compte est en lecture seule et ne peut pas signaler d'incident.</div>;
  }

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="page-header">
        <h1 className="page-title">Signaler un incident cyber</h1>
        <p className="page-description">Declaration nationale CERT RDC pour les incidents, attaques et vulnerabilites observes.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="title">Titre *</Label>
          <Input id="title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex: Campagne de phishing ciblant des comptes institutionnels" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea id="description" rows={6} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Contexte, impact, indices techniques, chronologie, victimes potentielles..." required />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Type d'incident *</Label>
            <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value as Enums<"incident_type"> })}>
              <SelectTrigger><SelectValue placeholder="Selectionner" /></SelectTrigger>
              <SelectContent>
                {Constants.public.Enums.incident_type.map((type) => (
                  <SelectItem key={type} value={type}>{INCIDENT_TYPE_LABELS[type]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Severite *</Label>
            <Select value={form.severity} onValueChange={(value) => setForm({ ...form, severity: value as Enums<"incident_severity"> })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Constants.public.Enums.incident_severity.map((severity) => (
                  <SelectItem key={severity} value={severity}>{INCIDENT_SEVERITY_LABELS[severity]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="location">Lieu / organisation</Label>
            <Input id="location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Ministere, entreprise, commune, ville..." />
          </div>
          <div className="space-y-2">
            <Label>Province</Label>
            <Select value={form.region} onValueChange={(value) => setForm({ ...form, region: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DRC_REGIONS.map((region) => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="affected_systems">Systemes affectes</Label>
          <Textarea id="affected_systems" rows={3} value={form.affected_systems} onChange={(event) => setForm({ ...form, affected_systems: event.target.value })} placeholder="Messagerie, VPN, AD, site web, serveur applicatif, poste utilisateur..." />
        </div>

        <div className="space-y-2">
          <Label htmlFor="proof">Fichier de preuve</Label>
          <Input id="proof" type="file" onChange={(event) => setProofFile(event.target.files?.[0] || null)} accept=".pdf,.png,.jpg,.jpeg,.txt,.log,.doc,.docx" />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading || !form.type}>{loading ? "Envoi..." : "Declarer l'incident"}</Button>
          <Button type="button" variant="outline" onClick={() => navigate("/incidents")}>Annuler</Button>
        </div>
      </form>
    </div>
  );
}
