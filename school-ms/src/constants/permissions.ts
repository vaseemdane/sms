import { UserRole } from "@/types";

export const PERMISSIONS = {
  // Academic Operations (Principal Sole Authority)
  ACADEMIC_CLASSES_VIEW: "academic.classes.view",
  ACADEMIC_CLASSES_MANAGE: "academic.classes.manage",
  ACADEMIC_SECTIONS_VIEW: "academic.sections.view",
  ACADEMIC_SECTIONS_MANAGE: "academic.sections.manage",
  ACADEMIC_TEACHERS_ASSIGN: "academic.teachers.assign",
  ACADEMIC_TIMETABLE_VIEW: "academic.timetable.view",
  ACADEMIC_TIMETABLE_MANAGE: "academic.timetable.manage",
  ACADEMIC_TIMETABLE_PUBLISH: "academic.timetable.publish",
  ACADEMIC_ATTENDANCE_VIEW: "academic.attendance.view",
  ACADEMIC_EXAMS_VIEW: "academic.exams.view",
  ACADEMIC_EXAMS_MANAGE: "academic.exams.manage",
  ACADEMIC_EXAMS_PUBLISH: "academic.exams.publish",
  ACADEMIC_MARKS_VIEW: "academic.marks.view",
  ACADEMIC_MARKS_APPROVE: "academic.marks.approve",
  ACADEMIC_PROMOTIONS_MANAGE: "academic.promotions.manage",
  ACADEMIC_REPORTS_VIEW: "academic.reports.view",

  // Business & Finance (Manager / Accountant Sole Authority)
  FINANCE_FEES_VIEW: "finance.fees.view",
  FINANCE_FEES_MANAGE: "finance.fees.manage",
  FINANCE_FEES_COLLECT: "finance.fees.collect",
  FINANCE_EXPENSES_MANAGE: "finance.expenses.manage",
  FINANCE_PAYROLL_MANAGE: "finance.payroll.manage",
  OPERATIONS_VENDORS_MANAGE: "operations.vendors.manage",
  OPERATIONS_ASSETS_MANAGE: "operations.assets.manage",

  // System Administration (Super Admin Sole Authority)
  SYSTEM_USERS_MANAGE: "system.users.manage",
  SYSTEM_CONFIG_MANAGE: "system.config.manage",
  SYSTEM_AUDIT_VIEW: "system.audit.view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Role to Permissions Mapping
export const ROLE_PERMISSIONS_MAP: Record<UserRole, Permission[]> = {
  // Principal = Complete Academic Operational Authority
  principal: [
    PERMISSIONS.ACADEMIC_CLASSES_VIEW,
    PERMISSIONS.ACADEMIC_CLASSES_MANAGE,
    PERMISSIONS.ACADEMIC_SECTIONS_VIEW,
    PERMISSIONS.ACADEMIC_SECTIONS_MANAGE,
    PERMISSIONS.ACADEMIC_TEACHERS_ASSIGN,
    PERMISSIONS.ACADEMIC_TIMETABLE_VIEW,
    PERMISSIONS.ACADEMIC_TIMETABLE_MANAGE,
    PERMISSIONS.ACADEMIC_TIMETABLE_PUBLISH,
    PERMISSIONS.ACADEMIC_ATTENDANCE_VIEW,
    PERMISSIONS.ACADEMIC_EXAMS_VIEW,
    PERMISSIONS.ACADEMIC_EXAMS_MANAGE,
    PERMISSIONS.ACADEMIC_EXAMS_PUBLISH,
    PERMISSIONS.ACADEMIC_MARKS_VIEW,
    PERMISSIONS.ACADEMIC_MARKS_APPROVE,
    PERMISSIONS.ACADEMIC_PROMOTIONS_MANAGE,
    PERMISSIONS.ACADEMIC_REPORTS_VIEW,
    PERMISSIONS.SYSTEM_AUDIT_VIEW,
  ],

  // Super Admin = System Owner / Platform Administrator (Governance & Identities)
  super_admin: [
    PERMISSIONS.SYSTEM_USERS_MANAGE,
    PERMISSIONS.SYSTEM_CONFIG_MANAGE,
    PERMISSIONS.SYSTEM_AUDIT_VIEW,
    PERMISSIONS.ACADEMIC_CLASSES_VIEW, // Read-only system overview
    PERMISSIONS.ACADEMIC_REPORTS_VIEW,
  ],

  admin: [
    PERMISSIONS.SYSTEM_USERS_MANAGE,
    PERMISSIONS.SYSTEM_CONFIG_MANAGE,
    PERMISSIONS.SYSTEM_AUDIT_VIEW,
    PERMISSIONS.ACADEMIC_CLASSES_VIEW,
  ],

  teacher: [
    PERMISSIONS.ACADEMIC_CLASSES_VIEW,
    PERMISSIONS.ACADEMIC_SECTIONS_VIEW,
    PERMISSIONS.ACADEMIC_TIMETABLE_VIEW,
    PERMISSIONS.ACADEMIC_EXAMS_VIEW,
    PERMISSIONS.ACADEMIC_MARKS_VIEW,
  ],

  student: [
    PERMISSIONS.ACADEMIC_TIMETABLE_VIEW,
    PERMISSIONS.ACADEMIC_MARKS_VIEW,
  ],

  parent: [
    PERMISSIONS.ACADEMIC_TIMETABLE_VIEW,
    PERMISSIONS.ACADEMIC_MARKS_VIEW,
  ],
};

// Route Access Matrix
export const ROUTE_ACCESS_RULES: Record<string, UserRole[]> = {
  // Principal Academic Authority Modules
  "/academics/classes": ["principal", "super_admin"],
  "/academics/subjects": ["principal", "super_admin"],
  "/academics/timetables": ["principal", "super_admin", "teacher"],
  "/exams": ["principal", "super_admin", "teacher"],
  "/exams/tabulation": ["principal", "super_admin"],
  "/exams/pins": ["principal", "super_admin"],
  "/students/promotions": ["principal", "super_admin"],
  "/students/promotions/history": ["principal", "super_admin"],

  // Super Admin System Governance Modules
  "/users": ["super_admin", "admin"],
  "/students/new": ["super_admin", "admin", "principal"],

  // Operational Portals
  "/teacher": ["teacher", "super_admin"],
  "/student": ["student", "super_admin"],
  "/parent": ["parent", "super_admin"],
};

export function hasPermission(role: UserRole | string | undefined, permission: Permission | string): boolean {
  if (!role) return false;
  if (typeof window !== "undefined") {
    try {
      const dynamic = localStorage.getItem("edupulse_dynamic_role_permissions");
      if (dynamic) {
        const parsed = JSON.parse(dynamic);
        const roleKey = role.toUpperCase();
        if (parsed[roleKey] && Array.isArray(parsed[roleKey])) {
          return parsed[roleKey].includes(permission);
        }
      }
    } catch {
      // fallback
    }
  }
  const permissions = (ROLE_PERMISSIONS_MAP[role as UserRole] || []) as string[];
  return permissions.includes(permission as string);
}

export function canAccessRoute(role: UserRole | undefined, pathname: string): boolean {
  if (!role) return false;
  // Dashboard is open to all authenticated roles
  if (pathname === "/dashboard") return true;

  // Dynamic permission check based on module rules
  if (typeof window !== "undefined") {
    try {
      const dynamic = localStorage.getItem("edupulse_dynamic_role_permissions");
      if (dynamic) {
        const parsed = JSON.parse(dynamic);
        const roleKey = role.toUpperCase();
        const perms: string[] = parsed[roleKey];
        if (Array.isArray(perms)) {
          const routePermMap: Record<string, string> = {
            "/academics/classes": "classes:read",
            "/academics/sections": "sections:read",
            "/academics/timetables": "timetable:read",
            "/users": "users:read",
            "/settings/roles": "roles:manage",
          };
          for (const [prefix, reqPerm] of Object.entries(routePermMap)) {
            if (pathname === prefix || pathname.startsWith(prefix + "/")) {
              return perms.includes(reqPerm);
            }
          }
        }
      }
    } catch {
      // fallback
    }
  }

  // Check most specific routes first (longest prefix)
  const sortedRules = Object.entries(ROUTE_ACCESS_RULES).sort(
    ([a], [b]) => b.length - a.length
  );

  for (const [routePrefix, allowedRoles] of sortedRules) {
    if (pathname === routePrefix || pathname.startsWith(routePrefix + "/") || pathname.startsWith(routePrefix)) {
      return allowedRoles.includes(role);
    }
  }
  return true;
}
