"use client";

import React, { useState, useMemo } from "react";
import { useSMSStore, SectionEntity, AttendanceRecord, AttendanceStatus } from "@/context/sms-store";
import { useAuth } from "@/services/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  Clock,
  ShieldAlert,
  UserCheck,
  Save,
  Check,
  Calendar,
  AlertCircle,
  Upload,
  RotateCcw,
  History,
  FileCheck2,
  Lock,
  Unlock,
  Send,
  MessageSquare,
  Filter,
  Mail,
} from "lucide-react";

export default function TeacherAttendanceDeskPage() {
  const { user } = useAuth();
  const {
    sections,
    students,
    isClassTeacherForSection,
    getSectionAttendance,
    saveSectionAttendance,
    recordTeacherAudit,
  } = useSMSStore();

  const teacherId = user?.id || "";

  // Designated Class Teacher sections
  const ctSections = useMemo(() => {
    return sections.filter((sec: SectionEntity) => isClassTeacherForSection(teacherId, sec.id));
  }, [sections, isClassTeacherForSection, teacherId]);

  // Selected Section
  const [selectedSectionId, setSelectedSectionId] = useState<string>(() => {
    return ctSections.length > 0 ? ctSections[0].id : sections[0]?.id || "";
  });

  // Selected Date
  const [selectedDate, setSelectedDate] = useState<string>("2026-10-26");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [sessionMode, setSessionMode] = useState<"DAILY" | "PERIOD">("DAILY");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("Period 1 (09:00 - 09:45 AM)");

  // Retroactive edit reason modal
  const [isRetroactiveModalOpen, setIsRetroactiveModalOpen] = useState(false);
  const [modificationReason, setModificationReason] = useState("");

  // CSV Import modal
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Staff Monitor & Quick Actions Desk (REA 05 Spec)
  const [activeTab, setActiveTab] = useState<"ROLL_CALL" | "STAFF_MONITOR">("ROLL_CALL");
  const [monitorFilter, setMonitorFilter] = useState<"ALL" | "BELOW_75" | "ABSENT_TODAY">("BELOW_75");
  const [isBulkNotifyOpen, setIsBulkNotifyOpen] = useState(false);
  const [bulkSubject, setBulkSubject] = useState("Mandatory Attendance Notice & Remedial Class");
  const [bulkMessageBody, setBulkMessageBody] = useState(
    "Dear Student & Parent, attendance has fallen below the 75% statutory requirement. Please attend the mandatory remedial support session scheduled for this Saturday at 09:00 AM."
  );

  // Active section data
  const activeSection = useMemo(() => {
    return sections.find((s: SectionEntity) => s.id === selectedSectionId);
  }, [sections, selectedSectionId]);

  // Enrolled students for selected section
  const sectionStudents = useMemo(() => {
    if (!selectedSectionId) return [];
    return students
      .filter((s) => s.classSectionId === selectedSectionId && s.active !== false)
      .sort((a, b) => (a.rollNo || "").localeCompare(b.rollNo || ""));
  }, [students, selectedSectionId]);

  // Attendance map: studentId -> status
  const [rollCall, setRollCall] = useState<Record<string, AttendanceStatus>>({});

  // Sync attendance state on section or date change
  React.useEffect(() => {
    if (!selectedSectionId) return;

    const existingRecord = getSectionAttendance(selectedSectionId, selectedDate);
    const initialMap: Record<string, AttendanceStatus> = {};

    sectionStudents.forEach((st) => {
      // Mock student 2 on approved medical leave
      if (st.rollNo === "02") {
        initialMap[st.id] = existingRecord?.[st.id] || "EXCUSED";
      } else {
        initialMap[st.id] = existingRecord?.[st.id] || "PRESENT";
      }
    });

    setRollCall(initialMap);
    setSavedSuccess(false);
  }, [selectedSectionId, selectedDate, sectionStudents, getSectionAttendance]);

  // Check if date is in the past (retroactive edit)
  const isPastDate = useMemo(() => {
    const today = "2026-10-26";
    return selectedDate < today;
  }, [selectedDate]);

  // Attendance metrics
  const totalCount = sectionStudents.length;
  const presentCount = Object.values(rollCall).filter((s) => s === "PRESENT").length;
  const absentCount = Object.values(rollCall).filter((s) => s === "ABSENT").length;
  const lateCount = Object.values(rollCall).filter((s) => s === "LATE").length;
  const excusedCount = Object.values(rollCall).filter((s) => s === "EXCUSED").length;

  // Quick Action Handlers
  const handleMarkAll = (status: AttendanceStatus) => {
    const next: Record<string, AttendanceStatus> = {};
    sectionStudents.forEach((st) => {
      next[st.id] = status;
    });
    setRollCall(next);
  };

  const handleInvertSelection = () => {
    const next: Record<string, AttendanceStatus> = {};
    sectionStudents.forEach((st) => {
      const curr = rollCall[st.id] || "PRESENT";
      next[st.id] = curr === "PRESENT" ? "ABSENT" : "PRESENT";
    });
    setRollCall(next);
  };

  const handleToggle = (studentId: string, status: AttendanceStatus) => {
    setRollCall((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  // Save Attendance execution
  const executeSave = (reason?: string) => {
    if (!selectedSectionId) return;

    const attendanceRecord: AttendanceRecord = {};
    sectionStudents.forEach((st) => {
      attendanceRecord[st.id] = rollCall[st.id] || "PRESENT";
    });

    saveSectionAttendance(selectedSectionId, selectedDate, attendanceRecord);

    recordTeacherAudit({
      teacherId,
      teacherName: user?.name || "Teacher",
      action: "ATTENDANCE_MARKED",
      targetType: "SECTION",
      targetId: selectedSectionId,
      details: `Submitted attendance for ${activeSection?.code || activeSection?.name} on ${selectedDate} (${presentCount} P, ${absentCount} A, ${lateCount} L)${
        reason ? ` - Reason: ${reason}` : ""
      }`,
    });

    setSavedSuccess(true);
    setIsRetroactiveModalOpen(false);
    setModificationReason("");
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const handleSaveClick = () => {
    if (isPastDate) {
      setIsRetroactiveModalOpen(true);
    } else {
      executeSave();
    }
  };

  // Days in month ribbon (October 2026)
  const monthDays = [
    { date: "2026-10-19", day: "Mon", badge: "GREEN", label: "Marked" },
    { date: "2026-10-20", day: "Tue", badge: "GREEN", label: "Marked" },
    { date: "2026-10-21", day: "Wed", badge: "GREEN", label: "Marked" },
    { date: "2026-10-22", day: "Thu", badge: "RED", label: "Missed!" },
    { date: "2026-10-23", day: "Fri", badge: "GREY", label: "Rajyotsava" },
    { date: "2026-10-24", day: "Sat", badge: "GREEN", label: "Marked" },
    { date: "2026-10-25", day: "Sun", badge: "GREY", label: "Sunday" },
    { date: "2026-10-26", day: "Mon", badge: "ACTIVE", label: "Today (Active)" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Class Attendance Desk</h1>
            <Badge className="bg-emerald-600 text-white font-semibold text-xs">Attendance Tracker Engine</Badge>
            {isPastDate && (
              <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800 text-[10px] font-bold">
                <Clock className="h-3 w-3 mr-1" />
                Retroactive Edit Mode (48h Lock Window)
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Fast exception-only roll call, interactive month ribbon, and immutable audit logging
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setIsCsvModalOpen(true)}
            variant="outline"
            size="sm"
            className="text-xs h-9"
          >
            <Upload className="h-3.5 w-3.5 mr-1" />
            Bulk Import CSV
          </Button>

          {sections.length > 1 && (
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="text-xs h-9 rounded-md border border-input bg-background px-3 font-semibold"
            >
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.className} - {sec.code}
                </option>
              ))}
            </select>
          )}

          <select
            value={sessionMode}
            onChange={(e) => setSessionMode(e.target.value as any)}
            className="text-xs h-9 rounded-md border border-input bg-background px-2 font-semibold"
          >
            <option value="DAILY">Daily Homeroom</option>
            <option value="PERIOD">Period / Subject Slot</option>
          </select>

          {sessionMode === "PERIOD" && (
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="text-xs h-9 rounded-md border border-input bg-background px-2"
            >
              <option value="Period 1">Period 1 (Math)</option>
              <option value="Period 2">Period 2 (Science)</option>
              <option value="Period 3">Period 3 (English)</option>
            </select>
          )}

          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-36 h-9 text-xs font-semibold"
          />

          <Button onClick={handleSaveClick} size="sm" className="gap-1.5 bg-purple-primary text-white shadow-sm">
            {savedSuccess ? <Check className="h-4 w-4 text-emerald-400" /> : <Save className="h-4 w-4" />}
            {savedSuccess ? "Saved Successfully" : "Submit Register"}
          </Button>
        </div>
      </div>

      {/* DESK MODE SWITCHER (REA 05 SPEC) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-2 rounded-xl border border-border">
        <div className="flex items-center gap-1.5">
          <Button
            variant={activeTab === "ROLL_CALL" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("ROLL_CALL")}
            className={`h-8 text-xs font-semibold ${
              activeTab === "ROLL_CALL" ? "bg-purple-primary text-white shadow-sm" : ""
            }`}
          >
            (1) Daily & Period Roll Call
          </Button>
          <Button
            variant={activeTab === "STAFF_MONITOR" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("STAFF_MONITOR")}
            className={`h-8 text-xs font-semibold ${
              activeTab === "STAFF_MONITOR" ? "bg-purple-primary text-white shadow-sm" : ""
            }`}
          >
            (2) Staff Attendance Monitor & Bulk Notices
          </Button>
        </div>

        {activeTab === "STAFF_MONITOR" && (
          <Button
            onClick={() => setIsBulkNotifyOpen(true)}
            size="sm"
            className="h-8 text-xs bg-purple-primary hover:bg-purple-primary/90 text-white font-semibold shadow-sm"
          >
            <Mail className="h-3.5 w-3.5 mr-1.5" />
            ✉ 1-Click Bulk Notice to Defaulters
          </Button>
        )}
      </div>

      {/* ROLL CALL VIEW */}
      {activeTab === "ROLL_CALL" && (
        <>
      {/* Interactive Month Ribbon (Visual Badging: GREEN, RED, GREY) */}
      <Card className="border-border/80 bg-surface shadow-xs">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-purple-primary" />
              Calendar Badging Ribbon — October 2026
            </span>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-text-secondary">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Marked
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Pending/Missed
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/60" /> Holiday/Sunday
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {monthDays.map((d) => {
              const isSelected = d.date === selectedDate;
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setSelectedDate(d.date)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "ring-2 ring-purple-primary border-purple-primary bg-purple-tint/30"
                      : d.badge === "GREEN"
                      ? "border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50 text-emerald-900"
                      : d.badge === "RED"
                      ? "border-rose-200 bg-rose-50/40 hover:bg-rose-50 text-rose-900"
                      : d.badge === "ACTIVE"
                      ? "border-purple-primary bg-purple-tint/40 text-purple-primary font-bold"
                      : "border-border bg-muted/20 text-text-secondary"
                  }`}
                >
                  <div className="text-[10px] font-semibold opacity-70">
                    {d.date.slice(8)} {d.day}
                  </div>
                  <div className="text-xs font-bold truncate mt-0.5">{d.label}</div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 border-border bg-surface">
          <div className="text-xs text-muted-foreground font-medium">Total Students</div>
          <div className="text-2xl font-bold mt-1 text-foreground">{totalCount}</div>
        </Card>
        <Card className="p-3 border-emerald-500/20 bg-emerald-500/5">
          <div className="text-xs text-emerald-700 font-semibold flex items-center justify-between">
            <span>Present</span>
            <CheckCircle className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold mt-1 text-emerald-700">{presentCount}</div>
        </Card>
        <Card className="p-3 border-rose-500/20 bg-rose-500/5">
          <div className="text-xs text-rose-700 font-semibold flex items-center justify-between">
            <span>Absent</span>
            <XCircle className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold mt-1 text-rose-700">{absentCount}</div>
        </Card>
        <Card className="p-3 border-amber-500/20 bg-amber-500/5">
          <div className="text-xs text-amber-700 font-semibold flex items-center justify-between">
            <span>Late / Approved Leave</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold mt-1 text-amber-700">{lateCount + excusedCount}</div>
        </Card>
      </div>

      {/* Quick Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/30 rounded-xl border border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground">Bulk Actions:</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleMarkAll("PRESENT")}
            className="h-7 text-xs bg-surface text-emerald-700 hover:bg-emerald-50"
          >
            Mark All Present
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleInvertSelection}
            className="h-7 text-xs bg-surface text-purple-primary hover:bg-purple-tint/30"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Invert Selection
          </Button>
        </div>
        <span className="text-xs text-text-secondary">
          Pre-filled as Present. Only tap absent or late students.
        </span>
      </div>

      {/* Attendance Roll Call Table */}
      <Card className="border-border bg-surface shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs text-text-secondary bg-muted/30">
                  <TableHead className="w-16">Roll No</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Karnataka SATS ID</TableHead>
                  <TableHead className="text-center w-72">Attendance Status (1-Tap)</TableHead>
                  <TableHead>Remarks / Pre-filled Leave</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectionStudents.map((st) => {
                  const status = rollCall[st.id] || "PRESENT";
                  const isExcused = status === "EXCUSED";

                  return (
                    <TableRow key={st.id} className="text-xs hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono font-bold">{st.rollNo || "--"}</TableCell>
                      <TableCell>
                        <div className="font-bold text-foreground">{st.name}</div>
                        <div className="text-[10px] text-text-secondary">{st.admissionNo || "ADM-2026"}</div>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-text-secondary">
                        {st.satsId || "KA-SATS-88412"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggle(st.id, "PRESENT")}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                              status === "PRESENT"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-muted hover:bg-emerald-50 text-text-secondary"
                            }`}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggle(st.id, "ABSENT")}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                              status === "ABSENT"
                                ? "bg-rose-600 text-white shadow-xs"
                                : "bg-muted hover:bg-rose-50 text-text-secondary"
                            }`}
                          >
                            Absent
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggle(st.id, "LATE")}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                              status === "LATE"
                                ? "bg-amber-500 text-white shadow-xs"
                                : "bg-muted hover:bg-amber-50 text-text-secondary"
                            }`}
                          >
                            Late
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggle(st.id, "EXCUSED")}
                            className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                              status === "EXCUSED"
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-muted hover:bg-blue-50 text-text-secondary"
                            }`}
                          >
                            Leave
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isExcused ? (
                          <Badge className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">
                            Approved Medical Leave (#LR-104)
                          </Badge>
                        ) : status === "ABSENT" ? (
                          <span className="text-[10px] text-rose-700 font-semibold">
                            ↳ Triggers parent absence alert & classwork digest
                          </span>
                        ) : (
                          <span className="text-[10px] text-text-secondary">Normal credit (1.0)</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      </>
      )}

      {/* STAFF ATTENDANCE MONITOR VIEW */}
      {activeTab === "STAFF_MONITOR" && (
        <div className="space-y-4">
          <Card className="border-border/80 bg-surface shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Filter className="h-4 w-4 text-purple-primary" />
                    Staff Attendance Monitor & Intervention Tab — {activeSection?.className} ({activeSection?.code})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Multi-dimensional defaulter monitoring, statutory 75% attendance threshold tracking, and 1-click bulk parent broadcasts.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-secondary">Filter Preset:</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant={monitorFilter === "BELOW_75" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMonitorFilter("BELOW_75")}
                      className={`h-7 text-xs ${monitorFilter === "BELOW_75" ? "bg-amber-600 text-white" : ""}`}
                    >
                      ⚠️ Below 75%
                    </Button>
                    <Button
                      variant={monitorFilter === "ABSENT_TODAY" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMonitorFilter("ABSENT_TODAY")}
                      className={`h-7 text-xs ${monitorFilter === "ABSENT_TODAY" ? "bg-rose-600 text-white" : ""}`}
                    >
                      🔴 Absent Today
                    </Button>
                    <Button
                      variant={monitorFilter === "ALL" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMonitorFilter("ALL")}
                      className={`h-7 text-xs ${monitorFilter === "ALL" ? "bg-purple-primary text-white" : ""}`}
                    >
                      All Roster
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="text-xs font-bold text-text-secondary">
                      <TableHead className="w-16">Roll</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Admission No</TableHead>
                      <TableHead className="text-center">Cumulative (Present / Total)</TableHead>
                      <TableHead className="text-center">Rate %</TableHead>
                      <TableHead className="text-center">Compliance Status</TableHead>
                      <TableHead className="text-right">Quick Intervention</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/60">
                    {sectionStudents.map((st, i) => {
                      const totalDays = 90;
                      const presentDays = i % 4 === 0 ? 64 : i % 5 === 0 ? 61 : 84;
                      const rate = ((presentDays / totalDays) * 100).toFixed(1);
                      const numRate = parseFloat(rate);
                      const isAbsentToday = (rollCall[st.id] || "PRESENT") === "ABSENT";

                      if (monitorFilter === "BELOW_75" && numRate >= 75) return null;
                      if (monitorFilter === "ABSENT_TODAY" && !isAbsentToday) return null;

                      return (
                        <TableRow key={st.id} className="text-xs hover:bg-muted/20">
                          <TableCell className="font-mono font-bold">{st.rollNo || `#${i + 1}`}</TableCell>
                          <TableCell className="font-bold text-foreground">{st.name}</TableCell>
                          <TableCell className="font-mono text-xs text-text-secondary">{st.admissionNo || "EDP-2627-10A-000" + (i + 1)}</TableCell>
                          <TableCell className="text-center font-mono">
                            {presentDays} / {totalDays} Days
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                              numRate < 65
                                ? "bg-rose-100 text-rose-800"
                                : numRate < 75
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {rate}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {numRate < 65 ? (
                              <Badge className="bg-rose-600 text-white text-[10px]">Critical Defaulter</Badge>
                            ) : numRate < 75 ? (
                              <Badge variant="outline" className="text-amber-800 bg-amber-50 border-amber-300 text-[10px]">
                                ⚠️ Below 75% Warning
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-emerald-800 bg-emerald-50 border-emerald-300 text-[10px]">
                                Compliant
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              onClick={() => {
                                setBulkSubject(`Attendance Warning Notice — ${st.name}`);
                                setIsBulkNotifyOpen(true);
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[11px] text-purple-primary hover:bg-purple-tint"
                            >
                              <MessageSquare className="h-3.5 w-3.5 mr-1" />
                              Nudge Parent
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 1-CLICK BULK NOTIFICATION MODAL */}
      <Dialog open={isBulkNotifyOpen} onOpenChange={setIsBulkNotifyOpen}>
        <DialogContent className="max-w-md bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Mail className="h-5 w-5 text-purple-primary" />
              1-Click Bulk Attendance Notice & Remedial Trigger
            </DialogTitle>
            <DialogDescription className="text-xs">
              Broadcasts immediate automated alert via Email, WhatsApp, and In-App Portal notification to filtered students & linked parents.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Broadcast Subject / Headline</Label>
              <Input
                value={bulkSubject}
                onChange={(e) => setBulkSubject(e.target.value)}
                className="h-8 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Target Audience</Label>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                Targeting <strong>Filtered Attendance Defaulters</strong> in {activeSection?.className} ({activeSection?.code}) + Linked Guardians
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Message Body</Label>
              <textarea
                value={bulkMessageBody}
                onChange={(e) => setBulkMessageBody(e.target.value)}
                rows={4}
                className="w-full text-xs p-2.5 rounded-lg border border-input bg-background font-sans"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsBulkNotifyOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                setIsBulkNotifyOpen(false);
                alert("✓ Bulk communication successfully dispatched via Email, WhatsApp, and In-App Portal to 4 students and 4 linked parents!");
              }}
              size="sm"
              className="bg-purple-primary text-white text-xs font-semibold"
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              Dispatch Bulk Notice Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RETROACTIVE EDIT REASON MODAL */}
      <Dialog open={isRetroactiveModalOpen} onOpenChange={setIsRetroactiveModalOpen}>
        <DialogContent className="sm:max-w-md bg-surface">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <History className="h-4 w-4 text-purple-primary" />
              Retroactive Attendance Update — {selectedDate}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Modifying an attendance register after the date has passed requires a mandatory reason for the permanent audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-amber-50 rounded border border-amber-200 text-amber-900 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" /> 48-Hour Lock Window Active
              </span>
              <p className="text-[11px]">
                This update will be permanently stamped in <code>attendance_audit_logs</code> with your teacher credentials.
              </p>
            </div>
            <div>
              <label className="font-semibold text-text-secondary block mb-1">
                Mandatory Modification Reason *
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Student was attending inter-school athletics competition with physical education instructor."
                value={modificationReason}
                onChange={(e) => setModificationReason(e.target.value)}
                className="w-full text-xs rounded-md border border-input bg-surface p-2 font-medium"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsRetroactiveModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={modificationReason.trim().length < 5}
              onClick={() => executeSave(modificationReason)}
              className="bg-purple-primary text-white text-xs"
            >
              Confirm & Save Audit Trail
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV BULK IMPORT MODAL */}
      <Dialog open={isCsvModalOpen} onOpenChange={setIsCsvModalOpen}>
        <DialogContent className="sm:max-w-md bg-surface">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Upload className="h-4 w-4 text-purple-primary" />
              Bulk Import Attendance (CSV / Excel)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload biometric punches or historical register spreadsheets for {activeSection?.code || "class"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="p-4 rounded-xl border border-dashed border-border text-center space-y-2">
              <Upload className="h-6 w-6 mx-auto text-purple-primary" />
              <div>
                <span className="font-bold text-foreground">Click to upload CSV or drag and drop</span>
                <p className="text-[10px] text-text-secondary">Expected columns: roll_no, date, status, check_in</p>
              </div>
            </div>
            <div className="text-[11px] text-text-secondary">
              Dry-run validation checks for Sundays and academic holidays before committing rows.
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsCsvModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setIsCsvModalOpen(false);
                setSavedSuccess(true);
                setTimeout(() => setSavedSuccess(false), 3000);
              }}
              className="bg-purple-primary text-white text-xs"
            >
              Import 42 Records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
