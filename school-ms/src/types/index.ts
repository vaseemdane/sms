// ─── User Roles & Auth ────────────────────────────────────────────────────────
export type UserRole =
  | "super_admin"
  | "principal"
  | "admin"
  | "teacher"
  | "parent"
  | "student";

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  userType: UserRole;
  phone?: string;
  address?: string;
  photo?: string;
  photo_url?: string;
  code?: string;
  gender?: "male" | "female" | "other";
  bloodGroup?: string;
  dob?: string;
  state?: string;
  district?: string;
  locality?: string;
  rollNo?: string;
  satsId?: string;
  classSectionId?: string;
  admissionNo?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  currentAcademicYear?: string;
  mustChangePassword?: boolean;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffRecord extends User {
  designation?: string;
  department?: string;
  qualification?: string;
  joiningDate?: string;
  emergencyContact?: string;
}

// ─── Indian Geography Localization ──────────────────────────────────────────
export interface IndianState {
  code: string;
  name: string;
  type: "state" | "union_territory";
}

export interface IndianDistrict {
  id: string;
  stateCode: string;
  name: string;
}

// ─── Academic Entities ───────────────────────────────────────────────────────
export type ClassCategory = "NURSERY" | "PRIMARY" | "SECONDARY" | "HIGHER_SECONDARY";

export interface ClassType {
  id: string;
  name: string;
  code: string; // e.g. NUR, PRY, JSS, SSS
  category: ClassCategory;
}

export interface MyClass {
  id: string;
  name: string;
  classTypeId: string;
  classType?: ClassType;
  sectionsCount?: number;
  studentsCount?: number;
}

export interface Section {
  id: string;
  name: string;
  classId: string;
  myClass?: MyClass;
  teacherId?: string;
  teacher?: User;
  studentsCount?: number;
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
  classId: string;
  myClass?: MyClass;
  teacherId?: string;
  teacher?: User;
  code?: string;
  isCore?: boolean;
}

// ─── Student Lifecycle ───────────────────────────────────────────────────────
export interface StudentRecord {
  id: string;
  userId: string;
  user: User;
  admNo: string;
  classId: string;
  myClass?: MyClass;
  sectionId: string;
  section?: Section;
  parentId?: string;
  parent?: User;
  dormId?: string;
  dorm?: Dorm;
  dormRoomNo?: string;
  sessionYear: string;
  isGraduated: boolean;
  graduatedAt?: string;
  age?: number;
  rollNo?: string;
}

export type PromotionStatus = "P" | "D" | "G"; // Promote | Demote/Retain | Graduate

export interface PromotionItem {
  studentId: string;
  studentName: string;
  admNo: string;
  currentClassId: string;
  currentSectionId: string;
  action: PromotionStatus;
  targetClassId?: string;
  targetSectionId?: string;
}

export interface PromotionHistory {
  id: string;
  studentId: string;
  studentName: string;
  admNo: string;
  fromClass: string;
  fromSection: string;
  toClass: string;
  toSection: string;
  status: PromotionStatus;
  sessionFrom: string;
  sessionTo: string;
  promotedAt: string;
}

// ─── Examinations & Grading ─────────────────────────────────────────────────
export interface Exam {
  id: string;
  name: string;
  term: 1 | 2 | 3;
  year: string;
  startDate?: string;
  endDate?: string;
  isPublished?: boolean;
}

export interface Grade {
  id: string;
  name: string; // A1, A2, B1, etc.
  classTypeId: string;
  classType?: ClassType;
  markFrom: number;
  markTo: number;
  gradePoint: number;
  remark: string;
}

export interface MarkRecord {
  id: string;
  studentId: string;
  student?: StudentRecord;
  subjectId: string;
  subject?: Subject;
  classId: string;
  sectionId: string;
  examId: string;
  exam?: Exam;
  testScore: number; // Max 40 or 30 (Continuous Assessment)
  examScore: number; // Max 60 or 70 (Terminal Exam)
  totalScore: number; // 0-100
  gradeId?: string;
  grade?: Grade;
  position?: number;
  teacherRemark?: string;
  term: 1 | 2 | 3;
  year: string;
}

export interface StudentReportCard {
  student: StudentRecord;
  exam: Exam;
  marks: MarkRecord[];
  totalScore: number;
  averageScore: number;
  classPosition: number;
  classSize: number;
  attendanceDays: number;
  totalSchoolDays: number;
  headTeacherRemark: string;
  classTeacherRemark: string;
  scratchPinVerified: boolean;
}

// ─── Fee & Payment Management (INR Localization) ────────────────────────────
export type PaymentMethod = "CASH" | "UPI" | "CARD" | "NET_BANKING" | "CHEQUE";
export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";

export interface FeeCategory {
  id: string;
  name: string;
  description?: string;
}

export interface FeeStructure {
  id: string;
  title: string;
  classId: string;
  myClass?: MyClass;
  feeCategoryId: string;
  feeCategory?: FeeCategory;
  amount: number; // In INR
  sessionYear: string;
  term: 1 | 2 | 3;
  dueDate: string;
}

export interface PaymentReceipt {
  id: string;
  receiptNo: string;
  studentId: string;
  student?: StudentRecord;
  feeStructureId: string;
  feeStructure?: FeeStructure;
  amountPaid: number; // In INR
  paymentMethod: PaymentMethod;
  referenceNo?: string;
  paidAt: string;
  status: PaymentStatus;
  cashierName?: string;
}

// ─── Dormitory / Hostel ─────────────────────────────────────────────────────
export interface Dorm {
  id: string;
  name: string;
  description?: string;
  capacity?: number;
  occupancyCount?: number;
}

// ─── Scratch PIN Gating (Exam Result Access) ─────────────────────────────────
export interface ExamPin {
  id: string;
  code: string;
  studentId?: string;
  usedCount: number;
  maxUses: number; // Default 5
  isExpired: boolean;
  expiresAt: string;
}

// ─── API & Pagination Standard Wrappers ──────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: T;
  error?: string;
}

export interface PaginatedResponse<T = unknown> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Teacher Portal & Assignment-Driven Access Control ──────────────────────
export type TeacherAssignmentType = "CLASS_TEACHER" | "SUBJECT_TEACHER";

export interface TeacherAssignment {
  id: string;
  teacherId: string;
  academicYear: string; // e.g. "2026-2027"
  classId: string;      // e.g. "cls-10"
  sectionId: string;    // e.g. "sec-10a"
  className: string;    // e.g. "Class 10"
  sectionName: string;  // e.g. "10A"
  assignmentType: TeacherAssignmentType;
  subjectId?: string;
  subjectName?: string; // e.g. "Mathematics"
  isPrimary?: boolean;
}

export interface StudyMaterial {
  id: string;
  title: string;
  description?: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  targetSectionIds: string[]; // Classes/sections explicitly targeted (e.g. ["sec-10a", "sec-10b"])
  targetSectionCodes: string[]; // ["10A", "10B"]
  fileName: string;
  fileSize: string;
  fileType: string;
  academicYear: string;
  createdAt: string;
  downloadUrl?: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  targetSectionIds: string[]; // e.g. ["sec-10a"]
  targetSectionCodes: string[];
  dueDate: string;
  totalMarks: number;
  academicYear: string;
  createdAt: string;
  attachmentName?: string;
}

export type SubmissionStatus = "SUBMITTED" | "PENDING" | "LATE" | "GRADED";

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  sectionId: string;
  sectionCode: string;
  submittedAt?: string;
  status: SubmissionStatus;
  obtainedMarks?: number;
  feedback?: string;
}

export type TeacherAuditAction =
  | "ATTENDANCE_MARKED"
  | "ATTENDANCE_MODIFIED"
  | "STUDY_MATERIAL_UPLOADED"
  | "ASSIGNMENT_CREATED"
  | "MARKS_ENTERED"
  | "MARKS_SUBMITTED"
  | "PASSWORD_CHANGED";

export interface TeacherAuditLog {
  id: string;
  teacherId: string;
  teacherName: string;
  action: TeacherAuditAction;
  targetType: "SECTION" | "MATERIAL" | "ASSIGNMENT" | "EXAM_MARKS" | "PROFILE";
  targetId?: string;
  details: string;
  timestamp: string;
}

// ─── Manager & Operations Types ──────────────────────────────────────────────
export interface ExpenseRecord {
  id: string;
  title: string;
  category: string;
  amount: number;
  expenseDate: string;
  paymentMethod: string;
  vendorName?: string;
  referenceNo?: string;
  description?: string;
}

export interface StaffPersonnel {
  id: string;
  employeeId: string;
  name: string;
  roleCategory: string; // Security, Office, Transport, Maintenance
  designation: string;
  department: string;
  phone: string;
  monthlySalary: number;
  status: "ACTIVE" | "ON_LEAVE" | "INACTIVE";
  joiningDate: string;
}

export interface PayrollItem {
  id: string;
  staffName: string;
  employeeId: string;
  designation: string;
  payrollMonth: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  paymentStatus: "PENDING" | "PAID";
  paidDate?: string;
}

export interface VendorRecord {
  id: string;
  name: string;
  category: string;
  contactPerson?: string;
  phone: string;
  outstandingBalance: number;
}

export interface AssetRecord {
  id: string;
  assetCode: string;
  name: string;
  category: string;
  location: string;
  condition: string;
  cost: number;
}

export interface InventoryRecord {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  quantity: number;
  reorderLevel: number;
  unit: string;
  isLowStock: boolean;
}



