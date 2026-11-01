"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useAuth } from "@/services/auth-context";
import { UserRole } from "@/types";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ForceChangePasswordModal } from "@/components/auth/force-change-password-modal";
import Link from "next/link";

import { canAccessRoute } from "@/constants/permissions";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  allowedRoles?: UserRole[];
}

export function AppShell({ children, title }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, isAuthenticated, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Auto-close mobile drawer on route changes
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const activeRole = role || user?.userType;

  // Check if current route is authorized for active role
  const isAuthorized = React.useMemo(() => {
    if (!activeRole) return true;
    return canAccessRoute(activeRole, pathname);
  }, [pathname, activeRole]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-3">
        <div className="h-8 w-8 rounded-full border-2 border-purple-primary border-t-transparent animate-spin" />
        <p className="text-xs text-text-secondary font-medium">
          Verifying security session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Will redirect to /login
  }

  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-xs text-text-secondary">
          Loading portal...
        </div>
      }
    >
      <div className="min-h-screen flex bg-background text-foreground overflow-x-hidden">
        {/* Role-Enforced Sidebar (Desktop dock + Mobile drawer) */}
        <Sidebar
          currentRole={activeRole}
          mobileOpen={mobileMenuOpen}
          setMobileOpen={setMobileMenuOpen}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <Topbar
            currentUser={user}
            title={title}
            onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
          />

          <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0 animate-in fade-in-50 duration-200">
            {!isAuthorized ? (
              /* Unauthorized Access Boundary */
              <div className="py-16 max-w-md mx-auto text-center space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive mx-auto flex items-center justify-center">
                  <ShieldAlert className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-foreground">
                    Access Restricted
                  </h2>
                  <p className="text-xs text-text-secondary">
                    Your authenticated role (
                    <strong className="capitalize text-foreground">
                      {(activeRole || user.userType || "user").replace("_", " ")}
                    </strong>
                    ) does not possess authorization privileges to view this module.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="text-xs">
                  <Link href="/dashboard">
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                    Return to Authorized Dashboard
                  </Link>
                </Button>
              </div>
            ) : (
              children
            )}
          </main>
        </div>

        {/* Global Mandatory First-Login Password Change Modal */}
        <ForceChangePasswordModal />
      </div>
    </React.Suspense>
  );
}
