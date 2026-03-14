import React, { useRef, useState } from "react";
import { Download, Printer, Search, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn, safeFormatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

export default function StudentIdCard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const centerId = user?.center_id;
  const printRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const { data: center } = useQuery({
    queryKey: ["center-idcard", centerId, user?.role],
    queryFn: async () => {
      if (!centerId) return null;
      const { data } = await supabase.from("centers").select("*").eq("id", centerId).single();
      return data;
    },
    enabled: !!centerId || isAdmin,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-idcard", centerId, user?.role],
    queryFn: async () => {
      if (!centerId && !isAdmin) return [];
      let query = supabase.from("students").select("*");
      if (!isAdmin) query = query.eq("center_id", centerId);
      const { data, error } = await query.eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!centerId || isAdmin,
  });

  const grades = [...new Set(students.map((s: any) => s.grade).filter(Boolean))].sort();

  const filteredStudents = students.filter((s: any) => {
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.student_id_number || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchGrade = gradeFilter === "all" || s.grade === gradeFilter;
    return matchSearch && matchGrade;
  });

  const selectedStudent = students.find((s: any) => s.id === selectedStudentId);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Student ID Card</title><style>
      body { font-family: sans-serif; display: flex; justify-content: center; padding: 40px; }
      .id-card { width: 340px; border: 2px solid #333; border-radius: 12px; overflow: hidden; }
      .id-header { background: #2563eb; color: white; padding: 16px; text-align: center; }
      .id-header h2 { margin: 0; font-size: 16px; }
      .id-header p { margin: 4px 0 0; font-size: 11px; opacity: 0.9; }
      .id-body { padding: 16px; }
      .id-photo { width: 80px; height: 80px; border-radius: 50%; border: 3px solid #2563eb; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; overflow: hidden; }
      .id-photo img { width: 100%; height: 100%; object-fit: cover; }
      .id-name { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 12px; }
      .id-field { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; border-bottom: 1px solid #eee; }
      .id-field .label { color: #666; }
      .id-field .value { font-weight: 600; }
      .id-footer { background: #f8fafc; padding: 8px; text-align: center; font-size: 10px; color: #666; }
    </style></head><body>${content.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Student ID Cards" description="Generate and print student identification cards" />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or ID..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Grade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {grades.map((g) => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!selectedStudentId ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredStudents.map((s: any) => (
            <Card key={s.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => setSelectedStudentId(s.id)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {s.photo_url ? (
                    <img src={s.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <User className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">Grade {s.grade} • {s.student_id_number || "No ID"}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : selectedStudent && (
        <>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print</Button>
            <Button variant="outline" onClick={handlePrint}><Download className="h-4 w-4 mr-2" /> Download</Button>
            <Button variant="outline" onClick={() => setSelectedStudentId(null)}>Back to List</Button>
          </div>

          <div className="flex justify-center">
            <div ref={printRef}>
              <div className="id-card w-[340px] border-2 border-primary rounded-xl overflow-hidden shadow-lg">
                {/* Header */}
                <div className="bg-primary text-primary-foreground p-4 text-center">
                  {center?.logo_url && <img src={center.logo_url} alt="" className="h-8 mx-auto mb-1" />}
                  <h2 className="font-bold text-base">{center?.name || "School Name"}</h2>
                  <p className="text-xs opacity-90">{center?.address || ""}</p>
                </div>

                {/* Body */}
                <div className="p-5 bg-card">
                  <div className="h-20 w-20 rounded-full border-[3px] border-primary mx-auto mb-3 flex items-center justify-center bg-muted overflow-hidden">
                    {selectedStudent.photo_url ? (
                      <img src={selectedStudent.photo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>

                  <p className="text-center font-bold text-lg text-foreground mb-3">{selectedStudent.name}</p>

                  <div className="space-y-1.5 text-sm">
                    {[
                      ["Grade / Section", `${selectedStudent.grade || "-"} ${selectedStudent.section ? `/ ${selectedStudent.section}` : ""}`],
                      ["Student ID", selectedStudent.student_id_number || "-"],
                      ["Roll Number", selectedStudent.roll_number || "-"],
                      ["Date of Birth", safeFormatDate(selectedStudent.date_of_birth, "MMM dd, yyyy")],
                      ["Blood Group", selectedStudent.blood_group || "-"],
                      ["Guardian", selectedStudent.parent_name || "-"],
                      ["Contact", selectedStudent.contact_number || selectedStudent.parent_phone || "-"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between border-b border-border pb-1">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-semibold text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-muted p-2 text-center text-[10px] text-muted-foreground">
                  {center?.phone && <span>Contact: {center.phone}</span>}
                  {center?.email && <span> • {center.email}</span>}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
