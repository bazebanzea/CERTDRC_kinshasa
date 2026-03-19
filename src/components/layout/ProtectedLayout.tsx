import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Centre CERT",
  "/operations": "Operations",
  "/incidents": "Incidents",
  "/incidents/new": "Signaler",
  "/intel": "Veille",
  "/bulletins": "Bulletins",
  "/security": "Securite",
  "/statistics": "Statistiques",
  "/admin/users": "Utilisateurs",
  "/setup-password": "Securisation du compte",
};

export default function ProtectedLayout() {
  const { session, loading, mustChangePassword } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword && location.pathname !== "/setup-password") {
    return <Navigate to="/setup-password" replace />;
  }

  if (mustChangePassword) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
        <Outlet />
      </main>
    );
  }

  const pageTitle = PAGE_TITLES[location.pathname] || "CERT RDC";

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">CERT RDC</p>
              <h1 className="truncate text-base font-semibold text-foreground">{pageTitle}</h1>
            </div>
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[88vw] max-w-[320px] p-0">
                <AppSidebar mobile onNavigate={() => setMobileNavOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </header>
        <main className="px-4 py-4 pb-8">
          <div className="mx-auto max-w-7xl min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-[var(--nav-width)] min-h-screen px-6 py-6 xl:px-8">
        <div className="mx-auto max-w-[calc(100vw-var(--nav-width)-3rem)] min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
