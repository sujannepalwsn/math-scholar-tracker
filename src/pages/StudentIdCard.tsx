import { cn, safeFormatDate } from "@/lib/utils"
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
import { PageHeader } from "@/components/ui/page-header";

export default function StudentIdCard() {
  const { user } = useAuth();
  const centerId = user?.center_id;
  const printRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [cardConfig, setCardConfig] = useState({
    primaryColor: "#2563eb",
    showQR: true,
    showLogo: true,
  });

  const { data: center } = useQuery({
    queryKey: ["center-idcard", centerId],
    queryFn: async () => {
      if (!centerId) return null;
      const { data } = await supabase.from("centers").select("*").eq("id", centerId).single();
      return data;
    },
    enabled: !!centerId,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-idcard", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("students").select("*").eq("center_id", centerId).eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!centerId,
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
      body { font-family: sans-serif; display: block; padding: 20px; }
      @media print { .no-print { display: none; } .page-break { page-break-after: always; } }
      .id-card-container { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; }
      .id-card { width: 340px; border: 2px solid ${cardConfig.primaryColor}; border-radius: 12px; overflow: hidden; margin-bottom: 20px; background: white; }
      .id-header { background: ${cardConfig.primaryColor}; color: white; padding: 16px; text-align: center; }
      .id-header h2 { margin: 0; font-size: 16px; }
      .id-header p { margin: 4px 0 0; font-size: 11px; opacity: 0.9; }
      .id-body { padding: 16px; }
      .id-photo { width: 80px; height: 80px; border-radius: 50%; border: 3px solid ${cardConfig.primaryColor}; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; overflow: hidden; }
      .id-photo img { width: 100%; height: 100%; object-fit: cover; }
      .id-name { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 12px; color: #1e293b; }
      .id-field { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; border-bottom: 1px solid #eee; }
      .id-field .label { color: #64748b; }
      .id-field .value { font-weight: 600; color: #1e293b; }
      .id-footer { background: #f8fafc; padding: 8px; text-align: center; font-size: 10px; color: #64748b; }
      .flex { display: flex; }
      .justify-between { justify-content: space-between; }
      .border-b { border-bottom: 1px solid #e2e8f0; }
      .pb-1 { padding-bottom: 4px; }
      .mb-3 { margin-bottom: 12px; }
      .text-center { text-align: center; }
      .font-bold { font-weight: bold; }
      .text-lg { font-size: 1.125rem; }
      .text-sm { font-size: 0.875rem; }
      .font-semibold { font-weight: 600; }
      .text-muted-foreground { color: #64748b; }
    </style></head><body><div class="id-card-container">${content.innerHTML}</div></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Student ID Cards" description="Generate and print student identification cards" />

      <Card className="rounded-2xl border-none shadow-soft p-4 bg-white/50 backdrop-blur-md">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="space-y-2 flex-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Card Theme Color</label>
            <div className="flex gap-2">
              {["#2563eb", "#7c3aed", "#059669", "#dc2626", "#d97706"].map(color => (
                <button
                  key={color}
                  className={cn("h-8 w-8 rounded-full border-2", cardConfig.primaryColor === color ? "border-slate-900" : "border-transparent")}
                  style={{ backgroundColor: color }}
                  onClick={() => setCardConfig({...cardConfig, primaryColor: color})}
                />
              ))}
              <Input type="color" className="h-8 w-12 p-1 rounded-md" value={cardConfig.primaryColor} onChange={(e) => setCardConfig({...cardConfig, primaryColor: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-2 mb-1">
            <Button variant={isBulkMode ? "default" : "outline"} onClick={() => setIsBulkMode(!isBulkMode)} className="h-10 rounded-xl font-black uppercase text-[10px] tracking-widest">
               {isBulkMode ? "Individual Mode" : "Bulk Print Mode"}
            </Button>
          </div>
        </div>
      </Card>

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

      {!selectedStudentId && !isBulkMode ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredStudents.map((s: any) => (
            <Card key={s.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => setSelectedStudentId(s.id)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {s.photo_url ? (
                    <img src={s.photo_url.startsWith('http') ? s.photo_url : supabase.storage.from('activity-photos').getPublicUrl(s.photo_url).data.publicUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
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
      ) : isBulkMode ? (
        <>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Bulk Print ({filteredStudents.length})</Button>
            <Button variant="outline" onClick={() => setIsBulkMode(false)}>Back to List</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center" ref={printRef}>
            {filteredStudents.map((s: any) => (
              <div key={s.id} className="id-card w-[340px] border-2 rounded-xl overflow-hidden shadow-lg bg-white page-break" style={{ borderColor: cardConfig.primaryColor }}>
                <div className="text-white p-4 text-center" style={{ backgroundColor: cardConfig.primaryColor }}>
                  {cardConfig.showLogo && center?.logo_url && <img src={center.logo_url} alt="" className="h-8 mx-auto mb-1" />}
                  <h2 className="font-bold text-base">{center?.name || "School Name"}</h2>
                  <p className="text-xs opacity-90">{center?.address || ""}</p>
                </div>
                <div className="p-5">
                  <div className="h-20 w-20 rounded-full border-[3px] mx-auto mb-3 flex items-center justify-center bg-muted overflow-hidden" style={{ borderColor: cardConfig.primaryColor }}>
                    {s.photo_url ? <img src={s.photo_url.startsWith('http') ? s.photo_url : supabase.storage.from('activity-photos').getPublicUrl(s.photo_url).data.publicUrl} alt="" className="h-full w-full object-cover" /> : <User className="h-10 w-10 text-muted-foreground" />}
                  </div>
                  <p className="text-center font-bold text-lg text-slate-800 mb-3">{s.name}</p>
                  <div className="space-y-1.5 text-sm">
                    {[
                      ["Grade / Section", `${s.grade || "-"} ${s.section ? `/ ${s.section}` : ""}`],
                      ["Student ID", s.student_id_number || "-"],
                      ["Roll Number", s.roll_number || "-"],
                      ["Date of Birth", safeFormatDate(s.date_of_birth, "MMM dd, yyyy")],
                      ["Guardian", s.parent_name || "-"],
                      ["Contact", s.contact_number || s.parent_phone || "-"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between border-b border-border pb-1">
                        <span className="text-muted-foreground text-xs">{label}</span>
                        <span className="font-semibold text-slate-800 text-xs">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-50 p-2 text-center text-[10px] text-muted-foreground flex flex-col gap-1">
                  {center?.phone && <span>Contact: {center.phone}</span>}
                  {cardConfig.showQR && (
                    <div className="flex justify-center mt-1">
                      <div className="bg-white p-1 border">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${s.student_id_number}`}
                          alt="QR Code"
                          className="h-8 w-8"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : selectedStudent && (
        <>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print</Button>
            <Button variant="outline" onClick={handlePrint}><Download className="h-4 w-4 mr-2" /> Download</Button>
            <Button variant="outline" onClick={() => setSelectedStudentId(null)}>Back to List</Button>
          </div>

          <div className="flex justify-center">
            <div ref={printRef}>
              <div className="id-card w-[340px] border-2 rounded-xl overflow-hidden shadow-lg bg-white" style={{ borderColor: cardConfig.primaryColor }}>
                {/* Header */}
                <div className="text-white p-4 text-center" style={{ backgroundColor: cardConfig.primaryColor }}>
                  {cardConfig.showLogo && center?.logo_url && <img src={center.logo_url} alt="" className="h-8 mx-auto mb-1" />}
                  <h2 className="font-bold text-base">{center?.name || "School Name"}</h2>
                  <p className="text-xs opacity-90">{center?.address || ""}</p>
                </div>

                {/* Body */}
                <div className="p-5 bg-card">
                  <div className="h-20 w-20 rounded-full border-[3px] mx-auto mb-3 flex items-center justify-center bg-muted overflow-hidden" style={{ borderColor: cardConfig.primaryColor }}>
                    {selectedStudent.photo_url ? (
                      <img src={selectedStudent.photo_url.startsWith('http') ? selectedStudent.photo_url : supabase.storage.from('activity-photos').getPublicUrl(selectedStudent.photo_url).data.publicUrl} alt="" className="h-full w-full object-cover" />
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
                <div className="bg-muted p-2 text-center text-[10px] text-muted-foreground flex flex-col gap-1">
                  {center?.phone && <span>Contact: {center.phone}</span>}
                  {center?.email && <span> • {center.email}</span>}
                  {cardConfig.showQR && (
                    <div className="flex justify-center mt-1">
                      <div className="bg-white p-1 border">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${selectedStudent.student_id_number}`}
                          alt="QR Code"
                          className="h-8 w-8"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
