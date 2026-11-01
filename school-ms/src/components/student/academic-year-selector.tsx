"use client";

import * as React from "react";
import { Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AcademicYearSelectorProps {
  years: string[];
  selectedYear: string;
  onYearChange: (year: string) => void;
  className?: string;
}

export function AcademicYearSelector({
  years,
  selectedYear,
  onYearChange,
  className = "",
}: AcademicYearSelectorProps) {
  const displayYears = years.length > 0 ? years : ["2026-2027", "2025-2026", "2024-2025"];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="text-xs text-text-secondary font-medium hidden sm:inline flex items-center gap-1">
        <Calendar className="h-3.5 w-3.5 text-purple-primary" />
        Academic Year:
      </span>
      <Select value={selectedYear} onValueChange={onYearChange}>
        <SelectTrigger className="h-8 min-w-[130px] text-xs font-bold bg-surface border-border shadow-2xs">
          <SelectValue placeholder="Academic Year" />
        </SelectTrigger>
        <SelectContent align="end">
          {displayYears.map((yr) => (
            <SelectItem key={yr} value={yr} className="text-xs font-semibold">
              AY {yr.replace("-", "–")} {yr === "2026-2027" ? "(Current)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
