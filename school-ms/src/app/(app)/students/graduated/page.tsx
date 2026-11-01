"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  GraduationCap,
  RotateCcw,
  Search,
  Check,
  Eye,
  FileCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

export default function GraduatedAlumniPage() {
  const [alumni, setAlumni] = React.useState(
    MOCK_STUDENTS.filter((s) => s.isGraduated)
  );
  const [search, setSearch] = React.useState("");
  const [toast, setToast] = React.useState<string | null>(null);

  const handleRestore = (id: string, name: string) => {
    setAlumni(alumni.filter((a) => a.id !== id));
    setToast(`${name} has been restored to active student status.`);
    setTimeout(() => setToast(null), 3000);
  };

  const filteredAlumni = alumni.filter(
    (a) =>
      a.user.name.toLowerCase().includes(search.toLowerCase()) ||
      a.admNo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
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
            <span className="font-semibold text-purple-primary">Alumni Directory</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-purple-primary" />
            Graduated Alumni
          </h1>
          <p className="text-xs text-text-secondary">
            Directory of graduated student cohorts with transcript access and restoration option.
          </p>
        </div>
      </div>

      {toast && (
        <div className="p-3 rounded-xl bg-purple-tint border border-lavender text-purple-primary text-xs flex items-center gap-2 shadow-xs">
          <Check className="h-4 w-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* Main Table Card */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-sm font-bold">
            Alumni Records ({filteredAlumni.length})
          </CardTitle>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
            <Input
              placeholder="Search by alumni name / Adm No..."
              className="pl-8 h-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admission No</TableHead>
                <TableHead>Alumnus Name</TableHead>
                <TableHead>Graduation Session</TableHead>
                <TableHead>Terminal Standard</TableHead>
                <TableHead>State / District</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlumni.length > 0 ? (
                filteredAlumni.map((a) => (
                  <TableRow key={a.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-bold text-purple-primary">
                      {a.admNo}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-purple-tint text-purple-primary text-[10px] font-bold">
                            {a.user.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-xs text-foreground">
                            {a.user.name}
                          </p>
                          <p className="text-[10px] text-text-secondary">
                            Graduated: {a.sessionYear}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        AY {a.sessionYear}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs text-foreground font-medium">
                      Class 12 (Senior Secondary)
                    </TableCell>

                    <TableCell className="text-xs text-text-secondary">
                      {a.user.state || "Delhi"} ({a.user.district || "Central Delhi"})
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-text-secondary hover:text-purple-primary"
                        >
                          <Link href={`/students/${a.id}`}>
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Transcript
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(a.id, a.user.name)}
                          className="h-7 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restore Student
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-xs text-text-secondary"
                  >
                    No alumni records found.
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
