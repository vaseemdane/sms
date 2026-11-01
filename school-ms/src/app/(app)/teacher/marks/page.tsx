"use client";

import React, { useState, useMemo } from "react";
import { useSMSStore, SectionEntity, StoredUser, StudentExamMark } from "@/context/sms-store";
import { useAuth } from "@/services/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Award,
  Lock,
  Save,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";

export default function TeacherMarksEntryPage() {
  const { user } = useAuth();
  const {
    sections,
    students,
    examMarks,
    getTeacherAssignedSections,
    getTeacherAssignedSubjects,
    submitExamMarks,
    saveExamMarkDraft,
    recordTeacherAudit,
  } = useSMSStore();

  const teacherId = user?.id || "";

  // Authorized assignments
  const assignedSections: SectionEntity[] = useMemo(() => getTeacherAssignedSections(teacherId), [getTeacherAssignedSections, teacherId]);
  const assignedSubjects: string[] = useMemo(() => getTeacherAssignedSubjects(teacherId), [getTeacherAssignedSubjects, teacherId]);

  // Dropdown states
  const [selectedSectionId, setSelectedSectionId] = useState<string>(() =>
    assignedSections.length > 0 ? assignedSections[0].id : ""
  );
  const [selectedSubject, setSelectedSubject] = useState<string>(() =>
    assignedSubjects.length > 0 ? assignedSubjects[0] : "Mathematics"
  );
  const [selectedExamName, setSelectedExamName] = useState<string>("Mid-Term Examination");

  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Active records
  const activeSection = useMemo(() => sections.find((s: SectionEntity) => s.id === selectedSectionId), [sections, selectedSectionId]);
  const maxMarks = 100;

  // Enrolled students in selected section
  const sectionStudents = useMemo(() => {
    if (!selectedSectionId) return [];
    return students
      .filter((s: StoredUser) => s.classSectionId === selectedSectionId && s.active !== false)
      .sort((a, b) => (a.rollNo || "").localeCompare(b.rollNo || ""));
  }, [students, selectedSectionId]);

  // Existing marks in store for this combination
  const existingMarksMap = useMemo(() => {
    const map: Record<string, StudentExamMark> = {};
    examMarks
      .filter((m) => m.examName === selectedExamName && m.subject === selectedSubject)
      .forEach((m) => {
        map[m.studentId] = m;
      });
    return map;
  }, [examMarks, selectedExamName, selectedSubject]);

  // Local draft scores
  const [draftScores, setDraftScores] = useState<Record<string, { score: string; remarks: string }>>({});

  React.useEffect(() => {
    const nextDraft: Record<string, { score: string; remarks: string }> = {};
    sectionStudents.forEach((st) => {
      const existing = existingMarksMap[st.id];
      nextDraft[st.id] = {
        score: existing !== undefined ? String(existing.totalScore) : "",
        remarks: existing?.teacherRemark || "",
      };
    });
    setDraftScores(nextDraft);
  }, [sectionStudents, existingMarksMap]);

  if (assignedSubjects.length === 0 || assignedSections.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Marks & Examination Entry</h1>
        <Card className="border-dashed py-12 text-center">
          <CardContent className="space-y-2">
            <Award className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
            <p className="font-semibold text-muted-foreground">No assigned subjects or classes found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleScoreChange = (studentId: string, val: string) => {
    const num = Number(val);
    if (val !== "" && (isNaN(num) || num < 0 || num > maxMarks)) {
      return; // prevent invalid marks > 100
    }
    setDraftScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        score: val,
      },
    }));
  };

  const handleRemarksChange = (studentId: string, val: string) => {
    setDraftScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks: val,
      },
    }));
  };

  const handleSaveMarks = (shouldLock: boolean) => {
    const marksPayload: StudentExamMark[] = sectionStudents.map((st) => {
      const entry = draftScores[st.id];
      const marksVal = entry?.score !== "" && entry?.score !== undefined ? Number(entry.score) : 0;
      const status: "Distinction" | "Passed" | "Needs Improvement" =
        marksVal >= 75 ? "Distinction" : marksVal >= 35 ? "Passed" : "Needs Improvement";
      const grade = marksVal >= 90 ? "A+" : marksVal >= 80 ? "A" : marksVal >= 70 ? "B" : marksVal >= 50 ? "C" : marksVal >= 35 ? "D" : "F";

      return {
        id: existingMarksMap[st.id]?.id || `mark-${Date.now()}-${st.id}`,
        studentId: st.id,
        academicYear: "2026-2027",
        term: 1 as const,
        examName: selectedExamName,
        subject: selectedSubject,
        testScore: Math.round(marksVal * 0.3),
        examScore: Math.round(marksVal * 0.7),
        totalScore: marksVal,
        maxScore: maxMarks,
        grade,
        gradePoint: Math.round((marksVal / 10) * 10) / 10,
        status,
        teacherRemark: entry?.remarks,
        publishedAt: shouldLock ? new Date().toISOString() : "",
      };
    });

    if (shouldLock) {
      submitExamMarks(marksPayload, teacherId);
    } else {
      marksPayload.forEach((m) => saveExamMarkDraft(m));
    }

    recordTeacherAudit({
      teacherId,
      teacherName: user?.name || "Teacher",
      action: shouldLock ? "MARKS_SUBMITTED" : "MARKS_ENTERED",
      targetType: "EXAM_MARKS",
      details: `${shouldLock ? "Submitted & Finalized" : "Saved draft"} marks for ${selectedSubject} in ${activeSection?.code || activeSection?.name} (${marksPayload.length} students)`,
    });

    setNotification({
      type: "success",
      text: shouldLock ? "Marks finalized and locked for publication." : "Marks draft saved successfully.",
    });

    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Examinations Mark Entry</h1>
          <p className="text-sm text-muted-foreground">
            Enter, validate, and officially submit examination scores for your authorized subjects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => handleSaveMarks(false)} className="gap-1.5">
            <Save className="h-4 w-4" /> Save Draft
          </Button>
          <Button size="sm" onClick={() => handleSaveMarks(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            <Lock className="h-4 w-4" /> Submit & Finalize
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-3 rounded-md text-xs flex items-center gap-2 ${
            notification.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
              : "bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" /> {notification.text}
        </div>
      )}

      {/* Filter Matrix (Authorized Subject & Class only) */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Target Examination</label>
            <select
              value={selectedExamName}
              onChange={(e) => setSelectedExamName(e.target.value)}
              className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 font-semibold"
            >
              <option value="Mid-Term Examination">Mid-Term Examination (Term 1)</option>
              <option value="Periodic Assessment 1">Periodic Assessment 1</option>
              <option value="Annual Board Examination">Annual Board Examination</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Assigned Subject</label>
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

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Assigned Class Arm</label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 font-semibold"
            >
              {assignedSections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.className} - Section {sec.code}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Marks Table */}
      <Card>
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              Score Register: {selectedSubject} • {activeSection?.className} {activeSection?.code}
            </CardTitle>
            <CardDescription className="text-xs">
              Maximum allowable marks: 100. Values automatically checked against boundary rules.
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {sectionStudents.length} Students Enrolled
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="p-3 font-semibold text-muted-foreground w-16">Roll #</th>
                  <th className="p-3 font-semibold text-muted-foreground">Student Name</th>
                  <th className="p-3 font-semibold text-muted-foreground w-28">Max Marks</th>
                  <th className="p-3 font-semibold text-muted-foreground w-36">Obtained Marks</th>
                  <th className="p-3 font-semibold text-muted-foreground">Teacher Remarks</th>
                  <th className="p-3 font-semibold text-muted-foreground w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sectionStudents.map((st) => {
                  const entry = draftScores[st.id] || { score: "", remarks: "" };
                  const numScore = Number(entry.score);
                  const isFail = entry.score !== "" && numScore < 35;

                  return (
                    <tr key={st.id} className="hover:bg-muted/20">
                      <td className="p-3 font-mono font-bold">{st.rollNo || "•"}</td>
                      <td className="p-3 font-semibold text-foreground">
                        {st.name}
                        <div className="text-[11px] text-muted-foreground font-mono">{st.admissionNo}</div>
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">100</td>
                      <td className="p-3">
                        <Input
                          type="number"
                          placeholder="0-100"
                          value={entry.score}
                          onChange={(e) => handleScoreChange(st.id, e.target.value)}
                          className={`h-8 text-xs font-mono font-bold w-28 ${
                            isFail ? "border-rose-500 text-rose-600 bg-rose-50/50" : ""
                          }`}
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          placeholder="Optional feedback..."
                          value={entry.remarks}
                          onChange={(e) => handleRemarksChange(st.id, e.target.value)}
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="p-3">
                        {existingMarksMap[st.id]?.publishedAt ? (
                          <span className="text-[10px] text-emerald-600 font-bold uppercase flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Finalized
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">Draft</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
