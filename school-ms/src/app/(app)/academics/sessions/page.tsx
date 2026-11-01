"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Plus,
  CheckCircle2,
  Clock,
  Archive,
  RefreshCw,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  code: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isActive: boolean;
  description?: string;
}

export default function AcademicSessionsPage() {
  const { user } = useAuth();
  const isAdmin = user?.userType === "super_admin" || user?.userType === "admin";

  const [years, setYears] = React.useState<AcademicYear[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isCurrent, setIsCurrent] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const fetchYears = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient<{ success: boolean; data: AcademicYear[] }>("/academics/years");
      if (res && res.data) {
        setYears(res.data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load academic sessions.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await apiClient("/academics/years", {
        method: "POST",
        body: JSON.stringify({
          name,
          code,
          startDate,
          endDate,
          isCurrent,
          description: description || undefined,
        }),
      });
      setSuccessMsg(`Academic session ${name} created successfully.`);
      setCreateModalOpen(false);
      setName("");
      setCode("");
      setStartDate("");
      setEndDate("");
      setDescription("");
      setIsCurrent(false);
      fetchYears();
    } catch (err: any) {
      setError(err?.message || "Failed to create academic session.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = async (yearId: string, yearName: string) => {
    if (!confirm(`Are you sure you want to set "${yearName}" as the CURRENT active session? All other sessions will be deactivated.`)) {
      return;
    }
    try {
      setError(null);
      await apiClient(`/academics/years/${yearId}/activate`, {
        method: "PATCH",
      });
      setSuccessMsg(`Session "${yearName}" is now the active academic session.`);
      fetchYears();
    } catch (err: any) {
      setError(err?.message || "Failed to activate session.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-xl border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Academic Sessions</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Academic Sessions: Manage school academic calendars and active enrollment years.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Academic Session
          </Button>
        )}
      </div>

      {/* Alerts */}
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

      {/* Main Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Configured Academic Years</CardTitle>
            <CardDescription>
              Only one academic session can be current and active simultaneously. Historical sessions remain intact for reports.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchYears} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No academic sessions found in database.
                  </TableCell>
                </TableRow>
              )}
              {years.map((y) => (
                <TableRow key={y.id} className={y.isCurrent ? "bg-primary/5" : ""}>
                  <TableCell className="font-semibold flex items-center gap-2">
                    {y.name}
                    {y.isCurrent && (
                      <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Current Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{y.code}</code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {y.startDate} to {y.endDate}
                  </TableCell>
                  <TableCell>
                    {y.isCurrent && y.isActive ? (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50/50">
                        Active
                      </Badge>
                    ) : y.startDate > new Date().toISOString().split("T")[0] ? (
                      <Badge variant="secondary" className="gap-1 text-sky-700 bg-sky-50 border border-sky-200">
                        Planned
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 text-muted-foreground">
                        <Archive className="h-3 w-3" />
                        Archived
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {y.description || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin && !y.isCurrent && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleActivate(y.id, y.name)}
                        className="gap-1 text-xs"
                      >
                        Set as Current
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Add New Academic Session</DialogTitle>
              <DialogDescription>
                Create upcoming academic cycles (e.g. 2027–2028).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="s-name">Session Name *</Label>
                <Input
                  id="s-name"
                  placeholder="2027-2028"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="s-code">Session Code *</Label>
                <Input
                  id="s-code"
                  placeholder="2027-28"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="s-start">Start Date *</Label>
                  <Input
                    id="s-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-end">End Date *</Label>
                  <Input
                    id="s-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="s-desc">Description / Notes</Label>
                <Input
                  id="s-desc"
                  placeholder="Official CBSE academic calendar"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="s-current"
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                  checked={isCurrent}
                  onChange={(e) => setIsCurrent(e.target.checked)}
                />
                <Label htmlFor="s-current" className="text-sm font-medium cursor-pointer">
                  Activate as Current Active Session immediately
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Create Session"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
