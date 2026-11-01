"use client";

import * as React from "react";
import {
  UserCheck,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowUpDown,
  Filter,
  GraduationCap,
  Trash2,
  Eye,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Home,
  ShieldCheck,
  HeartPulse,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/services/auth-context";

interface AcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
}

interface StreamItem {
  id: string;
  name: string;
  code: string;
}

interface SectionItem {
  id: string;
  classId: string;
  streamId?: string;
  streamName?: string;
  name: string;
  code: string;
  capacity: number;
}

interface ClassItem {
  id: string;
  name: string;
  hasStreams: boolean;
  sections: SectionItem[];
}

interface EnrollmentRecord {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  academicYearId: string;
  academicYearName: string;
  classId: string;
  className: string;
  streamId?: string;
  streamName?: string;
  sectionId: string;
  sectionCode: string;
  rollNumber?: string;
  status: string;

  // Registration & Personal Details
  dob?: string;
  gender?: string;
  bloodGroup?: string;
  phone?: string;
  email?: string;
  address?: string;
  state?: string;
  district?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  dormId?: string;
  dormRoomNo?: string;
}

export default function EnrollmentsManagerPage() {
  const { user } = useAuth();
  const isAdmin = user?.userType === "super_admin" || user?.userType === "admin";

  const [years, setYears] = React.useState<AcademicYear[]>([]);
  const [classes, setClasses] = React.useState<ClassItem[]>([]);
  const [streams, setStreams] = React.useState<StreamItem[]>([]);
  const [enrollments, setEnrollments] = React.useState<EnrollmentRecord[]>([]);

  // Filters
  const [selectedYearId, setSelectedYearId] = React.useState<string>("");
  const [selectedClassId, setSelectedClassId] = React.useState<string>("all");
  const [selectedStreamId, setSelectedStreamId] = React.useState<string>("all");
  const [selectedSectionId, setSelectedSectionId] = React.useState<string>("all");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [recalculating, setRecalculating] = React.useState(false);

  // Student Deletion State
  const [deletingRecord, setDeletingRecord] = React.useState<EnrollmentRecord | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Student Details Modal State
  const [selectedStudent, setSelectedStudent] = React.useState<EnrollmentRecord | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  // Initial structure fetch
  React.useEffect(() => {
    async function loadMeta() {
      try {
        setLoading(true);
        const [yRes, cRes, sRes] = await Promise.all([
          apiClient<{ success: boolean; data: AcademicYear[] }>("/academics/years"),
          apiClient<{ success: boolean; data: ClassItem[] }>("/academics/classes"),
          apiClient<{ success: boolean; data: StreamItem[] }>("/academics/streams"),
        ]);
        if (yRes && yRes.data) {
          setYears(yRes.data);
          const curr = yRes.data.find((y) => y.isCurrent) || yRes.data[0];
          if (curr) setSelectedYearId(curr.id);
        }
        if (cRes && cRes.data) setClasses(cRes.data);
        if (sRes && sRes.data) setStreams(sRes.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load academic structure.");
      } finally {
        setLoading(false);
      }
    }
    loadMeta();
  }, []);

  // Fetch enrollments on filter change
  const fetchEnrollments = React.useCallback(async () => {
    if (!selectedYearId) return;
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = { academic_year_id: selectedYearId };
      if (selectedClassId !== "all") params.class_id = selectedClassId;
      if (selectedStreamId !== "all") params.stream_id = selectedStreamId;
      if (selectedSectionId !== "all") params.section_id = selectedSectionId;

      const res = await apiClient<{ success: boolean; data: EnrollmentRecord[] }>("/academics/enrollments", {
        params,
      });
      if (res && res.data) {
        setEnrollments(res.data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load enrollments.");
    } finally {
      setLoading(false);
    }
  }, [selectedYearId, selectedClassId, selectedStreamId, selectedSectionId]);

  React.useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  // Dependent dropdowns
  const currentClassObj = classes.find((c) => c.id === selectedClassId);
  const availableSections = currentClassObj
    ? currentClassObj.sections.filter((s) => {
        if (currentClassObj.hasStreams && selectedStreamId !== "all") {
          return s.streamId === selectedStreamId;
        }
        return true;
      })
    : [];

  const handleRecalculateRollNumbers = async () => {
    if (selectedSectionId === "all") {
      alert("Please select a specific section to recalculate alphabetical roll numbers.");
      return;
    }
    if (!confirm("This will sort all active students in this section by Name (A-Z) and re-assign roll numbers 1, 2, 3... Proceed?")) {
      return;
    }
    try {
      setRecalculating(true);
      setError(null);
      await apiClient(`/academics/sections/${selectedSectionId}/recalculate-roll-numbers`, {
        method: "POST",
        body: JSON.stringify({
          sectionId: selectedSectionId,
          academicYearId: selectedYearId,
        }),
      });
      setSuccessMsg("Roll numbers recalculated alphabetically.");
      fetchEnrollments();
    } catch (err: any) {
      setError(err?.message || "Failed to recalculate roll numbers.");
    } finally {
      setRecalculating(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!deletingRecord) return;
    try {
      setIsDeleting(true);
      setError(null);
      await apiClient(`/academics/enrollments/${deletingRecord.id}`, {
        method: "DELETE",
      });
      setSuccessMsg(`Student '${deletingRecord.studentName}' removed successfully.`);
      setDeletingRecord(null);
      fetchEnrollments();
    } catch (err: any) {
      setError(err?.message || "Failed to delete student record.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-xl border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Academic Enrollment & Roll Numbers</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Dependent hierarchy: Session → Class → Stream (where applicable) → Section → Student Enrollment.
          </p>
        </div>
        {isAdmin && selectedSectionId !== "all" && (
          <Button
            variant="outline"
            onClick={handleRecalculateRollNumbers}
            disabled={recalculating}
            className="gap-2 border-primary/50 text-primary hover:bg-primary/5"
          >
            <ArrowUpDown className={`h-4 w-4 ${recalculating ? "animate-spin" : ""}`} />
            Recalculate Roll Numbers (A-Z)
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {/* Dependent Hierarchy Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* 1. Academic Session */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                1. Academic Session
              </Label>
              <Select value={selectedYearId} onValueChange={setSelectedYearId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Session" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y.id} value={y.id}>
                      {y.name} {y.isCurrent ? "(Current)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Class / Grade */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                2. Class / Grade
              </Label>
              <Select
                value={selectedClassId}
                onValueChange={(val) => {
                  setSelectedClassId(val);
                  setSelectedStreamId("all");
                  setSelectedSectionId("all");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.hasStreams ? "(Streams)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Stream (Only enabled if class hasStreams) */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                3. Stream (11th/12th)
              </Label>
              <Select
                disabled={!currentClassObj?.hasStreams}
                value={selectedStreamId}
                onValueChange={(val) => {
                  setSelectedStreamId(val);
                  setSelectedSectionId("all");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={currentClassObj?.hasStreams ? "All Streams" : "N/A for Class"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Streams</SelectItem>
                  {streams.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4. Section */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                4. Section
              </Label>
              <Select
                disabled={selectedClassId === "all"}
                value={selectedSectionId}
                onValueChange={setSelectedSectionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {availableSections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Enrolled Students ({enrollments.length})</CardTitle>
            <CardDescription>
              Official student roster assigned to academic session, class, stream, and section with roll numbers.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchEnrollments} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll No.</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Admission No.</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Stream</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 9 : 8} className="text-center py-8 text-muted-foreground">
                    No active student enrollments found matching criteria.
                  </TableCell>
                </TableRow>
              )}
              {enrollments.map((enr) => (
                <TableRow key={enr.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono font-bold text-xs bg-muted">
                      {enr.rollNumber || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudent(enr);
                        setDetailsOpen(true);
                      }}
                      className="font-semibold text-purple-primary hover:underline text-left cursor-pointer flex items-center gap-1.5 group transition-colors"
                      title="Click to view student registration & admission details"
                    >
                      <span>{enr.studentName}</span>
                      <Eye className="h-3.5 w-3.5 text-purple-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {enr.admissionNumber}
                  </TableCell>
                  <TableCell className="text-sm">{enr.academicYearName}</TableCell>
                  <TableCell className="font-medium">{enr.className}</TableCell>
                  <TableCell>
                    {enr.streamName ? (
                      <Badge variant="default" className="bg-indigo-600 text-white text-[11px]">
                        {enr.streamName}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {enr.sectionCode}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                      {enr.status}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedStudent(enr);
                            setDetailsOpen(true);
                          }}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-purple-primary hover:bg-purple-tint/50"
                          title="View Registration Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingRecord(enr)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Delete Student"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Deleting Student */}
      <Dialog open={Boolean(deletingRecord)} onOpenChange={(open) => !open && setDeletingRecord(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Student
            </DialogTitle>
            <DialogDescription className="text-sm pt-2">
              Are you sure you want to delete student <strong>{deletingRecord?.studentName}</strong> (Admission No:{" "}
              <strong>{deletingRecord?.admissionNumber}</strong>, Roll No:{" "}
              <strong>{deletingRecord?.rollNumber || "N/A"}</strong>)?
              <br />
              <span className="text-xs text-muted-foreground block mt-2">
                This removes their academic enrollment and portal account. This action cannot be undone.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingRecord(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteStudent}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Registration & Academic Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white p-6 rounded-t-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-white/30 shadow-md">
                  <AvatarFallback className="bg-white/20 text-white font-extrabold text-xl">
                    {selectedStudent?.studentName.slice(0, 2).toUpperCase() || "ST"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold">{selectedStudent?.studentName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-white/20 text-white hover:bg-white/30 border-0 text-[11px] font-mono">
                      Adm: {selectedStudent?.admissionNumber}
                    </Badge>
                    <Badge className="bg-emerald-500/80 text-white border-0 text-[11px]">
                      Roll #{selectedStudent?.rollNumber || "—"}
                    </Badge>
                    <Badge variant="outline" className="border-white/40 text-white text-[11px]">
                      {selectedStudent?.status || "ACTIVE"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5 bg-background">
            {/* Section 1: Personal Biodata */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-purple-primary" />
                Personal Biodata
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 p-3.5 rounded-lg border border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Date of Birth</span>
                  <span className="font-semibold text-foreground">
                    {selectedStudent?.dob || "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Gender</span>
                  <span className="font-semibold capitalize text-foreground">
                    {selectedStudent?.gender || "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Blood Group</span>
                  <span className="font-semibold text-foreground">
                    {selectedStudent?.bloodGroup || "O+"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Student Mobile</span>
                  <span className="font-semibold text-foreground font-mono">
                    {selectedStudent?.phone || "—"}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground block text-[11px]">State & District</span>
                  <span className="font-semibold text-foreground">
                    {selectedStudent?.district ? `${selectedStudent.district}, ${selectedStudent.state || "Karnataka"}` : "Karnataka"}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground block text-[11px]">Residential Address</span>
                  <span className="font-semibold text-foreground truncate block" title={selectedStudent?.address}>
                    {selectedStudent?.address || "Registered Campus Address"}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Academic Placement */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-purple-primary" />
                Academic Placement & Enrollment
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 p-3.5 rounded-lg border border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Academic Session</span>
                  <span className="font-semibold text-foreground">{selectedStudent?.academicYearName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Class & Grade</span>
                  <span className="font-semibold text-foreground">{selectedStudent?.className}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Stream</span>
                  <span className="font-semibold text-foreground">{selectedStudent?.streamName || "General"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Section Code</span>
                  <span className="font-semibold text-foreground font-mono">{selectedStudent?.sectionCode}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Roll Number</span>
                  <span className="font-semibold font-mono text-foreground">{selectedStudent?.rollNumber || "Unassigned"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Admission Number</span>
                  <span className="font-semibold font-mono text-foreground">{selectedStudent?.admissionNumber}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground block text-[11px]">Boarding / Accommodation</span>
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Home className="h-3.5 w-3.5 text-purple-primary" />
                    {selectedStudent?.dormId ? `Hostel Resident (Room ${selectedStudent.dormRoomNo || "Allocated"})` : "Day Scholar"}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Parent / Guardian Information */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-purple-primary" />
                Parent & Guardian Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/40 p-3.5 rounded-lg border border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Guardian Name</span>
                  <span className="font-semibold text-foreground">
                    {selectedStudent?.parentName || "Registered Guardian"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Parent Mobile</span>
                  <span className="font-semibold text-foreground font-mono">
                    {selectedStudent?.parentPhone || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Parent Email</span>
                  <span className="font-semibold text-foreground truncate block" title={selectedStudent?.parentEmail}>
                    {selectedStudent?.parentEmail || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 4: Portal Login & Security Notice */}
            <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-lg text-xs flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-purple-primary mt-0.5 shrink-0" />
              <div className="space-y-0.5 text-purple-900">
                <span className="font-bold">Student Portal Authentication</span>
                <p className="text-[11px] text-purple-800 leading-relaxed">
                  Registered username is the student&apos;s 10-digit mobile number ({selectedStudent?.phone || "Phone"}).
                  Initial default password follows the secure DOB pattern (DDMMYYYY).
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border bg-muted/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDetailsOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
