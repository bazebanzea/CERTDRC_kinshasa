import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Calendar, MapPin, ShieldCheck, Siren, UserRound } from "lucide-react";
import type { Enums, Tables } from "@/integrations/supabase/types";
import {
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_STATUS_LABELS,
  INCIDENT_TYPE_LABELS,
  VALIDATION_STATE_LABELS,
  canDeleteIncidents,
  severityBadgeClass,
  statusBadgeClass,
} from "@/lib/cert";

type Incident = Tables<"incidents">;
type IncidentComment = Tables<"incident_comments"> & { author_name?: string };
type IncidentStatus = Enums<"incident_status"> | "alert";
type ValidationState = Enums<"cert_validation_state">;

const STATUS_TRANSITIONS: Record<string, IncidentStatus[]> = {
  reported: ["under_analysis", "confirmed", "rejected"],
  under_analysis: ["confirmed", "alert", "rejected"],
  confirmed: ["alert", "resolved", "under_analysis"],
  alert: ["resolved", "under_analysis", "confirmed"],
  resolved: ["under_analysis"],
  rejected: ["under_analysis"],
};

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, roles, canReview } = useAuth();
  const canDelete = canDeleteIncidents(roles);
  const [comment, setComment] = useState("");
  const [internalComment, setInternalComment] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    analyst_notes: "",
    expert_summary: "",
    remediation_steps: "",
    resolution_verification: "",
    affected_systems: "",
    public_reference: "",
    validation_state: "pending_review" as ValidationState,
  });

  const incidentQuery = useQuery({
    queryKey: ["incident", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("incidents").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Incident;
    },
    enabled: !!id,
  });

  const commentsQuery = useQuery({
    queryKey: ["incident-comments", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("incident_comments").select("*").eq("incident_id", id!).order("created_at", { ascending: true });
      if (error) throw error;
      const comments = data as Tables<"incident_comments">[];
      const userIds = Array.from(new Set(comments.map((entry) => entry.user_id)));
      if (userIds.length === 0) return [] as IncidentComment[];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      return comments.map((entry) => ({
        ...entry,
        author_name: profiles?.find((profile) => profile.user_id === entry.user_id)?.full_name || "Utilisateur",
      }));
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (incidentQuery.data) {
      setReviewForm({
        analyst_notes: incidentQuery.data.analyst_notes || "",
        expert_summary: incidentQuery.data.expert_summary || "",
        remediation_steps: incidentQuery.data.remediation_steps || "",
        resolution_verification: incidentQuery.data.resolution_verification || "",
        affected_systems: incidentQuery.data.affected_systems || "",
        public_reference: incidentQuery.data.public_reference || "",
        validation_state: incidentQuery.data.validation_state,
      });
    }
  }, [incidentQuery.data]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Incident>) => {
      const { error } = await supabase.from("incidents").update(updates).eq("id", id!);
      if (error) throw error;
      if (user && incidentQuery.data) {
        if (updates.status && updates.status !== incidentQuery.data.status) {
          await supabase.from("incident_logs").insert({ incident_id: id!, user_id: user.id, action: "status_change", old_value: incidentQuery.data.status, new_value: updates.status });
        }
        if (updates.validation_state && updates.validation_state !== incidentQuery.data.validation_state) {
          await supabase.from("incident_logs").insert({ incident_id: id!, user_id: user.id, action: "validation_change", old_value: incidentQuery.data.validation_state, new_value: updates.validation_state });
        }
      }
    },
    onSuccess: () => {
      toast.success("Dossier mis a jour");
      queryClient.invalidateQueries({ queryKey: ["incident", id] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["operations-incidents"] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      if (!user || !comment.trim()) return;
      const { error } = await supabase.from("incident_comments").insert({ incident_id: id!, user_id: user.id, content: comment.trim(), is_internal: canReview ? internalComment : false });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      setInternalComment(false);
      toast.success("Commentaire ajoute");
      queryClient.invalidateQueries({ queryKey: ["incident-comments", id] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const incident = incidentQuery.data;
  const comments = commentsQuery.data ?? [];
  const availableTransitions = useMemo(() => (!incident || !canReview ? [] : STATUS_TRANSITIONS[incident.status] || []), [incident, canReview]);

  if (incidentQuery.isLoading) return <div className="text-muted-foreground text-sm">Chargement du dossier...</div>;
  if (!incident) return <div className="text-destructive">Incident introuvable</div>;

  const saveReview = () => {
    const updates: Partial<Incident> = {
      analyst_notes: reviewForm.analyst_notes || null,
      expert_summary: reviewForm.expert_summary || null,
      remediation_steps: reviewForm.remediation_steps || null,
      resolution_verification: reviewForm.resolution_verification || null,
      affected_systems: reviewForm.affected_systems || null,
      public_reference: reviewForm.public_reference || null,
      validation_state: reviewForm.validation_state,
    };
    if (["validated", "mitigated", "closed"].includes(reviewForm.validation_state)) {
      updates.validated_at = new Date().toISOString();
      updates.validated_by = user?.id ?? null;
    }
    updateMutation.mutate(updates);
  };

  const changeStatus = (status: IncidentStatus) => {
    const updates: Partial<Incident> = { status: status as Incident["status"], resolved_at: status === "resolved" ? new Date().toISOString() : null };
    if (status === "confirmed" || status === "alert") {
      updates.validation_state = "validated";
      updates.validated_at = new Date().toISOString();
      updates.validated_by = user?.id ?? null;
    }
    if (status === "resolved") updates.validation_state = "mitigated";
    updateMutation.mutate(updates);
  };

  return (
    <div className="animate-fade-in space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button onClick={() => navigate("/incidents")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour vers les incidents
        </button>
        {canReview && <Link to="/operations" className="text-sm text-primary hover:underline">Ouvrir le centre d'operations</Link>}
      </div>

      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Dossier CERT RDC</p>
            <h1 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">{incident.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{incident.description}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={`status-badge ${severityBadgeClass(incident.severity)}`}>{INCIDENT_SEVERITY_LABELS[incident.severity]}</span>
            <span className={`status-badge ${statusBadgeClass(incident.status)}`}>{INCIDENT_STATUS_LABELS[incident.status]}</span>
            <span className={`status-badge ${statusBadgeClass(incident.validation_state)}`}>{VALIDATION_STATE_LABELS[incident.validation_state]}</span>
            <span className="status-badge status-muted">{INCIDENT_TYPE_LABELS[incident.type]}</span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Analyse et remediations</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard title="Reference publique" value={incident.public_reference || "Aucune reference publique"} />
              <InfoCard title="Systemes affectes" value={incident.affected_systems || "Non renseignes"} />
              <InfoCard title="Contexte national" value={incident.country_context} />
              <InfoCard title="Province / localisation" value={[incident.region, incident.location].filter(Boolean).join(" · ") || "Non renseignee"} />
            </div>
            <InfoCard title="Notes d'analyse" value={incident.analyst_notes || "Aucune note d'analyse"} />
            <InfoCard title="Synthese expert" value={incident.expert_summary || "Aucune synthese expert"} />
            <InfoCard title="Mesures preventives et correctives" value={incident.remediation_steps || "Aucune mesure renseignee"} />
            <InfoCard title="Verification de resolution" value={incident.resolution_verification || "Aucune verification renseignee"} />
          </section>

          <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Commentaires et suivi collaboratif</h2>
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun commentaire pour le moment.</p>
              ) : (
                comments.map((entry) => (
                  <div key={entry.id} className="rounded-xl border p-4">
                    <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <UserRound className="h-4 w-4 shrink-0" />
                        <span className="truncate">{entry.author_name}</span>
                        {entry.is_internal && <span className="status-badge status-warning">Interne CERT</span>}
                      </div>
                      <span>{new Date(entry.created_at).toLocaleString("fr-FR")}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{entry.content}</p>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-3 rounded-xl border p-4">
              <Label htmlFor="comment">Ajouter un commentaire</Label>
              <Textarea id="comment" rows={4} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Ajouter un commentaire de suivi, une hypothese technique ou une confirmation de resolution..." />
              {canReview && <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={internalComment} onChange={(event) => setInternalComment(event.target.checked)} /> Marquer comme commentaire interne CERT</label>}
              <Button className="w-full sm:w-auto" onClick={() => commentMutation.mutate()} disabled={commentMutation.isPending || !comment.trim()}>{commentMutation.isPending ? "Publication..." : "Ajouter le commentaire"}</Button>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5 space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Chronologie</h2>
            <TimelineRow icon={Calendar} label="Declare le" value={new Date(incident.reported_at).toLocaleString("fr-FR")} />
            {incident.status === "alert" && <TimelineRow icon={Siren} label="Etat actuel" value="Alerte active" />}
            {incident.validated_at && <TimelineRow icon={ShieldCheck} label="Valide le" value={new Date(incident.validated_at).toLocaleString("fr-FR")} />}
            {incident.resolved_at && <TimelineRow icon={ShieldCheck} label="Resolu le" value={new Date(incident.resolved_at).toLocaleString("fr-FR")} />}
            {incident.location && <TimelineRow icon={MapPin} label="Lieu" value={incident.location} />}
          </section>

          {canReview && (
            <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Revue expert cyber</h2>
              <div className="space-y-2"><Label htmlFor="public_reference">Reference CERT / dossier</Label><Input id="public_reference" value={reviewForm.public_reference} onChange={(event) => setReviewForm({ ...reviewForm, public_reference: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="affected_systems">Systemes affectes</Label><Textarea id="affected_systems" rows={3} value={reviewForm.affected_systems} onChange={(event) => setReviewForm({ ...reviewForm, affected_systems: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="analyst_notes">Notes d'analyse</Label><Textarea id="analyst_notes" rows={3} value={reviewForm.analyst_notes} onChange={(event) => setReviewForm({ ...reviewForm, analyst_notes: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="expert_summary">Synthese expert</Label><Textarea id="expert_summary" rows={3} value={reviewForm.expert_summary} onChange={(event) => setReviewForm({ ...reviewForm, expert_summary: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="remediation_steps">Comment resoudre / contenir l'attaque</Label><Textarea id="remediation_steps" rows={4} value={reviewForm.remediation_steps} onChange={(event) => setReviewForm({ ...reviewForm, remediation_steps: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="resolution_verification">Verification de correction</Label><Textarea id="resolution_verification" rows={3} value={reviewForm.resolution_verification} onChange={(event) => setReviewForm({ ...reviewForm, resolution_verification: event.target.value })} /></div>
              <div className="space-y-2"><Label>Etat de validation</Label><Select value={reviewForm.validation_state} onValueChange={(value) => setReviewForm({ ...reviewForm, validation_state: value as ValidationState })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending_review">{VALIDATION_STATE_LABELS.pending_review}</SelectItem><SelectItem value="needs_information">{VALIDATION_STATE_LABELS.needs_information}</SelectItem><SelectItem value="validated">{VALIDATION_STATE_LABELS.validated}</SelectItem><SelectItem value="mitigated">{VALIDATION_STATE_LABELS.mitigated}</SelectItem><SelectItem value="closed">{VALIDATION_STATE_LABELS.closed}</SelectItem></SelectContent></Select></div>
              <Button className="w-full sm:w-auto" onClick={saveReview} disabled={updateMutation.isPending}>{updateMutation.isPending ? "Sauvegarde..." : "Sauvegarder la revue"}</Button>
            </section>
          )}

          {canReview && availableTransitions.length > 0 && (
            <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5 space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Transitions de statut</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {availableTransitions.map((status) => (
                  <Button key={status} className="w-full" variant={status === "rejected" ? "destructive" : "default"} onClick={() => changeStatus(status)} disabled={updateMutation.isPending}>{INCIDENT_STATUS_LABELS[status]}</Button>
                ))}
              </div>
            </section>
          )}

          {canDelete && <Button variant="destructive" className="w-full" onClick={async () => { if (!window.confirm("Supprimer cet incident ?")) return; const { error } = await supabase.from("incidents").delete().eq("id", id!); if (error) toast.error(error.message); else { toast.success("Incident supprime"); navigate("/incidents"); } }}>Supprimer le dossier</Button>}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return <div className="rounded-xl border p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">{value}</p></div>;
}

function TimelineRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return <div className="flex items-start gap-3 text-sm"><Icon className="mt-0.5 h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">{label}</p><p className="break-words text-foreground">{value}</p></div></div>;
}
