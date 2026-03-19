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
import { ADVISORY_SEVERITY_LABELS, canManageBulletins, severityBadgeClass, statusBadgeClass } from "@/lib/cert";
import { Constants, type Tables } from "@/integrations/supabase/types";

type Advisory = Tables<"vulnerability_advisories">;

export default function ThreatIntelPage() {
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();
  const canManage = canManageBulletins(roles);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [form, setForm] = useState({
    advisory_id: "",
    source_name: "CERT-FR",
    source_url: "https://www.cert.ssi.gouv.fr",
    title: "",
    summary: "",
    severity: "medium",
    affected_products: "",
    remediation: "",
    standards_notes: "",
    tags: "cert-fr, rdc, veille",
  });

  const { data: advisories = [], isLoading } = useQuery({
    queryKey: ["vulnerability-advisories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vulnerability_advisories").select("*").order("published_at", { ascending: false });
      if (error) throw error;
      return data as Advisory[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        advisory_id: form.advisory_id || null,
        source_name: form.source_name.trim(),
        source_url: form.source_url.trim(),
        title: form.title.trim(),
        summary: form.summary.trim(),
        severity: form.severity as Advisory["severity"],
        affected_products: form.affected_products.trim() || null,
        remediation: form.remediation.trim() || null,
        standards_notes: form.standards_notes.trim() || null,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        created_by: user?.id ?? null,
      };
      const { error } = await supabase.from("vulnerability_advisories").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fiche de veille ajoutee");
      queryClient.invalidateQueries({ queryKey: ["vulnerability-advisories"] });
      setForm({
        advisory_id: "",
        source_name: "CERT-FR",
        source_url: "https://www.cert.ssi.gouv.fr",
        title: "",
        summary: "",
        severity: "medium",
        affected_products: "",
        remediation: "",
        standards_notes: "",
        tags: "cert-fr, rdc, veille",
      });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const filtered = useMemo(() => {
    return advisories.filter((advisory) => {
      const matchesSearch = !search || [advisory.title, advisory.summary, advisory.source_name].join(" ").toLowerCase().includes(search.toLowerCase());
      const matchesSeverity = severityFilter === "all" || advisory.severity === severityFilter;
      return matchesSearch && matchesSeverity;
    });
  }, [advisories, search, severityFilter]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <h1 className="page-title">Veille vulnerabilites</h1>
        <p className="page-description">Collecte quotidienne d'avis internationaux pour le contexte national de la RDC.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher par titre, resume ou source" className="max-w-sm" />
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Severite" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les severites</SelectItem>
            {Constants.public.Enums.advisory_severity.map((severity) => (
              <SelectItem key={severity} value={severity}>{ADVISORY_SEVERITY_LABELS[severity]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {canManage && (
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Ajouter une fiche de veille</h2>
          <p className="mb-4 text-sm text-muted-foreground">Rattacher une information issue du CERT-FR, d'un CERT regional ou d'une source de confiance.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="advisory_id">Reference externe</Label>
              <Input id="advisory_id" value={form.advisory_id} onChange={(event) => setForm({ ...form, advisory_id: event.target.value })} placeholder="Ex: CERTFR-2025-ACT-046" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source_name">Source</Label>
              <Input id="source_name" value={form.source_name} onChange={(event) => setForm({ ...form, source_name: event.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="source_url">Lien source</Label>
              <Input id="source_url" value={form.source_url} onChange={(event) => setForm({ ...form, source_url: event.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Titre</Label>
              <Input id="title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="summary">Resume</Label>
              <Textarea id="summary" rows={4} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Severite</Label>
              <Select value={form.severity} onValueChange={(value) => setForm({ ...form, severity: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Constants.public.Enums.advisory_severity.map((severity) => (
                    <SelectItem key={severity} value={severity}>{ADVISORY_SEVERITY_LABELS[severity]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input id="tags" value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="cert-fr, rdc, vuln" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="products">Produits affectes</Label>
              <Textarea id="products" rows={3} value={form.affected_products} onChange={(event) => setForm({ ...form, affected_products: event.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="remediation">Mesures de remediation</Label>
              <Textarea id="remediation" rows={3} value={form.remediation} onChange={(event) => setForm({ ...form, remediation: event.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="standards">Normes et audit</Label>
              <Textarea id="standards" rows={3} value={form.standards_notes} onChange={(event) => setForm({ ...form, standards_notes: event.target.value })} placeholder="ISO 27001, journalisation, durcissement, audit de conformite..." />
            </div>
          </div>
          <Button className="mt-4" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.title || !form.summary}>
            {createMutation.isPending ? "Publication..." : "Ajouter la fiche"}
          </Button>
        </section>
      )}

      <section className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement de la veille...</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">Aucune fiche de veille ne correspond au filtre.</div>
        ) : (
          filtered.map((advisory) => (
            <article key={advisory.id} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="status-badge status-info">{advisory.source_name}</span>
                    {advisory.advisory_id && <span className="status-badge status-muted">{advisory.advisory_id}</span>}
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-foreground">{advisory.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{advisory.summary}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={`status-badge ${severityBadgeClass(advisory.severity === "informational" ? "low" : advisory.severity)}`}>{ADVISORY_SEVERITY_LABELS[advisory.severity]}</span>
                  <span className={`status-badge ${statusBadgeClass(advisory.advisory_status)}`}>{advisory.advisory_status}</span>
                </div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Produits affectes</p>
                  <p className="mt-1 text-sm text-foreground">{advisory.affected_products || "Non renseigne"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Remediation</p>
                  <p className="mt-1 text-sm text-foreground">{advisory.remediation || "A completer"}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm">
                <div className="text-muted-foreground">{new Date(advisory.published_at).toLocaleDateString("fr-FR")} · {advisory.country_context}</div>
                <a href={advisory.source_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Consulter la source</a>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
