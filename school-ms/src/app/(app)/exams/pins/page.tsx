"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldAlert,
  Plus,
  Copy,
  Check,
  Download,
  Search,
  Sparkles,
  KeyRound,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { MOCK_PINS } from "@/mocks/exams-and-fees";
import { ExamPin } from "@/types";

export default function ScratchPinsPage() {
  const [pins, setPins] = React.useState<ExamPin[]>(MOCK_PINS);
  const [search, setSearch] = React.useState("");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [batchCount, setBatchCount] = React.useState("10");
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

  const handleGenerateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(batchCount, 10) || 5;
    const newBatch: ExamPin[] = Array.from({ length: count }).map((_, i) => {
      const part1 = Math.floor(1000 + Math.random() * 9000);
      const part2 = Math.floor(1000 + Math.random() * 9000);
      return {
        id: `pin-${Date.now()}-${i}`,
        code: `PIN-EDP-${part1}-${part2}`,
        usedCount: 0,
        maxUses: 5,
        isExpired: false,
        expiresAt: "2025-06-30T23:59:59Z",
      };
    });
    setPins([...newBatch, ...pins]);
    setModalOpen(false);
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleExpire = (id: string) => {
    setPins(
      pins.map((p) => (p.id === id ? { ...p, isExpired: !p.isExpired } : p))
    );
  };

  const filteredPins = pins.filter((p) =>
    p.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
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
            <span className="font-semibold text-purple-primary">Security & Access</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-purple-primary" />
            Scratch PIN Result Gating
          </h1>
          <p className="text-xs text-text-secondary">
            Generate and audit 16-digit scratch card PINs for terminal report card authentication (5 uses per PIN).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            Export PINs (CSV)
          </Button>

          <Button
            onClick={() => setModalOpen(true)}
            size="sm"
            className="gap-1.5 bg-purple-primary text-white hover:bg-purple-primary/90 text-xs shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Generate PIN Batch
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="text-xs font-semibold text-text-secondary uppercase">
              Total Active PINs
            </div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {pins.filter((p) => !p.isExpired).length}
            </div>
            <p className="text-[10px] text-emerald-600 mt-1">Ready for redemption</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="text-xs font-semibold text-text-secondary uppercase">
              Used Redemptions
            </div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {pins.reduce((sum, p) => sum + p.usedCount, 0)}
            </div>
            <p className="text-[10px] text-text-secondary mt-1">Quota: 5 views / PIN</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="text-xs font-semibold text-text-secondary uppercase">
              Expired Cards
            </div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {pins.filter((p) => p.isExpired).length}
            </div>
            <p className="text-[10px] text-destructive mt-1">Quota exhausted / revoked</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-sm font-bold">
            Scratch Card Directory ({filteredPins.length})
          </CardTitle>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
            <Input
              placeholder="Search PIN code..."
              className="pl-8 h-8 text-xs font-mono"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scratch PIN Code</TableHead>
                <TableHead>Associated Student</TableHead>
                <TableHead className="text-center">Usage Count</TableHead>
                <TableHead>Expiration Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPins.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs font-bold text-purple-primary flex items-center gap-2">
                    <KeyRound className="h-3.5 w-3.5 text-text-secondary" />
                    <span>{p.code}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(p.code)}
                      className="h-6 w-6 text-text-secondary hover:text-purple-primary"
                      title="Copy PIN"
                    >
                      {copiedCode === p.code ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </TableCell>

                  <TableCell className="text-xs text-foreground">
                    {p.studentId ? "Aarav Chawla (Assigned)" : "Unassigned (Open)"}
                  </TableCell>

                  <TableCell className="text-center font-mono text-xs font-semibold">
                    {p.usedCount} / {p.maxUses}
                  </TableCell>

                  <TableCell className="text-xs text-text-secondary">
                    30 Jun 2025
                  </TableCell>

                  <TableCell>
                    {p.isExpired ? (
                      <Badge variant="destructive" className="text-[10px]">
                        Expired
                      </Badge>
                    ) : (
                      <Badge variant="success" className="text-[10px]">
                        Active
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpire(p.id)}
                      className="h-7 text-xs text-text-secondary hover:text-destructive"
                    >
                      {p.isExpired ? "Re-activate" : "Revoke"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Batch Generator Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleGenerateBatch}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-primary" />
                Generate Scratch Card PIN Batch
              </DialogTitle>
              <DialogDescription className="text-xs pt-1">
                Batch-generate secure pseudo-random 16-digit PINs for student marksheet access.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label>Batch Quantity *</Label>
                <Select value={batchCount} onValueChange={setBatchCount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Quantity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 Scratch PINs</SelectItem>
                    <SelectItem value="10">10 Scratch PINs</SelectItem>
                    <SelectItem value="25">25 Scratch PINs</SelectItem>
                    <SelectItem value="50">50 Scratch PINs</SelectItem>
                    <SelectItem value="100">100 Scratch PINs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 rounded-lg bg-warm-ivory/50 border border-border text-xs text-text-secondary space-y-1">
                <p className="font-semibold text-foreground">Security Policy:</p>
                <p>Each PIN permits up to 5 verified views of student terminal marks before requiring renewal.</p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-purple-primary text-white hover:bg-purple-primary/90">
                Generate Batch
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
