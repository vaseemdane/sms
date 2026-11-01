"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Edit2,
  FileText,
  KeyRound,
  Trash2,
  Calendar,
  Building,
  Phone,
  Mail,
  MapPin,
  Heart,
  UserCheck,
  IndianRupee,
  ShieldAlert,
  Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/utils";
import { MOCK_STUDENTS } from "@/mocks/users";
import { MOCK_MARKS, MOCK_PAYMENTS } from "@/mocks/exams-and-fees";

function StudentProfileContent() {
  const params = useParams();
  const studentId = (params?.id as string) || "std-1";

  const student =
    MOCK_STUDENTS.find((s) => s.id === studentId) || MOCK_STUDENTS[0];

  const studentMarks = student ? MOCK_MARKS.filter((m) => m.studentId === student.id) : [];
  const studentPayments = student ? MOCK_PAYMENTS.filter(
    (p) => p.studentId === student.id
  ) : [];

  const [resetSuccess, setResetSuccess] = React.useState(false);

  const handlePasswordReset = () => {
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3000);
  };

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

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in-50 duration-200">
      {/* Top Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-text-secondary self-start">
          <Link href={`/classes/${student.classId}/students`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Class Roster
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePasswordReset}
            className="h-8 gap-1.5 text-xs"
          >
            <KeyRound className="h-3.5 w-3.5 text-purple-primary" />
            Reset Password
          </Button>

          <Button asChild size="sm" className="h-8 gap-1.5 text-xs bg-purple-primary text-white hover:bg-purple-primary/90">
            <Link href={`/students/${student.id}/edit`}>
              <Edit2 className="h-3.5 w-3.5" />
              Edit Record
            </Link>
          </Button>

          <Button asChild size="sm" variant="lavender" className="h-8 gap-1.5 text-xs">
            <Link href={`/students/${student.id}/report-card`}>
              <FileText className="h-3.5 w-3.5" />
              Term Report Card
            </Link>
          </Button>
        </div>
      </div>

      {resetSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <span>Password reset successfully. Default temporary password: <strong className="font-mono">student</strong></span>
          <Badge variant="success">Success</Badge>
        </div>
      )}

      {/* Identity Card Header */}
      <Card className="border-border shadow-md overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-purple-primary via-purple-soft to-lavender relative" />
        <CardContent className="pt-0 px-6 sm:px-8 pb-6 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12 mb-4">
            <div className="flex items-end gap-4">
              <Avatar className="h-24 w-24 border-4 border-surface shadow-md">
                <AvatarImage src={student.user.photo} />
                <AvatarFallback className="text-xl font-bold bg-purple-tint text-purple-primary">
                  {student.user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                    {student.user.name}
                  </h1>
                  <Badge variant="secondary" className="text-xs font-semibold">
                    Roll: {student.rollNo || "10A01"}
                  </Badge>
                </div>
                <p className="text-xs text-text-secondary font-mono">
                  Admission No: <span className="font-bold text-purple-primary">{student.admNo}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">
                {student.myClass?.name || "Class 10"} · {student.section?.name || "Section A"}
              </Badge>
              <Badge variant="outline">
                AY {student.sessionYear}
              </Badge>
              {student.isGraduated ? (
                <Badge variant="warning">Alumni (Graduated)</Badge>
              ) : (
                <Badge variant="success">Enrolled Active</Badge>
              )}
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border/80 text-xs">
            <div className="flex items-center gap-2 text-text-secondary">
              <Calendar className="h-4 w-4 text-purple-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Date of Birth</p>
                <p className="font-semibold text-foreground">{student.user.dob || "14 Aug 2009"} (Age {student.age || 15})</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-text-secondary">
              <Heart className="h-4 w-4 text-rose-500" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Blood Group & Gender</p>
                <p className="font-semibold text-foreground">{student.user.bloodGroup || "O+"} · {student.user.gender || "Male"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-text-secondary">
              <MapPin className="h-4 w-4 text-purple-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">State / District</p>
                <p className="font-semibold text-foreground">{student.user.state || "Delhi"} ({student.user.district || "South Delhi"})</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-text-secondary">
              <Building className="h-4 w-4 text-purple-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Boarding Status</p>
                <p className="font-semibold text-foreground">{student.dorm?.name || "Day Scholar"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Tabs */}
      <Tabs defaultValue="biodata" className="w-full">
        <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent p-0 h-auto gap-4">
          <TabsTrigger
            value="biodata"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-primary data-[state=active]:bg-transparent py-2.5 px-1 text-xs"
          >
            Personal & Guardian Details
          </TabsTrigger>
          <TabsTrigger
            value="academic"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-primary data-[state=active]:bg-transparent py-2.5 px-1 text-xs"
          >
            Term Marks & Academic Performance
          </TabsTrigger>
          <TabsTrigger
            value="fees"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-primary data-[state=active]:bg-transparent py-2.5 px-1 text-xs"
          >
            Fee Receipts & Invoices (INR)
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Biodata */}
        <TabsContent value="biodata" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Guardian Info */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-purple-primary" />
                  Parent / Guardian Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-text-secondary">Parent Name:</span>
                  <span className="font-semibold text-foreground">{student.parent?.name || "Manoj Chawla"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-text-secondary">Primary Contact:</span>
                  <span className="font-mono font-medium text-foreground">{student.parent?.phone || "+91 9911223344"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-text-secondary">Email:</span>
                  <span className="font-medium text-foreground">{student.parent?.email || "manoj.chawla@gmail.com"}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-text-secondary">Relationship:</span>
                  <span className="font-medium text-foreground">Father (Legal Guardian)</span>
                </div>
              </CardContent>
            </Card>

            {/* Residential Address */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-purple-primary" />
                  Residential Address (Indian Geo)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-text-secondary">Address Line:</span>
                  <span className="font-medium text-foreground">{student.user.address || "B-42, Greater Kailash I"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-text-secondary">District:</span>
                  <span className="font-semibold text-foreground">{student.user.district || "South Delhi"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-text-secondary">State / UT:</span>
                  <span className="font-semibold text-foreground">{student.user.state || "Delhi"}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-text-secondary">Country:</span>
                  <span className="font-medium text-foreground">India (+91)</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Academic Marks */}
        <TabsContent value="academic" className="mt-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Term Assessment Record</CardTitle>
                  <CardDescription className="text-xs">Continuous Assessment (40) + Terminal Exam (60) = 100</CardDescription>
                </div>
                <Badge variant="info">Term 1 (2024–2025)</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-center">CA Score (/40)</TableHead>
                    <TableHead className="text-center">Exam Score (/60)</TableHead>
                    <TableHead className="text-center">Total (/100)</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                    <TableHead>Teacher Remark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentMarks.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-semibold text-xs text-foreground">
                        {m.subject?.name}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">{m.testScore}</TableCell>
                      <TableCell className="text-center font-mono text-xs">{m.examScore}</TableCell>
                      <TableCell className="text-center font-mono text-xs font-bold text-purple-primary">
                        {m.totalScore}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="success" className="text-[10px]">
                          {m.grade?.name || "A1"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-text-secondary">
                        {m.teacherRemark}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Fees */}
        <TabsContent value="fees" className="mt-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Fee Collection History</CardTitle>
                  <CardDescription className="text-xs">Indian Rupee (INR) receipts with payment mode verification</CardDescription>
                </div>
                <Button asChild size="sm" className="h-8 text-xs bg-purple-primary text-white hover:bg-purple-primary/90">
                  <Link href="/fees/payments">
                    <IndianRupee className="h-3.5 w-3.5 mr-1" />
                    Collect New Payment
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt No</TableHead>
                    <TableHead>Fee Head</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference / Txn ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs font-bold text-foreground">
                        {p.receiptNo}
                      </TableCell>
                      <TableCell className="text-xs text-foreground">
                        {p.feeStructure?.title}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-purple-primary">
                        {formatINR(p.amountPaid)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {p.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-text-secondary">
                        {p.referenceNo || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-text-secondary">
                        {formatDate(p.paidAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="success" className="text-[10px]">
                          {p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function StudentProfilePage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-xs text-text-secondary">Loading profile...</div>}>
      <StudentProfileContent />
    </React.Suspense>
  );
}
