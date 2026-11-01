"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { User, UserRole } from "@/types";
import { authService, AuthSession, LoginCredentials } from "./auth-service";

interface AuthContextType {
  session: AuthSession | null;
  user: (User & { mustChangePassword?: boolean; classSectionId?: string; satsId?: string }) | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthSession>;
  logout: () => void;
  switchUser: (user: any) => void;
  refreshSession: () => void;
  completePasswordChange: (newPassword: string) => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = React.useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const refreshSession = React.useCallback(() => {
    const existing = authService.getSession();
    setSession(existing);
  }, []);

  React.useEffect(() => {
    refreshSession();
    setIsLoading(false);
    authService.fetchProfile().then((fresh) => {
      if (fresh) {
        refreshSession();
      }
    });
  }, [refreshSession]);

  const login = async (credentials: LoginCredentials): Promise<AuthSession> => {
    setIsLoading(true);
    try {
      const newSession = await authService.login(credentials);
      setSession(newSession);
      return newSession;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setSession(null);
    router.push("/login");
  };

  const switchUser = (targetUser: any) => {
    const newSession: AuthSession = {
      user: targetUser,
      token: `sms_jwt_${targetUser.id}_${Date.now()}`,
      role: targetUser.userType,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("edupulse_sms_session_v1", JSON.stringify(newSession));
    }
    setSession(newSession);
    const destination = authService.getPortalRouteForRole(newSession.role);
    router.push(destination);
  };

  const completePasswordChange = (newPassword: string) => {
    if (!session?.user) return;
    authService.updateSessionUser({
      mustChangePassword: false,
      password: newPassword,
    });
    refreshSession();
  };

  const updateUser = (data: Partial<User>) => {
    authService.updateSessionUser(data);
    refreshSession();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        role: session?.role ?? null,
        isAuthenticated: !!session,
        isLoading,
        login,
        logout,
        switchUser,
        refreshSession,
        completePasswordChange,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
