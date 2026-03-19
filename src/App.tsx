import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import AccessPortalPage from "@/pages/AccessPortalPage";
import LoginPage from "@/pages/LoginPage";
import StaffLoginPage from "@/pages/StaffLoginPage";
import RegisterPage from "@/pages/RegisterPage";
import SetupPasswordPage from "@/pages/SetupPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import IncidentListPage from "@/pages/IncidentListPage";
import CreateIncidentPage from "@/pages/CreateIncidentPage";
import IncidentDetailPage from "@/pages/IncidentDetailPage";
import StatisticsPage from "@/pages/StatisticsPage";
import AdminUsersPage from "@/pages/AdminUsersPage";
import SecurityPage from "@/pages/SecurityPage";
import SecurityBulletinsPage from "@/pages/SecurityBulletinsPage";
import ThreatIntelPage from "@/pages/ThreatIntelPage";
import OperationsCenterPage from "@/pages/OperationsCenterPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AccessPortalPage />} />
            <Route path="/login/public" element={<LoginPage />} />
            <Route path="/login/staff" element={<StaffLoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<ProtectedLayout />}>
              <Route path="/setup-password" element={<SetupPasswordPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/operations" element={<OperationsCenterPage />} />
              <Route path="/incidents" element={<IncidentListPage />} />
              <Route path="/incidents/new" element={<CreateIncidentPage />} />
              <Route path="/incidents/:id" element={<IncidentDetailPage />} />
              <Route path="/intel" element={<ThreatIntelPage />} />
              <Route path="/bulletins" element={<SecurityBulletinsPage />} />
              <Route path="/security" element={<SecurityPage />} />
              <Route path="/statistics" element={<StatisticsPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
