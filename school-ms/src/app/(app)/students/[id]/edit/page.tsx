"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  AlertTriangle,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { MOCK_STUDENTS } from "@/mocks/users";
import { MOCK_CLASSES, MOCK_SECTIONS } from "@/mocks/academics";
import { INDIAN_STATES, INDIAN_DISTRICTS } from "@/mocks/indian-geo";

function EditStudentContent() {
  const params = useParams();
  const router = useRouter();
  const studentId = (params?.id as string) || "std-1";

  const student =
    MOCK_STUDENTS.find((s) => s.id === studentId) || MOCK_STUDENTS[0];

  const [form, setForm] = React.useState({
    name: student?.user?.name || "",
    classId: student?.classId || "",
    sectionId: student?.sectionId || "",
    rollNo: student?.rollNo || "",
    dob: student?.user?.dob || "2009-08-14",
    gender: student?.user?.gender || "male",
    bloodGroup: student?.user?.bloodGroup || "O+",
    state: "DL",
    district: "DL-ND",
    address: student?.user?.address || "",
  });

  if (!student) {
    return (
      <div className="p-12 text-center space-y-3">
        <h2 className="text-base font-bold text-foreground">No Student Records Found</h2>
        <p className="text-xs text-text-secondary">All mock data purged. Use Super Admin User Management to provision students.</p>
        <Button asChild size="sm" className="bg-purple-primary text-white text-xs">
          <Link href="/users">Go to User Provisioning</Link>
        </Button>
      </div>
    );
  }

  const [migrationWarningOpen, setMigrationWarningOpen] = React.useState(false);
  const [pendingClassChange, setPendingClassChange] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const handleClassSelect = (newClassId: string) => {
    if (newClassId !== student.classId) {
      setPendingClassChange(newClassId);
      setMigrationWarningOpen(true);
    } else {
      setForm({ ...form, classId: newClassId });
    }
  };

  const confirmClassMigration = () => {
    if (pendingClassChange) {
      setForm({ ...form, classId: pendingClassChange });
    }
    setMigrationWarningOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => {
      router.push(`/students/${student.id}`);
    }, 1200);
  };

  const availableSections = MOCK_SECTIONS.filter(
    (s) => s.classId === form.classId
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-text-secondary">
            <Link href={`/students/${student.id}`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Profile
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Edit Student: {student.user.name}
          </h1>
          <p className="text-xs text-text-secondary font-mono">
            Admission No: <span className="font-bold text-purple-primary">{student.admNo}</span>
          </p>
        </div>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>Student profile updated successfully! Redirecting...</span>
        </div>
      )}

      <Card className="border-border shadow-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader className="border-b border-border/80">
            <CardTitle className="text-base font-bold">Student Record Details</CardTitle>
            <CardDescription className="text-xs">
              Modify biodata, address and cohort assignments.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              {/* Class Selector with Migration Warning Guard */}
              <div className="space-y-1.5">
                <Label>Standard / Class *</Label>
                <Select value={form.classId} onValueChange={handleClassSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_CLASSES.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Section Arm *</Label>
                <Select
                  value={form.sectionId}
                  onValueChange={(val) => setForm({ ...form, sectionId: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Section" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSections.map((sec) => (
                      <SelectItem key={sec.id} value={sec.id}>
                        {sec.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rollNo">Roll Number</Label>
                <Input
                  id="rollNo"
                  value={form.rollNo}
                  onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select
                  value={form.gender}
                  onValueChange={(val) => setForm({ ...form, gender: val as "male" | "female" | "other" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Blood Group</Label>
                <Select
                  value={form.bloodGroup}
                  onValueChange={(val) => setForm({ ...form, bloodGroup: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(
                      (bg) => (
                        <SelectItem key={bg} value={bg}>
                          {bg}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address">Residential Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t border-border p-6 bg-surface">
            <Button asChild variant="outline">
              <Link href={`/students/${student.id}`}>Cancel</Link>
            </Button>
            <Button
              type="submit"
              className="gap-2 bg-purple-primary text-white hover:bg-purple-primary/90"
            >
              <Save className="h-4 w-4" />
              Save Record Changes
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* FE-STUD-009: Class Migration Warning Dialog */}
      <Dialog
        open={migrationWarningOpen}
        onOpenChange={setMigrationWarningOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base font-bold">
                Confirm Class Cohort Migration
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs pt-2">
              You are moving this student from{" "}
              <strong>{student.myClass?.name}</strong> to a different class standard.
              This affects course subject registrations, fee billings, and terminal marksheets.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <strong>Notice:</strong> Please make sure promotion records or grade transcripts are properly reconciled after migration.
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMigrationWarningOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={confirmClassMigration}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Confirm Migration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function EditStudentPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-xs text-text-secondary">Loading editor...</div>}>
      <EditStudentContent />
    </React.Suspense>
  );
}
