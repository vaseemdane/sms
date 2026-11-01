"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  Printer,
  ArrowLeft,
  Calendar,
  Award,
  CheckCircle2,
  Sparkles,
  Download,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useSMSStore } from "@/context/sms-store";
import { useAuth } from "@/services/auth-context";
import { AcademicYearSelector } from "@/components/student/academic-year-selector";

export default function StudentReportCardPage() {
  const { user } = useAuth();
  const {
    sections,
    getStudentMarks,
    getStudentAcademicYears,
    getStudentAttendanceSummary,
  } = useSMSStore();

  const studentId = user?.id || "usr-student-1";
  const studentSectionId = user?.classSectionId || "sec-6a";
  const studentSection = sections.find((s) => s.id === studentSectionId);

  const availableYears = getStudentAcademicYears(studentId);
  const [selectedYear, setSelectedYear] = React.useState<string>(
    availableYears[0] || "2026-2027"
  );

  const marks = getStudentMarks(studentId, selectedYear);
  const attendanceSummary = getStudentAttendanceSummary(studentId, studentSectionId, selectedYear);

  const totalScore = marks.reduce((sum, m) => sum + m.totalScore, 0);
  const maxScore = marks.reduce((sum, m) => sum + m.maxScore, 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  let overallGrade = "B1";
  let resultStatus = "PASSED";
  if (percentage >= 91) { overallGrade = "A1"; resultStatus = "PASSED WITH DISTINCTION"; }
  else if (percentage >= 81) { overallGrade = "A2"; resultStatus = "PASSED WITH DISTINCTION"; }
  else if (percentage >= 71) { overallGrade = "B1"; resultStatus = "PASSED (FIRST CLASS)"; }
  else if (percentage >= 61) { overallGrade = "B2"; resultStatus = "PASSED (SECOND CLASS)"; }
  else if (percentage >= 51) { overallGrade = "C1"; resultStatus = "PASSED"; }
  else if (percentage >= 41) { overallGrade = "C2"; resultStatus = "PASSED"; }
  else if (percentage >= 33) { overallGrade = "D"; resultStatus = "PASSED"; }
  else { overallGrade = "E"; resultStatus = "NEEDS IMPROVEMENT"; }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-text-secondary self-start">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <AcademicYearSelector
            years={availableYears}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
          <Button
            onClick={() => window.print()}
            size="sm"
            className="gap-2 bg-purple-primary text-white hover:bg-purple-primary/90 text-xs shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Print Official Marksheet
          </Button>
        </div>
      </div>

      {/* Official Report Card Printable Document */}
      <div className="border border-border bg-surface rounded-2xl shadow-lg p-3 sm:p-6 md:p-10 space-y-6 print:border-none print:shadow-none print:p-0">
        {/* School Header */}
        <div className="border-b-2 border-purple-primary pb-6 text-center space-y-2">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-purple-primary to-purple-soft text-white mx-auto shadow-md">
            <GraduationCap className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground uppercase">
              EduPulse Model Academy, Bengaluru
            </h2>
            <p className="text-xs text-text-secondary">
              Affiliated to Department of School Education, Karnataka • SATS Authorized Centre
            </p>
            <p className="text-[11px] font-mono text-purple-primary font-bold mt-1">
              ANNUAL COMPREHENSIVE STUDENT PROGRESS REPORT • AY {selectedYear.replace("-", "–")}
            </p>
          </div>
        </div>

        {/* Student Biodata Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/30 border border-border text-xs">
          <div>
            <p className="text-[10px] text-text-secondary uppercase font-semibold">Student Name</p>
            <p className="font-bold text-foreground text-sm">{user?.name || "Abhishek S. Patil"}</p>
          </div>
          <div>
            <p className="text-[10px] text-text-secondary uppercase font-semibold">Karnataka SATS ID</p>
            <p className="font-mono font-bold text-foreground">{user?.satsId || "KA-SATS-2024-88412"}</p>
          </div>
          <div>
            <p className="text-[10px] text-text-secondary uppercase font-semibold">Class & Section</p>
            <p className="font-bold text-foreground">{studentSection?.className} ({studentSection?.code})</p>
          </div>
          <div>
            <p className="text-[10px] text-text-secondary uppercase font-semibold">Roll Number</p>
            <p className="font-bold text-foreground font-mono">{user?.rollNo || "01"}</p>
          </div>
          <div>
            <p className="text-[10px] text-text-secondary uppercase font-semibold">Admission Number</p>
            <p className="font-bold text-foreground font-mono">{user?.admissionNo || "EDP/SEC/2024/001"}</p>
          </div>
          <div>
            <p className="text-[10px] text-text-secondary uppercase font-semibold">Parent / Guardian</p>
            <p className="font-bold text-foreground">{user?.parentName || "Parent / Guardian"}</p>
          </div>
          <div>
            <p className="text-[10px] text-text-secondary uppercase font-semibold">Academic Year</p>
            <p className="font-bold text-purple-primary">AY {selectedYear.replace("-", "–")}</p>
          </div>
          <div>
            <p className="text-[10px] text-text-secondary uppercase font-semibold">Attendance Record</p>
            <p className="font-bold text-emerald-700">{attendanceSummary.overallPercentage}% ({attendanceSummary.presentDays}/{attendanceSummary.totalWorkingDays} Days)</p>
          </div>
        </div>

        {/* Subjects & Marks Table */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Curricular Evaluation Matrix
          </h3>
          <div className="border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="text-xs text-text-secondary bg-muted/50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Subject Name</TableHead>
                  <TableHead className="text-center w-28">Continuous Internal (40)</TableHead>
                  <TableHead className="text-center w-28">Terminal Exam (60)</TableHead>
                  <TableHead className="text-center w-28">Total Score (100)</TableHead>
                  <TableHead className="text-center w-20">Grade</TableHead>
                  <TableHead className="text-center w-20">GP</TableHead>
                  <TableHead>Teacher Remark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-xs text-text-secondary">
                      No examination marks registered for AY {selectedYear.replace("-", "–")}.
                    </TableCell>
                  </TableRow>
                ) : (
                  marks.map((m, idx) => (
                    <TableRow key={m.id} className="text-xs">
                      <TableCell className="font-mono text-text-secondary">{idx + 1}</TableCell>
                      <TableCell className="font-bold text-foreground">{m.subject}</TableCell>
                      <TableCell className="text-center font-mono">{m.testScore}</TableCell>
                      <TableCell className="text-center font-mono">{m.examScore}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-foreground">{m.totalScore}</TableCell>
                      <TableCell className="text-center font-bold text-purple-primary">{m.grade}</TableCell>
                      <TableCell className="text-center font-mono">{m.gradePoint}</TableCell>
                      <TableCell className="text-text-secondary italic">{m.teacherRemark || "Good performance."}</TableCell>
                    </TableRow>
                  ))
                )}
                {/* Composite Footer */}
                {marks.length > 0 && (
                  <TableRow className="bg-muted/40 font-bold text-xs border-t-2 border-border">
                    <TableCell colSpan={4} className="text-right">
                      Cumulative Aggregate & Overall Percentage:
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm text-foreground">
                      {totalScore} / {maxScore}
                    </TableCell>
                    <TableCell className="text-center text-sm text-purple-primary">
                      {overallGrade}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {percentage}%
                    </TableCell>
                    <TableCell className="text-emerald-700 font-bold">
                      {resultStatus}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Remarks and Signatures */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border text-xs">
          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
            <p className="font-bold text-foreground">Class Teacher's Appraisal:</p>
            <p className="text-text-secondary italic">
              "Abhishek demonstrates exemplary academic discipline and analytical sharpness. Active participation in both STEM and language activities is commendable."
            </p>
            <p className="text-[10px] text-text-secondary font-semibold pt-2">
              Signed: Sri. Chandrashekar Gowda (Class Teacher, 6A)
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
            <p className="font-bold text-foreground">Principal's Endorsement:</p>
            <p className="text-text-secondary italic">
              "Promoted with Distinction to the next evaluation milestone. Maintain the excellent academic rigor and exemplary conduct."
            </p>
            <p className="text-[10px] text-text-secondary font-semibold pt-2">
              Signed: Dr. Vikramaditya Sharma (Principal)
            </p>
          </div>
        </div>

        {/* Footer verification note */}
        <div className="text-center text-[10px] text-text-secondary pt-2">
          This digital progress report is officially generated from the EduPulse School Management System and is legally valid across Karnataka State educational authorities.
        </div>
      </div>
    </div>
  );
}
