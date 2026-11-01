"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RotateCcw,
  AlertTriangle,
  History,
  Check,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HistoryRecord {
  id: string;
  studentName: string;
  admNo: string;
  fromClass: string;
  toClass: string;
  status: "P" | "D" | "G";
  sessionFrom: string;
  sessionTo: string;
  date: string;
}

const INITIAL_HISTORY: HistoryRecord[] = [
  {
    id: "prom-1",
    studentName: "Aarav Chawla",
    admNo: "EDP/SEC/2024/001",
    fromClass: "Class 9-A",
    toClass: "Class 10-A",
    status: "P",
    sessionFrom: "2023-2024",
    sessionTo: "2024-2025",
    date: "10 Apr 2024",
  },
  {
    id: "prom-2",
    studentName: "Diya Singhania",
    admNo: "EDP/SEC/2024/002",
    fromClass: "Class 9-A",
    toClass: "Class 10-A",
    status: "P",
    sessionFrom: "2023-2024",
    sessionTo: "2024-2025",
    date: "10 Apr 2024",
  },
  {
    id: "prom-3",
    studentName: "Rohan Nair",
    admNo: "EDP/SEC/2024/003",
    fromClass: "Class 9-B",
    toClass: "Class 9-B",
    status: "D",
    sessionFrom: "2023-2024",
    sessionTo: "2024-2025",
    date: "10 Apr 2024",
  },
  {
    id: "prom-4",
    studentName: "Tanmay Bhattacharya",
    admNo: "EDP/SRC/2022/089",
    fromClass: "Class 12-A",
    toClass: "Graduated",
    status: "G",
    sessionFrom: "2023-2024",
    sessionTo: "2024-2025",
    date: "20 May 2024",
  },
];

export default function PromotionHistoryPage() {
  const [history, setHistory] = React.useState<HistoryRecord[]>(INITIAL_HISTORY);
  const [search, setSearch] = React.useState("");
  const [resetAllModalOpen, setResetAllModalOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRollbackSingle = (id: string, name: string) => {
    setHistory(history.filter((h) => h.id !== id));
    showToast(`Promotion rolled back for ${name}. Record restored to previous cohort.`);
  };

  const handleResetAll = () => {
    setHistory([]);
    setResetAllModalOpen(false);
    showToast("All promotion records for the current session have been reverted.");
  };

  const filteredHistory = history.filter(
    (h) =>
      h.studentName.toLowerCase().includes(search.toLowerCase()) ||
      h.admNo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Button asChild variant="ghost" size="sm" className="h-7 px-2">
              <Link href="/students/promotions">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Back to Promotions
              </Link>
            </Button>
            <span>/</span>
            <span className="font-semibold text-purple-primary">History & Audit</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Promotion History & Rollbacks
          </h1>
          <p className="text-xs text-text-secondary">
            Reversible promotion transactions log with granular single-student or batch reset options.
          </p>
        </div>

        {history.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setResetAllModalOpen(true)}
            className="h-9 gap-1.5 text-xs shadow-sm"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset All Promotions
          </Button>
        )}
      </div>

      {toastMessage && (
        <div className="p-3 rounded-xl bg-purple-tint border border-lavender text-purple-primary text-xs flex items-center gap-2 shadow-xs">
          <Check className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Table Card */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-purple-primary" />
            <CardTitle className="text-sm font-bold">
              Promotion Audit Log ({filteredHistory.length})
            </CardTitle>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
            <Input
              placeholder="Search student or Adm No..."
              className="pl-8 h-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Adm No</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>From Cohort</TableHead>
                <TableHead>Target Cohort</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Session Shift</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Rollback</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.length > 0 ? (
                filteredHistory.map((h) => (
                  <TableRow key={h.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-bold text-purple-primary">
                      {h.admNo}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-foreground">
                      {h.studentName}
                    </TableCell>
                    <TableCell className="text-xs text-text-secondary">
                      {h.fromClass}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground">
                      {h.toClass}
                    </TableCell>
                    <TableCell>
                      {h.status === "P" && (
                        <Badge variant="success" className="text-[10px]">
                          Promoted
                        </Badge>
                      )}
                      {h.status === "D" && (
                        <Badge variant="warning" className="text-[10px]">
                          Retained
                        </Badge>
                      )}
                      {h.status === "G" && (
                        <Badge variant="secondary" className="text-[10px]">
                          Graduated
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-text-secondary font-mono">
                      {h.sessionFrom} → {h.sessionTo}
                    </TableCell>
                    <TableCell className="text-xs text-text-secondary">
                      {h.date}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRollbackSingle(h.id, h.studentName)}
                        className="h-7 text-xs text-purple-primary hover:bg-purple-tint hover:text-purple-primary gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Rollback
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-32 text-center text-xs text-text-secondary"
                  >
                    No promotion transactions logged.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reset All Confirm Modal */}
      <Dialog open={resetAllModalOpen} onOpenChange={setResetAllModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base font-bold">
                Reset All Promotions?
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs pt-2">
              This action will revert <strong>all students</strong> promoted during this academic session back to their originating classes and section arms.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            <strong>Warning:</strong> This cannot be undone. Ensure marksheets and fee schedules are reconciled before resetting.
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetAllModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleResetAll}
            >
              Confirm Reset All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
