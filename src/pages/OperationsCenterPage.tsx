import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import {
  BULLETIN_STATUS_LABELS,
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_STATUS_LABELS,
  VALIDATION_STATE_LABELS,
  canDeleteIncidents,
  severityBadgeClass,
  statusBadgeClass,
} from "@/lib/cert";

type Incident = Tables<"incidents">;
type Bulletin = Tables<"security_bulletins">;
type IncidentStatus = Incident["status"] | "alert";
type ValidationState = Incident["validation_state"];

type ReviewFormState = {
  public_reference: string;
  analyst_notes: string;
  expert_summary: string;
  remediation_steps: string;
  resolution_verification: string;
  affected_systems: string;
  validation_state: ValidationState;
};

type BulletinFormState = {
  title: string;
  summary: string;
  content: string;
  status: Bulletin["status"];
};

const DEFAULT_REVIEW_FORM: ReviewFormState = {
  public_reference: "",
  analyst_notes: "",
  expert_summary: "",
  remediation_steps: "",
  resolution_verification: "",
  affected_systems: "",
  validation_state: "pending_review",
};

const DEFAULT_BULLETIN_FORM: BulletinFormState = {
  title: "",
  summary: "",
  content: "",
  status: "review",
};

export default function OperationsCenterPage() {
  const { user, roles, canReview } = useAuth();
  const queryClient = useQueryClient();
  const canDelete = canDeleteIncidents(roles);
  const [queue, setQueue] = useState<"priority" | "pending" | "alert" | "resolved">("priority");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>("");
  const [reviewForm, setReviewForm] = useState<ReviewFormState>(DEFAULT_REVIEW_FORM);
  const [bulletinForm, setBulletinForm] = useState<BulletinFormState>(DEFAULT_BULLETIN_FORM);

  const incidentsQuery = useQuery({
    queryKey: ["operations-incidents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("incidents").select("*").order("reported_at", { ascending: false });
      if (error) throw error;
      return data as Incident[];
    },
    enabled: canReview,
  });

  const incidents = incidentsQuery.data ?? [];

  const queueIncidents = useMemo(() => {
    const ordered = [...incidents].sort((left, right) => {
      const severityRank = { critical: 4, high: 3, medium: 2, low: 1 } as const;
      const leftRank = severityRank[left.severity];
      const rightRank = severityRank[right.severity];
      if (leftRank !== rightRank) return rightRank - leftRank;
      return new Date(right.reported_at).getTime() - new Date(left.reported_at).getTime();
    });

    return ordered.filter((incident) => {
      if (queue === "pending") return incident.validation_state === "pending_review" || incident.validation_state === "needs_information";
      if (queue === "alert") return incident.status === "alert";
      if (queue === "resolved") return incident.status === "resolved" || incident.validation_state === "closed";
      return incident.status === "alert" || incident.validation_state === "pending_review" || incident.severity === "critical" || incident.status === "under_analysis";
    });
  }, [incidents, queue]);

  const selectedIncident = useMemo(
    () => incidents.find((incident) => incident.id === selectedIncidentId) ?? queueIncidents[0] ?? incidents[0] ?? null,
    [incidents, queueIncidents, selectedIncidentId]
  );

  useEffect(() => {
    if (selectedIncident && selectedIncident.id !== selectedIncidentId) {
      setSelectedIncidentId(selectedIncident.id);
    }
  }, [selectedIncident, selectedIncidentId]);

  useEffect(() => {
    if (!selectedIncident) {
      setReviewForm(DEFAULT_REVIEW_FORM);
      setBulletinForm(DEFAULT_BULLETIN_FORM);
      return;
    }

    setReviewForm({
      public_reference: selectedIncident.public_reference || "",
      analyst_notes: selectedIncident.analyst_notes || "",
      expert_summary: selectedIncident.expert_summary || "",
      remediation_steps: selectedIncident.remediation_steps || "",
      resolution_verification: selectedIncident.resolution_verification || "",
      affected_systems: selectedIncident.affected_systems || "",
      validation_state: selectedIncident.validation_state,
    });

    setBulletinForm({
      title: `Bulletin ${selectedIncident.public_reference || "CERT-RDC"} - ${selectedIncident.title}`,
      summary: selectedIncident.expert_summary || selectedIncident.description,
      content: buildBulletinContent(selectedIncident),
      status: selectedIncident.status === "alert" ? "published" : "review",
    });
  }, [selectedIncident]);

  const updateIncidentMutation = useMutation({
    mutationFn: async (updates: Partial<Incident>) => {
      if (!selectedIncident) return;
      const { error } = await supabase.from("incidents").update(updates).eq("id", selectedIncident.id);
      if (error) throw error;

      if (user && updates.status && updates.status !== selectedIncident.status) {
        await supabase.from("incident_logs").insert({
          incident_id: selectedIncident.id,
          user_id: user.id,
          action: "status_change",
          old_value: selectedIncident.status,
          new_value: updates.status,
        });
      }
    },
    onSuccess: () => {
      toast.success("Dossier mis a jour");
      queryClient.invalidateQueries({ queryKey: ["operations-incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incident", selectedIncidentId] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const publishBulletinMutation = useMutation({
    mutationFn: async () => {
      if (!selectedIncident || !user) return;
      const payload = {
        title: bulletinForm.title.trim(),
        summary: bulletinForm.summary.trim(),
        content: bulletinForm.content.trim(),
        status: bulletinForm.status,
        country_context: selectedIncident.country_context,
        incident_ids: [selectedIncident.id],
        advisory_ids: [],
        source_references: selectedIncident.public_reference || selectedIncident.title,
        author_id: user.id,
        published_at: bulletinForm.status === "published" ? new Date().toISOString() : null,
      };
      const { error } = await supabase.from("security_bulletins").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bulletin enregistre");
      queryClient.invalidateQueries({ queryKey: ["security-bulletins"] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedIncident) return;
      const { error } = await supabase.from("incidents").delete().eq("id", selectedIncident.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Incident supprime");
      setSelectedIncidentId("");
      queryClient.invalidateQueries({ queryKey: ["operations-incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  if (!canReview) {
    return <div className="text-destructive">Acces reserve aux analystes, specialistes cyber, autorites et administrateurs.</div>;
  }

  const saveReview = () => {
    if (!selectedIncident) return;
    updateIncidentMutation.mutate({
      public_reference: reviewForm.public_reference || null,
      analyst_notes: reviewForm.analyst_notes || null,
      expert_summary: reviewForm.expert_summary || null,
      remediation_steps: reviewForm.remediation_steps || null,
      resolution_verification: reviewForm.resolution_verification || null,
      affected_systems: reviewForm.affected_systems || null,
      validation_state: reviewForm.validation_state,
      validated_by: ["validated", "mitigated", "closed"].includes(reviewForm.validation_state) ? user?.id ?? null : null,
      validated_at: ["validated", "mitigated", "closed"].includes(reviewForm.validation_state) ? new Date().toISOString() : null,
    });
  };

  const applyStatusPreset = (status: IncidentStatus, validationState?: ValidationState) => {
    if (!selectedIncident) return;
    updateIncidentMutation.mutate({
      status: status as Incident["status"],
      validation_state: validationState ?? selectedIncident.validation_state,
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
      validated_by: status === "confirmed" || status === "alert" || validationState === "validated" || validationState === "mitigated" ? user?.id ?? null : selectedIncident.validated_by,
      validated_at: status === "confirmed" || status === "alert" || validationState === "validated" || validationState === "mitigated" ? new Date().toISOString() : selectedIncident.validated_at,
    });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Operations center</p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground">Espace administrateur specialiste cybersecurite</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Confirmation des incidents signales, suppression des faux positifs, passage en etat d'alerte, publication de mesures preventives et emission des bulletins de securite.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <QueueBadge label="Prioritaires" value={incidents.filter((incident) => incident.status === "alert" || incident.validation_state === "pending_review" || incident.severity === "critical").length} />
            <QueueBadge label="Alertes" value={incidents.filter((incident) => incident.status === "alert").length} tone="critical" />
            <QueueBadge label="A valider" value={incidents.filter((incident) => incident.validation_state === "pending_review").length} tone="warning" />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button variant={queue === "priority" ? "default" : "outline"} onClick={() => setQueue("priority")}>Dossiers prioritaires</Button>
        <Button variant={queue === "pending" ? "default" : "outline"} onClick={() => setQueue("pending")}>En attente de revue</Button>
        <Button variant={queue === "alert" ? "default" : "outline"} onClick={() => setQueue("alert")}>Alertes actives</Button>
        <Button variant={queue === "resolved" ? "default" : "outline"} onClick={() => setQueue("resolved")}>Mitiges / resolus</Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.55fr]">
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">File d'operations</h2>
              <p className="text-sm text-muted-foreground">Selectionne un dossier pour agir.</p>
            </div>
            <span className="text-xs text-muted-foreground">{queueIncidents.length} dossier(s)</span>
          </div>

          <div className="space-y-3 max-h-[70vh] overflow-auto pr-1">
            {incidentsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement des dossiers...</p>
            ) : queueIncidents.length === 0 ? (
              <p className="rounded-xl border p-4 text-sm text-muted-foreground">Aucun dossier dans cette file.</p>
            ) : (
              queueIncidents.map((incident) => (
                <button
                  key={incident.id}
                  onClick={() => setSelectedIncidentId(incident.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${selectedIncident?.id === incident.id ? "border-primary bg-primary/5" : "hover:bg-muted/30"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{incident.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{incident.public_reference || "Reference interne"} - {incident.region || incident.country_context}</p>
                    </div>
                    <span className={`status-badge ${severityBadgeClass(incident.severity)}`}>{INCIDENT_SEVERITY_LABELS[incident.severity]}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className={`status-badge ${statusBadgeClass(incident.status)}`}>{INCIDENT_STATUS_LABELS[incident.status]}</span>
                    <span className={`status-badge ${statusBadgeClass(incident.validation_state)}`}>{VALIDATION_STATE_LABELS[incident.validation_state]}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <div className="space-y-6">
          {!selectedIncident ? (
            <section className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground shadow-sm">Selectionne un incident pour afficher les actions du centre d'operations.</section>
          ) : (
            <>
              <section className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground">{selectedIncident.title}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{selectedIncident.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={`status-badge ${severityBadgeClass(selectedIncident.severity)}`}>{INCIDENT_SEVERITY_LABELS[selectedIncident.severity]}</span>
                    <span className={`status-badge ${statusBadgeClass(selectedIncident.status)}`}>{INCIDENT_STATUS_LABELS[selectedIncident.status]}</span>
                    <span className={`status-badge ${statusBadgeClass(selectedIncident.validation_state)}`}>{VALIDATION_STATE_LABELS[selectedIncident.validation_state]}</span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <InfoTile title="Reference" value={selectedIncident.public_reference || "A definir"} />
                  <InfoTile title="Contexte" value={selectedIncident.country_context} />
                  <InfoTile title="Declare le" value={new Date(selectedIncident.reported_at).toLocaleString("fr-FR")} />
                  <InfoTile title="Detail" value={<Link className="text-primary hover:underline" to={`/incidents/${selectedIncident.id}`}>Ouvrir le dossier detaille</Link>} />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => applyStatusPreset("confirmed", "validated")} disabled={updateIncidentMutation.isPending}>Confirmer</Button>
                  <Button variant="outline" onClick={() => applyStatusPreset("alert", "validated")} disabled={updateIncidentMutation.isPending}>Passer en alerte</Button>
                  <Button variant="outline" onClick={() => applyStatusPreset("under_analysis", "needs_information")} disabled={updateIncidentMutation.isPending}>Demander des informations</Button>
                  <Button variant="outline" onClick={() => applyStatusPreset("resolved", "mitigated")} disabled={updateIncidentMutation.isPending}>Marquer comme resolu</Button>
                  <Button variant="destructive" onClick={() => applyStatusPreset("rejected", "closed")} disabled={updateIncidentMutation.isPending}>Rejeter</Button>
                  {canDelete && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (!window.confirm("Supprimer definitivement cet incident ?")) return;
                        deleteMutation.mutate();
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Revue du specialiste cyber</h2>
                  <p className="text-sm text-muted-foreground">Completer l'analyse, les mesures preventives et la verification de resolution.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="public_reference">Reference dossier</Label>
                    <Input id="public_reference" value={reviewForm.public_reference} onChange={(event) => setReviewForm({ ...reviewForm, public_reference: event.target.value })} placeholder="Ex: CERT-RDC-2026-INC-015" />
                  </div>
                  <div className="space-y-2">
                    <Label>Etat de validation</Label>
                    <Select value={reviewForm.validation_state} onValueChange={(value) => setReviewForm({ ...reviewForm, validation_state: value as ValidationState })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending_review">{VALIDATION_STATE_LABELS.pending_review}</SelectItem>
                        <SelectItem value="needs_information">{VALIDATION_STATE_LABELS.needs_information}</SelectItem>
                        <SelectItem value="validated">{VALIDATION_STATE_LABELS.validated}</SelectItem>
                        <SelectItem value="mitigated">{VALIDATION_STATE_LABELS.mitigated}</SelectItem>
                        <SelectItem value="closed">{VALIDATION_STATE_LABELS.closed}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="affected_systems">Systemes affectes</Label>
                    <Textarea id="affected_systems" rows={3} value={reviewForm.affected_systems} onChange={(event) => setReviewForm({ ...reviewForm, affected_systems: event.target.value })} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="analyst_notes">Notes d'analyse</Label>
                    <Textarea id="analyst_notes" rows={3} value={reviewForm.analyst_notes} onChange={(event) => setReviewForm({ ...reviewForm, analyst_notes: event.target.value })} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="expert_summary">Synthese du specialiste</Label>
                    <Textarea id="expert_summary" rows={4} value={reviewForm.expert_summary} onChange={(event) => setReviewForm({ ...reviewForm, expert_summary: event.target.value })} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="remediation_steps">Mesures preventives et actions de remediations</Label>
                    <Textarea id="remediation_steps" rows={5} value={reviewForm.remediation_steps} onChange={(event) => setReviewForm({ ...reviewForm, remediation_steps: event.target.value })} placeholder="Contenir l'attaque, isoler les postes, changer les secrets, appliquer les correctifs, renforcer la supervision..." />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="resolution_verification">Confirmation de resolution</Label>
                    <Textarea id="resolution_verification" rows={4} value={reviewForm.resolution_verification} onChange={(event) => setReviewForm({ ...reviewForm, resolution_verification: event.target.value })} placeholder="Preciser les preuves de correction, les journaux verifies et les controles a rejouer." />
                  </div>
                </div>
                <Button onClick={saveReview} disabled={updateIncidentMutation.isPending}>{updateIncidentMutation.isPending ? "Sauvegarde..." : "Sauvegarder la revue"}</Button>
              </section>

              <section className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Publication d'un bulletin</h2>
                  <p className="text-sm text-muted-foreground">Transformer ce dossier en bulletin CERT avec mesures preventives, contexte national et recommandations officielles.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bulletin_title">Titre</Label>
                    <Input id="bulletin_title" value={bulletinForm.title} onChange={(event) => setBulletinForm({ ...bulletinForm, title: event.target.value })} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bulletin_summary">Resume executif</Label>
                    <Textarea id="bulletin_summary" rows={3} value={bulletinForm.summary} onChange={(event) => setBulletinForm({ ...bulletinForm, summary: event.target.value })} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bulletin_content">Contenu</Label>
                    <Textarea id="bulletin_content" rows={8} value={bulletinForm.content} onChange={(event) => setBulletinForm({ ...bulletinForm, content: event.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <Select value={bulletinForm.status} onValueChange={(value) => setBulletinForm({ ...bulletinForm, status: value as Bulletin["status"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">{BULLETIN_STATUS_LABELS.draft}</SelectItem>
                        <SelectItem value="review">{BULLETIN_STATUS_LABELS.review}</SelectItem>
                        <SelectItem value="published">{BULLETIN_STATUS_LABELS.published}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                    Le bulletin reprendra automatiquement le contexte national, la reference du dossier et les mesures preventives renseignees plus haut.
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => publishBulletinMutation.mutate()} disabled={publishBulletinMutation.isPending || !bulletinForm.title || !bulletinForm.summary || !bulletinForm.content}>
                    {publishBulletinMutation.isPending ? "Publication..." : "Enregistrer le bulletin"}
                  </Button>
                  <Link to="/bulletins">
                    <Button variant="outline">Voir tous les bulletins</Button>
                  </Link>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function QueueBadge({ label, value, tone }: { label: string; value: number; tone?: "warning" | "critical" }) {
  const className = tone === "critical" ? "status-critical" : tone === "warning" ? "status-warning" : "status-info";
  return <span className={`status-badge ${className}`}>{label}: {value}</span>;
}

function InfoTile({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-2 text-sm text-foreground">{value}</div>
    </div>
  );
}

function buildBulletinContent(incident: Incident) {
  return [
    `Resume de l'incident: ${incident.expert_summary || incident.description}`,
    `Systemes affectes: ${incident.affected_systems || "A preciser"}`,
    `Mesures preventives et correctives: ${incident.remediation_steps || "A completer"}`,
    `Verification de resolution: ${incident.resolution_verification || "A completer"}`,
    `Contexte national: ${incident.country_context}`,
    "Alignement recommande: ISO 27001, ISO 27002, journalisation, gestion des incidents, defense en profondeur et audit des correctifs.",
  ].join("\n\n");
}
