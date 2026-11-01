"use client";

import * as React from "react";
import Link from "next/link";
import {
  UserCheck,
  ArrowLeft,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  BookOpen,
  FileText,
  Download,
  Megaphone,
} from "lucide-react";
import {
  ResponsiveContainer,
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
import { Progress } from "@/components/ui/progress";
import { useSMSStore, AttendanceStatus } from "@/context/sms-store";
import { useAuth } from "@/services/auth-context";

export default function StudentAttendancePage() {
  const { user } = useAuth();
  const { getStudentAttendanceSummary } = useSMSStore();

  const studentId = user?.id || "usr-student-1";
  const sectionId = user?.classSectionId || "sec-6a";

  const summary = getStudentAttendanceSummary(studentId, sectionId, "2026-2027");

  // Calendar Month Navigation
  const months = [
    { name: "October 2026", year: 2026, month: 9 },
    { name: "September 2026", year: 2026, month: 8 },
    { name: "August 2026", year: 2026, month: 7 },
    { name: "July 2026", year: 2026, month: 6 },
    { name: "June 2026", year: 2026, month: 5 },
  ];

  const [currentMonthIndex, setCurrentMonthIndex] = React.useState(0);
  const activeMonthObj = months[currentMonthIndex];

  // Generate calendar days for active month
  const calendarDays = React.useMemo(() => {
    const year = activeMonthObj.year;
    const month = activeMonthObj.month;

    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{
      date: number;
      dateStr: string;
      isSunday: boolean;
      status?: AttendanceStatus | "WEEKEND";
    }> = [];

    // Prepend empty padding for days before day 1 (adjusting for Mon-start: 1 is Mon, 0 is Sun)
    // In our calendar: Mon Tue Wed Thu Fri Sat Sun
    const padCount = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < padCount; i++) {
      days.push({ date: 0, dateStr: "", isSunday: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, month, d);
      const isSunday = dayDate.getDay() === 0;

      const yyyy = year;
      const mm = String(month + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      let status: AttendanceStatus | "WEEKEND" | undefined = summary.dayRecords[dateStr];
      if (isSunday) {
        status = "WEEKEND";
      }

      days.push({
        date: d,
        dateStr,
        isSunday,
        status,
      });
    }

    return days;
  }, [activeMonthObj, summary.dayRecords]);

  // Chart Data for Monthly Attendance Progression
  const monthlyChartData = summary.monthlyBreakdown.map((mb) => ({
    month: mb.month,
    percentage: mb.percentage,
    present: mb.present,
    absent: mb.absent,
    total: mb.total,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Button asChild variant="ghost" size="sm" className="h-7 px-2">
              <Link href="/dashboard">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Dashboard
              </Link>
            </Button>
            <span>/</span>
            <span className="font-semibold text-purple-primary">Attendance Desk</span>
            <span>/</span>
            <span className="font-semibold text-foreground">Monthly Ledger</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-purple-primary" />
            My Attendance Record & Visual Calendar
          </h1>
          <p className="text-xs text-text-secondary">
            Verified biometric and roll-call daily attendance recorded by designated Class Teacher.
          </p>
        </div>

        <Badge variant="outline" className="text-xs px-3 py-1 bg-surface font-semibold">
          Class 6A • Section AY 2026–27
        </Badge>
      </div>

      {/* Attendance Alert if below threshold */}
      {summary.isBelowThreshold ? (
        <Card className="border-red-300 bg-red-50/90 shadow-sm">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-red-900 flex items-center gap-2">
                Statutory Attendance Alert: Low Attendance ({summary.overallPercentage}%)
              </h4>
              <p className="text-xs text-red-800 leading-relaxed">
                Your cumulative attendance is <strong className="font-bold underline">{summary.overallPercentage}%</strong>, which is below the school's configured {summary.threshold}% attendance threshold. Regular school attendance is mandatory to appear for term examinations.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-200 bg-emerald-50/40 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950">
                  Excellent Attendance Standing ({summary.overallPercentage}%)
                </h4>
                <p className="text-[11px] text-emerald-800">
                  You comfortably meet the school's statutory minimum attendance threshold of {summary.threshold}%.
                </p>
              </div>
            </div>
            <Badge className="bg-emerald-600 text-white text-[10px]">Compliant</Badge>
          </CardContent>
        </Card>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/80 bg-surface shadow-2xs">
          <CardContent className="p-4 space-y-1 text-center">
            <p className="text-xs text-text-secondary font-medium">Cumulative Rate</p>
            <p className="text-3xl font-extrabold text-foreground">{summary.overallPercentage}%</p>
            <p className="text-[10px] text-purple-primary font-bold">Min Threshold: {summary.threshold}%</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-2xs">
          <CardContent className="p-4 space-y-1 text-center">
            <p className="text-xs text-text-secondary font-medium">Present Days</p>
            <p className="text-3xl font-extrabold text-emerald-600">{summary.presentDays}</p>
            <p className="text-[10px] text-text-secondary">Marked Present</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-2xs">
          <CardContent className="p-4 space-y-1 text-center">
            <p className="text-xs text-text-secondary font-medium">Absent Days</p>
            <p className="text-3xl font-extrabold text-red-600">{summary.absentDays}</p>
            <p className="text-[10px] text-text-secondary">Excused / Unexcused</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-2xs">
          <CardContent className="p-4 space-y-1 text-center">
            <p className="text-xs text-text-secondary font-medium">Working Days</p>
            <p className="text-3xl font-extrabold text-foreground">{summary.totalWorkingDays}</p>
            <p className="text-[10px] text-text-secondary">June–October 2026</p>
          </CardContent>
        </Card>
      </div>

      {/* Dual Grid: Monthly Calendar & Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar (2 cols) */}
        <Card className="lg:col-span-2 border-border/80 bg-surface shadow-sm">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-primary" />
                  Monthly Attendance Calendar
                </CardTitle>
                <CardDescription className="text-xs">
                  Daily visual status log with accessible indicators
                </CardDescription>
              </div>

              {/* Month Selector Buttons */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentMonthIndex >= months.length - 1}
                  onClick={() => setCurrentMonthIndex((prev) => prev + 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-bold px-2 text-foreground min-w-[110px] text-center">
                  {activeMonthObj.name}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentMonthIndex <= 0}
                  onClick={() => setCurrentMonthIndex((prev) => prev - 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-text-secondary py-1">
              <div><span className="hidden sm:inline">Mon</span><span className="sm:hidden">M</span></div>
              <div><span className="hidden sm:inline">Tue</span><span className="sm:hidden">T</span></div>
              <div><span className="hidden sm:inline">Wed</span><span className="sm:hidden">W</span></div>
              <div><span className="hidden sm:inline">Thu</span><span className="sm:hidden">T</span></div>
              <div><span className="hidden sm:inline">Fri</span><span className="sm:hidden">F</span></div>
              <div><span className="hidden sm:inline">Sat</span><span className="sm:hidden">S</span></div>
              <div className="text-red-500"><span className="hidden sm:inline">Sun</span><span className="sm:hidden">S</span></div>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {calendarDays.map((d, idx) => {
                if (d.date === 0) {
                  return <div key={idx} className="h-13 sm:h-16 rounded-lg sm:rounded-xl bg-transparent" />;
                }

                const isPresent = d.status === "PRESENT";
                const isAbsent = d.status === "ABSENT";
                const isLate = d.status === "LATE";
                const isWeekend = d.status === "WEEKEND";

                return (
                  <div
                    key={idx}
                    className={`h-13 sm:h-16 p-1 sm:p-1.5 rounded-lg sm:rounded-xl border flex flex-col justify-between transition-all ${
                      isPresent
                        ? "bg-emerald-50/60 border-emerald-200 text-emerald-950"
                        : isAbsent
                        ? "bg-red-50/80 border-red-200 text-red-950"
                        : isLate
                        ? "bg-amber-50/80 border-amber-200 text-amber-950"
                        : isWeekend
                        ? "bg-muted/30 border-border/50 text-text-secondary"
                        : "bg-surface border-border/70 text-text-secondary"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] sm:text-xs font-bold">{d.date}</span>
                      {isPresent && <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600" />}
                      {isAbsent && <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-600" />}
                      {isLate && <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-600" />}
                    </div>

                    <div className="text-[9px] sm:text-[10px] font-bold truncate">
                      {isPresent && (
                        <span className="text-emerald-700">
                          <span className="hidden sm:inline">Present (P)</span>
                          <span className="sm:hidden">P</span>
                        </span>
                      )}
                      {isAbsent && (
                        <span className="text-red-700">
                          <span className="hidden sm:inline">Absent (A)</span>
                          <span className="sm:hidden">A</span>
                        </span>
                      )}
                      {isLate && (
                        <span className="text-amber-700">
                          <span className="hidden sm:inline">Late (L)</span>
                          <span className="sm:hidden">L</span>
                        </span>
                      )}
                      {isWeekend && (
                        <span className="text-text-secondary">
                          <span className="hidden sm:inline">Weekend</span>
                          <span className="sm:hidden">Off</span>
                        </span>
                      )}
                      {!d.status && (
                        <span className="text-text-secondary opacity-60">
                          <span className="hidden sm:inline">No Record</span>
                          <span className="sm:hidden">--</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-600" />
                <span className="text-text-secondary">Present (P)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-600" />
                <span className="text-text-secondary">Absent (A)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-amber-500" />
                <span className="text-text-secondary">Late Entry (L)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-muted border border-border" />
                <span className="text-text-secondary">Sunday Weekend</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend (1 col) */}
        <Card className="border-border/80 bg-surface shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-primary" />
              Monthly Attendance Trend
            </CardTitle>
            <CardDescription className="text-xs">
              Historical month-on-month consistency
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="h-56 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
                    axisLine={{ stroke: "var(--color-border)" }}
                  />
                  <YAxis
                    domain={[60, 100]}
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                    unit="%"
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${val}%`, "Attendance Rate"]}
                    contentStyle={{
                      backgroundColor: "var(--color-surface)",
                      borderColor: "var(--color-border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="percentage" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* List breakdown */}
            <div className="space-y-2 pt-2 border-t border-border">
              {monthlyChartData.map((item) => (
                <div key={item.month} className="flex items-center justify-between text-xs p-1 rounded hover:bg-muted/30">
                  <span className="font-bold text-foreground">{item.month}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-text-secondary">{item.present}/{item.total} Days</span>
                    <Badge variant="outline" className={`text-[10px] font-bold ${
                      item.percentage >= 75 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-red-700 bg-red-50 border-red-200"
                    }`}>
                      {item.percentage}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ZOHO REA FEATURE: What You Missed Today — Classwork & Events Digest */}
      <Card className="border-purple-primary/30 bg-purple-tint/15 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-primary" />
              <CardTitle className="text-base font-bold text-foreground">
                Missed Classwork & Events Digest (Keep Students Up to Date)
              </CardTitle>
            </div>
            <Badge className="bg-purple-primary text-white text-[10px]">
              Zoho Tracker Digest
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Automated catch-up packet compiled for your recent absence/leave days: study notes, homework assignments, and campus notices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Notes */}
            <div className="p-3 rounded-xl border border-border bg-surface space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <BookOpen className="h-4 w-4 text-purple-primary" />
                <span>Uploaded Lesson Notes</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="p-2 rounded bg-muted/40 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Quadratic Equations (Pt. 2)</p>
                    <p className="text-[10px] text-text-secondary">Math • Unit 4 Notes</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-purple-primary">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="p-2 rounded bg-muted/40 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Cell Respiration & ATP</p>
                    <p className="text-[10px] text-text-secondary">Science • Slide Deck</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-purple-primary">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Assignments */}
            <div className="p-3 rounded-xl border border-border bg-surface space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <FileText className="h-4 w-4 text-amber-600" />
                <span>Homework Given</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="p-2 rounded bg-muted/40 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Ex 4.2 Problem Set #1-15</p>
                    <p className="text-[10px] text-amber-700 font-semibold">Due: Tomorrow (27 Oct)</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-amber-300 bg-amber-50 text-amber-800">
                    Pending
                  </Badge>
                </div>
                <div className="p-2 rounded bg-muted/40 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">English Grammar Worksheet</p>
                    <p className="text-[10px] text-text-secondary">Due: 29 Oct 2026</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Homework
                  </Badge>
                </div>
              </div>
            </div>

            {/* Announcements */}
            <div className="p-3 rounded-xl border border-border bg-surface space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <Megaphone className="h-4 w-4 text-emerald-600" />
                <span>Campus Events & Notices</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="p-2 rounded bg-muted/40">
                  <p className="font-semibold text-foreground">Annual Sports Day Auditions</p>
                  <p className="text-[10px] text-text-secondary">Track & Field trials scheduled for 28 Oct</p>
                </div>
                <div className="p-2 rounded bg-muted/40">
                  <p className="font-semibold text-foreground">Karnataka Rajyotsava Special Assembly</p>
                  <p className="text-[10px] text-text-secondary">Cultural dress code announced for Friday</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
