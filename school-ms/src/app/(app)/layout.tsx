import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-xs text-text-secondary">
          Loading portal...
        </div>
      }
    >
      <AppShell>{children}</AppShell>
    </React.Suspense>
  );
}
