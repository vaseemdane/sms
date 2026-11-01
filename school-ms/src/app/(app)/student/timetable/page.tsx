"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MapPin,
  User,
  Coffee,
  Check,
  Building,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSMSStore, WeekDay, CustomTimeSlot } from "@/context/sms-store";
import { useAuth } from "@/services/auth-context";

const DAYS: WeekDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function StudentTimetablePage() {
  const { user } = useAuth();
  const { sections, teachers, getTimetableBySection } = useSMSStore();

  const studentSectionId = user?.classSectionId || "sec-6a";
  const studentSection = sections.find((s) => s.id === studentSectionId);
  const timetable = getTimetableBySection(studentSectionId);

  // Active Day state
  const todayName = React.useMemo(() => {
    const d = DAYS[new Date().getDay() - 1];
    return d || "Monday";
  }, []);

  const [selectedDay, setSelectedDay] = React.useState<WeekDay>(todayName);

  // Check if slot is currently active ("NOW")
  const isSlotNow = (slot: CustomTimeSlot, day: WeekDay) => {
    if (day !== todayName) return false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = slot.startTime.split(":").map(Number);
    const [eh, em] = slot.endTime.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    return currentMinutes >= startMin && currentMinutes < endMin;
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
            <span className="font-semibold text-purple-primary">Academic Schedule</span>
            <span>/</span>
            <span className="font-semibold text-foreground">Weekly Timetable</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-purple-primary" />
            Class {studentSection?.code} Official Timetable
          </h1>
          <p className="text-xs text-text-secondary">
            Authorized weekly lecture timetable, designated classroom venues, and period timings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {timetable?.isPublished ? (
            <Badge className="bg-emerald-600 text-white text-xs px-3 py-1 gap-1.5 shadow-sm">
              <Check className="h-3.5 w-3.5" />
              Officially Published Schedule
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-xs px-3 py-1">
              Draft Pending Publication
            </Badge>
          )}
        </div>
      </div>

      {/* Timetable State Check */}
      {!timetable || !timetable.isPublished ? (
        <Card className="border-border/80 bg-surface shadow-sm">
          <CardContent className="py-20 text-center space-y-3 max-w-md mx-auto">
            <div className="h-16 w-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <Clock className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              Timetable Has Not Been Published Yet
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              School administration is finalizing the master schedule for Class {studentSection?.code || "6A"}. Once verified and published by the administration, your full weekly period timetable will immediately be accessible here.
            </p>
            <Button asChild variant="outline" size="sm" className="text-xs mt-2">
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={selectedDay} onValueChange={(val) => setSelectedDay(val as WeekDay)} className="space-y-4">
          <TabsList className="bg-muted/60 p-1 border border-border flex flex-wrap h-auto">
            {DAYS.map((day) => (
              <TabsTrigger
                key={day}
                value={day}
                className="text-xs font-semibold px-4 py-2 data-[state=active]:bg-purple-primary data-[state=active]:text-white transition-all flex items-center gap-1.5"
              >
                {day}
                {day === todayName && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {DAYS.map((day) => {
            const slots = timetable.schedule[day] || [];

            return (
              <TabsContent key={day} value={day} className="space-y-4">
                <Card className="border-border/80 bg-surface shadow-sm">
                  <CardHeader className="pb-3 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                          {day} Schedule — Class {studentSection?.code}
                          {day === todayName && (
                            <Badge className="bg-emerald-600 text-white text-[10px] ml-2">Today</Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {slots.filter((s) => s.type === "PERIOD").length} Teaching Periods • {slots.filter((s) => s.type === "BREAK").length} Recess Blocks
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Bell Timings: 08:30 – 14:35
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    {/* Mobile Period Card View (< 640px) */}
                    <div className="block sm:hidden divide-y divide-border p-3 space-y-3">
                      {slots.map((slot, idx) => {
                        const isPeriod = slot.type === "PERIOD";
                        const teacherObj = teachers.find((t) => t.id === slot.teacherId);
                        const isCurrent = isSlotNow(slot, day);

                        return (
                          <div
                            key={slot.id || idx}
                            className={`p-3 rounded-xl border space-y-2 transition-all ${
                              isCurrent
                                ? "bg-purple-tint/70 border-purple-primary shadow-xs ring-1 ring-purple-primary/40"
                                : !isPeriod
                                ? "bg-amber-50/50 border-amber-200"
                                : "bg-surface border-border/80"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`font-mono px-2 py-0.5 rounded text-xs font-bold border ${
                                  isPeriod
                                    ? "bg-purple-tint text-purple-primary border-purple-primary/20"
                                    : "bg-amber-100 text-amber-800 border-amber-300"
                                }`}
                              >
                                {slot.startTime} – {slot.endTime}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {isCurrent && (
                                  <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 animate-pulse">
                                    NOW
                                  </Badge>
                                )}
                                <Badge variant={isPeriod ? "secondary" : "outline"} className="text-[9px]">
                                  {isPeriod ? `Period ${idx}` : "Recess"}
                                </Badge>
                              </div>
                            </div>

                            <div>
                              <h4 className="text-sm font-bold text-foreground">
                                {isPeriod ? slot.subject : slot.title || "Recess Break"}
                              </h4>
                              {isPeriod && (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary mt-1">
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3 text-purple-primary" />
                                    {teacherObj?.name || "Subject Faculty"}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Building className="h-3 w-3 text-text-secondary" />
                                    {slot.room || "Room 204"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Tablet & Desktop Broadsheet Table (>= 640px) */}
                    <div className="hidden sm:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="text-xs text-text-secondary bg-muted/40">
                            <TableHead className="w-16">Period</TableHead>
                            <TableHead className="w-40">Timing Slot</TableHead>
                            <TableHead>Subject / Activity</TableHead>
                            <TableHead className="w-64">Faculty Educator</TableHead>
                            <TableHead className="w-36">Allocated Venue</TableHead>
                            <TableHead className="w-24 text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {slots.map((slot, idx) => {
                            const isPeriod = slot.type === "PERIOD";
                            const teacherObj = teachers.find((t) => t.id === slot.teacherId);
                            const isCurrent = isSlotNow(slot, day);

                            return (
                              <TableRow
                                key={slot.id || idx}
                                className={`text-xs transition-colors ${
                                  isCurrent
                                    ? "bg-purple-tint/60 font-semibold"
                                    : !isPeriod
                                    ? "bg-amber-50/40"
                                    : "hover:bg-muted/30"
                                }`}
                              >
                                <TableCell className="font-mono text-text-secondary">
                                  {isPeriod ? `P-${idx}` : "—"}
                                </TableCell>
                                <TableCell>
                                  <span className={`font-mono px-2 py-0.5 rounded text-xs font-bold border ${
                                    isPeriod
                                      ? "bg-purple-tint text-purple-primary border-purple-primary/20"
                                      : "bg-amber-100 text-amber-800 border-amber-300"
                                  }`}>
                                    {slot.startTime} – {slot.endTime}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-foreground text-sm">
                                      {isPeriod ? slot.subject : slot.title || "Recess Break"}
                                    </span>
                                    {isCurrent && (
                                      <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 animate-pulse">
                                        NOW
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {isPeriod ? (
                                    <div className="flex items-center gap-2 text-text-secondary">
                                      <User className="h-3.5 w-3.5 text-purple-primary shrink-0" />
                                      <span className="font-medium text-foreground">{teacherObj?.name || "Subject Faculty"}</span>
                                    </div>
                                  ) : (
                                    <span className="text-text-secondary text-[11px]">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    <Building className="h-3.5 w-3.5 text-text-secondary shrink-0" />
                                    <span className="font-semibold text-foreground">
                                      {slot.room || (isPeriod ? "Room 204" : "Dining Hall")}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge
                                    variant={isPeriod ? "secondary" : "outline"}
                                    className={`text-[9px] ${
                                      isPeriod ? "bg-purple-primary text-white" : "text-amber-800 border-amber-300"
                                    }`}
                                  >
                                    {isPeriod ? "Lecture" : "Break"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
