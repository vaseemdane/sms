"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Users,
  Search,
  KeyRound,
  Trash2,
  Edit2,
  ShieldAlert,
  Check,
  Shield,
  Phone,
  Mail,
  UserCheck,
  UserX,
  Sparkles,
  AlertCircle,
  Building,
  GraduationCap,
  School,
  Calendar,
  Info,
  HelpCircle,
  Eye,
  User,
  MapPin,
  Briefcase,
} from "lucide-react";
import { generateTeacherPassword, normalizeDobDDMMYYYY } from "@/utils/password";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSMSStore, StoredUser } from "@/context/sms-store";
import { KARNATAKA_DISTRICTS, KARNATAKA_STATE } from "@/constants/karnataka";
import { StateDistrictCascade } from "@/components/forms/state-district-cascade";
import { useAuth } from "@/services/auth-context";
import { authService } from "@/services/auth-service";
import { apiClient } from "@/lib/api-client";

export default function UsersManagementPage() {
  const { user, updateUser } = useAuth();
  const isSuperAdmin = user?.userType === "super_admin" || user?.userType === "admin";
  const isPrincipal = user?.userType === "principal";

  const {
    users,
    teachers,
    enrollPrincipal,
    handoverPrincipal,
    enrollTeacher,
    enrollStudent,
    updateTeacher,
    toggleUserStatus,
    deleteTeacher,
    resetUserPassword,
    getTeacherAssignedSection,
    sections,
    assignClassTeacher,
  } = useSMSStore();

  const [activeTab, setActiveTab] = React.useState<"teachers" | "leadership" | "admins" | "all">("teachers");
  const [search, setSearch] = React.useState("");
  const [selectedDistrict, setSelectedDistrict] = React.useState("all");
  const [toast, setToast] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Real backend faculty sync
  const [apiTeachers, setApiTeachers] = React.useState<any[]>([]);
  const fetchBackendTeachers = React.useCallback(async () => {
    try {
      const res = await apiClient<{ success: boolean; data: { items: any[] } }>(
        `/admin/users?role=teacher&page_size=100&_t=${Date.now()}`,
        { cache: "no-store" }
      );
      if (res?.data?.items) {
        setApiTeachers(res.data.items);
      }
    } catch {
      // offline fallback
    }
  }, []);

  React.useEffect(() => {
    fetchBackendTeachers();
  }, [fetchBackendTeachers]);

  // Section / Class assignment state
  const [assignModalOpen, setAssignModalOpen] = React.useState(false);
  const [targetTeacher, setTargetTeacher] = React.useState<any | null>(null);
  const [selectedSectionId, setSelectedSectionId] = React.useState<string>("");
  const [isAssigning, setIsAssigning] = React.useState(false);
  const [backendSections, setBackendSections] = React.useState<any[]>([]);

  const fetchBackendSections = React.useCallback(async () => {
    try {
      const res = await apiClient<any>(
        `/academics/classes-with-sections?_t=${Date.now()}`,
        { cache: "no-store" }
      );
      if (res?.data && Array.isArray(res.data)) {
        const flattened = res.data.flatMap((c: any) =>
          (c.sections || []).map((s: any) => ({
            ...s,
            className: c.name,
            classId: c.id,
          }))
        );
        setBackendSections(flattened);
      }
    } catch {
      // offline fallback
    }
  }, []);

  // Fetch live sections from backend
  React.useEffect(() => {
    fetchBackendSections();
  }, [fetchBackendSections]);

  const combinedSections = backendSections.length > 0 ? backendSections : sections;

  const handleAssignSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTeacher) return;
    setIsAssigning(true);
    try {
      if (selectedSectionId === "unassign") {
        const curr =
          getTeacherAssignedSection(targetTeacher.id) ||
          backendSections.find(
            (s) =>
              s.classTeacherId === targetTeacher.id ||
              (s.classTeacherName && s.classTeacherName.trim().toLowerCase() === targetTeacher.name.trim().toLowerCase())
          );
        if (curr) {
          try {
            await apiClient.post("/academics/unassign/class-teacher", {
              sectionId: curr.id,
              teacherId: targetTeacher.id,
            });
          } catch {
            // offline fallback
          }
          assignClassTeacher(curr.id, "");
        }
        showToast(`Unassigned ${targetTeacher.name} from class teacher responsibilities.`);
      } else if (selectedSectionId) {
        const res = await apiClient.post<{ success: boolean; message?: string }>("/academics/assign/class-teacher", {
          sectionId: selectedSectionId,
          teacherId: targetTeacher.id,
        });

        assignClassTeacher(selectedSectionId, targetTeacher.id);
        const sec = combinedSections.find((s) => s.id === selectedSectionId);
        showToast(
          res?.message || `Assigned ${targetTeacher.name} as Class Teacher for ${sec?.className || "Class"} (${sec?.code || ""})!`
        );
      }
      await fetchBackendTeachers();
      await fetchBackendSections();
      setAssignModalOpen(false);
      setTargetTeacher(null);
    } catch (err: any) {
      showToast(err?.message || "Failed to assign class teacher", "error");
    } finally {
      setIsAssigning(false);
    }
  };

  // Staff Details Modal State
  const [viewingStaff, setViewingStaff] = React.useState<any | null>(null);
  const [staffDetailsOpen, setStaffDetailsOpen] = React.useState(false);

  // Hierarchical Provisioning State (Super Admin Driven)
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [provisionRole, setProvisionRole] = React.useState<string>("teacher");
  const [formSchoolId, setFormSchoolId] = React.useState("sch-main");
  const [formSchoolName, setFormSchoolName] = React.useState("Megha Public School");
  const [formName, setFormName] = React.useState("");
  const [formEmail, setSEmail] = React.useState("");
  const [formUsername, setFormUsername] = React.useState("");
  const [formPhone, setFormPhone] = React.useState("+91 ");
  const [formSubject, setFormSubject] = React.useState("Mathematics");
  const [formState, setFormState] = React.useState<string>("Karnataka");
  const [formDistrict, setFormDistrict] = React.useState<string>("Bengaluru Urban");
  const [initialCustomPassword, setInitialCustomPassword] = React.useState<string>("");
  const [districtSearch, setDistrictSearch] = React.useState("");

  // Principal State & Handover
  const [activePrincipal, setActivePrincipal] = React.useState<any>(null);
  const [isRemovingPrincipal, setIsRemovingPrincipal] = React.useState(false);
  const [principalPassword, setPrincipalPassword] = React.useState("");
  const [handoverModalOpen, setHandoverModalOpen] = React.useState(false);
  const [handoverReason, setHandoverReason] = React.useState("");
  const [isHandingOver, setIsHandingOver] = React.useState(false);

  // Load active principal on mount / modal open
  const loadActivePrincipal = React.useCallback(async () => {
    try {
      const res = await apiClient<{ success: boolean; data: any }>("/admin/principal");
      if (res && res.data) {
        setActivePrincipal(res.data);
      } else {
        setActivePrincipal(null);
      }
    } catch {
      setActivePrincipal(null);
    }
  }, []);

  const handleRemovePrincipal = async () => {
    if (!window.confirm("Are you sure you want to remove the current Principal data and credentials from the system?")) {
      return;
    }
    setIsRemovingPrincipal(true);
    try {
      const session = authService.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.token) {
        headers["Authorization"] = `Bearer ${session.token}`;
      }
      const res = await fetch("/api/v1/admin/principal", {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        showToast("Current Principal data and credentials removed successfully.");
        setActivePrincipal(null);
        await loadActivePrincipal();
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.detail || "Failed to remove Principal.", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Failed to remove Principal.", "error");
    } finally {
      setIsRemovingPrincipal(false);
    }
  };

  React.useEffect(() => {
    loadActivePrincipal();
  }, [loadActivePrincipal]);

  // Student Specifics
  const [studentMobile, setStudentMobile] = React.useState("");
  const [studentDob, setStudentDob] = React.useState("");
  const [studentGender, setStudentGender] = React.useState<"male" | "female" | "other">("male");
  const [studentSectionId, setStudentSectionId] = React.useState("sec-10a");

  // Dynamic Auto-Generated Previews
  const previewTeacherPassword = generateTeacherPassword(formName);
  const previewStudentPassword = normalizeDobDDMMYYYY(studentDob);

  // Super Admin Password Override Modal
  const [overrideModalOpen, setOverrideModalOpen] = React.useState(false);
  const [overrideTargetUser, setOverrideTargetUser] = React.useState<StoredUser | null>(null);
  const [overridePassword, setOverridePassword] = React.useState("");
  const [isResetting, setIsResetting] = React.useState(false);

  // Edit Teacher Modal
  const [editingTeacher, setEditingTeacher] = React.useState<StoredUser | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editPhone, setEditPhone] = React.useState("");
  const [editSubject, setEditSubject] = React.useState("");
  const [editState, setEditState] = React.useState("Karnataka");
  const [editDistrict, setEditDistrict] = React.useState("");

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const filteredKarnatakaDistricts = KARNATAKA_DISTRICTS.filter((d) =>
    d.toLowerCase().includes(districtSearch.toLowerCase())
  );

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast("Full name is required", "error");
      return;
    }

    try {
      if (provisionRole === "principal") {
        if (!formEmail.trim() || !principalPassword.trim()) {
          showToast("Email and explicit initial password are required for Principal", "error");
          return;
        }

        // Call backend API
        const res = await fetch("/api/v1/admin/users/principal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            school_id: formSchoolId,
            name: formName.trim(),
            email: formEmail.trim(),
            username: formUsername.trim() || formEmail.trim().split("@")[0],
            phone: formPhone.trim(),
            password: principalPassword.trim(),
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          const errMsg = errData?.detail || errData?.error?.message || "Failed to create principal";
          if (res.status === 409) {
            await loadActivePrincipal();
            showToast(`Active Principal Conflict: ${errMsg}`, "error");
            return;
          }
          throw new Error(errMsg);
        }

        enrollPrincipal({
          name: formName.trim(),
          email: formEmail.trim().toLowerCase(),
          username: formUsername.trim() || formEmail.trim().split("@")[0],
          phone: formPhone,
          password: principalPassword.trim(),
          school_id: formSchoolId,
          schoolName: formSchoolName,
          state: KARNATAKA_STATE,
          district: formDistrict,
          mustChangePassword: true,
        });

        await loadActivePrincipal();
        setCreateModalOpen(false);
        showToast(`Principal account created and linked to ${formSchoolName}! Initial password set.`);
      } else if (provisionRole === "teacher") {
        if (!formEmail.trim()) {
          showToast("Email address is required for Teacher account", "error");
          return;
        }

        const autoPass = generateTeacherPassword(formName);

        // Call backend API
        const session = authService.getSession();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (session?.token) {
          headers["Authorization"] = `Bearer ${session.token}`;
        }

        const res = await fetch("/api/v1/admin/users/teacher", {
          method: "POST",
          headers,
          body: JSON.stringify({
            school_id: formSchoolId,
            name: formName.trim(),
            email: formEmail.trim(),
            username: formUsername.trim() || formEmail.trim().split("@")[0],
            phone: formPhone.trim(),
            specialization: formSubject,
            district: formDistrict,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          const errMsg = errData?.detail || errData?.error?.message || "Failed to register faculty";
          showToast(errMsg, "error");
          return; // Preserve entered data and keep modal open on failure
        }

        const newTeacher = enrollTeacher({
          name: formName.trim(),
          email: formEmail.trim().toLowerCase(),
          username: formEmail.trim().split("@")[0],
          phone: formPhone,
          password: autoPass,
          state: KARNATAKA_STATE,
          district: formDistrict,
          subjectSpecialization: formSubject,
          school_id: formSchoolId,
          schoolName: formSchoolName,
        });

        setCreateModalOpen(false);
        // Reset form state completely
        setFormName("");
        setSEmail("");
        setFormUsername("");
        setFormPhone("+91 ");
        setFormSubject("Mathematics");
        showToast(
          `Faculty registered successfully for ${formSchoolName}! Default Password: ${autoPass}`
        );
        await fetchBackendTeachers();
      } else if (provisionRole === "student") {
        const cleanMobile = studentMobile.replace(/\D/g, "").slice(-10);
        const cleanDobNormalized = normalizeDobDDMMYYYY(studentDob);

        if (cleanMobile.length < 10) {
          showToast("A valid 10-digit mobile number is required for Student login identifier", "error");
          return;
        }
        if (cleanDobNormalized.length !== 8) {
          showToast("Student Date of Birth must be in strict DDMMYYYY format (e.g. 14052010)", "error");
          return;
        }

        // Call backend API if running
        try {
          await fetch("/api/v1/admin/users/student", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              school_id: formSchoolId,
              name: formName.trim(),
              mobile_number: cleanMobile,
              date_of_birth: studentDob.trim(),
              gender: studentGender,
              class_id: "cls-10",
              section_id: studentSectionId,
              district: formDistrict,
            }),
          });
        } catch {
          // Store will record locally
        }

        enrollStudent({
          name: formName.trim(),
          email: formEmail.trim() || `student.${cleanMobile}@school.edu.in`,
          username: cleanMobile,
          phone: cleanMobile,
          dob: studentDob.trim(),
          gender: studentGender,
          classSectionId: studentSectionId,
          school_id: formSchoolId,
          schoolName: formSchoolName,
          state: KARNATAKA_STATE,
          district: formDistrict,
        });

        setCreateModalOpen(false);
        showToast(
          `Student account created! Username: ${cleanMobile} | Initial Password: ${cleanDobNormalized}`
        );
      }

      // Reset form
      setFormName("");
      setSEmail("");
      setFormUsername("");
      setPrincipalPassword("");
      setStudentMobile("");
      setStudentDob("");
    } catch (err: any) {
      showToast(err?.message || "Failed to provision user", "error");
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;

    updateTeacher(editingTeacher.id, {
      name: editName.trim(),
      phone: editPhone.trim(),
      subjectSpecialization: editSubject.trim(),
      district: editDistrict,
    });

    if (editingTeacher.id === user?.id || editingTeacher.email === user?.email || editingTeacher.userType === "super_admin") {
      updateUser({
        name: editName.trim(),
        phone: editPhone.trim(),
      });
      apiClient.put("/auth/profile", {
        name: editName.trim(),
        phone: editPhone.trim(),
      }).catch(() => {});
    }

    setEditingTeacher(null);
    showToast(`Updated profile for ${editName}`);
  };

  const combinedUsers = React.useMemo(() => {
    const seenEmails = new Set<string>();
    const list: any[] = [];

    // 1. Store users merged with live backend assignments
    users.forEach((u) => {
      const bt = apiTeachers.find((t) => (t.email && u.email && t.email.toLowerCase() === u.email.toLowerCase()) || t.id === u.id);
      if (bt) {
        list.push({
          ...u,
          id: bt.id || u.id,
          assignedClassTeacher: bt.assignedClassTeacher ?? u.assignedClassTeacher,
          assignedSubjects: bt.assignedSubjects ?? u.assignedSubjects,
        });
      } else {
        list.push(u);
      }
      if (u.email) seenEmails.add(u.email.toLowerCase());
    });

    // 2. Real backend faculty
    apiTeachers.forEach((bt) => {
      if (bt.email && !seenEmails.has(bt.email.toLowerCase())) {
        seenEmails.add(bt.email.toLowerCase());
        list.push({
          id: bt.id,
          name: bt.name,
          email: bt.email,
          username: bt.username || bt.email.split("@")[0],
          userType: "teacher",
          phone: bt.phone || "+91 9880011223",
          code: bt.code || `EDP/TCH/${bt.id.slice(-4).toUpperCase()}`,
          district: bt.district || "Bengaluru Urban",
          state: bt.state || "Karnataka",
          subjectSpecialization: bt.subjectSpecialization || bt.specialization || "General Faculty",
          assignedClassTeacher: bt.assignedClassTeacher,
          assignedSubjects: bt.assignedSubjects,
          active: bt.active !== false,
          mustChangePassword: bt.mustChangePassword ?? true,
          createdAt: bt.created_at || new Date().toISOString(),
        });
      }
    });
    if (activePrincipal && !list.some((u) => (activePrincipal.email && u.email.toLowerCase() === activePrincipal.email.toLowerCase()) || u.id === activePrincipal.id)) {
      list.unshift({
        id: activePrincipal.id || "usr-principal-active",
        name: activePrincipal.name,
        email: activePrincipal.email,
        username: activePrincipal.username || (activePrincipal.email ? activePrincipal.email.split("@")[0] : "principal"),
        userType: "principal",
        phone: activePrincipal.phone,
        code: activePrincipal.code || "EDP/PRIN/001",
        school_id: activePrincipal.school_id || "sch-main",
        active: activePrincipal.active !== false,
        mustChangePassword: activePrincipal.mustChangePassword ?? false,
        state: "Karnataka",
        district: activePrincipal.district || "Bengaluru Urban",
        subjectSpecialization: "Institutional Leadership & Governance",
        createdAt: new Date().toISOString(),
      });
    }
    if (user && !list.some((u) => (user.email && u.email?.toLowerCase() === user.email.toLowerCase()) || u.id === user.id)) {
      list.push({
        id: user.id || "usr-superadmin",
        name: user.name || "zuha",
        email: user.email || "admin@school.com",
        username: user.username || "admin",
        userType: user.userType || "super_admin",
        phone: user.phone || "9902304896",
        code: user.code || "EDP/SA/001",
        district: user.district || "Bengaluru Urban",
        state: user.state || "Karnataka",
        active: true,
        mustChangePassword: false,
        createdAt: user.createdAt || new Date().toISOString(),
      });
    }
    return list;
  }, [users, activePrincipal, apiTeachers, user]);

  const effectivePrincipal = React.useMemo(() => {
    return activePrincipal || combinedUsers.find((u) => u.userType === "principal" && u.active !== false) || null;
  }, [activePrincipal, combinedUsers]);

  const displayedUsers = React.useMemo(() => {
    return combinedUsers.filter((u) => {
      if (activeTab === "teachers") {
        if (u.userType !== "teacher") return false;
      } else if (activeTab === "leadership" || activeTab === "admins") {
        if (u.userType !== "super_admin" && u.userType !== "admin" && u.userType !== "principal") return false;
      }

      const matchesSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.phone && u.phone.includes(search)) ||
        (u.subjectSpecialization && u.subjectSpecialization.toLowerCase().includes(search.toLowerCase()));

      const matchesDistrict = selectedDistrict === "all" || u.district === selectedDistrict;

      return matchesSearch && matchesDistrict;
    });
  }, [combinedUsers, activeTab, search, selectedDistrict]);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 text-xs font-semibold text-white transition-all ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.type === "error" ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Top Header */}
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
            <span className="font-semibold text-purple-primary">Administration</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-purple-primary" />
            Staff & Faculty Directory (Karnataka)
          </h1>
          <p className="text-xs text-text-secondary">
            Super Admin Exclusive CRUD • Auto-provision <code>&lt;FirstName&gt;@Teacher</code> • Geo-locked 31 Karnataka Districts
          </p>
        </div>

        {/* Super Admin Enroll Button */}
        {isSuperAdmin && (
          <Button
            onClick={() => {
              setProvisionRole("teacher");
              setFormName("");
              setSEmail("");
              setFormUsername("");
              setFormPhone("+91 ");
              setFormSubject("Mathematics");
              setCreateModalOpen(true);
            }}
            size="sm"
            className="h-9 bg-purple-primary hover:bg-purple-primary/90 text-white font-semibold text-xs shadow-md shadow-purple-primary/20"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            + Enroll Faculty Member
          </Button>
        )}
      </div>

      {/* INSTITUTIONAL PRINCIPAL & LEADERSHIP DESK CARD */}
      <Card className="border-border/80 bg-gradient-to-r from-surface via-surface to-purple-tint/20 shadow-sm overflow-hidden border-l-4 border-l-purple-primary">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <Avatar className="h-12 w-12 border-2 border-purple-primary/30 shadow-sm shrink-0">
                <AvatarFallback className="bg-purple-primary text-white font-bold text-sm">
                  {effectivePrincipal ? effectivePrincipal.name.slice(0, 2).toUpperCase() : "PR"}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-foreground tracking-tight">
                    {effectivePrincipal ? effectivePrincipal.name : "No Active Principal Appointed"}
                  </h2>
                  {effectivePrincipal ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] font-semibold gap-1">
                      <Shield className="h-3 w-3" />
                      Active Principal & Head of Institution
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                      Pending Appointment
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
                  {effectivePrincipal ? (
                    <>
                      <span className="flex items-center gap-1 font-mono text-[11px] text-foreground">
                        <Mail className="h-3.5 w-3.5 text-purple-primary" />
                        {effectivePrincipal.email}
                      </span>
                      {effectivePrincipal.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-purple-primary" />
                          {effectivePrincipal.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Building className="h-3.5 w-3.5 text-purple-primary" />
                        {effectivePrincipal.code || "EDP/PRIN/001"}
                      </span>
                      <span className="text-text-secondary">
                        School: <strong className="text-foreground">{effectivePrincipal.schoolName || "Delhi Public Academy"} ({effectivePrincipal.school_id || "sch-main"})</strong>
                      </span>
                    </>
                  ) : (
                    <span>
                      The institution currently has no active Principal appointed. Super Admin can appoint or initialize one.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              {effectivePrincipal ? (
                <>
                  <Button
                    onClick={() => {
                      setFormName("");
                      setSEmail("");
                      setFormUsername("");
                      setFormPhone("+91 ");
                      setPrincipalPassword("");
                      setHandoverReason("");
                      setHandoverModalOpen(true);
                    }}
                    size="sm"
                    className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm"
                  >
                    <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
                    Handover Principal Role
                  </Button>
                  <Button
                    onClick={handleRemovePrincipal}
                    disabled={isRemovingPrincipal}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200 font-semibold shadow-sm"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    {isRemovingPrincipal ? "Removing..." : "Remove Principal"}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => {
                    setProvisionRole("principal");
                    setFormName("");
                    setSEmail("");
                    setFormUsername("");
                    setFormPhone("+91 ");
                    setPrincipalPassword("");
                    setCreateModalOpen(true);
                  }}
                  size="sm"
                  className="h-8 text-xs bg-purple-primary hover:bg-purple-primary/90 text-white font-semibold shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  + Appoint Principal
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table Card */}
      <Card className="border-border/80 bg-surface shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <Tabs
              value={activeTab}
              onValueChange={(val: any) => setActiveTab(val)}
              className="w-full md:w-auto"
            >
              <TabsList className="bg-muted/60 p-1">
                <TabsTrigger value="teachers" className="text-xs font-semibold">
                  Teaching Faculty ({combinedUsers.filter(u => u.userType === "teacher").length})
                </TabsTrigger>
                <TabsTrigger value="leadership" className="text-xs font-semibold">
                  Leadership & Admins ({combinedUsers.filter(u => u.userType === "principal" || u.userType === "super_admin" || u.userType === "admin").length})
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs font-semibold">
                  All Staff ({combinedUsers.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search & Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
                <Input
                  placeholder="Search faculty, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background/50"
                />
              </div>

              <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                <SelectTrigger className="h-8 text-xs w-40">
                  <SelectValue placeholder="District" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All 31 KA Districts</SelectItem>
                  {KARNATAKA_DISTRICTS.map((dist) => (
                    <SelectItem key={dist} value={dist}>
                      {dist}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs text-text-secondary bg-muted/30">
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Staff Name & Email</TableHead>
                  <TableHead>Role / Type</TableHead>
                  <TableHead>Subject Specialization</TableHead>
                  <TableHead>District (Karnataka)</TableHead>
                  <TableHead>Class Teacher Assignment</TableHead>
                  <TableHead>Credentials</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Super Admin Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-xs text-text-secondary">
                      No staff members found matching search query.
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedUsers.map((u) => {
                    const assignedSection =
                      getTeacherAssignedSection(u.id) ||
                      backendSections.find(
                        (s) =>
                          s.classTeacherId === u.id ||
                          (s.classTeacherName && u.name && s.classTeacherName.trim().toLowerCase() === u.name.trim().toLowerCase())
                      );

                    return (
                      <TableRow key={u.id} className="text-xs hover:bg-muted/40 transition-colors">
                        <TableCell>
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-purple-tint text-purple-primary font-bold text-xs">
                              {u.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => {
                                setViewingStaff(u);
                                setStaffDetailsOpen(true);
                              }}
                              className="font-bold text-foreground text-left hover:text-purple-primary hover:underline cursor-pointer flex items-center gap-1 group transition-colors"
                              title="Click to view full registration details"
                            >
                              <span>{u.name}</span>
                              <Eye className="h-3 w-3 text-purple-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            <span className="text-[11px] text-text-secondary truncate max-w-[180px]">
                              {u.email}
                            </span>
                            {u.phone && (
                              <span className="text-[10px] text-text-secondary">{u.phone}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-semibold capitalize ${
                              u.userType === "super_admin"
                                ? "bg-purple-tint text-purple-primary"
                                : u.userType === "principal"
                                ? "bg-amber-100 text-amber-800 border border-amber-300 font-bold"
                                : u.userType === "teacher"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-muted text-text-secondary"
                            }`}
                          >
                            {u.userType === "principal" ? "Principal" : u.userType.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {u.subjectSpecialization || "--"}
                        </TableCell>
                        <TableCell className="text-text-secondary font-medium">
                          {u.district ? `${u.district}, KA` : "Karnataka"}
                        </TableCell>
                        <TableCell>
                          {u.userType === "super_admin" || u.userType === "admin" ? (
                            <span className="text-[11px] text-text-secondary font-medium">— (System Governance)</span>
                          ) : u.userType === "principal" ? (
                            <Badge variant="outline" className="text-[10px] bg-purple-tint/50 text-purple-primary border-purple-primary/30">
                              Institutional Head
                            </Badge>
                          ) : (u.assignedClassTeacher || assignedSection) ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge className="bg-purple-primary text-white text-[10px] font-semibold">
                                CT: {u.assignedClassTeacher || (assignedSection ? `${assignedSection.className} (${assignedSection.code})` : "")}
                              </Badge>
                              <Badge variant="outline" className="text-[9px] text-emerald-700 bg-emerald-50 border-emerald-200">
                                Principal Appointed
                              </Badge>
                              {isPrincipal && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-[10px] px-1.5 text-text-secondary hover:text-purple-primary"
                                  onClick={() => {
                                    setTargetTeacher(u);
                                    setSelectedSectionId(assignedSection?.id || "");
                                    setAssignModalOpen(true);
                                  }}
                                  title="Change class teacher allocation (Principal Authority)"
                                >
                                  Change
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] text-text-secondary">Not Assigned</span>
                              {isPrincipal && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-[10px] px-2 text-purple-primary border-purple-primary/30 hover:bg-purple-tint"
                                  onClick={() => {
                                    setTargetTeacher(u);
                                    setSelectedSectionId("");
                                    setAssignModalOpen(true);
                                  }}
                                  title="Assign Class Teacher under Principal Authority"
                                >
                                  + Assign Class & Section
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {u.mustChangePassword ? (
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300">
                              First Login Pending (Reset Required)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">
                              Custom Password Set
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {u.active !== false ? (
                            <Badge className="bg-emerald-500 text-white text-[10px]">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">
                              Deactivated
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isSuperAdmin ? (
                            <div className="flex items-center justify-end gap-1">
                              {/* View Details */}
                              <Button
                                onClick={() => {
                                  setViewingStaff(u);
                                  setStaffDetailsOpen(true);
                                }}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-text-secondary hover:text-purple-primary hover:bg-purple-tint/50"
                                title="View registration details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>

                              {/* Edit */}
                              <Button
                                onClick={() => {
                                  setEditingTeacher(u);
                                  setEditName(u.name);
                                  setEditPhone(u.phone || "");
                                  setEditSubject(u.subjectSpecialization || "");
                                  setEditDistrict(u.district || "Bengaluru Urban");
                                }}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-text-secondary hover:text-purple-primary"
                                title="Edit profile"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>

                              {/* Super Admin Password Reset Override */}
                              {u.id !== "usr-superadmin" && u.id !== "usr-head-sa" && (
                                <Button
                                  onClick={() => {
                                    setOverrideTargetUser(u);
                                    setOverridePassword("TempPass@" + Math.floor(1000 + Math.random() * 9000));
                                    setOverrideModalOpen(true);
                                  }}
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-text-secondary hover:text-amber-600"
                                  title="Super Admin Override: Reset user password (Forces password rotation)"
                                >
                                  <KeyRound className="h-3.5 w-3.5" />
                                </Button>
                              )}

                              {/* Toggle Active / Unenroll */}
                              {u.id !== "usr-superadmin" && u.id !== "usr-head-sa" && (
                                <Button
                                  onClick={() => {
                                    toggleUserStatus(u.id);
                                    showToast(`Account status updated for ${u.name}`);
                                  }}
                                  variant="ghost"
                                  size="icon"
                                  className={`h-7 w-7 ${
                                    u.active !== false
                                      ? "text-text-secondary hover:text-amber-600"
                                      : "text-emerald-600 hover:text-emerald-700"
                                  }`}
                                  title={u.active !== false ? "Deactivate / Unenroll" : "Re-activate Account"}
                                >
                                  {u.active !== false ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                                </Button>
                              )}

                              {/* Delete */}
                              {u.id !== "usr-superadmin" && u.id !== "usr-head-sa" && (
                                <Button
                                  onClick={() => {
                                    if (confirm(`Permanently delete ${u.name}?`)) {
                                      const res = deleteTeacher(u.id);
                                      if (!res.success) {
                                        showToast(res.error || "Cannot delete", "error");
                                      } else {
                                        showToast(`Deleted ${u.name}`);
                                      }
                                    }
                                  }}
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-text-secondary hover:text-destructive"
                                  title="Delete faculty account"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-text-secondary">Read-only</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL 1: HIERARCHICAL USER PROVISIONING (SUPER ADMIN) */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-xl bg-surface border-border p-6 max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-primary" />
              Provision Account (Hierarchical)
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Super Admin direct provisioning for Principal, Faculty, or Student accounts.
            </DialogDescription>
          </DialogHeader>

          {/* Role Selector Tabs */}
          <div className="flex items-center gap-2 p-1 bg-surface-raised rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setProvisionRole("principal")}
              className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                provisionRole === "principal"
                  ? "bg-purple-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-foreground"
              }`}
            >
              <Building className="h-3.5 w-3.5" />
              Principal
            </button>
            <button
              type="button"
              onClick={() => setProvisionRole("teacher")}
              className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                provisionRole === "teacher"
                  ? "bg-purple-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-foreground"
              }`}
            >
              <School className="h-3.5 w-3.5" />
              Teacher
            </button>
            <button
              type="button"
              onClick={() => setProvisionRole("student")}
              className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                provisionRole === "student"
                  ? "bg-purple-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-foreground"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              Student
            </button>
          </div>

          <form onSubmit={handleProvisionSubmit} className="space-y-4 pt-1">
            {/* School Association Header */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-surface-raised/50 border border-border">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-text-secondary">Target School ID *</Label>
                <Input
                  value={formSchoolId}
                  onChange={(e) => setFormSchoolId(e.target.value)}
                  placeholder="sch-main"
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-text-secondary">School Name *</Label>
                <Input
                  value={formSchoolName}
                  onChange={(e) => setFormSchoolName(e.target.value)}
                  placeholder="Megha Public School"
                  className="h-8 text-xs font-semibold"
                  required
                />
              </div>
            </div>

            {/* PRINCIPAL SPECIFIC FIELDS */}
            {provisionRole === "principal" && (
              <div className="space-y-3">
                {effectivePrincipal ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                    <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                    <div className="space-y-1 w-full">
                      <p className="font-bold">Active Principal Already Exists</p>
                      <p className="text-[11px]">
                        <strong>{effectivePrincipal?.name}</strong> ({effectivePrincipal?.email}) is currently the sole active Principal for this institution.
                      </p>
                      <p className="text-[10px] text-amber-700/80 dark:text-amber-400">
                        Institutional governance allows strictly 1 active Principal. You can edit their profile or perform a formal Handover.
                      </p>
                      <div className="pt-2 flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCreateModalOpen(false);
                            setHandoverModalOpen(true);
                          }}
                          className="h-7 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border-amber-500/40"
                        >
                          Handover to New Principal
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-purple-tint/60 border border-purple-primary/30 flex items-start gap-2.5 text-xs text-purple-primary">
                    <KeyRound className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Principal Initial Credentials</p>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        Explicit password set by Super Admin. Principal must change password upon first login.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Principal Full Name *</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Dr. Rajeshwari Hegde"
                    className="text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Login Email ID *</Label>
                    <Input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setSEmail(e.target.value)}
                      placeholder="principal@meghaschool.edu.in"
                      className="text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Username (Optional)</Label>
                    <Input
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      placeholder="principal_megha"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Contact Mobile</Label>
                    <Input
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="+91 9880011223"
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-purple-primary">Initial Password *</Label>
                    <Input
                      type="text"
                      value={principalPassword}
                      onChange={(e) => setPrincipalPassword(e.target.value)}
                      placeholder="Explicit initial password"
                      className="text-xs font-mono border-purple-primary/40 focus:border-purple-primary"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TEACHER SPECIFIC FIELDS */}
            {provisionRole === "teacher" && (
              <div className="space-y-3">
                {/* Dynamic Auto-Generated Password Tooltip/Badge */}
                <div className="p-3 rounded-xl bg-purple-tint/60 border border-purple-primary/30 flex items-start gap-2.5 text-xs text-purple-primary">
                  <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="w-full">
                    <div className="flex items-center justify-between">
                      <p className="font-bold">Auto-Generated Password Rule</p>
                      <span
                        className="flex items-center gap-1 text-[10px] text-purple-primary/80 cursor-help"
                        title="Formula: Extract first word of teacher name, capitalize first letter -> <FirstName>@Teacher"
                      >
                        <HelpCircle className="h-3 w-3" />
                        Formula Info
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      Formula: <code className="font-mono text-purple-primary">&lt;FirstName&gt;@Teacher</code>
                    </p>
                    <div className="mt-2 flex items-center gap-2 p-1.5 rounded bg-surface border border-purple-primary/20">
                      <span className="text-[10px] text-text-secondary">Generated Initial Password:</span>
                      <code className="text-xs font-mono font-bold text-foreground">
                        {previewTeacherPassword}
                      </code>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Teacher Full Name *</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Smt. Gayatri Rao"
                    className="text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Teacher Email ID *</Label>
                    <Input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setSEmail(e.target.value)}
                      placeholder="gayatri.rao@gmail.com"
                      className="text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Subject Specialization</Label>
                    <Input
                      value={formSubject}
                      onChange={(e) => setFormSubject(e.target.value)}
                      placeholder="Mathematics & Science"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Contact Phone</Label>
                  <Input
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 9880011223"
                    className="text-xs"
                  />
                </div>
              </div>
            )}

            {/* STUDENT SPECIFIC FIELDS */}
            {provisionRole === "student" && (
              <div className="space-y-3">
                {/* Auto Credentials Badge for Student */}
                <div className="p-3 rounded-xl bg-purple-tint/60 border border-purple-primary/30 flex items-start gap-2.5 text-xs text-purple-primary">
                  <GraduationCap className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="w-full">
                    <p className="font-bold">Student Auth Credentials Rule</p>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      Username = 10-digit Mobile Number • Password = Date of Birth (<code>DDMMYYYY</code>)
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] p-1.5 rounded bg-surface border border-purple-primary/20">
                      <div>
                        <span className="text-[10px] text-text-secondary block">Login Username:</span>
                        <code className="font-mono font-bold text-foreground">
                          {studentMobile.replace(/\D/g, "").slice(-10) || "10-digit mobile"}
                        </code>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-secondary block">Initial Password:</span>
                        <code className="font-mono font-bold text-foreground">
                          {previewStudentPassword || "DDMMYYYY"}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Student Full Name *</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Ananya Rao"
                    className="text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Mobile Number (10 digits) *</Label>
                    <Input
                      type="tel"
                      value={studentMobile}
                      onChange={(e) => setStudentMobile(e.target.value)}
                      placeholder="9876543210"
                      maxLength={10}
                      className="text-xs font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Date of Birth (DDMMYYYY / YYYY-MM-DD) *</Label>
                    <Input
                      value={studentDob}
                      onChange={(e) => setStudentDob(e.target.value)}
                      placeholder="14-05-2010 or 14052010"
                      className="text-xs font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Gender</Label>
                    <Select
                      value={studentGender}
                      onValueChange={(v: "male" | "female" | "other") => setStudentGender(v)}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male" className="text-xs">Male</SelectItem>
                        <SelectItem value="female" className="text-xs">Female</SelectItem>
                        <SelectItem value="other" className="text-xs">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Class Section</Label>
                    <Select value={studentSectionId} onValueChange={setStudentSectionId}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sec-10a" className="text-xs">Class 10 - Section A</SelectItem>
                        <SelectItem value="sec-10b" className="text-xs">Class 10 - Section B</SelectItem>
                        <SelectItem value="sec-9a" className="text-xs">Class 9 - Section A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* All-India Cascading State and District Selector */}
            <div className="pt-1">
              <StateDistrictCascade
                selectedState={formState}
                selectedDistrict={formDistrict}
                onStateChange={setFormState}
                onDistrictChange={setFormDistrict}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={provisionRole === "principal" && Boolean(effectivePrincipal)}
                className="bg-purple-primary hover:bg-purple-primary/90 text-white text-xs font-semibold"
              >
                {provisionRole === "teacher"
                  ? "Confirm & Enroll Faculty"
                  : provisionRole === "principal"
                  ? "Confirm & Provision Principal"
                  : "Confirm & Enroll Student"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: EDIT FACULTY MEMBER */}
      <Dialog open={Boolean(editingTeacher)} onOpenChange={() => setEditingTeacher(null)}>
        <DialogContent className="sm:max-w-md bg-surface border-border p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Edit Faculty Profile: {editingTeacher?.name}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Full Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Subject Specialization</Label>
              <Input
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="pt-1">
              <StateDistrictCascade
                selectedState={editState}
                selectedDistrict={editDistrict}
                onStateChange={setEditState}
                onDistrictChange={setEditDistrict}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Phone Number</Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingTeacher(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-purple-primary hover:bg-purple-primary/90 text-white text-xs font-semibold"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>




      {/* MODAL 3: SUPER ADMIN OVERRIDE PASSWORD RESET */}
      <Dialog open={overrideModalOpen} onOpenChange={setOverrideModalOpen}>
        <DialogContent className="sm:max-w-md bg-surface border-border p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-500" />
              Super Admin Password Override
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Set a temporary password for <strong>{overrideTargetUser?.name}</strong> ({overrideTargetUser?.email}). This action revokes all active sessions and enforces a forced password change on their next sign-in.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!overrideTargetUser || !overridePassword.trim()) return;
              setIsResetting(true);
              try {
                const rawSession = typeof window !== "undefined" ? localStorage.getItem("edupulse_sms_session_v1") : null;
                const parsed = rawSession ? JSON.parse(rawSession) : null;
                const token = parsed?.token;

                if (token && !token.startsWith("sms_jwt_")) {
                  await fetch(`http://127.0.0.1:8000/api/v1/super-admin/users/${overrideTargetUser.id}/reset-password`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify({ newPassword: overridePassword }),
                  });
                }

                resetUserPassword(overrideTargetUser.id, overridePassword);
                showToast(`Temporary password set for ${overrideTargetUser.name}. Forced rotation enabled.`);
                setOverrideModalOpen(false);
              } catch (err: any) {
                showToast(err?.message || "Failed to reset password", "error");
              } finally {
                setIsResetting(false);
              }
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">New Temporary Password *</Label>
              <div className="flex gap-2">
                <Input
                  value={overridePassword}
                  onChange={(e) => setOverridePassword(e.target.value)}
                  className="text-xs font-mono"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOverridePassword("TempPass@" + Math.floor(1000 + Math.random() * 9000))}
                  className="text-xs shrink-0"
                >
                  Generate
                </Button>
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-700 dark:text-amber-400">
              Security Notice: The user must select their own confidential password upon next login before dashboard access is permitted.
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOverrideModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isResetting}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
              >
                {isResetting ? "Overriding..." : "Apply Temporary Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: PRINCIPAL HANDOVER */}
      <Dialog open={handoverModalOpen} onOpenChange={setHandoverModalOpen}>
        <DialogContent className="sm:max-w-md bg-surface border-border p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              Institutional Principal Handover
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Transfer principal authority to a successor. The current active Principal will be deactivated atomically.
            </DialogDescription>
          </DialogHeader>

          {activePrincipal && (
            <div className="p-3 bg-muted/60 border border-border rounded-lg text-xs space-y-1">
              <p className="font-semibold text-foreground">Current Active Principal:</p>
              <p className="text-text-secondary">{activePrincipal.name} ({activePrincipal.email})</p>
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                Will be deactivated upon confirmation
              </Badge>
            </div>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!formName.trim() || !formEmail.trim() || !principalPassword.trim()) {
                showToast("Successor name, email, and initial password are required", "error");
                return;
              }
              setIsHandingOver(true);
              try {
                const session = authService.getSession();
                const headers: Record<string, string> = { "Content-Type": "application/json" };
                if (session?.token) {
                  headers["Authorization"] = `Bearer ${session.token}`;
                }

                const res = await fetch("/api/v1/admin/principal/handover", {
                  method: "POST",
                  headers,
                  body: JSON.stringify({
                    school_id: formSchoolId,
                    name: formName.trim(),
                    email: formEmail.trim(),
                    username: formUsername.trim() || formEmail.trim().split("@")[0],
                    phone: formPhone.trim(),
                    password: principalPassword.trim(),
                    successor_name: formName.trim(),
                    successor_email: formEmail.trim(),
                    successor_username: formUsername.trim() || formEmail.trim().split("@")[0],
                    successor_phone: formPhone.trim(),
                    successor_password: principalPassword.trim(),
                    handover_reason: handoverReason.trim() || "Administrative succession",
                  }),
                });

                if (!res.ok) {
                  const errData = await res.json().catch(() => null);
                  throw new Error(errData?.detail || errData?.error?.message || "Handover failed");
                }

                handoverPrincipal({
                  name: formName.trim(),
                  email: formEmail.trim().toLowerCase(),
                  username: formUsername.trim() || formEmail.trim().split("@")[0],
                  phone: formPhone,
                  password: principalPassword.trim(),
                  school_id: formSchoolId,
                  schoolName: formSchoolName,
                  state: KARNATAKA_STATE,
                  district: formDistrict,
                  mustChangePassword: true,
                });

                await loadActivePrincipal();
                setHandoverModalOpen(false);
                setFormName("");
                setSEmail("");
                setPrincipalPassword("");
                setHandoverReason("");
                showToast("Principal handover completed successfully! Previous authority deactivated.");
              } catch (err: any) {
                showToast(err?.message || "Handover failed", "error");
              } finally {
                setIsHandingOver(false);
              }
            }}
            className="space-y-3 pt-2"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Successor Full Name *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Dr. Preeti Sharma"
                className="text-xs"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Successor Email *</Label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setSEmail(e.target.value)}
                  placeholder="preeti@meghaschool.edu.in"
                  className="text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Contact Phone</Label>
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+91 9880011223"
                  className="text-xs"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-purple-primary">Successor Initial Password *</Label>
              <Input
                type="text"
                value={principalPassword}
                onChange={(e) => setPrincipalPassword(e.target.value)}
                placeholder="Initial secure password"
                className="text-xs font-mono"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Reason for Handover</Label>
              <Input
                value={handoverReason}
                onChange={(e) => setHandoverReason(e.target.value)}
                placeholder="e.g. Retirement / Leadership Transition"
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHandoverModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isHandingOver}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
              >
                {isHandingOver ? "Executing Handover..." : "Confirm & Execute Handover"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    
      {/* ASSIGN CLASS & SECTION MODAL */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-primary" />
              Assign Class Teacher (Principal Authority)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assign <strong>{targetTeacher?.name}</strong> ({targetTeacher?.subjectSpecialization || "Faculty"}) as designated Class Teacher for a cohort.
            </DialogDescription>
          </DialogHeader>

          <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-[11px] text-purple-900 flex items-start gap-2">
            <Shield className="h-4 w-4 text-purple-primary shrink-0 mt-0.5" />
            <span>
              <strong>Principal Governance:</strong> In accordance with institutional hierarchy, assigning Class Teachers to cohorts is governed under School Principal Authority and reflects across the administration panel.
            </span>
          </div>

          <form onSubmit={handleAssignSectionSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Target Class & Section Arm *</Label>
              <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select class section arm" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="unassign" className="text-xs text-rose-600 font-semibold">
                    -- Unassign (Remove Class Teacher Role) --
                  </SelectItem>
                  {combinedSections.map((sec: any) => (
                    <SelectItem key={sec.id} value={sec.id} className="text-xs py-1.5">
                      <div className="flex items-center justify-between gap-3 w-full">
                        <span>{sec.className} • Section {sec.name} ({sec.code})</span>
                        <span className="text-[10px] text-muted-foreground">
                          {sec.classTeacherName ? `[CT: ${sec.classTeacherName}]` : `[Vacant]`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAssignModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!selectedSectionId || isAssigning} className="bg-purple-primary text-white">
                {isAssigning ? "Saving..." : "Save Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Staff & Faculty Profile & Registration Details Dialog */}
      <Dialog open={staffDetailsOpen} onOpenChange={setStaffDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white p-6 rounded-t-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-white/30 shadow-md">
                  <AvatarFallback className="bg-white/20 text-white font-extrabold text-xl">
                    {viewingStaff?.name.slice(0, 2).toUpperCase() || "ST"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold">{viewingStaff?.name}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge className="bg-white/20 text-white hover:bg-white/30 border-0 text-[11px] font-mono">
                      Code: {viewingStaff?.code || "EDP/FAC"}
                    </Badge>
                    <Badge className="bg-emerald-500/80 text-white border-0 text-[11px] capitalize">
                      {viewingStaff?.userType === "principal" ? "Principal" : viewingStaff?.userType.replace("_", " ") || "Faculty"}
                    </Badge>
                    <Badge variant="outline" className="border-white/40 text-white text-[11px]">
                      {viewingStaff?.active !== false ? "Active" : "Deactivated"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5 bg-background">
            {/* Section 1: Personal & Contact Information */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-purple-primary" />
                Personal & Contact Biodata
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 p-3.5 rounded-lg border border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Full Legal Name</span>
                  <span className="font-semibold text-foreground">{viewingStaff?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Registered Mobile</span>
                  <span className="font-semibold text-foreground font-mono">{viewingStaff?.phone || "—"}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground block text-[11px]">Email Address</span>
                  <span className="font-semibold text-foreground truncate block" title={viewingStaff?.email}>
                    {viewingStaff?.email || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Gender</span>
                  <span className="font-semibold capitalize text-foreground">{viewingStaff?.gender || "Not specified"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Blood Group</span>
                  <span className="font-semibold text-foreground">{viewingStaff?.bloodGroup || "—"}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground block text-[11px]">District & State</span>
                  <span className="font-semibold text-foreground">
                    {viewingStaff?.district ? `${viewingStaff.district}, ${viewingStaff.state || "Karnataka"}` : "Karnataka"}
                  </span>
                </div>
                <div className="sm:col-span-4">
                  <span className="text-muted-foreground block text-[11px]">Residential Address</span>
                  <span className="font-semibold text-foreground">
                    {viewingStaff?.address || `${viewingStaff?.district || "Bengaluru"}, Karnataka`}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Professional Academic Placement */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-purple-primary" />
                Academic & Teaching Profile
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/40 p-3.5 rounded-lg border border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Employee / Faculty Code</span>
                  <span className="font-semibold font-mono text-foreground">{viewingStaff?.code || "EDP/TCH"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Subject Specialization</span>
                  <span className="font-semibold text-foreground">{viewingStaff?.subjectSpecialization || "General Faculty"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Institutional Designation</span>
                  <span className="font-semibold capitalize text-foreground">
                    {viewingStaff?.userType === "principal" ? "Principal & Head of School" : viewingStaff?.userType.replace("_", " ")}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground block text-[11px]">Class Teacher Responsibilities</span>
                  <span className="font-semibold text-foreground">
                    {viewingStaff?.userType === "principal" ? (
                      "Institutional Head (Supervises all classes)"
                    ) : viewingStaff?.assignedClassTeacher ? (
                      `Class Teacher for ${viewingStaff.assignedClassTeacher}`
                    ) : getTeacherAssignedSection(viewingStaff?.id) ? (
                      `Class Teacher for ${getTeacherAssignedSection(viewingStaff?.id)?.className} (${getTeacherAssignedSection(viewingStaff?.id)?.code})`
                    ) : backendSections.find((s) => s.classTeacherId === viewingStaff?.id) ? (
                      `Class Teacher for ${backendSections.find((s) => s.classTeacherId === viewingStaff?.id)?.className} (${backendSections.find((s) => s.classTeacherId === viewingStaff?.id)?.code})`
                    ) : (
                      "Unassigned (General Teaching Faculty)"
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Onboarding Date</span>
                  <span className="font-semibold text-foreground">{viewingStaff?.createdAt || "AY 2026-2027 Active"}</span>
                </div>
              </div>
            </div>

            {/* Section 3: Credentials & Access Governance */}
            <div className="p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-lg text-xs space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-primary shrink-0" />
                <span className="font-bold text-purple-900">Portal Security & Account Credentials</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-purple-900">
                <div>
                  <span className="text-purple-700 block text-[10px]">Portal Login Username:</span>
                  <span className="font-mono font-semibold">{viewingStaff?.username || viewingStaff?.phone || viewingStaff?.email}</span>
                </div>
                <div>
                  <span className="text-purple-700 block text-[10px]">Credential State:</span>
                  <span className="font-semibold">
                    {viewingStaff?.mustChangePassword ? "First Login Pending (Default Password Provisioned)" : "Active / Verified Password"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
            {isPrincipal && viewingStaff?.userType === "teacher" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const curr = viewingStaff;
                  setStaffDetailsOpen(false);
                  setTargetTeacher(curr);
                  const assigned = getTeacherAssignedSection(curr.id) || backendSections.find((s) => s.classTeacherId === curr.id);
                  setSelectedSectionId(assigned?.id || "");
                  setAssignModalOpen(true);
                }}
                className="text-xs text-purple-primary border-purple-primary/30 hover:bg-purple-tint"
              >
                Assign / Change Section
              </Button>
            ) : <div />}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStaffDetailsOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
