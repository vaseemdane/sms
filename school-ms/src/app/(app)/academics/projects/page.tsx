"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  GraduationCap,
  Layers,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Users,
  AlertCircle,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSMSStore } from "@/context/sms-store";
import { useAuth } from "@/services/auth-context";

interface Milestone {
  id: string;
  order: number;
  title: string;
  dueDate: string;
  isCompleted: boolean;
}

interface AcademicProjectItem {
  id: string;
  projectCode: string;
  title: string;
  type: "STUDENT_INDIVIDUAL" | "STUDENT_GROUP" | "FACULTY_RESEARCH" | "SCIENCE_EXHIBITION";
  classId: string;
  className: string;
  sectionName: string;
  subjectName: string;
  mentorName: string;
  studentNames: string[];
  abstractDescription: string;
  deadlineDate: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "UNDER_REVIEW" | "COMPLETED" | "OVERDUE";
  completionPercentage: number;
  milestones: Milestone[];
}

const INITIAL_PROJECTS: AcademicProjectItem[] = [
  {
    id: "prj-1",
    projectCode: "PRJ-2026-10A-0012",
    title: "Automated Solar Drip Irrigation Controller",
    type: "STUDENT_GROUP",
    classId: "cls-10",
    className: "Class 10",
    sectionName: "10-A",
    subjectName: "Physics & Electronics",
    mentorName: "Mrs. Kavitha R.",
    studentNames: ["Chetan M. Kulkarni", "Aarav Sharma", "Pooja Hegde"],
    abstractDescription: "IoT soil moisture sensing circuit linked with solar battery storage for precision water delivery in arid fields.",
    deadlineDate: "2026-11-05",
    status: "IN_PROGRESS",
    completionPercentage: 75,
    milestones: [
      { id: "m1", order: 1, title: "Sensor Circuit Prototype", dueDate: "2026-10-15", isCompleted: true },
      { id: "m2", order: 2, title: "Solar Power Bench Test", dueDate: "2026-10-22", isCompleted: true },
      { id: "m3", order: 3, title: "Field Calibration Run", dueDate: "2026-10-30", isCompleted: true },
      { id: "m4", order: 4, title: "Final Documentation & Video", dueDate: "2026-11-05", isCompleted: false },
    ],
  },
  {
    id: "prj-2",
    projectCode: "PRJ-2026-12S-0004",
    title: "Bio-Plastic Synthesis from Banana Pseudostem",
    type: "STUDENT_INDIVIDUAL",
    classId: "cls-12",
    className: "Class 12",
    sectionName: "12-Sci",
    subjectName: "Chemistry",
    mentorName: "Dr. Suresh Patil",
    studentNames: ["Ananya Deshmukh"],
    abstractDescription: "Cellulose extraction from agricultural waste banana stems to yield biodegradable packaging polymers.",
    deadlineDate: "2026-11-12",
    status: "UNDER_REVIEW",
    completionPercentage: 90,
    milestones: [
      { id: "m5", order: 1, title: "Cellulose Bleaching & Acetylation", dueDate: "2026-10-10", isCompleted: true },
      { id: "m6", order: 2, title: "Tensile Strength Testing", dueDate: "2026-10-25", isCompleted: true },
      { id: "m7", order: 3, title: "Biodegradability Soil Assay", dueDate: "2026-11-10", isCompleted: true },
    ],
  },
  {
    id: "prj-3",
    projectCode: "PRJ-2026-FAC-0001",
    title: "AI-Assisted Diagnostic Assessment for Primary Numeracy",
    type: "FACULTY_RESEARCH",
    classId: "cls-all",
    className: "Primary Wing",
    sectionName: "All Arms",
    subjectName: "Pedagogy & Math",
    mentorName: "Mr. Ramesh Kumar",
    studentNames: ["Faculty Action Research"],
    abstractDescription: "Empirical study on multi-sensory numeracy interventions across 120 Grade 1-3 learners over 6 months.",
    deadlineDate: "2026-12-15",
    status: "IN_PROGRESS",
    completionPercentage: 50,
    milestones: [
      { id: "m8", order: 1, title: "Pre-Assessment Baseline Metric", dueDate: "2026-09-15", isCompleted: true },
      { id: "m9", order: 2, title: "Mid-Term Cohort Comparative Review", dueDate: "2026-11-01", isCompleted: false },
      { id: "m10", order: 3, title: "Final Outcome Tabulation", dueDate: "2026-12-15", isCompleted: false },
    ],
  },
  {
    id: "prj-4",
    projectCode: "PRJ-2026-9B-0008",
    title: "Smart Rainwater Harvesting & Greywater Recycling Matrix",
    type: "SCIENCE_EXHIBITION",
    classId: "cls-9",
    className: "Class 9",
    sectionName: "9-B",
    subjectName: "Environmental Science",
    mentorName: "Ms. Anita V.",
    studentNames: ["Kiran Kumar", "Vivek Nayak"],
    abstractDescription: "Model campus drainage grid that captures 90% of monsoon roof-runoff into subterranean recharge wells.",
    deadlineDate: "2026-10-28",
    status: "OVERDUE",
    completionPercentage: 40,
    milestones: [
      { id: "m11", order: 1, title: "Hydraulic Calculation Report", dueDate: "2026-10-10", isCompleted: true },
      { id: "m12", order: 2, title: "Physical Scale Demonstration Model", dueDate: "2026-10-25", isCompleted: false },
    ],
  },
];

export default function AcademicProjectsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.userType === "super_admin";
  const { teachers } = useSMSStore();

  const [projects, setProjects] = useState<AcademicProjectItem[]>(INITIAL_PROJECTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const [toast, setToast] = useState<string | null>(null);
  const [newProjectModal, setNewProjectModal] = useState(false);

  // New Project Form State
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<AcademicProjectItem["type"]>("STUDENT_INDIVIDUAL");
  const [formClass, setFormClass] = useState("Class 10 (10-A)");
  const [formSubject, setFormSubject] = useState("Physics");
  const [formMentor, setFormMentor] = useState("Mrs. Kavitha R.");
  const [formStudents, setFormStudents] = useState("");
  const [formDeadline, setFormDeadline] = useState("2026-11-30");
  const [formAbstract, setFormAbstract] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // 1-Click Status Mutation
  const handleStatusChange = (projectId: string, newStatus: AcademicProjectItem["status"]) => {
    if (isSuperAdmin) {
      showToast("Super Admin has Read-Only view. Only Principal or Mentor can evaluate projects.");
      return;
    }
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const newPct =
            newStatus === "COMPLETED"
              ? 100
              : newStatus === "UNDER_REVIEW"
              ? 90
              : newStatus === "IN_PROGRESS"
              ? Math.max(p.completionPercentage, 50)
              : p.completionPercentage;
          return { ...p, status: newStatus, completionPercentage: newPct };
        }
        return p;
      })
    );
    showToast(`Project status updated to ${newStatus.replace("_", " ")}`);
  };

  // Nudge Team
  const handleNudge = (project: AcademicProjectItem) => {
    showToast(`🔔 Automated follow-up reminder sent to ${project.studentNames.join(", ")} & ${project.mentorName}`);
  };

  // Create Project
  const handleCreateProject = () => {
    if (!formTitle.trim()) return;

    const newPrj: AcademicProjectItem = {
      id: `prj-${Date.now()}`,
      projectCode: `PRJ-2026-${formClass.includes("10") ? "10A" : "GEN"}-${Math.floor(1000 + Math.random() * 9000)}`,
      title: formTitle,
      type: formType,
      classId: "cls-custom",
      className: formClass.split(" ")[0],
      sectionName: formClass,
      subjectName: formSubject,
      mentorName: formMentor,
      studentNames: formStudents.split(",").map((s) => s.trim()).filter(Boolean),
      abstractDescription: formAbstract || "Academic investigation and research capstone.",
      deadlineDate: formDeadline,
      status: "NOT_STARTED",
      completionPercentage: 0,
      milestones: [
        { id: `m-${Date.now()}-1`, order: 1, title: "Literature Survey & Objective Formulation", dueDate: formDeadline, isCompleted: false },
        { id: `m-${Date.now()}-2`, order: 2, title: "Experimentation & Prototype Assembly", dueDate: formDeadline, isCompleted: false },
        { id: `m-${Date.now()}-3`, order: 3, title: "Final Report & Viva Evaluation", dueDate: formDeadline, isCompleted: false },
      ],
    };

    setProjects((prev) => [newPrj, ...prev]);
    setNewProjectModal(false);
    showToast(`Project '${formTitle}' created successfully!`);
    setFormTitle("");
    setFormAbstract("");
    setFormStudents("");
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.projectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.studentNames.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    const matchesType = typeFilter === "ALL" || p.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6 pb-12">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Button asChild variant="ghost" size="sm" className="h-7 px-2">
              <Link href="/dashboard">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Dashboard
              </Link>
            </Button>
            <span>/</span>
            <span className="font-semibold text-purple-primary">Academic Excellence</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-purple-primary" />
            Academic & Research Project Tracker
          </h1>
          <p className="text-xs text-text-secondary">
            Zoho Education Management • Student Capstones, Faculty Research & Science Exhibitions with 1-Click Status Updates
          </p>
          {isSuperAdmin && (
            <Badge variant="outline" className="bg-purple-tint text-purple-primary border-purple-primary/30 text-[11px] font-medium">
              Read-Only Governance (Evaluation strictly owned by Faculty & Principal)
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isSuperAdmin && (
            <Button
              onClick={() => setNewProjectModal(true)}
              className="bg-purple-primary hover:bg-purple-primary/90 text-white text-xs font-semibold shadow-sm"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              + New Student / Research Project
            </Button>
          )}
        </div>
      </div>

      {/* Filter Ribbon */}
      <Card className="border-border/80 bg-surface shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-secondary" />
              <Input
                placeholder="Search by code, topic, or student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="OVERDUE">Overdue ⚠️</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44 h-9 text-xs">
                <SelectValue placeholder="Project Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="STUDENT_INDIVIDUAL">Student Individual</SelectItem>
                <SelectItem value="STUDENT_GROUP">Student Group</SelectItem>
                <SelectItem value="FACULTY_RESEARCH">Faculty Research</SelectItem>
                <SelectItem value="SCIENCE_EXHIBITION">Science Exhibition</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-text-secondary shrink-0 font-medium">
            Showing <span className="font-bold text-foreground">{filteredProjects.length}</span> active projects
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProjects.map((prj) => {
          const completedCount = prj.milestones.filter((m) => m.isCompleted).length;
          const totalCount = prj.milestones.length;

          return (
            <Card key={prj.id} className="border-border/80 bg-surface shadow-sm hover:border-purple-primary/40 transition-all flex flex-col justify-between">
              <CardHeader className="p-4 pb-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-tint text-purple-primary border border-purple-primary/20">
                      {prj.projectCode}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {prj.type.replace("_", " ")}
                    </Badge>
                  </div>

                  {/* 1-Click Status Dropdown */}
                  <Select
                    value={prj.status}
                    onValueChange={(val) => handleStatusChange(prj.id, val as any)}
                    disabled={isSuperAdmin}
                  >
                    <SelectTrigger className={`h-7 px-2 text-[11px] font-bold w-32 border ${
                      prj.status === "COMPLETED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : prj.status === "UNDER_REVIEW"
                        ? "bg-blue-50 text-blue-700 border-blue-300"
                        : prj.status === "IN_PROGRESS"
                        ? "bg-amber-50 text-amber-700 border-amber-300"
                        : prj.status === "OVERDUE"
                        ? "bg-red-50 text-red-700 border-red-300"
                        : "bg-slate-50 text-slate-700 border-slate-300"
                    }`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NOT_STARTED" className="text-xs">Not Started</SelectItem>
                      <SelectItem value="IN_PROGRESS" className="text-xs">In Progress</SelectItem>
                      <SelectItem value="UNDER_REVIEW" className="text-xs">Under Review</SelectItem>
                      <SelectItem value="COMPLETED" className="text-xs">Completed ✓</SelectItem>
                      <SelectItem value="OVERDUE" className="text-xs">Overdue ⚠️</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <CardTitle className="text-base font-bold text-foreground leading-snug">
                  {prj.title}
                </CardTitle>

                <p className="text-xs text-text-secondary line-clamp-2">
                  {prj.abstractDescription}
                </p>
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-3">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-background/60 p-2.5 rounded-lg border border-border/50">
                  <div>
                    <span className="text-text-secondary block">Scope & Subject:</span>
                    <span className="font-bold text-foreground">{prj.className} ({prj.sectionName}) • {prj.subjectName}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary block">Faculty Mentor:</span>
                    <span className="font-bold text-foreground">{prj.mentorName}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-text-secondary block">Student Team:</span>
                    <span className="font-medium text-foreground">{prj.studentNames.join(", ")}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary font-medium">Milestones Progress:</span>
                    <span className="font-bold text-foreground">{completedCount}/{totalCount} Completed ({prj.completionPercentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        prj.completionPercentage === 100
                          ? "bg-emerald-500"
                          : prj.status === "OVERDUE"
                          ? "bg-red-500"
                          : "bg-purple-primary"
                      }`}
                      style={{ width: `${prj.completionPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <Clock className="h-3.5 w-3.5 text-text-secondary" />
                    <span>Due: <strong className="text-foreground">{prj.deadlineDate}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleNudge(prj)}
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] text-purple-primary hover:bg-purple-tint px-2"
                      title="Send automated reminder to team"
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1" />
                      Nudge Team
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* New Project Dialog */}
      <Dialog open={newProjectModal} onOpenChange={setNewProjectModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">New Academic or Research Project</DialogTitle>
            <DialogDescription className="text-xs">
              Configure student research, science exhibition entries, or faculty action projects with automated follow-ups.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Project Title / Topic</Label>
              <Input
                placeholder="e.g. Hydroponics Nutrient Dosing Prototype"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Project Type</Label>
                <Select value={formType} onValueChange={(v: any) => setFormType(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDENT_INDIVIDUAL">Student Individual</SelectItem>
                    <SelectItem value="STUDENT_GROUP">Student Group</SelectItem>
                    <SelectItem value="FACULTY_RESEARCH">Faculty Research</SelectItem>
                    <SelectItem value="SCIENCE_EXHIBITION">Science Exhibition</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Class & Section</Label>
                <Select value={formClass} onValueChange={setFormClass}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Class 10 (10-A)">Class 10 (10-A)</SelectItem>
                    <SelectItem value="Class 12 (12-Sci)">Class 12 (12-Sci)</SelectItem>
                    <SelectItem value="Class 9 (9-B)">Class 9 (9-B)</SelectItem>
                    <SelectItem value="Primary Wing">Primary Wing (All)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Subject</Label>
                <Input
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Faculty Mentor</Label>
                <Input
                  value={formMentor}
                  onChange={(e) => setFormMentor(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Student Team (Comma-separated)</Label>
              <Input
                placeholder="e.g. Chetan M., Kiran Kumar"
                value={formStudents}
                onChange={(e) => setFormStudents(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Target Completion Deadline</Label>
              <Input
                type="date"
                value={formDeadline}
                onChange={(e) => setFormDeadline(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Abstract / Research Objective</Label>
              <Textarea
                placeholder="Brief summary of expected research deliverables and scientific methodology..."
                value={formAbstract}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormAbstract(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setNewProjectModal(false)} className="text-xs">
              Cancel
            </Button>
            <Button onClick={handleCreateProject} size="sm" className="bg-purple-primary text-white text-xs font-semibold">
              Create & Assign Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
