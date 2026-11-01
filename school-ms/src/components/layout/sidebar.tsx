"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  Calendar,
  LayoutDashboard,
  Users,
  UserPlus,
  BookOpen,
  ClipboardList,
  IndianRupee,
  Building2,
  Settings,
  FileCheck2,
  Award,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  LogOut,
  Sparkles,
  TrendingUp,
  FileText,
  UserCheck,
  Bell,
  Megaphone,
  User,
  X,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canAccessRoute } from "@/constants/permissions";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  roles: UserRole[];
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    heading: "Core",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["super_admin", "principal", "admin", "teacher", "parent", "student"],
      },
    ],
  },
  {
    heading: "Academic Architecture",
    items: [
      {
        title: "Sessions",
        href: "/academics/sessions",
        icon: Calendar,
        roles: ["super_admin", "admin", "principal"],
      },
      {
        title: "Classes & Grades",
        href: "/academics/classes",
        icon: BookOpen,
        roles: ["super_admin", "admin", "principal"],
      },
      {
        title: "Streams",
        href: "/academics/streams",
        icon: Layers,
        roles: ["super_admin", "admin", "principal"],
      },
      {
        title: "Sections & Capacity",
        href: "/academics/sections",
        icon: Users,
        roles: ["super_admin", "admin", "principal"],
      },
      {
        title: "Enrollment",
        href: "/academics/enrollments",
        icon: UserCheck,
        roles: ["super_admin", "admin"],
      },
      {
        title: "Subjects & Faculty",
        href: "/academics/subjects",
        icon: BookOpen,
        roles: ["super_admin", "admin", "principal"],
      },
    ],
  },
  {
    heading: "Principal Desk (Academics)",
    items: [
      {
        title: "Classes & Sections",
        href: "/academics/classes",
        icon: BookOpen,
        badge: "Academic",
        roles: ["principal"],
      },
      {
        title: "Timetable Builder",
        href: "/academics/timetables",
        icon: Calendar,
        badge: "Publish",
        roles: ["principal"],
      },
      {
        title: "Subject Faculty",
        href: "/academics/subjects",
        icon: ClipboardList,
        roles: ["principal"],
      },
      {
        title: "Examinations & Results",
        href: "/exams",
        icon: Award,
        roles: ["principal"],
      },
      {
        title: "Tabulation Sheet",
        href: "/exams/tabulation",
        icon: FileCheck2,
        roles: ["principal"],
      },
      {
        title: "Cohort Promotions",
        href: "/students/promotions",
        icon: GraduationCap,
        roles: ["principal"],
      },
    ],
  },
  {
    heading: "Parent Portal",
    items: [
      {
        title: "Ward Overview",
        href: "/parent",
        icon: Users,
        roles: ["parent"],
      },
      {
        title: "Academic Progress",
        href: "/parent",
        icon: TrendingUp,
        roles: ["parent"],
      },
      {
        title: "Attendance Record",
        href: "/parent",
        icon: Calendar,
        roles: ["parent"],
      },
    ],
  },
  {
    heading: "Teacher Desk",
    items: [
      {
        title: "My Classes",
        href: "/teacher/classes",
        icon: BookOpen,
        badge: "Assigned",
        roles: ["teacher"],
      },
      {
        title: "My Subjects",
        href: "/teacher/subjects",
        icon: ClipboardList,
        roles: ["teacher"],
      },
      {
        title: "My Timetable",
        href: "/teacher/timetable",
        icon: Calendar,
        badge: "Personal",
        roles: ["teacher"],
      },
      {
        title: "Class Attendance",
        href: "/teacher/attendance",
        icon: UserCheck,
        badge: "CT Desk",
        roles: ["teacher"],
      },
    ],
  },
  {
    heading: "Instruction & Marks",
    items: [
      {
        title: "Study Materials",
        href: "/teacher/materials",
        icon: FileText,
        badge: "Targeted",
        roles: ["teacher"],
      },
      {
        title: "Assignments",
        href: "/teacher/assignments",
        icon: FileCheck2,
        roles: ["teacher"],
      },
      {
        title: "Marks Entry",
        href: "/teacher/marks",
        icon: Award,
        badge: "Exam Desk",
        roles: ["teacher"],
      },
      {
        title: "Activity Audit Logs",
        href: "/teacher/audit",
        icon: ShieldAlert,
        roles: ["teacher"],
      },
      {
        title: "Teaching Profile",
        href: "/teacher/profile",
        icon: User,
        roles: ["teacher"],
      },
    ],
  },
  {
    heading: "My Academics",
    items: [
      {
        title: "Assignments",
        href: "/student/academics/assignments",
        icon: ClipboardList,
        badge: "Due",
        roles: ["student"],
      },
      {
        title: "Study Materials",
        href: "/student/academics/materials",
        icon: BookOpen,
        roles: ["student"],
      },
      {
        title: "Performance",
        href: "/student/academics/performance",
        icon: TrendingUp,
        badge: "Growth",
        roles: ["student"],
      },
      {
        title: "Examinations",
        href: "/student/academics/examinations",
        icon: ClipboardList,
        roles: ["student"],
      },
      {
        title: "Report Card",
        href: "/student/academics/report-card",
        icon: FileText,
        badge: "Official",
        roles: ["student"],
      },
      {
        title: "My Subjects",
        href: "/student/academics/subjects",
        icon: BookOpen,
        roles: ["student"],
      },
    ],
  },
  {
    heading: "Attendance & Schedule",
    items: [
      {
        title: "My Attendance",
        href: "/student/attendance",
        icon: UserCheck,
        badge: "Daily",
        roles: ["student"],
      },
      {
        title: "My Timetable",
        href: "/student/timetable",
        icon: Calendar,
        badge: "Live",
        roles: ["student"],
      },
    ],
  },
  {
    heading: "School Communication",
    items: [
      {
        title: "Notifications",
        href: "/student/notifications",
        icon: Bell,
        roles: ["student"],
      },
      {
        title: "Announcements",
        href: "/student/announcements",
        icon: Megaphone,
        roles: ["student"],
      },
      {
        title: "My Profile",
        href: "/student/profile",
        icon: User,
        roles: ["student"],
      },
    ],
  },
  {
    heading: "System Governance",
    items: [
      {
        title: "Quick Registration",
        href: "/students/new",
        icon: UserPlus,
        badge: "CBSE",
        roles: ["super_admin", "admin"],
      },
      {
        title: "Staff & User Roles",
        href: "/users",
        icon: Users,
        roles: ["super_admin", "admin", "principal"],
      },
      {
        title: "Dynamic Roles & RBAC",
        href: "/settings/roles",
        icon: ShieldCheck,
        badge: "Security",
        roles: ["super_admin"],
      },
      {
        title: "Settings & Profile",
        href: "/settings/profile",
        icon: Settings,
        roles: ["super_admin", "principal", "admin", "teacher", "parent"],
      },
    ],
  },
];

interface SidebarProps {
  currentRole?: UserRole;
  schoolName?: string;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export function Sidebar({
  currentRole = "super_admin",
  schoolName = "Delhi Public Academy",
  mobileOpen = false,
  setMobileOpen,
}: SidebarProps) {
  const pathname = usePathname();

  // Close mobile drawer on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen?.(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, setMobileOpen]);

  // Lock background scroll when mobile sidebar is open
  React.useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Listen to dynamic RBAC permission updates
  const [permRevision, setPermRevision] = React.useState(0);
  React.useEffect(() => {
    const handler = () => setPermRevision((r) => r + 1);
    window.addEventListener("edupulse:permissions_updated", handler);
    return () => window.removeEventListener("edupulse:permissions_updated", handler);
  }, []);

  const renderNavContent = () => (
    <>
      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => {
            if (!item.roles.includes(currentRole)) return false;
            return canAccessRoute(currentRole, item.href);
          });
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.heading} className="space-y-1">
              <p className="px-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                {section.heading}
              </p>
              {visibleItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen?.(false)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                      isActive
                        ? "bg-purple-tint text-purple-primary font-semibold border border-lavender/50 shadow-xs"
                        : "text-foreground hover:bg-warm-ivory/60 hover:text-purple-primary"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isActive
                            ? "text-purple-primary"
                            : "text-text-secondary group-hover:text-purple-primary"
                        )}
                      />
                      <span className="truncate">{item.title}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 h-4 bg-lavender/40 text-purple-primary"
                        >
                          {item.badge}
                        </Badge>
                      )}
                      {isActive && (
                        <ChevronRight className="h-3.5 w-3.5 text-purple-primary" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Bottom Session Card */}
      <div className="p-3 border-t border-border bg-background-secondary/80">
        <div className="p-2.5 rounded-xl border border-border/80 bg-surface/90 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-medium text-foreground">
                AY 2026–2027 (Active)
              </span>
              <span className="text-[10px] text-text-secondary">
                Karnataka State Board
              </span>
            </div>
          </div>
          <Sparkles className="h-3.5 w-3.5 text-purple-primary" />
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop Docked Sidebar (Hidden on mobile & tablet < lg:1024px) */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-border bg-surface flex-col h-screen sticky top-0 z-30 transition-all select-none">
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-border bg-background/50">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-primary to-purple-soft flex items-center justify-center text-white shadow-md shadow-purple-primary/20">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-foreground text-sm tracking-tight truncate">
                EduPulse SMS
              </span>
              <span className="text-[10px] font-bold px-1 py-0.2 rounded bg-purple-tint text-purple-primary border border-lavender/40">
                IN
              </span>
            </div>
            <span className="text-xs text-text-secondary truncate">
              {schoolName}
            </span>
          </div>
        </div>

        {renderNavContent()}
      </aside>

      {/* 2. Mobile / Tablet Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen?.(false)}
          aria-hidden="true"
        />
      )}

      {/* 3. Mobile / Tablet Slide-over Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-surface border-r border-border flex flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:hidden select-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile Brand Header with Close Button */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-border bg-background/50">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-primary to-purple-soft flex items-center justify-center text-white shadow-md shadow-purple-primary/20 shrink-0">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-foreground text-sm tracking-tight truncate">
                  EduPulse SMS
                </span>
                <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-purple-tint text-purple-primary border border-lavender/40">
                  IN
                </span>
              </div>
              <span className="text-[11px] text-text-secondary truncate">
                {schoolName}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-text-secondary hover:text-foreground shrink-0 rounded-lg"
            onClick={() => setMobileOpen?.(false)}
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {renderNavContent()}
      </aside>
    </>
  );
}

