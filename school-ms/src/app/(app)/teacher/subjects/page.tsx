"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useSMSStore, SectionEntity } from "@/context/sms-store";
import { useAuth } from "@/services/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, UploadCloud, PlusCircle, CheckCircle2, ArrowRight } from "lucide-react";

export default function TeacherSubjectsPage() {
  const { user } = useAuth();
  const {
    sections,
    students,
    getTeacherAssignedSubjects,
    getTeacherAssignments,
    studyMaterials,
    assignments,
  } = useSMSStore();

  const teacherId = user?.id || "";

  // Assigned subjects & assignments
  const assignedSubjectNames = useMemo(() => {
    return getTeacherAssignedSubjects(teacherId);
  }, [getTeacherAssignedSubjects, teacherId]);

  const teacherAssignments = useMemo(() => {
    return getTeacherAssignments(teacherId);
  }, [getTeacherAssignments, teacherId]);

  const subjectCards = useMemo(() => {
    return assignedSubjectNames.map((subjName) => {
      const subjectAssocs = teacherAssignments.filter((a) => a.subjectName === subjName || a.subjectId === subjName);

      const mappedSections = subjectAssocs.map((assoc) => {
        const sec = sections.find((s: SectionEntity) => s.id === assoc.sectionId);
        const secStudents = students.filter((st) => st.classSectionId === assoc.sectionId && st.active !== false);
        return {
          assocId: assoc.id,
          sectionId: assoc.sectionId,
          sectionCode: sec?.code || assoc.sectionName || "Section",
          className: sec?.className || assoc.className || "Class",
          studentCount: secStudents.length,
          type: assoc.assignmentType,
        };
      });

      const totalStudents = mappedSections.reduce((acc, curr) => acc + curr.studentCount, 0);
      const materialsCount = studyMaterials.filter((m) => m.teacherId === teacherId && m.subject === subjName).length;
      const assignmentsCount = assignments.filter((a) => a.teacherId === teacherId && a.subject === subjName).length;

      return {
        id: subjName,
        name: subjName,
        sections: mappedSections,
        totalStudents,
        materialsCount,
        assignmentsCount,
      };
    });
  }, [assignedSubjectNames, teacherAssignments, sections, students, studyMaterials, assignments, teacherId]);

  if (subjectCards.length === 0) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">My Subjects</h1>
          <p className="text-sm text-muted-foreground">Curriculum disciplines assigned to your teaching profile</p>
        </div>
        <Card className="border-dashed py-12 text-center">
          <CardContent className="space-y-3">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <h3 className="font-semibold text-lg">No Subjects Assigned</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Super Admin has not assigned any subject courses to your account for the active academic cycle.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Subjects</h1>
          <p className="text-sm text-muted-foreground">
            Subject portfolios, curriculum resources, and section allocations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/teacher/materials">
            <Button size="sm" variant="outline" className="gap-1.5">
              <UploadCloud className="h-4 w-4" /> Upload Material
            </Button>
          </Link>
          <Link href="/teacher/assignments">
            <Button size="sm" className="gap-1.5">
              <PlusCircle className="h-4 w-4" /> Create Assignment
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid of Subjects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {subjectCards.map((subj) => (
          <Card key={subj.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-primary/10 text-primary">
                      <BookOpen className="h-5 w-5" />
                    </span>
                    <CardTitle className="text-xl">{subj.name}</CardTitle>
                  </div>
                  <CardDescription>Academic Year 2026–27</CardDescription>
                </div>
                <Badge variant="secondary" className="font-semibold text-xs">
                  {subj.sections.length} {subj.sections.length === 1 ? "Section" : "Sections"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-5">
              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-muted/40 rounded-lg text-center text-xs">
                <div>
                  <div className="text-muted-foreground">Total Students</div>
                  <div className="text-base font-bold mt-0.5">{subj.totalStudents}</div>
                </div>
                <div className="border-x border-border">
                  <div className="text-muted-foreground">Materials</div>
                  <div className="text-base font-bold mt-0.5">{subj.materialsCount}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Assignments</div>
                  <div className="text-base font-bold mt-0.5">{subj.assignmentsCount}</div>
                </div>
              </div>

              {/* Assigned Class Arms */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Allocated Class Arms
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {subj.sections.map((sec) => (
                    <div
                      key={sec.assocId}
                      className="flex items-center justify-between p-2.5 rounded-md border border-border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-sm flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          {sec.className} - {sec.sectionCode}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> {sec.studentCount} enrolled
                        </div>
                      </div>
                      <Link href={`/teacher/classes/${sec.sectionId}`}>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>

            <div className="p-4 pt-0 border-t mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>Academic Year 2026–27</span>
              <div className="flex gap-2">
                <Link href={`/teacher/marks?subject=${encodeURIComponent(subj.name)}`}>
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs font-medium text-primary">
                    Marks Entry →
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
