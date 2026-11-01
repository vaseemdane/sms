"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Plus,
  Eye,
  Edit2,
  FileText,
  UserCheck,
  Download,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MOCK_STUDENTS } from "@/mocks/users";
import { MOCK_CLASSES, MOCK_SECTIONS } from "@/mocks/academics";

function ClassStudentsContent() {
  const params = useParams();
  const classId = (params?.classId as string) || "cls-10";

  const currentClass =
    MOCK_CLASSES.find((c) => c.id === classId) || MOCK_CLASSES[0];
  const classSections = MOCK_SECTIONS.filter((s) => s.classId === classId);

  const [activeSection, setActiveSection] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredStudents = MOCK_STUDENTS.filter((st) => {
    const matchesSection =
      activeSection === "all" || st.sectionId === activeSection;
    const matchesSearch =
      st?.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st?.admNo?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSection && matchesSearch && !st.isGraduated;
  });

  if (!currentClass) {
    return (
      <div className="p-12 text-center space-y-3">
        <h2 className="text-base font-bold text-foreground">No Classes Found</h2>
        <p className="text-xs text-text-secondary">All mock classes and students purged. Create your first academic class.</p>
        <Button asChild size="sm" className="bg-purple-primary text-white text-xs">
          <Link href="/academics/classes">Go to Class Setup</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
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
            <Link href="/academics/classes" className="hover:underline">
              Academics
            </Link>
            <span>/</span>
            <span className="font-semibold text-purple-primary">{currentClass.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {currentClass.name} Student Cohort
          </h1>
          <p className="text-xs text-text-secondary">
            Section arms roster, roll number indices and student identity cards.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            Export Roster (CSV)
          </Button>
          <Button asChild size="sm" className="h-9 gap-1.5 text-xs bg-purple-primary text-white hover:bg-purple-primary/90">
            <Link href="/students/new">
              <Plus className="h-4 w-4" />
              Admit New Student
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Section Filter Tabs */}
            <Tabs
              value={activeSection}
              onValueChange={setActiveSection}
              className="w-full sm:w-auto"
            >
              <TabsList>
                <TabsTrigger value="all" className="text-xs">
                  All Arms ({currentClass.studentsCount || filteredStudents.length})
                </TabsTrigger>
                {classSections.map((sec) => (
                  <TabsTrigger key={sec.id} value={sec.id} className="text-xs">
                    {sec.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
              <Input
                placeholder="Search by name or Adm No..."
                className="pl-8 h-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Roll No</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Admission No</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Guardian</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>State / District</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((st) => (
                  <TableRow key={st.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-semibold text-text-secondary">
                      {st.rollNo || "—"}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-purple-tint text-purple-primary text-[10px] font-bold">
                            {st.user.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-xs text-foreground">
                            {st.user.name}
                          </p>
                          <p className="text-[10px] text-text-secondary">
                            Gender: {st.user.gender} · Blood: {st.user.bloodGroup}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-xs text-purple-primary font-bold">
                      {st.admNo}
                    </TableCell>

                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] font-semibold">
                        {st.section?.name || "Section A"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs text-foreground">
                      {st.parent?.name || "Manoj Chawla"}
                    </TableCell>

                    <TableCell className="text-xs text-text-secondary font-mono">
                      {st.user.phone || "+91 9911223344"}
                    </TableCell>

                    <TableCell className="text-xs text-text-secondary">
                      {st.user.state || "Delhi"} ({st.user.district || "South Delhi"})
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-text-secondary hover:text-purple-primary"
                          title="View Profile"
                        >
                          <Link href={`/students/${st.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-text-secondary hover:text-purple-primary"
                          title="Edit Student"
                        >
                          <Link href={`/students/${st.id}/edit`}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-text-secondary hover:text-purple-primary"
                          title="Report Card"
                        >
                          <Link href={`/students/${st.id}/report-card`}>
                            <FileText className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-xs text-text-secondary">
                    No students found matching current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ClassStudentsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-xs text-text-secondary">Loading cohort...</div>}>
      <ClassStudentsContent />
    </React.Suspense>
  );
}
