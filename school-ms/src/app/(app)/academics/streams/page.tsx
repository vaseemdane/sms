"use client";

import * as React from "react";
import {
  Layers,
  Plus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Archive,
  Trash2,
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

interface StreamItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export default function AcademicStreamsPage() {
  const { user } = useAuth();
  const isAdmin = user?.userType === "super_admin" || user?.userType === "admin";

  const [streams, setStreams] = React.useState<StreamItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [streamToDelete, setStreamToDelete] = React.useState<StreamItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!streamToDelete || !isAdmin) return;
    try {
      setDeleting(true);
      setError(null);
      const res = await apiClient<{ success: boolean; message?: string }>(`/academics/streams/${streamToDelete.id}`, {
        method: "DELETE",
      });
      setSuccessMsg(res?.message || `Stream "${streamToDelete.name}" deleted successfully.`);
      setDeleteModalOpen(false);
      setStreamToDelete(null);
      fetchStreams();
    } catch (err: any) {
      setError(err?.message || "Failed to delete stream.");
    } finally {
      setDeleting(false);
    }
  };

  const fetchStreams = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient<{ success: boolean; data: StreamItem[] }>("/academics/streams");
      if (res && res.data) {
        setStreams(res.data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load academic streams.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStreams();
  }, [fetchStreams]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await apiClient("/academics/streams", {
        method: "POST",
        body: JSON.stringify({
          name,
          code: code.toUpperCase(),
          description: description || undefined,
        }),
      });
      setSuccessMsg(`Stream "${name}" added to master database.`);
      setCreateModalOpen(false);
      setName("");
      setCode("");
      setDescription("");
      fetchStreams();
    } catch (err: any) {
      setError(err?.message || "Failed to create stream.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-xl border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Academic Streams</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Dynamic database entities for Higher Secondary (11th & 12th): Science, Commerce, Arts/Humanities.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add New Stream
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Configured Streams</CardTitle>
            <CardDescription>
              Sections and fee structures for 11th & 12th grades consume these streams dynamically.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStreams} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stream Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {streams.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-muted-foreground">
                    No streams found.
                  </TableCell>
                </TableRow>
              )}
              {streams.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-semibold">{s.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono font-bold text-primary">
                      {s.code}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.description || "—"}
                  </TableCell>
                  <TableCell>
                    {s.isActive ? (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Archive className="h-3 w-3" />
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete Stream"
                        onClick={() => {
                          setStreamToDelete(s);
                          setDeleteModalOpen(true);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Create Academic Stream</DialogTitle>
              <DialogDescription>
                Define a specialization track for senior secondary education.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="st-name">Stream Name *</Label>
                <Input
                  id="st-name"
                  placeholder="e.g. Science (PCM/PCB)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="st-code">Stream Code *</Label>
                <Input
                  id="st-code"
                  placeholder="SCI"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="st-desc">Description</Label>
                <Input
                  id="st-desc"
                  placeholder="Physics, Chemistry, Math & Biology curriculum track"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Add Stream"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Stream Dialog */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Confirm Stream Deletion
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete academic stream <strong>{streamToDelete?.name}</strong>?
              Deletion will be blocked if active classes, sections, or students are linked to this stream.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Stream"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
