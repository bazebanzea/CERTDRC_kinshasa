import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Shield,
  AlertTriangle,
  PlusCircle,
  BarChart3,
  Users,
  LogOut,
  KeyRound,
  RadioTower,
  BookOpenText,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

const navItems = [
  { to: "/dashboard", label: "Centre CERT", icon: LayoutDashboard, show: () => true },
  { to: "/operations", label: "Operations", icon: ShieldCheck, show: (ctx: any) => ctx.canReview },
  { to: "/incidents", label: "Incidents", icon: AlertTriangle, show: () => true },
  { to: "/incidents/new", label: "Signaler", icon: PlusCircle, show: (ctx: any) => ctx.canReport },
  { to: "/intel", label: "Veille", icon: RadioTower, show: () => true },
  { to: "/bulletins", label: "Bulletins", icon: BookOpenText, show: () => true },
  { to: "/security", label: "2FA", icon: KeyRound, show: () => true },
  { to: "/statistics", label: "Statistiques", icon: BarChart3, show: (ctx: any) => ctx.canReview },
  { to: "/admin/users", label: "Utilisateurs", icon: Users, show: (ctx: any) => ctx.hasRole("admin") },
];

export function AppSidebar({ mobile = false, onNavigate }: AppSidebarProps) {
  const auth = useAuth();
  const location = useLocation();
  const visibleItems = navItems.filter((item) => item.show(auth));

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground",
        mobile
          ? "h-full w-full"
          : "fixed left-0 top-0 z-40 hidden h-screen w-[var(--nav-width)] border-r border-sidebar-border lg:flex"
      )}
    >
      <div className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary">
            <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">CERT RDC</p>
            <p className="truncate text-xs text-sidebar-muted">Kinshasa - veille et reponse</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-auto px-3 py-4">
        <div className="space-y-1.5">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.to || (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors duration-150",
                  isActive
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-sidebar-accent/50 p-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-sidebar-foreground">{auth.profile?.full_name || auth.profile?.email || "Utilisateur"}</p>
            <p className="truncate text-xs text-sidebar-muted">{auth.roles.join(", ") || "citizen"}</p>
          </div>
          <button
            onClick={auth.signOut}
            className="rounded-lg p-2 text-sidebar-muted transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            title="Deconnexion"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
