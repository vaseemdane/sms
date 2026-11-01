"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Plus,
  ArrowLeft,
  Check,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  BookOpen,
  Coffee,
  Sun,
  ShieldCheck,
  Globe,
  Share2,
  FileCheck,
  Layers,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useSMSStore,
  CustomTimeSlot,
  WeekDay,
  TimeSlotType,
  toMinutes,
} from "@/context/sms-store";
import { useAuth } from "@/services/auth-context";

const DAYS: WeekDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TimetablesPage() {
  const { user } = useAuth();
  const isPrincipal = user?.userType === "principal";
  const isSuperAdmin = user?.userType === "super_admin";
  const canEditTimetable = isPrincipal || user?.userType === "admin";
  const canViewAllTimetables = isPrincipal || isSuperAdmin || user?.userType === "admin";

  const {
    sections,
    teachers,
    getTimetableBySection,
    saveTimetableSchedule,
    publishTimetable,
    applyBellScheduleTemplate,
    applyMasterTemplateToAllSections,
    checkTeacherConflict,
  } = useSMSStore();

  const [selectedSectionId, setSelectedSectionId] = React.useState<string>("sec-6a");
  const [selectedDay, setSelectedDay] = React.useState<WeekDay>("Monday");
  const [toast, setToast] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // 3-Way Mode Switcher (REA 05 Spec)
  const [viewMode, setViewMode] = React.useState<"SECTION_VIEW" | "MASTER_MATRIX" | "TEACHER_SCHEDULE">("SECTION_VIEW");
  const [selectedTeacherId, setSelectedTeacherId] = React.useState<string>("tch-1");

  // Teacher Tweak Request Modal
  const [tweakModalOpen, setTweakModalOpen] = React.useState(false);
  const [tweakType, setTweakType] = React.useState("EXTRA_REMEDIAL_CLASS");
  const [tweakSubject, setTweakSubject] = React.useState("Mathematics");
  const [tweakDate, setTweakDate] = React.useState("2026-10-30");
  const [tweakReason, setTweakReason] = React.useState("");

  // Add / Edit Slot Modal State
  const [slotModalOpen, setSlotModalOpen] = React.useState(false);
  const [editingSlotId, setEditingSlotId] = React.useState<string | null>(null);
  const [slotStartTime, setSlotStartTime] = React.useState("09:00");
  const [slotEndTime, setSlotEndTime] = React.useState("09:45");
  const [slotType, setSlotType] = React.useState<TimeSlotType>("PERIOD");
  const [slotTitle, setSlotTitle] = React.useState("");
  const [slotSubject, setSlotSubject] = React.useState("Mathematics");
  const [slotTeacherId, setSlotTeacherId] = React.useState("");

  const currentTimetable = getTimetableBySection(selectedSectionId);
  const currentSlots = currentTimetable.schedule[selectedDay] || [];
  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Real-Time Time Conflict Check inside Modal
  const conflictCheckResult = React.useMemo(() => {
    if (slotType !== "PERIOD" || !slotTeacherId) {
      return { hasConflict: false };
    }
    return checkTeacherConflict(
      selectedSectionId,
      selectedDay,
      slotStartTime,
      slotEndTime,
      slotTeacherId
    );
  }, [slotType, slotTeacherId, slotStartTime, slotEndTime, selectedSectionId, selectedDay, checkTeacherConflict]);

  // Open modal for new slot
  const handleOpenAddSlot = () => {
    setEditingSlotId(null);
    // Suggest next start time after previous slot
    if (currentSlots.length > 0) {
      const lastSlot = currentSlots[currentSlots.length - 1];
      setSlotStartTime(lastSlot.endTime);
      const [h, m] = lastSlot.endTime.split(":").map(Number);
      const nextMin = h * 60 + m + 45;
      const nextH = Math.floor(nextMin / 60) % 24;
      const nextM = nextMin % 60;
      setSlotEndTime(`${String(nextH).padStart(2, "0")}:${String(nextM).padStart(2, "0")}`);
    } else {
      setSlotStartTime("08:30");
      setSlotEndTime("09:15");
    }
    setSlotType("PERIOD");
    setSlotTitle("");
    setSlotSubject("Mathematics");
    setSlotTeacherId(teachers[0]?.id || "");
    setSlotModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEditSlot = (slot: CustomTimeSlot) => {
    setEditingSlotId(slot.id);
    setSlotStartTime(slot.startTime);
    setSlotEndTime(slot.endTime);
    setSlotType(slot.type);
    setSlotTitle(slot.title || "");
    setSlotSubject(slot.subject || "Mathematics");
    setSlotTeacherId(slot.teacherId || "");
    setSlotModalOpen(true);
  };

  // Save Slot (Add or Edit)
  const handleSaveSlotSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (toMinutes(slotStartTime) >= toMinutes(slotEndTime)) {
      showToast("End time must be after start time.", "error");
      return;
    }

    if (slotType === "PERIOD" && !slotTeacherId) {
      showToast("Please assign a teacher to this teaching period.", "error");
      return;
    }

    if (conflictCheckResult.hasConflict) {
      const teacherObj = teachers.find((t) => t.id === slotTeacherId);
      showToast(
        `Teacher Conflict: ${teacherObj?.name || "Teacher"} is already teaching in Class ${conflictCheckResult.conflictingClass} during ${conflictCheckResult.conflictingTime}.`,
        "error"
      );
      return;
    }

    let nextSlots: CustomTimeSlot[];
    if (editingSlotId) {
      nextSlots = currentSlots.map((s) =>
        s.id === editingSlotId
          ? {
              ...s,
              startTime: slotStartTime,
              endTime: slotEndTime,
              type: slotType,
              title: slotType === "BREAK" ? slotTitle : undefined,
              subject: slotType === "PERIOD" ? slotSubject : undefined,
              teacherId: slotType === "PERIOD" ? slotTeacherId : undefined,
            }
          : s
      );
    } else {
      const newSlot: CustomTimeSlot = {
        id: `slot-${Date.now()}`,
        startTime: slotStartTime,
        endTime: slotEndTime,
        type: slotType,
        title: slotType === "BREAK" ? slotTitle : undefined,
        subject: slotType === "PERIOD" ? slotSubject : undefined,
        teacherId: slotType === "PERIOD" ? slotTeacherId : undefined,
      };
      nextSlots = [...currentSlots, newSlot];
    }

    // Sort chronologically by start time
    nextSlots.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

    saveTimetableSchedule(selectedSectionId, selectedDay, nextSlots);
    setSlotModalOpen(false);
    showToast(`Saved slot for ${selectedSection?.code} (${selectedDay})`);
  };

  const handleDeleteSlot = (slotId: string) => {
    const nextSlots = currentSlots.filter((s) => s.id !== slotId);
    saveTimetableSchedule(selectedSectionId, selectedDay, nextSlots);
    showToast("Time slot deleted.");
  };

  const handleMoveSlot = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === currentSlots.length - 1)
    )
      return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const nextSlots = [...currentSlots];
    const temp = nextSlots[index];
    nextSlots[index] = nextSlots[targetIndex];
    nextSlots[targetIndex] = temp;

    saveTimetableSchedule(selectedSectionId, selectedDay, nextSlots);
    showToast("Slots reordered.");
  };

  const handleTogglePublish = () => {
    const nextState = !currentTimetable.isPublished;
    publishTimetable(selectedSectionId, nextState);
    showToast(
      nextState
        ? `Timetable for ${selectedSection?.code} is now PUBLISHED and live for teachers and students!`
        : `Timetable for ${selectedSection?.code} is now saved as DRAFT.`
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 text-xs font-semibold text-white transition-all ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.type === "error" ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          <span>{toast.text}</span>
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
            <span className="font-semibold text-purple-primary">Academic Lifecycle</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-purple-primary" />
            Customizable Timetable & Dynamic Timing Builder
          </h1>
          <p className="text-xs text-text-secondary">
            Custom `<input type="time" />` slot builder • Real-time teacher double-booking overlap detection • Draft vs Publish
          </p>
          {isSuperAdmin && (
            <div className="pt-1">
              <Badge variant="outline" className="bg-purple-tint text-purple-primary border-purple-primary/30 text-[11px] font-medium">
                Read-Only View (Super Admin Separation of Duties — Principal Controls Timetables)
              </Badge>
            </div>
          )}
        </div>

        {/* Global Master Template Action (Principal) */}
        {canEditTimetable && !isSuperAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                applyMasterTemplateToAllSections();
                showToast("⚡ Master Bell Template applied & published to all 20 sections!");
              }}
              variant="outline"
              size="sm"
              className="h-9 text-xs border-purple-primary/30 text-purple-primary hover:bg-purple-tint font-semibold"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              ⚡ Auto-Compile & Publish Master Bell Schedule
            </Button>
          </div>
        )}
      </div>

      {/* 3-WAY VIEW SWITCHER (REA 05 SPEC) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-2 rounded-xl border border-border/80">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={viewMode === "SECTION_VIEW" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("SECTION_VIEW")}
            className={`h-8 text-xs font-semibold ${
              viewMode === "SECTION_VIEW" ? "bg-purple-primary text-white shadow-sm" : ""
            }`}
          >
            (1) Class & Section Schedule
          </Button>
          <Button
            variant={viewMode === "MASTER_MATRIX" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("MASTER_MATRIX")}
            className={`h-8 text-xs font-semibold ${
              viewMode === "MASTER_MATRIX" ? "bg-purple-primary text-white shadow-sm" : ""
            }`}
          >
            (2) Common Master Matrix (Nursery–12th)
          </Button>
          <Button
            variant={viewMode === "TEACHER_SCHEDULE" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("TEACHER_SCHEDULE")}
            className={`h-8 text-xs font-semibold ${
              viewMode === "TEACHER_SCHEDULE" ? "bg-purple-primary text-white shadow-sm" : ""
            }`}
          >
            (3) Teacher Schedule & Slot Tweaks
          </Button>
        </div>

        {viewMode === "TEACHER_SCHEDULE" && !isSuperAdmin && (
          <Button
            onClick={() => setTweakModalOpen(true)}
            size="sm"
            className="h-8 text-xs bg-purple-primary text-white font-semibold"
          >
            <Calendar className="h-3.5 w-3.5 mr-1" />
            Request Slot Tweak / Remedial
          </Button>
        )}
      </div>

      {/* SECTION & DAY SELECTOR CARD */}
      <Card className="border-border/80 bg-surface shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Section Picker */}
            <div className="flex items-center gap-3">
              <Label className="text-xs font-bold text-foreground shrink-0">Class Arm:</Label>
              <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                <SelectTrigger className="w-48 h-9 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.className} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Badge */}
              {currentTimetable.isPublished ? (
                <Badge className="bg-emerald-600 text-white text-[11px] font-semibold gap-1">
                  <Globe className="h-3 w-3" />
                  Published (Live)
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[11px]">
                  Draft Mode
                </Badge>
              )}
            </div>

            {/* Publishing Controls */}
            {canEditTimetable && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => {
                    applyBellScheduleTemplate(selectedSectionId, selectedDay);
                    showToast(`Bell schedule template applied to ${selectedSection?.code} (${selectedDay})`);
                  }}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                >
                  <Clock className="h-3.5 w-3.5 mr-1 text-text-secondary" />
                  Apply Bell Template ({selectedDay})
                </Button>

                <Button
                  onClick={handleTogglePublish}
                  size="sm"
                  className={`h-8 text-xs font-semibold ${
                    currentTimetable.isPublished
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  }`}
                >
                  <FileCheck className="h-3.5 w-3.5 mr-1" />
                  {currentTimetable.isPublished ? "Revert to Draft" : "Publish Timetable"}
                </Button>

                <Button
                  onClick={handleOpenAddSlot}
                  size="sm"
                  className="h-8 bg-purple-primary hover:bg-purple-primary/90 text-white text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  + Add Custom Slot
                </Button>
              </div>
            )}
          </div>

          {/* Days Tabs (Monday to Saturday) */}
          <div className="border-t border-border/80 pt-3 flex flex-wrap gap-1.5">
            {DAYS.map((day) => {
              const isDayActive = selectedDay === day;
              const slotsCount = (currentTimetable.schedule[day] || []).length;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isDayActive
                      ? "bg-purple-primary text-white shadow-sm"
                      : "bg-muted/50 hover:bg-muted text-text-secondary hover:text-foreground"
                  }`}
                >
                  <span>{day}</span>
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded ${
                      isDayActive ? "bg-white/20 text-white" : "bg-muted text-text-secondary"
                    }`}
                  >
                    {slotsCount} slots
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* DAY SCHEDULE TIMELINE & SLOTS TABLE */}
      {viewMode === "SECTION_VIEW" && (
        <Card className="border-border/80 bg-surface shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-primary" />
                {selectedSection?.code} Schedule — {selectedDay} ({currentSlots.length} Slots)
              </CardTitle>
              <CardDescription className="text-xs">
                Accurate customizable periods & break blocks with real-time faculty availability checking
              </CardDescription>
            </div>
            {canEditTimetable && !isSuperAdmin && (
              <Button
                onClick={handleOpenAddSlot}
                variant="outline"
                size="sm"
                className="h-8 text-xs border-purple-primary/30 text-purple-primary"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Slot
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {currentSlots.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-muted/60 text-text-secondary mx-auto flex items-center justify-center">
                <Calendar className="h-6 w-6" />
              </div>
              <p className="text-xs text-text-secondary">
                No time slots defined for {selectedSection?.code} on {selectedDay}.
              </p>
              {canEditTimetable && (
                <div className="flex justify-center gap-2">
                  <Button
                    onClick={() => applyBellScheduleTemplate(selectedSectionId, selectedDay)}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    Apply Bell Template
                  </Button>
                  <Button
                    onClick={handleOpenAddSlot}
                    size="sm"
                    className="bg-purple-primary text-white text-xs"
                  >
                    + Add First Slot
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs text-text-secondary bg-muted/30">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-40">Time Duration</TableHead>
                    <TableHead className="w-32">Block Type</TableHead>
                    <TableHead>Subject / Activity</TableHead>
                    <TableHead>Assigned Faculty</TableHead>
                    {canEditTimetable && <TableHead className="text-right">Actions & Order</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentSlots.map((slot, idx) => {
                    const teacherObj = teachers.find((t) => t.id === slot.teacherId);
                    const isPeriod = slot.type === "PERIOD";

                    return (
                      <TableRow
                        key={slot.id || idx}
                        className={`text-xs hover:bg-muted/40 transition-colors ${
                          !isPeriod ? "bg-muted/15" : ""
                        }`}
                      >
                        <TableCell className="font-mono text-text-secondary font-bold">
                          {idx + 1}
                        </TableCell>

                        {/* Exact Dynamic Custom Timing */}
                        <TableCell>
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-tint text-purple-primary font-mono font-bold text-xs border border-purple-primary/20">
                            <Clock className="h-3 w-3" />
                            <span>{slot.startTime}</span>
                            <span>–</span>
                            <span>{slot.endTime}</span>
                          </div>
                        </TableCell>

                        {/* Block Type */}
                        <TableCell>
                          {isPeriod ? (
                            <Badge className="bg-purple-primary text-white text-[10px]">
                              Teaching Period
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[10px] gap-1">
                              <Coffee className="h-3 w-3" />
                              Break / Assembly
                            </Badge>
                          )}
                        </TableCell>

                        {/* Subject / Title */}
                        <TableCell className="font-semibold text-foreground">
                          {isPeriod ? (
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="h-3.5 w-3.5 text-purple-primary" />
                              <span>{slot.subject}</span>
                            </div>
                          ) : (
                            <span className="text-amber-900 font-medium italic">
                              {slot.title || "Break Interval"}
                            </span>
                          )}
                        </TableCell>

                        {/* Faculty Assigned */}
                        <TableCell>
                          {isPeriod ? (
                            teacherObj ? (
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                                  {teacherObj.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-foreground">{teacherObj.name}</span>
                                  <span className="text-[10px] text-text-secondary">
                                    {teacherObj.subjectSpecialization || "Teacher"}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-amber-700 font-semibold text-[11px]">
                                ⚠️ No Teacher Assigned
                              </span>
                            )
                          ) : (
                            <span className="text-text-secondary text-[11px]">—</span>
                          )}
                        </TableCell>

                        {/* Principal Controls */}
                        {canEditTimetable && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                onClick={() => handleMoveSlot(idx, "up")}
                                disabled={idx === 0}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-text-secondary hover:text-foreground disabled:opacity-20"
                                title="Move up"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                onClick={() => handleMoveSlot(idx, "down")}
                                disabled={idx === currentSlots.length - 1}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-text-secondary hover:text-foreground disabled:opacity-20"
                                title="Move down"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                onClick={() => handleOpenEditSlot(slot)}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-text-secondary hover:text-purple-primary"
                                title="Edit slot"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                onClick={() => handleDeleteSlot(slot.id)}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-text-secondary hover:text-destructive"
                                title="Delete slot"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* 2. COMMON MASTER MATRIX VIEW (ALL 20 ARMS NURSERY TO 12TH) */}
      {viewMode === "MASTER_MATRIX" && (
        <Card className="border-border/80 bg-surface shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-primary" />
                  Common Master Timetable Matrix ({selectedDay} • All 20 Classes Nursery to 12th)
                </CardTitle>
                <CardDescription className="text-xs">
                  Bird's-eye administrative scheduling matrix across all sections. Read-only for Super Admin, compiled by Principal Desk.
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs font-semibold">
                ✓ 20/20 Sections Synced
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-40 font-bold text-xs">Class & Arm</TableHead>
                    <TableHead className="w-24 font-bold text-xs">Status</TableHead>
                    <TableHead className="font-bold text-xs">Daily Bell Periods & Subjects ({selectedDay})</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {sections.map((sec) => {
                    const secTt = getTimetableBySection(sec.id);
                    const slots = secTt.schedule[selectedDay] || [];

                    return (
                      <TableRow key={sec.id} className="hover:bg-muted/20">
                        <TableCell className="font-bold text-xs text-foreground">
                          {sec.className} ({sec.code})
                        </TableCell>
                        <TableCell>
                          {secTt.isPublished ? (
                            <Badge className="bg-emerald-600 text-white text-[10px]">Live</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 border-amber-300">Draft</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5 py-1">
                            {slots.length === 0 ? (
                              <span className="text-xs text-text-secondary italic">No periods defined</span>
                            ) : (
                              slots.map((s, sIdx) => {
                                const isPeriod = s.type === "PERIOD";
                                const teacherObj = teachers.find((t) => t.id === s.teacherId);
                                return (
                                  <div
                                    key={s.id || sIdx}
                                    className={`px-2 py-1 rounded-md text-[11px] border font-medium flex items-center gap-1.5 ${
                                      isPeriod
                                        ? "bg-purple-tint/80 border-purple-primary/20 text-purple-primary"
                                        : "bg-amber-50 border-amber-200 text-amber-800"
                                    }`}
                                  >
                                    <span className="font-mono text-[10px] opacity-75">{s.startTime}</span>
                                    <strong>{isPeriod ? s.subject : s.title || "Break"}</strong>
                                    {isPeriod && teacherObj && (
                                      <span className="text-[10px] text-text-secondary">({teacherObj.name.split(" ")[0]})</span>
                                    )}
                                  </div>
                                );
                              })
                            )}
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
      )}

      {/* 3. TEACHER SCHEDULE & TWEAK REQUEST VIEW */}
      {viewMode === "TEACHER_SCHEDULE" && (
        <Card className="border-border/80 bg-surface shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-primary" />
                  Faculty Assigned Schedule & Demand-Based Tweak Desk
                </CardTitle>
                <CardDescription className="text-xs">
                  Filter by teacher to view assigned class sessions, free periods, or submit an official remedial slot request.
                </CardDescription>
              </div>

              <div className="flex items-center gap-3">
                <Label className="text-xs font-bold shrink-0">Select Faculty:</Label>
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger className="w-56 h-8 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.name} ({t.subjectSpecialization || "Faculty"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              {DAYS.map((d) => {
                const teacherSlots: { sectionCode: string; slot: CustomTimeSlot }[] = [];
                sections.forEach((sec) => {
                  const tt = getTimetableBySection(sec.id);
                  (tt.schedule[d] || []).forEach((slot) => {
                    if (slot.teacherId === selectedTeacherId && slot.type === "PERIOD") {
                      teacherSlots.push({ sectionCode: sec.code, slot });
                    }
                  });
                });

                return (
                  <div key={d} className="p-3 rounded-xl bg-background/60 border border-border/60 space-y-2">
                    <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                      <span className="font-bold text-xs text-foreground">{d}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {teacherSlots.length} Periods
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      {teacherSlots.length === 0 ? (
                        <p className="text-[11px] text-text-secondary italic py-2">No periods scheduled</p>
                      ) : (
                        teacherSlots.map(({ sectionCode, slot }, i) => (
                          <div
                            key={i}
                            className="p-2 rounded-lg bg-purple-tint/50 border border-purple-primary/20 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between font-bold text-purple-primary text-[11px]">
                              <span>{slot.startTime}–{slot.endTime}</span>
                              <Badge className="bg-purple-primary text-white text-[9px] px-1 py-0">{sectionCode}</Badge>
                            </div>
                            <div className="font-semibold text-foreground text-xs">{slot.subject}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODAL: TEACHER TIMETABLE TWEAK REQUEST */}
      <Dialog open={tweakModalOpen} onOpenChange={setTweakModalOpen}>
        <DialogContent className="max-w-md bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Request Timetable Tweak / Extra Slot</DialogTitle>
            <DialogDescription className="text-xs">
              Submitted requests are routed to the Principal Desk for academic clash validation and approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Request Type</Label>
              <Select value={tweakType} onValueChange={setTweakType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXTRA_REMEDIAL_CLASS">Extra Remedial Class</SelectItem>
                  <SelectItem value="SLOT_SWAP">Period Swap with Faculty</SelectItem>
                  <SelectItem value="ROOM_CHANGE">Lab / Room Change</SelectItem>
                  <SelectItem value="SUBSTITUTE_REQUEST">Substitute Teacher Request</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Subject</Label>
                <Input
                  value={tweakSubject}
                  onChange={(e) => setTweakSubject(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Effective Date</Label>
                <Input
                  type="date"
                  value={tweakDate}
                  onChange={(e) => setTweakDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Academic Justification / Reason</Label>
              <Textarea
                placeholder="e.g. Need 1 extra revision session prior to Grade 10 Physics Mid-Term Examination..."
                value={tweakReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTweakReason(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setTweakModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                setTweakModalOpen(false);
                showToast("Timetable tweak request submitted to Principal Desk for approval!");
                setTweakReason("");
              }}
              size="sm"
              className="bg-purple-primary text-white text-xs font-semibold"
            >
              Submit Request to Principal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: ADD / EDIT DYNAMIC TIME SLOT WITH REAL-TIME CONFLICT DETECTION */}
      <Dialog open={slotModalOpen} onOpenChange={setSlotModalOpen}>
        <DialogContent className="sm:max-w-md bg-surface border-border p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {editingSlotId ? "Edit Time Slot" : "Add Custom Time Slot"} ({selectedSection?.code} • {selectedDay})
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Define exact start and end times. Teaching periods are checked live against teacher double-booking.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSlotSubmit} className="space-y-4 pt-2">
            {/* REAL-TIME TEACHER OVERLAP CONFLICT BANNER */}
            {conflictCheckResult.hasConflict && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs space-y-1 animate-in fade-in-50">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Real-Time Double-Booking Conflict!</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Conflict: The selected teacher is already assigned to{" "}
                  <strong>Class {conflictCheckResult.conflictingClass}</strong> from{" "}
                  <strong>{conflictCheckResult.conflictingTime}</strong> on {selectedDay}.
                </p>
              </div>
            )}

            {/* Start and End Times with <input type="time" /> */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Start Time *</Label>
                <Input
                  type="time"
                  value={slotStartTime}
                  onChange={(e) => setSlotStartTime(e.target.value)}
                  className="text-xs font-mono h-9"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">End Time *</Label>
                <Input
                  type="time"
                  value={slotEndTime}
                  onChange={(e) => setSlotEndTime(e.target.value)}
                  className="text-xs font-mono h-9"
                  required
                />
              </div>
            </div>

            {/* Period Type: Teaching Period vs Break Block */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Slot Category *</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSlotType("PERIOD")}
                  className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    slotType === "PERIOD"
                      ? "bg-purple-primary text-white border-purple-primary shadow-xs"
                      : "bg-surface hover:bg-muted text-foreground border-border"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Teaching Period
                </button>

                <button
                  type="button"
                  onClick={() => setSlotType("BREAK")}
                  className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    slotType === "BREAK"
                      ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                      : "bg-surface hover:bg-muted text-foreground border-border"
                  }`}
                >
                  <Coffee className="h-3.5 w-3.5" />
                  Break / Activity
                </button>
              </div>
            </div>

            {/* Fields for Teaching Period */}
            {slotType === "PERIOD" ? (
              <div className="space-y-3 p-3 rounded-xl bg-muted/40 border border-border">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Subject Name *</Label>
                  <Input
                    value={slotSubject}
                    onChange={(e) => setSlotSubject(e.target.value)}
                    placeholder="e.g. Mathematics, Science, Social Science"
                    className="text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Assign Faculty Member *</Label>
                  <Select value={slotTeacherId} onValueChange={setSlotTeacherId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">
                          {t.name} ({t.subjectSpecialization || "Teacher"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              /* Fields for Break / Activity */
              <div className="space-y-3 p-3 rounded-xl bg-amber-50/50 border border-amber-200">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Break / Activity Label *</Label>
                  <Input
                    value={slotTitle}
                    onChange={(e) => setSlotTitle(e.target.value)}
                    placeholder="e.g. Morning Assembly, Short Recess, Lunch Break"
                    className="text-xs"
                    required
                  />
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSlotModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={conflictCheckResult.hasConflict}
                className="bg-purple-primary hover:bg-purple-primary/90 text-white text-xs font-semibold disabled:opacity-50"
              >
                {conflictCheckResult.hasConflict
                  ? "Cannot Save (Conflict)"
                  : editingSlotId
                  ? "Update Time Slot"
                  : "Save Time Slot"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
