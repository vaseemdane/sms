import { NextRequest, NextResponse } from "next/server";
import { enforceStudentAccess } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { error, session } = await enforceStudentAccess(req);
  if (error) return error;

  const studentId = session!.userId;
  const url = new URL(req.url);
  const requestedYear = url.searchParams.get("year") || "2026-2027";

  // Data isolation: user cannot supply another student's ID in params to bypass security
  const requestedStudentId = url.searchParams.get("student_id");
  if (requestedStudentId && requestedStudentId !== studentId && session!.role === "student") {
    return NextResponse.json(
      { success: false, error: "Access Denied: You cannot view another student's academic records." },
      { status: 403 }
    );
  }

  // Realistic performance payload for the authenticated student
  const performanceData = {
    studentId,
    academicYear: requestedYear,
    overallPercentage: requestedYear === "2026-2027" ? 86.5 : requestedYear === "2025-2026" ? 81.3 : 75.0,
    averageMarks: requestedYear === "2026-2027" ? 87 : requestedYear === "2025-2026" ? 81 : 75,
    grade: requestedYear === "2026-2027" ? "A2" : requestedYear === "2025-2026" ? "A2" : "B1",
    status: "Passed with Distinction",
    yearlyTrend: [
      { year: "2024–25", percentage: 75.0, average: 75 },
      { year: "2025–26", percentage: 81.3, average: 81 },
      { year: "2026–27", percentage: 86.5, average: 87 },
    ],
    growthDelta: requestedYear === "2026-2027" ? 5.2 : 6.3,
    insight: "Your overall performance has improved by 5.2% compared with the previous academic year.",
    subjects: [
      { name: "Mathematics", score: 88, max: 100, grade: "A2", status: "Distinction" },
      { name: "Science", score: 82, max: 100, grade: "A2", status: "Passed" },
      { name: "English Language", score: 90, max: 100, grade: "A2", status: "Distinction" },
      { name: "Kannada", score: 89, max: 100, grade: "A2", status: "Distinction" },
      { name: "Social Science", score: 76, max: 100, grade: "B1", status: "Needs Improvement" },
      { name: "Computer Science", score: 94, max: 100, grade: "A1", status: "Distinction" },
    ],
  };

  return NextResponse.json({
    success: true,
    data: performanceData,
  });
}
