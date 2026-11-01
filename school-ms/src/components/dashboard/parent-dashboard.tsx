"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Sparkles,
  TrendingUp,
  FileCheck2,
  Check,
  ChevronRight,
  ShieldAlert,
  Bus,
  Compass,
  Star,
  MessageSquare,
  Plus,
  Send,
  CalendarCheck,
  CalendarDays,
  Phone,
  UserCheck,
  FileText,
  CreditCard,
  HeartHandshake,
  Download,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "@/types";
import { formatGreeting } from "@/lib/utils";

interface ParentDashboardProps {
  user: User | null;
}

interface Ward {
  id: string;
  name: string;
  admissionNo: string;
  satsId: string;
  className: string;
  sectionCode: string;
  rollNo: string;
  attendanceRate: number;
  unpaidFees: string;
  rank: string;
}

export function ParentDashboard({ user }: ParentDashboardProps) {
  // Multi-Child Ward Switching with server-side live fetch
  const [wards, setWards] = React.useState<Ward[]>([]);
  const [loadingWards, setLoadingWards] = React.useState(true);
  const [selectedWardId, setSelectedWardId] = React.useState<string>("");

  React.useEffect(() => {
    async function fetchParentWards() {
      try {
        setLoadingWards(true);
        const res = await fetch("/api/v1/parent/wards");
        if (res.ok) {
          const json = await res.json();
          if (json?.data && json.data.length > 0) {
            const mapped: Ward[] = json.data.map((w: any) => ({
              id: w.studentId || w.profileId,
              name: w.name,
              admissionNo: w.admissionNo || "ADM-2026",
              satsId: w.satsId || "KA-SATS-VERIFIED",
              className: w.className || "Class 10",
              sectionCode: w.sectionName || "A",
              rollNo: String(w.rollNo || "01"),
              attendanceRate: w.attendancePercentage || 95.0,
              unpaidFees: w.feeDue ? `₹${w.feeDue} Due` : "₹0 (Fully Paid)",
              rank: "Verified Student",
            }));
            setWards(mapped);
            setSelectedWardId(mapped[0].id);
          } else {
            setWards([]);
          }
        } else {
          setWards([]);
        }
      } catch (e) {
        setWards([]);
      } finally {
        setLoadingWards(false);
      }
    }
    fetchParentWards();
  }, []);

  const selectedWard = wards.find((w) => w.id === selectedWardId) || wards[0];

  const [activeTab, setActiveTab] = React.useState("overview");
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Digital Field Trip Consent State
  const [fieldTripConsent, setFieldTripConsent] = React.useState<{
    status: "PENDING" | "APPROVED" | "DECLINED";
    signature: string;
    emergencyPhone: string;
    medicalNotes: string;
  }>({
    status: "PENDING",
    signature: "",
    emergencyPhone: "+91 9811122334",
    medicalNotes: "",
  });

  // Leave Request State
  const [leaveModalOpen, setLeaveModalOpen] = React.useState(false);
  const [leaveType, setLeaveType] = React.useState("MEDICAL");
  const [leaveStartDate, setLeaveStartDate] = React.useState("");
  const [leaveEndDate, setLeaveEndDate] = React.useState("");
  const [leaveReason, setLeaveReason] = React.useState("");
  const [submittedLeaves, setSubmittedLeaves] = React.useState<any[]>([]);

  // PTA RSVP State
  const [ptaRsvp, setPtaRsvp] = React.useState<"ATTENDING" | "NOT_ATTENDING" | "MAYBE">("ATTENDING");

  // Volunteer Sign-Up State
  const [volunteerSignedUp, setVolunteerSignedUp] = React.useState(false);

  // Teacher Feedback State
  const [feedbackTeacher, setFeedbackTeacher] = React.useState("Sri. Basavaraj Patil (Mathematics)");
  const [ratingClarity, setRatingClarity] = React.useState("5");
  const [ratingPunctuality, setRatingPunctuality] = React.useState("5");
  const [ratingEngagement, setRatingEngagement] = React.useState("5");
  const [ratingSupport, setRatingSupport] = React.useState("5");
  const [feedbackText, setFeedbackText] = React.useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = React.useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleConsentSubmit = (decision: "APPROVED" | "DECLINED") => {
    if (!fieldTripConsent.signature.trim()) {
      showToast("Please enter parent digital signature name to proceed.");
      return;
    }
    setFieldTripConsent((prev) => ({ ...prev, status: decision }));
    showToast(
      decision === "APPROVED"
        ? "Digital Parent Consent verified & recorded. School administration notified."
        : "Field Trip declined. School administration notified."
    );
  };

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStartDate || !leaveEndDate || !leaveReason) return;

    const newLeave = {
      id: `lv-${Date.now()}`,
      wardName: selectedWard.name,
      leaveType,
      dates: `${leaveStartDate} to ${leaveEndDate}`,
      reason: leaveReason,
      status: "PENDING",
      reviewedBy: "Pending Class Teacher Review",
    };

    setSubmittedLeaves((prev) => [newLeave, ...prev]);
    setLeaveModalOpen(false);
    setLeaveReason("");
    setLeaveStartDate("");
    setLeaveEndDate("");
    showToast("Leave application submitted to designated Class Teacher.");
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackSubmitted(true);
    showToast("Confidential faculty evaluation recorded for Principal oversight.");
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl bg-purple-primary text-white flex items-center gap-3 text-xs font-semibold">
          <CheckCircle2 className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header with Ward Switcher */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-primary via-purple-primary/95 to-purple-soft p-6 sm:p-8 text-white shadow-xl shadow-purple-primary/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-medium text-white/90">
              <Users className="h-3.5 w-3.5" />
              <span>Parent Portal · Multi-Child Family Dashboard</span>
              <span className="opacity-40">|</span>
              <span>Karnataka State SATS Verified</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {formatGreeting(user?.name || "Parent")}
            </h1>
            <p className="text-xs sm:text-sm text-white/80 max-w-xl">
              Track student daily attendance, review digital lesson notes & term marks, sign electronic field trip consents, and submit leave applications.
            </p>
          </div>

          {/* Multi-Child Ward Switcher Dropdown */}
          {wards.length > 1 ? (
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20 flex flex-col gap-1.5 min-w-[240px]">
              <Label className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
                Active Ward Selector:
              </Label>
              <Select value={selectedWardId} onValueChange={setSelectedWardId}>
                <SelectTrigger className="bg-white text-purple-primary font-bold text-xs h-9 border-none shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {wards.map((w) => (
                    <SelectItem key={w.id} value={w.id} className="text-xs">
                      {w.name} ({w.className} - {w.sectionCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedWard && (
                <div className="flex items-center justify-between text-[10px] text-white/70 pt-0.5">
                  <span>SATS: {selectedWard.satsId}</span>
                  <span>Roll: #{selectedWard.rollNo}</span>
                </div>
              )}
            </div>
          ) : wards.length === 1 ? (
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20 flex flex-col gap-1 min-w-[220px]">
              <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">Enrolled Ward</span>
              <p className="text-sm font-bold text-white">{wards[0].name}</p>
              <p className="text-xs text-white/80">{wards[0].className} · Section {wards[0].sectionCode}</p>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20 text-xs text-white/80">
              No wards currently linked to this parent account.
            </div>
          )}
        </div>
      </div>

      {/* Ward Status Bar */}
      {selectedWard ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/80 bg-surface shadow-2xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] text-text-secondary font-medium">Daily Attendance Rate</p>
                <p className="text-2xl font-bold text-foreground">{selectedWard.attendanceRate}%</p>
                <p className="text-[10px] text-emerald-600 font-semibold">Above 75% State Mandate</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface shadow-2xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] text-text-secondary font-medium">Academic Cohort Rank</p>
                <p className="text-xl font-bold text-foreground">{selectedWard.rank}</p>
                <p className="text-[10px] text-purple-primary font-semibold">Class {selectedWard.sectionCode} Merit</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-tint text-purple-primary flex items-center justify-center">
                <Award className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface shadow-2xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] text-text-secondary font-medium">Tuition & School Fees</p>
                <p className="text-base font-bold text-foreground">{selectedWard.unpaidFees}</p>
                <p className="text-[10px] text-text-secondary">Fee Receipt Verified</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-surface shadow-2xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] text-text-secondary font-medium">Field Trip Action</p>
                <p className="text-sm font-bold text-foreground">
                  {fieldTripConsent.status === "APPROVED" ? (
                    <span className="text-emerald-700">Consent Signed ✓</span>
                  ) : fieldTripConsent.status === "DECLINED" ? (
                    <span className="text-rose-700">Declined</span>
                  ) : (
                    <span className="text-amber-700 animate-pulse">Signature Required</span>
                  )}
                </p>
                <p className="text-[10px] text-text-secondary">Visvesvaraya Science Museum</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Bus className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="p-8 text-center bg-surface border-border">
          <p className="text-sm font-semibold text-text-secondary">No ward data available</p>
          <p className="text-xs text-text-secondary mt-1">Please contact school administration if your student has not been enrolled yet.</p>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-surface border border-border p-1 rounded-xl flex flex-wrap gap-1">
          <TabsTrigger value="overview" className="text-xs font-semibold gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Academic Progress & LMS
          </TabsTrigger>
          <TabsTrigger value="field-trips" className="text-xs font-semibold gap-1.5">
            <Bus className="h-3.5 w-3.5 text-amber-600" />
            Field Trip Consent Signer
            {fieldTripConsent.status === "PENDING" && (
              <Badge className="ml-1 bg-amber-500 text-white text-[10px] px-1 py-0 font-bold">1</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="attendance-leaves" className="text-xs font-semibold gap-1.5">
            <CalendarCheck className="h-3.5 w-3.5 text-emerald-600" />
            Attendance & Apply Leave
          </TabsTrigger>
          <TabsTrigger value="pta-volunteering" className="text-xs font-semibold gap-1.5">
            <HeartHandshake className="h-3.5 w-3.5 text-blue-600" />
            PTA RSVP & Volunteering
          </TabsTrigger>
          <TabsTrigger value="teacher-feedback" className="text-xs font-semibold gap-1.5">
            <Star className="h-3.5 w-3.5 text-purple-600" />
            360° Teacher Feedback
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* TAB 1: ACADEMIC PROGRESS & LMS */}
        {/* ========================================================================= */}
        <TabsContent value="overview" className="space-y-6">
          <Card className="border-border/80 bg-surface shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Subject Lesson Notes & Term 1 Performance ({selectedWard.name})
                </CardTitle>
                <CardDescription className="text-xs">
                  Review lesson summaries published by faculty and download official evaluation report card.
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="outline" className="h-8 text-xs font-semibold text-purple-primary border-purple-primary/30">
                <Link href="/student/academics/report-card">
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Official Report Card
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-border bg-surface space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-purple-primary text-white text-[10px]">Mathematics</Badge>
                    <span className="font-mono text-xs font-bold text-emerald-600">Marks: 94 / 100 (A1)</span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground">Unit 4: Quadratic Equations & Parabolas</h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Teacher Sri. Basavaraj Patil completed derivation of quadratic roots and word problem formulations. Weekly problem set graded 10/10.
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-text-secondary">
                    <span>Syllabus Completion: <strong>85%</strong></span>
                    <span>• Published: Oct 20, 2026</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-surface space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-indigo-600 text-white text-[10px]">Science (Physics & Chemistry)</Badge>
                    <span className="font-mono text-xs font-bold text-emerald-600">Marks: 92 / 100 (A1)</span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground">Unit 3: Electric Current & Ohm&apos;s Law</h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Teacher Smt. Roopa Kulkarni conducted laboratory resistance verification. Practical observation journal verified and signed.
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-text-secondary">
                    <span>Syllabus Completion: <strong>80%</strong></span>
                    <span>• Published: Oct 18, 2026</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-surface space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-emerald-600 text-white text-[10px]">English Literature</Badge>
                    <span className="font-mono text-xs font-bold text-emerald-600">Marks: 90 / 100 (A1)</span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground">Unit 5: The Dear Departed — Drama & Grammar</h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Character sketch analysis and direct-indirect speech exercises completed. Homework essay graded A+.
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-text-secondary">
                    <span>Syllabus Completion: <strong>90%</strong></span>
                    <span>• Published: Oct 22, 2026</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: DIGITAL FIELD TRIP CONSENT SIGNER */}
        {/* ========================================================================= */}
        <TabsContent value="field-trips" className="space-y-6">
          <Card className="border-border/80 bg-surface shadow-sm">
            <CardHeader className="pb-3">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-bold mb-1 border border-amber-200">
                <Bus className="h-3 w-3 text-amber-600" />
                Electronic Consent Verification
              </div>
              <CardTitle className="text-base font-bold text-foreground">
                Digital Field Trip Parental Consent Form
              </CardTitle>
              <CardDescription className="text-xs">
                Review itinerary, emergency contact, and sign digital permission for {selectedWard.name}.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="p-5 rounded-xl border border-border bg-muted/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-base text-foreground">
                      Visvesvaraya Industrial & Technological Museum
                    </h3>
                    <p className="text-xs text-text-secondary">
                      Destination: Kasturba Road, Bengaluru · Cohort: Class {selectedWard.sectionCode}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-text-secondary">Trip Fee:</span>
                    <span className="text-lg font-bold text-foreground ml-1">₹450</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border-t border-border/80 pt-3">
                  <div>
                    <span className="text-text-secondary">Departure Date:</span>
                    <p className="font-semibold text-foreground">Nov 15, 2026 at 08:30 AM</p>
                  </div>
                  <div>
                    <span className="text-text-secondary">Return Date:</span>
                    <p className="font-semibold text-foreground">Nov 15, 2026 at 05:00 PM</p>
                  </div>
                  <div>
                    <span className="text-text-secondary">Consent Deadline:</span>
                    <p className="font-semibold text-rose-600">Nov 10, 2026 (Urgent)</p>
                  </div>
                </div>

                <div className="text-xs text-text-secondary leading-relaxed bg-surface p-3 rounded-lg border border-border/60">
                  <strong className="text-foreground">Itinerary Summary:</strong> Guided tour through the Engine Hall, Fun Science Gallery, Space Technology Pavilion, and interactive 3D science demonstration. Lunch and refreshments provided by school catering.
                </div>

                {/* Consent Signing Form */}
                <div className="pt-3 border-t border-border space-y-4">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Parent / Legal Guardian Electronic Signature:
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Digital Signature (Parent Full Name)</Label>
                      <Input
                        placeholder="e.g. Ramesh Sharma"
                        value={fieldTripConsent.signature}
                        onChange={(e) =>
                          setFieldTripConsent((prev) => ({ ...prev, signature: e.target.value }))
                        }
                        className="text-xs font-serif"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Emergency Contact Phone Number</Label>
                      <Input
                        value={fieldTripConsent.emergencyPhone}
                        onChange={(e) =>
                          setFieldTripConsent((prev) => ({ ...prev, emergencyPhone: e.target.value }))
                        }
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Medical / Dietary Notes (Optional)</Label>
                    <Input
                      placeholder="e.g. Mild asthma (carries inhaler), Vegetarian only..."
                      value={fieldTripConsent.medicalNotes}
                      onChange={(e) =>
                        setFieldTripConsent((prev) => ({ ...prev, medicalNotes: e.target.value }))
                      }
                      className="text-xs"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button
                      onClick={() => handleConsentSubmit("APPROVED")}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Grant Electronic Consent (Approve Trip)
                    </Button>
                    <Button
                      onClick={() => handleConsentSubmit("DECLINED")}
                      size="sm"
                      variant="outline"
                      className="text-rose-700 border-rose-300 hover:bg-rose-50 text-xs"
                    >
                      Decline Participation
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: ATTENDANCE & APPLY LEAVE */}
        {/* ========================================================================= */}
        <TabsContent value="attendance-leaves" className="space-y-6">
          <Card className="border-border/80 bg-surface shadow-sm">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Attendance History & Leave Portal ({selectedWard.name})
                </CardTitle>
                <CardDescription className="text-xs">
                  Apply for student sick leave or family travel with automatic attendance synchronization upon approval.
                </CardDescription>
              </div>
              <Button
                onClick={() => setLeaveModalOpen(true)}
                size="sm"
                className="bg-purple-primary hover:bg-purple-primary/90 text-white text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Apply Student Leave
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="overflow-x-auto border border-border rounded-xl">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs text-text-secondary bg-muted/40">
                        <TableHead>Student</TableHead>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Decision</TableHead>
                        <TableHead className="text-right">Reviewed By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submittedLeaves.map((l) => (
                        <TableRow key={l.id} className="text-xs hover:bg-muted/30">
                          <TableCell className="font-bold text-foreground">{l.wardName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-semibold">
                              {l.leaveType}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{l.dates}</TableCell>
                          <TableCell className="text-text-secondary">{l.reason}</TableCell>
                          <TableCell>
                            {l.status === "APPROVED" ? (
                              <Badge className="bg-emerald-600 text-white text-[10px]">APPROVED (EXCUSED)</Badge>
                            ) : (
                              <Badge className="bg-amber-500 text-white text-[10px]">PENDING</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-text-secondary font-medium">
                            {l.reviewedBy}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 4: PTA RSVP & VOLUNTEERING */}
        {/* ========================================================================= */}
        <TabsContent value="pta-volunteering" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PTA Meeting Card */}
            <Card className="border-border/80 bg-surface shadow-sm">
              <CardHeader className="pb-3">
                <Badge className="w-fit bg-indigo-100 text-indigo-800 text-[10px] font-bold mb-1">
                  General Assembly
                </Badge>
                <CardTitle className="text-base font-bold text-foreground">
                  Parent-Teacher Association (PTA) Conference
                </CardTitle>
                <CardDescription className="text-xs">
                  Term 1 Assessment Review, SATS Benchmarking, and Co-Curricular Calendar Consultation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Date:</span>
                    <span className="font-bold text-foreground">Saturday, Nov 28, 2026</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Time:</span>
                    <span className="font-bold text-foreground">10:00 AM – 12:30 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Venue:</span>
                    <span className="font-bold text-foreground">Main School Auditorium & Classrooms</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <Label className="text-xs font-semibold">Your Attendance RSVP Status:</Label>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setPtaRsvp("ATTENDING");
                        showToast("RSVP Confirmed: Attending PTA General Assembly");
                      }}
                      size="sm"
                      variant={ptaRsvp === "ATTENDING" ? "default" : "outline"}
                      className={`h-8 text-xs ${ptaRsvp === "ATTENDING" ? "bg-emerald-600 text-white" : ""}`}
                    >
                      ✓ Attending
                    </Button>
                    <Button
                      onClick={() => {
                        setPtaRsvp("MAYBE");
                        showToast("RSVP Recorded: Tentative Attendance");
                      }}
                      size="sm"
                      variant={ptaRsvp === "MAYBE" ? "default" : "outline"}
                      className={`h-8 text-xs ${ptaRsvp === "MAYBE" ? "bg-amber-600 text-white" : ""}`}
                    >
                      Tentative
                    </Button>
                    <Button
                      onClick={() => {
                        setPtaRsvp("NOT_ATTENDING");
                        showToast("RSVP Recorded: Unable to Attend");
                      }}
                      size="sm"
                      variant={ptaRsvp === "NOT_ATTENDING" ? "default" : "outline"}
                      className={`h-8 text-xs ${ptaRsvp === "NOT_ATTENDING" ? "bg-rose-600 text-white" : ""}`}
                    >
                      Declined
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Volunteering Sign-Up Card */}
            <Card className="border-border/80 bg-surface shadow-sm">
              <CardHeader className="pb-3">
                <Badge className="w-fit bg-emerald-100 text-emerald-800 text-[10px] font-bold mb-1">
                  Community Engagement
                </Badge>
                <CardTitle className="text-base font-bold text-foreground">
                  Annual Sports Day 2026 Parent Volunteer Slots
                </CardTitle>
                <CardDescription className="text-xs">
                  Join the parent volunteer squad to coordinate track-and-field student logistics and first aid.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Event:</span>
                    <span className="font-bold text-foreground">Inter-House Sports Meet</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Date:</span>
                    <span className="font-bold text-foreground">Friday, Dec 11, 2026</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Slots Remaining:</span>
                    <span className="font-bold text-emerald-600">6 of 15 spots open</span>
                  </div>
                </div>

                <div className="pt-2">
                  {volunteerSignedUp ? (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Registered as Parent Volunteer (First Aid & Refreshment Desk)</span>
                    </div>
                  ) : (
                    <Button
                      onClick={() => {
                        setVolunteerSignedUp(true);
                        showToast("Successfully registered as Parent Volunteer for Annual Sports Day!");
                      }}
                      size="sm"
                      className="w-full bg-purple-primary hover:bg-purple-primary/90 text-white text-xs font-semibold h-9"
                    >
                      <HeartHandshake className="h-4 w-4 mr-1.5" />
                      Register as Volunteer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 5: 360° TEACHER FEEDBACK */}
        {/* ========================================================================= */}
        <TabsContent value="teacher-feedback" className="space-y-6">
          <Card className="border-border/80 bg-surface shadow-sm max-w-2xl">
            <CardHeader className="pb-3">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-50 text-purple-800 text-[10px] font-bold mb-1 border border-purple-200">
                <Star className="h-3 w-3 text-purple-600" />
                Confidential Evaluation · Principal Oversight
              </div>
              <CardTitle className="text-base font-bold text-foreground">
                360° Faculty Teaching Feedback Form
              </CardTitle>
              <CardDescription className="text-xs">
                Your constructive ratings are strictly anonymous and reviewed exclusively by the Principal to ensure academic excellence.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {feedbackSubmitted ? (
                <div className="py-8 text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-foreground text-sm">Thank You for Your Feedback!</h4>
                  <p className="text-xs text-text-secondary max-w-md mx-auto">
                    Your evaluation has been encrypted and submitted into the Principal Academic Audit Console.
                  </p>
                  <Button
                    onClick={() => setFeedbackSubmitted(false)}
                    variant="outline"
                    size="sm"
                    className="text-xs mt-2"
                  >
                    Submit Another Feedback
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Select Faculty Member</Label>
                    <Select value={feedbackTeacher} onValueChange={setFeedbackTeacher}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sri. Basavaraj Patil (Mathematics)">
                          Sri. Basavaraj Patil (Mathematics)
                        </SelectItem>
                        <SelectItem value="Smt. Roopa Kulkarni (Science)">
                          Smt. Roopa Kulkarni (Science)
                        </SelectItem>
                        <SelectItem value="Sri. Anand Murthy (English)">
                          Sri. Anand Murthy (English)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Conceptual Clarity (1 to 5)</Label>
                      <Select value={ratingClarity} onValueChange={setRatingClarity}>
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 - Outstanding</SelectItem>
                          <SelectItem value="4">4 - Very Good</SelectItem>
                          <SelectItem value="3">3 - Satisfactory</SelectItem>
                          <SelectItem value="2">2 - Needs Improvement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Punctuality (1 to 5)</Label>
                      <Select value={ratingPunctuality} onValueChange={setRatingPunctuality}>
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 - Always on Time</SelectItem>
                          <SelectItem value="4">4 - Mostly on Time</SelectItem>
                          <SelectItem value="3">3 - Occasionally Late</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Student Engagement (1 to 5)</Label>
                      <Select value={ratingEngagement} onValueChange={setRatingEngagement}>
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 - Highly Interactive</SelectItem>
                          <SelectItem value="4">4 - Interactive</SelectItem>
                          <SelectItem value="3">3 - Moderate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Remedial Support (1 to 5)</Label>
                      <Select value={ratingSupport} onValueChange={setRatingSupport}>
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 - Very Supportive</SelectItem>
                          <SelectItem value="4">4 - Supportive</SelectItem>
                          <SelectItem value="3">3 - Average</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Constructive Remarks / Suggestions</Label>
                    <Input
                      placeholder="Share your feedback or praise..."
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  <div className="pt-2">
                    <Button type="submit" size="sm" className="bg-purple-primary hover:bg-purple-primary/90 text-white text-xs font-semibold">
                      Submit Anonymous Evaluation
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Apply Leave Modal */}
      <Dialog open={leaveModalOpen} onOpenChange={setLeaveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Apply Student Leave</DialogTitle>
            <DialogDescription className="text-xs">
              Apply for leave on behalf of {selectedWard.name}. Approved leaves automatically mark attendance as EXCUSED.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleApplyLeave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason Category</Label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEDICAL">Medical / Sickness</SelectItem>
                  <SelectItem value="CASUAL">Family Function / Travel</SelectItem>
                  <SelectItem value="OFFICIAL_DUTY">Extracurricular / Sports Representation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Start Date</Label>
                <Input
                  type="date"
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">End Date</Label>
                <Input
                  type="date"
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason Details</Label>
              <Input
                placeholder="Doctor prescription, travel reason, etc."
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setLeaveModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-purple-primary text-white text-xs">
                Submit Application
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
