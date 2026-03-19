export const ROLE_LABELS: Record<string, string> = {
  citizen: "Citoyen",
  analyst: "Analyste",
  specialist: "Specialiste cyber",
  authority: "Autorite nationale",
  admin: "Administrateur",
  reader: "Lecture seule",
};

export const INCIDENT_TYPE_LABELS: Record<string, string> = {
  phishing: "Phishing",
  fraude: "Fraude numerique",
  malware: "Malware",
  attaque_reseau: "Attaque reseau",
  fuite_donnees: "Fuite de donnees",
  piratage: "Piraterie numerique",
};

export const INCIDENT_STATUS_LABELS: Record<string, string> = {
  reported: "Signale",
  under_analysis: "En analyse",
  confirmed: "Confirme",
  alert: "Alerte nationale",
  resolved: "Resolu",
  rejected: "Rejete",
};

export const INCIDENT_SEVERITY_LABELS: Record<string, string> = {
  low: "Faible",
  medium: "Moyenne",
  high: "Elevee",
  critical: "Critique",
};

export const VALIDATION_STATE_LABELS: Record<string, string> = {
  pending_review: "En attente de revue",
  needs_information: "Informations complementaires",
  validated: "Valide",
  mitigated: "Mitige",
  closed: "Cloture",
};

export const ADVISORY_SEVERITY_LABELS: Record<string, string> = {
  informational: "Information",
  low: "Faible",
  medium: "Moyenne",
  high: "Elevee",
  critical: "Critique",
};

export const BULLETIN_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  review: "En revue",
  published: "Publie",
  archived: "Archive",
};

export const DRC_REGIONS = [
  "Kinshasa",
  "Kongo Central",
  "Kwango",
  "Kwilu",
  "Mai-Ndombe",
  "Kasai",
  "Kasai-Central",
  "Kasai-Oriental",
  "Lomami",
  "Sankuru",
  "Maniema",
  "Sud-Kivu",
  "Nord-Kivu",
  "Ituri",
  "Haut-Uele",
  "Bas-Uele",
  "Tshopo",
  "Mongala",
  "Nord-Ubangi",
  "Sud-Ubangi",
  "Equateur",
  "Tshuapa",
  "Tanganyika",
  "Haut-Lomami",
  "Lualaba",
  "Haut-Katanga",
];

export function hasAnyRole(roles: string[], accepted: string[]) {
  return accepted.some((role) => roles.includes(role));
}

export function isReaderOnly(roles: string[]) {
  return roles.includes("reader") && !hasAnyRole(roles, ["analyst", "specialist", "authority", "admin"]);
}

export function canReviewIncidents(roles: string[]) {
  return hasAnyRole(roles, ["analyst", "specialist", "authority", "admin"]);
}

export function canManageBulletins(roles: string[]) {
  return hasAnyRole(roles, ["specialist", "authority", "admin"]);
}

export function canReportIncidents(roles: string[]) {
  return !isReaderOnly(roles);
}

export function canDeleteIncidents(roles: string[]) {
  return hasAnyRole(roles, ["authority", "admin"]);
}

export function severityBadgeClass(severity: string) {
  if (severity === "critical") return "status-critical";
  if (severity === "high") return "status-warning";
  if (severity === "medium") return "status-info";
  return "status-muted";
}

export function statusBadgeClass(status: string) {
  if (status === "alert") return "status-critical";
  if (status === "resolved" || status === "closed") return "status-success";
  if (status === "rejected") return "status-muted";
  if (status === "confirmed" || status === "validated" || status === "mitigated" || status === "published") return "status-warning";
  return "status-info";
}
