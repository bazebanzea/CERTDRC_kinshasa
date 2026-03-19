import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Enums } from "@/integrations/supabase/types";
import { canManageBulletins, canReportIncidents, canReviewIncidents, isReaderOnly } from "@/lib/cert";

type AppRole = Enums<"app_role">;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  profile: { full_name: string; email: string; organization: string | null } | null;
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isStaff: boolean;
  canReview: boolean;
  canPublishBulletins: boolean;
  canReport: boolean;
  readerOnly: boolean;
  mustChangePassword: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(async () => {
          const [rolesRes, profileRes] = await Promise.all([
            supabase.from("user_roles").select("role").eq("user_id", session.user.id),
            supabase.from("profiles").select("full_name, email, organization").eq("user_id", session.user.id).single(),
          ]);
          setRoles((rolesRes.data?.map((row) => row.role) ?? []) as AppRole[]);
          setProfile(profileRes.data ?? null);
          setLoading(false);
        }, 0);
      } else {
        setRoles([]);
        setProfile(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const canReview = canReviewIncidents(roles);
  const canPublishBulletins = canManageBulletins(roles);
  const canReport = canReportIncidents(roles);
  const readerOnly = isReaderOnly(roles);
  const isStaff = canReview;
  const mustChangePassword = Boolean(user?.user_metadata?.force_password_change);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        roles,
        profile,
        loading,
        signOut,
        hasRole,
        isStaff,
        canReview,
        canPublishBulletins,
        canReport,
        readerOnly,
        mustChangePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
