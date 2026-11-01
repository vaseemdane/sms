import { NextRequest, NextResponse } from "next/server";
import { enforceStudentAccess } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { error, session } = await enforceStudentAccess(req);
  if (error) return error;

  const studentId = session!.userId;

  // Mock server-side student data matching persistent store
  const studentData = {
    id: studentId,
    name: studentId === "usr-student-2" ? "Bhoomika B. Nayak" : "Abhishek S. Patil",
    satsId: studentId === "usr-student-2" ? "KA-SATS-2024-88413" : "KA-SATS-2024-88412",
    class: "Class 6",
    section: "Section A",
    classSectionCode: "6A",
    rollNo: studentId === "usr-student-2" ? "02" : "01",
    academicYear: "2026-2027",
    admissionNo: studentId === "usr-student-2" ? "EDP/SEC/2024/002" : "EDP/SEC/2024/001",
    district: "Bengaluru Urban",
    state: "Karnataka",
    parentName: "Sri. Sharanappa Patil",
    attendanceThreshold: 75,
  };

  return NextResponse.json({
    success: true,
    data: studentData,
  });
}
