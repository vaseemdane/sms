"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Shield,
  BookOpen,
  Calendar,
  CheckCircle2,
  FileText,
  ClipboardList,
  Award,
  AlertTriangle,
  Clock,
  Plus,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useSMSStore, AttendanceStatus } from "@/context/sms-store";
import { useAuth } from "@/services/auth-context";

export default function TeacherClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sectionId = (params.id as string) || "";

  const { user } = useAuth();
  const teacherId = user?.id || "";

  const {
    sections,
    isAuthorizedForSection,
    isClassTeacherForSection,
    getStudentsBySection,
    getTeacherAssignments,
    getSectionAttendance,
    saveSectionAttendance,
    studyMaterials,
    assignments,
    getTimetableBySection,
  } = useSMSStore();

  const section = sections.find((s) => s.id === sectionId);
  const isAuthorized = isAuthorizedForSection(teacherId, sectionId);
  const isClassTeacher = isClassTeacherForSection(teacherId, sectionId);

  const teacherAssignments = getTeacherAssignments(teacherId).filter(
    (a) => a.sectionId === sectionId
  );
  const subjectsTaught = teacherAssignments
    .map((a) => a.subjectName)
    .filter(Boolean) as string[];

  const students = getStudentsBySection(sectionId);

  // Attendance state for Class Teacher
  const [selectedDate, setSelectedDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [attendanceDraft, setAttendanceDraft] = React.useState<Record<string, AttendanceStatus>>({});
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (sectionId && isClassTeacher) {
      const existing = getSectionAttendance(sectionId, selectedDate);
      if (Object.keys(existing).length > 0) {
        setAttendanceDraft(existing);
      } else {
        const def: Record<string, AttendanceStatus> = {};
        students.forEach((s) => {
          def[s.id] = "PRESENT";
        });
        setAttendanceDraft(def);
      }
    }
  }, [sectionId, selectedDate, students.length, isClassTeacher]);

  const handleStatusChange = (stId: string, status: AttendanceStatus) => {
    setAttendanceDraft((prev) => ({ ...prev, [stId]: status }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      updated[s.id] = status;
    });
    setAttendanceDraft(updated);
  };

  const handleSaveAttendance = () => {
    saveSectionAttendance(sectionId, selectedDate, attendanceDraft);
    setToastMsg(`Attendance saved successfully for ${section?.code} on ${selectedDate}`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Materials & assignments filtered to this class
  const classMaterials = studyMaterials.filter((m) =>
    m.targetSectionIds.includes(sectionId)
  );
  const classAssignments = assignments.filter((a) =>
    a.targetSectionIds.includes(sectionId)
  );

  // Timetable
  const timetable = section ? getTimetableBySection(section.id) : null;

  // ─── 403 FORBIDDEN / DATA ISOLATION SHIELD ──────────────────────────────
  if (!section || !isAuthorized) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="text-xs">
          <Link href="/teacher/classes">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back to My Classes
          </Link>
        </Button>

        <Card className="border-red-200 bg-red-50/30 shadow-sm max-w-2xl mx-auto">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-red-100 text-red-600 mx-auto flex items-center justify-center">
              <Shield className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">
                403 Forbidden — Access Denied
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed max-w-md mx-auto">
                Data isolation enforced: You are not assigned to Class {section?.code || sectionId} for Academic Year 2026–2027. You can only view and manage class arms explicitly assigned to your profile by the Super Admin.
              </p>
            </div>
            <Button asChild className="bg-purple-primary text-white text-xs">
              <Link href="/teacher/classes">Return to My Assigned Classes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* TOAST MESSAGE */}
      {toastMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOP NAV & BREADCRUMB */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="text-xs">
          <Link href="/teacher/classes">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back to My Classes
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          {isClassTeacher ? (
            <Badge className="bg-emerald-600 text-white font-bold text-xs px-3 py-1">
              Class Teacher Authority
            </Badge>
          ) : (
            <Badge variant="outline" className="border-purple-primary/40 text-purple-primary font-bold text-xs px-3 py-1">
              Subject Teacher — {subjectsTaught.join(", ") || "Subject Faculty"}
            </Badge>
          )}
        </div>
      </div>

      {/* CLASS OVERVIEW BANNER */}
      <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              Class {section.code}
            </h1>
            <Badge variant="secondary" className="text-xs">
              {section.className}
            </Badge>
          </div>
          <p className="text-xs text-text-secondary">
            {students.length} Enrolled Students • Karnataka SATS Verified • Academic Year 2026–2027
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link href="/teacher/materials">
              <FileText className="h-3.5 w-3.5 mr-1 text-blue-600" />
              Upload Material
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link href="/teacher/assignments">
              <ClipboardList className="h-3.5 w-3.5 mr-1 text-amber-600" />
              Create Assignment
            </Link>
          </Button>
          <Button asChild size="sm" className="bg-purple-primary text-white text-xs">
            <Link href="/teacher/marks">
              <Award className="h-3.5 w-3.5 mr-1" />
              Enter Marks
            </Link>
          </Button>
        </div>
      </div>

      {/* TABS VIEW */}
      <Tabs defaultValue="students" className="space-y-4">
        <TabsList className="bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="students" className="text-xs gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Students Roster ({students.length})
          </TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Attendance {isClassTeacher ? "(Desk)" : "(Locked)"}
          </TabsTrigger>
          <TabsTrigger value="materials" className="text-xs gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Study Materials ({classMaterials.length})
          </TabsTrigger>
          <TabsTrigger value="assignments" className="text-xs gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            Assignments ({classAssignments.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. STUDENTS ROSTER TAB */}
        <TabsContent value="students" className="space-y-4">
          <Card className="border-border/80 bg-surface shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-foreground">
                Class {section.code} Student Enrollment Roster
              </CardTitle>
              <CardDescription className="text-xs">
                Official Karnataka SATS registered students in this arm
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs text-text-secondary bg-muted/30">
                      <TableHead className="w-16">Roll No</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Karnataka SATS ID</TableHead>
                      <TableHead>District</TableHead>
                      <TableHead>Parent Name</TableHead>
                      <TableHead>Parent Contact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-xs text-text-secondary">
                          No students currently enrolled in this class arm.
                        </TableCell>
                      </TableRow>
                    ) : (
                      students.map((st) => (
                        <TableRow key={st.id} className="text-xs hover:bg-muted/30 transition-colors">
                          <TableCell className="font-mono font-bold">{st.rollNo || "--"}</TableCell>
                          <TableCell className="font-bold text-foreground">{st.name}</TableCell>
                          <TableCell className="font-mono text-[11px] text-text-secondary font-semibold">
                            {st.satsId}
                          </TableCell>
                          <TableCell className="text-text-secondary">{st.district}, KA</TableCell>
                          <TableCell className="text-text-secondary">{st.parentName || "--"}</TableCell>
                          <TableCell className="font-mono text-text-secondary">{st.parentPhone || "--"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. ATTENDANCE TAB */}
        <TabsContent value="attendance" className="space-y-4">
          {isClassTeacher ? (
            <Card className="border-emerald-200 bg-emerald-50/20 shadow-xs">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">
                      Roll-Call Attendance Desk — Class {section.code}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      You are the designated primary Class Teacher. Publish official daily attendance records.
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-36 h-8 text-xs bg-surface font-semibold"
                    />
                    <Button
                      onClick={() => handleMarkAll("PRESENT")}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs bg-surface text-emerald-700"
                    >
                      All Present
                    </Button>
                    <Button
                      onClick={handleSaveAttendance}
                      size="sm"
                      className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Save Roll Call
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto bg-surface border-t border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs text-text-secondary bg-muted/30">
                        <TableHead className="w-16">Roll No</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>SATS ID</TableHead>
                        <TableHead className="text-center w-64">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((st) => {
                        const status = attendanceDraft[st.id] || "PRESENT";

                        return (
                          <TableRow key={st.id} className="text-xs hover:bg-muted/30">
                            <TableCell className="font-mono font-bold">{st.rollNo || "--"}</TableCell>
                            <TableCell className="font-bold text-foreground">{st.name}</TableCell>
                            <TableCell className="font-mono text-[11px] text-text-secondary font-semibold">
                              {st.satsId}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(st.id, "PRESENT")}
                                  className={`px-2.5 py-1 rounded text-xs font-bold ${
                                    status === "PRESENT" ? "bg-emerald-600 text-white" : "bg-muted text-text-secondary hover:bg-emerald-50"
                                  }`}
                                >
                                  Present
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(st.id, "ABSENT")}
                                  className={`px-2.5 py-1 rounded text-xs font-bold ${
                                    status === "ABSENT" ? "bg-red-600 text-white" : "bg-muted text-text-secondary hover:bg-red-50"
                                  }`}
                                >
                                  Absent
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(st.id, "LATE")}
                                  className={`px-2.5 py-1 rounded text-xs font-bold ${
                                    status === "LATE" ? "bg-amber-500 text-white" : "bg-muted text-text-secondary hover:bg-amber-50"
                                  }`}
                                >
                                  Late
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/80 bg-surface shadow-xs">
              <CardContent className="p-8 text-center space-y-3">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-foreground">
                  Attendance Marking Locked (Subject Teacher Mode)
                </h3>
                <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
                  Daily roll call attendance for Class {section.code} is strictly managed by its designated Class Teacher. As a Subject Teacher for {subjectsTaught.join(", ")}, you have read-only access to academic rosters.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 3. STUDY MATERIALS TAB */}
        <TabsContent value="materials" className="space-y-4">
          <Card className="border-border/80 bg-surface shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Study Materials Allocated to Class {section.code}
                </CardTitle>
                <CardDescription className="text-xs">
                  Materials visible to students enrolled in this arm
                </CardDescription>
              </div>
              <Button asChild size="sm" className="bg-purple-primary text-white text-xs">
                <Link href="/teacher/materials">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Upload Material
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs text-text-secondary bg-muted/30">
                      <TableHead>Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Uploaded By</TableHead>
                      <TableHead>Target Arms</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Published Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classMaterials.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-xs text-text-secondary">
                          No study materials currently published for Class {section.code}.
                        </TableCell>
                      </TableRow>
                    ) : (
                      classMaterials.map((mat) => (
                        <TableRow key={mat.id} className="text-xs hover:bg-muted/30">
                          <TableCell className="font-bold text-foreground">{mat.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-purple-primary/40 text-purple-primary text-[10px]">
                              {mat.subject}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-text-secondary">{mat.teacherName}</TableCell>
                          <TableCell>
                            <span className="font-semibold text-foreground">
                              {mat.targetSectionCodes.join(", ")}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-text-secondary">
                            {mat.fileName} ({mat.fileSize})
                          </TableCell>
                          <TableCell className="text-text-secondary">
                            {new Date(mat.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. ASSIGNMENTS TAB */}
        <TabsContent value="assignments" className="space-y-4">
          <Card className="border-border/80 bg-surface shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Active Assignments for Class {section.code}
                </CardTitle>
                <CardDescription className="text-xs">
                  Homework &amp; coursework allocated to this class arm
                </CardDescription>
              </div>
              <Button asChild size="sm" className="bg-purple-primary text-white text-xs">
                <Link href="/teacher/assignments">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Create Assignment
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs text-text-secondary bg-muted/30">
                      <TableHead>Assignment Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Max Marks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classAssignments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-xs text-text-secondary">
                          No assignments currently published for Class {section.code}.
                        </TableCell>
                      </TableRow>
                    ) : (
                      classAssignments.map((asg) => (
                        <TableRow key={asg.id} className="text-xs hover:bg-muted/30">
                          <TableCell className="font-bold text-foreground">{asg.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-purple-primary/40 text-purple-primary text-[10px]">
                              {asg.subject}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-text-secondary">{asg.teacherName}</TableCell>
                          <TableCell className="font-mono text-amber-700 font-bold">{asg.dueDate}</TableCell>
                          <TableCell className="font-bold text-foreground">{asg.totalMarks} Marks</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
