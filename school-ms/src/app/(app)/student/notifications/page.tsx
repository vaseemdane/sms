"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  ArrowLeft,
  Check,
  CheckCheck,
  ClipboardList,
  UserCheck,
  BookOpen,
  Megaphone,
  ArrowRight,
  Sparkles,
  Inbox,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSMSStore, StudentNotification } from "@/context/sms-store";
import { useAuth } from "@/services/auth-context";

type CategoryFilter = "all" | "unread" | "academic" | "attendance" | "examination" | "announcement";

export default function StudentNotificationsPage() {
  const { user } = useAuth();
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useSMSStore();

  const studentId = user?.id || "usr-student-1";
  const [filter, setFilter] = React.useState<CategoryFilter>("all");

  // Filter for this student
  const studentNotifs = React.useMemo(() => {
    return notifications.filter((n) => !n.studentId || n.studentId === studentId);
  }, [notifications, studentId]);

  const filteredNotifs = React.useMemo(() => {
    if (filter === "unread") return studentNotifs.filter((n) => !n.read);
    if (filter === "all") return studentNotifs;
    return studentNotifs.filter((n) => n.category === filter);
  }, [studentNotifs, filter]);

  const unreadCount = studentNotifs.filter((n) => !n.read).length;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "examination":
        return <ClipboardList className="h-4 w-4 text-amber-600" />;
      case "attendance":
        return <UserCheck className="h-4 w-4 text-emerald-600" />;
      case "academic":
        return <BookOpen className="h-4 w-4 text-blue-600" />;
      default:
        return <Megaphone className="h-4 w-4 text-purple-primary" />;
    }
  };

  const formatRelativeTime = (iso: string) => {
    try {
      const diffMs = Date.now() - new Date(iso).getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      if (hours < 1) return "Just now";
      if (hours < 24) return `${hours} hours ago`;
      const days = Math.floor(hours / 24);
      if (days === 1) return "Yesterday";
      return `${days} days ago`;
    } catch {
      return "Recent";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Button asChild variant="ghost" size="sm" className="h-7 px-2">
              <Link href="/dashboard">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Dashboard
              </Link>
            </Button>
            <span>/</span>
            <span className="font-semibold text-purple-primary">Communication</span>
            <span>/</span>
            <span className="font-semibold text-foreground">Notifications</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6 text-purple-primary" />
            Notification Center
          </h1>
          <p className="text-xs text-text-secondary">
            Official announcements, examination notices, timetable changes, and attendance alerts.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={() => markAllNotificationsAsRead(studentId)}
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8"
          >
            <CheckCheck className="h-3.5 w-3.5 text-purple-primary" />
            Mark All as Read ({unreadCount})
          </Button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(
          [
            { id: "all", label: "All" },
            { id: "unread", label: `Unread (${unreadCount})` },
            { id: "academic", label: "Academic" },
            { id: "attendance", label: "Attendance" },
            { id: "examination", label: "Examinations" },
            { id: "announcement", label: "Announcements" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as CategoryFilter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filter === tab.id
                ? "bg-purple-primary text-white shadow-xs"
                : "bg-surface border border-border text-text-secondary hover:bg-muted/40"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <Card className="border-border/80 bg-surface shadow-sm">
        <CardContent className="p-0">
          {filteredNotifs.length === 0 ? (
            <div className="py-20 text-center space-y-3 max-w-sm mx-auto">
              <div className="h-14 w-14 rounded-2xl bg-muted/60 text-text-secondary flex items-center justify-center mx-auto">
                <Inbox className="h-7 w-7 opacity-70" />
              </div>
              <p className="text-sm font-bold text-foreground">You're all caught up!</p>
              <p className="text-xs text-text-secondary">
                No new notifications matching the selected filter.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredNotifs.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-all ${
                    !n.read ? "bg-purple-tint/30" : "hover:bg-muted/20"
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      {getCategoryIcon(n.category)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-foreground">
                          {n.title}
                        </span>
                        {!n.read && (
                          <Badge className="bg-purple-primary text-white text-[9px] px-1.5 py-0">
                            NEW
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[9px] uppercase tracking-wider">
                          {n.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {n.message}
                      </p>
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-text-secondary">
                        <span>{formatRelativeTime(n.createdAt)}</span>
                        {n.link && (
                          <Link href={n.link} className="text-purple-primary font-bold hover:underline inline-flex items-center gap-1">
                            View Details <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {!n.read && (
                    <Button
                      onClick={() => markNotificationAsRead(n.id)}
                      variant="ghost"
                      size="sm"
                      className="text-xs text-text-secondary hover:text-purple-primary h-8 px-2 shrink-0"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Mark Read
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
