import { NextRequest, NextResponse } from "next/server";
import { enforceStudentAccess } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { error, session } = await enforceStudentAccess(req);
  if (error) return error;

  const studentId = session!.userId;
  const url = new URL(req.url);

  // Data isolation check
  const requestedStudentId = url.searchParams.get("student_id");
  if (requestedStudentId && requestedStudentId !== studentId && session!.role === "student") {
    return NextResponse.json(
      { success: false, error: "Access Denied: You cannot view another student's attendance records." },
      { status: 403 }
    );
  }

  const attendanceData = {
    studentId,
    academicYear: "2026-2027",
    overallPercentage: 91.2,
    presentDays: 104,
    absentDays: 6,
    lateDays: 4,
    totalWorkingDays: 114,
    threshold: 75,
    isBelowThreshold: false,
    monthlyBreakdown: [
      { month: "June", percentage: 92, present: 22, absent: 2, late: 0, total: 24 },
      { month: "July", percentage: 94, present: 24, absent: 1, late: 1, total: 26 },
      { month: "August", percentage: 89, present: 21, absent: 2, late: 1, total: 24 },
      { month: "September", percentage: 92, present: 22, absent: 1, late: 1, total: 24 },
      { month: "October", percentage: 91, present: 15, absent: 0, late: 1, total: 16 },
    ],
  };

  return NextResponse.json({
    success: true,
    data: attendanceData,
  });
}
