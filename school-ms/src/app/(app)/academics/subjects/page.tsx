"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  BookOpen,
  UserCheck,
  Search,
  Check,
  Shield,
  Sparkles,
  RefreshCw,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/services/auth-context";

interface SubjectItem {
  id: string;
  classId: string;
  name: string;
  slug?: string;
  code?: string;
  isCore?: boolean;
  assignedTeacherId?: string;
  assignedTeacherName?: string;
}

interface ClassItem {
  id: string;
  name: string;
  sections?: { id: string; name: string; code: string }[];
}

interface TeacherItem {
  id: string;
  name: string;
  email: string;
  code?: string;
  department?: string;
  specialization?: string;
  subjectSpecialization?: string;
}

export default function SubjectsPage() {
  const { user } = useAuth();
  const isPrincipal = user?.userType === "principal";
  const isSuperAdmin = user?.userType === "super_admin" || user?.userType === "admin";
  const canManageSubjects = isPrincipal || isSuperAdmin;

  const [subjects, setSubjects] = React.useState<SubjectItem[]>([]);
  const [classes, setClasses] = React.useState<ClassItem[]>([]);
  const [teachers, setTeachers] = React.useState<TeacherItem[]>([]);
  const [selectedClassFilter, setSelectedClassFilter] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [toast, setToast] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [formName, setFormName] = React.useState("");
  const [formCode, setFormCode] = React.useState("");
  const [formClassId, setFormClassId] = React.useState("");
  const [formIsCore, setFormIsCore] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Assign Modal State
  const [assignModalOpen, setAssignModalOpen] = React.useState(false);
  const [selectedSubject, setSelectedSubject] = React.useState<SubjectItem | null>(null);
  const [assignSectionId, setAssignSectionId] = React.useState("");
  const [assignTeacherId, setAssignTeacherId] = React.useState("");
  const [isAssigning, setIsAssigning] = React.useState(false);

  const eligibleTeachers = React.useMemo(() => {
    if (!selectedSubject) return [];
    const sName = selectedSubject.name.toLowerCase().trim();
    const sSlug = (selectedSubject.slug || selectedSubject.name).toLowerCase().trim();
    return teachers.filter((t) => {
      const spec = (t.specialization || t.subjectSpecialization || "").toLowerCase().trim();
      const dept = (t.department || "").toLowerCase().trim();
      if (!spec && !dept) return false;
      return (
        spec.includes(sName) ||
        sName.includes(spec) ||
        dept.includes(sName) ||
        sName.includes(dept) ||
        spec.includes(sSlug)
      );
    });
  }, [selectedSubject, teachers]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [subsRes, clsRes, tchsRes] = await Promise.all([
        apiClient<{ success: boolean; data: SubjectItem[] }>("/academics/subjects"),
        apiClient<{ success: boolean; data: ClassItem[] }>("/academics/classes"),
        apiClient<{ success: boolean; data: { items: TeacherItem[] } }>("/admin/users?role=teacher&page_size=100"),
      ]);

      if (subsRes?.data) setSubjects(subsRes.data);
      if (clsRes?.data) {
        setClasses(clsRes.data);
        if (clsRes.data.length > 0 && !formClassId) {
          setFormClassId(clsRes.data[0].id);
        }
      }
      if (tchsRes?.data?.items) setTeachers(tchsRes.data.items);
    } catch {
      showToast("Failed to load live curriculum data.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    const targetClassId = formClassId || (classes.length > 0 ? classes[0].id : "cls-class10");
    setIsSubmitting(true);
    try {
      const code = formCode.trim() || `SUB-${formName.slice(0, 3).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;
      await apiClient.post("/academics/subjects", {
        classId: targetClassId,
        name: formName.trim(),
        code,
        isCore: formIsCore,
      });
      showToast(`Subject '${formName.trim()}' created by Principal authority!`);
      setCreateModalOpen(false);
      setFormName("");
      setFormCode("");
      await loadData();
    } catch (err: any) {
      showToast(err?.message || "Failed to create subject.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject || !assignSectionId || !assignTeacherId) return;
    setIsAssigning(true);
    try {
      await apiClient.post("/academics/assign/subject-teacher", {
        sectionId: assignSectionId,
        teacherId: assignTeacherId,
        subjectId: selectedSubject.id,
      });
      const t = teachers.find((tc) => tc.id === assignTeacherId);
      showToast(`Assigned ${t?.name || "Teacher"} to ${selectedSubject.name}!`);
      setAssignModalOpen(false);
      await loadData();
    } catch (err: any) {
      showToast(err?.message || "Failed to assign teacher.", "error");
    } finally {
      setIsAssigning(false);
    }
  };

  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(search.toLowerCase()));
    const matchesClass = selectedClassFilter === "all" || s.classId === selectedClassFilter;
    return matchesSearch && matchesClass;
  });

  const getClassName = (classId: string) => {
    const c = classes.find((cl) => cl.id === classId);
    return c?.name || classId;
  };

  const selectedClassObj = classes.find((c) => c.id === selectedSubject?.classId);
  const availableSections = selectedClassObj?.sections || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
      {/* Toast Feedback */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-3 rounded-lg shadow-lg border text-xs flex items-center gap-2 ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <Check className="h-4 w-4" />
          <span>{toast.text}</span>
        </div>
      )}

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
            <span className="font-semibold text-purple-primary">Curriculum</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Subjects & Faculty Allocation
          </h1>
          <p className="text-xs text-text-secondary">
            Principal Academic Authority: Manage curriculum subjects, custom offerings, and teacher assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="text-xs gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {canManageSubjects && (
            <Button
              onClick={() => {
                setCreateModalOpen(true);
              }}
              size="sm"
              className="gap-1.5 bg-purple-primary text-white hover:bg-purple-primary/90 text-xs shadow-sm"
            >
              <Plus className="h-4 w-4" />
              + Add Custom Subject
            </Button>
          )}
        </div>
      </div>

      {/* Authority Banner */}
      <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-lg text-xs flex items-start gap-2.5">
        <Shield className="h-4 w-4 text-purple-primary mt-0.5 shrink-0" />
        <div className="space-y-0.5 text-purple-900">
          <span className="font-bold">Principal Academic Governance & Separation of Duties</span>
          <p className="text-[11px] text-purple-800 leading-relaxed">
            Curriculum subjects and faculty subject assignments are established under School Principal authority. All custom subjects and faculty allocations automatically reflect in the Super Admin panel in real-time.
          </p>
        </div>
      </div>

      {/* Filter and Table Card */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-purple-primary" />
            Curriculum Subjects ({filteredSubjects.length})
          </CardTitle>

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
              <Input
                placeholder="Search subject or code..."
                className="pl-8 h-8 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject Title</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Assigned Faculty</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-xs text-text-secondary">
                    {loading ? "Loading curriculum subjects..." : "No subjects found matching criteria."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubjects.map((sub) => (
                  <TableRow key={sub.id} className="hover:bg-muted/30 text-xs">
                    <TableCell className="font-semibold text-foreground">
                      {sub.name}
                    </TableCell>

                    <TableCell className="text-text-secondary">
                      {getClassName(sub.classId)}
                    </TableCell>

                    <TableCell>
                      {sub.assignedTeacherName ? (
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{sub.assignedTeacherName}</span>
                        </div>
                      ) : (
                        <span className="text-text-secondary">Unassigned</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      {canManageSubjects && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] px-2 text-purple-primary border-purple-primary/30 hover:bg-purple-tint"
                          onClick={() => {
                            setSelectedSubject(sub);
                            setAssignSectionId("");
                            setAssignTeacherId(sub.assignedTeacherId || "");
                            setAssignModalOpen(true);
                          }}
                        >
                          Assign Teacher
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Custom Subject Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateSubject}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-primary" />
                Add Custom Subject (Principal Authority)
              </DialogTitle>
              <DialogDescription className="text-xs pt-1">
                Establish a new custom course subject for a designated class level. This will immediately be accessible in curriculum schedules and the Admin Panel.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="subName">Subject Title *</Label>
                <Input
                  id="subName"
                  required
                  placeholder="e.g. Sanskrit, Robotics, French, AI & Coding"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Class Level *</Label>
                <Select value={formClassId} onValueChange={setFormClassId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select Class Level" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="bg-purple-primary text-white">
                {isSubmitting ? "Creating..." : "Create Subject"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Teacher Dialog */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAssignTeacher}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-purple-primary" />
                Assign Subject Faculty
              </DialogTitle>
              <DialogDescription className="text-xs pt-1">
                Assign a qualified teacher to teach <strong>{selectedSubject?.name}</strong> for a cohort.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="space-y-1.5">
                <Label>Target Section Arm *</Label>
                <Select value={assignSectionId} onValueChange={setAssignSectionId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select section arm" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {availableSections.map((sec) => (
                      <SelectItem key={sec.id} value={sec.id} className="text-xs">
                        Section {sec.name} ({sec.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Assigned Faculty ({eligibleTeachers.length} department match{eligibleTeachers.length === 1 ? "" : "es"}) *</Label>
                <Select value={assignTeacherId} onValueChange={setAssignTeacherId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select teaching faculty" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {eligibleTeachers.length === 0 ? (
                      <SelectItem value="none" disabled className="text-xs text-muted-foreground">
                        No faculty with specialization in {selectedSubject?.name}
                      </SelectItem>
                    ) : (
                      eligibleTeachers.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">
                          {t.name} ({t.specialization || t.department || t.subjectSpecialization || "Faculty"})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setAssignModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!assignSectionId || !assignTeacherId || isAssigning}
                className="bg-purple-primary text-white"
              >
                {isAssigning ? "Assigning..." : "Confirm Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
