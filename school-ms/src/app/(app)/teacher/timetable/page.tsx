"use client";

import React, { useState, useMemo } from "react";
import { useSMSStore, WeekDay, CustomTimeSlot } from "@/context/sms-store";
import { useAuth } from "@/services/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, BookOpen, AlertCircle } from "lucide-react";

const DAYS_OF_WEEK: WeekDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TeacherTimetablePage() {
  const { user } = useAuth();
  const { getTeacherSchedule } = useSMSStore();
  const teacherId = user?.id || "";

  // Selected Day tab for mobile / day switcher
  const [activeDay, setActiveDay] = useState<WeekDay>("Monday");

  // Filter ONLY published periods assigned to THIS teacher
  const teacherSchedule = useMemo(() => {
    return getTeacherSchedule(teacherId);
  }, [getTeacherSchedule, teacherId]);

  // Group by day of week
  const entriesByDay = useMemo(() => {
    const map: Record<WeekDay, Array<{ sectionName: string; day: WeekDay; slot: CustomTimeSlot }>> = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
    };

    teacherSchedule.forEach((entry) => {
      const d = entry.day as WeekDay;
      if (map[d]) {
        map[d].push(entry);
      }
    });

    // Sort periods chronologically
    Object.keys(map).forEach((d) => {
      const k = d as WeekDay;
      map[k].sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
    });

    return map;
  }, [teacherSchedule]);

  const activeDayEntries = entriesByDay[activeDay] || [];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Timetable</h1>
          <p className="text-sm text-muted-foreground">
            Personal instruction schedule. Official timetable published by Super Admin.
          </p>
        </div>
        <Badge variant="outline" className="h-8 px-3 gap-1.5 self-start sm:self-auto text-xs bg-muted/30">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <span>{teacherSchedule.length} Total Weekly Periods</span>
        </Badge>
      </div>

      {/* Info notice */}
      <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3 text-xs md:text-sm text-blue-700 dark:text-blue-400">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold">Published Read-Only Roster:</span> Timetable allocation is centralized and controlled by the administration. Showing strictly your assigned teaching slots across class sections.
        </div>
      </div>

      {/* Day Selector (Mobile & Desktop quick switch) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b">
        {DAYS_OF_WEEK.map((day) => {
          const count = entriesByDay[day]?.length || 0;
          const isSelected = activeDay === day;
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`px-4 py-2 text-xs md:text-sm font-semibold rounded-md transition-all shrink-0 flex items-center gap-2 ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="capitalize">{day}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Day Schedule View (Mobile optimized cards) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 capitalize">
            <Calendar className="h-4 w-4 text-primary" />
            {activeDay} Schedule
          </h2>
          <span className="text-xs text-muted-foreground">{activeDayEntries.length} periods scheduled</span>
        </div>

        {activeDayEntries.length === 0 ? (
          <Card className="border-dashed py-12 text-center">
            <CardContent className="space-y-2">
              <Calendar className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
              <p className="font-medium text-sm text-muted-foreground">No periods scheduled for {activeDay}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeDayEntries.map((entry, idx) => {
              const { slot, sectionName } = entry;

              return (
                <Card key={slot.id || idx} className="border-l-4 border-l-primary hover:shadow-sm transition-shadow">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{slot.startTime} – {slot.endTime}</span>
                      </div>
                      <Badge variant="outline" className="text-[11px] font-mono">
                        Period {idx + 1}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold mt-1 flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      {slot.subject || "Subject"}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Instruction Slot: {slot.room || "Classroom"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="flex items-center justify-between text-xs pt-2 border-t text-muted-foreground">
                      <div className="font-semibold text-foreground">
                        Class: {sectionName}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{slot.room || "Main Wing"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Complete Weekly Grid (Desktop overview) */}
      <div className="hidden lg:block pt-6 border-t space-y-4">
        <h3 className="text-base font-bold tracking-tight">Full Weekly Grid</h3>
        <div className="border rounded-lg overflow-x-auto bg-card">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="p-3 font-semibold uppercase text-muted-foreground w-28">Day</th>
                <th className="p-3 font-semibold uppercase text-muted-foreground">Allocated Teaching Periods</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {DAYS_OF_WEEK.map((day) => {
                const daySlots = entriesByDay[day] || [];
                return (
                  <tr key={day} className="hover:bg-muted/20">
                    <td className="p-3 font-bold text-foreground align-top capitalize">
                      {day}
                    </td>
                    <td className="p-3">
                      {daySlots.length === 0 ? (
                        <span className="text-muted-foreground italic">No classes scheduled</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {daySlots.map((slotItem, sIdx) => {
                            const { slot, sectionName } = slotItem;
                            return (
                              <div
                                key={slot.id || sIdx}
                                className="px-2.5 py-1.5 rounded border bg-muted/40 text-xs flex flex-col gap-0.5"
                              >
                                <span className="font-bold text-foreground">
                                  {sectionName} • {slot.subject}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {slot.startTime} - {slot.endTime} ({slot.room || "Main"})
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
