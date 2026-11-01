import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export interface AuthenticatedUserSession {
  userId: string;
  role: string;
  isValid: boolean;
  schoolId?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-dev-jwt-key-edupulse-sms-2026-production-ready";

/**
 * Extracts and cryptographically verifies the JWT from session cookie or Authorization header.
 * Enforces authentic token signatures and validates subject & role claims.
 */
export async function getAuthenticatedSession(req: NextRequest): Promise<AuthenticatedUserSession | null> {
  const authHeader = req.headers.get("authorization");
  const cookieToken = req.cookies.get("edupulse_auth_token")?.value;

  const rawToken = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : cookieToken;

  if (!rawToken) {
    return null;
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(rawToken, secret, {
      algorithms: ["HS256"],
    });

    const userId = (payload.sub as string) || (payload.user_id as string);
    if (!userId) {
      return null;
    }

    const role = ((payload.role as string) || "student").toLowerCase();

    return {
      userId,
      role,
      isValid: true,
      schoolId: (payload.school_id as string) || undefined,
    };
  } catch {
    return null;
  }
}

export async function enforceStudentAccess(req: NextRequest) {
  const session = await getAuthenticatedSession(req);

  if (!session) {
    return {
      error: NextResponse.json(
        { success: false, error: "Unauthorized: Active authentication session required." },
        { status: 401 }
      ),
      session: null,
    };
  }

  // Allow student, super_admin, or admin (admins can inspect)
  if (session.role !== "student" && session.role !== "super_admin" && session.role !== "admin") {
    return {
      error: NextResponse.json(
        { success: false, error: "Forbidden: Endpoint restricted to Student role." },
        { status: 403 }
      ),
      session: null,
    };
  }

  return { error: null, session };
}

/**
 * Enforces teacher role access (or super_admin/admin).
 */
export async function enforceTeacherAccess(req: NextRequest) {
  const session = await getAuthenticatedSession(req);

  if (!session) {
    return {
      error: NextResponse.json(
        { success: false, error: "Unauthorized: Active authentication session required." },
        { status: 401 }
      ),
      session: null,
    };
  }

  if (session.role !== "teacher" && session.role !== "super_admin" && session.role !== "admin") {
    return {
      error: NextResponse.json(
        { success: false, error: "Forbidden: Endpoint restricted to Teacher role." },
        { status: 403 }
      ),
      session: null,
    };
  }

  return { error: null, session };
}
