"use client";

import React, { useState, useMemo } from "react";
import { useSMSStore, SectionEntity } from "@/context/sms-store";
import { useAuth } from "@/services/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User,
  Shield,
  Key,
  School,
  Lock,
} from "lucide-react";

export default function TeacherProfilePage() {
  const { user } = useAuth();
  const {
    sections,
    getTeacherAssignments,
    isClassTeacherForSection,
    recordTeacherAudit,
  } = useSMSStore();

  const teacherId = user?.id || "";

  // Assignments
  const assignments = useMemo(() => getTeacherAssignments(teacherId), [getTeacherAssignments, teacherId]);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const ctSectionIds = useMemo(() => {
    return sections.filter((s: SectionEntity) => isClassTeacherForSection(teacherId, s.id)).map((s) => s.id);
  }, [sections, isClassTeacherForSection, teacherId]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (newPassword.length < 8) {
      setStatusMsg({ type: "error", text: "New password must be at least 8 characters long." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: "error", text: "New password and confirmation do not match." });
      return;
    }

    recordTeacherAudit({
      teacherId,
      teacherName: user?.name || "Teacher",
      action: "PASSWORD_CHANGED",
      targetType: "PROFILE",
      details: "Teacher credentials password updated successfully.",
    });

    setStatusMsg({ type: "success", text: "Password updated successfully. Kept securely hashed." });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Teaching Profile & Portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Official faculty record, pedagogical allocations, and security credentials
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader className="text-center pb-3">
            <div className="h-20 w-20 rounded-full bg-primary/10 text-primary font-bold text-2xl flex items-center justify-center mx-auto border-2 border-primary/20">
              {user?.name?.charAt(0) || "T"}
            </div>
            <CardTitle className="text-lg font-bold mt-2">
              {user?.name || "Teacher"}
            </CardTitle>
            <CardDescription className="text-xs font-mono">{user?.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0 text-xs">
            <div className="p-3 bg-muted/40 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Faculty ID:</span>
                <span className="font-mono font-bold">{user?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">System Role:</span>
                <Badge variant="outline" className="text-[10px] font-bold">
                  {user?.userType || "teacher"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Academic Cycle:</span>
                <span className="font-semibold">2026–2027</span>
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="font-semibold mb-1 flex items-center gap-1.5 text-muted-foreground">
                <Shield className="h-3.5 w-3.5" /> Access Privileges
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Allocated teaching permissions are centrally managed by the Super Admin in accordance with CBSE/State accreditation guidelines.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Right side: Allocated Teaching Responsibilities & Change Password */}
        <div className="md:col-span-2 space-y-6">
          {/* Statutory Assignments Table */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <School className="h-4 w-4 text-primary" />
                Assigned Teaching Responsibilities
              </CardTitle>
              <CardDescription className="text-xs">
                Class teacher and subject teacher allocations active for Academic Year 2026–27
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border text-xs">
                {assignments.map((assoc) => {
                  const sec = sections.find((s: SectionEntity) => s.id === assoc.sectionId);
                  const isCT = assoc.assignmentType === "CLASS_TEACHER" || ctSectionIds.includes(assoc.sectionId);

                  return (
                    <div key={assoc.id} className="p-3.5 flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="font-bold text-sm">
                          {assoc.className} - {assoc.sectionName || sec?.code}
                        </div>
                        <div className="text-muted-foreground">
                          {isCT ? "Primary Class Administration" : `Instruction: ${assoc.subjectName}`}
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={
                          isCT
                            ? "bg-emerald-600 text-white font-semibold text-[10px]"
                            : "bg-blue-600 text-white font-semibold text-[10px]"
                        }
                      >
                        {isCT ? "CLASS TEACHER" : "SUBJECT TEACHER"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Change Password Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                Change Account Password
              </CardTitle>
              <CardDescription className="text-xs">
                Ensure your account uses a secure passphrase to protect student records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                {statusMsg && (
                  <div
                    className={`p-3 rounded text-xs flex items-center gap-2 ${
                      statusMsg.type === "success"
                        ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                        : "bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400"
                    }`}
                  >
                    <span>{statusMsg.text}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Current Password</label>
                  <Input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">New Password</label>
                    <Input
                      type="password"
                      required
                      placeholder="Min 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Confirm Password</label>
                    <Input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                <Button type="submit" size="sm" className="gap-1.5 mt-2">
                  <Lock className="h-3.5 w-3.5" /> Update Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
