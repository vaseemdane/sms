"use client";

import * as React from "react";
import { ParentDashboard } from "@/components/dashboard/parent-dashboard";
import { useAuth } from "@/services/auth-context";

export default function ParentPortalPage() {
  const { user } = useAuth();
  return <ParentDashboard user={user} />;
}

