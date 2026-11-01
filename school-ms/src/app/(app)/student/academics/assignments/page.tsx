"use client";

import * as React from "react";
import Link from "next/link";
import { ClipboardList, ArrowLeft, Clock, CheckCircle2, AlertCircle, Upload, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/services/auth-context";
import { apiClient } from "@/lib/api-client";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface AssignmentItem {
  id: string;
  title: string;
  description: string;
  subject: string;
  teacherName: string;
  dueDate: string;
  totalMarks: number;
}

export default function StudentAssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = React.useState<AssignmentItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submittingId, setSubmittingId] = React.useState<string | null>(null);
  const [submittedIds, setSubmittedIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    async function loadAssignments() {
      try {
        setLoading(true);
        // Default student section is 10A (sec-10a)
        const res = await apiClient.get<ApiResponse<AssignmentItem[]>>("/materials/assignments/section/sec-10a");
        if (res?.data) {
          setAssignments(res.data);
        }
      } catch (err) {
        console.error("Failed to load assignments", err);
      } finally {
        setLoading(false);
      }
    }
    loadAssignments();
  }, []);

  const handleQuickSubmit = async (assignmentId: string) => {
    try {
      setSubmittingId(assignmentId);
      await apiClient.post(`/materials/assignments/${assignmentId}/submissions`, {});
      setSubmittedIds((prev) => new Set(prev).add(assignmentId));
    } catch (err) {
      console.error("Failed to submit assignment", err);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
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
            <span className="text-text-primary font-medium">Assignments</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Homework & Coursework Assignments
          </h1>
          <p className="text-sm text-text-secondary">
            Review assignment instructions, deadlines, submission receipts, and teacher grading feedback.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-text-secondary">Loading assignments...</div>
      ) : assignments.length === 0 ? (
        <Card className="p-8 text-center">
          <CardTitle className="text-base text-text-secondary">No active assignments</CardTitle>
          <CardDescription className="mt-1">
            You are all caught up! New homework tasks from your teachers will be displayed here.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((asg) => {
            const isDone = submittedIds.has(asg.id);
            return (
              <Card key={asg.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className="text-xs font-semibold">
                      {asg.subject}
                    </Badge>
                    <Badge variant={isDone ? "default" : "secondary"} className="text-xs">
                      {isDone ? "Submitted" : "Pending"}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-semibold leading-snug mt-2">
                    {asg.title}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {asg.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>Teacher: {asg.teacherName}</span>
                    <span className="font-medium text-text-primary">Max Score: {asg.totalMarks}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>Due Date: {asg.dueDate}</span>
                  </div>
                  <Button
                    variant={isDone ? "outline" : "default"}
                    size="sm"
                    className="w-full gap-1.5 text-xs"
                    disabled={isDone || submittingId === asg.id}
                    onClick={() => handleQuickSubmit(asg.id)}
                  >
                    {isDone ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Submitted
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        {submittingId === asg.id ? "Submitting..." : "Submit Assignment"}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
