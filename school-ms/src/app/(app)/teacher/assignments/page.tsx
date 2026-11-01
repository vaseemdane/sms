"use client";

import React, { useState, useMemo } from "react";
import { useSMSStore, SectionEntity, StoredUser } from "@/context/sms-store";
import { useAuth } from "@/services/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileCheck2,
  PlusCircle,
  Calendar,
  Eye,
  Award,
  X,
} from "lucide-react";

export default function TeacherAssignmentsPage() {
  const { user } = useAuth();
  const {
    sections,
    students,
    assignments,
    submissions,
    getTeacherAssignedSections,
    getTeacherAssignedSubjects,
    createAssignment,
    gradeSubmission,
    recordTeacherAudit,
  } = useSMSStore();

  const teacherId = user?.id || "";

  // Authorized assignments
  const assignedSections: SectionEntity[] = useMemo(() => getTeacherAssignedSections(teacherId), [getTeacherAssignedSections, teacherId]);
  const assignedSubjects: string[] = useMemo(() => getTeacherAssignedSubjects(teacherId), [getTeacherAssignedSubjects, teacherId]);

  // Assignments created by this teacher
  const teacherAssignmentsList = useMemo(() => {
    return assignments.filter((a) => a.teacherId === teacherId);
  }, [assignments, teacherId]);

  // Create Assignment Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(() => (assignedSubjects.length > 0 ? assignedSubjects[0] : "Mathematics"));
  const [targetSectionIds, setTargetSectionIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("2026-10-31");
  const [totalMarks, setTotalMarks] = useState(25);
  const [modalError, setModalError] = useState("");

  // Submissions Grading Modal State
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(0);
  const [gradeFeedback, setGradeFeedback] = useState<string>("");

  const activeAssignment = useMemo(() => {
    return assignments.find((a) => a.id === activeAssignmentId);
  }, [assignments, activeAssignmentId]);

  const activeSubmissions = useMemo(() => {
    if (!activeAssignmentId) return [];
    return submissions.filter((s) => s.assignmentId === activeAssignmentId);
  }, [submissions, activeAssignmentId]);

  const toggleTargetSection = (secId: string) => {
    setTargetSectionIds((prev) =>
      prev.includes(secId) ? prev.filter((id) => id !== secId) : [...prev, secId]
    );
  };

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!title.trim()) {
      setModalError("Title is required.");
      return;
    }
    if (!selectedSubject) {
      setModalError("Subject is required.");
      return;
    }
    if (targetSectionIds.length === 0) {
      setModalError("Please select at least one authorized target class.");
      return;
    }

    const targetSectionCodes = targetSectionIds.map((id) => {
      const sec = sections.find((s: SectionEntity) => s.id === id);
      return sec?.code || id;
    });

    createAssignment({
      title: title.trim(),
      description: description.trim(),
      subject: selectedSubject,
      teacherId,
      teacherName: user?.name || "Teacher",
      targetSectionIds,
      targetSectionCodes,
      dueDate,
      totalMarks: Number(totalMarks) || 25,
      academicYear: "2026-2027",
    });

    recordTeacherAudit({
      teacherId,
      teacherName: user?.name || "Teacher",
      action: "ASSIGNMENT_CREATED",
      targetType: "ASSIGNMENT",
      details: `Created assignment "${title.trim()}" for ${targetSectionIds.length} class(es)`,
    });

    setIsCreateOpen(false);
    setTitle("");
    setDescription("");
    setTargetSectionIds([]);
  };

  const handleOpenGrading = (submission: typeof submissions[0]) => {
    setSelectedSubmissionId(submission.id);
    setGradeScore(submission.obtainedMarks || 0);
    setGradeFeedback(submission.feedback || "");
  };

  const handleSaveGrade = () => {
    if (!selectedSubmissionId) return;
    gradeSubmission(selectedSubmissionId, Number(gradeScore), gradeFeedback);
    setSelectedSubmissionId(null);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Assignments Desk</h1>
          <p className="text-sm text-muted-foreground">
            Create tasks, track submission milestones, and grade coursework for your assigned classes
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shrink-0">
          <PlusCircle className="h-4 w-4" /> Create Assignment
        </Button>
      </div>

      {/* Assignment Grid */}
      {teacherAssignmentsList.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
          <CardContent className="space-y-3">
            <FileCheck2 className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
            <h3 className="font-semibold text-base">No Assignments Created</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              You haven&apos;t created any assignments for your classes yet. Publish your first homework or coursework task.
            </p>
            <Button size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1.5">
              <PlusCircle className="h-4 w-4" /> New Assignment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teacherAssignmentsList.map((asgn) => {
            const asgnSubmissions = submissions.filter((s) => s.assignmentId === asgn.id);
            const submittedCount = asgnSubmissions.length;
            const gradedCount = asgnSubmissions.filter((s) => s.status === "GRADED").length;

            // Total students in target classes
            const totalTargetStudents = students.filter(
              (st: StoredUser) => asgn.targetSectionIds.includes(st.classSectionId || "") && st.active !== false
            ).length;

            const pendingCount = Math.max(0, totalTargetStudents - submittedCount);

            return (
              <Card key={asgn.id} className="flex flex-col justify-between hover:shadow-sm transition-shadow">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      {asgn.subject}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono text-emerald-600 border-emerald-500/30 bg-emerald-500/5"
                    >
                      Max: {asgn.totalMarks} pts
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold mt-2 leading-tight">{asgn.title}</CardTitle>
                  <CardDescription className="text-xs line-clamp-2 mt-1">
                    {asgn.description || "Coursework assignment"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-3">
                  {/* Submission Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-muted-foreground">Submissions Progress</span>
                      <span className="font-bold">
                        {submittedCount} / {totalTargetStudents} ({totalTargetStudents > 0 ? Math.round((submittedCount / totalTargetStudents) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${totalTargetStudents > 0 ? Math.min(100, (submittedCount / totalTargetStudents) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Submission breakdown metrics */}
                  <div className="grid grid-cols-3 gap-2 p-2 bg-muted/30 rounded text-center text-xs">
                    <div>
                      <div className="text-[10px] text-muted-foreground">Submitted</div>
                      <div className="font-bold text-emerald-600">{submittedCount}</div>
                    </div>
                    <div className="border-x border-border">
                      <div className="text-[10px] text-muted-foreground">Pending</div>
                      <div className="font-bold text-amber-600">{pendingCount}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Graded</div>
                      <div className="font-bold text-primary">{gradedCount}</div>
                    </div>
                  </div>

                  {/* Due Date */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <div className="flex items-center gap-1 font-mono text-[11px]">
                      <Calendar className="h-3.5 w-3.5" /> Due: {asgn.dueDate}
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {asgn.targetSectionIds.length} {asgn.targetSectionIds.length === 1 ? "Class" : "Classes"}
                    </Badge>
                  </div>
                </CardContent>

                <div className="p-4 pt-0 border-t mt-2 flex items-center justify-between">
                  <Button
                    onClick={() => setActiveAssignmentId(asgn.id)}
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5 text-xs font-semibold"
                  >
                    <Eye className="h-3.5 w-3.5" /> View & Grade Submissions ({submittedCount})
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Assignment Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card w-full max-w-lg rounded-xl shadow-xl border overflow-hidden">
            <div className="p-4 sm:p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Create New Assignment</h3>
                <p className="text-xs text-muted-foreground">Publish coursework to your authorized class arms</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="p-4 sm:p-5 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs rounded-md">
                  {modalError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Title *</label>
                <Input
                  required
                  placeholder="e.g. Problem Set 4: Quadratic Equations"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Subject *</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 font-semibold"
                  >
                    {assignedSubjects.map((sName) => (
                      <option key={sName} value={sName}>
                        {sName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Max Score (Marks) *</label>
                  <Input
                    type="number"
                    min={5}
                    max={100}
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(Number(e.target.value))}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Target Class Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold">Target Classes (Authorized Only) *</label>
                  <span className="text-[11px] text-muted-foreground">{targetSectionIds.length} selected</span>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border rounded-md bg-muted/20">
                  {assignedSections.map((sec: SectionEntity) => {
                    const isChecked = targetSectionIds.includes(sec.id);

                    return (
                      <label
                        key={sec.id}
                        className={`flex items-center gap-2 p-2 rounded border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-primary/10 border-primary text-primary font-semibold"
                            : "bg-background border-border hover:bg-muted/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTargetSection(sec.id)}
                          className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span>
                          {sec.className} - {sec.code}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Due Date *</label>
                <Input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Instructions & Guidelines</label>
                <textarea
                  rows={2}
                  placeholder="Submission instructions, word count, or required format..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="gap-1.5">
                  <PlusCircle className="h-4 w-4" /> Publish Assignment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submissions Review Modal */}
      {activeAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-lg">{activeAssignment.title}</h3>
                <p className="text-xs text-muted-foreground">
                  Submissions Roster (Max Marks: {activeAssignment.totalMarks})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAssignmentId(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {activeSubmissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  No submissions received yet from enrolled students.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {activeSubmissions.map((sub) => {
                    const st = students.find((s: StoredUser) => s.id === sub.studentId);
                    const isGraded = sub.status === "GRADED";

                    return (
                      <div key={sub.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-sm">
                            {st?.name || sub.studentName}
                          </div>
                          <div className="text-muted-foreground font-mono">
                            Roll #{st?.rollNo || "•"} • Section {sub.sectionCode} • Submitted: {sub.submittedAt ? sub.submittedAt.split("T")[0] : "Pending"}
                          </div>
                          {sub.feedback && (
                            <div className="text-emerald-600 font-medium italic mt-1">&quot;{sub.feedback}&quot;</div>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            {isGraded ? (
                              <Badge className="bg-emerald-600 text-white font-mono">
                                {sub.obtainedMarks} / {activeAssignment.totalMarks}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                                Pending Grade
                              </Badge>
                            )}
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleOpenGrading(sub)} className="h-7 text-xs">
                            <Award className="h-3.5 w-3.5 mr-1" /> {isGraded ? "Edit Grade" : "Grade"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Grading Input Drawer */}
              {selectedSubmissionId && (
                <div className="p-4 rounded-lg bg-muted/40 border space-y-3 mt-4">
                  <div className="font-semibold text-xs flex items-center justify-between">
                    <span>Grade Selected Student</span>
                    <button
                      type="button"
                      onClick={() => setSelectedSubmissionId(null)}
                      className="text-muted-foreground hover:text-foreground text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold">Score (Max: {activeAssignment.totalMarks})</label>
                      <Input
                        type="number"
                        min={0}
                        max={activeAssignment.totalMarks}
                        value={gradeScore}
                        onChange={(e) => setGradeScore(Number(e.target.value))}
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold">Teacher Feedback</label>
                      <Input
                        placeholder="e.g. Excellent solution structure"
                        value={gradeFeedback}
                        onChange={(e) => setGradeFeedback(e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                  <Button size="sm" onClick={handleSaveGrade} className="w-full text-xs h-8 mt-1">
                    Save Grade
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
