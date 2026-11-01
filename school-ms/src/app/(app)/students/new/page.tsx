"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  UserPlus,
  BookOpen,
  Users,
  Upload,
  Calendar,
  Sparkles,
  AlertCircle,
  FileCheck2,
  Camera,
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
import { Badge } from "@/components/ui/badge";
import { StateDistrictCascade } from "@/components/forms/state-district-cascade";
import { apiClient } from "@/lib/api-client";

interface AcademicYearItem {
  id: string;
  name: string;
  code: string;
  isCurrent: boolean;
  isActive: boolean;
}

interface SectionItem {
  id: string;
  classId: string;
  streamId?: string | null;
  name: string;
  code: string;
  isActive: boolean;
}

interface ClassItem {
  id: string;
  name: string;
  orderIndex: number;
  hasStreams: boolean;
  isActive: boolean;
  sections: SectionItem[];
}

interface StreamItem {
  id: string;
  name: string;
  code: string;
}

export default function NewStudentPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successData, setSuccessData] = React.useState<any | null>(null);

  // Dynamic Academic Master Data
  const [academicYears, setAcademicYears] = React.useState<AcademicYearItem[]>([]);
  const [classes, setClasses] = React.useState<ClassItem[]>([]);
  const [streams, setStreams] = React.useState<StreamItem[]>([]);

  // Form State
  const initialFormData = {
    name: "",
    mobileNumber: "",
    dob: "",
    gender: "male" as string,
    bloodGroup: "O+",
    state: "Karnataka",
    district: "Bengaluru Urban",
    address: "",
    email: "",
    academicYearId: "",
    academicYearName: "",
    classId: "",
    streamId: "",
    sectionId: "",
    parentName: "",
    parentPhone: "",
    dormId: "none",
    dormRoomNo: "",
    photoPreview: "",
  };

  const [formData, setFormData] = React.useState(initialFormData);

  const handleResetForm = React.useCallback(() => {
    setSuccessData(null);
    setStep(1);
    setError(null);
    setFormData(initialFormData);
  }, []);

  const handleReturnToDashboard = () => {
    handleResetForm();
    router.push("/dashboard");
  };

  // Reset wizard state whenever route changes or returns to /students/new
  React.useEffect(() => {
    handleResetForm();
    return () => {
      handleResetForm();
    };
  }, [pathname, handleResetForm]);

  // Fetch real database academic structure
  React.useEffect(() => {
    setSuccessData(null);
    setStep(1);
    async function loadMasterData() {
      try {
        setLoading(true);
        const [yearsRes, classesRes, streamsRes] = await Promise.all([
          apiClient<{ success: boolean; data: AcademicYearItem[] }>("/academics/years"),
          apiClient<{ success: boolean; data: ClassItem[] }>("/academics/classes"),
          apiClient<{ success: boolean; data: StreamItem[] }>("/academics/streams"),
        ]);

        if (yearsRes?.data) {
          setAcademicYears(yearsRes.data);
          const activeYear = yearsRes.data.find((y) => y.isCurrent) || yearsRes.data[0];
          if (activeYear) {
            setFormData((prev) => ({
              ...prev,
              academicYearId: activeYear.id,
              academicYearName: activeYear.name,
            }));
          }
        }

        if (classesRes?.data) {
          setClasses(classesRes.data);
          if (classesRes.data.length > 0) {
            const firstClass = classesRes.data[0];
            const activeSecs = firstClass.sections.filter((s) => s.isActive);
            setFormData((prev) => ({
              ...prev,
              classId: firstClass.id,
              sectionId: activeSecs[0]?.id || "",
            }));
          }
        }

        if (streamsRes?.data) {
          setStreams(streamsRes.data);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load academic configuration.");
      } finally {
        setLoading(false);
      }
    }
    loadMasterData();

    return () => {
      setSuccessData(null);
      setStep(1);
    };
  }, []);

  const selectedClass = classes.find((c) => c.id === formData.classId);
  const requiresStreams = Boolean(selectedClass?.hasStreams);

  // Available sections filtered by class and stream (active only)
  const availableSections = React.useMemo(() => {
    if (!selectedClass) return [];
    return selectedClass.sections.filter((sec) => {
      if (!sec.isActive) return false;
      if (requiresStreams && formData.streamId) {
        return sec.streamId === formData.streamId || !sec.streamId;
      }
      return true;
    });
  }, [selectedClass, requiresStreams, formData.streamId]);

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!formData.name.trim()) {
        setError("Please enter the student's full name.");
        return;
      }
      if (!formData.dob) {
        setError("Please enter the student's date of birth.");
        return;
      }
      const digits = formData.mobileNumber.replace(/\D/g, "");
      if (digits.length < 10) {
        setError("Student mobile number must be at least 10 digits (used for portal login).");
        return;
      }
    }
    if (step === 2) {
      if (!formData.classId) {
        setError("Please select an academic class.");
        return;
      }
      if (!formData.sectionId) {
        setError("Please select an active section arm.");
        return;
      }
      if (formData.dob) {
        const birthYear = new Date(formData.dob).getFullYear();
        const age = 2026 - birthYear;
        const classAgeLimits: Record<string, [number, number]> = {
          "cls-nursery": [3, 5],
          "cls-lkg": [4, 6],
          "cls-ukg": [5, 7],
          "cls-class1": [5, 8],
          "cls-class2": [6, 9],
          "cls-class3": [7, 10],
          "cls-class4": [8, 11],
          "cls-class5": [9, 12],
          "cls-class6": [10, 13],
          "cls-class7": [11, 14],
          "cls-class8": [12, 15],
          "cls-class9": [13, 16],
          "cls-class10": [14, 17],
          "cls-class11": [15, 18],
          "cls-class12": [16, 20],
        };
        const limits = classAgeLimits[formData.classId];
        if (limits) {
          const [minAge, maxAge] = limits;
          if (age < minAge || age > maxAge) {
            setError(
              `Age mismatch: Student is ~${age} years old (born ${birthYear}), but ${selectedClass?.name || "this class"} requires age ${minAge} to ${maxAge} years.`
            );
            return;
          }
        }
      }
    }
    setStep((s) => Math.min(s + 1, 5));
  };

  const handlePrev = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Photo must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        photoPreview: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        name: formData.name.trim(),
        mobile_number: formData.mobileNumber.trim(),
        date_of_birth: formData.dob,
        gender: formData.gender,
        email: formData.email.trim() || undefined,
        academic_year_id: formData.academicYearId || undefined,
        class_id: formData.classId,
        stream_id: requiresStreams ? (formData.streamId || undefined) : undefined,
        section_id: formData.sectionId,
        state: formData.state,
        district: formData.district,
        address: formData.address.trim() || undefined,
        parent_name: formData.parentName.trim() || undefined,
        parent_phone: formData.parentPhone.trim() || undefined,
        dorm_id: formData.dormId !== "none" ? formData.dormId : undefined,
        dorm_room_no: formData.dormRoomNo.trim() || undefined,
      };

      const res = await apiClient<{ success: boolean; data: any; message?: string }>("/admin/users/student", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res && res.data) {
        setSuccessData(res.data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to complete student admission.");
    } finally {
      setSubmitting(false);
    }
  };

  if (successData) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 animate-in fade-in-50">
        <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 text-center p-8 space-y-6">
          <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900 mx-auto flex items-center justify-center">
            <Check className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Admission Complete!</h2>
            <p className="text-sm text-muted-foreground">
              Student account and academic enrollment successfully created in database.
            </p>
          </div>

          <div className="bg-background border rounded-xl p-4 text-left space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Student Name:</span>
              <span className="font-bold text-foreground">{successData.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Login Identifier (Mobile):</span>
              <span className="font-bold text-primary">{successData.username || successData.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Initial Portal Password:</span>
              <span className="font-bold text-emerald-600">DOB (DDMMYYYY)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Admission Code:</span>
              <span className="font-bold text-foreground">{successData.code}</span>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={handleResetForm}
            >
              Register Another Student
            </Button>
            <Button
              type="button"
              onClick={handleReturnToDashboard}
            >
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Dashboard
              </Link>
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="text-xs font-semibold text-primary">Admissions</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Student Admission & Enrollment
          </h1>
          <p className="text-xs text-muted-foreground">
            Database-driven multi-step admission wizard with dynamic academic placement.
          </p>
        </div>

        <Badge variant="outline" className="gap-1 px-3 py-1 text-xs bg-muted/30">
          <Sparkles className="h-3 w-3 text-primary" />
          Session: {formData.academicYearName || "Current Active Session"}
        </Badge>
      </div>

      {/* Progress Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-b pb-6">
        {[
          { num: 1, label: "Personal Info", icon: UserPlus },
          { num: 2, label: "Academic Placement", icon: BookOpen },
          { num: 3, label: "Additional Info", icon: Users },
          { num: 4, label: "Photo Upload", icon: Camera },
          { num: 5, label: "Review & Submit", icon: FileCheck2 },
        ].map((item) => {
          const isDone = step > item.num;
          const isCurrent = step === item.num;
          const Icon = item.icon;

          return (
            <div
              key={item.num}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                isCurrent
                  ? "bg-primary/10 border-primary shadow-xs"
                  : isDone
                  ? "bg-muted/40 border-border text-muted-foreground"
                  : "bg-card border-border/50 opacity-60"
              }`}
            >
              <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : isDone
                    ? "bg-emerald-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : item.num}
              </div>
              <div className="hidden sm:flex flex-col text-left overflow-hidden">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  Step {item.num}
                </span>
                <span
                  className={`text-xs font-medium truncate ${
                    isCurrent ? "text-primary font-bold" : "text-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/15 border border-destructive/30 flex items-center gap-3 text-xs font-semibold text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Wizard Card */}
      <Card className="border-border shadow-xs">
        <form onSubmit={handleSubmit}>
          {/* STEP 1: Personal Information */}
          {step === 1 && (
            <div className="space-y-6 p-6 sm:p-8 animate-in fade-in-50">
              <div className="border-b pb-4">
                <h2 className="text-base font-bold text-foreground">Step 1: Student Personal Information</h2>
                <p className="text-xs text-muted-foreground">
                  Official identity details for student portal registration.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="s-name">Student Full Name *</Label>
                  <Input
                    id="s-name"
                    required
                    placeholder="e.g. Aarav Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s-dob">Date of Birth *</Label>
                  <Input
                    id="s-dob"
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  />
                  <span className="text-[11px] text-muted-foreground">Used as default password (DDMMYYYY)</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s-mobile">Student Mobile Number *</Label>
                  <Input
                    id="s-mobile"
                    required
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value.replace(/\D/g, "") })}
                  />
                  <span className="text-[11px] text-muted-foreground">Primary identifier for student portal login</span>
                </div>

                <div className="space-y-1.5">
                  <Label>Gender *</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(val) => setFormData({ ...formData, gender: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
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
                    value={formData.bloodGroup}
                    onValueChange={(val) => setFormData({ ...formData, bloodGroup: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood group" />
                    </SelectTrigger>
                    <SelectContent>
                      {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                        <SelectItem key={bg} value={bg}>
                          {bg}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2">
                  <StateDistrictCascade
                    selectedState={formData.state}
                    selectedDistrict={formData.district}
                    onStateChange={(state) => setFormData((prev) => ({ ...prev, state }))}
                    onDistrictChange={(district) => setFormData((prev) => ({ ...prev, district }))}
                    required={true}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="s-address">Residential Address</Label>
                  <Input
                    id="s-address"
                    placeholder="Street, Landmark, City"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Academic Placement */}
          {step === 2 && (
            <div className="space-y-6 p-6 sm:p-8 animate-in fade-in-50">
              <div className="border-b pb-4">
                <h2 className="text-base font-bold text-foreground">Step 2: Academic Placement</h2>
                <p className="text-xs text-muted-foreground">
                  Hierarchical cohort allocation: Academic Session → Class → Stream (if applicable) → Section.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Academic Session (Auto-selected from current active session) */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Academic Session *</Label>
                  <Select
                    value={formData.academicYearId}
                    onValueChange={(val) => {
                      const yr = academicYears.find((y) => y.id === val);
                      setFormData({
                        ...formData,
                        academicYearId: val,
                        academicYearName: yr?.name || "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select session" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears.map((ay) => (
                        <SelectItem key={ay.id} value={ay.id}>
                          {ay.name} {ay.isCurrent ? "(Current Active Session)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Automatically defaulted to active session configured by Administrator.
                  </p>
                </div>

                {/* Class / Grade */}
                <div className="space-y-1.5">
                  <Label>Class / Grade *</Label>
                  <Select
                    value={formData.classId}
                    onValueChange={(val) => {
                      const c = classes.find((item) => item.id === val);
                      const activeSecs = c?.sections.filter((s) => s.isActive) || [];
                      setFormData({
                        ...formData,
                        classId: val,
                        streamId: "",
                        sectionId: activeSecs[0]?.id || "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Stream (Conditional if class hasStreams) */}
                {requiresStreams && (
                  <div className="space-y-1.5">
                    <Label>Specialization Stream *</Label>
                    <Select
                      value={formData.streamId}
                      onValueChange={(val) => {
                        const activeSecs = selectedClass?.sections.filter(
                          (s) => s.isActive && (s.streamId === val || !s.streamId)
                        ) || [];
                        setFormData({
                          ...formData,
                          streamId: val,
                          sectionId: activeSecs[0]?.id || "",
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select stream track" />
                      </SelectTrigger>
                      <SelectContent>
                        {streams.map((st) => (
                          <SelectItem key={st.id} value={st.id}>
                            {st.name} ({st.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Section / Arm */}
                <div className={`space-y-1.5 ${!requiresStreams ? "sm:col-span-1" : ""}`}>
                  <Label>Section / Arm *</Label>
                  {availableSections.length === 0 ? (
                    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-700 dark:text-amber-400">
                      No active sections available for this class. Please configure a section in Academic Architecture first.
                    </div>
                  ) : (
                    <Select
                      value={formData.sectionId}
                      onValueChange={(val) => setFormData({ ...formData, sectionId: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSections.map((sec) => (
                          <SelectItem key={sec.id} value={sec.id}>
                            {sec.name} ({sec.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Additional & Guardian Information */}
          {step === 3 && (
            <div className="space-y-6 p-6 sm:p-8 animate-in fade-in-50">
              <div className="border-b pb-4">
                <h2 className="text-base font-bold text-foreground">Step 3: Additional & Guardian Information</h2>
                <p className="text-xs text-muted-foreground">
                  Parent / Guardian identity details and optional boarding accommodation.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Guardian Contact Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="p-name">Parent / Guardian Full Name</Label>
                    <Input
                      id="p-name"
                      placeholder="e.g. Ramesh Sharma"
                      value={formData.parentName}
                      onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="p-phone">Parent Mobile Number</Label>
                    <Input
                      id="p-phone"
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      value={formData.parentPhone}
                      onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value.replace(/\D/g, "") })}
                    />
                    <span className="text-[11px] text-muted-foreground">
                      Multiple children with same parent mobile will automatically link to the parent portal.
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Hostel Accommodation</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Hostel / Boarding Block</Label>
                      <Select
                        value={formData.dormId}
                        onValueChange={(val) => setFormData({ ...formData, dormId: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select boarding option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Day Scholar (No Hostel)</SelectItem>
                          <SelectItem value="hostel-a">Junior Wing - Block A</SelectItem>
                          <SelectItem value="hostel-b">Senior Wing - Block B</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.dormId !== "none" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="h-room">Hostel Room Number</Label>
                        <Input
                          id="h-room"
                          placeholder="e.g. 204"
                          value={formData.dormRoomNo}
                          onChange={(e) => setFormData({ ...formData, dormRoomNo: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Student Photo */}
          {step === 4 && (
            <div className="space-y-6 p-6 sm:p-8 animate-in fade-in-50">
              <div className="border-b pb-4">
                <h2 className="text-base font-bold text-foreground">Step 4: Student Passport Photo</h2>
                <p className="text-xs text-muted-foreground">
                  Upload a recent passport-sized photograph for identity badges and student profile.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 space-y-4 text-center">
                {formData.photoPreview ? (
                  <div className="space-y-3">
                    <img
                      src={formData.photoPreview}
                      alt="Student Preview"
                      className="h-40 w-32 object-cover rounded-lg border shadow-sm mx-auto"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, photoPreview: "" })}
                    >
                      Remove & Upload Different Photo
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <Camera className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">Upload Student Photo</p>
                      <p className="text-xs text-muted-foreground">
                        PNG or JPG up to 2MB. Clear passport-sized portrait.
                      </p>
                    </div>
                    <label htmlFor="p-upload" className="cursor-pointer">
                      <Button type="button" variant="secondary" size="sm" asChild>
                        <span>Browse Image</span>
                      </Button>
                      <input
                        id="p-upload"
                        type="file"
                        accept="image/png, image/jpeg"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: Review & Submit */}
          {step === 5 && (
            <div className="space-y-6 p-6 sm:p-8 animate-in fade-in-50">
              <div className="border-b pb-4">
                <h2 className="text-base font-bold text-foreground">Step 5: Review & Finalize Admission</h2>
                <p className="text-xs text-muted-foreground">
                  Please review all student and academic placement information before submission.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                  <h4 className="font-bold text-primary uppercase tracking-wider text-[11px]">Personal Profile</h4>
                  <p><strong>Name:</strong> {formData.name}</p>
                  <p><strong>Date of Birth:</strong> {formData.dob}</p>
                  <p><strong>Mobile (Portal User):</strong> {formData.mobileNumber}</p>
                  <p><strong>Gender:</strong> {formData.gender}</p>
                  <p><strong>State & District:</strong> {formData.district}, {formData.state}</p>
                </div>

                <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                  <h4 className="font-bold text-primary uppercase tracking-wider text-[11px]">Academic Placement</h4>
                  <p><strong>Session:</strong> {formData.academicYearName}</p>
                  <p><strong>Class:</strong> {selectedClass?.name}</p>
                  {requiresStreams && <p><strong>Stream:</strong> {streams.find((s) => s.id === formData.streamId)?.name || "General"}</p>}
                  <p><strong>Section:</strong> {availableSections.find((s) => s.id === formData.sectionId)?.name}</p>
                  <p><strong>Hostel:</strong> {formData.dormId === "none" ? "Day Scholar" : `Boarder (Room ${formData.dormRoomNo || "TBD"})`}</p>
                </div>

                <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                  <h4 className="font-bold text-primary uppercase tracking-wider text-[11px]">Guardian Details</h4>
                  <p><strong>Parent / Guardian:</strong> {formData.parentName || "Not Provided"}</p>
                  <p><strong>Parent Mobile:</strong> {formData.parentPhone || "Not Provided"}</p>
                  <p><strong>Address:</strong> {formData.address || "Standard district address"}</p>
                </div>

                <div className="p-4 rounded-xl border bg-muted/20 space-y-2 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-primary uppercase tracking-wider text-[11px]">Identity Photo</h4>
                    <p className="text-muted-foreground mt-1">
                      {formData.photoPreview ? "Uploaded passport photo verified" : "No photo attached (placeholder will be generated)"}
                    </p>
                  </div>
                  {formData.photoPreview && (
                    <img
                      src={formData.photoPreview}
                      alt="Student Preview"
                      className="h-20 w-16 object-cover rounded border shadow-2xs mt-2"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Card Footer Controls */}
          <CardFooter className="flex justify-between border-t p-6 bg-muted/10">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={handlePrev} disabled={submitting}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Previous
              </Button>
            ) : (
              <Button type="button" variant="ghost" asChild>
                <Link href="/dashboard">Cancel</Link>
              </Button>
            )}

            {step < 5 ? (
              <Button type="button" onClick={handleNext} disabled={loading}>
                Next Step
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            ) : (
              <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground">
                {submitting ? "Registering Student..." : "Confirm & Admit Student"}
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
