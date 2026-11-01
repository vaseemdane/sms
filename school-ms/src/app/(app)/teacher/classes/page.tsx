"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  Users,
  Shield,
  ArrowRight,
  Sparkles,
  GraduationCap,
  Calendar,
  CheckCircle2,
  FileText,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSMSStore } from "@/context/sms-store";
import { useAuth } from "@/services/auth-context";

export default function TeacherClassesPage() {
  const { user } = useAuth();
  const {
    getTeacherAssignments,
    getStudentsBySection,
    getTeacherAssignedSection,
  } = useSMSStore();

  const teacherId = user?.id || "";
  const assignments = getTeacherAssignments(teacherId);
  const primarySection = getTeacherAssignedSection(teacherId);

  // Group assignments by sectionId to consolidate multiple subjects in one class arm
  const sectionMap = new Map<
    string,
    {
      sectionId: string;
      sectionName: string;
      className: string;
      isClassTeacher: boolean;
      subjects: string[];
    }
  >();

  assignments.forEach((asgn) => {
    const existing = sectionMap.get(asgn.sectionId);
    if (!existing) {
      sectionMap.set(asgn.sectionId, {
        sectionId: asgn.sectionId,
        sectionName: asgn.sectionName,
        className: asgn.className,
        isClassTeacher: asgn.assignmentType === "CLASS_TEACHER",
        subjects: asgn.subjectName ? [asgn.subjectName] : [],
      });
    } else {
      if (asgn.assignmentType === "CLASS_TEACHER") {
        existing.isClassTeacher = true;
      }
      if (asgn.subjectName && !existing.subjects.includes(asgn.subjectName)) {
        existing.subjects.push(asgn.subjectName);
      }
    }
  });

  const assignedClasses = Array.from(sectionMap.values());

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-primary via-purple-primary/90 to-purple-primary/80 p-6 sm:p-8 text-white shadow-lg">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              Academic Year 2026–2027
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              My Assigned Classes
            </h1>
            <p className="text-xs sm:text-sm text-white/80 max-w-xl">
              Strict role-based access: you have access strictly to the class arms and subjects assigned to you by the Super Admin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-white/20 text-white border-white/30 text-xs px-3 py-1.5">
              {assignedClasses.length} Authorized Classes
            </Badge>
            {primarySection && (
              <Badge className="bg-emerald-500 text-white font-bold text-xs px-3 py-1.5">
                Class Teacher of {primarySection.code}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* CLASSES GRID */}
      {assignedClasses.length === 0 ? (
        <Card className="border-border/80 bg-surface shadow-sm">
          <CardContent className="p-10 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-purple-tint text-purple-primary mx-auto flex items-center justify-center">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">No Classes Assigned</h3>
            <p className="text-xs text-text-secondary max-w-md mx-auto">
              Your profile has no active class or subject assignments allocated for Academic Year 2026–2027. Contact the Super Admin to configure your teaching schedule.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {assignedClasses.map((cls) => {
            const students = getStudentsBySection(cls.sectionId);

            return (
              <Card
                key={cls.sectionId}
                className={`border transition-all duration-200 hover:shadow-md ${
                  cls.isClassTeacher
                    ? "border-emerald-300/80 bg-gradient-to-b from-emerald-50/20 to-surface"
                    : "border-border/80 bg-surface hover:border-purple-primary/40"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-foreground">
                          {cls.sectionName}
                        </span>
                        <span className="text-xs text-text-secondary font-medium">
                          ({cls.className})
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        State Board of Karnataka / SATS Roster
                      </p>
                    </div>

                    {cls.isClassTeacher ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2.5 py-0.5 shadow-xs">
                        Class Teacher
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-purple-primary/40 text-purple-primary text-[10px] font-bold px-2.5 py-0.5">
                        Subject Teacher
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-1">
                  {/* SUBJECTS TAUGHT */}
                  <div className="space-y-1.5 p-3 rounded-lg bg-muted/40 border border-border/50 text-xs">
                    <span className="text-[10px] uppercase font-bold text-text-secondary tracking-wider block">
                      Teaching Role in this Class:
                    </span>
                    {cls.isClassTeacher && (
                      <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-[11px]">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Daily Attendance &amp; Class Administration</span>
                      </div>
                    )}
                    {cls.subjects.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {cls.subjects.map((sub, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 rounded bg-purple-tint border border-purple-primary/20 text-purple-primary font-bold text-[11px]"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-text-secondary text-[11px] italic">
                        {cls.isClassTeacher ? "Class Management & Administration" : "Subject allocation in progress"}
                      </span>
                    )}
                  </div>

                  {/* COHORT STATS */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg border border-border/60 bg-surface">
                      <span className="text-[10px] text-text-secondary font-medium block">Students</span>
                      <span className="text-base font-bold text-foreground">
                        {students.length} Enrolled
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg border border-border/60 bg-surface">
                      <span className="text-[10px] text-text-secondary font-medium block">Attendance</span>
                      <span className="text-xs font-semibold text-foreground">
                        {cls.isClassTeacher ? (
                          <span className="text-emerald-700 font-bold">Authorized</span>
                        ) : (
                          <span className="text-text-secondary">Read-only</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* ACTION BUTTON */}
                  <Button
                    asChild
                    size="sm"
                    className={`w-full text-xs font-semibold ${
                      cls.isClassTeacher
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-purple-primary hover:bg-purple-primary/90 text-white"
                    }`}
                  >
                    <Link href={`/teacher/classes/${cls.sectionId}`}>
                      Enter Class Desk
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
