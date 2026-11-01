"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, CheckCircle2, GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError("");
    setSuccess(true);
    setTimeout(() => {
      router.push("/login");
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-[#F7F3EC] via-[#FBF9F5] to-[#F1EBF7]">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-xl bg-purple-primary text-white mx-auto flex items-center justify-center shadow-md">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Set New Password</h1>
        </div>

        <Card className="border-border shadow-xl bg-surface">
          {!success ? (
            <form onSubmit={handleSubmit}>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold">New Security Password</CardTitle>
                <CardDescription className="text-xs">
                  Create a secure credential for your school account.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="pass">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                    <Input
                      id="pass"
                      type="password"
                      required
                      placeholder="••••••••"
                      className="pl-9 h-10 text-xs"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="conf">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                    <Input
                      id="conf"
                      type="password"
                      required
                      placeholder="••••••••"
                      className="pl-9 h-10 text-xs"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-purple-primary text-white hover:bg-purple-primary/90 h-10 text-xs font-semibold"
                >
                  Save & Update Password
                </Button>
              </CardContent>

              <CardFooter className="flex justify-center border-t border-border/80 p-4">
                <Link
                  href="/login"
                  className="text-xs text-text-secondary hover:text-foreground"
                >
                  Back to Sign In
                </Link>
              </CardFooter>
            </form>
          ) : (
            <div className="p-8 text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-foreground">
                Password Reset Successfully!
              </h3>
              <p className="text-xs text-text-secondary">
                Your credentials have been securely updated. Redirecting to portal sign in...
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
