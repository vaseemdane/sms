"use client";

import * as React from "react";
import Link from "next/link";
import {
  ClipboardList,
  ArrowLeft,
  Calendar,
  Award,
  FileText,
  Printer,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Download,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSMSStore, StudentExamMark } from "@/context/sms-store";
import { useAuth } from "@/services/auth-context";
import { AcademicYearSelector } from "@/components/student/academic-year-selector";

export default function StudentExaminationsPage() {
  const { user } = useAuth();
  const { getStudentMarks, getStudentAcademicYears } = useSMSStore();

  const studentId = user?.id || "usr-student-1";
  const availableYears = getStudentAcademicYears(studentId);
  const [selectedYear, setSelectedYear] = React.useState<string>(
    availableYears[0] || "2026-2027"
  );

  const allMarks = getStudentMarks(studentId, selectedYear);
  const examNames = Array.from(new Set(allMarks.map((m) => m.examName)));

  const [selectedExam, setSelectedExam] = React.useState<string>(
    examNames[0] || "Mid-Term Examination"
  );

  // Update selected exam when year changes
  React.useEffect(() => {
    if (examNames.length > 0 && !examNames.includes(selectedExam)) {
      setSelectedExam(examNames[0]);
    }
  }, [selectedYear, examNames]);

  const examMarks = allMarks.filter((m) => m.examName === selectedExam);

  // Summary Metrics
  const totalScore = examMarks.reduce((sum, m) => sum + m.totalScore, 0);
  const maxScore = examMarks.reduce((sum, m) => sum + m.maxScore, 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const passedCount = examMarks.filter((m) => m.status !== "Needs Improvement").length;

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
            <span className="font-semibold text-purple-primary">My Academics</span>
            <span>/</span>
            <span className="font-semibold text-foreground">Examinations</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-purple-primary" />
            My Examination Results
          </h1>
          <p className="text-xs text-text-secondary">
            Official published term assessment marks, subject performance ledgers, and grading remarks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <AcademicYearSelector
            years={availableYears}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
          <Button asChild size="sm" className="bg-purple-primary hover:bg-purple-primary/90 text-white text-xs gap-1.5 shadow-sm">
            <Link href="/student/academics/report-card">
              <FileText className="h-3.5 w-3.5" />
              View Official Report Card
            </Link>
          </Button>
        </div>
      </div>

      {/* Exam Diet Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-text-secondary font-semibold shrink-0">Assessment Diet:</span>
        {examNames.length === 0 ? (
          <Badge variant="outline" className="text-xs">No exams published for this year</Badge>
        ) : (
          examNames.map((exam) => (
            <button
              key={exam}
              onClick={() => setSelectedExam(exam)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                selectedExam === exam
                  ? "bg-purple-primary text-white shadow-xs"
                  : "bg-surface border border-border text-text-secondary hover:bg-muted/40"
              }`}
            >
              {exam}
            </button>
          ))
        )}
      </div>

      {/* Aggregate Overview Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/80 bg-surface shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs text-text-secondary font-medium">Exam Aggregate</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-foreground">{totalScore}</span>
                <span className="text-xs text-text-secondary">/ {maxScore} Marks</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-tint text-purple-primary flex items-center justify-center font-bold shadow-xs">
              📊
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs text-text-secondary font-medium">Exam Percentage</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-purple-primary">{percentage}%</span>
                <Badge variant="secondary" className="text-[10px] font-bold">
                  {percentage >= 75 ? "Distinction" : "Passed"}
                </Badge>
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-xs">
              🎯
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs text-text-secondary font-medium">Subjects Cleared</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-foreground">{passedCount} / {examMarks.length}</span>
                <span className="text-xs text-emerald-600 font-bold">100% Passed</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-xs">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Results Table */}
      <Card className="border-border/80 bg-surface shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                {selectedExam} — Marksheet Table
              </CardTitle>
              <CardDescription className="text-xs">
                Academic Year {selectedYear.replace("-", "–")} • Officially Published Results
              </CardDescription>
            </div>
            <Badge className="bg-emerald-600 text-white text-[10px]">
              Verified by School
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {examMarks.length === 0 ? (
            <div className="py-16 text-center text-xs text-text-secondary space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto text-amber-500 opacity-80" />
              <p className="font-semibold text-foreground">No examination results available yet.</p>
              <p>Your results will appear here once they are officially published by the school.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs text-text-secondary bg-muted/40">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-center w-28">Internal Assessment</TableHead>
                    <TableHead className="text-center w-28">Terminal Theory</TableHead>
                    <TableHead className="text-center w-28">Total Score</TableHead>
                    <TableHead className="text-center w-20">Percentage</TableHead>
                    <TableHead className="text-center w-20">Grade</TableHead>
                    <TableHead className="text-center w-28">Status</TableHead>
                    <TableHead className="min-w-[200px]">Faculty Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examMarks.map((mark, idx) => (
                    <TableRow key={mark.id} className="text-xs hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-text-secondary">{idx + 1}</TableCell>
                      <TableCell>
                        <span className="font-bold text-foreground">{mark.subject}</span>
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {mark.testScore} / 40
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {mark.examScore} / 60
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-foreground">
                        {mark.totalScore} / {mark.maxScore}
                      </TableCell>
                      <TableCell className="text-center font-bold text-purple-primary">
                        {mark.totalScore}%
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-bold text-[10px]">
                          {mark.grade}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className={`text-[9px] ${
                            mark.status === "Distinction"
                              ? "bg-purple-tint text-purple-primary"
                              : mark.status === "Passed"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-800"
                          }`}
                        >
                          {mark.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-text-secondary italic">
                        {mark.teacherRemark || "Good performance."}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-bold text-xs border-t-2 border-border">
                    <TableCell colSpan={4} className="text-right">
                      Grand Total & Cumulative Percentage:
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm text-foreground">
                      {totalScore} / {maxScore}
                    </TableCell>
                    <TableCell className="text-center text-sm text-purple-primary">
                      {percentage}%
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-purple-primary text-white text-[10px]">
                        Grade {percentage >= 81 ? "A2" : "B1"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-emerald-700">
                      Passed
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
