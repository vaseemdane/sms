"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, ArrowLeft, Download, FileText, Calendar, User, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/services/auth-context";
import { apiClient } from "@/lib/api-client";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface StudyMaterial {
  id: string;
  title: string;
  description?: string;
  subject: string;
  teacherName: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  academicYear: string;
  createdAt: string;
}

export default function StudentMaterialsPage() {
  const { user } = useAuth();
  const [materials, setMaterials] = React.useState<StudyMaterial[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    async function loadMaterials() {
      try {
        setLoading(true);
        // Default student section is 10A (sec-10a)
        const res = await apiClient.get<ApiResponse<StudyMaterial[]>>("/materials/section/sec-10a");
        if (res?.data) {
          setMaterials(res.data);
        }
      } catch (err) {
        console.error("Failed to load materials", err);
      } finally {
        setLoading(false);
      }
    }
    loadMaterials();
  }, []);

  const filtered = materials.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
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
            <span className="text-text-primary font-medium">Study Materials</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Class Courseware & Study Materials
          </h1>
          <p className="text-sm text-text-secondary">
            Access authorized lesson notes, syllabus handouts, and reference readings published by your teachers.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Search by subject or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-text-secondary">Loading study materials...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <CardTitle className="text-base text-text-secondary">No study materials published yet</CardTitle>
          <CardDescription className="mt-1">
            When your subject teachers upload notes or presentations for your section, they will appear here.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((mat) => (
            <Card key={mat.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="text-xs font-semibold">
                    {mat.subject}
                  </Badge>
                  <span className="text-[11px] text-text-tertiary">{mat.fileSize}</span>
                </div>
                <CardTitle className="text-base font-semibold leading-snug line-clamp-2 mt-2">
                  {mat.title}
                </CardTitle>
                {mat.description && (
                  <CardDescription className="text-xs line-clamp-2 mt-1">
                    {mat.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="text-xs text-text-secondary flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-text-tertiary" />
                  <span>{mat.teacherName || "Instructor"}</span>
                </div>
                <div className="text-[11px] text-text-tertiary flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  <span>Published {mat.createdAt.split("T")[0]}</span>
                </div>
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" asChild>
                  <a href={`/api/v1/materials/download/${mat.id}`} target="_blank" rel="noreferrer">
                    <Download className="h-3.5 w-3.5" />
                    Download ({mat.fileName})
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
