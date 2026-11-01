"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  UserCheck,
  UserX,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Shield,
  Sparkles,
  ClipboardList,
  Coffee,
  Check,
  Building,
  KeyRound,
  FileCheck2,
  FileText,
  Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSMSStore, WeekDay, AttendanceStatus } from "@/context/sms-store";
import { useAuth } from "@/services/auth-context";
import { formatGreeting } from "@/lib/utils";
import { StudentDashboardOverview } from "@/components/student/student-dashboard-overview";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { PrincipalDashboard } from "@/components/dashboard/principal-dashboard";
import { ParentDashboard } from "@/components/dashboard/parent-dashboard";

export default function DashboardPage() {
  const { user, role } = useAuth();
  const currentRole = role || user?.userType || "super_admin";

  const {
    users,
    sections,
    teachers,
    students,
    timetables,
    getTeacherAssignedSection,
    getStudentsBySection,
    getSectionAttendance,
    saveSectionAttendance,
    getTimetableBySection,
    getTeacherSchedule,
    teacherAssignments,
    getTeacherAssignments,
    getTeacherAssignedSections,
    getTeacherAssignedSubjects,
    studyMaterials,
    assignments,
  } = useSMSStore();

  const [toast, setToast] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Today's date YYYY-MM-DD
  const [selectedDate, setSelectedDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Check if current user is an assigned Class Teacher
  const teacherAssignedSection = user ? getTeacherAssignedSection(user.id) : undefined;
  const isClassTeacher = Boolean(teacherAssignedSection);

  // Class Teacher's students and attendance state
  const classStudents = teacherAssignedSection ? getStudentsBySection(teacherAssignedSection.id) : [];
  const [attendanceDraft, setAttendanceDraft] = React.useState<Record<string, AttendanceStatus>>({});

  // Sync attendance draft on date or class change
  React.useEffect(() => {
    if (teacherAssignedSection) {
      const existing = getSectionAttendance(teacherAssignedSection.id, selectedDate);
      if (Object.keys(existing).length > 0) {
        setAttendanceDraft(existing);
      } else {
        // Default all to PRESENT
        const def: Record<string, AttendanceStatus> = {};
        classStudents.forEach((st) => {
          def[st.id] = "PRESENT";
        });
        setAttendanceDraft(def);
      }
    }
  }, [teacherAssignedSection?.id, selectedDate, classStudents.length]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceDraft((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    classStudents.forEach((st) => {
      updated[st.id] = status;
    });
    setAttendanceDraft(updated);
    showToast(`Marked all students as ${status}`);
  };

  const handleSaveAttendance = () => {
    if (!teacherAssignedSection) return;
    saveSectionAttendance(teacherAssignedSection.id, selectedDate, attendanceDraft);
    showToast(`Daily attendance saved for ${teacherAssignedSection.code} on ${selectedDate}!`);
  };

  // Teacher Schedule across all classes
  const teacherSchedule = user ? getTeacherSchedule(user.id) : [];

  // Student Section Timetable
  const studentSection = user?.classSectionId
    ? sections.find((s) => s.id === user.classSectionId)
    : sections.find((s) => s.id === "sec-6a");
  const studentTimetable = studentSection ? getTimetableBySection(studentSection.id) : null;

  // KPIs
  const totalClassesCount = sections.length; // 20
  const assignedTeachersCount = sections.filter((s) => s.classTeacherId).length;
  const publishedTimetablesCount = timetables.filter((t) => t.isPublished).length;

  if (currentRole === "super_admin" || currentRole === "admin") {
    return <AdminDashboard user={user} />;
  }

  if (currentRole === "principal") {
    return <PrincipalDashboard user={user} />;
  }

  if (currentRole === "parent") {
    return <ParentDashboard user={user} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 text-xs font-semibold text-white transition-all ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.type === "error" ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-primary via-purple-primary/95 to-purple-soft p-4 sm:p-8 text-white shadow-xl shadow-purple-primary/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-medium text-white/90">
              <Calendar className="h-3.5 w-3.5" />
              <span>Karnataka State Board • AY 2024–2025</span>
              <span className="opacity-40">|</span>
              <span className="capitalize font-bold">{currentRole.replace("_", " ")} Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {formatGreeting(user?.name || "Educator")}
            </h1>
            <p className="text-xs sm:text-sm text-white/80 max-w-xl">
              {currentRole === "teacher"
                ? isClassTeacher
                  ? `You are the designated Class Teacher for ${teacherAssignedSection?.className} (${teacherAssignedSection?.code}) with exclusive daily attendance marking authorization.`
                  : "Subject Faculty Portal. View your teaching schedule across all classes. Daily attendance marking is restricted to designated Class Teachers."
                : `Student Portal for ${studentSection?.code || "Class 6A"}. View your published schedule with exact period timings and verified SATS ID.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {currentRole === "teacher" ? (
              isClassTeacher && (
                <Button
                  onClick={() => {
                    const el = document.getElementById("attendance-section");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  variant="secondary"
                  className="bg-white text-emerald-800 hover:bg-white/90 text-xs font-semibold"
                >
                  <UserCheck className="h-4 w-4 mr-1.5 text-emerald-600" />
                  Mark Daily Attendance ({teacherAssignedSection?.code})
                </Button>
              )
            ) : (
              <Badge className="bg-white text-purple-primary font-bold text-xs px-3 py-1.5">
                SATS: {user?.satsId || "Not Registered"}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TEACHER VIEW (ASSIGNMENT-DRIVEN TEACHER PORTAL) */}
      {/* ========================================================================= */}
      {currentRole === "teacher" && (() => {
        const assignedSections = user ? getTeacherAssignedSections(user.id) : [];
        const assignedSubjects = user ? getTeacherAssignedSubjects(user.id) : [];
        const myAssignmentsList = user ? getTeacherAssignments(user.id) : [];
        const myMaterials = user ? studyMaterials.filter((m) => m.teacherId === user.id) : [];
        const myHomework = user ? assignments.filter((a) => a.teacherId === user.id) : [];

        const dayIndex = new Date().getDay();
        const daysMap: WeekDay[] = ["Sunday" as any, "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const todayDay: WeekDay = daysMap[dayIndex] === ("Sunday" as any) ? "Monday" : daysMap[dayIndex];
        const todaysTeachingPeriods = teacherSchedule.filter((s) => s.day === todayDay);
        const nextPeriod = todaysTeachingPeriods[0];

        const isTodayAttendanceDone = teacherAssignedSection
          ? Object.keys(getSectionAttendance(teacherAssignedSection.id, selectedDate)).length > 0
          : false;

        return (
          <div className="space-y-6">
            {/* KPI STATS ROW (REAL ASSIGNMENT DATA ONLY) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border/80 bg-surface shadow-2xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[11px] text-text-secondary font-medium">Assigned Classes</p>
                    <p className="text-2xl font-bold text-foreground">{assignedSections.length}</p>
                    <p className="text-[10px] text-purple-primary font-semibold">
                      {isClassTeacher ? "Class & Subject Arms" : "Subject Arms"}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-purple-tint text-purple-primary flex items-center justify-center">
                    <BookOpen className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-surface shadow-2xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[11px] text-text-secondary font-medium">Assigned Subjects</p>
                    <p className="text-2xl font-bold text-foreground">
                      {assignedSubjects.length > 0 ? assignedSubjects.length : 1}
                    </p>
                    <p className="text-[10px] text-emerald-600 font-semibold truncate max-w-[120px]">
                      {assignedSubjects.join(", ") || (user as any)?.subjectSpecialization || "Curriculum"}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-surface shadow-2xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[11px] text-text-secondary font-medium">Today&apos;s Periods</p>
                    <p className="text-2xl font-bold text-foreground">{todaysTeachingPeriods.length}</p>
                    <p className="text-[10px] text-purple-primary font-semibold">
                      {todayDay} Bell Schedule
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-purple-tint text-purple-primary flex items-center justify-center">
                    <Clock className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-surface shadow-2xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[11px] text-text-secondary font-medium">
                      {isClassTeacher ? "Attendance Status" : "Active Resources"}
                    </p>
                    <p className="text-lg font-bold text-foreground">
                      {isClassTeacher ? (isTodayAttendanceDone ? "Recorded" : "Pending") : `${myMaterials.length} Files`}
                    </p>
                    <p className={`text-[10px] font-semibold ${isClassTeacher && !isTodayAttendanceDone ? "text-amber-700" : "text-emerald-600"}`}>
                      {isClassTeacher ? (isTodayAttendanceDone ? "Published" : "Requires Roll Call") : `${myHomework.length} Assignments`}
                    </p>
                  </div>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isClassTeacher && !isTodayAttendanceDone ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-600"}`}>
                    {isClassTeacher ? <UserCheck className="h-5 w-5" /> : <FileCheck2 className="h-5 w-5" />}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* NEXT CLASS & TODAY'S SCHEDULE BANNER */}
            {nextPeriod ? (
              <div className="p-4 rounded-xl border border-purple-primary/20 bg-purple-tint/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-purple-primary text-white flex items-center justify-center font-bold">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-purple-primary uppercase tracking-wide">
                      Next Scheduled Period Today
                    </span>
                    <h3 className="text-sm font-bold text-foreground">
                      {nextPeriod.slot.subject} — Class {nextPeriod.sectionName} at {nextPeriod.slot.startTime} – {nextPeriod.slot.endTime}
                    </h3>
                  </div>
                </div>
                <Button asChild size="sm" className="bg-purple-primary text-white text-xs">
                  <Link href="/teacher/timetable">
                    View My Timetable
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            ) : null}

            {/* DYNAMIC QUICK ACTIONS ACCORDING TO ROLE & PERMISSIONS */}
            <Card className="border-border/80 bg-surface shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-primary" />
                  Authorized Quick Actions
                </CardTitle>
                <CardDescription className="text-xs">
                  Contextual actions matching your teaching assignments for Academic Year 2026–2027
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {isClassTeacher && (
                    <Button asChild variant="outline" size="sm" className="h-auto py-2.5 flex-col gap-1.5 text-xs border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50 text-emerald-800">
                      <Link href="/teacher/attendance">
                        <UserCheck className="h-4 w-4 text-emerald-700" />
                        <span>Mark Attendance</span>
                      </Link>
                    </Button>
                  )}

                  <Button asChild variant="outline" size="sm" className="h-auto py-2.5 flex-col gap-1.5 text-xs hover:border-purple-primary/40">
                    <Link href="/teacher/classes">
                      <BookOpen className="h-4 w-4 text-purple-primary" />
                      <span>My Classes</span>
                    </Link>
                  </Button>

                  <Button asChild variant="outline" size="sm" className="h-auto py-2.5 flex-col gap-1.5 text-xs hover:border-purple-primary/40">
                    <Link href="/teacher/materials">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span>Upload Material</span>
                    </Link>
                  </Button>

                  <Button asChild variant="outline" size="sm" className="h-auto py-2.5 flex-col gap-1.5 text-xs hover:border-purple-primary/40">
                    <Link href="/teacher/assignments">
                      <ClipboardList className="h-4 w-4 text-amber-600" />
                      <span>Create Assignment</span>
                    </Link>
                  </Button>

                  <Button asChild variant="outline" size="sm" className="h-auto py-2.5 flex-col gap-1.5 text-xs hover:border-purple-primary/40">
                    <Link href="/teacher/marks">
                      <Award className="h-4 w-4 text-purple-primary" />
                      <span>Enter Marks</span>
                    </Link>
                  </Button>

                  <Button asChild variant="outline" size="sm" className="h-auto py-2.5 flex-col gap-1.5 text-xs hover:border-purple-primary/40">
                    <Link href="/teacher/timetable">
                      <Calendar className="h-4 w-4 text-teal-600" />
                      <span>My Timetable</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* SECTION A: CLASS TEACHER ATTENDANCE DESK OR SUBJECT TEACHER LOCKED NOTICE */}
            <div id="attendance-section">
              {isClassTeacher && teacherAssignedSection ? (
                <Card className="border-emerald-200 bg-emerald-50/20 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold mb-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Class Teacher Responsibility — {teacherAssignedSection.className} ({teacherAssignedSection.code})
                        </div>
                        <CardTitle className="text-base font-bold text-foreground">
                          Daily Attendance Roll Call
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Assigned class: {teacherAssignedSection.className} ({teacherAssignedSection.code}). Only you can publish daily records.
                        </CardDescription>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-36 h-8 text-xs bg-surface font-semibold"
                        />
                        <Button
                          onClick={() => handleMarkAll("PRESENT")}
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs bg-surface text-emerald-700 hover:bg-emerald-50"
                        >
                          All Present
                        </Button>
                        <Button
                          onClick={handleSaveAttendance}
                          size="sm"
                          className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Save Attendance
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    {classStudents.length === 0 ? (
                      <div className="py-8 text-center text-xs text-text-secondary">
                        No students enrolled in {teacherAssignedSection.code}.
                      </div>
                    ) : (
                      <div className="overflow-x-auto bg-surface border-t border-border">
                        <Table>
                          <TableHeader>
                            <TableRow className="text-xs text-text-secondary bg-muted/30">
                              <TableHead className="w-16">Roll No</TableHead>
                              <TableHead>Student Name</TableHead>
                              <TableHead>Karnataka SATS ID</TableHead>
                              <TableHead className="text-center w-64">Attendance Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {classStudents.map((st) => {
                              const status = attendanceDraft[st.id] || "PRESENT";

                              return (
                                <TableRow key={st.id} className="text-xs hover:bg-muted/30 transition-colors">
                                  <TableCell className="font-mono font-bold">{st.rollNo || "--"}</TableCell>
                                  <TableCell className="font-bold text-foreground">{st.name}</TableCell>
                                  <TableCell className="font-mono text-[11px] text-text-secondary font-semibold">
                                    {st.satsId}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(st.id, "PRESENT")}
                                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                                          status === "PRESENT"
                                            ? "bg-emerald-600 text-white shadow-xs"
                                            : "bg-muted/60 hover:bg-emerald-50 text-text-secondary"
                                        }`}
                                      >
                                        Present
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(st.id, "ABSENT")}
                                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                                          status === "ABSENT"
                                            ? "bg-red-600 text-white shadow-xs"
                                            : "bg-muted/60 hover:bg-red-50 text-text-secondary"
                                        }`}
                                      >
                                        Absent
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(st.id, "LATE")}
                                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                                          status === "LATE"
                                            ? "bg-amber-500 text-white shadow-xs"
                                            : "bg-muted/60 hover:bg-amber-50 text-text-secondary"
                                        }`}
                                      >
                                        Late
                                      </button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                /* SUBJECT TEACHER ATTENDANCE LOCKED NOTICE */
                <Card className="border-border/80 bg-surface shadow-2xs">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground">
                          Attendance Desk: Class Teacher Exclusive
                        </h3>
                        <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700">
                          Subject Teacher Access
                        </Badge>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        Roll-call attendance marking is strictly restricted to designated primary Class Teachers. You teach subjects across {assignedSections.map((s) => s.code).join(", ") || "assigned classes"}. You can view student rosters, upload materials, issue assignments, and grade exam papers.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* SECTION B: ASSIGNED CLASSES BREAKDOWN */}
            <Card className="border-border/80 bg-surface shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-purple-primary" />
                    My Teaching Assignments
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Your assigned class arms, subjects, and roles configured by Super Admin
                  </CardDescription>
                </div>
                <Button asChild variant="outline" size="sm" className="text-xs">
                  <Link href="/teacher/classes">View Full Rosters</Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs text-text-secondary bg-muted/30">
                        <TableHead className="w-24">Class Arm</TableHead>
                        <TableHead>Teaching Responsibility</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Enrolled Students</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myAssignmentsList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-xs text-text-secondary">
                            No teaching assignments allocated. Please contact Super Admin.
                          </TableCell>
                        </TableRow>
                      ) : (
                        myAssignmentsList.map((asgn) => {
                          const count = getStudentsBySection(asgn.sectionId).length;
                          const isCT = asgn.assignmentType === "CLASS_TEACHER";

                          return (
                            <TableRow key={asgn.id} className="text-xs hover:bg-muted/30 transition-colors">
                              <TableCell>
                                <span className="font-bold text-foreground text-xs px-2 py-0.5 rounded bg-muted">
                                  {asgn.sectionName}
                                </span>
                              </TableCell>
                              <TableCell>
                                {isCT ? (
                                  <Badge className="bg-emerald-600 text-white text-[10px]">
                                    Class Teacher
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-purple-primary/40 text-purple-primary text-[10px]">
                                    Subject Teacher
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="font-semibold text-foreground">
                                {asgn.subjectName || "All Class Activities"}
                              </TableCell>
                              <TableCell className="text-text-secondary">{count} Students</TableCell>
                              <TableCell className="text-right">
                                <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-purple-primary hover:text-purple-primary/80">
                                  <Link href={`/teacher/classes/${asgn.sectionId}`}>
                                    Open Class
                                    <ArrowRight className="h-3 w-3 ml-1" />
                                  </Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* SECTION C: MY PERSONAL TEACHING SCHEDULE */}
            <Card className="border-border/80 bg-surface shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-primary" />
                    My Personal Teaching Schedule ({todayDay})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Published periods strictly assigned to you for {todayDay}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {teacherSchedule.length} Periods This Week
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                {todaysTeachingPeriods.length === 0 ? (
                  <div className="py-8 text-center text-xs text-text-secondary">
                    No teaching periods scheduled for you on {todayDay}.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs text-text-secondary bg-muted/30">
                          <TableHead className="w-36">Time Slot</TableHead>
                          <TableHead className="w-24">Class</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Room</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {todaysTeachingPeriods.map((item, idx) => (
                          <TableRow key={idx} className="text-xs hover:bg-muted/30 transition-colors">
                            <TableCell>
                              <span className="font-mono px-2 py-0.5 rounded bg-purple-tint text-purple-primary font-bold text-xs border border-purple-primary/20">
                                {item.slot.startTime} – {item.slot.endTime}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-purple-primary text-white text-[10px]">
                                {item.sectionName}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold text-foreground">
                              {item.slot.subject}
                            </TableCell>
                            <TableCell className="text-text-secondary">
                              {item.slot.room || "Assigned Classroom"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })()}


      {/* ========================================================================= */}
      {/* 3. STUDENT VIEW (ACADEMIC HOME PAGE PORTAL) */}
      {/* ========================================================================= */}
      {currentRole === "student" && (
        <StudentDashboardOverview studentUser={user} />
      )}
    </div>
  );
}
