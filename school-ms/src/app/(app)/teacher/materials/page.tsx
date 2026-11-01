"use client";

import React, { useState, useMemo } from "react";
import { useSMSStore, SectionEntity } from "@/context/sms-store";
import { useAuth } from "@/services/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UploadCloud,
  FileText,
  Trash2,
  Download,
  Plus,
  X,
  Search,
  Filter,
} from "lucide-react";

export default function TeacherStudyMaterialsPage() {
  const { user } = useAuth();
  const {
    sections,
    getMaterialsForTeacher,
    getTeacherAssignedSections,
    getTeacherAssignedSubjects,
    uploadStudyMaterial,
    deleteStudyMaterial,
    recordTeacherAudit,
  } = useSMSStore();

  const teacherId = user?.id || "";

  // Authorized sections and subjects for logged-in teacher
  const assignedSections: SectionEntity[] = useMemo(() => getTeacherAssignedSections(teacherId), [getTeacherAssignedSections, teacherId]);
  const assignedSubjects: string[] = useMemo(() => getTeacherAssignedSubjects(teacherId), [getTeacherAssignedSubjects, teacherId]);

  // Existing materials uploaded by this teacher
  const materials = useMemo(() => getMaterialsForTeacher(teacherId), [getMaterialsForTeacher, teacherId]);

  // Upload modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(() => (assignedSubjects.length > 0 ? assignedSubjects[0] : "Mathematics"));
  const [selectedTargetSectionIds, setSelectedTargetSectionIds] = useState<string[]>([]);
  const [fileName] = useState("Quadratic-Equations-Notes.pdf");
  const [fileSize] = useState("2.4 MB");
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("ALL");

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchSearch =
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.fileName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSubject = filterSubject === "ALL" || m.subject === filterSubject;
      return matchSearch && matchSubject;
    });
  }, [materials, searchQuery, filterSubject]);

  const toggleTargetSection = (secId: string) => {
    setSelectedTargetSectionIds((prev) =>
      prev.includes(secId) ? prev.filter((id) => id !== secId) : [...prev, secId]
    );
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError("");

    if (!title.trim()) {
      setUploadError("Please provide a title for the material.");
      return;
    }
    if (!selectedSubject) {
      setUploadError("Please select a valid subject.");
      return;
    }
    if (selectedTargetSectionIds.length === 0) {
      setUploadError("Please select at least one authorized target class arm.");
      return;
    }

    // Strict validation: Verify each selected section belongs to teacher's authorized assignments
    const authorizedIds = assignedSections.map((s) => s.id);
    const unauthorizedSelected = selectedTargetSectionIds.some((id) => !authorizedIds.includes(id));
    if (unauthorizedSelected) {
      setUploadError("Security Error: Cannot target classes outside your teaching allocation.");
      return;
    }

    const targetSectionCodes = selectedTargetSectionIds.map((id) => {
      const sec = sections.find((s: SectionEntity) => s.id === id);
      return sec?.code || id;
    });

    uploadStudyMaterial({
      title: title.trim(),
      description: description.trim(),
      subject: selectedSubject,
      teacherId,
      teacherName: user?.name || "Teacher",
      targetSectionIds: selectedTargetSectionIds,
      targetSectionCodes,
      fileName,
      fileSize,
      fileType: "application/pdf",
      academicYear: "2026-2027",
      downloadUrl: `/uploads/materials/${fileName}`,
    });

    recordTeacherAudit({
      teacherId,
      teacherName: user?.name || "Teacher",
      action: "STUDY_MATERIAL_UPLOADED",
      targetType: "MATERIAL",
      details: `Uploaded study material "${title.trim()}" for ${selectedTargetSectionIds.length} class arm(s)`,
    });

    setUploadSuccess(true);
    setTimeout(() => {
      setUploadSuccess(false);
      setIsModalOpen(false);
      setTitle("");
      setDescription("");
      setSelectedTargetSectionIds([]);
    }, 1200);
  };

  const handleDelete = (materialId: string, matTitle: string) => {
    if (confirm(`Are you sure you want to delete "${matTitle}"?`)) {
      deleteStudyMaterial(materialId, teacherId);
      recordTeacherAudit({
        teacherId,
        teacherName: user?.name || "Teacher",
        action: "STUDY_MATERIAL_UPLOADED",
        targetType: "MATERIAL",
        details: `Deleted study material "${matTitle}"`,
      });
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Study Materials</h1>
          <p className="text-sm text-muted-foreground">
            Targeted course handouts, syllabi, notes, and curriculum files for your assigned classes
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 shrink-0">
          <UploadCloud className="h-4 w-4" /> Upload Material
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search material title or file..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="text-xs h-9 rounded-md border border-input bg-background px-3 font-medium w-full sm:w-auto"
          >
            <option value="ALL">All Assigned Subjects</option>
            {assignedSubjects.map((sName) => (
              <option key={sName} value={sName}>
                {sName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Materials List */}
      {filteredMaterials.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
          <CardContent className="space-y-3">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
            <h3 className="font-semibold text-base">No Study Materials Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              You have not uploaded any study material for this selection, or no files match your search filter.
            </p>
            <Button size="sm" onClick={() => setIsModalOpen(true)} variant="outline" className="gap-1.5">
              <Plus className="h-4 w-4" /> Upload First Material
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map((mat) => {
            const targetSecNames = mat.targetSectionCodes || mat.targetSectionIds;

            return (
              <Card key={mat.id} className="flex flex-col justify-between hover:shadow-sm transition-shadow">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      {mat.subject}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground font-mono">{mat.fileSize}</span>
                  </div>
                  <CardTitle className="text-base font-bold mt-2 leading-tight">{mat.title}</CardTitle>
                  {mat.description && (
                    <CardDescription className="text-xs line-clamp-2 mt-1">{mat.description}</CardDescription>
                  )}
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-3">
                  {/* Target Classes */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Target Audience:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {targetSecNames.map((name, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] bg-muted/40 font-semibold">
                          Class {name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* File meta */}
                  <div className="p-2 bg-muted/30 rounded border text-xs flex items-center justify-between text-muted-foreground">
                    <span className="truncate max-w-[200px] font-mono text-[11px]">{mat.fileName}</span>
                    <span>{mat.createdAt.split("T")[0]}</span>
                  </div>
                </CardContent>

                <div className="p-4 pt-0 border-t mt-2 flex items-center justify-between">
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                    <Download className="h-3.5 w-3.5" /> Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(mat.id, mat.title)}
                    className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card w-full max-w-lg rounded-xl shadow-xl border overflow-hidden">
            <div className="p-4 sm:p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Upload Study Material</h3>
                <p className="text-xs text-muted-foreground">Select authorized classes to target file distribution</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-4 sm:p-5 space-y-4">
              {uploadError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs rounded-md">
                  {uploadError}
                </div>
              )}
              {uploadSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-md">
                  ✓ Material uploaded and targeted successfully!
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Title *</label>
                <Input
                  required
                  placeholder="e.g. Chapter 4 - Quadratic Equations Notes"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Subject *</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 font-semibold"
                >
                  {assignedSubjects.map((sName) => (
                    <option key={sName} value={sName}>
                      {sName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Authorized Class Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold">Target Class Arms (Only Authorized Classes) *</label>
                  <span className="text-[11px] text-muted-foreground">{selectedTargetSectionIds.length} selected</span>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border rounded-md bg-muted/20">
                  {assignedSections.map((sec: SectionEntity) => {
                    const isChecked = selectedTargetSectionIds.includes(sec.id);

                    return (
                      <label
                        key={sec.id}
                        className={`flex items-center gap-2 p-2 rounded border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-primary/10 border-primary text-primary font-semibold"
                            : "bg-background border-border hover:bg-muted/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTargetSection(sec.id)}
                          className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span>Section {sec.code}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Description / Topic Notes</label>
                <textarea
                  rows={2}
                  placeholder="Key concepts, practice problems, or examination preparation..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">File Attachment</label>
                <div className="border border-dashed rounded-lg p-3 text-center bg-muted/20 text-xs">
                  <FileText className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                  <span className="font-semibold">{fileName}</span>
                  <span className="text-muted-foreground ml-2 font-mono">({fileSize})</span>
                  <div className="text-[10px] text-muted-foreground mt-1">Supported formats: PDF, DOCX, PPTX, PNG, JPG (Max 25MB)</div>
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="gap-1.5">
                  <UploadCloud className="h-4 w-4" /> Upload Material
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
