import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import type { Tables } from "@/integrations/supabase/types";

type Incident = Tables<"incidents">;

const TYPE_LABELS: Record<string, string> = {
  phishing: "Phishing", fraude: "Fraude", malware: "Malware",
  attaque_reseau: "Attaque réseau", fuite_donnees: "Fuite de données", piratage: "Piratage",
};

const CHART_COLORS = [
  "hsl(221, 83%, 53%)", "hsl(0, 72%, 51%)", "hsl(38, 92%, 50%)",
  "hsl(160, 84%, 39%)", "hsl(270, 70%, 50%)", "hsl(30, 80%, 55%)",
];

export default function StatisticsPage() {
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["incidents-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("incidents").select("*");
      if (error) throw error;
      return data as Incident[];
    },
  });

  if (isLoading) return <div className="text-muted-foreground text-sm">Chargement...</div>;

  // By region
  const regionData = Object.entries(
    incidents.reduce<Record<string, number>>((acc, i) => {
      const r = i.region || "Non spécifié";
      acc[r] = (acc[r] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // By type pie
  const typeData = Object.entries(
    incidents.reduce<Record<string, number>>((acc, i) => {
      acc[i.type] = (acc[i.type] || 0) + 1;
      return acc;
    }, {})
  ).map(([type, value]) => ({ name: TYPE_LABELS[type] || type, value }));

  // Monthly trend (12 months)
  const monthlyData = (() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = 0;
    }
    incidents.forEach((inc) => {
      const d = new Date(inc.reported_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key in months) months[key]++;
    });
    return Object.entries(months).map(([month, count]) => ({
      month: new Date(month + "-01").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      incidents: count,
    }));
  })();

  // By severity
  const severityData = [
    { name: "Critique", value: incidents.filter((i) => i.severity === "critical").length, fill: "hsl(0, 72%, 51%)" },
    { name: "Élevé", value: incidents.filter((i) => i.severity === "high").length, fill: "hsl(38, 92%, 50%)" },
    { name: "Moyen", value: incidents.filter((i) => i.severity === "medium").length, fill: "hsl(221, 83%, 53%)" },
    { name: "Faible", value: incidents.filter((i) => i.severity === "low").length, fill: "hsl(160, 84%, 39%)" },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Statistiques</h1>
        <p className="page-description">Analyse détaillée des incidents de cybersécurité</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Monthly trend line */}
        <div className="kpi-card lg:col-span-2">
          <h3 className="text-sm font-medium text-foreground mb-4">Évolution sur 12 mois</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Line type="monotone" dataKey="incidents" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Type pie */}
        <div className="kpi-card">
          <h3 className="text-sm font-medium text-foreground mb-4">Répartition par type</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {typeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Severity */}
        <div className="kpi-card">
          <h3 className="text-sm font-medium text-foreground mb-4">Répartition par sévérité</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={severityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {severityData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* By region */}
      <div className="kpi-card">
        <h3 className="text-sm font-medium text-foreground mb-4">Incidents par région</h3>
        <ResponsiveContainer width="100%" height={Math.max(200, regionData.length * 30)}>
          <BarChart data={regionData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
