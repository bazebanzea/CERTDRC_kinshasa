import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, PlusCircle } from "lucide-react";
import { Constants, type Tables } from "@/integrations/supabase/types";
import {
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_STATUS_LABELS,
  INCIDENT_TYPE_LABELS,
  VALIDATION_STATE_LABELS,
  severityBadgeClass,
  statusBadgeClass,
} from "@/lib/cert";
import { useIsMobile } from "@/hooks/use-mobile";

type Incident = Tables<"incidents">;

export default function IncidentListPage() {
  const { canReport } = useAuth();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterValidation, setFilterValidation] = useState("all");

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("incidents").select("*").order("reported_at", { ascending: false });
      if (error) throw error;
      return data as Incident[];
    },
  });

  const filtered = useMemo(() => {
    return incidents.filter((incident) => {
      const haystack = [incident.title, incident.description, incident.public_reference || "", incident.country_context].join(" ").toLowerCase();
      if (search && !haystack.includes(search.toLowerCase())) return false;
      if (filterType !== "all" && incident.type !== filterType) return false;
      if (filterStatus !== "all" && incident.status !== filterStatus) return false;
      if (filterSeverity !== "all" && incident.severity !== filterSeverity) return false;
      if (filterValidation !== "all" && incident.validation_state !== filterValidation) return false;
      return true;
    });
  }, [incidents, search, filterType, filterStatus, filterSeverity, filterValidation]);

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="page-title">Incidents et dossiers CERT</h1>
          <p className="page-description">{filtered.length} dossier(s) affiches avec validation, remediations et contexte national.</p>
        </div>
        {canReport && (
          <Link to="/incidents/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Signaler un incident
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="relative sm:col-span-2 xl:col-span-1 xl:min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Titre, reference, contexte RDC..." className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {Constants.public.Enums.incident_type.map((type) => (
              <SelectItem key={type} value={type}>{INCIDENT_TYPE_LABELS[type]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Constants.public.Enums.incident_status.map((status) => (
              <SelectItem key={status} value={status}>{INCIDENT_STATUS_LABELS[status]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Severite" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les severites</SelectItem>
            {Constants.public.Enums.incident_severity.map((severity) => (
              <SelectItem key={severity} value={severity}>{INCIDENT_SEVERITY_LABELS[severity]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterValidation} onValueChange={setFilterValidation}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Validation" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les validations</SelectItem>
            {Constants.public.Enums.cert_validation_state.map((state) => (
              <SelectItem key={state} value={state}>{VALIDATION_STATE_LABELS[state]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement des incidents...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">Aucun incident ne correspond aux filtres.</div>
      ) : isMobile ? (
        <div className="space-y-3">
          {filtered.map((incident) => (
            <article key={incident.id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/incidents/${incident.id}`} className="font-medium text-primary hover:underline">{incident.title}</Link>
                  <p className="mt-1 text-xs text-muted-foreground">{incident.public_reference || "Reference interne"} · {new Date(incident.reported_at).toLocaleDateString("fr-FR")}</p>
                </div>
                <span className={`status-badge ${severityBadgeClass(incident.severity)}`}>{INCIDENT_SEVERITY_LABELS[incident.severity]}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className={`status-badge ${statusBadgeClass(incident.status)}`}>{INCIDENT_STATUS_LABELS[incident.status]}</span>
                <span className={`status-badge ${statusBadgeClass(incident.validation_state)}`}>{VALIDATION_STATE_LABELS[incident.validation_state]}</span>
                <span className="status-badge status-muted">{INCIDENT_TYPE_LABELS[incident.type]}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{incident.country_context}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="table-scroll">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Incident</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Gravite</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Statut</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Validation</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Contexte</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((incident) => (
                  <tr key={incident.id} className="border-t align-top transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link to={`/incidents/${incident.id}`} className="font-medium text-primary hover:underline">{incident.title}</Link>
                      <p className="mt-1 text-xs text-muted-foreground">{incident.public_reference || "Reference interne"} · {new Date(incident.reported_at).toLocaleDateString("fr-FR")}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{INCIDENT_TYPE_LABELS[incident.type]}</td>
                    <td className="px-4 py-3"><span className={`status-badge ${severityBadgeClass(incident.severity)}`}>{INCIDENT_SEVERITY_LABELS[incident.severity]}</span></td>
                    <td className="px-4 py-3"><span className={`status-badge ${statusBadgeClass(incident.status)}`}>{INCIDENT_STATUS_LABELS[incident.status]}</span></td>
                    <td className="px-4 py-3"><span className={`status-badge ${statusBadgeClass(incident.validation_state)}`}>{VALIDATION_STATE_LABELS[incident.validation_state]}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{incident.country_context}</td>
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
