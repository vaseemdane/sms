"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  ArrowLeft,
  User,
  Award,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MapPin,
  Clock,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSMSStore } from "@/context/sms-store";
import { useAuth } from "@/services/auth-context";
import { AcademicYearSelector } from "@/components/student/academic-year-selector";

export default function StudentSubjectsPage() {
  const { user } = useAuth();
  const {
    teachers,
    getStudentMarks,
    getStudentAcademicYears,
  } = useSMSStore();

  const studentId = user?.id || "usr-student-1";
  const availableYears = getStudentAcademicYears(studentId);
  const [selectedYear, setSelectedYear] = React.useState<string>(
    availableYears[0] || "2026-2027"
  );

  const marks = getStudentMarks(studentId, selectedYear);

  // Map teachers and rooms to subjects
  const subjectFacultyMap: Record<string, { teacher: string; room: string; type: string; code: string }> = {
    "Mathematics": { teacher: "Sri. Chandrashekar Gowda", room: "Room 204", type: "Core Subject", code: "MATH101" },
    "Science": { teacher: "Sri. Basavaraj Patil", room: "Science Lab 1", type: "Core Subject", code: "SCI101" },
    "English Language": { teacher: "Dr. Ramesh Deshmukh", room: "Room 204", type: "Language Core", code: "ENG101" },
    "Kannada": { teacher: "Smt. Vidya Kulkarni", room: "Room 204", type: "Regional Language", code: "KAN101" },
    "Social Science": { teacher: "Sri. Suresh Bhat", room: "Room 204", type: "Core Subject", code: "SST101" },
    "Computer Science": { teacher: "Sri. Anand Kumar", room: "Computer Lab", type: "Vocational / IT", code: "CS101" },
  };

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
            <span className="font-semibold text-foreground">Enrolled Subjects</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-purple-primary" />
            My Enrolled Subjects & Faculty
          </h1>
          <p className="text-xs text-text-secondary">
            Curriculum arm subjects, assigned faculty educators, room allocations, and current standing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <AcademicYearSelector
            years={availableYears}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
        </div>
      </div>

      {/* Grid of Subjects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {marks.map((m) => {
          const meta = subjectFacultyMap[m.subject] || {
            teacher: "Assigned Faculty",
            room: "Room 204",
            type: "Core Subject",
            code: "GEN101",
          };

          const isExcellent = m.totalScore >= 85;
          const isGood = m.totalScore >= 75 && m.totalScore < 85;

          return (
            <Card
              key={m.id}
              className="border-border/80 bg-surface shadow-2xs hover:border-purple-primary/40 transition-all flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {meta.code}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] font-bold ${
                      isExcellent
                        ? "bg-emerald-50 text-emerald-700"
                        : isGood
                        ? "bg-purple-tint text-purple-primary"
                        : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {isExcellent ? "Excellent" : isGood ? "Good" : "Needs Attention"}
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold text-foreground pt-1">
                  {m.subject}
                </CardTitle>
                <CardDescription className="text-xs">
                  {meta.type} • {meta.room}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Faculty details */}
                <div className="p-3 rounded-xl bg-muted/30 border border-border/80 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-purple-tint text-purple-primary flex items-center justify-center font-bold text-xs shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-text-secondary uppercase font-semibold">Faculty Guide</p>
                    <p className="text-xs font-bold text-foreground truncate">{meta.teacher}</p>
                  </div>
                </div>

                {/* Score Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-medium text-text-secondary">Current Score:</span>
                    <span className="font-extrabold text-foreground text-sm">
                      {m.totalScore}% <span className="text-purple-primary text-xs">(Grade {m.grade})</span>
                    </span>
                  </div>
                  <Progress value={m.totalScore} className="h-2" />
                  <div className="flex items-center justify-between text-[11px] text-text-secondary">
                    <span>Theory: {m.examScore}/60</span>
                    <span>Internal: {m.testScore}/40</span>
                  </div>
                </div>

                {m.teacherRemark && (
                  <p className="text-[11px] text-text-secondary italic pt-2 border-t border-border/60">
                    "{m.teacherRemark}"
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
