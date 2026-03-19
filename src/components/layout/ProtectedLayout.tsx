import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layout/AppSidebar";

export default function ProtectedLayout() {
  const { session, loading, mustChangePassword } = useAuth();
  const location = useLocation();

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
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <Outlet />
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="ml-[var(--nav-width)] flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
