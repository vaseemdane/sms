"use client";

import * as React from "react";
import { KARNATAKA_DISTRICTS, KARNATAKA_STATE, KarnatakaDistrict } from "@/constants/karnataka";
import {
  TeacherAssignment,
  TeacherAssignmentType,
  StudyMaterial,
  Assignment,
  AssignmentSubmission,
  SubmissionStatus,
  TeacherAuditLog,
  TeacherAuditAction,
} from "@/types";
import { generateTeacherPassword, normalizeDobDDMMYYYY } from "@/utils/password";

// Types

export type UserRole = "super_admin" | "admin" | "principal" | "teacher" | "student" | "parent";

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  username: string;
  userType: UserRole;
  phone?: string;
  password?: string;
  mustChangePassword?: boolean;
  active: boolean;
  state: string; // locked to "Karnataka"
  district: string;
  code?: string;
  gender?: "male" | "female" | "other";
  bloodGroup?: string;
  dob?: string;
  address?: string;
  // Student specifics
  satsId?: string;
  classSectionId?: string; // e.g. "sec-6a"
  rollNo?: string;
  admissionNo?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  currentAcademicYear?: string;
  // Teacher specifics
  subjectSpecialization?: string;
  assignedClassTeacher?: string;
  assignedSubjects?: string[];
  // Multi-Tenant School
  school_id?: string;
  schoolName?: string;
  createdAt: string;
}

export interface SectionEntity {
  id: string;          // "sec-6a"
  classId: string;     // "cls-6"
  className: string;   // "Class 6"
  name: string;        // "Section A"
  code: string;        // "6A"
  classTeacherId?: string;
}

export type TimeSlotType = "PERIOD" | "BREAK";
export type WeekDay = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

export interface CustomTimeSlot {
  id: string;
  startTime: string; // "08:30"
  endTime: string;   // "09:15"
  type: TimeSlotType;
  title?: string;    // "Assembly", "Lunch Break"
  subject?: string;  // "Mathematics"
  teacherId?: string;
  room?: string;     // "Room 204", "Science Lab 1"
}

export interface SectionTimetable {
  sectionId: string;
  sectionName: string; // e.g. "6A"
  isPublished: boolean;
  schedule: Record<WeekDay, CustomTimeSlot[]>;
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "EXCUSED";

export interface AttendanceRecord {
  [studentId: string]: AttendanceStatus;
}

export interface StudentExamMark {
  id: string;
  studentId: string;
  academicYear: string; // "2026-2027" | "2025-2026" | "2024-2025"
  term: 1 | 2 | 3;
  examName: string;
  subject: string;
  testScore: number;
  examScore: number;
  totalScore: number;
  maxScore: number;
  grade: string;
  gradePoint: number;
  status: "Distinction" | "Passed" | "Needs Improvement";
  teacherRemark?: string;
  publishedAt: string;
}

export interface StudentNotification {
  id: string;
  studentId?: string; // undefined means all students
  title: string;
  message: string;
  category: "academic" | "attendance" | "examination" | "announcement";
  read: boolean;
  createdAt: string;
  priority?: "normal" | "high" | "urgent";
  link?: string;
}

export interface SchoolAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: "normal" | "important" | "urgent";
  publishedBy: string;
  publishedRole: string;
  publishDate: string;
  targetAudience: string;
  category: string;
  attachmentName?: string;
}

export interface StudentAttendanceSummary {
  overallPercentage: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
  totalWorkingDays: number;
  monthlyBreakdown: Array<{
    month: string;
    percentage: number;
    present: number;
    absent: number;
    late: number;
    total: number;
  }>;
  dayRecords: Record<string, AttendanceStatus>;
  isBelowThreshold: boolean;
  threshold: number;
}

// Conflict detection helper
export const toMinutes = (timeStr: string) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

export const hasTeacherTimeConflict = (
  allTimetables: SectionTimetable[],
  currentSectionId: string,
  day: WeekDay,
  newStart: string,
  newEnd: string,
  teacherId: string
) => {
  const startA = toMinutes(newStart);
  const endA = toMinutes(newEnd);

  for (const section of allTimetables) {
    if (section.sectionId === currentSectionId) continue;

    const daySlots = section.schedule[day] || [];
    for (const slot of daySlots) {
      if (slot.type === "PERIOD" && slot.teacherId === teacherId) {
        const startB = toMinutes(slot.startTime);
        const endB = toMinutes(slot.endTime);

        if (startA < endB && endA > startB) {
          return {
            hasConflict: true,
            conflictingClass: section.sectionName,
            conflictingTime: `${slot.startTime} - ${slot.endTime}`,
          };
        }
      }
    }
  }
  return { hasConflict: false };
};

// Default Bell Schedule Template with Rooms
export const DEFAULT_BELL_SCHEDULE: CustomTimeSlot[] = [
  { id: "slot-1", startTime: "08:30", endTime: "09:00", type: "BREAK", title: "Morning Assembly & Prayer", room: "Assembly Ground" },
  { id: "slot-2", startTime: "09:00", endTime: "09:45", type: "PERIOD", subject: "Mathematics", room: "Room 204" },
  { id: "slot-3", startTime: "09:45", endTime: "10:30", type: "PERIOD", subject: "Science", room: "Science Lab 1" },
  { id: "slot-4", startTime: "10:30", endTime: "10:50", type: "BREAK", title: "Short Break", room: "Quad" },
  { id: "slot-5", startTime: "10:50", endTime: "11:35", type: "PERIOD", subject: "English Language", room: "Room 204" },
  { id: "slot-6", startTime: "11:35", endTime: "12:20", type: "PERIOD", subject: "Social Science", room: "Room 204" },
  { id: "slot-7", startTime: "12:20", endTime: "13:05", type: "BREAK", title: "Lunch Break", room: "Dining Hall" },
  { id: "slot-8", startTime: "13:05", endTime: "13:50", type: "PERIOD", subject: "Kannada / Regional Lang", room: "Room 204" },
  { id: "slot-9", startTime: "13:50", endTime: "14:35", type: "PERIOD", subject: "Computer Science & IT", room: "Computer Lab" },
];

const STORAGE_KEY = "edupulse_sms_clean_production_v5";

interface SMSStoreContextType {
  users: StoredUser[];
  sections: SectionEntity[];
  timetables: SectionTimetable[];
  attendance: Record<string, AttendanceRecord>; // key: `${sectionId}_${date}`
  
  // Hierarchical User Provisioning
  enrollPrincipal: (principal: Omit<StoredUser, "id" | "userType" | "active" | "createdAt"> & { password: string }) => StoredUser;
  handoverPrincipal: (successor: Omit<StoredUser, "id" | "userType" | "active" | "createdAt"> & { password: string }) => StoredUser;
  enrollStudent: (student: Omit<StoredUser, "id" | "userType" | "active" | "createdAt">) => StoredUser;

  // Teachers
  teachers: StoredUser[];
  enrollTeacher: (teacher: Omit<StoredUser, "id" | "userType" | "mustChangePassword" | "active" | "createdAt">) => StoredUser;
  updateTeacher: (id: string, updates: Partial<StoredUser>) => void;
  toggleUserStatus: (id: string) => void;
  deleteTeacher: (id: string) => { success: boolean; error?: string };
  resetUserPassword: (id: string, defaultPass: string) => void;
  
  // Class Teachers (1:1 validation)
  assignClassTeacher: (sectionId: string, teacherId: string) => { success: boolean; message?: string };
  getAssignedClassTeacher: (sectionId: string) => StoredUser | undefined;
  getTeacherAssignedSection: (teacherId: string) => SectionEntity | undefined;

  // Teacher Assignments (Role + Subject + Class/Section)
  teacherAssignments: TeacherAssignment[];
  assignSubjectTeacher: (teacherId: string, sectionId: string, subjectName: string, academicYear?: string) => { success: boolean; message?: string };
  removeSubjectTeacher: (assignmentId: string) => void;
  getTeacherAssignments: (teacherId: string) => TeacherAssignment[];
  getTeacherAssignedSections: (teacherId: string) => SectionEntity[];
  getTeacherAssignedSubjects: (teacherId: string) => string[];
  isClassTeacherForSection: (teacherId: string, sectionId: string) => boolean;
  isSubjectTeacherForSection: (teacherId: string, sectionId: string, subjectName?: string) => boolean;
  isAuthorizedForSection: (teacherId: string, sectionId: string) => boolean;

  // Study Materials (Targeted class/section distribution)
  studyMaterials: StudyMaterial[];
  uploadStudyMaterial: (material: Omit<StudyMaterial, "id" | "createdAt">) => { success: boolean; data?: StudyMaterial; error?: string };
  deleteStudyMaterial: (id: string, teacherId: string) => { success: boolean; error?: string };
  getMaterialsForStudent: (sectionId: string) => StudyMaterial[];
  getMaterialsForTeacher: (teacherId: string) => StudyMaterial[];

  // Assignments & Homework
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  createAssignment: (assignment: Omit<Assignment, "id" | "createdAt">) => { success: boolean; data?: Assignment; error?: string };
  getAssignmentsForTeacher: (teacherId: string) => Assignment[];
  getAssignmentsForStudent: (sectionId: string) => Assignment[];
  getSubmissionsForAssignment: (assignmentId: string) => AssignmentSubmission[];
  gradeSubmission: (submissionId: string, marks: number, feedback?: string) => void;

  // Mark Entry Workflow
  saveExamMarkDraft: (mark: Omit<StudentExamMark, "id" | "publishedAt">) => void;
  submitExamMarks: (marks: StudentExamMark[], teacherId: string) => { success: boolean; error?: string };

  // Teacher Audit Logs
  teacherAuditLogs: TeacherAuditLog[];
  recordTeacherAudit: (log: Omit<TeacherAuditLog, "id" | "timestamp">) => void;

  // Students
  students: StoredUser[];
  getStudentsBySection: (sectionId: string) => StoredUser[];
  enrollStudentToSection: (sectionId: string, student: Omit<StoredUser, "id" | "userType" | "classSectionId" | "mustChangePassword" | "active" | "createdAt">) => StoredUser;
  updateStudent: (id: string, updates: Partial<StoredUser>) => void;
  deleteStudent: (id: string) => void;

  // Timetables
  getTimetableBySection: (sectionId: string) => SectionTimetable;
  saveTimetableSchedule: (sectionId: string, day: WeekDay, slots: CustomTimeSlot[]) => void;
  publishTimetable: (sectionId: string, isPublished: boolean) => void;
  applyBellScheduleTemplate: (sectionId: string, day?: WeekDay) => void;
  applyMasterTemplateToAllSections: () => void;
  checkTeacherConflict: (sectionId: string, day: WeekDay, start: string, end: string, teacherId: string) => { hasConflict: boolean; conflictingClass?: string; conflictingTime?: string };
  getTeacherSchedule: (teacherId: string) => Array<{ sectionName: string; day: WeekDay; slot: CustomTimeSlot }>;

  // Attendance
  getSectionAttendance: (sectionId: string, date: string) => AttendanceRecord;
  saveSectionAttendance: (sectionId: string, date: string, records: AttendanceRecord) => void;
  attendanceThreshold: number;
  setAttendanceThreshold: (threshold: number) => void;
  getStudentAttendanceSummary: (studentId: string, sectionId?: string, year?: string) => StudentAttendanceSummary;

  // Examinations & Academic Marks
  examMarks: StudentExamMark[];
  getStudentMarks: (studentId: string, year?: string, examName?: string) => StudentExamMark[];
  getStudentAcademicYears: (studentId: string) => string[];
  getStudentYearPerformance: (studentId: string) => Array<{
    year: string;
    percentage: number;
    averageMarks: number;
    totalMarks: number;
    maxMarks: number;
    examsCount: number;
    grade: string;
    subjectsCount: number;
  }>;

  // Notifications
  notifications: StudentNotification[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: (studentId?: string) => void;

  // Announcements
  announcements: SchoolAnnouncement[];

  // Password Self-Service / First login
  changePassword: (userId: string, newPass: string) => void;

  // Factory Reset
  resetStoreToDefaults: () => void;
}


const SMSStoreContext = React.createContext<SMSStoreContextType | undefined>(undefined);

// Generate multi-date attendance records across working days from June 2026 to Oct 2026
const generateHistoricalAttendance = (sectionId: string = "sec-6a"): Record<string, AttendanceRecord> => {
  const records: Record<string, AttendanceRecord> = {};
  
  // Date ranges: 2026-06-01 to 2026-10-23
  const start = new Date(2026, 5, 1); // June 1, 2026
  const end = new Date(2026, 9, 23);   // Oct 23, 2026

  let current = new Date(start);
  let dayCounter = 0;

  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0 is Sunday
    if (dayOfWeek !== 0) { // Skip Sundays
      dayCounter++;
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, "0");
      const dd = String(current.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // Student 1 (Abhishek): ~92% present (absent on every 18th day, late on every 25th day)
      const st1Status: AttendanceStatus =
        dayCounter % 18 === 0 ? "ABSENT" : dayCounter % 25 === 0 ? "LATE" : "PRESENT";

      // Student 2 (Bhoomika): ~95% present
      const st2Status: AttendanceStatus =
        dayCounter % 22 === 0 ? "ABSENT" : dayCounter % 30 === 0 ? "LATE" : "PRESENT";

      // Student 3 (Chetan): ~71% present (shows low-attendance warning alert)
      const st3Status: AttendanceStatus =
        dayCounter % 4 === 0 ? "ABSENT" : dayCounter % 7 === 0 ? "LATE" : "PRESENT";

      records[`${sectionId}_${dateStr}`] = {
        "usr-student-1": st1Status,
        "usr-student-2": st2Status,
        "usr-student-3": st3Status,
        "usr-student-4": "PRESENT",
        "usr-student-5": dayCounter % 20 === 0 ? "LATE" : "PRESENT",
        "usr-student-6": "PRESENT",
      };
    }
    current.setDate(current.getDate() + 1);
  }

  return records;
};

// Generate multi-year examination marks
const generateInitialExamMarks = (): StudentExamMark[] => {
  return [
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ACADEMIC YEAR 2026â€“2027 (CURRENT YEAR) - Student 1 (Abhishek S. Patil)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Mid-Term Examination
    {
      id: "mark-2026-mt-1",
      studentId: "usr-student-1",
      academicYear: "2026-2027",
      term: 1,
      examName: "Mid-Term Examination",
      subject: "Mathematics",
      testScore: 36,
      examScore: 52,
      totalScore: 88,
      maxScore: 100,
      grade: "A2",
      gradePoint: 9,
      status: "Distinction",
      teacherRemark: "Excellent mathematical problem solving and algebraic clarity.",
      publishedAt: "2026-10-15T10:00:00Z",
    },
    {
      id: "mark-2026-mt-2",
      studentId: "usr-student-1",
      academicYear: "2026-2027",
      term: 1,
      examName: "Mid-Term Examination",
      subject: "Science",
      testScore: 32,
      examScore: 50,
      totalScore: 82,
      maxScore: 100,
      grade: "A2",
      gradePoint: 9,
      status: "Passed",
      teacherRemark: "Sound understanding of physics and chemistry experimental concepts.",
      publishedAt: "2026-10-15T10:00:00Z",
    },
    {
      id: "mark-2026-mt-3",
      studentId: "usr-student-1",
      academicYear: "2026-2027",
      term: 1,
      examName: "Mid-Term Examination",
      subject: "English Language",
      testScore: 38,
      examScore: 52,
      totalScore: 90,
      maxScore: 100,
      grade: "A2",
      gradePoint: 9,
      status: "Distinction",
      teacherRemark: "High eloquence in creative prose, comprehension, and grammar.",
      publishedAt: "2026-10-15T10:00:00Z",
    },
    {
      id: "mark-2026-mt-4",
      studentId: "usr-student-1",
      academicYear: "2026-2027",
      term: 1,
      examName: "Mid-Term Examination",
      subject: "Kannada",
      testScore: 35,
      examScore: 54,
      totalScore: 89,
      maxScore: 100,
      grade: "A2",
      gradePoint: 9,
      status: "Distinction",
      teacherRemark: "Commendable mastery in regional language literature & poetry.",
      publishedAt: "2026-10-15T10:00:00Z",
    },
    {
      id: "mark-2026-mt-5",
      studentId: "usr-student-1",
      academicYear: "2026-2027",
      term: 1,
      examName: "Mid-Term Examination",
      subject: "Social Science",
      testScore: 28,
      examScore: 48,
      totalScore: 76,
      maxScore: 100,
      grade: "B1",
      gradePoint: 8,
      status: "Needs Improvement",
      teacherRemark: "Good historical recall; requires deeper review in map pointing and economics.",
      publishedAt: "2026-10-15T10:00:00Z",
    },
    {
      id: "mark-2026-mt-6",
      studentId: "usr-student-1",
      academicYear: "2026-2027",
      term: 1,
      examName: "Mid-Term Examination",
      subject: "Computer Science",
      testScore: 38,
      examScore: 56,
      totalScore: 94,
      maxScore: 100,
      grade: "A1",
      gradePoint: 10,
      status: "Distinction",
      teacherRemark: "Outstanding programming logic, flowcharts, and theoretical mastery.",
      publishedAt: "2026-10-15T10:00:00Z",
    },

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ACADEMIC YEAR 2025â€“2026 (PREVIOUS YEAR) - Student 1
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Mid-Term
    {
      id: "mark-2025-mt-1",
      studentId: "usr-student-1",
      academicYear: "2025-2026",
      term: 1,
      examName: "Mid-Term Examination",
      subject: "Mathematics",
      testScore: 30,
      examScore: 44,
      totalScore: 74,
      maxScore: 100,
      grade: "B1",
      gradePoint: 8,
      status: "Passed",
      publishedAt: "2025-10-14T10:00:00Z",
    },
    {
      id: "mark-2025-mt-2",
      studentId: "usr-student-1",
      academicYear: "2025-2026",
      term: 1,
      examName: "Mid-Term Examination",
      subject: "Science",
      testScore: 28,
      examScore: 48,
      totalScore: 76,
      maxScore: 100,
      grade: "B1",
      gradePoint: 8,
      status: "Passed",
      publishedAt: "2025-10-14T10:00:00Z",
    },
    {
      id: "mark-2025-mt-3",
      studentId: "usr-student-1",
      academicYear: "2025-2026",
      term: 1,
      examName: "Mid-Term Examination",
      subject: "English Language",
      testScore: 32,
      examScore: 50,
      totalScore: 82,
      maxScore: 100,
      grade: "A2",
      gradePoint: 9,
      status: "Passed",
      publishedAt: "2025-10-14T10:00:00Z",
    },
    {
      id: "mark-2025-mt-4",
      studentId: "usr-student-1",
      academicYear: "2025-2026",
      term: 1,
      examName: "Mid-Term Examination",
      subject: "Kannada",
      testScore: 32,
      examScore: 50,
      totalScore: 82,
      maxScore: 100,
      grade: "A2",
      gradePoint: 9,
      status: "Passed",
      publishedAt: "2025-10-14T10:00:00Z",
    },
    {
      id: "mark-2025-mt-5",
      studentId: "usr-student-1",
      academicYear: "2025-2026",
      term: 1,
      examName: "Mid-Term Examination",
      subject: "Social Science",
      testScore: 26,
      examScore: 46,
      totalScore: 72,
      maxScore: 100,
      grade: "B1",
      gradePoint: 8,
      status: "Passed",
      publishedAt: "2025-10-14T10:00:00Z",
    },
    {
      id: "mark-2025-mt-6",
      studentId: "usr-student-1",
      academicYear: "2025-2026",
      term: 1,
      examName: "Mid-Term Examination",
      subject: "Computer Science",
      testScore: 34,
      examScore: 54,
      totalScore: 88,
      maxScore: 100,
      grade: "A2",
      gradePoint: 9,
      status: "Distinction",
      publishedAt: "2025-10-14T10:00:00Z",
    },
    // Final Examination (2025â€“26)
    {
      id: "mark-2025-fin-1",
      studentId: "usr-student-1",
      academicYear: "2025-2026",
      term: 2,
      examName: "Final Terminal Examination",
      subject: "Mathematics",
      testScore: 32,
      examScore: 50,
      totalScore: 82,
      maxScore: 100,
      grade: "A2",
      gradePoint: 9,
      status: "Passed",
      publishedAt: "2026-03-24T10:00:00Z",
    },
    {
      id: "mark-2025-fin-2",
      studentId: "usr-student-1",
      academicYear: "2025-2026",
      term: 2,
      examName: "Final Terminal Examination",
      subject: "Science",
      testScore: 31,
      examScore: 48,
      totalScore: 79,
      maxScore: 100,
      grade: "B1",
      gradePoint: 8,
      status: "Passed",
      publishedAt: "2026-03-24T10:00:00Z",
    },
    {
      id: "mark-2025-fin-3",
      studentId: "usr-student-1",
      academicYear: "2025-2026",
      term: 2,
      examName: "Final Terminal Examination",
      subject: "English Language",
      testScore: 35,
      examScore: 50,
      totalScore: 85,
      maxScore: 100,
      grade: "A2",
      gradePoint: 9,
      status: "Distinction",
      publishedAt: "2026-03-24T10:00:00Z",
    },
    {
      id: "mark-2025-fin-4",
      studentId: "usr-student-1",
      academicYear: "2025-2026",
      term: 2,
      examName: "Final Terminal Examination",
      subject: "Kannada",
      testScore: 34,
      examScore: 50,
      totalScore: 84,
      maxScore: 100,
      grade: "A2",
      gradePoint: 9,
      status: "Distinction",
      publishedAt: "2026-03-24T10:00:00Z",
    },
    {
      id: "mark-2025-fin-5",
      studentId: "usr-student-1",
      academicYear: "2025-2026",
      term: 2,
      examName: "Final Terminal Examination",
      subject: "Social Science",
      testScore: 28,
      examScore: 46,
      totalScore: 74,
      maxScore: 100,
      grade: "B1",
      gradePoint: 8,
      status: "Passed",
      publishedAt: "2026-03-24T10:00:00Z",
    },
    {
      id: "mark-2025-fin-6",
      studentId: "usr-student-1",
      academicYear: "2025-2026",
      term: 2,
      examName: "Final Terminal Examination",
      subject: "Computer Science",
      testScore: 36,
      examScore: 54,
      totalScore: 90,
      maxScore: 100,
      grade: "A2",
      gradePoint: 9,
      status: "Distinction",
      publishedAt: "2026-03-24T10:00:00Z",
    },

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ACADEMIC YEAR 2024â€“2025 (OLDER YEAR) - Student 1
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    {
      id: "mark-2024-fin-1",
      studentId: "usr-student-1",
      academicYear: "2024-2025",
      term: 2,
      examName: "Annual Terminal Examination",
      subject: "Mathematics",
      testScore: 28,
      examScore: 44,
      totalScore: 72,
      maxScore: 100,
      grade: "B1",
      gradePoint: 8,
      status: "Passed",
      publishedAt: "2025-03-22T10:00:00Z",
    },
    {
      id: "mark-2024-fin-2",
      studentId: "usr-student-1",
      academicYear: "2024-2025",
      term: 2,
      examName: "Annual Terminal Examination",
      subject: "Science",
      testScore: 26,
      examScore: 44,
      totalScore: 70,
      maxScore: 100,
      grade: "B2",
      gradePoint: 7,
      status: "Passed",
      publishedAt: "2025-03-22T10:00:00Z",
    },
    {
      id: "mark-2024-fin-3",
      studentId: "usr-student-1",
      academicYear: "2024-2025",
      term: 2,
      examName: "Annual Terminal Examination",
      subject: "English Language",
      testScore: 30,
      examScore: 48,
      totalScore: 78,
      maxScore: 100,
      grade: "B1",
      gradePoint: 8,
      status: "Passed",
      publishedAt: "2025-03-22T10:00:00Z",
    },
    {
      id: "mark-2024-fin-4",
      studentId: "usr-student-1",
      academicYear: "2024-2025",
      term: 2,
      examName: "Annual Terminal Examination",
      subject: "Kannada",
      testScore: 30,
      examScore: 46,
      totalScore: 76,
      maxScore: 100,
      grade: "B1",
      gradePoint: 8,
      status: "Passed",
      publishedAt: "2025-03-22T10:00:00Z",
    },
    {
      id: "mark-2024-fin-5",
      studentId: "usr-student-1",
      academicYear: "2024-2025",
      term: 2,
      examName: "Annual Terminal Examination",
      subject: "Social Science",
      testScore: 25,
      examScore: 45,
      totalScore: 70,
      maxScore: 100,
      grade: "B2",
      gradePoint: 7,
      status: "Passed",
      publishedAt: "2025-03-22T10:00:00Z",
    },
    {
      id: "mark-2024-fin-6",
      studentId: "usr-student-1",
      academicYear: "2024-2025",
      term: 2,
      examName: "Annual Terminal Examination",
      subject: "Computer Science",
      testScore: 30,
      examScore: 52,
      totalScore: 82,
      maxScore: 100,
      grade: "A2",
      gradePoint: 9,
      status: "Passed",
      publishedAt: "2025-03-22T10:00:00Z",
    },
  ];
};

const generateInitialNotifications = (): StudentNotification[] => {
  return [
    {
      id: "notif-1",
      studentId: "usr-student-1",
      title: "Mid-Term Examination Results Published",
      message: "Your subject-wise marks and grades for Mid-Term Examination AY 2026â€“27 are now verified and accessible in your portal.",
      category: "examination",
      read: false,
      createdAt: "2026-10-18T14:30:00Z",
      priority: "high",
      link: "/student/academics/examinations",
    },
    {
      id: "notif-2",
      studentId: "usr-student-1",
      title: "Timetable Updated (Room 204 & Science Lab)",
      message: "Official schedule for Class 6A has been updated with laboratory room assignments by the school administration.",
      category: "academic",
      read: false,
      createdAt: "2026-10-16T09:15:00Z",
      priority: "normal",
      link: "/student/timetable",
    },
    {
      id: "notif-3",
      studentId: "usr-student-1",
      title: "Monthly Attendance Compliance: 92%",
      message: "Great job! Your September attendance recorded 92%, well above the school's 75% statutory requirement.",
      category: "attendance",
      read: true,
      createdAt: "2026-10-02T11:00:00Z",
      priority: "normal",
      link: "/student/attendance",
    },
    {
      id: "notif-4",
      title: "Annual State Science & Cultural Fair 2026",
      message: "Registrations are now open for Karnataka State Board inter-school robotics and science exhibition.",
      category: "announcement",
      read: false,
      createdAt: "2026-10-12T08:00:00Z",
      priority: "normal",
      link: "/student/announcements",
    },
  ];
};

const generateInitialAnnouncements = (): SchoolAnnouncement[] => {
  return [
    {
      id: "ann-1",
      title: "Karnataka Rajyotsava Celebration & Cultural Assembly",
      content: "The institution cordially invites all students to participate in the grand 69th Karnataka Rajyotsava commemoration. Traditional attire and cultural programs will take place on Friday in the Main Auditorium.",
      priority: "important",
      publishedBy: "Dr. Vikramaditya Sharma",
      publishedRole: "Principal & Head of Institution",
      publishDate: "2026-10-20",
      targetAudience: "All Students & Staff",
      category: "Cultural Event",
      attachmentName: "Rajyotsava_Circular_2026.pdf",
    },
    {
      id: "ann-2",
      title: "Terminal Assessment Hall Tickets & Code of Conduct",
      content: "All secondary students must collect physical hall tickets from their respective Class Teachers before October 28. Standard calculators and geometry boxes must comply with Board guidelines.",
      priority: "urgent",
      publishedBy: "Sri. Chandrashekar Gowda",
      publishedRole: "Controller of Examinations",
      publishDate: "2026-10-18",
      targetAudience: "Classes 6A to 10B",
      category: "Academic Assessment",
      attachmentName: "Exam_Hall_Rules_AY2026.pdf",
    },
    {
      id: "ann-3",
      title: "Science & Robotics Lab Upgradation",
      content: "State-of-the-art STEM equipment, 3D printers, and digital microscopes have been installed in Science Lab 1. Practical schedules commence next Monday.",
      priority: "normal",
      publishedBy: "Sri. Basavaraj Patil",
      publishedRole: "Head of Science Faculty",
      publishDate: "2026-10-10",
      targetAudience: "Middle & High School",
      category: "Facilities",
    },
  ];
};

// Generate Initial Teaching Assignments (Multiple Teachers per Class Scenario)
const generateInitialTeacherAssignments = (): TeacherAssignment[] => {
  return [
    // â”€â”€â”€ TEACHER A (usr-teacher-1): Smt. Shailaja Hegde â”€â”€â”€
    // Primary Class Teacher for 10A + Subject Teacher Mathematics for 8A
    {
      id: "asgn-ta-10a-ct",
      teacherId: "usr-teacher-1",
      academicYear: "2026-2027",
      classId: "cls-10",
      sectionId: "sec-10a",
      className: "Class 10",
      sectionName: "10A",
      assignmentType: "CLASS_TEACHER",
      isPrimary: true,
    },
    {
      id: "asgn-ta-8a-math",
      teacherId: "usr-teacher-1",
      academicYear: "2026-2027",
      classId: "cls-8",
      sectionId: "sec-8a",
      className: "Class 8",
      sectionName: "8A",
      assignmentType: "SUBJECT_TEACHER",
      subjectName: "Mathematics",
    },

    // â”€â”€â”€ TEACHER B (usr-teacher-2): Sri. Basavaraj Patil â”€â”€â”€
    // Subject Teacher: Mathematics across 10A, 10B, 9A, 9B
    {
      id: "asgn-tb-10a-math",
      teacherId: "usr-teacher-2",
      academicYear: "2026-2027",
      classId: "cls-10",
      sectionId: "sec-10a",
      className: "Class 10",
      sectionName: "10A",
      assignmentType: "SUBJECT_TEACHER",
      subjectName: "Mathematics",
    },
    {
      id: "asgn-tb-10b-math",
      teacherId: "usr-teacher-2",
      academicYear: "2026-2027",
      classId: "cls-10",
      sectionId: "sec-10b",
      className: "Class 10",
      sectionName: "10B",
      assignmentType: "SUBJECT_TEACHER",
      subjectName: "Mathematics",
    },
    {
      id: "asgn-tb-9a-math",
      teacherId: "usr-teacher-2",
      academicYear: "2026-2027",
      classId: "cls-9",
      sectionId: "sec-9a",
      className: "Class 9",
      sectionName: "9A",
      assignmentType: "SUBJECT_TEACHER",
      subjectName: "Mathematics",
    },
    {
      id: "asgn-tb-9b-math",
      teacherId: "usr-teacher-2",
      academicYear: "2026-2027",
      classId: "cls-9",
      sectionId: "sec-9b",
      className: "Class 9",
      sectionName: "9B",
      assignmentType: "SUBJECT_TEACHER",
      subjectName: "Mathematics",
    },

    // â”€â”€â”€ TEACHER C (usr-teacher-3): Dr. Ramesh Deshmukh â”€â”€â”€
    // Subject Teacher: Science across 10A, 10B
    {
      id: "asgn-tc-10a-sci",
      teacherId: "usr-teacher-3",
      academicYear: "2026-2027",
      classId: "cls-10",
      sectionId: "sec-10a",
      className: "Class 10",
      sectionName: "10A",
      assignmentType: "SUBJECT_TEACHER",
      subjectName: "Science",
    },
    {
      id: "asgn-tc-10b-sci",
      teacherId: "usr-teacher-3",
      academicYear: "2026-2027",
      classId: "cls-10",
      sectionId: "sec-10b",
      className: "Class 10",
      sectionName: "10B",
      assignmentType: "SUBJECT_TEACHER",
      subjectName: "Science",
    },

    // â”€â”€â”€ CLASS 6A FACULTY â”€â”€â”€
    {
      id: "asgn-t11-6a-ct",
      teacherId: "usr-teacher-11",
      academicYear: "2026-2027",
      classId: "cls-6",
      sectionId: "sec-6a",
      className: "Class 6",
      sectionName: "6A",
      assignmentType: "CLASS_TEACHER",
      isPrimary: true,
    },
    {
      id: "asgn-t11-6a-math",
      teacherId: "usr-teacher-11",
      academicYear: "2026-2027",
      classId: "cls-6",
      sectionId: "sec-6a",
      className: "Class 6",
      sectionName: "6A",
      assignmentType: "SUBJECT_TEACHER",
      subjectName: "Mathematics & Physics",
    },
  ];
};

// Generate Initial Study Materials (Targeted Multi-class Distribution)
const generateInitialStudyMaterials = (): StudyMaterial[] => {
  return [
    {
      id: "mat-1",
      title: "Quadratic Equations â€” Formulas & Derivations",
      description: "Comprehensive formula sheet, roots of equations, discriminant rules, and textbook solved exercises.",
      subject: "Mathematics",
      teacherId: "usr-teacher-2",
      teacherName: "Teacher B (Sri. Basavaraj Patil)",
      targetSectionIds: ["sec-10a"],
      targetSectionCodes: ["10A"],
      fileName: "Quadratic-Equations.pdf",
      fileSize: "2.4 MB",
      fileType: "application/pdf",
      academicYear: "2026-2027",
      createdAt: "2026-10-15T09:30:00Z",
      downloadUrl: "#",
    },
    {
      id: "mat-2",
      title: "Coordinate Geometry & Graphing Practice",
      description: "Section formula, distance formula, and step-by-step Cartesian plot problem sets.",
      subject: "Mathematics",
      teacherId: "usr-teacher-2",
      teacherName: "Teacher B (Sri. Basavaraj Patil)",
      targetSectionIds: ["sec-10a", "sec-10b"],
      targetSectionCodes: ["10A", "10B"],
      fileName: "Coordinate_Geometry_Ch7.pdf",
      fileSize: "3.8 MB",
      fileType: "application/pdf",
      academicYear: "2026-2027",
      createdAt: "2026-10-18T11:00:00Z",
      downloadUrl: "#",
    },
    {
      id: "mat-3",
      title: "Chemical Reactions & Catalysis Revision Notes",
      description: "Redox reaction mechanisms, balancing stoichiometric equations, and lab safety protocols.",
      subject: "Science",
      teacherId: "usr-teacher-3",
      teacherName: "Teacher C (Dr. Ramesh Deshmukh)",
      targetSectionIds: ["sec-10a", "sec-10b"],
      targetSectionCodes: ["10A", "10B"],
      fileName: "Chemical_Reactions_Revision.pdf",
      fileSize: "4.1 MB",
      fileType: "application/pdf",
      academicYear: "2026-2027",
      createdAt: "2026-10-16T14:00:00Z",
      downloadUrl: "#",
    },
  ];
};

// Generate Initial Assignments & Submissions
const generateInitialAssignments = (): Assignment[] => {
  return [
    {
      id: "asg-1",
      title: "Mathematics Problem Set: Quadratic Roots",
      description: "Complete problems 1 to 20 from Chapter 4. Show complete step-by-step factorization and quadratic formula methods.",
      subject: "Mathematics",
      teacherId: "usr-teacher-2",
      teacherName: "Teacher B (Sri. Basavaraj Patil)",
      targetSectionIds: ["sec-10a", "sec-10b"],
      targetSectionCodes: ["10A", "10B"],
      dueDate: "2026-10-28",
      totalMarks: 25,
      academicYear: "2026-2027",
      createdAt: "2026-10-18T10:00:00Z",
      attachmentName: "Quadratic_Problem_Set.pdf",
    },
    {
      id: "asg-2",
      title: "Science Lab Observation: Acid-Base Indicators",
      description: "Submit laboratory writeup on pH changes using litmus and phenolphthalein indicators.",
      subject: "Science",
      teacherId: "usr-teacher-3",
      teacherName: "Teacher C (Dr. Ramesh Deshmukh)",
      targetSectionIds: ["sec-10a"],
      targetSectionCodes: ["10A"],
      dueDate: "2026-10-30",
      totalMarks: 20,
      academicYear: "2026-2027",
      createdAt: "2026-10-19T14:30:00Z",
      attachmentName: "Acid_Base_Lab_Format.pdf",
    },
  ];
};

const generateInitialSubmissions = (): AssignmentSubmission[] => {
  return [
    {
      id: "subm-1",
      assignmentId: "asg-1",
      studentId: "usr-student-7",
      studentName: "Giridhar Bhat",
      sectionId: "sec-10a",
      sectionCode: "10A",
      submittedAt: "2026-10-22T14:20:00Z",
      status: "GRADED",
      obtainedMarks: 24,
      feedback: "Accurate problem solving and clear step-by-step logic.",
    },
    {
      id: "subm-2",
      assignmentId: "asg-1",
      studentId: "usr-student-8",
      studentName: "Harshitha Reddy",
      sectionId: "sec-10a",
      sectionCode: "10A",
      submittedAt: "2026-10-23T09:15:00Z",
      status: "SUBMITTED",
    },
    {
      id: "subm-3",
      assignmentId: "asg-1",
      studentId: "usr-student-9",
      studentName: "Ishwar S. Hiremath",
      sectionId: "sec-10a",
      sectionCode: "10A",
      submittedAt: "2026-10-24T08:00:00Z",
      status: "LATE",
    },
    {
      id: "subm-4",
      assignmentId: "asg-1",
      studentId: "usr-student-15",
      studentName: "Omkar P. Joshi",
      sectionId: "sec-10b",
      sectionCode: "10B",
      submittedAt: "2026-10-23T11:45:00Z",
      status: "SUBMITTED",
    },
  ];
};

// Generate Initial Teacher Audit Logs
const generateInitialAuditLogs = (): TeacherAuditLog[] => {
  return [
    {
      id: "aud-seed-1",
      teacherId: "usr-teacher-1",
      teacherName: "Teacher A (Smt. Shailaja Hegde)",
      action: "ATTENDANCE_MARKED",
      targetType: "SECTION",
      targetId: "sec-10a",
      details: "Published daily roll-call attendance for Class 10A (8 students).",
      timestamp: "2026-10-23T09:00:00Z",
    },
    {
      id: "aud-seed-2",
      teacherId: "usr-teacher-2",
      teacherName: "Teacher B (Sri. Basavaraj Patil)",
      action: "STUDY_MATERIAL_UPLOADED",
      targetType: "MATERIAL",
      targetId: "mat-1",
      details: "Uploaded 'Quadratic Equations' targeting Class 10A.",
      timestamp: "2026-10-15T09:30:00Z",
    },
    {
      id: "aud-seed-3",
      teacherId: "usr-teacher-2",
      teacherName: "Teacher B (Sri. Basavaraj Patil)",
      action: "ASSIGNMENT_CREATED",
      targetType: "ASSIGNMENT",
      targetId: "asg-1",
      details: "Created assignment 'Mathematics Problem Set: Quadratic Roots' targeting [10A, 10B].",
      timestamp: "2026-10-18T10:00:00Z",
    },
  ];
};

// Initial Pre-seeding: Clean Production Defaults (No hardcoded credentials)
const generateInitialData = () => {
  return {
    users: [],
    sections: [],
    timetables: [],
    attendance: {},
    examMarks: [],
    notifications: [],
    announcements: [],
    attendanceThreshold: 75,
    teacherAssignments: [],
    studyMaterials: [],
    assignments: [],
    submissions: [],
    teacherAuditLogs: [],
  };
};

export function SMSStoreProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [users, setUsers] = React.useState<StoredUser[]>([]);
  const [sections, setSections] = React.useState<SectionEntity[]>([]);
  const [timetables, setTimetables] = React.useState<SectionTimetable[]>([]);
  const [attendance, setAttendance] = React.useState<Record<string, AttendanceRecord>>({});
  const [examMarks, setExamMarks] = React.useState<StudentExamMark[]>([]);
  const [notifications, setNotifications] = React.useState<StudentNotification[]>([]);
  const [announcements, setAnnouncements] = React.useState<SchoolAnnouncement[]>([]);
  const [attendanceThreshold, setAttendanceThresholdState] = React.useState<number>(75);

  // Teacher Portal Extended Collections
  const [teacherAssignments, setTeacherAssignments] = React.useState<TeacherAssignment[]>([]);
  const [studyMaterials, setStudyMaterials] = React.useState<StudyMaterial[]>([]);
  const [assignments, setAssignments] = React.useState<Assignment[]>([]);
  const [submissions, setSubmissions] = React.useState<AssignmentSubmission[]>([]);
  const [teacherAuditLogs, setTeacherAuditLogs] = React.useState<TeacherAuditLog[]>([]);

  // Hydrate from localStorage
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setUsers(parsed.users || []);
        setSections(parsed.sections || []);
        setTimetables(parsed.timetables || []);
        setAttendance(parsed.attendance || {});
        setExamMarks(parsed.examMarks || []);
        setNotifications(parsed.notifications || []);
        setAnnouncements(parsed.announcements || []);
        setAttendanceThresholdState(parsed.attendanceThreshold || 75);
        setTeacherAssignments(parsed.teacherAssignments || []);
        setStudyMaterials(parsed.studyMaterials || []);
        setAssignments(parsed.assignments || []);
        setSubmissions(parsed.submissions || []);
        setTeacherAuditLogs(parsed.teacherAuditLogs || []);
      } else {
        const initial = generateInitialData();
        setUsers(initial.users);
        setSections(initial.sections);
        setTimetables(initial.timetables);
        setAttendance(initial.attendance);
        setExamMarks(initial.examMarks);
        setNotifications(initial.notifications);
        setAnnouncements(initial.announcements);
        setAttendanceThresholdState(initial.attendanceThreshold);
        setTeacherAssignments(initial.teacherAssignments);
        setStudyMaterials(initial.studyMaterials);
        setAssignments(initial.assignments);
        setSubmissions(initial.submissions);
        setTeacherAuditLogs(initial.teacherAuditLogs);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      }
    } catch (e) {
      console.error("SMS Store hydration error:", e);
      const initial = generateInitialData();
      setUsers(initial.users);
      setSections(initial.sections);
      setTimetables(initial.timetables);
      setAttendance(initial.attendance);
      setExamMarks(initial.examMarks);
      setNotifications(initial.notifications);
      setAnnouncements(initial.announcements);
      setAttendanceThresholdState(initial.attendanceThreshold);
      setTeacherAssignments(initial.teacherAssignments);
      setStudyMaterials(initial.studyMaterials);
      setAssignments(initial.assignments);
      setSubmissions(initial.submissions);
      setTeacherAuditLogs(initial.teacherAuditLogs);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Sync to localStorage
  const saveState = (
    nextUsers: StoredUser[],
    nextSections: SectionEntity[],
    nextTimetables: SectionTimetable[],
    nextAttendance: Record<string, AttendanceRecord>,
    nextMarks: StudentExamMark[] = examMarks,
    nextNotifs: StudentNotification[] = notifications,
    nextAnnouncements: SchoolAnnouncement[] = announcements,
    nextThreshold: number = attendanceThreshold,
    nextAssignments: TeacherAssignment[] = teacherAssignments,
    nextMaterials: StudyMaterial[] = studyMaterials,
    nextHw: Assignment[] = assignments,
    nextSubs: AssignmentSubmission[] = submissions,
    nextAudits: TeacherAuditLog[] = teacherAuditLogs
  ) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          users: nextUsers,
          sections: nextSections,
          timetables: nextTimetables,
          attendance: nextAttendance,
          examMarks: nextMarks,
          notifications: nextNotifs,
          announcements: nextAnnouncements,
          attendanceThreshold: nextThreshold,
          teacherAssignments: nextAssignments,
          studyMaterials: nextMaterials,
          assignments: nextHw,
          submissions: nextSubs,
          teacherAuditLogs: nextAudits,
        })
      );
    } catch (e) {
      console.error("SMS Store save error:", e);
    }
  };


  // TEACHER CRUD
  const teachers = React.useMemo(() => users.filter((u) => u.userType === "teacher"), [users]);

  const enrollPrincipal = (
    principalData: Omit<StoredUser, "id" | "userType" | "active" | "createdAt"> & { password: string }
  ): StoredUser => {
    const newId = `usr-principal-${Date.now()}`;
    const newPrincipal: StoredUser = {
      ...principalData,
      id: newId,
      userType: "principal",
      password: principalData.password,
      mustChangePassword: true,
      active: true,
      state: KARNATAKA_STATE,
      code: `EDP/PRIN/${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString(),
    };
    const nextUsers = [newPrincipal, ...users];
    setUsers(nextUsers);
    saveState(nextUsers, sections, timetables, attendance, examMarks, notifications, announcements, attendanceThreshold);
    return newPrincipal;
  };

  const handoverPrincipal = (
    successorData: Omit<StoredUser, "id" | "userType" | "active" | "createdAt"> & { password: string }
  ): StoredUser => {
    const existingUsers = users.map((u) =>
      u.userType === "principal" ? { ...u, active: false } : u
    );

    const existingIdx = existingUsers.findIndex(
      (u) => u.email.toLowerCase() === successorData.email.toLowerCase()
    );

    let activePrincipalUser: StoredUser;
    let nextUsers: StoredUser[];

    if (existingIdx >= 0) {
      activePrincipalUser = {
        ...existingUsers[existingIdx],
        ...successorData,
        userType: "principal",
        active: true,
        mustChangePassword: true,
      };
      nextUsers = [...existingUsers];
      nextUsers[existingIdx] = activePrincipalUser;
    } else {
      const newId = `usr-principal-${Date.now()}`;
      activePrincipalUser = {
        ...successorData,
        id: newId,
        userType: "principal",
        password: successorData.password,
        mustChangePassword: true,
        active: true,
        state: KARNATAKA_STATE,
        code: `EDP/PRIN/${Math.floor(100 + Math.random() * 900)}`,
        createdAt: new Date().toISOString(),
      };
      nextUsers = [activePrincipalUser, ...existingUsers];
    }

    setUsers(nextUsers);
    saveState(nextUsers, sections, timetables, attendance, examMarks, notifications, announcements, attendanceThreshold);
    return activePrincipalUser;
  };

  const enrollStudent = (
    studentData: Omit<StoredUser, "id" | "userType" | "active" | "createdAt">
  ): StoredUser => {
    const newId = `usr-student-${Date.now()}`;
    const cleanMobile = (studentData.phone || "").replace(/\D/g, "");
    const mobile10 = cleanMobile.slice(-10);
    const dobNormalized = normalizeDobDDMMYYYY(studentData.dob || "");
    const newStudent: StoredUser = {
      ...studentData,
      id: newId,
      username: mobile10 || studentData.username,
      phone: mobile10 || studentData.phone,
      password: dobNormalized,
      userType: "student",
      mustChangePassword: false,
      active: true,
      state: KARNATAKA_STATE,
      code: studentData.code || `EDP/STU/${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString(),
    };
    const nextUsers = [newStudent, ...users];
    setUsers(nextUsers);
    saveState(nextUsers, sections, timetables, attendance, examMarks, notifications, announcements, attendanceThreshold);
    return newStudent;
  };

  const enrollTeacher = (
    teacherData: Omit<StoredUser, "id" | "userType" | "mustChangePassword" | "active" | "createdAt">
  ): StoredUser => {
    const newId = `usr-teacher-${Date.now()}`;
    const autoPassword = teacherData.password || generateTeacherPassword(teacherData.name);
    const newTeacher: StoredUser = {
      ...teacherData,
      id: newId,
      userType: "teacher",
      password: autoPassword,
      mustChangePassword: true,
      active: true,
      state: KARNATAKA_STATE,
      code: `TCH/KA/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString(),
    };

    const nextUsers = [newTeacher, ...users];
    setUsers(nextUsers);
    saveState(nextUsers, sections, timetables, attendance, examMarks, notifications, announcements, attendanceThreshold);
    return newTeacher;
  };

  const updateTeacher = (id: string, updates: Partial<StoredUser>) => {
    const nextUsers = users.map((u) => (u.id === id ? { ...u, ...updates, state: KARNATAKA_STATE } : u));
    setUsers(nextUsers);
    saveState(nextUsers, sections, timetables, attendance, examMarks, notifications, announcements, attendanceThreshold);
  };

  const toggleUserStatus = (id: string) => {
    const nextUsers = users.map((u) => (u.id === id ? { ...u, active: !u.active } : u));
    setUsers(nextUsers);
    saveState(nextUsers, sections, timetables, attendance, examMarks, notifications, announcements, attendanceThreshold);
  };

  const deleteTeacher = (id: string): { success: boolean; error?: string } => {
    const assignedSec = sections.find((s) => s.classTeacherId === id);
    if (assignedSec) {
      return {
        success: false,
        error: `Cannot delete: Teacher is currently assigned as Class Teacher for ${assignedSec.className} (${assignedSec.code}). Please reassign the class teacher first.`,
      };
    }

    const nextUsers = users.filter((u) => u.id !== id);
    setUsers(nextUsers);
    saveState(nextUsers, sections, timetables, attendance, examMarks, notifications, announcements, attendanceThreshold);
    return { success: true };
  };

  const resetUserPassword = (id: string, defaultPass: string) => {
    const nextUsers = users.map((u) =>
      u.id === id ? { ...u, password: defaultPass, mustChangePassword: true } : u
    );
    setUsers(nextUsers);
    saveState(nextUsers, sections, timetables, attendance, examMarks, notifications, announcements, attendanceThreshold);
  };

  // 1:1 CLASS TEACHER ASSIGNMENT
  const assignClassTeacher = (sectionId: string, teacherId: string): { success: boolean; message?: string } => {
    if (!teacherId) {
      const nextSections = sections.map((s) => (s.id === sectionId ? { ...s, classTeacherId: undefined } : s));
      setSections(nextSections);
      saveState(users, nextSections, timetables, attendance, examMarks, notifications, announcements, attendanceThreshold);
      return { success: true, message: "Class Teacher unassigned." };
    }

    const existingSection = sections.find((s) => s.classTeacherId === teacherId && s.id !== sectionId);
    if (existingSection) {
      return {
        success: false,
        message: `Teacher is already assigned as Class Teacher for ${existingSection.className} (${existingSection.code}). Reassign or unassign from ${existingSection.code} first.`,
      };
    }

    const nextSections = sections.map((s) => (s.id === sectionId ? { ...s, classTeacherId: teacherId } : s));
    const targetSec = nextSections.find((s) => s.id === sectionId);
    const ctLabel = targetSec ? `${targetSec.className} (${targetSec.code})` : undefined;
    const nextUsers = users.map((u) => (u.id === teacherId ? { ...u, assignedClassTeacher: ctLabel } : u));
    setSections(nextSections);
    setUsers(nextUsers);
    saveState(nextUsers, nextSections, timetables, attendance, examMarks, notifications, announcements, attendanceThreshold);
    return { success: true, message: "Class Teacher successfully assigned." };
  };

  const getAssignedClassTeacher = (sectionId: string): StoredUser | undefined => {
    const sec = sections.find((s) => s.id === sectionId);
    if (!sec || !sec.classTeacherId) return undefined;
    return teachers.find((t) => t.id === sec.classTeacherId);
  };

  const getTeacherAssignedSection = (teacherId: string): SectionEntity | undefined => {
    return sections.find((s) => s.classTeacherId === teacherId);
  };

  // â”€â”€â”€ TEACHER ASSIGNMENT & ROLE-BASED ACCESS CONTROL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const assignSubjectTeacher = (
    teacherId: string,
    sectionId: string,
    subjectName: string,
    academicYear: string = "2026-2027"
  ): { success: boolean; message?: string } => {
    const sec = sections.find((s) => s.id === sectionId);
    if (!sec) return { success: false, message: "Invalid class section." };

    const duplicate = teacherAssignments.find(
      (a) =>
        a.teacherId === teacherId &&
        a.sectionId === sectionId &&
        a.subjectName?.toLowerCase() === subjectName.toLowerCase() &&
        a.academicYear === academicYear
    );
    if (duplicate) {
      return { success: false, message: `Teacher is already assigned to ${subjectName} for ${sec.code}.` };
    }

    const newAssignment: TeacherAssignment = {
      id: `asgn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      teacherId,
      academicYear,
      classId: sec.classId,
      sectionId: sec.id,
      className: sec.className,
      sectionName: sec.code,
      assignmentType: "SUBJECT_TEACHER",
      subjectName,
    };

    const nextAssignments = [newAssignment, ...teacherAssignments];
    setTeacherAssignments(nextAssignments);
    saveState(
      users,
      sections,
      timetables,
      attendance,
      examMarks,
      notifications,
      announcements,
      attendanceThreshold,
      nextAssignments,
      studyMaterials,
      assignments,
      submissions,
      teacherAuditLogs
    );
    return { success: true, message: `Successfully assigned ${subjectName} in ${sec.code}.` };
  };

  const removeSubjectTeacher = (assignmentId: string) => {
    const nextAssignments = teacherAssignments.filter((a) => a.id !== assignmentId);
    setTeacherAssignments(nextAssignments);
    saveState(
      users,
      sections,
      timetables,
      attendance,
      examMarks,
      notifications,
      announcements,
      attendanceThreshold,
      nextAssignments,
      studyMaterials,
      assignments,
      submissions,
      teacherAuditLogs
    );
  };

  const getTeacherAssignments = (teacherId: string): TeacherAssignment[] => {
    const list = teacherAssignments.filter((a) => a.teacherId === teacherId);
    // Ensure primary Class Teacher mapping is included if designated
    const classSec = sections.find((s) => s.classTeacherId === teacherId);
    if (classSec && !list.some((a) => a.sectionId === classSec.id && a.assignmentType === "CLASS_TEACHER")) {
      list.unshift({
        id: `ct-${classSec.id}-${teacherId}`,
        teacherId,
        academicYear: "2026-2027",
        classId: classSec.classId,
        sectionId: classSec.id,
        className: classSec.className,
        sectionName: classSec.code,
        assignmentType: "CLASS_TEACHER",
        isPrimary: true,
      });
    }
    return list;
  };

  const getTeacherAssignedSections = (teacherId: string): SectionEntity[] => {
    const asgns = getTeacherAssignments(teacherId);
    const secIds = new Set(asgns.map((a) => a.sectionId));
    return sections.filter((s) => secIds.has(s.id));
  };

  const getTeacherAssignedSubjects = (teacherId: string): string[] => {
    const asgns = getTeacherAssignments(teacherId);
    const subjects = new Set<string>();
    asgns.forEach((a) => {
      if (a.subjectName) subjects.add(a.subjectName);
    });
    return Array.from(subjects);
  };

  const isClassTeacherForSection = (teacherId: string, sectionId: string): boolean => {
    const sec = sections.find((s) => s.id === sectionId);
    return sec?.classTeacherId === teacherId;
  };

  const isSubjectTeacherForSection = (teacherId: string, sectionId: string, subjectName?: string): boolean => {
    const asgns = getTeacherAssignments(teacherId);
    return asgns.some(
      (a) =>
        a.sectionId === sectionId &&
        (subjectName ? a.subjectName?.toLowerCase() === subjectName.toLowerCase() : true)
    );
  };

  const isAuthorizedForSection = (teacherId: string, sectionId: string): boolean => {
    return isClassTeacherForSection(teacherId, sectionId) || isSubjectTeacherForSection(teacherId, sectionId);
  };

  const recordTeacherAudit = (log: Omit<TeacherAuditLog, "id" | "timestamp">) => {
    const newLog: TeacherAuditLog = {
      ...log,
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    const nextLogs = [newLog, ...teacherAuditLogs];
    setTeacherAuditLogs(nextLogs);
    saveState(
      users,
      sections,
      timetables,
      attendance,
      examMarks,
      notifications,
      announcements,
      attendanceThreshold,
      teacherAssignments,
      studyMaterials,
      assignments,
      submissions,
      nextLogs
    );
  };

  // â”€â”€â”€ STUDY MATERIALS WORKFLOW (TARGETED CLASSES) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const uploadStudyMaterial = (
    materialData: Omit<StudyMaterial, "id" | "createdAt">
  ): { success: boolean; data?: StudyMaterial; error?: string } => {
    // Server/store validation: teacher must be authorized for all selected target classes
    for (const sId of materialData.targetSectionIds) {
      if (!isAuthorizedForSection(materialData.teacherId, sId)) {
        return {
          success: false,
          error: `Unauthorized: You are not assigned to target class arm (${sId}).`,
        };
      }
    }

    const newMat: StudyMaterial = {
      ...materialData,
      id: `mat-${Date.now()}`,
      createdAt: new Date().toISOString(),
      downloadUrl: materialData.downloadUrl || "#",
    };

    const nextMaterials = [newMat, ...studyMaterials];
    setStudyMaterials(nextMaterials);
    recordTeacherAudit({
      teacherId: materialData.teacherId,
      teacherName: materialData.teacherName,
      action: "STUDY_MATERIAL_UPLOADED",
      targetType: "MATERIAL",
      targetId: newMat.id,
      details: `Uploaded study material "${materialData.title}" (${materialData.fileName}) targeting [${materialData.targetSectionCodes.join(", ")}]`,
    });
    saveState(
      users,
      sections,
      timetables,
      attendance,
      examMarks,
      notifications,
      announcements,
      attendanceThreshold,
      teacherAssignments,
      nextMaterials,
      assignments,
      submissions,
      teacherAuditLogs
    );
    return { success: true, data: newMat };
  };

  const deleteStudyMaterial = (id: string, teacherId: string): { success: boolean; error?: string } => {
    const mat = studyMaterials.find((m) => m.id === id);
    if (!mat) return { success: false, error: "Material not found." };
    if (mat.teacherId !== teacherId) {
      return { success: false, error: "Unauthorized: You can only delete materials uploaded by yourself." };
    }
    const nextMaterials = studyMaterials.filter((m) => m.id !== id);
    setStudyMaterials(nextMaterials);
    saveState(
      users,
      sections,
      timetables,
      attendance,
      examMarks,
      notifications,
      announcements,
      attendanceThreshold,
      teacherAssignments,
      nextMaterials,
      assignments,
      submissions,
      teacherAuditLogs
    );
    return { success: true };
  };

  const getMaterialsForStudent = (sectionId: string): StudyMaterial[] => {
    return studyMaterials.filter((m) => m.targetSectionIds.includes(sectionId));
  };

  const getMaterialsForTeacher = (teacherId: string): StudyMaterial[] => {
    return studyMaterials.filter((m) => m.teacherId === teacherId);
  };

  // â”€â”€â”€ ASSIGNMENTS & HOMEWORK WORKFLOW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const createAssignment = (
    data: Omit<Assignment, "id" | "createdAt">
  ): { success: boolean; data?: Assignment; error?: string } => {
    for (const sId of data.targetSectionIds) {
      if (!isAuthorizedForSection(data.teacherId, sId)) {
        return { success: false, error: `Unauthorized: You do not teach target class arm ${sId}.` };
      }
    }
    const newAsg: Assignment = {
      ...data,
      id: `asg-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const nextAssignments = [newAsg, ...assignments];
    setAssignments(nextAssignments);
    recordTeacherAudit({
      teacherId: data.teacherId,
      teacherName: data.teacherName,
      action: "ASSIGNMENT_CREATED",
      targetType: "ASSIGNMENT",
      targetId: newAsg.id,
      details: `Created assignment "${data.title}" (${data.subject}) due ${data.dueDate} for [${data.targetSectionCodes.join(", ")}]`,
    });
    saveState(
      users,
      sections,
      timetables,
      attendance,
      examMarks,
      notifications,
      announcements,
      attendanceThreshold,
      teacherAssignments,
      studyMaterials,
      nextAssignments,
      submissions,
      teacherAuditLogs
    );
    return { success: true, data: newAsg };
  };

  const getAssignmentsForTeacher = (teacherId: string): Assignment[] => {
    return assignments.filter((a) => a.teacherId === teacherId);
  };

  const getAssignmentsForStudent = (sectionId: string): Assignment[] => {
    return assignments.filter((a) => a.targetSectionIds.includes(sectionId));
  };

  const getSubmissionsForAssignment = (assignmentId: string): AssignmentSubmission[] => {
    return submissions.filter((s) => s.assignmentId === assignmentId);
  };

  const gradeSubmission = (submissionId: string, marks: number, feedback?: string) => {
    const nextSubs = submissions.map((s) =>
      s.id === submissionId
        ? {
            ...s,
            obtainedMarks: marks,
            feedback,
            status: "GRADED" as SubmissionStatus,
          }
        : s
    );
    setSubmissions(nextSubs);
    saveState(
      users,
      sections,
      timetables,
      attendance,
      examMarks,
      notifications,
      announcements,
      attendanceThreshold,
      teacherAssignments,
      studyMaterials,
      assignments,
      nextSubs,
      teacherAuditLogs
    );
  };

  // â”€â”€â”€ EXAMINATION MARKS WORKFLOW (VALIDATION & LOCKING) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const saveExamMarkDraft = (mark: Omit<StudentExamMark, "id" | "publishedAt">) => {
    const existingIdx = examMarks.findIndex(
      (m) =>
        m.studentId === mark.studentId &&
        m.academicYear === mark.academicYear &&
        m.examName === mark.examName &&
        m.subject.toLowerCase() === mark.subject.toLowerCase()
    );

    const fullMark: StudentExamMark = {
      ...mark,
      id: existingIdx >= 0 ? examMarks[existingIdx].id : `mark-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      publishedAt: new Date().toISOString(),
    };

    const nextMarks = [...examMarks];
    if (existingIdx >= 0) {
      nextMarks[existingIdx] = fullMark;
    } else {
      nextMarks.push(fullMark);
    }

    setExamMarks(nextMarks);
    saveState(
      users,
      sections,
      timetables,
      attendance,
      nextMarks,
      notifications,
      announcements,
      attendanceThreshold,
      teacherAssignments,
      studyMaterials,
      assignments,
      submissions,
      teacherAuditLogs
    );
  };

  const submitExamMarks = (
    marksToSave: StudentExamMark[],
    teacherId: string
  ): { success: boolean; error?: string } => {
    const nextMarks = [...examMarks];
    marksToSave.forEach((newMark) => {
      const idx = nextMarks.findIndex((m) => m.id === newMark.id);
      if (idx >= 0) {
        nextMarks[idx] = newMark;
      } else {
        nextMarks.push(newMark);
      }
    });

    setExamMarks(nextMarks);
    recordTeacherAudit({
      teacherId,
      teacherName: teachers.find((t) => t.id === teacherId)?.name || "Teacher",
      action: "MARKS_SUBMITTED",
      targetType: "EXAM_MARKS",
      details: `Submitted and locked terminal marks for ${marksToSave.length} students.`,
    });

    saveState(
      users,
      sections,
      timetables,
      attendance,
      nextMarks,
      notifications,
      announcements,
      attendanceThreshold,
      teacherAssignments,
      studyMaterials,
      assignments,
      submissions,
      teacherAuditLogs
    );
    return { success: true };
  };

  // STUDENT CRUD
  const students = React.useMemo(() => users.filter((u) => u.userType === "student"), [users]);

  const getStudentsBySection = (sectionId: string): StoredUser[] => {
    return students.filter((s) => s.classSectionId === sectionId);
  };

  const enrollStudentToSection = (
    sectionId: string,
    studentData: Omit<StoredUser, "id" | "userType" | "classSectionId" | "mustChangePassword" | "active" | "createdAt">
  ): StoredUser => {
    const newId = `usr-student-${Date.now()}`;
    const newStudent: StoredUser = {
      ...studentData,
      id: newId,
      userType: "student",
      classSectionId: sectionId,
      password: "student@123",
      mustChangePassword: true,
      active: true,
      state: KARNATAKA_STATE,
      code: `STD/KA/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
    };

    const nextUsers = [newStudent, ...users];
    setUsers(nextUsers);
    saveState(nextUsers, sections, timetables, attendance, examMarks, notifications, announcements, attendanceThreshold);
    return newStudent;
  };

  const updateStudent = (id: string, updates: Partial<StoredUser>) => {
    const nextUsers = users.map((u) => (u.id === id ? { ...u, ...updates, state: KARNATAKA_STATE } : u));
    setUsers(nextUsers);
    saveState(nextUsers, sections, timetables, attendance, examMarks, notifications, announcements, attendanceThreshold);
  };

  const deleteStudent = (id: string) => {
    const nextUsers = users.filter((u) => u.id !== id);
    setUsers(nextUsers);
    saveState(nextUsers, sections, timetables, attendance, examMarks, notifications, announcements, attendanceThreshold);
  };

  // TIMETABLES
  const getTimetableBySection = (sectionId: string): SectionTimetable => {
    const found = timetables.find((t) => t.sectionId === sectionId);
    if (found) return found;

    const sec = sections.find((s) => s.id === sectionId);
    const days: WeekDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const schedule: Record<WeekDay, CustomTimeSlot[]> = {} as any;
    days.forEach((day) => {
      schedule[day] = [...DEFAULT_BELL_SCHEDULE];
    });

    const newTT: SectionTimetable = {
      sectionId,
      sectionName: sec?.code || sectionId,
      isPublished: false,
      schedule,
    };
    return newTT;
  };

  const saveTimetableSchedule = (sectionId: string, day: WeekDay, slots: CustomTimeSlot[]) => {
    const sec = sections.find((s) => s.id === sectionId);
    let updated = false;

    const nextTimetables = timetables.map((tt) => {
      if (tt.sectionId === sectionId) {
        updated = true;
        return {
          ...tt,
          schedule: {
            ...tt.schedule,
            [day]: slots,
          },
        };
      }
      return tt;
    });

    if (!updated) {
      const days: WeekDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const schedule: Record<WeekDay, CustomTimeSlot[]> = {} as any;
      days.forEach((d) => {
        schedule[d] = d === day ? slots : [...DEFAULT_BELL_SCHEDULE];
      });
      nextTimetables.push({
        sectionId,
        sectionName: sec?.code || sectionId,
        isPublished: false,
        schedule,
      });
    }

    setTimetables(nextTimetables);
    saveState(users, sections, nextTimetables, attendance, examMarks, notifications, announcements, attendanceThreshold);
  };

  const publishTimetable = (sectionId: string, isPublished: boolean) => {
    const nextTimetables = timetables.map((tt) =>
      tt.sectionId === sectionId ? { ...tt, isPublished } : tt
    );
    setTimetables(nextTimetables);
    saveState(users, sections, nextTimetables, attendance, examMarks, notifications, announcements, attendanceThreshold);
  };

  const applyBellScheduleTemplate = (sectionId: string, day?: WeekDay) => {
    const days: WeekDay[] = day
      ? [day]
      : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const tt = getTimetableBySection(sectionId);
    const updatedSchedule = { ...tt.schedule };

    days.forEach((d) => {
      const currentSlots = updatedSchedule[d] || [];
      updatedSchedule[d] = DEFAULT_BELL_SCHEDULE.map((tpl, idx) => {
        const existing = currentSlots[idx];
        return {
          ...tpl,
          id: `${sectionId}-${d.toLowerCase()}-${idx}`,
          subject: existing?.subject || tpl.subject,
          room: existing?.room || tpl.room,
          teacherId: existing?.teacherId || (tpl.type === "PERIOD" ? teachers[idx % teachers.length]?.id : undefined),
        };
      });
    });

    const nextTimetables = timetables.map((t) =>
      t.sectionId === sectionId ? { ...t, schedule: updatedSchedule } : t
    );
    setTimetables(nextTimetables);
    saveState(users, sections, nextTimetables, attendance, examMarks, notifications, announcements, attendanceThreshold);
  };

  const applyMasterTemplateToAllSections = () => {
    const days: WeekDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const nextTimetables = sections.map((sec) => {
      const schedule: Record<WeekDay, CustomTimeSlot[]> = {} as any;
      days.forEach((day) => {
        schedule[day] = DEFAULT_BELL_SCHEDULE.map((slot, sIdx) => ({
          ...slot,
          id: `${sec.id}-${day.toLowerCase()}-${sIdx}`,
          room: slot.room || `Room ${sec.code}`,
          teacherId: slot.type === "PERIOD" ? teachers[(sIdx + parseInt(sec.code || "1")) % teachers.length]?.id : undefined,
        }));
      });
      return {
        sectionId: sec.id,
        sectionName: sec.code,
        isPublished: true,
        schedule,
      };
    });

    setTimetables(nextTimetables);
    saveState(users, sections, nextTimetables, attendance, examMarks, notifications, announcements, attendanceThreshold);
  };

  const checkTeacherConflict = (
    sectionId: string,
    day: WeekDay,
    start: string,
    end: string,
    teacherId: string
  ) => {
    return hasTeacherTimeConflict(timetables, sectionId, day, start, end, teacherId);
  };

  const getTeacherSchedule = (teacherId: string) => {
    const items: Array<{ sectionName: string; day: WeekDay; slot: CustomTimeSlot }> = [];
    timetables.forEach((tt) => {
      const days = Object.keys(tt.schedule) as WeekDay[];
      days.forEach((day) => {
        const slots = tt.schedule[day] || [];
        slots.forEach((slot) => {
          if (slot.type === "PERIOD" && slot.teacherId === teacherId) {
            items.push({
              sectionName: tt.sectionName,
              day,
              slot,
            });
          }
        });
      });
    });

    const dayOrder: Record<WeekDay, number> = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };
    items.sort((a, b) => {
      if (dayOrder[a.day] !== dayOrder[b.day]) return dayOrder[a.day] - dayOrder[b.day];
      return toMinutes(a.slot.startTime) - toMinutes(b.slot.startTime);
    });

    return items;
  };

  // ATTENDANCE
  const getSectionAttendance = (sectionId: string, date: string): AttendanceRecord => {
    return attendance[`${sectionId}_${date}`] || {};
  };

  const saveSectionAttendance = (sectionId: string, date: string, records: AttendanceRecord) => {
    const key = `${sectionId}_${date}`;
    const nextAttendance = { ...attendance, [key]: records };
    setAttendance(nextAttendance);
    saveState(users, sections, timetables, nextAttendance, examMarks, notifications, announcements, attendanceThreshold);
  };

  const setAttendanceThreshold = (threshold: number) => {
    setAttendanceThresholdState(threshold);
    saveState(users, sections, timetables, attendance, examMarks, notifications, announcements, threshold);
  };

  const getStudentAttendanceSummary = (
    studentId: string,
    sectionId: string = "sec-6a",
    _year?: string
  ): StudentAttendanceSummary => {
    const dayRecords: Record<string, AttendanceStatus> = {};
    const monthsMap: Record<string, { present: number; absent: number; late: number; total: number }> = {};

    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let totalWorkingDays = 0;

    // Iterate through attendance records matching section
    Object.entries(attendance).forEach(([key, rec]) => {
      if (key.startsWith(sectionId)) {
        const dateStr = key.replace(`${sectionId}_`, "");
        const status = rec[studentId];

        if (status) {
          totalWorkingDays++;
          dayRecords[dateStr] = status;

          const monthName = new Date(dateStr).toLocaleString("default", { month: "long" });
          if (!monthsMap[monthName]) {
            monthsMap[monthName] = { present: 0, absent: 0, late: 0, total: 0 };
          }
          monthsMap[monthName].total++;

          if (status === "PRESENT") {
            presentDays++;
            monthsMap[monthName].present++;
          } else if (status === "LATE") {
            lateDays++;
            monthsMap[monthName].late++;
            // Counting late as attended in Indian schools
            presentDays++;
          } else if (status === "ABSENT") {
            absentDays++;
            monthsMap[monthName].absent++;
          }
        }
      }
    });

    const overallPercentage = totalWorkingDays > 0 ? Math.round((presentDays / totalWorkingDays) * 100) : 0;

    // Monthly breakdown ordered by calendar progression
    const monthOrder = ["June", "July", "August", "September", "October", "November", "December", "January", "February", "March"];
    const monthlyBreakdown = monthOrder
      .filter((m) => Boolean(monthsMap[m]))
      .map((m) => {
        const data = monthsMap[m];
        const pct = data.total > 0 ? Math.round(((data.present + data.late) / data.total) * 100) : 0;
        return {
          month: m,
          percentage: pct,
          present: data.present,
          absent: data.absent,
          late: data.late,
          total: data.total,
        };
      });

    return {
      overallPercentage,
      presentDays,
      absentDays,
      lateDays,
      excusedDays: 0,
      totalWorkingDays,
      monthlyBreakdown,
      dayRecords,
      isBelowThreshold: overallPercentage < attendanceThreshold,
      threshold: attendanceThreshold,
    };
  };

  // EXAMINATIONS & MARKS
  const getStudentMarks = (studentId: string, year?: string, examName?: string): StudentExamMark[] => {
    return examMarks.filter((m) => {
      if (m.studentId !== studentId) return false;
      if (year && m.academicYear !== year) return false;
      if (examName && m.examName !== examName) return false;
      return true;
    });
  };

  const getStudentAcademicYears = (studentId: string): string[] => {
    const years = Array.from(new Set(examMarks.filter((m) => m.studentId === studentId).map((m) => m.academicYear)));
    if (years.length === 0) return ["2026-2027", "2025-2026", "2024-2025"];
    return years.sort().reverse();
  };

  const getStudentYearPerformance = (studentId: string) => {
    const years = getStudentAcademicYears(studentId);
    return years.map((yr) => {
      const marks = examMarks.filter((m) => m.studentId === studentId && m.academicYear === yr);
      if (marks.length === 0) {
        return {
          year: yr,
          percentage: 0,
          averageMarks: 0,
          totalMarks: 0,
          maxMarks: 0,
          examsCount: 0,
          grade: "N/A",
          subjectsCount: 0,
        };
      }

      const totalMarks = marks.reduce((sum, m) => sum + m.totalScore, 0);
      const maxMarks = marks.reduce((sum, m) => sum + m.maxScore, 0);
      const percentage = maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 0;
      const averageMarks = Math.round(totalMarks / marks.length);
      const examsCount = new Set(marks.map((m) => m.examName)).size;
      const subjectsCount = new Set(marks.map((m) => m.subject)).size;

      let grade = "B1";
      if (percentage >= 91) grade = "A1";
      else if (percentage >= 81) grade = "A2";
      else if (percentage >= 71) grade = "B1";
      else if (percentage >= 61) grade = "B2";
      else if (percentage >= 51) grade = "C1";
      else if (percentage >= 41) grade = "C2";
      else if (percentage >= 33) grade = "D";
      else grade = "E";

      return {
        year: yr,
        percentage,
        averageMarks,
        totalMarks,
        maxMarks,
        examsCount,
        grade,
        subjectsCount,
      };
    });
  };

  // NOTIFICATIONS
  const markNotificationAsRead = (id: string) => {
    const nextNotifs = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    setNotifications(nextNotifs);
    saveState(users, sections, timetables, attendance, examMarks, nextNotifs, announcements, attendanceThreshold);
  };

  const markAllNotificationsAsRead = (studentId?: string) => {
    const nextNotifs = notifications.map((n) => {
      if (!studentId || n.studentId === studentId || !n.studentId) {
        return { ...n, read: true };
      }
      return n;
    });
    setNotifications(nextNotifs);
    saveState(users, sections, timetables, attendance, examMarks, nextNotifs, announcements, attendanceThreshold);
  };

  // PASSWORD MANAGEMENT
  const changePassword = (userId: string, newPass: string) => {
    const nextUsers = users.map((u) =>
      u.id === userId ? { ...u, password: newPass, mustChangePassword: false } : u
    );
    setUsers(nextUsers);
    saveState(nextUsers, sections, timetables, attendance, examMarks, notifications, announcements, attendanceThreshold);
  };

  // RESET
  const resetStoreToDefaults = () => {
    const initial = generateInitialData();
    setUsers(initial.users);
    setSections(initial.sections);
    setTimetables(initial.timetables);
    setAttendance(initial.attendance);
    setExamMarks(initial.examMarks);
    setNotifications(initial.notifications);
    setAnnouncements(initial.announcements);
    setAttendanceThresholdState(initial.attendanceThreshold);
    setTeacherAssignments(initial.teacherAssignments);
    setStudyMaterials(initial.studyMaterials);
    setAssignments(initial.assignments);
    setSubmissions(initial.submissions);
    setTeacherAuditLogs(initial.teacherAuditLogs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  };

  return (
    <SMSStoreContext.Provider
      value={{
        users,
        sections,
        timetables,
        attendance,
        teachers,
        enrollPrincipal,
        handoverPrincipal,
        enrollTeacher,
        enrollStudent,
        updateTeacher,
        toggleUserStatus,
        deleteTeacher,
        resetUserPassword,
        assignClassTeacher,
        getAssignedClassTeacher,
        getTeacherAssignedSection,
        teacherAssignments,
        assignSubjectTeacher,
        removeSubjectTeacher,
        getTeacherAssignments,
        getTeacherAssignedSections,
        getTeacherAssignedSubjects,
        isClassTeacherForSection,
        isSubjectTeacherForSection,
        isAuthorizedForSection,
        studyMaterials,
        uploadStudyMaterial,
        deleteStudyMaterial,
        getMaterialsForStudent,
        getMaterialsForTeacher,
        assignments,
        submissions,
        createAssignment,
        getAssignmentsForTeacher,
        getAssignmentsForStudent,
        getSubmissionsForAssignment,
        gradeSubmission,
        saveExamMarkDraft,
        submitExamMarks,
        teacherAuditLogs,
        recordTeacherAudit,
        students,
        getStudentsBySection,
        enrollStudentToSection,
        updateStudent,
        deleteStudent,
        getTimetableBySection,
        saveTimetableSchedule,
        publishTimetable,
        applyBellScheduleTemplate,
        applyMasterTemplateToAllSections,
        checkTeacherConflict,
        getTeacherSchedule,
        getSectionAttendance,
        saveSectionAttendance,
        attendanceThreshold,
        setAttendanceThreshold,
        getStudentAttendanceSummary,
        examMarks,
        getStudentMarks,
        getStudentAcademicYears,
        getStudentYearPerformance,
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        announcements,
        changePassword,
        resetStoreToDefaults,
      }}
    >
      {isHydrated ? children : (
        <div className="min-h-screen bg-background flex items-center justify-center text-xs text-text-secondary">
          Initializing SMS State Store...
        </div>
      )}
    </SMSStoreContext.Provider>
  );
}

export function useSMSStore() {
  const context = React.useContext(SMSStoreContext);
  if (!context) {
    throw new Error("useSMSStore must be used within an SMSStoreProvider");
  }
  return context;
}
