"use client";

import * as React from "react";
import Link from "next/link";
import {
  TrendingUp,
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  FileText,
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
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSMSStore, StudentExamMark } from "@/context/sms-store";
import { useAuth } from "@/services/auth-context";
import { AcademicYearSelector } from "@/components/student/academic-year-selector";

export default function StudentPerformancePage() {
  const { user } = useAuth();
  const {
    getStudentMarks,
    getStudentAcademicYears,
    getStudentYearPerformance,
  } = useSMSStore();

  const studentId = user?.id || "usr-student-1";
  const availableYears = getStudentAcademicYears(studentId);
  const [selectedYear, setSelectedYear] = React.useState<string>(
    availableYears[0] || "2026-2027"
  );

  const [comparisonYear, setComparisonYear] = React.useState<string>(
    availableYears[1] || "2025-2026"
  );

  // Real Stored Data
  const currentMarks = getStudentMarks(studentId, selectedYear);
  const comparisonMarks = getStudentMarks(studentId, comparisonYear);
  const yearPerformances = getStudentYearPerformance(studentId);

  // Current year metrics
  const totalScore = currentMarks.reduce((sum, m) => sum + m.totalScore, 0);
  const maxScore = currentMarks.reduce((sum, m) => sum + m.maxScore, 0);
  const currentPercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const averageMarks = currentMarks.length > 0 ? Math.round(totalScore / currentMarks.length) : 0;

  // Comparison metrics
  const compTotal = comparisonMarks.reduce((sum, m) => sum + m.totalScore, 0);
  const compMax = comparisonMarks.reduce((sum, m) => sum + m.maxScore, 0);
  const compPercentage = compMax > 0 ? Math.round((compTotal / compMax) * 100) : 0;
  const compAverage = comparisonMarks.length > 0 ? Math.round(compTotal / comparisonMarks.length) : 0;

  const yearDiff = currentPercentage - compPercentage;

  // Grade calculation
  const getGradeInfo = (pct: number) => {
    if (pct >= 91) return { grade: "A1", label: "Outstanding", color: "text-emerald-700 bg-emerald-50 border-emerald-300" };
    if (pct >= 81) return { grade: "A2", label: "Excellent", color: "text-purple-primary bg-purple-tint border-purple-primary/30" };
    if (pct >= 71) return { grade: "B1", label: "Very Good", color: "text-blue-700 bg-blue-50 border-blue-300" };
    if (pct >= 61) return { grade: "B2", label: "Good", color: "text-cyan-700 bg-cyan-50 border-cyan-300" };
    if (pct >= 51) return { grade: "C1", label: "Fair", color: "text-amber-800 bg-amber-50 border-amber-300" };
    if (pct >= 41) return { grade: "C2", label: "Average", color: "text-orange-800 bg-orange-50 border-orange-300" };
    if (pct >= 33) return { grade: "D", label: "Pass", color: "text-amber-900 bg-amber-100 border-amber-400" };
    return { grade: "E", label: "Needs Improvement", color: "text-red-700 bg-red-50 border-red-300" };
  };

  const gradeInfo = getGradeInfo(currentPercentage);

  // Subject Ranking
  const sortedSubjects = React.useMemo(() => {
    return [...currentMarks].sort((a, b) => b.totalScore - a.totalScore);
  }, [currentMarks]);

  const topSubjects = sortedSubjects.slice(0, 2);
  const improvementSubjects = sortedSubjects.filter((s) => s.totalScore < 80);

  // Trend Chart Data
  const trendChartData = React.useMemo(() => {
    return [...yearPerformances].reverse().map((yp) => ({
      year: yp.year.replace("-", "–"),
      percentage: yp.percentage,
      average: yp.averageMarks,
    }));
  }, [yearPerformances]);

  // Subject Comparison Chart Data
  const subjectComparisonData = React.useMemo(() => {
    const subjectsMap = new Map<string, { current: number; comparison: number }>();

    currentMarks.forEach((m) => {
      subjectsMap.set(m.subject, { current: m.totalScore, comparison: 0 });
    });

    comparisonMarks.forEach((m) => {
      const existing = subjectsMap.get(m.subject);
      if (existing) {
        existing.comparison = m.totalScore;
      } else {
        subjectsMap.set(m.subject, { current: 0, comparison: m.totalScore });
      }
    });

    return Array.from(subjectsMap.entries()).map(([sub, scores]) => ({
      subject: sub.length > 10 ? sub.slice(0, 8) + "..." : sub,
      fullName: sub,
      [selectedYear.replace("-", "–")]: scores.current,
      [comparisonYear.replace("-", "–")]: scores.comparison,
      diff: scores.current - scores.comparison,
    }));
  }, [currentMarks, comparisonMarks, selectedYear, comparisonYear]);

  // Exam Diets for Exam-to-Exam Comparison
  const examsInYear = Array.from(new Set(currentMarks.map((m) => m.examName)));

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
      {/* Breadcrumb Header */}
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
            <span className="font-semibold text-purple-primary">My Academics</span>
            <span>/</span>
            <span className="font-semibold text-foreground">Performance Overview</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-purple-primary" />
            Academic Performance & Historical Growth
          </h1>
          <p className="text-xs text-text-secondary">
            Multi-year trajectory analysis, subject-wise diagnostics, and examination comparison for {user?.name}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <AcademicYearSelector
            years={availableYears}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
          <Button asChild size="sm" variant="lavender" className="text-xs">
            <Link href="/student/academics/report-card">
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Report Card
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/80 bg-surface shadow-2xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-text-secondary font-medium">Overall Percentage</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-foreground">{currentPercentage}%</span>
                <span className="text-xs font-bold text-purple-primary">AY {selectedYear.replace("-", "–")}</span>
              </div>
              <p className="text-[11px] text-text-secondary">
                Cumulative across all subjects
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-purple-tint text-purple-primary flex items-center justify-center font-bold text-lg shadow-xs">
              %
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-2xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-text-secondary font-medium">Average Marks</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-foreground">{averageMarks}</span>
                <span className="text-xs text-text-secondary">/ 100</span>
              </div>
              <p className="text-[11px] text-text-secondary">
                Total: {totalScore} / {maxScore}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <BookOpen className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-2xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-text-secondary font-medium">Performance Grade</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-foreground">{gradeInfo.grade}</span>
                <Badge variant="outline" className={`text-[10px] font-bold ${gradeInfo.color}`}>
                  {gradeInfo.label}
                </Badge>
              </div>
              <p className="text-[11px] text-text-secondary">
                Karnataka Board Grading Norms
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
              <Award className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-2xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-text-secondary font-medium">Year-over-Year Delta</p>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-3xl font-extrabold ${yearDiff >= 0 ? "text-emerald-600" : "text-amber-700"}`}>
                  {yearDiff >= 0 ? `+${yearDiff}%` : `${yearDiff}%`}
                </span>
                {yearDiff >= 0 ? (
                  <ArrowUpRight className="h-5 w-5 text-emerald-600 shrink-0" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-amber-700 shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-text-secondary">
                vs {comparisonYear.replace("-", "–")} ({compPercentage}%)
              </p>
            </div>
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-xs ${
              yearDiff >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-700"
            }`}>
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart Insight Banner */}
      <Card className="border-purple-primary/30 bg-purple-tint/30 shadow-2xs">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-primary text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-foreground">
                Verified Data Insight: {yearDiff >= 0 ? "Continuous Growth Observed" : "Adjustment Needed"}
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {yearDiff > 0
                  ? `Your overall performance has improved by ${yearDiff}% compared with academic year ${comparisonYear.replace("-", "–")}. Your strongest consistency is in ${topSubjects[0]?.subject || "Mathematics"}.`
                  : yearDiff < 0
                  ? `Your overall performance shows a ${Math.abs(yearDiff)}% dip compared with ${comparisonYear.replace("-", "–")}. Focused tutoring in ${improvementSubjects[0]?.subject || "Social Science"} is advised.`
                  : "Your performance trajectory has remained completely stable across academic cycles."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-text-secondary font-medium">Compare with:</span>
            <select
              value={comparisonYear}
              onChange={(e) => setComparisonYear(e.target.value)}
              className="text-xs font-bold h-8 px-2.5 rounded-lg border border-border bg-surface text-foreground shadow-2xs"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  AY {yr.replace("-", "–")}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Performance Analysis Views */}
      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList className="bg-muted/60 p-1 border border-border">
          <TabsTrigger value="trend" className="text-xs font-semibold gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Performance Trend
          </TabsTrigger>
          <TabsTrigger value="year-compare" className="text-xs font-semibold gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Current vs Previous Year
          </TabsTrigger>
          <TabsTrigger value="subjects" className="text-xs font-semibold gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Subject-Wise Breakdown
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Trend Over Time */}
        <TabsContent value="trend" className="space-y-6">
          <Card className="border-border/80 bg-surface shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-primary" />
                Historical Performance Trend (2024–25 to {selectedYear.replace("-", "–")})
              </CardTitle>
              <CardDescription className="text-xs">
                Aggregate percentage achieved across completed academic sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData} margin={{ top: 20, right: 30, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                      axisLine={{ stroke: "var(--color-border)" }}
                    />
                    <YAxis
                      domain={[50, 100]}
                      tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                      unit="%"
                      axisLine={false}
                      tickLine={false}
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
                      dot={{ r: 6, fill: "#8b5cf6", strokeWidth: 2, stroke: "#ffffff" }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Historical Summary Table */}
              <div className="border-t border-border pt-4">
                <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                  Session Performance Ledger
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {yearPerformances.map((yp) => (
                    <div
                      key={yp.year}
                      className={`p-3 rounded-xl border flex flex-col justify-between space-y-2 ${
                        yp.year === selectedYear
                          ? "bg-purple-tint/40 border-purple-primary/50 shadow-xs"
                          : "bg-surface border-border/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-foreground">
                          AY {yp.year.replace("-", "–")}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-bold">
                          Grade {yp.grade}
                        </Badge>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-extrabold text-foreground">{yp.percentage}%</span>
                        <span className="text-xs text-text-secondary">Avg: {yp.averageMarks}/100</span>
                      </div>
                      <p className="text-[10px] text-text-secondary">
                        {yp.examsCount} Exam Diet(s) • {yp.subjectsCount} Subjects
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Year-over-Year Comparison */}
        <TabsContent value="year-compare" className="space-y-6">
          <Card className="border-border/80 bg-surface shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-primary" />
                    Subject-Wise Comparison: AY {selectedYear.replace("-", "–")} vs AY {comparisonYear.replace("-", "–")}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Direct comparison of marks scored in each subject between academic sessions
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectComparisonData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
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
                      formatter={(val: any, name: any) => [`${val}%`, name]}
                      contentStyle={{
                        backgroundColor: "var(--color-surface)",
                        borderColor: "var(--color-border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Bar
                      dataKey={selectedYear.replace("-", "–")}
                      fill="#8b5cf6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey={comparisonYear.replace("-", "–")}
                      fill="#cbd5e1"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Delta breakdown table */}
              <div className="overflow-x-auto border-t border-border pt-3">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-text-secondary border-b border-border">
                      <th className="py-2 font-semibold">Subject</th>
                      <th className="py-2 text-center font-semibold">AY {comparisonYear.replace("-", "–")}</th>
                      <th className="py-2 text-center font-semibold">AY {selectedYear.replace("-", "–")}</th>
                      <th className="py-2 text-right font-semibold">Growth Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectComparisonData.map((item, idx) => (
                      <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 font-bold text-foreground">{item.fullName}</td>
                        <td className="py-2 text-center text-text-secondary">
                          {item[comparisonYear.replace("-", "–")] || "--"}%
                        </td>
                        <td className="py-2 text-center font-bold text-foreground">
                          {item[selectedYear.replace("-", "–")] || "--"}%
                        </td>
                        <td className="py-2 text-right">
                          <span className={`inline-flex items-center gap-1 font-bold ${
                            item.diff > 0 ? "text-emerald-600" : item.diff < 0 ? "text-amber-700" : "text-text-secondary"
                          }`}>
                            {item.diff > 0 ? `+${item.diff}%` : item.diff < 0 ? `${item.diff}%` : "0%"}
                            {item.diff > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : item.diff < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Detailed Subject Breakdown */}
        <TabsContent value="subjects" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentMarks.map((m) => {
              const info = getGradeInfo(m.totalScore);
              return (
                <Card key={m.id} className="border-border/80 bg-surface shadow-2xs">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-foreground">
                        {m.subject}
                      </CardTitle>
                      <Badge variant="outline" className={`text-[10px] font-bold ${info.color}`}>
                        Grade {m.grade} • {info.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-extrabold text-foreground">{m.totalScore}%</span>
                      <span className="text-xs text-text-secondary">
                        Theory: {m.examScore}/60 • Internal: {m.testScore}/40
                      </span>
                    </div>
                    <Progress value={m.totalScore} className="h-2" />
                    {m.teacherRemark && (
                      <p className="text-[11px] text-text-secondary italic pt-1 border-t border-border/60">
                        "{m.teacherRemark}"
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
