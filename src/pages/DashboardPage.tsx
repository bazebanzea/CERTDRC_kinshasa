import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, BookText, Clock3, Globe2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INCIDENT_SEVERITY_LABELS, INCIDENT_STATUS_LABELS, VALIDATION_STATE_LABELS, severityBadgeClass, statusBadgeClass } from "@/lib/cert";
import type { Tables } from "@/integrations/supabase/types";

type Incident = Tables<"incidents">;
type Advisory = Tables<"vulnerability_advisories">;
type Bulletin = Tables<"security_bulletins">;

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["cert-dashboard"],
    queryFn: async () => {
      const [incidentsRes, advisoriesRes, bulletinsRes] = await Promise.all([
        supabase.from("incidents").select("*").order("reported_at", { ascending: false }),
        supabase.from("vulnerability_advisories").select("*").order("published_at", { ascending: false }).limit(6),
        supabase.from("security_bulletins").select("*").order("bulletin_date", { ascending: false }).limit(6),
      ]);

      if (incidentsRes.error) throw incidentsRes.error;
      if (advisoriesRes.error) throw advisoriesRes.error;
      if (bulletinsRes.error) throw bulletinsRes.error;

      return {
        incidents: incidentsRes.data as Incident[],
        advisories: advisoriesRes.data as Advisory[],
        bulletins: bulletinsRes.data as Bulletin[],
      };
    },
  });

  const incidents = data?.incidents ?? [];
  const advisories = data?.advisories ?? [];
  const bulletins = data?.bulletins ?? [];

  const pendingReview = incidents.filter((incident) => incident.validation_state === "pending_review").length;
  const activeAlerts = incidents.filter((incident) => incident.status === "alert").length;
  const criticalIncidents = incidents.filter((incident) => incident.severity === "critical").length;
  const publishedBulletins = bulletins.filter((bulletin) => bulletin.status === "published").length;

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Chargement du centre national CERT...</div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">CERT RDC</p>
            <h1 className="text-3xl font-semibold text-foreground">Plateforme nationale de veille, validation et reponse cyber</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Supervision des incidents signales, qualification par specialistes cybersecurite, veille quotidienne des vulnerabilites et publication de bulletins de securite pour la RDC.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/operations">
              <Button>Ouvrir le centre d'operations</Button>
            </Link>
            <Link to="/bulletins">
              <Button variant="outline">Consulter les bulletins</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Clock3} label="En attente de revue" value={pendingReview} helper="Dossiers a qualifier par les specialistes" />
        <MetricCard icon={ShieldAlert} label="Alertes actives" value={activeAlerts} helper="Incidents confirms places en niveau d'alerte" tone="critical" />
        <MetricCard icon={AlertTriangle} label="Incidents critiques" value={criticalIncidents} helper="Priorites a traiter sans delai" tone="warning" />
        <MetricCard icon={BookText} label="Bulletins publies" value={publishedBulletins} helper="Bulletins CERT disponibles" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Incidents a suivre</h2>
              <p className="text-sm text-muted-foreground">Validation, alerte et remediations.</p>
            </div>
            <Link to="/operations" className="text-sm text-primary hover:underline">Voir tout</Link>
          </div>
          <div className="space-y-3">
            {incidents.slice(0, 6).map((incident) => (
              <div key={incident.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{incident.title}</p>
                    <p className="text-sm text-muted-foreground">{incident.country_context} · {new Date(incident.reported_at).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={`status-badge ${severityBadgeClass(incident.severity)}`}>{INCIDENT_SEVERITY_LABELS[incident.severity]}</span>
                    <span className={`status-badge ${statusBadgeClass(incident.status)}`}>{INCIDENT_STATUS_LABELS[incident.status]}</span>
                    <span className={`status-badge ${statusBadgeClass(incident.validation_state)}`}>{VALIDATION_STATE_LABELS[incident.validation_state]}</span>
                  </div>
                </div>
                {incident.remediation_steps && <p className="mt-3 text-sm text-muted-foreground">Mesures: {incident.remediation_steps}</p>}
              </div>
            ))}
            {incidents.length === 0 && <p className="text-sm text-muted-foreground">Aucun incident enregistre pour le moment.</p>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Veille vulnerabilites</h2>
                <p className="text-sm text-muted-foreground">Sources internationales reliees au contexte RDC.</p>
              </div>
            </div>
            <div className="space-y-3">
              {advisories.map((advisory) => (
                <div key={advisory.id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{advisory.title}</p>
                      <p className="text-xs text-muted-foreground">{advisory.source_name} · {new Date(advisory.published_at).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <span className={`status-badge ${severityBadgeClass(advisory.severity === "informational" ? "low" : advisory.severity)}`}>{advisory.severity}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{advisory.summary}</p>
                </div>
              ))}
              {advisories.length === 0 && <p className="text-sm text-muted-foreground">Aucune fiche de veille disponible.</p>}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Bulletins CERT recents</h2>
            <div className="space-y-3">
              {bulletins.map((bulletin) => (
                <div key={bulletin.id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{bulletin.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(bulletin.bulletin_date).toLocaleDateString("fr-FR")} · {bulletin.country_context}</p>
                    </div>
                    <span className={`status-badge ${statusBadgeClass(bulletin.status)}`}>{bulletin.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{bulletin.summary}</p>
                </div>
              ))}
              {bulletins.length === 0 && <p className="text-sm text-muted-foreground">Aucun bulletin publie pour le moment.</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, helper, tone }: { icon: React.ElementType; label: string; value: number; helper: string; tone?: "warning" | "critical" }) {
  const toneClass = tone === "critical" ? "text-destructive" : tone === "warning" ? "text-warning" : "text-primary";

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
          <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
        </div>
        <div className={`rounded-xl bg-primary/10 p-3 ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
