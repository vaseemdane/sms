"use client";

import * as React from "react";
import {
  Users,
  GraduationCap,
  BookOpen,
  Layers,
  Shield,
  RefreshCw,
  AlertCircle,
  FileQuestion,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiClient } from "@/lib/api-client";
import { User } from "@/types";
import { useSMSStore } from "@/context/sms-store";
import { useAuth } from "@/services/auth-context";
import { formatGreeting } from "@/lib/utils";

export interface SubjectStatistic {
  subject_id: string;
  subject_name: string;
  code: string;
  faculty_count: number;
  enrolled_student_count: number;
}

export interface AdminDashboardData {
  welcome_name: string;
  active_session: string;
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSections: number;
  totalUsers: number;
  systemStatus: string;
  subject_statistics: SubjectStatistic[];
}

interface AdminDashboardProps {
  user: User | null;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const { logout } = useAuth();
  const { users, sections, teachers, students } = useSMSStore();

  const [data, setData] = React.useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchDashboardStats = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient<{ success: boolean; data: AdminDashboardData }>(
        "/admin/dashboard/stats"
      );
      if (res && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      const errMsg = err?.message || "Failed to load administrative overview.";
      setError(errMsg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // Loading skeleton
  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-muted rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  const welcomeName = user?.name || data?.welcome_name || "zuha";
  const activeSession = data?.active_session || "2026–2027";
  const subjectStats = data?.subject_statistics || [];
  const isAuthError = Boolean(
    error && (error.includes("token") || error.includes("401") || error.includes("Unauthorized") || error.includes("expired"))
  );

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Session Expired / Sync Notice Alert Banner */}
      {error && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {isAuthError
                ? "Your live session token has expired. Displaying cached dashboard data."
                : `Sync Notice: ${error}. Displaying local dashboard data.`}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboardStats}
              disabled={loading}
              className="h-7 text-xs bg-surface"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
              Retry
            </Button>
            {isAuthError && (
              <Button
                size="sm"
                className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                onClick={() => logout()}
              >
                Sign in again
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 1. SIMPLIFIED PROFESSIONAL HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-xl border shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {formatGreeting(welcomeName)}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Academic Session {activeSession} • High-Level Administrative Overview
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 font-medium bg-muted/40 text-xs">
            <Shield className="h-3.5 w-3.5 mr-1 text-primary" />
            System Governance
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardStats}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* 2. HIGH-LEVEL ADMINISTRATIVE SUMMARY (KEY KPIS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/80 bg-surface shadow-2xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Enrolled Students</p>
              <p className="text-2xl font-bold text-foreground">
                {data?.totalStudents ?? students.length}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold">Active Session {activeSession}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center">
              <GraduationCap className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-2xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Teaching Faculty</p>
              <p className="text-2xl font-bold text-foreground">
                {data?.totalTeachers ?? teachers.length}
              </p>
              <p className="text-[11px] text-primary font-semibold">Verified Faculty</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400 flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-2xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Academic Classes</p>
              <p className="text-2xl font-bold text-foreground">
                {data?.totalClasses ?? 13}
              </p>
              <p className="text-[11px] text-blue-600 font-semibold">Configured Tiers</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center">
              <BookOpen className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-surface shadow-2xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Active Sections</p>
              <p className="text-2xl font-bold text-foreground">
                {data?.totalSections ?? sections.length}
              </p>
              <p className="text-[11px] text-amber-600 font-semibold">Student Cohorts</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center">
              <Layers className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. SUBJECT-WISE FACULTY & STUDENT OVERVIEW */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Subject-wise Faculty & Student Overview
          </CardTitle>
          <CardDescription>
            Live academic distribution across subjects derived from active teacher assignments and student enrollments for {activeSession}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subjectStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-2">
              <FileQuestion className="h-10 w-10 stroke-[1.5]" />
              <p className="text-sm font-medium">No subject data available.</p>
              <p className="text-xs">Subjects created in the academic structure will appear here with dynamic counts.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold text-foreground">Subject</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Teaching Faculty (All Classes)</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Enrolled Students (All Classes)</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Faculty Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjectStats.map((stat) => (
                    <TableRow key={stat.subject_id || stat.subject_name}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{stat.subject_name}</span>
                          {stat.code && (
                            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {stat.code}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        {stat.faculty_count}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        {stat.enrolled_student_count}
                      </TableCell>
                      <TableCell className="text-right">
                        {stat.faculty_count > 0 ? (
                          <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-200">
                            Staffed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-700 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 border-amber-200">
                            Unassigned
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
