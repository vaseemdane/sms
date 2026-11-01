"use client";

import React, { useMemo } from "react";
import { useSMSStore } from "@/context/sms-store";
import { useAuth } from "@/services/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock } from "lucide-react";

export default function TeacherAuditLogPage() {
  const { user } = useAuth();
  const { teacherAuditLogs } = useSMSStore();
  const teacherId = user?.id || "";

  // Audit logs for logged-in teacher
  const logs = useMemo(() => {
    return teacherAuditLogs
      .filter((l) => l.teacherId === teacherId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [teacherAuditLogs, teacherId]);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Activity & Audit Trail</h1>
        <p className="text-sm text-muted-foreground">
          Immutable compliance record of your statutory attendance entries, material uploads, and mark submissions
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-bold">Recorded Transactions</CardTitle>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {logs.length} logged actions
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Logged activities are timestamped and visible to school leadership for regulatory audits.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              No audit logs recorded for your account in the current session.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log) => {
                const dateObj = new Date(log.timestamp);
                const timeStr = isNaN(dateObj.getTime())
                  ? log.timestamp
                  : dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString();

                return (
                  <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/20">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="font-mono text-[10px] uppercase font-bold"
                        >
                          {log.action.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3" /> {timeStr}
                        </span>
                      </div>
                      <div className="text-sm text-foreground font-medium">{log.details}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
