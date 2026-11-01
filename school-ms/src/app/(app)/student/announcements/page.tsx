"use client";

import * as React from "react";
import Link from "next/link";
import {
  Megaphone,
  ArrowLeft,
  Calendar,
  User,
  Paperclip,
  AlertTriangle,
  Sparkles,
  Download,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSMSStore } from "@/context/sms-store";

export default function StudentAnnouncementsPage() {
  const { announcements } = useSMSStore();

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
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
            <span className="font-semibold text-foreground">Announcements</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-purple-primary" />
            School Official Announcements & Circulars
          </h1>
          <p className="text-xs text-text-secondary">
            Administrative communications, institutional notices, examination circulars, and events.
          </p>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <Card className="border-border bg-surface text-center py-16">
            <CardContent className="space-y-2">
              <p className="font-bold text-foreground text-sm">No announcements published</p>
              <p className="text-xs text-text-secondary">Check back later for school updates.</p>
            </CardContent>
          </Card>
        ) : (
          announcements.map((ann) => {
            const isUrgent = ann.priority === "urgent";
            const isImportant = ann.priority === "important";

            return (
              <Card
                key={ann.id}
                className={`border transition-all ${
                  isUrgent
                    ? "border-red-300 bg-red-50/20 shadow-xs"
                    : isImportant
                    ? "border-amber-300 bg-amber-50/20 shadow-xs"
                    : "border-border/80 bg-surface shadow-2xs hover:border-purple-primary/40"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] uppercase font-extrabold ${
                          isUrgent
                            ? "bg-red-600 text-white"
                            : isImportant
                            ? "bg-amber-500 text-white"
                            : "bg-muted text-text-secondary"
                        }`}
                      >
                        {ann.priority}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {ann.category}
                      </Badge>
                      <span className="text-[11px] text-text-secondary">
                        Target: <strong className="text-foreground">{ann.targetAudience}</strong>
                      </span>
                    </div>

                    <span className="text-xs text-text-secondary flex items-center gap-1 font-mono">
                      <Calendar className="h-3 w-3" />
                      {ann.publishDate}
                    </span>
                  </div>

                  <CardTitle className="text-base sm:text-lg font-bold text-foreground pt-1">
                    {ann.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                    {ann.content}
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/70 text-xs">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <User className="h-3.5 w-3.5 text-purple-primary" />
                      <span>
                        Published by: <strong className="text-foreground">{ann.publishedBy}</strong> ({ann.publishedRole})
                      </span>
                    </div>

                    {ann.attachmentName && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs text-purple-primary font-semibold shadow-2xs">
                        <Paperclip className="h-3.5 w-3.5" />
                        <span>{ann.attachmentName}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
