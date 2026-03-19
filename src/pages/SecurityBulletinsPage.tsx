import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BULLETIN_STATUS_LABELS, canManageBulletins, statusBadgeClass } from "@/lib/cert";
import { Constants, type Tables } from "@/integrations/supabase/types";

type Bulletin = Tables<"security_bulletins">;
type Incident = Tables<"incidents">;
type Advisory = Tables<"vulnerability_advisories">;

export default function SecurityBulletinsPage() {
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();
  const canManage = canManageBulletins(roles);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIncidents, setSelectedIncidents] = useState<string[]>([]);
  const [selectedAdvisories, setSelectedAdvisories] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "",
    summary: "",
    content: "",
    status: "draft",
    iso_alignment: "ISO 27001 / ISO 27002 - gestion des actifs, gestion des incidents, journalisation et amelioration continue",
    cyber_principles: "Defense en profondeur, moindre privilege, gestion de crise, traceabilite, supervision continue, audit regulier",
    audit_notes: "Verifier les preuves, consigner les ecarts, evaluer la remediations, confirmer les correctifs et documenter la cloture.",
    source_references: "CERT-FR, CERT regionaux, editeurs, flux internes, alertes partenaires",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["security-bulletins"],
    queryFn: async () => {
      const [bulletinsRes, incidentsRes, advisoriesRes] = await Promise.all([
        supabase.from("security_bulletins").select("*").order("bulletin_date", { ascending: false }),
        supabase.from("incidents").select("id, title, validation_state").order("reported_at", { ascending: false }).limit(20),
        supabase.from("vulnerability_advisories").select("id, title, advisory_status").order("published_at", { ascending: false }).limit(20),
      ]);

      if (bulletinsRes.error) throw bulletinsRes.error;
      if (incidentsRes.error) throw incidentsRes.error;
      if (advisoriesRes.error) throw advisoriesRes.error;

      return {
        bulletins: bulletinsRes.data as Bulletin[],
        incidents: incidentsRes.data as Pick<Incident, "id" | "title" | "validation_state">[],
        advisories: advisoriesRes.data as Pick<Advisory, "id" | "title" | "advisory_status">[],
      };
    },
  });

  const bulletins = data?.bulletins ?? [];
  const incidents = data?.incidents ?? [];
  const advisories = data?.advisories ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        author_id: user?.id ?? null,
        incident_ids: selectedIncidents,
        advisory_ids: selectedAdvisories,
        status: form.status as Bulletin["status"],
        published_at: form.status === "published" ? new Date().toISOString() : null,
      };
      const { error } = await supabase.from("security_bulletins").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bulletin de securite enregistre");
      queryClient.invalidateQueries({ queryKey: ["security-bulletins"] });
      setSelectedIncidents([]);
      setSelectedAdvisories([]);
      setForm({
        title: "",
        summary: "",
        content: "",
        status: "draft",
        iso_alignment: "ISO 27001 / ISO 27002 - gestion des actifs, gestion des incidents, journalisation et amelioration continue",
        cyber_principles: "Defense en profondeur, moindre privilege, gestion de crise, traceabilite, supervision continue, audit regulier",
        audit_notes: "Verifier les preuves, consigner les ecarts, evaluer la remediations, confirmer les correctifs et documenter la cloture.",
        source_references: "CERT-FR, CERT regionaux, editeurs, flux internes, alertes partenaires",
      });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const filteredBulletins = useMemo(() => {
    return bulletins.filter((bulletin) => statusFilter === "all" || bulletin.status === statusFilter);
  }, [bulletins, statusFilter]);

  const toggleSelection = (items: string[], id: string, setter: (value: string[]) => void) => {
    setter(items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <h1 className="page-title">Bulletins de securite</h1>
        <p className="page-description">Publication de bulletins CERT structures selon les normes ISO, la cyberdefense et l'audit informatique.</p>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filtrer par statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Constants.public.Enums.bulletin_status.map((status) => (
              <SelectItem key={status} value={status}>{BULLETIN_STATUS_LABELS[status]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {canManage && (
        <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Nouveau bulletin CERT</h2>
            <p className="text-sm text-muted-foreground">Consolider les incidents, les vulnerabilites et les recommandations officielles pour la RDC.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bulletin_title">Titre</Label>
              <Input id="bulletin_title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bulletin_summary">Resume executif</Label>
              <Textarea id="bulletin_summary" rows={3} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bulletin_content">Contenu detaille</Label>
              <Textarea id="bulletin_content" rows={8} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Constants.public.Enums.bulletin_status.map((status) => (
                    <SelectItem key={status} value={status}>{BULLETIN_STATUS_LABELS[status]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulletin_sources">Sources et references</Label>
              <Input id="bulletin_sources" value={form.source_references} onChange={(event) => setForm({ ...form, source_references: event.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="iso_alignment">Alignement ISO</Label>
              <Textarea id="iso_alignment" rows={3} value={form.iso_alignment} onChange={(event) => setForm({ ...form, iso_alignment: event.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cyber_principles">Principes cyber</Label>
              <Textarea id="cyber_principles" rows={3} value={form.cyber_principles} onChange={(event) => setForm({ ...form, cyber_principles: event.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="audit_notes">Notes d'audit</Label>
              <Textarea id="audit_notes" rows={3} value={form.audit_notes} onChange={(event) => setForm({ ...form, audit_notes: event.target.value })} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border p-4">
              <p className="mb-3 text-sm font-medium text-foreground">Incidents relies</p>
              <div className="space-y-2 max-h-56 overflow-auto">
                {incidents.map((incident) => (
                  <label key={incident.id} className="flex items-start gap-2 text-sm text-foreground">
                    <input type="checkbox" checked={selectedIncidents.includes(incident.id)} onChange={() => toggleSelection(selectedIncidents, incident.id, setSelectedIncidents)} />
                    <span>{incident.title} <span className="text-muted-foreground">({incident.validation_state})</span></span>
                  </label>
                ))}
              </div>
            </div>
            <div className="rounded-xl border p-4">
              <p className="mb-3 text-sm font-medium text-foreground">Advisories relies</p>
              <div className="space-y-2 max-h-56 overflow-auto">
                {advisories.map((advisory) => (
                  <label key={advisory.id} className="flex items-start gap-2 text-sm text-foreground">
                    <input type="checkbox" checked={selectedAdvisories.includes(advisory.id)} onChange={() => toggleSelection(selectedAdvisories, advisory.id, setSelectedAdvisories)} />
                    <span>{advisory.title} <span className="text-muted-foreground">({advisory.advisory_status})</span></span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.title || !form.summary || !form.content}>
            {createMutation.isPending ? "Enregistrement..." : "Publier le bulletin"}
          </Button>
        </section>
      )}

      <section className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement des bulletins...</p>
        ) : filteredBulletins.length === 0 ? (
          <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">Aucun bulletin trouve.</div>
        ) : (
          filteredBulletins.map((bulletin) => (
            <article key={bulletin.id} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{bulletin.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{bulletin.summary}</p>
                </div>
                <span className={`status-badge ${statusBadgeClass(bulletin.status)}`}>{BULLETIN_STATUS_LABELS[bulletin.status]}</span>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <InfoBlock title="ISO et gouvernance" value={bulletin.iso_alignment || "Non precise"} />
                <InfoBlock title="Principes cyber" value={bulletin.cyber_principles || "Non precises"} />
                <InfoBlock title="Audit informatique" value={bulletin.audit_notes || "Non precise"} />
              </div>
              <div className="mt-4 rounded-xl bg-muted/40 p-4 text-sm text-foreground whitespace-pre-wrap">{bulletin.content}</div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>Date: {new Date(bulletin.bulletin_date).toLocaleDateString("fr-FR")}</span>
                <span>Incidents relies: {bulletin.incident_ids.length}</span>
                <span>Advisories relies: {bulletin.advisory_ids.length}</span>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function InfoBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  );
}
