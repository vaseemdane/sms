"use client";

import * as React from "react";
import Link from "next/link";
import {
  GraduationCap,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Building,
  Upload,
  ArrowRight,
  ArrowLeft,
  Check,
  CreditCard,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StateDistrictCascade } from "@/components/forms/state-district-cascade";

interface ClassOption {
  id: string;
  name: string;
  orderIndex: number;
  track: "DIRECT_ADMISSION" | "ASSESSMENT_REQUIRED";
}

const AVAILABLE_CLASSES: ClassOption[] = [
  { id: "cls-nursery", name: "Nursery", orderIndex: 1, track: "DIRECT_ADMISSION" },
  { id: "cls-lkg", name: "LKG", orderIndex: 2, track: "DIRECT_ADMISSION" },
  { id: "cls-ukg", name: "UKG", orderIndex: 3, track: "DIRECT_ADMISSION" },
  { id: "cls-1", name: "Class 1", orderIndex: 4, track: "DIRECT_ADMISSION" },
  { id: "cls-2", name: "Class 2", orderIndex: 5, track: "DIRECT_ADMISSION" },
  { id: "cls-3", name: "Class 3", orderIndex: 6, track: "DIRECT_ADMISSION" },
  { id: "cls-4", name: "Class 4", orderIndex: 7, track: "DIRECT_ADMISSION" },
  { id: "cls-5", name: "Class 5", orderIndex: 8, track: "DIRECT_ADMISSION" },
  { id: "cls-6", name: "Class 6", orderIndex: 9, track: "ASSESSMENT_REQUIRED" },
  { id: "cls-7", name: "Class 7", orderIndex: 10, track: "ASSESSMENT_REQUIRED" },
  { id: "cls-8", name: "Class 8", orderIndex: 11, track: "ASSESSMENT_REQUIRED" },
  { id: "cls-9", name: "Class 9", orderIndex: 12, track: "ASSESSMENT_REQUIRED" },
  { id: "cls-10", name: "Class 10", orderIndex: 13, track: "ASSESSMENT_REQUIRED" },
];

export default function PublicApplyPage() {
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);

  // Step 1: Candidate & Parent Information
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [dob, setDob] = React.useState("");
  const [gender, setGender] = React.useState("Male");
  const [bloodGroup, setBloodGroup] = React.useState("O+");
  const [aadhaarNumber, setAadhaarNumber] = React.useState("");
  const [fatherName, setFatherName] = React.useState("");
  const [motherName, setMotherName] = React.useState("");
  const [guardianPhone, setGuardianPhone] = React.useState("");
  const [guardianEmail, setGuardianEmail] = React.useState("");
  const [state, setState] = React.useState("Karnataka");
  const [district, setDistrict] = React.useState("Bengaluru Urban");
  const [address, setAddress] = React.useState("");

  // Step 2: Target Class & Dynamic Previous School
  const [selectedClassId, setSelectedClassId] = React.useState("cls-1");
  const [previousSchool, setPreviousSchool] = React.useState("");
  const [previousPercentage, setPreviousPercentage] = React.useState("");

  // Step 3: Documents & Boarding
  const [requiresHostel, setRequiresHostel] = React.useState(false);
  const [uploadedBirthCert, setUploadedBirthCert] = React.useState(true);
  const [uploadedAadhaar, setUploadedAadhaar] = React.useState(true);
  const [uploadedPhoto, setUploadedPhoto] = React.useState(true);
  const [uploadedTc, setUploadedTc] = React.useState(false);

  // Step 4: Submission & Tracker
  const [paymentRef, setPaymentRef] = React.useState("UPI-PAY-2026-9938");
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [generatedAppNo, setGeneratedAppNo] = React.useState("");

  const selectedClass = AVAILABLE_CLASSES.find((c) => c.id === selectedClassId) || AVAILABLE_CLASSES[3];
  const isHigherClass = selectedClass.orderIndex >= 5; // Class 2-10 require Previous School & TC

  const handleSubmitApplication = () => {
    const appNo = `APP-2026-${Math.floor(100 + Math.random() * 900)}`;
    setGeneratedAppNo(appNo);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-tint/30 via-background to-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Public Header */}
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-purple-primary text-white flex items-center justify-center font-bold">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-foreground">EduPulse Academy</span>
              <span className="block text-[10px] text-text-secondary font-medium">
                Karnataka State Board • Admissions Portal AY 2026–2027
              </span>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link href="/login">Faculty / Student Login</Link>
          </Button>
        </div>

        {/* Step Indicator */}
        {!isSubmitted && (
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
            <div
              className={`p-2 rounded-lg border transition-all ${
                step === 1
                  ? "border-purple-primary bg-purple-tint/50 text-purple-primary font-bold"
                  : step > 1
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-border text-text-secondary opacity-60"
              }`}
            >
              1. Candidate Biodata
            </div>
            <div
              className={`p-2 rounded-lg border transition-all ${
                step === 2
                  ? "border-purple-primary bg-purple-tint/50 text-purple-primary font-bold"
                  : step > 2
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-border text-text-secondary opacity-60"
              }`}
            >
              2. Class & Track
            </div>
            <div
              className={`p-2 rounded-lg border transition-all ${
                step === 3
                  ? "border-purple-primary bg-purple-tint/50 text-purple-primary font-bold"
                  : step > 3
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-border text-text-secondary opacity-60"
              }`}
            >
              3. Docs & Boarding
            </div>
            <div
              className={`p-2 rounded-lg border transition-all ${
                step === 4
                  ? "border-purple-primary bg-purple-tint/50 text-purple-primary font-bold"
                  : "border-border text-text-secondary opacity-60"
              }`}
            >
              4. Fee & Confirmation
            </div>
          </div>
        )}

        {/* STEP 1: CANDIDATE & PARENT BIODATA */}
        {!isSubmitted && step === 1 && (
          <Card className="border-border/80 bg-surface shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <User className="h-4 w-4 text-purple-primary" />
                Step 1: Prospective Student & Guardian Information
              </CardTitle>
              <CardDescription className="text-xs">
                Accurate Aadhaar, date of birth, and contact numbers are required for verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-text-secondary block mb-1">
                    Student First Name *
                  </label>
                  <Input
                    placeholder="e.g. Rohan"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-text-secondary block mb-1">
                    Student Last Name *
                  </label>
                  <Input
                    placeholder="e.g. Deshmukh"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-text-secondary block mb-1">
                    Date of Birth *
                  </label>
                  <Input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="h-9 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-text-secondary block mb-1">Gender *</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-surface px-2 text-xs"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-text-secondary block mb-1">Aadhaar (12-digit)</label>
                  <Input
                    placeholder="XXXX XXXX XXXX"
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-text-secondary block mb-1">Father&apos;s Name *</label>
                  <Input
                    placeholder="e.g. Vikram Deshmukh"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-text-secondary block mb-1">Mother&apos;s Name *</label>
                  <Input
                    placeholder="e.g. Sneha Deshmukh"
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-text-secondary block mb-1">
                    Guardian Mobile Number (WhatsApp Alerts) *
                  </label>
                  <Input
                    placeholder="10-digit mobile"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-text-secondary block mb-1">Guardian Email</label>
                  <Input
                    placeholder="guardian@example.com"
                    value={guardianEmail}
                    onChange={(e) => setGuardianEmail(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <StateDistrictCascade
                selectedState={state}
                selectedDistrict={district}
                onStateChange={setState}
                onDistrictChange={setDistrict}
              />

              <div>
                <label className="font-semibold text-text-secondary block mb-1">Residential Address *</label>
                <Input
                  placeholder="House number, street, locality"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  className="bg-purple-primary hover:bg-purple-primary/90 text-white text-xs font-semibold"
                >
                  Next: Class & Admission Track
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: CLASS SELECTION & DYNAMIC TC RULES */}
        {!isSubmitted && step === 2 && (
          <Card className="border-border/80 bg-surface shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Building className="h-4 w-4 text-purple-primary" />
                Step 2: Intake Class Selection & Dynamic Academic Rules
              </CardTitle>
              <CardDescription className="text-xs">
                Our dual-pipeline system routes candidates into Direct Admission or Entrance Assessment depending on the target grade
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-text-secondary block mb-1">Target Class *</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-surface px-3 text-xs font-semibold"
                >
                  {AVAILABLE_CLASSES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.track === "DIRECT_ADMISSION" ? "Direct Track" : "Entrance Assessment"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Track Visual Notice */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  selectedClass.track === "DIRECT_ADMISSION"
                    ? "bg-emerald-50/40 border-emerald-200 text-emerald-900"
                    : "bg-purple-tint/30 border-purple-primary/30 text-purple-primary"
                }`}
              >
                <Sparkles className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-sm">
                    {selectedClass.name} is configured for{" "}
                    {selectedClass.track === "DIRECT_ADMISSION"
                      ? "Direct Admission"
                      : "Entrance Assessment"}
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {selectedClass.track === "DIRECT_ADMISSION"
                      ? "Admission is evaluated directly from age criteria and uploaded birth certificate. Transfer Certificate (TC) is not mandatory for early grades."
                      : "Candidates will be scheduled for a 100-mark written & aptitude evaluation. Transfer Certificate and previous class report cards are mandatory."}
                  </p>
                </div>
              </div>

              {/* Dynamic Fields: Shown only for Class 2–10 (orderIndex >= 5) */}
              {isHigherClass && (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/20 space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 font-bold">
                    <AlertCircle className="h-4 w-4" />
                    <span>Previous Academic Records Required for {selectedClass.name}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-text-secondary block mb-1">
                        Previous School Name *
                      </label>
                      <Input
                        placeholder="e.g. St. Joseph Convent School"
                        value={previousSchool}
                        onChange={(e) => setPreviousSchool(e.target.value)}
                        className="h-9 text-xs bg-surface"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-text-secondary block mb-1">
                        Previous Class Score / Percentage (%)
                      </label>
                      <Input
                        placeholder="e.g. 84.5"
                        value={previousPercentage}
                        onChange={(e) => setPreviousPercentage(e.target.value)}
                        className="h-9 text-xs bg-surface font-semibold"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-between">
                <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="bg-purple-primary hover:bg-purple-primary/90 text-white text-xs font-semibold"
                >
                  Next: Documents & Boarding
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: DOCUMENT CHECKLIST & BOARDING */}
        {!isSubmitted && step === 3 && (
          <Card className="border-border/80 bg-surface shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Upload className="h-4 w-4 text-purple-primary" />
                Step 3: Document Uploads & Boarding Preference
              </CardTitle>
              <CardDescription className="text-xs">
                Upload verified digital copies of required certificates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-border flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground">Birth Certificate (Mandatory)</span>
                    <p className="text-[10px] text-text-secondary">PDF or JPEG (Max 5MB)</p>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[10px]">Attached ✓</Badge>
                </div>

                <div className="p-3 rounded-lg border border-border flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground">Aadhaar Card (Student / Parent)</span>
                    <p className="text-[10px] text-text-secondary">PDF or JPEG (Max 5MB)</p>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[10px]">Attached ✓</Badge>
                </div>

                <div className="p-3 rounded-lg border border-border flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground">Passport Photo</span>
                    <p className="text-[10px] text-text-secondary">Recent color photo</p>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[10px]">Attached ✓</Badge>
                </div>

                {isHigherClass && (
                  <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/20 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-amber-900">
                        Transfer Certificate (TC) & Report Card
                      </span>
                      <p className="text-[10px] text-amber-700">Mandatory for {selectedClass.name}</p>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[10px]">Attached ✓</Badge>
                  </div>
                )}
              </div>

              {/* Boarding / Hostel Preference */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground">Hostel & Boarding Accommodation</span>
                    <p className="text-[10px] text-text-secondary">
                      Opt-in for on-campus residential dormitory blocks and South/North Indian mess meal plans
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={requiresHostel}
                    onChange={(e) => setRequiresHostel(e.target.checked)}
                    className="h-4 w-4 rounded accent-purple-primary"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-between">
                <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="text-xs">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  className="bg-purple-primary hover:bg-purple-primary/90 text-white text-xs font-semibold"
                >
                  Next: Application Fee & Payment
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4: FEE & CONFIRMATION */}
        {!isSubmitted && step === 4 && (
          <Card className="border-border/80 bg-surface shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-purple-primary" />
                Step 4: Application Fee Checkout & Submission
              </CardTitle>
              <CardDescription className="text-xs">
                Review candidate summary and complete the registration processing fee
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-purple-tint/30 border border-purple-primary/30 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Intake Batch:</span>
                  <span className="font-bold text-foreground">AY 2026–2027 General Intake</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Candidate Name:</span>
                  <span className="font-bold text-foreground">
                    {firstName} {lastName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Target Class:</span>
                  <Badge className="bg-purple-primary text-white text-[10px]">
                    {selectedClass.name}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Assigned Track:</span>
                  <span className="font-bold text-foreground">
                    {selectedClass.track === "DIRECT_ADMISSION" ? "Direct Admission" : "Entrance Assessment"}
                  </span>
                </div>
                <div className="border-t border-purple-primary/20 pt-2 flex justify-between items-center text-sm font-bold text-foreground">
                  <span>Application Processing Fee:</span>
                  <span className="text-purple-primary">₹500.00</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-text-secondary block mb-1">
                  UPI / Razorpay Payment Reference Number *
                </label>
                <Input
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>

              <div className="pt-2 flex justify-between">
                <Button variant="ghost" size="sm" onClick={() => setStep(3)} className="text-xs">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmitApplication}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Submit Official Application
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SUBMISSION SUCCESS TRACKER CARD */}
        {isSubmitted && (
          <Card className="border-emerald-200 bg-emerald-50/20 shadow-md">
            <CardContent className="p-8 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <Badge className="bg-emerald-600 text-white text-xs">Application Submitted</Badge>
                <h2 className="text-xl font-extrabold text-foreground">
                  Congratulations, {firstName}!
                </h2>
                <p className="text-xs text-text-secondary max-w-md mx-auto">
                  Your admission application for {selectedClass.name} has been received and routed to our administrative desk.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-border inline-block text-left text-xs space-y-2 min-w-[280px]">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Application No:</span>
                  <span className="font-mono font-bold text-purple-primary">{generatedAppNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Admission Track:</span>
                  <span className="font-bold text-foreground">
                    {selectedClass.track === "DIRECT_ADMISSION" ? "Direct Track" : "Entrance Assessment"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Fee Status:</span>
                  <Badge className="bg-emerald-600 text-white text-[10px]">PAID (₹500)</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Tracker Login PIN:</span>
                  <span className="font-mono text-text-secondary">Your DOB (DDMMYYYY)</span>
                </div>
              </div>

              <div className="pt-2">
                <Button asChild className="bg-purple-primary text-white text-xs">
                  <Link href="/login">Return to Home / Login</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
