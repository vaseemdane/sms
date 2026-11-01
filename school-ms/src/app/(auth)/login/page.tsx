"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Eye,
  EyeOff,
  Lock,
  User,
  Phone,
  Calendar,
  ArrowRight,
  Shield,
  AlertCircle,
  School,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/services/auth-context";
import { authService } from "@/services/auth-service";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  // Mode: "staff" (Super Admin, Principal, Teacher) vs "student"
  const [authMode, setAuthMode] = React.useState<"staff" | "student">("staff");

  // Staff Credentials State (No hardcoded credentials)
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");

  // Student Credentials State (Strictly Mobile Number + Date of Birth DDMMYYYY)
  const [studentMobile, setStudentMobile] = React.useState("");
  const [studentDob, setStudentDob] = React.useState("");

  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(true);

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Helper to normalize student DOB input to strict DDMMYYYY
  const normalizeDob = (val: string): string => {
    const digits = val.replace(/\D/g, "");
    if (digits.length === 8) {
      // Check if YYYYMMDD
      if ((digits.startsWith("19") || digits.startsWith("20")) && parseInt(digits.slice(4, 6)) <= 12 && parseInt(digits.slice(6, 8)) <= 31) {
        return `${digits.slice(6, 8)}${digits.slice(4, 6)}${digits.slice(0, 4)}`;
      }
      return digits;
    }
    return digits;
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanId = identifier.trim();
    const cleanPass = password.trim();

    if (!cleanId) {
      setErrorMessage("Please enter your registered email, username, or mobile number.");
      return;
    }
    if (!cleanPass) {
      setErrorMessage("Please enter your account password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await login({
        identifier: cleanId,
        password: cleanPass,
        rememberMe,
      });

      const destination = authService.getPortalRouteForRole(session.role);
      router.push(destination);
    } catch (err: any) {
      setErrorMessage(err?.message || "Authentication failed. Please verify credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanMobile = studentMobile.replace(/\D/g, "");
    const cleanDob = normalizeDob(studentDob);

    if (cleanMobile.length < 10) {
      setErrorMessage("Please enter a valid 10-digit registered mobile number.");
      return;
    }
    if (cleanDob.length !== 8) {
      setErrorMessage("Please enter your Date of Birth in strict DDMMYYYY format (e.g. 14052010).");
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await login({
        identifier: cleanMobile,
        password: cleanDob,
        rememberMe,
      });

      const destination = authService.getPortalRouteForRole(session.role);
      router.push(destination);
    } catch (err: any) {
      setErrorMessage(err?.message || "Student authentication failed. Please verify your mobile number and date of birth.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-6 sm:py-12 px-3 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="inline-flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-tr from-purple-primary to-purple-soft text-white shadow-xl shadow-purple-primary/25">
          <GraduationCap className="h-7 w-7 sm:h-8 sm:w-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          EduPulse School Management
        </h2>
        <p className="text-xs text-text-secondary">
          Multi-Tenant Educational Architecture · Production Authentication
        </p>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md px-1 sm:px-0">
        <Card className="border-border/80 shadow-xl bg-surface/90 backdrop-blur-md">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-bold">Portal Sign In</CardTitle>
            <CardDescription className="text-xs text-text-secondary">
              Select your role category to authenticate into your designated dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Tabs
              value={authMode}
              onValueChange={(val: any) => {
                setAuthMode(val);
                setErrorMessage(null);
              }}
              className="w-full"
            >
              <TabsList className="grid grid-cols-2 bg-muted/60 p-1 mb-4">
                <TabsTrigger value="staff" className="text-xs font-semibold flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  Staff / Admin Login
                </TabsTrigger>
                <TabsTrigger value="student" className="text-xs font-semibold flex items-center gap-1.5">
                  <School className="h-3.5 w-3.5" />
                  Student Login
                </TabsTrigger>
              </TabsList>

              {/* 1. SUPER ADMIN, PRINCIPAL & TEACHER LOGIN */}
              <TabsContent value="staff">
                <form onSubmit={handleStaffSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Email Address / Username / Mobile
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                      <Input
                        type="text"
                        placeholder="admin@school.com, principal, or mobile"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="pl-9 h-10 text-xs"
                        autoComplete="username"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">
                        Password
                      </Label>
                      <Link
                        href="/forgot-password"
                        className="text-[11px] font-medium text-purple-primary hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter account password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 pr-10 h-10 text-xs"
                        autoComplete="current-password"
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

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-border text-purple-primary focus:ring-purple-primary h-3.5 w-3.5"
                      />
                      <span className="text-xs text-text-secondary">Keep me signed in</span>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-purple-primary hover:bg-purple-primary/90 text-white font-semibold text-xs h-10 shadow-md shadow-purple-primary/20"
                  >
                    {isSubmitting ? (
                      "Verifying Credentials..."
                    ) : (
                      <>
                        Sign In as Staff / Administrator
                        <ArrowRight className="h-4 w-4 ml-1.5" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* 2. STUDENT LOGIN (MOBILE NUMBER + DATE OF BIRTH DDMMYYYY) */}
              <TabsContent value="student">
                <form onSubmit={handleStudentSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Mobile Number
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                      <Input
                        type="tel"
                        placeholder="10-digit registered mobile number"
                        value={studentMobile}
                        onChange={(e) => setStudentMobile(e.target.value)}
                        className="pl-9 h-10 text-xs font-mono"
                        maxLength={15}
                        required
                      />
                    </div>
                    <p className="text-[11px] text-text-secondary">
                      Enter the 10-digit phone number registered by Super Admin during enrollment.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Date of Birth (DDMMYYYY)
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="DDMMYYYY (e.g. 14052010)"
                        value={studentDob}
                        onChange={(e) => setStudentDob(e.target.value)}
                        className="pl-9 pr-10 h-10 text-xs font-mono tracking-wider"
                        maxLength={10}
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
                    <p className="text-[11px] text-text-secondary">
                      Your initial password is your date of birth in strict <code>DDMMYYYY</code> format (e.g., 14-May-2010 becomes <code>14052010</code>).
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-border text-purple-primary focus:ring-purple-primary h-3.5 w-3.5"
                      />
                      <span className="text-xs text-text-secondary">Keep me signed in</span>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-purple-primary hover:bg-purple-primary/90 text-white font-semibold text-xs h-10 shadow-md shadow-purple-primary/20"
                  >
                    {isSubmitting ? (
                      "Verifying Student Credentials..."
                    ) : (
                      <>
                        Sign In as Student
                        <ArrowRight className="h-4 w-4 ml-1.5" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
