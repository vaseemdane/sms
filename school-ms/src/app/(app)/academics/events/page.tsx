"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  MapPin,
  Mic2,
  Plus,
  Search,
  Sparkles,
  Trophy,
  Users,
  AlertTriangle,
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
import { useAuth } from "@/services/auth-context";

interface ProgramItem {
  id: string;
  order: number;
  title: string;
  programDate: string;
  startTime: string;
  endTime: string;
  stageVenue: string;
  inchargeName: string;
  participantsCount: number;
  status: "SCHEDULED" | "LIVE" | "COMPLETED";
}

interface SchoolEventItem {
  id: string;
  title: string;
  category: "CULTURAL_FEST" | "ANNUAL_DAY" | "SPORTS_MEET" | "SCIENCE_FAIR" | "WORKSHOP";
  startDate: string;
  endDate: string;
  primaryVenue: string;
  coordinatorName: string;
  description: string;
  status: "PUBLISHED" | "DRAFT" | "COMPLETED";
  programs: ProgramItem[];
}

const INITIAL_EVENTS: SchoolEventItem[] = [
  {
    id: "ev-1",
    title: "Annual Science & Cultural Conclave 2026",
    category: "CULTURAL_FEST",
    startDate: "2026-10-28",
    endDate: "2026-10-29",
    primaryVenue: "Campus Auditorium & Multi-Purpose Grounds",
    coordinatorName: "Mrs. Kavitha R.",
    description: "Two-day flagship school festival featuring inter-school science symposiums, theatrical productions, and classical music performances.",
    status: "PUBLISHED",
    programs: [
      {
        id: "p1",
        order: 1,
        title: "Inaugural Ceremony & Lighting of the Lamp",
        programDate: "2026-10-28",
        startTime: "09:00",
        endTime: "10:00",
        stageVenue: "Main Auditorium Stage 1",
        inchargeName: "Principal Desk",
        participantsCount: 15,
        status: "SCHEDULED",
      },
      {
        id: "p2",
        order: 2,
        title: "Senior Robotics & IoT Innovation Showcase",
        programDate: "2026-10-28",
        startTime: "10:15",
        endTime: "11:45",
        stageVenue: "Innovation Lab Hall B",
        inchargeName: "Mr. Ramesh Kumar",
        participantsCount: 24,
        status: "SCHEDULED",
      },
      {
        id: "p3",
        order: 3,
        title: "Inter-House Classical Dance Ensembles",
        programDate: "2026-10-28",
        startTime: "10:15",
        endTime: "11:45",
        stageVenue: "Main Auditorium Stage 1",
        inchargeName: "Ms. Anita V.",
        participantsCount: 32,
        status: "SCHEDULED",
      },
      {
        id: "p4",
        order: 4,
        title: "Grand Valedictory & Trophy Presentation",
        programDate: "2026-10-29",
        startTime: "15:00",
        endTime: "16:30",
        stageVenue: "Main Auditorium Stage 1",
        inchargeName: "Principal Desk",
        participantsCount: 120,
        status: "SCHEDULED",
      },
    ],
  },
  {
    id: "ev-2",
    title: "Inter-School Athletics Meet & Sprint Relays",
    category: "SPORTS_MEET",
    startDate: "2026-11-14",
    endDate: "2026-11-14",
    primaryVenue: "Olympic Synthetic Track Oval",
    coordinatorName: "Coach Balwant Singh",
    description: "Track and field championship covering 100m, 400m relay, long jump, and shot put across U-14 and U-17 divisions.",
    status: "PUBLISHED",
    programs: [
      {
        id: "p5",
        order: 1,
        title: "Torch Relay & March Past by House Captains",
        programDate: "2026-11-14",
        startTime: "08:30",
        endTime: "09:30",
        stageVenue: "Main Track Oval",
        inchargeName: "Sports Committee",
        participantsCount: 64,
        status: "SCHEDULED",
      },
      {
        id: "p6",
        order: 2,
        title: "100m Sprint Heats & Semifinals",
        programDate: "2026-11-14",
        startTime: "09:45",
        endTime: "11:30",
        stageVenue: "Main Track Oval",
        inchargeName: "Coach Balwant Singh",
        participantsCount: 48,
        status: "SCHEDULED",
      },
    ],
  },
];

export default function SchoolEventsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.userType === "super_admin";

  const [events, setEvents] = useState<SchoolEventItem[]>(INITIAL_EVENTS);
  const [selectedEventId, setSelectedEventId] = useState<string>("ev-1");
  const [toast, setToast] = useState<string | null>(null);

  // New Child Program Form State
  const [addProgramModal, setAddProgramModal] = useState(false);
  const [progTitle, setProgTitle] = useState("");
  const [progDate, setProgDate] = useState("2026-10-28");
  const [progStart, setProgStart] = useState("12:00");
  const [progEnd, setProgEnd] = useState("13:15");
  const [progVenue, setProgVenue] = useState("Main Auditorium Stage 1");
  const [progIncharge, setProgIncharge] = useState("Faculty In-Charge");
  const [progParticipants, setProgParticipants] = useState("18");

  // Venue Clash Detection
  const [clashWarning, setClashWarning] = useState<string | null>(null);

  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0];

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const toMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  // Real-Time Venue Clash Detector
  React.useEffect(() => {
    if (!addProgramModal || !selectedEvent) {
      setClashWarning(null);
      return;
    }
    const newStart = toMinutes(progStart);
    const newEnd = toMinutes(progEnd);

    if (newStart >= newEnd) {
      setClashWarning("Start time must be before end time.");
      return;
    }

    const collision = selectedEvent.programs.find((p) => {
      if (p.programDate !== progDate) return false;
      if (p.stageVenue.trim().toLowerCase() !== progVenue.trim().toLowerCase()) return false;
      const exStart = toMinutes(p.startTime);
      const exEnd = toMinutes(p.endTime);
      return newStart < exEnd && exStart < newEnd;
    });

    if (collision) {
      setClashWarning(
        `⚠️ Venue Conflict Detected: '${progVenue}' is already booked for '${collision.title}' (${collision.startTime}–${collision.endTime}).`
      );
    } else {
      setClashWarning(null);
    }
  }, [addProgramModal, progDate, progStart, progEnd, progVenue, selectedEvent]);

  const handleAddProgram = () => {
    if (!progTitle.trim() || clashWarning) return;

    const newProg: ProgramItem = {
      id: `p-${Date.now()}`,
      order: selectedEvent.programs.length + 1,
      title: progTitle,
      programDate: progDate,
      startTime: progStart,
      endTime: progEnd,
      stageVenue: progVenue,
      inchargeName: progIncharge,
      participantsCount: parseInt(progParticipants) || 10,
      status: "SCHEDULED",
    };

    setEvents((prev) =>
      prev.map((e) => {
        if (e.id === selectedEventId) {
          return {
            ...e,
            programs: [...e.programs, newProg].sort(
              (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)
            ),
          };
        }
        return e;
      })
    );

    setAddProgramModal(false);
    showToast(`Program '${progTitle}' added to event itinerary.`);
    setProgTitle("");
  };

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
            <span className="font-semibold text-purple-primary">Co-Curricular & Events</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-purple-primary" />
            Hierarchical Event & Multi-Program Itinerary Planner
          </h1>
          <p className="text-xs text-text-secondary">
            Zoho Education Management • Parent School Events with Sequential Stage Itineraries & Venue Collision Validation
          </p>
          {isSuperAdmin && (
            <Badge variant="outline" className="bg-purple-tint text-purple-primary border-purple-primary/30 text-[11px] font-medium">
              Read-Only View (Event scheduling strictly governed by Principal Desk)
            </Badge>
          )}
        </div>
      </div>

      {/* Event Selector & Overview Card */}
      <Card className="border-border/80 bg-surface shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Label className="text-xs font-bold text-foreground shrink-0">Active School Event:</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="w-80 h-9 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id} className="text-xs">
                      {e.title} ({e.startDate})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Badge className="bg-purple-primary text-white text-[11px] font-semibold">
                {selectedEvent.category.replace("_", " ")}
              </Badge>
            </div>

            {!isSuperAdmin && (
              <Button
                onClick={() => setAddProgramModal(true)}
                className="bg-purple-primary hover:bg-purple-primary/90 text-white text-xs font-semibold h-8"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                + Add Program to Itinerary
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-background/60 rounded-xl border border-border/50 text-xs">
            <div className="flex items-center gap-2 text-text-secondary">
              <Calendar className="h-4 w-4 text-purple-primary" />
              <span>Dates: <strong className="text-foreground">{selectedEvent.startDate} to {selectedEvent.endDate}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <MapPin className="h-4 w-4 text-purple-primary" />
              <span>Primary Venue: <strong className="text-foreground">{selectedEvent.primaryVenue}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <Users className="h-4 w-4 text-purple-primary" />
              <span>Overall Coordinator: <strong className="text-foreground">{selectedEvent.coordinatorName}</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sequential Program Itinerary Timeline */}
      <Card className="border-border/80 bg-surface shadow-sm">
        <CardHeader className="p-4 border-b border-border/60">
          <CardTitle className="text-sm font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-primary" />
              <span>Live Multi-Program Itinerary Timeline ({selectedEvent.programs.length} Scheduled Sessions)</span>
            </div>
            <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300 text-[10px]">
              ✓ Anti-Collision Stage Guaranteed
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-border/60">
            {selectedEvent.programs.map((prog, idx) => (
              <div key={prog.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-background/40 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center justify-center h-12 w-12 rounded-xl bg-purple-tint text-purple-primary border border-purple-primary/20 shrink-0 font-bold">
                    <span className="text-[10px] uppercase font-semibold text-text-secondary">Seq</span>
                    <span className="text-base font-extrabold leading-none">#{prog.order}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-foreground text-sm leading-tight">{prog.title}</h3>
                      <Badge variant="outline" className="text-[10px]">
                        {prog.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                      <span className="flex items-center gap-1 font-mono font-semibold text-purple-primary bg-purple-tint/60 px-2 py-0.5 rounded">
                        <Clock className="h-3 w-3" />
                        {prog.startTime} – {prog.endTime} ({prog.programDate})
                      </span>
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <MapPin className="h-3 w-3 text-text-secondary" />
                        {prog.stageVenue}
                      </span>
                      <span>• In-Charge: <strong className="text-foreground">{prog.inchargeName}</strong></span>
                      <span>• <strong className="text-foreground">{prog.participantsCount}</strong> Registered Participants</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-xs font-semibold">
                    Live Broadcast
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Program Dialog with Anti-Collision Check */}
      <Dialog open={addProgramModal} onOpenChange={setAddProgramModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Add Program to Event Itinerary</DialogTitle>
            <DialogDescription className="text-xs">
              Sequential program slots are validated in real-time against stage/venue overlaps.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Program Title</Label>
              <Input
                placeholder="e.g. Inter-House English Debate Semi-Finals"
                value={progTitle}
                onChange={(e) => setProgTitle(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Program Date</Label>
                <Input
                  type="date"
                  value={progDate}
                  onChange={(e) => setProgDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Stage / Venue</Label>
                <Select value={progVenue} onValueChange={setProgVenue}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Main Auditorium Stage 1">Main Auditorium Stage 1</SelectItem>
                    <SelectItem value="Innovation Lab Hall B">Innovation Lab Hall B</SelectItem>
                    <SelectItem value="Mini Theater Audio-Visual">Mini Theater AV</SelectItem>
                    <SelectItem value="Sports Grounds Pavilion">Sports Grounds Pavilion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Start Time (HH:MM)</Label>
                <Input
                  type="time"
                  value={progStart}
                  onChange={(e) => setProgStart(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">End Time (HH:MM)</Label>
                <Input
                  type="time"
                  value={progEnd}
                  onChange={(e) => setProgEnd(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Program In-Charge</Label>
                <Input
                  value={progIncharge}
                  onChange={(e) => setProgIncharge(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Est. Participants</Label>
                <Input
                  type="number"
                  value={progParticipants}
                  onChange={(e) => setProgParticipants(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Real-Time Clash Alert */}
            {clashWarning && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-start gap-2 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <span>{clashWarning}</span>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setAddProgramModal(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={handleAddProgram}
              disabled={!!clashWarning}
              size="sm"
              className="bg-purple-primary text-white text-xs font-semibold disabled:opacity-40"
            >
              Add to Live Itinerary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
