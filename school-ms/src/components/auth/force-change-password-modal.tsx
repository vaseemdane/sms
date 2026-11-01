"use client";

import * as React from "react";
import { Lock, ShieldCheck, KeyRound, AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/services/auth-context";
import { useSMSStore } from "@/context/sms-store";

export function ForceChangePasswordModal() {
  const { user, completePasswordChange } = useAuth();
  const { changePassword } = useSMSStore();

  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const userRole = (user?.userType || (user as any)?.role || "").toLowerCase();
  const isAdmin = ["admin", "super_admin", "principal", "manager"].includes(userRole);

  React.useEffect(() => {
    if (user && isAdmin && user.mustChangePassword) {
      completePasswordChange((user as any).password || "");
    }
  }, [user, isAdmin, completePasswordChange]);

  const mustChange = Boolean(user && user.mustChangePassword && !isAdmin);

  if (!mustChange) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword === "teacher@123" || newPassword === "student@123" || newPassword === "admin@123") {
      setError("Please choose a password different from the system default password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (user?.id) {
        // 1. Call backend API if authenticated with real token
        try {
          const rawSession = typeof window !== "undefined" ? localStorage.getItem("edupulse_sms_session_v1") : null;
          const parsedSession = rawSession ? JSON.parse(rawSession) : null;
          const authToken = parsedSession?.token;
          if (authToken && !authToken.startsWith("sms_jwt_")) {
            await fetch("http://127.0.0.1:8000/api/v1/auth/change-password", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`,
              },
              body: JSON.stringify({
                current_password: (user as any).password || "School@123",
                new_password: newPassword,
              }),
            });
          }
        } catch (apiErr) {
          console.warn("Backend password change synced locally:", apiErr);
        }

        // 2. Update persistent store
        changePassword(user.id, newPassword);
        // 3. Update active session
        completePasswordChange(newPassword);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to update password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={mustChange} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden bg-surface border-border shadow-2xl p-6"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-3 text-center sm:text-left">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto sm:mx-0 border border-amber-500/20">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Mandatory First-Login Password Change
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary mt-1">
              Your account was provisioned with default initial credentials. For security compliance, you must set a personalized password to continue.
            </DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs text-text-secondary space-y-1">
            <div className="flex items-center justify-between text-foreground font-semibold">
              <span>Account: {user?.name}</span>
              <span className="capitalize px-1.5 py-0.5 rounded bg-purple-tint text-purple-primary text-[10px]">
                {user?.userType}
              </span>
            </div>
            <p className="text-[11px] text-text-secondary">
              Email ID: <strong className="text-foreground">{user?.email}</strong>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">New Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new strong password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10 text-xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Confirm New Password</Label>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="text-xs"
              required
            />
          </div>

          <div className="pt-2 space-y-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-purple-primary hover:bg-purple-primary/90 text-white font-semibold text-xs h-10 shadow-sm"
            >
              {isSubmitting ? (
                "Updating Security Credentials..."
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-1.5" />
                  Save Password & Access Dashboard
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => completePasswordChange((user as any)?.password || "")}
              className="w-full text-xs text-text-secondary hover:text-foreground h-9"
            >
              Skip for now (Change later via Profile)
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
