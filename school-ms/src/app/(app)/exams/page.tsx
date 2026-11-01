"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  ClipboardList,
  Calendar,
  CheckCircle,
  FileCheck2,
  ShieldAlert,
  ArrowRight,
  Clock,
  CalendarCheck,
  Trash2,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MOCK_EXAMS } from "@/mocks/exams-and-fees";
import { Exam } from "@/types";

interface TimetableSlot {
  slotName: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  room?: string;
}

interface ExamDay {
  date: string;
  is_holiday: boolean;
  holiday_reason?: string;
  slots: TimetableSlot[];
}

export default function ExamsListPage() {
  const [exams, setExams] = React.useState<Exam[]>(MOCK_EXAMS);
  const [sessions, setSessions] = React.useState<{ id: string; name: string; isCurrent?: boolean }[]>([]);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [formName, setFormName] = React.useState("");
  const [formTerm, setFormTerm] = React.useState<1 | 2 | 3>(1);
  const [formYear, setFormYear] = React.useState("");

  // Timetable Builder State
  const [timetableModalOpen, setTimetableModalOpen] = React.useState(false);
  const [selectedExamForTimetable, setSelectedExamForTimetable] = React.useState<Exam | null>(null);
  const [timetableDays, setTimetableDays] = React.useState<ExamDay[]>([]);
  const [isSavingTimetable, setIsSavingTimetable] = React.useState(false);

  // Auto-fetch active academic session year on component mount
  React.useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await apiClient<{ success: boolean; data: any[] }>("/academics/years");
        if (res?.data && res.data.length > 0) {
          setSessions(res.data);
          const current = res.data.find((s) => s.isCurrent) || res.data[0];
          if (current) {
            setFormYear(current.name || current.id);
          }
        }
      } catch {
        setFormYear("2026-2027");
      }
    }
    fetchSessions();
  }, []);

  const openTimetableBuilder = async (ex: Exam) => {
    setSelectedExamForTimetable(ex);
    try {
      const res = await apiClient<{ success: boolean; data: { days: ExamDay[] } }>(`/exams/${ex.id}/timetable`);
      if (res?.data?.days && res.data.days.length > 0) {
        setTimetableDays(res.data.days);
      } else {
        // Default initial dates
        setTimetableDays([
          {
            date: ex.startDate || "2026-10-05",
            is_holiday: false,
            slots: [
              { slotName: "Slot 1 (Morning)", startTime: "10:00 AM", endTime: "11:30 AM", subjectName: "Mathematics" },
              { slotName: "Slot 2 (Afternoon)", startTime: "02:00 PM", endTime: "03:30 PM", subjectName: "General Science" },
            ],
          },
          {
            date: "2026-10-06",
            is_holiday: true,
            holiday_reason: "Study Preparation Break",
            slots: [],
          },
        ]);
      }
    } catch {
      setTimetableDays([
        {
          date: ex.startDate || "2026-10-05",
          is_holiday: false,
          slots: [
            { slotName: "Slot 1", startTime: "10:00 AM", endTime: "11:30 AM", subjectName: "Core Subject" },
          ],
        },
      ]);
    }
    setTimetableModalOpen(true);
  };

  const handleSaveTimetable = async () => {
    if (!selectedExamForTimetable) return;
    try {
      setIsSavingTimetable(true);
      await apiClient(`/exams/${selectedExamForTimetable.id}/timetable`, {
        method: "PUT",
        body: JSON.stringify({ days: timetableDays, publish_notifications: true }),
      });
      setTimetableModalOpen(false);
    } catch (err: any) {
      console.error("Failed to save timetable", err);
    } finally {
      setIsSavingTimetable(false);
    }
  };

  const handleDeleteTimetable = async () => {
    if (!selectedExamForTimetable) return;
    try {
      setIsSavingTimetable(true);
      await apiClient(`/exams/${selectedExamForTimetable.id}/timetable`, {
        method: "DELETE",
      });
      setTimetableDays([]);
      setTimetableModalOpen(false);
    } catch (err: any) {
      console.error("Failed to delete timetable", err);
    } finally {
      setIsSavingTimetable(false);
    }
  };

  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    const newEx: Exam = {
      id: `ex-${Date.now()}`,
      name: formName,
      term: formTerm,
      year: formYear,
      startDate: "2025-03-01",
      endDate: "2025-03-15",
      isPublished: false,
    };
    setExams([...exams, newEx]);
    setModalOpen(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
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
            <span className="font-semibold text-purple-primary">Assessments</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-purple-primary" />
            Examination Diets & Assessments
          </h1>
          <p className="text-xs text-text-secondary">
            Manage academic term schedules, test diets, publication statuses, and marks entry windows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
            <Link href="/exams/tabulation">
              <FileCheck2 className="h-4 w-4 text-purple-primary" />
              Tabulation Sheet
            </Link>
          </Button>

          <Button
            onClick={() => setModalOpen(true)}
            size="sm"
            className="gap-1.5 bg-purple-primary text-white hover:bg-purple-primary/90 text-xs shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Examination
          </Button>
        </div>
      </div>

      {/* Exam Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map((ex) => (
          <Card key={ex.id} className="border-border hover:shadow-md transition-shadow flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-1">
                <Badge variant={ex.isPublished ? "success" : "warning"} className="text-[10px]">
                  {ex.isPublished ? "Results Published" : "Draft Diet"}
                </Badge>
                <span className="text-[11px] font-mono font-bold text-text-secondary">
                  Term {ex.term}
                </span>
              </div>
              <CardTitle className="text-base font-bold text-foreground">{ex.name}</CardTitle>
              <CardDescription className="text-xs flex items-center gap-1.5 pt-1">
                <Calendar className="h-3.5 w-3.5 text-purple-primary" />
                AY {ex.year}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pt-0">
              <div className="p-3 rounded-lg bg-warm-ivory/60 border border-border text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Start Date:</span>
                  <span className="font-medium text-foreground">{ex.startDate || "15 Sep 2024"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">End Date:</span>
                  <span className="font-medium text-foreground">{ex.endDate || "24 Sep 2024"}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-1/2 text-xs gap-1 border-purple-primary/30 text-purple-primary hover:bg-purple-tint"
                    onClick={() => openTimetableBuilder(ex)}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Timetable
                  </Button>
                  <Button asChild size="sm" className="w-1/2 text-xs bg-purple-primary text-white hover:bg-purple-primary/90">
                    <Link href="/exams/tabulation">
                      Tabulation
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Exam Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateExam}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Create Examination Diet</DialogTitle>
              <DialogDescription className="text-xs pt-1">
                Define the title, academic session, and term sequence.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="exName">Diet Title *</Label>
                <Input
                  id="exName"
                  required
                  placeholder="e.g. Term 2 Pre-Board Examination"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Term Sequence *</Label>
                <Select
                  value={String(formTerm)}
                  onValueChange={(val) => setFormTerm(Number(val) as 1 | 2 | 3)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Term 1 (First Term)</SelectItem>
                    <SelectItem value="2">Term 2 (Second Term)</SelectItem>
                    <SelectItem value="3">Term 3 (Final Board)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="year">Academic Session Year * (Auto-Defaulted Active)</Label>
                <Select value={formYear} onValueChange={setFormYear}>
                  <SelectTrigger id="year" className="text-xs">
                    <SelectValue placeholder="Select Academic Session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.length > 0 ? (
                      sessions.map((s) => (
                        <SelectItem key={s.id} value={s.name || s.id} className="text-xs">
                          {s.name} {s.isCurrent ? "(Active Session)" : ""}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="2026-2027" className="text-xs">AY 2026-2027 (Active)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-purple-primary text-white hover:bg-purple-primary/90">
                Save Examination Diet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Examination Slot & Timetable Builder Dialog */}
      <Dialog open={timetableModalOpen} onOpenChange={setTimetableModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-purple-primary" />
              Examination Slot & Timetable Builder: {selectedExamForTimetable?.name}
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Configure multi-slot exam schedules per date, toggle holidays, and broadcast schedule updates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {timetableDays.map((day, dIdx) => (
              <Card key={dIdx} className="border border-border p-3 space-y-3 bg-muted/10">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                  <div className="flex items-center gap-3">
                    <Label className="text-xs font-bold text-foreground">Exam Date:</Label>
                    <Input
                      type="date"
                      value={day.date}
                      onChange={(e) => {
                        const next = [...timetableDays];
                        next[dIdx].date = e.target.value;
                        setTimetableDays(next);
                      }}
                      className="h-7 w-36 text-xs font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        id={`holiday-${dIdx}`}
                        checked={day.is_holiday}
                        onChange={(e) => {
                          const next = [...timetableDays];
                          next[dIdx].is_holiday = e.target.checked;
                          setTimetableDays(next);
                        }}
                        className="rounded border-border text-purple-primary"
                      />
                      <Label htmlFor={`holiday-${dIdx}`} className="text-xs cursor-pointer font-medium text-amber-700 dark:text-amber-400">
                        Mark as Holiday / Off-Day
                      </Label>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setTimetableDays(timetableDays.filter((_, i) => i !== dIdx))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {day.is_holiday ? (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <span className="font-semibold">Holiday Note:</span>
                    <Input
                      placeholder="e.g. Study Preparation Day or Festival Holiday"
                      value={day.holiday_reason || ""}
                      onChange={(e) => {
                        const next = [...timetableDays];
                        next[dIdx].holiday_reason = e.target.value;
                        setTimetableDays(next);
                      }}
                      className="h-7 text-xs bg-background"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-text-secondary">Assigned Exam Slots</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] px-2"
                        onClick={() => {
                          const next = [...timetableDays];
                          next[dIdx].slots.push({
                            slotName: `Slot ${next[dIdx].slots.length + 1}`,
                            startTime: "10:00 AM",
                            endTime: "11:30 AM",
                            subjectName: "Subject",
                          });
                          setTimetableDays(next);
                        }}
                      >
                        + Add Slot
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      {day.slots.map((slot, sIdx) => (
                        <div key={sIdx} className="grid grid-cols-12 gap-2 items-center bg-background p-2 rounded border text-xs">
                          <div className="col-span-3">
                            <Input
                              value={slot.slotName}
                              placeholder="Slot Title"
                              onChange={(e) => {
                                const next = [...timetableDays];
                                next[dIdx].slots[sIdx].slotName = e.target.value;
                                setTimetableDays(next);
                              }}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              value={slot.startTime}
                              placeholder="Start"
                              onChange={(e) => {
                                const next = [...timetableDays];
                                next[dIdx].slots[sIdx].startTime = e.target.value;
                                setTimetableDays(next);
                              }}
                              className="h-7 text-xs font-mono"
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              value={slot.endTime}
                              placeholder="End"
                              onChange={(e) => {
                                const next = [...timetableDays];
                                next[dIdx].slots[sIdx].endTime = e.target.value;
                                setTimetableDays(next);
                              }}
                              className="h-7 text-xs font-mono"
                            />
                          </div>
                          <div className="col-span-4">
                            <Input
                              value={slot.subjectName}
                              placeholder="Paper / Subject"
                              onChange={(e) => {
                                const next = [...timetableDays];
                                next[dIdx].slots[sIdx].subjectName = e.target.value;
                                setTimetableDays(next);
                              }}
                              className="h-7 text-xs font-semibold"
                            />
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                const next = [...timetableDays];
                                next[dIdx].slots = next[dIdx].slots.filter((_, i) => i !== sIdx);
                                setTimetableDays(next);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs border-dashed gap-1"
              onClick={() => {
                setTimetableDays([
                  ...timetableDays,
                  {
                    date: "2026-10-07",
                    is_holiday: false,
                    slots: [
                      { slotName: "Slot 1 (Morning)", startTime: "10:00 AM", endTime: "11:30 AM", subjectName: "Core Subject" },
                    ],
                  },
                ]);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Examination Date Schedule
            </Button>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 justify-between items-center border-t pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDeleteTimetable}
              disabled={isSavingTimetable}
              className="text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              Clear Timetable
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setTimetableModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveTimetable}
                disabled={isSavingTimetable}
                className="bg-purple-primary text-white"
              >
                {isSavingTimetable ? "Publishing..." : "Publish & Notify"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
