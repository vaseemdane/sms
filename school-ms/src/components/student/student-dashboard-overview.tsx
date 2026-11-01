"use client";

import * as React from "react";
import Link from "next/link";
import {
  TrendingUp,
  UserCheck,
  ClipboardList,
  BookOpen,
  Calendar,
  Clock,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Sparkles,
  Award,
  Bell,
  MapPin,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useSMSStore, WeekDay, CustomTimeSlot } from "@/context/sms-store";
import { AcademicYearSelector } from "./academic-year-selector";
import { formatGreeting } from "@/lib/utils";

interface StudentDashboardOverviewProps {
  studentUser: any;
}

export function StudentDashboardOverview({ studentUser }: StudentDashboardOverviewProps) {
  const {
    sections,
    teachers,
    getTimetableBySection,
    getStudentMarks,
    getStudentAcademicYears,
    getStudentYearPerformance,
    getStudentAttendanceSummary,
    notifications,
    announcements,
  } = useSMSStore();

  const studentId = studentUser?.id || "usr-student-1";
  const studentSectionId = studentUser?.classSectionId || "sec-6a";
  const studentSection = sections.find((s) => s.id === studentSectionId);

  // Academic Year State
  const availableYears = getStudentAcademicYears(studentId);
  const [selectedYear, setSelectedYear] = React.useState<string>(
    availableYears[0] || "2026-2027"
  );

  // Dynamic greeting based on current hour
  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  // Real Stored Data
  const currentMarks = getStudentMarks(studentId, selectedYear);
  const yearPerformances = getStudentYearPerformance(studentId);
  const attendanceSummary = getStudentAttendanceSummary(studentId, studentSectionId, selectedYear);
  const timetable = getTimetableBySection(studentSectionId);

  // Current year calculations
  const totalScore = currentMarks.reduce((acc, m) => acc + m.totalScore, 0);
  const maxScore = currentMarks.reduce((acc, m) => acc + m.maxScore, 0);
  const performancePercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const examsCount = new Set(currentMarks.map((m) => m.examName)).size;
  const subjectsCount = currentMarks.length > 0 ? currentMarks.length : 6;

  // Grade determination
  let currentGrade = "B1";
  if (performancePercentage >= 91) currentGrade = "A1";
  else if (performancePercentage >= 81) currentGrade = "A2";
  else if (performancePercentage >= 71) currentGrade = "B1";
  else if (performancePercentage >= 61) currentGrade = "B2";
  else if (performancePercentage >= 51) currentGrade = "C1";
  else if (performancePercentage >= 41) currentGrade = "C2";
  else if (performancePercentage >= 33) currentGrade = "D";
  else if (performancePercentage > 0) currentGrade = "E";
  else currentGrade = "N/A";

  // Historical Growth Calculation (real data)
  const growthInsight = React.useMemo(() => {
    if (yearPerformances.length >= 2) {
      const current = yearPerformances[0]?.percentage || 0;
      const prev = yearPerformances[1]?.percentage || 0;
      const diff = current - prev;
      if (diff > 0) {
        return {
          type: "improving",
          diff,
          text: `Your overall performance has improved by ${diff}% compared with the previous academic year (${yearPerformances[1].year.replace("-", "–")}).`,
        };
      } else if (diff < 0) {
        return {
          type: "declining",
          diff: Math.abs(diff),
          text: `Your average decreased by ${Math.abs(diff)}% compared with the previous academic year. Focus on revision.`,
        };
      }
    }
    return {
      type: "stable",
      diff: 0,
      text: "Consistent academic trajectory recorded across academic terms.",
    };
  }, [yearPerformances]);

  // Subject Strengths and Weaknesses
  const sortedSubjects = React.useMemo(() => {
    return [...currentMarks].sort((a, b) => b.totalScore - a.totalScore);
  }, [currentMarks]);

  const strongestSubject = sortedSubjects[0];
  const weakestSubject = sortedSubjects[sortedSubjects.length - 1];

  // Today's Timetable with Live "NOW" indicator
  const todayDayName = React.useMemo(() => {
    const days: WeekDay[] = ["Sunday" as any, "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const d = days[new Date().getDay()];
    return d === ("Sunday" as any) ? "Monday" : d;
  }, []);

  const todaySlots: CustomTimeSlot[] = timetable?.schedule[todayDayName] || [];

  // Determine current active period
  const isSlotNow = (slot: CustomTimeSlot) => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = slot.startTime.split(":").map(Number);
    const [eh, em] = slot.endTime.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    return currentMinutes >= startMin && currentMinutes < endMin;
  };

  // Chart data for Performance Trend
  const trendChartData = React.useMemo(() => {
    return [...yearPerformances].reverse().map((yp) => ({
      year: yp.year.replace("-", "–"),
      percentage: yp.percentage,
      average: yp.averageMarks,
    }));
  }, [yearPerformances]);

  // Subject Bar Chart Data
  const subjectChartData = React.useMemo(() => {
    return currentMarks.map((m) => ({
      subject: m.subject.length > 10 ? m.subject.slice(0, 8) + "..." : m.subject,
      fullName: m.subject,
      score: m.totalScore,
      grade: m.grade,
    }));
  }, [currentMarks]);

  // Student Unread Notifications
  const studentNotifs = notifications.filter(
    (n) => !n.studentId || n.studentId === studentId
  ).slice(0, 3);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* ========================================================================= */}
      {/* 1. STUDENT IDENTITY BANNER */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-primary via-purple-primary/95 to-purple-soft p-4 sm:p-8 text-white shadow-xl shadow-purple-primary/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-white/30 shadow-lg">
              <AvatarImage src={studentUser?.photo} />
              <AvatarFallback className="bg-white/20 text-white font-extrabold text-xl sm:text-2xl backdrop-blur-md">
                {(studentUser?.name || "Student").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-medium text-white/90">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>Student Academic Portal</span>
                <span className="opacity-40">•</span>
                <span>Karnataka SATS Verified</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {formatGreeting(studentUser?.name || "Student")} 👋
              </h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-white/80 pt-0.5">
                <span>Class: <strong className="text-white font-bold">{studentSection?.className} ({studentSection?.code})</strong></span>
                <span>•</span>
                <span>Roll No: <strong className="text-white font-bold">{studentUser?.rollNo || "01"}</strong></span>
                <span>•</span>
                <span>SATS ID: <strong className="font-mono text-white font-bold">{studentUser?.satsId || "KA-SATS-2024-88412"}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="bg-white/15 backdrop-blur-md p-2 rounded-xl border border-white/20 text-right">
              <p className="text-[10px] text-white/70 uppercase tracking-wider font-bold">Academic Year</p>
              <AcademicYearSelector
                years={availableYears}
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ATTENDANCE ALERT (IF BELOW CONFIGURED THRESHOLD) */}
      {/* ========================================================================= */}
      {attendanceSummary.isBelowThreshold && (
        <Card className="border-amber-300 bg-amber-50/90 shadow-sm">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                Attendance Alert: Action Required
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                  Threshold: {attendanceSummary.threshold}%
                </Badge>
              </h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                Your cumulative attendance is currently <strong className="font-bold underline">{attendanceSummary.overallPercentage}%</strong> ({attendanceSummary.presentDays} of {attendanceSummary.totalWorkingDays} working days).
                Please maintain regular daily attendance to meet the school's mandatory {attendanceSummary.threshold}% requirement for terminal examination eligibility.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 3. DASHBOARD KPI CARDS (REAL DATA ONLY) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance KPI */}
        <Card className="border-border/80 bg-surface shadow-2xs hover:border-purple-primary/40 transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-text-secondary font-medium">Daily Attendance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-foreground">
                  {attendanceSummary.overallPercentage}%
                </span>
                <span className={`text-[11px] font-bold ${
                  attendanceSummary.overallPercentage >= 75 ? "text-emerald-600" : "text-amber-700"
                }`}>
                  {attendanceSummary.overallPercentage >= 75 ? "Compliant" : "Low"}
                </span>
              </div>
              <p className="text-[11px] text-text-secondary">
                {attendanceSummary.presentDays} / {attendanceSummary.totalWorkingDays} Working Days
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
              <UserCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Academic Performance KPI */}
        <Card className="border-border/80 bg-surface shadow-2xs hover:border-purple-primary/40 transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-text-secondary font-medium">Academic Performance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-foreground">
                  {performancePercentage}%
                </span>
                <Badge variant="secondary" className="bg-purple-tint text-purple-primary font-bold text-[10px]">
                  Grade {currentGrade}
                </Badge>
              </div>
              <p className="text-[11px] text-purple-primary font-semibold">
                Aggregate: {totalScore} / {maxScore} Marks
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-purple-tint text-purple-primary flex items-center justify-center shadow-xs">
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Examinations KPI */}
        <Card className="border-border/80 bg-surface shadow-2xs hover:border-purple-primary/40 transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-text-secondary font-medium">Examinations Taken</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-foreground">
                  {examsCount} Diets
                </span>
              </div>
              <p className="text-[11px] text-text-secondary">
                AY {selectedYear.replace("-", "–")} Assessment Cycle
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shadow-xs">
              <ClipboardList className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Subjects KPI */}
        <Card className="border-border/80 bg-surface shadow-2xs hover:border-purple-primary/40 transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-text-secondary font-medium">Enrolled Subjects</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-foreground">
                  {subjectsCount} Subjects
                </span>
              </div>
              <p className="text-[11px] text-emerald-600 font-semibold">
                100% Core & Regional
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <BookOpen className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 4. PERFORMANCE INSIGHT BANNER */}
      {/* ========================================================================= */}
      <Card className="border-purple-primary/20 bg-gradient-to-r from-purple-tint/50 via-surface to-surface shadow-2xs">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">
                  {growthInsight.type === "improving" ? "📈 Performance Improving" : "Academic Trajectory"}
                </p>
                <p className="text-[11px] text-text-secondary leading-snug">
                  {growthInsight.text}
                </p>
              </div>
            </div>

            {strongestSubject && (
              <div className="flex items-start gap-3 border-t md:border-t-0 md:border-l border-border/80 pt-3 md:pt-0 md:pl-4">
                <div className="h-8 w-8 rounded-lg bg-purple-tint text-purple-primary flex items-center justify-center shrink-0">
                  <Award className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">
                    🎯 Strongest Subject
                  </p>
                  <p className="text-[11px] text-text-secondary leading-snug">
                    <strong className="text-foreground">{strongestSubject.subject}</strong> ({strongestSubject.totalScore}%, Grade {strongestSubject.grade}) is currently your highest-scoring subject.
                  </p>
                </div>
              </div>
            )}

            {weakestSubject && (
              <div className="flex items-start gap-3 border-t md:border-t-0 md:border-l border-border/80 pt-3 md:pt-0 md:pl-4">
                <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">
                    ⚠️ Needs Attention
                  </p>
                  <p className="text-[11px] text-text-secondary leading-snug">
                    <strong className="text-foreground">{weakestSubject.subject}</strong> ({weakestSubject.totalScore}%) has the highest potential for marks improvement this term.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 5. DUAL COLUMN: PERFORMANCE TREND & TODAY'S TIMETABLE */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trend Chart */}
        <Card className="border-border/80 bg-surface shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-primary" />
                  Performance Trend Across Academic Years
                </CardTitle>
                <CardDescription className="text-xs">
                  Historical average growth tracking: 2024–25 to {selectedYear.replace("-", "–")}
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-purple-primary hover:text-purple-primary">
                <Link href="/student/academics/performance">
                  Details
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            {trendChartData.length > 0 ? (
              <div className="h-56 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                      axisLine={{ stroke: "var(--color-border)" }}
                    />
                    <YAxis
                      domain={[50, 100]}
                      tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                      axisLine={false}
                      tickLine={false}
                      unit="%"
                    />
                    <Tooltip
                      formatter={(val: any) => [`${val}%`, "Overall Aggregate"]}
                      contentStyle={{
                        backgroundColor: "var(--color-surface)",
                        borderColor: "var(--color-border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="percentage"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ r: 5, fill: "#8b5cf6", strokeWidth: 2, stroke: "#ffffff" }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-text-secondary">
                No historical performance trend data available yet.
              </div>
            )}
            <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-xs text-text-secondary">
              <span>Trajectory: <strong className="text-foreground capitalize">{growthInsight.type}</strong></span>
              <span className="text-purple-primary font-bold">Latest: {performancePercentage}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Today's Timetable with Live "NOW" badge */}
        <Card className="border-border/80 bg-surface shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-primary" />
                  Today's Classes ({todayDayName})
                </CardTitle>
                <CardDescription className="text-xs">
                  Class {studentSection?.code} live schedule & period rooms
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-purple-primary hover:text-purple-primary">
                <Link href="/student/timetable">
                  Weekly
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5 pb-4">
            {todaySlots.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-secondary">
                No timetable published for today.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {todaySlots.slice(0, 5).map((slot, idx) => {
                  const isPeriod = slot.type === "PERIOD";
                  const teacherObj = teachers.find((t) => t.id === slot.teacherId);
                  const isCurrent = isSlotNow(slot);

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                        isCurrent
                          ? "bg-purple-tint/70 border-purple-primary/60 shadow-xs ring-1 ring-purple-primary/30"
                          : isPeriod
                          ? "bg-surface border-border/80 hover:border-purple-primary/30"
                          : "bg-amber-50/50 border-amber-200/80 text-amber-900"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted/60 border border-border text-foreground shrink-0">
                          {slot.startTime}–{slot.endTime}
                        </span>
                        <div className="truncate">
                          <p className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
                            {isPeriod ? slot.subject : slot.title || "Recess Break"}
                            {isCurrent && (
                              <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 animate-pulse">
                                NOW
                              </Badge>
                            )}
                          </p>
                          {isPeriod && (
                            <p className="text-[11px] text-text-secondary truncate">
                              Teacher: {teacherObj?.name || "Faculty"} • {slot.room || "Room 204"}
                            </p>
                          )}
                        </div>
                      </div>

                      <Badge
                        variant={isPeriod ? "secondary" : "outline"}
                        className="text-[9px] shrink-0"
                      >
                        {slot.room || (isPeriod ? "Room 204" : "Campus")}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-text-secondary">
              <span>Section: <strong className="text-foreground">{studentSection?.className} ({studentSection?.code})</strong></span>
              <Link href="/student/timetable" className="text-purple-primary font-semibold hover:underline">
                View Full Weekly Timetable →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 6. SUBJECT-WISE PERFORMANCE & ATTENDANCE SUMMARY */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject-Wise Performance (2 cols) */}
        <Card className="lg:col-span-2 border-border/80 bg-surface shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-purple-primary" />
                  Subject-Wise Performance (Mid-Term)
                </CardTitle>
                <CardDescription className="text-xs">
                  Academic distribution and individual subject mastery
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-purple-primary hover:text-purple-primary">
                <Link href="/student/academics/subjects">
                  All Subjects
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {subjectChartData.length > 0 ? (
              <div className="h-48 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis
                      dataKey="subject"
                      tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
                      axisLine={{ stroke: "var(--color-border)" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                      unit="%"
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val: any, _name: any, item: any) => [
                        `${val}% (Grade ${item.payload.grade})`,
                        item.payload.fullName,
                      ]}
                      contentStyle={{
                        backgroundColor: "var(--color-surface)",
                        borderColor: "var(--color-border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="score"
                      fill="#8b5cf6"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-text-secondary">
                No subject marks recorded for this academic year yet.
              </div>
            )}

            {/* Subject List Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
              {currentMarks.map((m) => (
                <div
                  key={m.id}
                  className="p-2.5 rounded-xl border border-border/70 bg-muted/20 flex flex-col justify-between space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground truncate">{m.subject}</span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-bold ${
                        m.totalScore >= 85
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : m.totalScore >= 75
                          ? "bg-purple-tint text-purple-primary border-purple-primary/30"
                          : "bg-amber-50 text-amber-800 border-amber-300"
                      }`}
                    >
                      {m.grade}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-text-secondary">
                      <span>Score: <strong className="text-foreground">{m.totalScore}%</strong></span>
                      <span className="text-[10px] text-text-secondary">
                        {m.totalScore >= 85 ? "Excellent" : m.totalScore >= 75 ? "Good" : "Needs Attention"}
                      </span>
                    </div>
                    <Progress value={m.totalScore} className="h-1.5" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Attendance Breakdown (1 col) */}
        <Card className="border-border/80 bg-surface shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-purple-primary" />
                  Attendance Summary
                </CardTitle>
                <CardDescription className="text-xs">
                  Monthly consistency breakdown
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-purple-primary hover:text-purple-primary">
                <Link href="/student/attendance">
                  Calendar
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 text-center space-y-1">
              <p className="text-3xl font-extrabold text-foreground">
                {attendanceSummary.overallPercentage}%
              </p>
              <p className="text-xs text-text-secondary">
                {attendanceSummary.presentDays} Present • {attendanceSummary.absentDays} Absent • {attendanceSummary.lateDays} Late
              </p>
              <p className="text-[11px] text-purple-primary font-semibold">
                Total School Working Days: {attendanceSummary.totalWorkingDays}
              </p>
            </div>

            {/* Monthly Progress Pills */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Monthly Breakdown
              </p>
              <div className="space-y-1.5">
                {attendanceSummary.monthlyBreakdown.map((mb) => (
                  <div key={mb.month} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-surface hover:bg-muted/30">
                    <span className="font-semibold text-foreground">{mb.month}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-text-secondary">
                        {mb.present}/{mb.total} Days
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${
                          mb.percentage >= 75 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        }`}
                      >
                        {mb.percentage}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button asChild size="sm" variant="outline" className="w-full text-xs">
              <Link href="/student/attendance">
                Open Interactive Attendance Calendar
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 7. RECENT RESULTS & NOTIFICATIONS ROW */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Results Card */}
        <Card className="border-border/80 bg-surface shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-primary" />
                  Recent Examination Results
                </CardTitle>
                <CardDescription className="text-xs">
                  Mid-Term Assessment Official Marks
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="lavender" className="h-7 text-xs">
                <Link href="/student/academics/report-card">
                  View Report Card
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentMarks.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-secondary">
                No examination results available yet for this session.
              </div>
            ) : (
              <div className="space-y-2">
                {currentMarks.slice(0, 4).map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl border border-border/80 bg-surface flex items-center justify-between hover:border-purple-primary/40 transition-all"
                  >
                    <div>
                      <p className="font-bold text-xs text-foreground">{m.subject}</p>
                      <p className="text-[11px] text-text-secondary">
                        Theory: {m.examScore}/60 • Internal: {m.testScore}/40
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xs text-foreground">
                        {m.totalScore} / {m.maxScore}
                      </p>
                      <Badge variant="secondary" className="text-[10px] font-bold">
                        Grade {m.grade}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Notifications & Circulars Card */}
        <Card className="border-border/80 bg-surface shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-purple-primary" />
                  Recent Notifications & Circulars
                </CardTitle>
                <CardDescription className="text-xs">
                  Official updates published for your cohort
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-purple-primary hover:text-purple-primary">
                <Link href="/student/notifications">
                  View All
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {studentNotifs.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-secondary">
                You're all caught up! No new notifications.
              </div>
            ) : (
              studentNotifs.map((n) => (
                <Link
                  key={n.id}
                  href={n.link || "/student/notifications"}
                  className="block p-3 rounded-xl border border-border/70 hover:border-purple-primary/50 bg-surface hover:bg-muted/20 transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      {!n.read && <span className="h-2 w-2 rounded-full bg-purple-primary" />}
                      {n.title}
                    </span>
                    <Badge variant="outline" className="text-[9px] capitalize">
                      {n.category}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-text-secondary line-clamp-1">
                    {n.message}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
