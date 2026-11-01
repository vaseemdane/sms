"use client";

import * as React from "react";
import {
  Users,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Building,
  GraduationCap,
  Trash2,
  Pencil,
  UserCheck,
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

interface StreamItem {
  id: string;
  name: string;
  code: string;
}

interface SectionItem {
  id: string;
  classId: string;
  className?: string;
  streamId?: string;
  streamName?: string;
  name: string;
  code: string;
  capacity: number;
  roomNumber?: string;
  isActive: boolean;
  classTeacherName?: string;
  studentsCount?: number;
}

interface ClassItem {
  id: string;
  name: string;
  hasStreams: boolean;
  sections: SectionItem[];
}

export default function AcademicSectionsPage() {
  const { user } = useAuth();
  const isAdmin = user?.userType === "super_admin" || user?.userType === "admin";
  const isPrincipal = user?.userType === "principal";
  const canManage = isAdmin || isPrincipal;

  const [classes, setClasses] = React.useState<ClassItem[]>([]);
  const [streams, setStreams] = React.useState<StreamItem[]>([]);
  const [teachers, setTeachers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Filters
  const [selectedClassFilter, setSelectedClassFilter] = React.useState<string>("all");

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [targetClassId, setTargetClassId] = React.useState("");
  const [targetStreamId, setTargetStreamId] = React.useState("");
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [capacity, setCapacity] = React.useState(40);
  const [roomNumber, setRoomNumber] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // Edit Modal (Capacity & Room)
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [sectionToEdit, setSectionToEdit] = React.useState<SectionItem | null>(null);
  const [editCapacity, setEditCapacity] = React.useState(40);
  const [editRoomNo, setEditRoomNo] = React.useState("");
  const [updating, setUpdating] = React.useState(false);

  // Principal Class Teacher Assignment Modal
  const [assignModalOpen, setAssignModalOpen] = React.useState(false);
  const [sectionToAssign, setSectionToAssign] = React.useState<SectionItem | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = React.useState("");
  const [assigning, setAssigning] = React.useState(false);

  // Delete Section Modal
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [sectionToDelete, setSectionToDelete] = React.useState<any | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionToEdit) return;
    try {
      setUpdating(true);
      setError(null);
      await apiClient(`/academics/sections/${sectionToEdit.id}`, {
        method: "PUT",
        body: JSON.stringify({
          capacity: Number(editCapacity) || 40,
          room_no: editRoomNo,
        }),
      });
      setSuccessMsg(`Section "${sectionToEdit.name}" updated successfully.`);
      setEditModalOpen(false);
      setSectionToEdit(null);
      fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to update section.");
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionToAssign || !isPrincipal) return;
    try {
      setAssigning(true);
      setError(null);
      if (selectedTeacherId === "unassign") {
        await apiClient.post("/academics/unassign/class-teacher", {
          sectionId: sectionToAssign.id,
          teacherId: "",
        });
        setSuccessMsg(`Class teacher unassigned from ${sectionToAssign.name}.`);
      } else {
        await apiClient.post("/academics/assign/class-teacher", {
          sectionId: sectionToAssign.id,
          teacherId: selectedTeacherId,
        });
        setSuccessMsg(`Class teacher assigned to ${sectionToAssign.name}.`);
      }
      setAssignModalOpen(false);
      setSectionToAssign(null);
      fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to assign class teacher.");
    } finally {
      setAssigning(false);
    }
  };

  const handleDelete = async () => {
    if (!sectionToDelete || !isAdmin) return;
    try {
      setDeleting(true);
      setError(null);
      const res = await apiClient<{ success: boolean; message?: string }>(`/academics/sections/${sectionToDelete.id}`, {
        method: "DELETE",
      });
      setSuccessMsg(res?.message || `Section "${sectionToDelete.name}" removed successfully.`);
      setDeleteModalOpen(false);
      setSectionToDelete(null);
      fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to delete section.");
    } finally {
      setDeleting(false);
    }
  };

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [clsRes, stRes, teachersRes] = await Promise.all([
        apiClient<{ success: boolean; data: ClassItem[] }>("/academics/classes"),
        apiClient<{ success: boolean; data: StreamItem[] }>("/academics/streams"),
        apiClient<{ success: boolean; data: { items: any[] } }>("/admin/users?role=teacher&page_size=100").catch(() => null),
      ]);
      if (clsRes && clsRes.data) setClasses(clsRes.data);
      if (stRes && stRes.data) setStreams(stRes.data);
      if (teachersRes && teachersRes.data?.items) setTeachers(teachersRes.data.items);
    } catch (err: any) {
      setError(err?.message || "Failed to load sections.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const targetClassObj = classes.find((c) => c.id === targetClassId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClassId) {
      setError("Please select a Class.");
      return;
    }
    if (targetClassObj?.hasStreams && !targetStreamId) {
      setError(`Class "${targetClassObj.name}" requires selecting a Stream.`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await apiClient("/academics/sections", {
        method: "POST",
        body: JSON.stringify({
          classId: targetClassId,
          streamId: targetClassObj?.hasStreams ? targetStreamId : undefined,
          name,
          code,
          capacity: Number(capacity) || 40,
          roomNumber: roomNumber || undefined,
        }),
      });
      setSuccessMsg(`Section "${name}" created successfully.`);
      setCreateModalOpen(false);
      setName("");
      setCode("");
      setCapacity(40);
      setRoomNumber("");
      setTargetStreamId("");
      fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to create section.");
    } finally {
      setSubmitting(false);
    }
  };

  // Flatten sections with class context
  const allSections = classes.flatMap((cls) =>
    cls.sections.map((sec) => ({
      ...sec,
      className: cls.name,
      classHasStreams: cls.hasStreams,
    }))
  );

  const filteredSections = selectedClassFilter === "all"
    ? allSections
    : allSections.filter((s) => s.classId === selectedClassFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-xl border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Section Management</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Sections linked to Classes and optional Streams with max enrollment capacity controls.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Section
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
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Active Class Sections</CardTitle>
            <CardDescription>
              Monitor room assignments, stream bindings, class teacher allocations, and enrollment capacity.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2 shrink-0">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Section Name</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Enrolled Students</TableHead>
                <TableHead>Class Teacher</TableHead>
                <TableHead>Room</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSections.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={canManage ? 7 : 6} className="text-center py-8 text-muted-foreground">
                    No active sections available. Use &apos;+ Create Section&apos; to configure one.
                  </TableCell>
                </TableRow>
              )}
              {filteredSections.map((sec) => {
                const count = sec.studentsCount || 0;
                const isFull = count >= sec.capacity;
                return (
                  <TableRow key={sec.id}>
                    <TableCell className="font-semibold">{sec.className}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {sec.name} ({sec.code})
                      </Badge>
                    </TableCell>
                    <TableCell>{sec.capacity}</TableCell>
                    <TableCell>
                      <span className={`font-semibold ${isFull ? "text-destructive" : "text-foreground"}`}>
                        {count} / {sec.capacity}
                      </span>
                      {isFull && (
                        <Badge variant="destructive" className="ml-2 text-[10px]">
                          FULL
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {sec.classTeacherName || <span className="text-muted-foreground italic">Unassigned</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sec.roomNumber || "—"}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isPrincipal && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                              title="Assign/Reassign Class Teacher (Principal Only)"
                              onClick={() => {
                                setSectionToAssign(sec);
                                setSelectedTeacherId("");
                                setAssignModalOpen(true);
                              }}
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Edit Capacity & Room"
                            onClick={() => {
                              setSectionToEdit(sec);
                              setEditCapacity(sec.capacity);
                              setEditRoomNo(sec.roomNumber || "");
                              setEditModalOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Delete Section"
                              onClick={() => {
                                setSectionToDelete(sec);
                                setDeleteModalOpen(true);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Add Class Section</DialogTitle>
              <DialogDescription>
                Define section capacity, room, and stream binding if applicable.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sec-cls">Select Class *</Label>
                <Select value={targetClassId} onValueChange={setTargetClassId} required>
                  <SelectTrigger id="sec-cls">
                    <SelectValue placeholder="Choose Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.hasStreams ? "(Streams Enabled)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {targetClassObj?.hasStreams && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
                  <Label htmlFor="sec-str" className="text-primary font-semibold flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4" />
                    Specialization Stream *
                  </Label>
                  <Select value={targetStreamId} onValueChange={setTargetStreamId} required>
                    <SelectTrigger id="sec-str">
                      <SelectValue placeholder="Select Stream (Science / Commerce / Arts)" />
                    </SelectTrigger>
                    <SelectContent>
                      {streams.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sec-name">Section Name *</Label>
                  <Input
                    id="sec-name"
                    placeholder="Section A"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sec-code">Code *</Label>
                  <Input
                    id="sec-code"
                    placeholder="A"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sec-cap">Student Capacity *</Label>
                  <Input
                    id="sec-cap"
                    type="number"
                    min="1"
                    max="100"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sec-room">Room Number</Label>
                  <Input
                    id="sec-room"
                    placeholder="Room 102"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Create Section"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Section Dialog */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Confirm Section Deletion
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to remove section <strong>{sectionToDelete?.name}</strong>?
              If this section contains active enrollments, it will be safely archived to protect student records.
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
              {deleting ? "Removing..." : "Delete Section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Section Modal (Capacity & Room) */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Section Details</DialogTitle>
              <DialogDescription>
                Update capacity and assigned room for {sectionToEdit?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-sec-cap">Student Capacity *</Label>
                <Input
                  id="edit-sec-cap"
                  type="number"
                  min="1"
                  max="200"
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(Number(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sec-room">Room Number / Location</Label>
                <Input
                  id="edit-sec-room"
                  placeholder="e.g. Room 102"
                  value={editRoomNo}
                  onChange={(e) => setEditRoomNo(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updating}>
                {updating ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Principal Class Teacher Assignment Dialog */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAssignTeacher}>
            <DialogHeader>
              <DialogTitle>Assign Class Teacher</DialogTitle>
              <DialogDescription>
                Exclusively managed under Principal Authority for {sectionToAssign?.className} - {sectionToAssign?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="assign-teacher-select">Select Faculty Member *</Label>
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId} required>
                  <SelectTrigger id="assign-teacher-select">
                    <SelectValue placeholder="Choose Teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassign">-- Unassign Class Teacher --</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.department || t.specialization || "Faculty"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAssignModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={assigning || !selectedTeacherId}>
                {assigning ? "Assigning..." : "Confirm Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
