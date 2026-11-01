import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency ─────────────────────────────────────────────────────────────────
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Ordinal suffix ────────────────────────────────────────────────────────────
export function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ─── Academic year ─────────────────────────────────────────────────────────────
export function getAcademicYear(year?: string): string {
  if (year) return year;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 4 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export function nextAcademicYear(current: string): string {
  const [start] = current.split("-").map(Number);
  return `${start + 1}-${start + 2}`;
}

// ─── Date helpers ──────────────────────────────────────────────────────────────
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

// ─── Admission number generator (frontend display only) ───────────────────────
export function buildAdmissionNo(
  appCode: string,
  classTypeCode: string,
  year: number,
  admNo: number
): string {
  return `${appCode}/${classTypeCode}/${year}/${admNo}`;
}

// ─── Staff code ────────────────────────────────────────────────────────────────
export function buildStaffCode(appCode: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${appCode}/STAFF/${y}/${m}/${rand}`;
}

// ─── PIN format validator ──────────────────────────────────────────────────────
export const PIN_REGEX = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{6}$/;

// ─── Truncate text ─────────────────────────────────────────────────────────────
export function truncate(str: string, length = 40): string {
  return str.length > length ? str.slice(0, length) + "…" : str;
}

// ─── Role helpers ──────────────────────────────────────────────────────────────
export type UserRole =
  | "super_admin"
  | "principal"
  | "admin"
  | "teacher"
  | "parent"
  | "student";

export const ROLE_LEVELS: Record<UserRole, number> = {
  super_admin: 1,
  admin: 2,
  principal: 3,
  teacher: 4,
  parent: 5,
  student: 6,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  principal: "Principal",
  teacher: "Teacher",
  parent: "Parent",
  student: "Student",
};

export function isAtLeastAdmin(role: UserRole): boolean {
  return ROLE_LEVELS[role] <= 2;
}

export function isSupportTeam(role: UserRole): boolean {
  return ["super_admin", "admin", "principal", "teacher"].includes(role);
}

export function canManageStudents(role: UserRole): boolean {
  return ["super_admin", "admin"].includes(role);
}

// ─── Time-Based Greeting ───────────────────────────────────────────────────────
export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) {
    return "Good morning";
  } else if (hour >= 12 && hour < 17) {
    return "Good afternoon";
  } else {
    return "Good evening";
  }
}

export function formatGreeting(name?: string): string {
  const greeting = getTimeGreeting();
  return name ? `${greeting}, ${name}` : greeting;
}

