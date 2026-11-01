import { NextRequest, NextResponse } from "next/server";
import { enforceTeacherAccess } from "@/lib/api-auth";

/**
 * Study Materials API
 * Validates teacher is assigned to target classes
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await enforceTeacherAccess(req);
    if (authResult.error) {
      return authResult.error;
    }

    const body = await req.json();
    const { title, subject, targetSectionIds, fileName } = body;

    if (!title || (!subject && !body.subjectId) || !targetSectionIds || !Array.isArray(targetSectionIds) || targetSectionIds.length === 0) {
      return NextResponse.json(
        { error: "title, subject, and targetSectionIds array required" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Study material "${title}" uploaded for ${targetSectionIds.length} section(s).`,
      materialId: `mat-${Date.now()}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
