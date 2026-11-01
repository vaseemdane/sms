"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  BookOpen,
  Users,
  Search,
  Check,
  AlertCircle,
  Calendar,
  Sparkles,
  GraduationCap,
  Layers,
  Archive,
  RefreshCw,
  Edit2,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface SectionItem {
  id: string;
  classId: string;
  streamId?: string | null;
  streamName?: string | null;
  name: string;
  code: string;
  capacity: number;
  roomNumber?: string | null;
  isActive: boolean;
  classTeacherId?: string | null;
  classTeacherName?: string | null;
  studentsCount?: number;
}

interface ClassItem {
  id: string;
  name: string;
  classTypeId: string;
  orderIndex: number;
  hasStreams: boolean;
  isActive: boolean;
  sections: SectionItem[];
  sectionsCount: number;
  studentsCount: number;
}

export default function ClassesAndGradesManagementPage() {
  const { user } = useAuth();
  const isAdmin = user?.userType === "super_admin" || user?.userType === "admin";
  const isPrincipal = user?.userType === "principal";

  const [classes, setClasses] = React.useState<ClassItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedClassFilter, setSelectedClassFilter] = React.useState<string>("all");
  const [selectedSectionFilter, setSelectedSectionFilter] = React.useState<string>("all");

  // Create Class Modal (Admin Only)
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [className, setClassName] = React.useState("");
  const [classTypeId, setClassTypeId] = React.useState("ct-secondary");
  const [orderIndex, setOrderIndex] = React.useState<number>(10);
  const [hasStreams, setHasStreams] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Edit Class Modal (Admin Only)
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editingClass, setEditingClass] = React.useState<ClassItem | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editOrder, setEditOrder] = React.useState<number>(0);
  const [editHasStreams, setEditHasStreams] = React.useState(false);

  // Quick Section Modal (Admin Only)
  const [sectionModalOpen, setSectionModalOpen] = React.useState(false);
  const [targetClassForSection, setTargetClassForSection] = React.useState<ClassItem | null>(null);
  const [secName, setSecName] = React.useState("Section A");
  const [secCode, setSecCode] = React.useState("A");
  const [secCapacity, setSecCapacity] = React.useState(40);
  const [secRoom, setSecRoom] = React.useState("");

  // Delete Class Modal (Admin Only)
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [classToDelete, setClassToDelete] = React.useState<ClassItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const fetchClasses = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient<{ success: boolean; data: ClassItem[] }>("/academics/classes");
      if (res && res.data) {
        setClasses(res.data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load master classes.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setError("Forbidden: Only Administrators can create or modify master classes.");
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await apiClient("/academics/classes", {
        method: "POST",
        body: JSON.stringify({
          name: className.trim(),
          classTypeId,
          orderIndex: Number(orderIndex),
          hasStreams,
        }),
      });
      setSuccessMsg(`Class "${className}" created in database.`);
      setCreateModalOpen(false);
      setClassName("");
      setOrderIndex(classes.length + 1);
      setHasStreams(false);
      fetchClasses();
    } catch (err: any) {
      setError(err?.message || "Failed to create class.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !isAdmin) return;
    try {
      setSubmitting(true);
      setError(null);
      await apiClient(`/academics/classes/${editingClass.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName.trim(),
          orderIndex: Number(editOrder),
          hasStreams: editHasStreams,
        }),
      });
      setSuccessMsg(`Class "${editName}" updated successfully.`);
      setEditModalOpen(false);
      setEditingClass(null);
      fetchClasses();
    } catch (err: any) {
      setError(err?.message || "Failed to update class.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClassForSection || !isAdmin) return;
    try {
      setSubmitting(true);
      setError(null);
      await apiClient("/academics/sections", {
        method: "POST",
        body: JSON.stringify({
          classId: targetClassForSection.id,
          name: secName.trim(),
          code: secCode.trim(),
          capacity: Number(secCapacity),
          roomNumber: secRoom.trim() || undefined,
        }),
      });
      setSuccessMsg(`Section "${secName}" added to ${targetClassForSection.name}.`);
      setSectionModalOpen(false);
      setTargetClassForSection(null);
      fetchClasses();
    } catch (err: any) {
      setError(err?.message || "Failed to create section.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!classToDelete || !isAdmin) return;
    try {
      setDeleting(true);
      setError(null);
      const res = await apiClient<{ success: boolean; message?: string }>(`/academics/classes/${classToDelete.id}`, {
        method: "DELETE",
      });
      setSuccessMsg(res?.message || `Class "${classToDelete.name}" removed successfully.`);
      setDeleteModalOpen(false);
      setClassToDelete(null);
      fetchClasses();
    } catch (err: any) {
      setError(err?.message || "Failed to delete class.");
    } finally {
      setDeleting(false);
    }
  };

  const availableSections = React.useMemo(() => {
    if (selectedClassFilter === "all") {
      return classes.flatMap((c) => c.sections);
    }
    const cls = classes.find((c) => c.id === selectedClassFilter);
    return cls ? cls.sections : [];
  }, [classes, selectedClassFilter]);

  const filteredClasses = classes.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClassFilter === "all" || c.id === selectedClassFilter;
    const matchesSection = selectedSectionFilter === "all" || c.sections.some((s) => s.id === selectedSectionFilter);
    return matchesSearch && matchesClass && matchesSection;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-xl border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Classes & Grades Architecture</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Academic Structure: Configure classes and grade levels for the institution.
            {isPrincipal ? (
              <span className="ml-2 font-semibold text-amber-600 dark:text-amber-400">
                (Principal View-Only Desk)
              </span>
            ) : (
              <span className="ml-2 font-semibold text-primary">
                (Admin Full Governance)
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchClasses} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {isAdmin && (
            <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Class / Grade
            </Button>
          )}
        </div>
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
          <Check className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {/* Search & Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Configured Classes</p>
              <h3 className="text-2xl font-bold">{classes.length}</h3>
            </div>
            <BookOpen className="h-8 w-8 text-primary/40" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Active Sections</p>
              <h3 className="text-2xl font-bold">
                {classes.reduce((acc, c) => acc + (c.sectionsCount || c.sections.length), 0)}
              </h3>
            </div>
            <Users className="h-8 w-8 text-primary/40" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Stream-Enabled Classes</p>
              <h3 className="text-2xl font-bold">
                {classes.filter((c) => c.hasStreams).length}
              </h3>
            </div>
            <GraduationCap className="h-8 w-8 text-indigo-500/40" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Enrolled Students</p>
              <h3 className="text-2xl font-bold">
                {classes.reduce((acc, c) => acc + (c.studentsCount || 0), 0)}
              </h3>
            </div>
            <Sparkles className="h-8 w-8 text-emerald-500/40" />
          </CardContent>
        </Card>
      </div>

      {/* Main Database Classes List */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Academic Classes & Grades</CardTitle>
            <CardDescription>
              Class structures and sections configured here are used across admissions, attendance, exams, and timetables.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Select value={selectedClassFilter} onValueChange={(val) => { setSelectedClassFilter(val); setSelectedSectionFilter("all"); }}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSectionFilter} onValueChange={setSelectedSectionFilter}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {availableSections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search classes..."
                className="pl-8 h-8 text-xs"
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
                <TableHead className="w-16">Order</TableHead>
                <TableHead>Class Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Stream Flag</TableHead>
                <TableHead>Active Sections</TableHead>
                <TableHead>Students</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClasses.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No classes found. Click &quot;Create Class / Grade&quot; to add.
                  </TableCell>
                </TableRow>
              )}
              {filteredClasses.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                    #{cls.orderIndex}
                  </TableCell>
                  <TableCell className="font-bold text-sm">
                    {cls.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {cls.classTypeId}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {cls.hasStreams ? (
                      <Badge variant="default" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1">
                        <GraduationCap className="h-3 w-3" />
                        Streams Enabled
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Standard</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {cls.sections.map((sec) => (
                        <Badge key={sec.id} variant="secondary" className="font-mono text-xs">
                          {sec.code}
                          {sec.streamName ? ` (${sec.streamName})` : ""}
                        </Badge>
                      ))}
                      {cls.sections.length === 0 && (
                        <span className="text-xs text-muted-foreground italic">No sections</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-semibold">
                    {cls.studentsCount || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin && (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => {
                            setTargetClassForSection(cls);
                            setSecName(`Section ${String.fromCharCode(65 + cls.sections.length)}`);
                            setSecCode(String.fromCharCode(65 + cls.sections.length));
                            setSectionModalOpen(true);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Section
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          title="Edit Class"
                          onClick={() => {
                            setEditingClass(cls);
                            setEditName(cls.name);
                            setEditOrder(cls.orderIndex);
                            setEditHasStreams(cls.hasStreams);
                            setEditModalOpen(true);
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Delete Class"
                          onClick={() => {
                            setClassToDelete(cls);
                            setDeleteModalOpen(true);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CREATE CLASS DIALOG (ADMIN ONLY) */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateClass}>
            <DialogHeader>
              <DialogTitle>Create New Class / Grade</DialogTitle>
              <DialogDescription>
                Add a new class to the database. All modules will automatically consume it.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="c-name">Class Name *</Label>
                <Input
                  id="c-name"
                  placeholder="e.g. Class 11, LKG, Nursery"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="c-type">Class Tier / Stage</Label>
                  <Select value={classTypeId} onValueChange={setClassTypeId}>
                    <SelectTrigger id="c-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ct-nursery">Pre-Primary (Nursery/KG)</SelectItem>
                      <SelectItem value="ct-primary">Primary (1st - 5th)</SelectItem>
                      <SelectItem value="ct-middle">Middle (6th - 8th)</SelectItem>
                      <SelectItem value="ct-secondary">Secondary (9th - 10th)</SelectItem>
                      <SelectItem value="ct-higher_secondary">Senior Secondary (11th - 12th)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="c-order">Display Priority / Order *</Label>
                  <Input
                    id="c-order"
                    type="number"
                    value={orderIndex}
                    onChange={(e) => setOrderIndex(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2 border p-3 rounded-lg bg-muted/30">
                <input
                  type="checkbox"
                  id="c-streams"
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                  checked={hasStreams}
                  onChange={(e) => setHasStreams(e.target.checked)}
                />
                <Label htmlFor="c-streams" className="text-sm font-medium cursor-pointer">
                  Requires Specialization Streams (Science / Commerce / Arts)
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Create Class"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT CLASS DIALOG (ADMIN ONLY) */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleUpdateClass}>
            <DialogHeader>
              <DialogTitle>Edit Class / Grade</DialogTitle>
              <DialogDescription>
                Modify display name, priority, or stream requirements.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Class Name *</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-order">Order Index *</Label>
                <Input
                  id="edit-order"
                  type="number"
                  value={editOrder}
                  onChange={(e) => setEditOrder(Number(e.target.value))}
                  required
                />
              </div>

              <div className="flex items-center space-x-2 pt-2 border p-3 rounded-lg bg-muted/30">
                <input
                  type="checkbox"
                  id="edit-streams"
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                  checked={editHasStreams}
                  onChange={(e) => setEditHasStreams(e.target.checked)}
                />
                <Label htmlFor="edit-streams" className="text-sm font-medium cursor-pointer">
                  Requires Specialization Streams (Science / Commerce / Arts)
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Updating..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QUICK ADD SECTION DIALOG (ADMIN ONLY) */}
      <Dialog open={sectionModalOpen} onOpenChange={setSectionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddSection}>
            <DialogHeader>
              <DialogTitle>Add Section to {targetClassForSection?.name}</DialogTitle>
              <DialogDescription>
                Define section code, room number, and student capacity.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="q-sec-name">Section Name *</Label>
                  <Input
                    id="q-sec-name"
                    value={secName}
                    onChange={(e) => setSecName(e.target.value)}
                    placeholder="Section A"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="q-sec-code">Code *</Label>
                  <Input
                    id="q-sec-code"
                    value={secCode}
                    onChange={(e) => setSecCode(e.target.value)}
                    placeholder="A"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="q-sec-cap">Student Capacity *</Label>
                  <Input
                    id="q-sec-cap"
                    type="number"
                    min="1"
                    max="100"
                    value={secCapacity}
                    onChange={(e) => setSecCapacity(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="q-sec-room">Room Number</Label>
                  <Input
                    id="q-sec-room"
                    placeholder="Room 101"
                    value={secRoom}
                    onChange={(e) => setSecRoom(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSectionModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Add Section"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CLASS CONFIRMATION DIALOG (ADMIN ONLY) */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Confirm Class Deletion
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to remove <strong>{classToDelete?.name}</strong>?
              If this class contains historical enrollments, it will be safely archived to protect academic records.
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
              onClick={handleDeleteClass}
              disabled={deleting}
            >
              {deleting ? "Removing..." : "Delete Class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
