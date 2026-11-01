"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  ShieldCheck,
  ShieldAlert,
  Award,
  CheckCircle2,
  Lock,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MOCK_STUDENTS } from "@/mocks/users";
import { MOCK_MARKS, MOCK_EXAMS, MOCK_PINS } from "@/mocks/exams-and-fees";

function StudentReportCardContent() {
  const params = useParams();
  const studentId = (params?.id as string) || "std-1";

  const student =
    MOCK_STUDENTS.find((s) => s.id === studentId) || MOCK_STUDENTS[0];

  const exam = MOCK_EXAMS[1] || MOCK_EXAMS[0];
  const marks = student ? MOCK_MARKS.filter((m) => m.studentId === student.id) : [];

  // Scratch PIN Verification State
  const [pinInput, setPinInput] = React.useState("");
  const [pinVerified, setPinVerified] = React.useState(false);
  const [pinError, setPinError] = React.useState("");

  if (!student || !exam) {
    return (
      <div className="p-12 text-center space-y-3">
        <h2 className="text-base font-bold text-foreground">No Exam or Student Records Found</h2>
        <p className="text-xs text-text-secondary">All mock data purged. Provision student accounts and publish exams in the system.</p>
        <Button asChild size="sm" className="bg-purple-primary text-white text-xs">
          <Link href="/users">Go to User Provisioning</Link>
        </Button>
      </div>
    );
  }

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pinInput.trim();
    const matched = MOCK_PINS.find(
      (p) => p.code.toLowerCase() === cleanPin.toLowerCase()
    );

    if (matched && !matched.isExpired) {
      setPinVerified(true);
      setPinError("");
    } else {
      setPinError("Invalid or expired scratch card PIN. Please check card digits.");
    }
  };

  const totalScore = marks.reduce((sum, m) => sum + m.totalScore, 0);
  const maxScore = marks.length * 100;
  const percentage = marks.length > 0 ? (totalScore / maxScore) * 100 : 90;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between no-print">
        <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-text-secondary">
          <Link href={`/students/${student.id}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Student Profile
          </Link>
        </Button>

        {pinVerified && (
          <Button
            onClick={() => window.print()}
            size="sm"
            className="gap-2 bg-purple-primary text-white hover:bg-purple-primary/90"
          >
            <Printer className="h-4 w-4" />
            Print Official Marksheet
          </Button>
        )}
      </div>

      {/* Security Scratch-PIN Gating Screen */}
      {!pinVerified ? (
        <Card className="border-border shadow-lg max-w-lg mx-auto">
          <CardHeader className="text-center space-y-2 pb-4">
            <div className="h-14 w-14 rounded-2xl bg-purple-tint text-purple-primary mx-auto flex items-center justify-center shadow-sm">
              <Lock className="h-7 w-7" />
            </div>
            <CardTitle className="text-lg font-bold">
              Scratch Card PIN Verification Required
            </CardTitle>
            <CardDescription className="text-xs">
              Official assessment results for <strong>{student.user.name}</strong> ({exam.name}) are protected by PIN gating.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Enter 16-Digit Scratch Card PIN
                </label>
                <Input
                  placeholder="e.g. PIN-EDP-8849-2140"
                  className="font-mono text-center tracking-wider text-sm h-11"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  required
                />
                {pinError && (
                  <p className="text-xs text-destructive font-medium">{pinError}</p>
                )}
              </div>



              <Button
                type="submit"
                className="w-full bg-purple-primary text-white hover:bg-purple-primary/90 h-10 font-semibold text-xs"
              >
                Verify PIN & View Marksheet
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        /* Verified CBSE Official Terminal Report Card */
        <div className="space-y-6">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between no-print">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>PIN Verified Successfully: <strong className="font-mono">PIN-EDP-8849-2140</strong> (Usage 1 of 5)</span>
            </div>
            <Badge variant="success">Access Granted</Badge>
          </div>

          <Card className="border-2 border-border shadow-lg p-6 sm:p-10 bg-surface print:border-none print:shadow-none print:p-0">
            {/* School Header */}
            <div className="text-center border-b-2 border-border pb-6 space-y-1.5">
              <span className="text-[10px] font-bold tracking-widest text-purple-primary uppercase">
                Central Board of Secondary Education (CBSE)
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                DELHI PUBLIC ACADEMY
              </h2>
              <p className="text-xs text-text-secondary">
                Affiliation No: 2130492 · School Code: 70182 · Vasant Vihar, New Delhi - 110057
              </p>
              <div className="pt-2">
                <span className="inline-block px-4 py-1 rounded-full bg-purple-tint text-purple-primary text-xs font-bold uppercase tracking-wider border border-lavender">
                  Terminal Performance Marksheet · AY 2024–2025
                </span>
              </div>
            </div>

            {/* Student Particulars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-b border-border/80 text-xs">
              <div>
                <p className="text-text-secondary text-[10px] uppercase font-semibold">Student Name</p>
                <p className="font-bold text-foreground text-sm">{student.user.name}</p>
              </div>
              <div>
                <p className="text-text-secondary text-[10px] uppercase font-semibold">Admission No</p>
                <p className="font-mono font-bold text-purple-primary text-sm">{student.admNo}</p>
              </div>
              <div>
                <p className="text-text-secondary text-[10px] uppercase font-semibold">Standard & Section</p>
                <p className="font-bold text-foreground text-sm">
                  {student.myClass?.name} ({student.section?.name})
                </p>
              </div>
              <div>
                <p className="text-text-secondary text-[10px] uppercase font-semibold">Roll Number</p>
                <p className="font-mono font-bold text-foreground text-sm">{student.rollNo || "10A01"}</p>
              </div>
            </div>

            {/* Marks Table */}
            <div className="py-6">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-border">
                    <TableHead className="font-bold text-foreground">Subject Name</TableHead>
                    <TableHead className="text-center font-bold text-foreground">CA Score (40)</TableHead>
                    <TableHead className="text-center font-bold text-foreground">Terminal Exam (60)</TableHead>
                    <TableHead className="text-center font-bold text-foreground">Total (100)</TableHead>
                    <TableHead className="text-center font-bold text-foreground">Grade</TableHead>
                    <TableHead className="font-bold text-foreground">Teacher Remark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marks.map((m) => (
                    <TableRow key={m.id} className="border-b border-border/60">
                      <TableCell className="font-bold text-xs text-foreground">
                        {m.subject?.name}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">{m.testScore}</TableCell>
                      <TableCell className="text-center font-mono text-xs">{m.examScore}</TableCell>
                      <TableCell className="text-center font-mono text-xs font-extrabold text-purple-primary">
                        {m.totalScore}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {m.grade?.name || "A1"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-text-secondary italic">
                        &quot;{m.teacherRemark}&quot;
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Performance Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-warm-ivory/60 border border-border text-center text-xs">
              <div>
                <p className="text-[10px] text-text-secondary uppercase">Grand Total</p>
                <p className="text-lg font-bold text-foreground">{totalScore} / {maxScore}</p>
              </div>
              <div>
                <p className="text-[10px] text-text-secondary uppercase">Percentage</p>
                <p className="text-lg font-extrabold text-purple-primary">{percentage.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-[10px] text-text-secondary uppercase">Class Position</p>
                <p className="text-lg font-bold text-foreground">1st / 28</p>
              </div>
              <div>
                <p className="text-[10px] text-text-secondary uppercase">Attendance</p>
                <p className="text-lg font-bold text-emerald-600">96.4% (81/84 days)</p>
              </div>
            </div>

            {/* Teacher Remarks & Signatures */}
            <div className="pt-8 space-y-6">
              <div className="p-3 rounded-lg border border-border bg-surface text-xs space-y-1">
                <p className="font-bold text-foreground">Class Teacher Assessment:</p>
                <p className="text-text-secondary italic">
                  &quot;Aarav demonstrates stellar analytical abilities and exemplary discipline in class. Strongly encouraged for Olympiad preparation.&quot;
                </p>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-12 text-center text-xs">
                <div className="border-t border-border pt-2">
                  <p className="font-semibold text-foreground">Class Teacher Signature</p>
                  <p className="text-[10px] text-text-secondary">Rajesh Kulkarni, PGT</p>
                </div>
                <div className="border-t border-border pt-2">
                  <p className="font-semibold text-foreground">Official Seal</p>
                  <p className="text-[10px] text-text-secondary">Delhi Public Academy</p>
                </div>
                <div className="border-t border-border pt-2">
                  <p className="font-semibold text-foreground">Principal Signature</p>
                  <p className="text-[10px] text-text-secondary">Dr. V. Sharma, M.Sc. Ph.D.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function StudentReportCardPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-xs text-text-secondary">Loading marksheet...</div>}>
      <StudentReportCardContent />
    </React.Suspense>
  );
}
