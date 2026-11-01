"use client";

import * as React from "react";
import Link from "next/link";
import {
  User,
  ArrowLeft,
  KeyRound,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSMSStore } from "@/context/sms-store";
import { useAuth } from "@/services/auth-context";

export default function StudentProfilePage() {
  const { user, completePasswordChange } = useAuth();
  const { sections, changePassword } = useSMSStore();

  const [profileData, setProfileData] = React.useState<any>(null);
  const [loadingProfile, setLoadingProfile] = React.useState(true);

  React.useEffect(() => {
    async function fetchLiveProfile() {
      try {
        setLoadingProfile(true);
        const res = await fetch("/api/v1/students/profile");
        if (res.ok) {
          const json = await res.json();
          if (json?.data) {
            setProfileData(json.data);
          }
        }
      } catch (e) {
        // Fallback to session user
      } finally {
        setLoadingProfile(false);
      }
    }
    fetchLiveProfile();
  }, []);

  const studentSectionId = user?.classSectionId || "sec-6a";
  const studentSection = sections.find((s) => s.id === studentSectionId);

  // Derived fields merging database profile with session
  const displayName = profileData?.name || user?.name || "Student";
  const displayDob = profileData?.dob || user?.dob || "—";
  const displayGender = profileData?.gender || user?.gender || "Male";
  const displayBloodGroup = profileData?.bloodGroup || user?.bloodGroup || "B+";
  const displayEmail = profileData?.email || user?.email || "";
  const displayAddress = profileData?.address || user?.address || "Karnataka";
  const displaySatsId = profileData?.satsId || user?.satsId || user?.admissionNo || "KA-SATS";
  const displayAdmissionNo = profileData?.admissionNo || user?.admissionNo || "—";
  const displayClassName = profileData?.className || studentSection?.className || "Class 10";
  const displaySectionCode = profileData?.sectionCode || studentSection?.code || "A";
  const displayRollNo = profileData?.rollNo || user?.rollNo || "01";
  const displayAcademicYear = profileData?.academicYear || "AY 2026–2027";
  const displayDistrict = profileData?.district || user?.district || "Bengaluru Urban";
  const displayParentName = profileData?.parentName || user?.parentName || "Parent / Guardian";
  const displayParentPhone = profileData?.parentPhone || user?.parentPhone || "—";
  const displayParentEmail = profileData?.parentEmail || user?.parentEmail || "—";

  // Password Change Form State
  const [currentPass, setCurrentPass] = React.useState("");
  const [newPass, setNewPass] = React.useState("");
  const [confirmPass, setConfirmPass] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [passError, setPassError] = React.useState<string | null>(null);
  const [passSuccess, setPassSuccess] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(false);

    if (!user?.id) return;

    if (newPass.length < 6) {
      setPassError("New password must be at least 6 characters long.");
      return;
    }

    if (newPass === "student@123" || newPass === "teacher@123" || newPass === "admin@123") {
      setPassError("Please choose a strong password different from the system default.");
      return;
    }

    if (newPass !== confirmPass) {
      setPassError("New password and confirm password do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      changePassword(user.id, newPass);
      completePasswordChange(newPass);
      setPassSuccess(true);
      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
      setTimeout(() => setPassSuccess(false), 5000);
    } catch (err: any) {
      setPassError(err?.message || "Failed to update password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Button asChild variant="ghost" size="sm" className="h-7 px-2">
              <Link href="/dashboard">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Dashboard
              </Link>
            </Button>
            <span>/</span>
            <span className="font-semibold text-purple-primary">Account</span>
            <span>/</span>
            <span className="font-semibold text-foreground">My Profile</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <User className="h-6 w-6 text-purple-primary" />
            Student Identity & Security Portal
          </h1>
          <p className="text-xs text-text-secondary">
            View verified administrative student biodata, parent contact details, and manage password credentials.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/60 p-1 border border-border">
          <TabsTrigger value="profile" className="text-xs font-semibold gap-1.5">
            <User className="h-3.5 w-3.5" />
            Personal & Academic Information
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs font-semibold gap-1.5">
            <KeyRound className="h-3.5 w-3.5" />
            Password & Security
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Profile Details */}
        <TabsContent value="profile" className="space-y-6">
          {/* Identity Header Card */}
          <Card className="border-border shadow-sm overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-purple-primary via-purple-soft to-lavender relative" />
            <CardContent className="pt-0 px-4 sm:px-8 pb-6 relative">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-4">
                <div className="flex items-end gap-3 sm:gap-4">
                  <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-surface shadow-md shrink-0">
                    <AvatarImage src={user?.photo} />
                    <AvatarFallback className="text-base sm:text-xl font-extrabold bg-purple-tint text-purple-primary">
                      {displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-0.5 min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-foreground flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="truncate">{displayName}</span>
                      <Badge className="bg-emerald-600 text-white text-[9px] sm:text-[10px]">Active Student</Badge>
                    </h2>
                    <p className="text-xs text-text-secondary">
                      {displayClassName} ({displaySectionCode}) • Roll No: {displayRollNo}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Karnataka SATS ID</span>
                  <p className="font-mono text-xs sm:text-sm font-extrabold text-purple-primary bg-purple-tint px-2.5 py-0.5 rounded border border-purple-primary/20 inline-block sm:block">
                    {displaySatsId}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Academic & Personal Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Details */}
            <Card className="border-border/80 bg-surface shadow-2xs">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-foreground">
                    Personal Biodata
                  </CardTitle>
                  <Badge variant="outline" className="text-[9px]">Verified Record</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-text-secondary">Full Legal Name</span>
                  <span className="font-bold text-foreground">{displayName}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-text-secondary">Date of Birth</span>
                  <span className="font-semibold text-foreground">{displayDob}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-text-secondary">Gender</span>
                  <span className="font-semibold text-foreground capitalize">{displayGender}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-text-secondary">Blood Group</span>
                  <span className="font-mono font-bold text-foreground">{displayBloodGroup}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-text-secondary">Registered Email</span>
                  <span className="font-semibold text-foreground">{displayEmail}</span>
                </div>
                <div className="flex items-start justify-between py-1">
                  <span className="text-text-secondary">Residential Address</span>
                  <span className="font-semibold text-foreground text-right max-w-[220px]">
                    {displayAddress}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Academic Information */}
            <Card className="border-border/80 bg-surface shadow-2xs">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-foreground">
                    Academic Registration
                  </CardTitle>
                  <Badge className="bg-purple-primary text-white text-[9px]">School Enrolled</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-text-secondary">Student ID / SATS</span>
                  <span className="font-mono font-bold text-purple-primary">{displaySatsId}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-text-secondary">Admission Number</span>
                  <span className="font-mono font-bold text-foreground">{displayAdmissionNo}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-text-secondary">Current Class & Section</span>
                  <span className="font-bold text-foreground">{displayClassName} ({displaySectionCode})</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-text-secondary">Class Roll Number</span>
                  <span className="font-mono font-bold text-foreground">{displayRollNo}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-text-secondary">Current Academic Year</span>
                  <span className="font-bold text-purple-primary">{displayAcademicYear}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-text-secondary">District / Jurisdiction</span>
                  <span className="font-semibold text-foreground">{displayDistrict}, Karnataka</span>
                </div>
              </CardContent>
            </Card>

            {/* Parent / Guardian Information */}
            <Card className="border-border/80 bg-surface shadow-2xs md:col-span-2">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-bold text-foreground">
                  Parent / Primary Guardian Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-[10px] text-text-secondary uppercase font-semibold">Guardian Full Name</p>
                  <p className="font-bold text-foreground text-sm">{displayParentName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-secondary uppercase font-semibold">Registered Contact Phone</p>
                  <p className="font-mono font-bold text-foreground">{displayParentPhone}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-secondary uppercase font-semibold">Notification Email</p>
                  <p className="font-semibold text-foreground">{displayParentEmail}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Security & Change Password */}
        <TabsContent value="security" className="space-y-6">
          <Card className="border-border/80 bg-surface shadow-sm max-w-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-tint text-purple-primary flex items-center justify-center shadow-xs">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-foreground">
                    Change Account Password
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Update your personalized student portal access credentials
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {passSuccess && (
                <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Password updated successfully! Your new password is now active.</span>
                </div>
              )}

              {passError && (
                <div className="p-3 mb-4 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{passError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter at least 6 characters"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      className="pr-10 text-xs h-9"
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
                  <Label className="text-xs font-semibold text-foreground">
                    Confirm New Password
                  </Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter new password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    className="text-xs h-9"
                    required
                  />
                </div>

                <div className="p-3 rounded-lg bg-muted/40 text-[11px] text-text-secondary space-y-1">
                  <p className="font-semibold text-foreground">Security Requirements:</p>
                  <p>• Password must be at least 6 characters</p>
                  <p>• Do not use default credentials (student@123)</p>
                  <p>• Never share your credentials with other students</p>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-purple-primary hover:bg-purple-primary/90 text-white font-semibold text-xs h-9 shadow-sm"
                >
                  {isSubmitting ? "Updating Password..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
